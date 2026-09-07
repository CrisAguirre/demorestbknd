const mongoose = require('mongoose');
const PurchaseIngredient = require('../models/PurchaseIngredient');
const Ingredient = require('../models/Ingredient');
const Supplier = require('../models/Supplier');

async function recordMovement(document, type, quantity, previousStock, newStock, userId, reference, referenceModel, description) {
  document.movementHistory.push({
    type,
    quantity,
    previousStock,
    newStock,
    reference,
    referenceModel,
    description,
    user: userId
  });
  await document.save();
}

exports.create = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { supplier, supplierName, items, invoiceNumber, paymentMethod, notes } = req.body;

    if (!items || items.length === 0) {
      await session.abortTransaction();
      return res.status(400).json({ message: 'La compra debe tener al menos un item' });
    }

    const purchaseItems = [];
    let total = 0;

    for (const item of items) {
      const ingredient = await Ingredient.findById(item.ingredient).session(session);
      if (!ingredient) {
        await session.abortTransaction();
        return res.status(404).json({ message: `Ingrediente ${item.ingredient} no encontrado` });
      }

      const subtotal = item.unitCost * item.quantity;
      purchaseItems.push({
        ingredient: ingredient._id,
        ingredientName: ingredient.name,
        quantity: item.quantity,
        unitCost: item.unitCost,
        unit: ingredient.unit,
        subtotal
      });
      total += subtotal;

      const previousStock = ingredient.stock;
      ingredient.stock += item.quantity;
      if (item.unitCost) {
        ingredient.cost = item.unitCost;
      }
      await ingredient.save({ session });

      await recordMovement(
        ingredient,
        'purchase',
        item.quantity,
        previousStock,
        ingredient.stock,
        req.user._id,
        null,
        'PurchaseIngredient',
        `Compra a proveedor: ${subtotal.toFixed(2)}`
      );
    }

    const purchase = await PurchaseIngredient.create([{
      supplier: supplier || null,
      supplierName: supplierName || 'Sin proveedor',
      user: req.user._id,
      items: purchaseItems,
      total,
      invoiceNumber: invoiceNumber || '',
      paymentMethod: paymentMethod || 'efectivo',
      status: 'recibida',
      notes: notes || ''
    }], { session });

    await session.commitTransaction();
    res.status(201).json(purchase[0]);
  } catch (error) {
    await session.abortTransaction();
    next(error);
  } finally {
    session.endSession();
  }
};

exports.getAll = async (req, res, next) => {
  try {
    const { startDate, endDate, status, page = 1, limit = 20 } = req.query;
    const filter = {};

    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate + 'T23:59:59.999Z');
    }
    if (status) filter.status = status;

    const purchases = await PurchaseIngredient.find(filter)
      .populate('user', 'name')
      .populate('supplier', 'name')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const total = await PurchaseIngredient.countDocuments(filter);
    res.json({ purchases, total, page: Number(page), pages: Math.ceil(total / limit) });
  } catch (error) {
    next(error);
  }
};

exports.getById = async (req, res, next) => {
  try {
    const purchase = await PurchaseIngredient.findById(req.params.id)
      .populate('user', 'name')
      .populate('supplier')
      .populate('items.ingredient');
    if (!purchase) return res.status(404).json({ message: 'Compra no encontrada' });
    res.json(purchase);
  } catch (error) {
    next(error);
  }
};

exports.update = async (req, res, next) => {
  try {
    const { status, notes } = req.body;
    const purchase = await PurchaseIngredient.findById(req.params.id);
    if (!purchase) return res.status(404).json({ message: 'Compra no encontrada' });

    if (status) purchase.status = status;
    if (notes !== undefined) purchase.notes = notes;

    await purchase.save();
    res.json(purchase);
  } catch (error) {
    next(error);
  }
};

exports.delete = async (req, res, next) => {
  try {
    const purchase = await PurchaseIngredient.findById(req.params.id);
    if (!purchase) return res.status(404).json({ message: 'Compra no encontrada' });

    if (purchase.status === 'anulada') {
      return res.status(400).json({ message: 'La compra ya está anulada' });
    }

    purchase.status = 'anulada';
    await purchase.save();
    res.json({ message: 'Compra anulada correctamente' });
  } catch (error) {
    next(error);
  }
};
