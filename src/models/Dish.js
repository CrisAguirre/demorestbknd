const mongoose = require('mongoose');

const dishSchema = new mongoose.Schema({
  name: { type: String, required: [true, 'El nombre del plato es requerido'], trim: true },
  category: { type: String, required: true, default: 'Platos fuertes' }, 
  price: { type: Number, required: true, min: 0 },
  description: { type: String, default: '' },
  imageUrl: { type: String, default: '' },
  isAvailable: { type: Boolean, default: true }
}, { timestamps: true });

dishSchema.index({ name: 'text' });
dishSchema.index({ isAvailable: 1, category: 1 });

module.exports = mongoose.model('Dish', dishSchema);
