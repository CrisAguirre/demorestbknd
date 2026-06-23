const Alert = require('../models/Alert');
const Product = require('../models/Product');

exports.getAll = async (req, res, next) => {
  try {
    const { read, page = 1, limit = 30 } = req.query;
    const filter = {};
    if (read !== undefined) filter.read = read === 'true';

    const alerts = await Alert.find(filter)
      .populate('product', 'name stock minStock')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const total = await Alert.countDocuments(filter);
    const unread = await Alert.countDocuments({ read: false });
    res.json({ alerts, total, unread, page: Number(page) });
  } catch (error) {
    next(error);
  }
};

exports.markAsRead = async (req, res, next) => {
  try {
    await Alert.findByIdAndUpdate(req.params.id, { read: true });
    res.json({ message: 'Alerta marcada como leída' });
  } catch (error) {
    next(error);
  }
};

exports.markAllRead = async (req, res, next) => {
  try {
    await Alert.updateMany({ read: false }, { read: true });
    res.json({ message: 'Todas las alertas marcadas como leídas' });
  } catch (error) {
    next(error);
  }
};

// Chequeo automático de stock (puede llamarse periódicamente)
exports.checkStockAlerts = async (req, res, next) => {
  try {
    const lowStockProducts = await Product.find({
      isActive: true,
      $expr: { $lte: ['$stock', '$minStock'] }
    });

    let created = 0;
    for (const product of lowStockProducts) {
      // Evitar duplicados: solo crear si no hay alerta sin leer del mismo tipo
      const existing = await Alert.findOne({
        product: product._id, read: false, type: product.stock === 0 ? 'sin_stock' : 'stock_bajo'
      });
      if (!existing) {
        await Alert.create({
          product: product._id,
          type: product.stock === 0 ? 'sin_stock' : 'stock_bajo',
          message: product.stock === 0
            ? `"${product.name}" se ha agotado`
            : `"${product.name}" tiene stock bajo (${product.stock} unidades)`,
          priority: product.stock === 0 ? 'alta' : 'media'
        });
        created++;
      }
    }
    res.json({ message: `${created} alertas generadas`, total: lowStockProducts.length });
  } catch (error) {
    next(error);
  }
};
