const mongoose = require('mongoose');

const alertSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', default: null },
  type: { type: String, enum: ['stock_bajo', 'sin_stock', 'producto_estancado', 'deudor_mora'], required: true },
  message: { type: String, required: true },
  read: { type: Boolean, default: false },
  priority: { type: String, enum: ['baja', 'media', 'alta'], default: 'media' }
}, { timestamps: true });

module.exports = mongoose.model('Alert', alertSchema);
