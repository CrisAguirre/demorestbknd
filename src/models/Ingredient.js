const mongoose = require('mongoose');

const ingredientSchema = new mongoose.Schema({
  name: { type: String, required: [true, 'El nombre del ingrediente es requerido'], trim: true },
  unit: { type: String, required: true, default: 'unidades' }, // kg, L, gramos, unidades
  stock: { type: Number, required: true, default: 0, min: 0 },
  minStock: { type: Number, default: 5, min: 0 },
  cost: { type: Number, required: true, default: 0, min: 0 },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

ingredientSchema.index({ name: 'text' });
ingredientSchema.index({ isActive: 1, name: 1 });

module.exports = mongoose.model('Ingredient', ingredientSchema);
