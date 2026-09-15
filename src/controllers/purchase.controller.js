const mongoose = require('mongoose');
const Purchase   = require('../models/Purchase');
const Product    = require('../models/Product');
const Ingredient = require('../models/Ingredient');
const Supplier   = require('../models/Supplier');

// GET /api/purchases  (paginado + filtros)
exports.getAll = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, supplier, status, from, to } = req.query;
    const filter = {};
    if (supplier) filter.supplier = supplier;
    if (status)   filter.status   = status;
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
exports.create = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { supplierId, supplierName, items, invoiceNumber, paymentMethod, notes } = req.body;

    if (!items || items.length === 0) {
      await session.abortTransaction();
      return res.status(400).json({ message: 'La compra debe tener al menos un ítem.' });
    }

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

      if (item.itemType === 'product') {
        const product = await Product.findById(item.itemId).session(session);
        if (!product) {
          await session.abortTransaction();
          return res.status(404).json({ message: `Producto '${item.itemId}' no encontrado.` });
        }
        // Actualizar stock (nunca negativo)
        product.stock = (product.stock || 0) + item.quantity;
        if (item.updateCost && item.unitCost > 0) product.purchasePrice = item.unitCost;
        await product.save({ session });

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
        ingredient.stock = (ingredient.stock || 0) + item.quantity;
        if (item.updateCost && item.unitCost > 0) ingredient.cost = item.unitCost;
        await ingredient.save({ session });

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
      status:        'recibida',
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

// PATCH /api/purchases/:id/status  (anular y revertir stock)
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

    // Si se anula: revertir stock de cada ítem
    if (status === 'anulada') {
      for (const item of purchase.items) {
        if (item.itemType === 'product' && item.product) {
          await Product.findByIdAndUpdate(item.product, { $inc: { stock: -item.quantity } }, { session });
        } else if (item.itemType === 'ingredient' && item.ingredient) {
          await Ingredient.findByIdAndUpdate(item.ingredient, { $inc: { stock: -item.quantity } }, { session });
        }
      }
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
