const mongoose = require('mongoose');

// Sub-schema for embedded transactions
const transactionSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['abono', 'pago_completo', 'aumento_credito', 'nueva_deuda'],
    required: true
  },
  amount:        { type: Number, required: true },
  balanceBefore: { type: Number, required: true },
  balanceAfter:  { type: Number, required: true },
  notes:         { type: String, default: '' }
}, { timestamps: true });

const debtorSchema = new mongoose.Schema({
  code:            { type: String, required: true, unique: true, trim: true },
  name:            { type: String, required: [true, 'El nombre del deudor es requerido'], trim: true },
  address:         { type: String, default: '' },
  phone:           { type: String, default: '' },
  totalDebt:       { type: Number, default: 0 },
  creditLimit:     { type: Number, default: 0 },
  transactions:    [transactionSchema],
  lastPaymentDate: { type: Date, default: null },
  isActive:        { type: Boolean, default: true }
}, { timestamps: true });

debtorSchema.index({ name: 'text', phone: 'text', code: 'text' });

module.exports = mongoose.model('Debtor', debtorSchema);
