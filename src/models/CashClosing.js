const mongoose = require('mongoose');

const cashClosingSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  openedAt: { type: Date, required: true, default: Date.now },
  closedAt: { type: Date, default: null },
  initialAmount: { type: Number, required: true, default: 0, min: 0 },
  totalSales: { type: Number, default: 0, min: 0 },
  totalTransactions: { type: Number, default: 0, min: 0 },
  expectedCash: { type: Number, default: 0 },
  actualCash: { type: Number, default: null },
  difference: { type: Number, default: 0 },
  notes: { type: String, default: '' },
  status: { type: String, enum: ['abierta', 'cerrada'], default: 'abierta' }
}, { timestamps: true });

module.exports = mongoose.model('CashClosing', cashClosingSchema);
