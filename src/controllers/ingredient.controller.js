const Ingredient = require('../models/Ingredient');
const Dish = require('../models/Dish');

async function recordMovement(document, type, quantity, previousStock, newStock, userId, reference, referenceModel, description) {
  document.movementHistory.push({
    type,
    quantity,
    previousStock,
    newStock,
    reference,
    referenceModel,
    description,
    user: userId
  });
  await document.save();
}

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

exports.restock = async (req, res, next) => {
  try {
    const { quantity, description, reference, referenceModel } = req.body;
    if (!quantity || quantity <= 0) {
      return res.status(400).json({ message: 'Cantidad debe ser mayor a 0' });
    }

    const ingredient = await Ingredient.findById(req.params.id);
    if (!ingredient) return res.status(404).json({ message: 'Ingrediente no encontrado' });

    const previousStock = ingredient.stock;
    ingredient.stock += quantity;
    await ingredient.save();

    await recordMovement(
      ingredient,
      'adjustment',
      quantity,
      previousStock,
      ingredient.stock,
      req.user?._id || null,
      reference || null,
      referenceModel || null,
      description || `Ajuste manual de stock: +${quantity} ${ingredient.unit}`
    );

    res.json({
      ingredient,
      previousStock,
      added: quantity,
      newStock: ingredient.stock
    });
  } catch (error) {
    next(error);
  }
};

exports.adjustStock = async (req, res, next) => {
  try {
    const { newStock, description } = req.body;
    if (newStock === undefined || newStock < 0) {
      return res.status(400).json({ message: 'Nuevo stock debe ser >= 0' });
    }

    const ingredient = await Ingredient.findById(req.params.id);
    if (!ingredient) return res.status(404).json({ message: 'Ingrediente no encontrado' });

    const previousStock = ingredient.stock;
    const difference = newStock - previousStock;
    ingredient.stock = newStock;
    await ingredient.save();

    if (difference !== 0) {
      await recordMovement(
        ingredient,
        'adjustment',
        Math.abs(difference),
        previousStock,
        ingredient.stock,
        req.user?._id || null,
        null,
        null,
        description || `Ajuste de stock: ${previousStock} -> ${newStock}`
      );
    }

    res.json({
      ingredient,
      previousStock,
      newStock: ingredient.stock,
      difference
    });
  } catch (error) {
    next(error);
  }
};

exports.getMovementHistory = async (req, res, next) => {
  try {
    const { limit = 50, skip = 0 } = req.query;
    const ingredient = await Ingredient.findById(req.params.id);
    if (!ingredient) return res.status(404).json({ message: 'Ingrediente no encontrado' });

    const history = ingredient.movementHistory
      .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
      .slice(Number(skip), Number(skip) + Number(limit));

    res.json({
      ingredient: ingredient._id,
      ingredientName: ingredient.name,
      currentStock: ingredient.stock,
      totalMovements: ingredient.movementHistory.length,
      movements: history
    });
  } catch (error) {
    next(error);
  }
};

exports.getDishesUsingIngredient = async (req, res, next) => {
  try {
    const ingredient = await Ingredient.findById(req.params.id);
    if (!ingredient) return res.status(404).json({ message: 'Ingrediente no encontrado' });

    const dishes = await Dish.find({ 'ingredients.ingredient': req.params.id, isAvailable: true });

    const dishesWithUsage = dishes.map(dish => {
      const ingredientEntry = dish.ingredients.find(i => i.ingredient.toString() === req.params.id);
      return {
        dishId: dish._id,
        dishName: dish.name,
        category: dish.category,
        price: dish.price,
        quantityPerPortion: ingredientEntry ? ingredientEntry.quantity : 0,
        unit: ingredient.unit,
        maxPortionsFromThisIngredient: ingredientEntry
          ? Math.floor(ingredient.stock / ingredientEntry.quantity)
          : 0
      };
    });

    res.json({
      ingredient: {
        _id: ingredient._id,
        name: ingredient.name,
        stock: ingredient.stock,
        unit: ingredient.unit,
        minStock: ingredient.minStock
      },
      dishes: dishesWithUsage
    });
  } catch (error) {
    next(error);
  }
};
