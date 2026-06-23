const mongoose = require('mongoose');

// Categorías fijas de gastos operativos
const EXPENSE_CATEGORIES = [
  'arriendo',
  'servicios_publicos',
  'nomina',
  'mantenimiento_reparaciones',
  'insumos_aseo',
  'papeleria_oficina',
  'transporte_logistica',
  'publicidad_marketing',
  'impuestos_tasas',
  'otros'
];

const expenseSchema = new mongoose.Schema({
  category:    { type: String, enum: EXPENSE_CATEGORIES, required: true },
  description: { type: String, required: [true, 'La descripción es requerida'], trim: true },
  amount:      { type: Number, required: true, min: 0 },
  date:        { type: Date, required: true, default: Date.now },
  user:        { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  paymentMethod: { type: String, enum: ['efectivo', 'transferencia', 'tarjeta', 'otro'], default: 'efectivo' },
  invoiceNumber: { type: String, default: '' },
  supplier:    { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier', default: null },
  notes:       { type: String, default: '' },
  isRecurring: { type: Boolean, default: false }   // útil para arrendamientos / servicios fijos
}, { timestamps: true });

expenseSchema.index({ date: -1 });
expenseSchema.index({ category: 1, date: -1 });

module.exports = mongoose.model('Expense', expenseSchema);
module.exports.EXPENSE_CATEGORIES = EXPENSE_CATEGORIES;
