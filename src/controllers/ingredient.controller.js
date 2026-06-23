const Ingredient = require('../models/Ingredient');

exports.getAll = async (req, res, next) => {
  try {
    const ingredients = await Ingredient.find({ isActive: true }).sort({ name: 1 });
    res.json(ingredients);
  } catch (error) {
    next(error);
  }
};

exports.create = async (req, res, next) => {
  try {
    const ingredient = await Ingredient.create(req.body);
    res.status(201).json(ingredient);
  } catch (error) {
    next(error);
  }
};

exports.update = async (req, res, next) => {
  try {
    const ingredient = await Ingredient.findByIdAndUpdate(req.params.id, req.body, {
      new: true, runValidators: true
    });
    if (!ingredient) return res.status(404).json({ message: 'Ingrediente no encontrado' });
    res.json(ingredient);
  } catch (error) {
    next(error);
  }
};

exports.remove = async (req, res, next) => {
  try {
    const ingredient = await Ingredient.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
    if (!ingredient) return res.status(404).json({ message: 'Ingrediente no encontrado' });
    res.json({ message: 'Ingrediente desactivado' });
  } catch (error) {
    next(error);
  }
};
