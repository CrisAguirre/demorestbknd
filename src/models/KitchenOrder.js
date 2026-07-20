const mongoose = require('mongoose');

const stateHistorySchema = new mongoose.Schema({
  state: { type: String, required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  userName: { type: String },
  timestamp: { type: Date, default: Date.now }
}, { _id: false });

const kitchenOrderItemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  productName: { type: String, required: true },
  quantity: { type: Number, required: true, min: 1 },
  notes: { type: String }
}, { _id: false });

const kitchenOrderSchema = new mongoose.Schema({
  sale: { type: mongoose.Schema.Types.ObjectId, ref: 'Sale', required: true },
  tableNumber: { type: Number },
  items: [kitchenOrderItemSchema],
  status: {
    type: String,
    enum: ['nuevo', 'en_preparacion', 'entregado', 'pagado'],
    default: 'nuevo'
  },
  stateHistory: [stateHistorySchema],
  assignedCook: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  printCount: { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model('KitchenOrder', kitchenOrderSchema);
