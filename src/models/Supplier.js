const mongoose = require('mongoose');

const supplierSchema = new mongoose.Schema({
  name:        { type: String, required: [true, 'El nombre del proveedor es requerido'], trim: true },
  code:        { type: String, required: [true, 'El código del proveedor es requerido'], unique: true, trim: true },
  categories:  [{ type: mongoose.Schema.Types.ObjectId, ref: 'Category' }],
  contactName: { type: String, default: '' },
  phone:       { type: String, default: '' },
  email:       { type: String, default: '' },
  address:     { type: String, default: '' },
  nit:         { type: String, default: '' },          // RUT / NIT / cédula
  notes:       { type: String, default: '' },
  isActive:    { type: Boolean, default: true }
}, { timestamps: true });

supplierSchema.index({ name: 'text', nit: 'text' });

module.exports = mongoose.model('Supplier', supplierSchema);
