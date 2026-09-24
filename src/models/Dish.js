const mongoose = require('mongoose');

const dishIngredientSchema = new mongoose.Schema({
  ingredient: { type: mongoose.Schema.Types.ObjectId, ref: 'Ingredient', required: true },
  quantity: { type: Number, required: true, min: 0.01 }
}, { _id: false });

const dishSchema = new mongoose.Schema({
  name: { type: String, required: [true, 'El nombre del plato es requerido'], trim: true },
  code: { type: String, unique: true, sparse: true, trim: true },
  category: { type: String, required: true, default: 'Platos fuertes' },
  price: { type: Number, required: true, min: 0 },
  description: { type: String, default: '' },
  imageUrl: { type: String, default: '' },
  isAvailable: { type: Boolean, default: true },
  preparation: { type: String, default: '' },
  ingredients: {
    type: [dishIngredientSchema],
    default: []
  }
}, { timestamps: true });

dishSchema.index({ name: 'text' });
dishSchema.index({ isAvailable: 1, category: 1 });

dishSchema.virtual('recipeCost').get(function () {
  return this.ingredients.reduce((sum, item) => sum + (item.ingredient?.cost || 0) * item.quantity, 0);
});

dishSchema.set('toJSON', { virtuals: true });
dishSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Dish', dishSchema);
