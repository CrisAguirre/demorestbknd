const mongoose = require('mongoose');

const deliveryOrderSchema = new mongoose.Schema({
  sale: { type: mongoose.Schema.Types.ObjectId, ref: 'Sale', required: true },
  customerName: { type: String, required: true },
  customerPhone: { type: String, default: '' },
  customerAddress: { type: String, required: true },
  deliveryFee: { type: Number, default: 0 },
  items: [{
    productName: String,
    quantity: Number
  }],
  status: {
    type: String,
    enum: ['pendiente', 'en_preparacion', 'en_camino', 'entregado', 'cancelado'],
    default: 'pendiente'
  },
  assignedDriver: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  stateHistory: [{
    state: String,
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    userName: String,
    timestamp: { type: Date, default: Date.now }
  }]
}, { timestamps: true });

module.exports = mongoose.model('DeliveryOrder', deliveryOrderSchema);
