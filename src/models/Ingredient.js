const mongoose = require('mongoose');

const ingredientMovementSchema = new mongoose.Schema({
  type: { type: String, enum: ['sale', 'purchase', 'adjustment', 'initial'], required: true },
  quantity: { type: Number, required: true },
  previousStock: { type: Number, required: true },
  newStock: { type: Number, required: true },
  reference: { type: mongoose.Schema.Types.ObjectId, default: null },
  referenceModel: { type: String, default: null },
  description: { type: String, default: '' },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }
}, { _id: false, timestamps: true });

const ingredientSchema = new mongoose.Schema({
  name: { type: String, required: [true, 'El nombre del ingrediente es requerido'], trim: true },
  unit: { type: String, required: true, default: 'unidades' },
  ubicacion: { type: String, default: '' },
  stock: { type: Number, required: true, default: 0, min: 0 },
  minStock: { type: Number, default: 5, min: 0 },
  cost: { type: Number, required: true, default: 0, min: 0 },
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', default: null },
  isActive: { type: Boolean, default: true },
  movementHistory: [ingredientMovementSchema]
}, { timestamps: true });

ingredientSchema.index({ name: 'text' });
ingredientSchema.index({ isActive: 1, name: 1 });
ingredientSchema.index({ product: 1 });

module.exports = mongoose.model('Ingredient', ingredientSchema);
