const Dish = require('../models/Dish');

exports.getAll = async (req, res, next) => {
  try {
    const dishes = await Dish.find({ isAvailable: true }).sort({ category: 1, name: 1 });
    res.json(dishes);
  } catch (error) {
    next(error);
  }
};

exports.create = async (req, res, next) => {
  try {
    const dish = await Dish.create(req.body);
    res.status(201).json(dish);
  } catch (error) {
    next(error);
  }
};

exports.update = async (req, res, next) => {
  try {
    const dish = await Dish.findByIdAndUpdate(req.params.id, req.body, {
      new: true, runValidators: true
    });
    if (!dish) return res.status(404).json({ message: 'Plato no encontrado' });
    res.json(dish);
  } catch (error) {
    next(error);
  }
};

exports.remove = async (req, res, next) => {
  try {
    const dish = await Dish.findByIdAndUpdate(req.params.id, { isAvailable: false }, { new: true });
    if (!dish) return res.status(404).json({ message: 'Plato no encontrado' });
    res.json({ message: 'Plato desactivado' });
  } catch (error) {
    next(error);
  }
};
