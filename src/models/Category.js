const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
  name: { type: String, required: [true, 'El nombre de categoría es requerido'], unique: true, trim: true },
  code: { type: String, unique: true, sparse: true, trim: true, minlength: 3, maxlength: 3 },
  icon: { type: String, default: '📦' },
  order: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('Category', categorySchema);
