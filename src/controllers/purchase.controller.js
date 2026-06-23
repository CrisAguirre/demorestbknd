const Purchase = require('../models/Purchase');
const Product  = require('../models/Product');
const Supplier = require('../models/Supplier');

// GET /api/purchases  (paginado)
exports.getAll = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, supplier, status, from, to } = req.query;
    const filter = {};
    if (supplier) filter.supplier = supplier;
    if (status)   filter.status = status;
    if (from || to) {
      filter.createdAt = {};
      if (from) filter.createdAt.$gte = new Date(from);
      if (to)   filter.createdAt.$lte = new Date(to + 'T23:59:59');
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
      .populate('items.product', 'name barcode');
    if (!purchase) return res.status(404).json({ message: 'Compra no encontrada' });
    res.json(purchase);
  } catch (err) { next(err); }
};

// POST /api/purchases  — crea compra y actualiza stock automáticamente
exports.create = async (req, res, next) => {
  try {
    const { supplierId, items, invoiceNumber, paymentMethod, notes } = req.body;

    const supplier = await Supplier.findById(supplierId);
    if (!supplier) return res.status(404).json({ message: 'Proveedor no encontrado' });

    // Validar ítems y calcular totales
    let total = 0;
    const purchaseItems = [];
    for (const item of items) {
      const product = await Product.findById(item.productId);
      if (!product) return res.status(404).json({ message: `Producto ${item.productId} no encontrado` });

      const subtotal = item.quantity * item.unitCost;
      total += subtotal;
      purchaseItems.push({
        product: product._id,
        productName: product.name,
        quantity: item.quantity,
        unitCost: item.unitCost,
        subtotal
      });

      // Actualizar stock y precio de costo si viene diferente
      const update = { $inc: { stock: item.quantity } };
      if (item.updateCost && item.unitCost > 0) update.purchasePrice = item.unitCost;
      await Product.findByIdAndUpdate(product._id, update);
    }

    const purchase = new Purchase({
      supplier: supplier._id,
      supplierName: supplier.name,
      user: req.user._id,
      items: purchaseItems,
      total,
      invoiceNumber: invoiceNumber || '',
      paymentMethod: paymentMethod || 'efectivo',
      status: 'recibida',
      notes: notes || ''
    });

    await purchase.save();
    res.status(201).json(purchase);
  } catch (err) { next(err); }
};

// PATCH /api/purchases/:id/status  (anular)
exports.updateStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const purchase = await Purchase.findById(req.params.id);
    if (!purchase) return res.status(404).json({ message: 'Compra no encontrada' });

    // Si se anula: revertir stock
    if (status === 'anulada' && purchase.status !== 'anulada') {
      for (const item of purchase.items) {
        await Product.findByIdAndUpdate(item.product, { $inc: { stock: -item.quantity } });
      }
    }

    purchase.status = status;
    await purchase.save();
    res.json(purchase);
  } catch (err) { next(err); }
};
