const mongoose = require('mongoose');
const Purchase   = require('../models/Purchase');
const Product    = require('../models/Product');
const Ingredient = require('../models/Ingredient');
const Supplier   = require('../models/Supplier');

// GET /api/purchases  (paginado + filtros)
exports.getAll = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, supplier, status, origen, from, to } = req.query;
    const filter = {};
    if (supplier) filter.supplier = supplier;
    if (status)   filter.status   = status;
    if (origen)   filter.origen   = origen;
    if (from || to) {
      filter.createdAt = {};
      if (from) filter.createdAt.$gte = new Date(from);
      if (to)   filter.createdAt.$lte = new Date(`${to}T23:59:59`);
    }

    const [purchases, total] = await Promise.all([
      Purchase.find(filter)
        .populate('supplier', 'name nit')
        .populate('user', 'name')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(Number(limit)),
      Purchase.countDocuments(filter)
    ]);

    res.json({ purchases, total, page: Number(page), pages: Math.ceil(total / limit) });
  } catch (err) { next(err); }
};

// GET /api/purchases/:id
exports.getOne = async (req, res, next) => {
  try {
    const purchase = await Purchase.findById(req.params.id)
      .populate('supplier', 'name nit phone email')
      .populate('user', 'name')
      .populate('items.product', 'name barcode unit')
      .populate('items.ingredient', 'name unit');
    if (!purchase) return res.status(404).json({ message: 'Compra no encontrada' });
    res.json(purchase);
  } catch (err) { next(err); }
};

// POST /api/purchases  — crea compra mixta (productos e insumos) y actualiza stock
// status 'pendiente' (requisiciones): NO mueve stock hasta recibirse.
// Los ítems pueden venir por itemId o por itemCode (código de insumo/producto);
// con origen 'requisicion' un código inexistente crea el insumo (upsert).
exports.create = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { supplierId, supplierName, items, invoiceNumber, paymentMethod, notes, origen, area } = req.body;
    let { status } = req.body;

    if (!items || items.length === 0) {
      await session.abortTransaction();
      return res.status(400).json({ message: 'La compra debe tener al menos un ítem.' });
    }
    if (status && !['pendiente', 'recibida'].includes(status)) {
      await session.abortTransaction();
      return res.status(400).json({ message: `Estado inválido: '${status}'.` });
    }
    status = status || 'recibida';
    const esRequisicion = origen === 'requisicion';
    const mueveStock = status === 'recibida';

    // Resolver proveedor (opcional)
    let resolvedSupplierId   = null;
    let resolvedSupplierName = supplierName || 'Sin proveedor';
    if (supplierId) {
      const sup = await Supplier.findById(supplierId).session(session);
      if (!sup) {
        await session.abortTransaction();
        return res.status(404).json({ message: 'Proveedor no encontrado.' });
      }
      resolvedSupplierId   = sup._id;
      resolvedSupplierName = sup.name;
    }

    let total = 0;
    const purchaseItems = [];

    for (const item of items) {
      const subtotal = (item.quantity || 0) * (item.unitCost || 0);
      total += subtotal;

      // Resolver por itemId o por itemCode
      if (!item.itemId && item.itemCode) {
        if (item.itemType === 'ingredient') {
          let ing = await Ingredient.findOne({ code: item.itemCode }).session(session);
          if (!ing && esRequisicion) {
            [ing] = await Ingredient.create([{
              code: item.itemCode,
              name: item.itemName || item.itemCode,
              unit: item.unit || 'unidades',
              area: area || 'cocina',
              stock: 0
            }], { session });
          }
          if (!ing) {
            await session.abortTransaction();
            return res.status(404).json({ message: `Insumo '${item.itemCode}' no encontrado.` });
          }
          item.itemId = ing._id.toString();
        } else if (item.itemType === 'product') {
          const prod = await Product.findOne({ $or: [{ barcode: item.itemCode }, { name: item.itemCode }] }).session(session);
          if (!prod) {
            await session.abortTransaction();
            return res.status(404).json({ message: `Producto '${item.itemCode}' no encontrado.` });
          }
          item.itemId = prod._id.toString();
        }
      }

      if (item.itemType === 'product') {
        const product = await Product.findById(item.itemId).session(session);
        if (!product) {
          await session.abortTransaction();
          return res.status(404).json({ message: `Producto '${item.itemId}' no encontrado.` });
        }
        // Actualizar stock solo al recibir (nunca negativo en creación)
        if (mueveStock) {
          product.stock = (product.stock || 0) + item.quantity;
          if (item.updateCost && item.unitCost > 0) product.purchasePrice = item.unitCost;
          await product.save({ session });
        }

        purchaseItems.push({
          itemType:   'product',
          product:    product._id,
          ingredient: null,
          itemName:   product.name,
          unit:       product.unit || 'unidades',
          quantity:   item.quantity,
          unitCost:   item.unitCost,
          subtotal,
          updateCost: !!item.updateCost
        });
      } else if (item.itemType === 'ingredient') {
        const ingredient = await Ingredient.findById(item.itemId).session(session);
        if (!ingredient) {
          await session.abortTransaction();
          return res.status(404).json({ message: `Insumo '${item.itemId}' no encontrado.` });
        }
        if (mueveStock) {
          ingredient.stock = (ingredient.stock || 0) + item.quantity;
          if (item.updateCost && item.unitCost > 0) ingredient.cost = item.unitCost;
          await ingredient.save({ session });
        }

        purchaseItems.push({
          itemType:   'ingredient',
          product:    null,
          ingredient: ingredient._id,
          itemName:   ingredient.name,
          unit:       ingredient.unit || 'unidades',
          quantity:   item.quantity,
          unitCost:   item.unitCost,
          subtotal,
          updateCost: !!item.updateCost
        });
      } else {
        await session.abortTransaction();
        return res.status(400).json({ message: `Tipo de ítem inválido: '${item.itemType}'. Debe ser 'product' o 'ingredient'.` });
      }
    }

    const [purchase] = await Purchase.create([{
      supplier:      resolvedSupplierId,
      supplierName:  resolvedSupplierName,
      user:          req.user._id,
      items:         purchaseItems,
      total,
      invoiceNumber: invoiceNumber || '',
      paymentMethod: paymentMethod || 'efectivo',
      status,
      origen:        esRequisicion ? 'requisicion' : 'compra',
      area:          area || '',
      notes:         notes || ''
    }], { session });

    await session.commitTransaction();
    res.status(201).json(purchase);
  } catch (err) {
    await session.abortTransaction();
    next(err);
  } finally {
    session.endSession();
  }
};

