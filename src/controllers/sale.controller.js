const Sale = require('../models/Sale');
const Product = require('../models/Product');
const Alert = require('../models/Alert');

exports.create = async (req, res, next) => {
  try {
    const { items, paymentMethod, customerName, notes } = req.body;
    if (!items || items.length === 0) {
      return res.status(400).json({ message: 'La venta debe tener al menos un producto' });
    }

    const saleItems = [];
    let total = 0;

    for (const item of items) {
      const product = await Product.findById(item.product);
      if (!product) {
        return res.status(404).json({ message: `Producto ${item.product} no encontrado` });
      }
      if (product.stock < item.quantity) {
        return res.status(400).json({
          message: `Stock insuficiente para "${product.name}" (disponible: ${product.stock})`
        });
      }

      const subtotal = product.salePrice * item.quantity;
      saleItems.push({
        product: product._id,
        productName: product.name,
        quantity: item.quantity,
        unitPrice: product.salePrice,
        subtotal
      });
      total += subtotal;

      // Descontar stock
      product.stock -= item.quantity;
      await product.save();

      // Alerta si stock bajo
      if (product.stock <= product.minStock) {
        await Alert.create({
          product: product._id,
          type: product.stock === 0 ? 'sin_stock' : 'stock_bajo',
          message: product.stock === 0
            ? `"${product.name}" se ha agotado`
            : `"${product.name}" tiene stock bajo (${product.stock} unidades)`,
          priority: product.stock === 0 ? 'alta' : 'media'
        });
      }
    }

    const sale = await Sale.create({
      user: req.user._id,
      items: saleItems,
      total,
      paymentMethod: paymentMethod || 'efectivo',
      customerName: customerName || 'Cliente general',
      notes
    });

    res.status(201).json(sale);
  } catch (error) {
    next(error);
  }
};

exports.getAll = async (req, res, next) => {
  try {
    const { startDate, endDate, page = 1, limit = 20 } = req.query;
    const filter = {};

    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate + 'T23:59:59.999Z');
    }

    const sales = await Sale.find(filter)
      .populate('user', 'name')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const total = await Sale.countDocuments(filter);
    res.json({ sales, total, page: Number(page), pages: Math.ceil(total / limit) });
  } catch (error) {
    next(error);
  }
};

exports.getById = async (req, res, next) => {
  try {
    const sale = await Sale.findById(req.params.id).populate('user', 'name');
    if (!sale) return res.status(404).json({ message: 'Venta no encontrada' });
    res.json(sale);
  } catch (error) {
    next(error);
  }
};