// PATCH /api/purchases/:id/status
// - pendiente → recibida: SUMA stock (recepción de requisición/compra)
// - recibida → anulada: revierte stock
// - pendiente → anulada: sin movimiento (nunca entró)
exports.updateStatus = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { status } = req.body;
    const purchase = await Purchase.findById(req.params.id).session(session);
    if (!purchase) {
      await session.abortTransaction();
      return res.status(404).json({ message: 'Compra no encontrada.' });
    }
    if (purchase.status === 'anulada') {
      await session.abortTransaction();
      return res.status(400).json({ message: 'Esta compra ya está anulada.' });
    }
    if (purchase.status === 'recibida' && status === 'pendiente') {
      await session.abortTransaction();
      return res.status(400).json({ message: 'Una compra recibida no puede volver a pendiente.' });
    }

    const sumar = async (signo) => {
      for (const item of purchase.items) {
        if (item.itemType === 'product' && item.product) {
          await Product.findByIdAndUpdate(item.product, { $inc: { stock: signo * item.quantity } }, { session });
        } else if (item.itemType === 'ingredient' && item.ingredient) {
          await Ingredient.findByIdAndUpdate(item.ingredient, { $inc: { stock: signo * item.quantity } }, { session });
        }
      }
    };

    // Si se recibe una requisición/compra pendiente: suma stock
    if (purchase.status === 'pendiente' && status === 'recibida') {
      await sumar(1);
    }

    // Si se anula una recibida: revertir stock de cada ítem
    if (purchase.status === 'recibida' && status === 'anulada') {
      await sumar(-1);
    }

    purchase.status = status;
    await purchase.save({ session });
    await session.commitTransaction();
    res.json(purchase);
  } catch (err) {
    await session.abortTransaction();
    next(err);
  } finally {
    session.endSession();
  }
};
