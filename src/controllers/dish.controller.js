const Dish = require('../models/Dish');
const Ingredient = require('../models/Ingredient');

exports.getAll = async (req, res, next) => {
  try {
    const dishes = await Dish.find({ isAvailable: true })
      .populate('ingredients.ingredient')
      .sort({ category: 1, name: 1 });
    res.json(dishes);
  } catch (error) {
    next(error);
  }
};

exports.create = async (req, res, next) => {
  try {
    let body = req.body;
    // Si viene como multipart/form-data, ingredients puede ser JSON string
    if (typeof body.ingredients === 'string') {
      try { body.ingredients = JSON.parse(body.ingredients); } catch { body.ingredients = []; }
    }
    const { ingredients } = body;
    if (ingredients && ingredients.length > 0) {
      for (const item of ingredients) {
        const ing = await Ingredient.findById(item.ingredient);
        if (!ing) {
          return res.status(400).json({ message: `Ingrediente ${item.ingredient} no encontrado` });
        }
      }
    }
    if (req.file) body.imageUrl = `/uploads/${req.file.filename}`;
    const dish = await Dish.create(body);
    const populated = await dish.populate('ingredients.ingredient');
    res.status(201).json(populated);
  } catch (error) {
    next(error);
  }
};

exports.update = async (req, res, next) => {
  try {
    let body = req.body;
    if (typeof body.ingredients === 'string') {
      try { body.ingredients = JSON.parse(body.ingredients); } catch { body.ingredients = []; }
    }
    const { ingredients } = body;
    if (ingredients && ingredients.length > 0) {
      for (const item of ingredients) {
        const ing = await Ingredient.findById(item.ingredient);
        if (!ing) {
          return res.status(400).json({ message: `Ingrediente ${item.ingredient} no encontrado` });
        }
      }
    }
    if (req.file) body.imageUrl = `/uploads/${req.file.filename}`;
    const dish = await Dish.findByIdAndUpdate(req.params.id, body, {
      new: true, runValidators: true
    }).populate('ingredients.ingredient');
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

exports.getRecipeCost = async (req, res, next) => {
  try {
    const dish = await Dish.findById(req.params.id).populate('ingredients.ingredient');
    if (!dish) return res.status(404).json({ message: 'Plato no encontrado' });
    const recipeCost = dish.ingredients.reduce((sum, item) => sum + (item.ingredient?.cost || 0) * item.quantity, 0);
    const margin = dish.price > 0 ? ((dish.price - recipeCost) / dish.price * 100).toFixed(1) : 0;
    res.json({
      dishId: dish._id,
      dishName: dish.name,
      salePrice: dish.price,
      recipeCost: Math.round(recipeCost * 100) / 100,
      margin: Number(margin),
      ingredients: dish.ingredients.map(i => ({
        name: i.ingredient?.name || 'Eliminado',
        quantity: i.quantity,
        unit: i.ingredient?.unit || 'unidades',
        costPerUnit: i.ingredient?.cost || 0,
        subtotal: Math.round((i.ingredient?.cost || 0) * i.quantity * 100) / 100
      }))
    });
  } catch (error) {
    next(error);
  }
};

exports.checkAvailability = async (req, res, next) => {
  try {
    const dish = await Dish.findById(req.params.id).populate('ingredients.ingredient');
    if (!dish) return res.status(404).json({ message: 'Plato no encontrado' });

    const missing = [];
    for (const item of dish.ingredients) {
      const ing = item.ingredient;
      if (ing) {
        if (ing.stock < item.quantity) {
          missing.push({
            ingredient: ing.name,
            required: item.quantity,
            available: ing.stock,
            deficit: Math.round((item.quantity - ing.stock) * 100) / 100
          });
        }
      } else {
        missing.push({ ingredient: 'Eliminado', quantity: item.quantity, available: 0 });
      }
    }

    res.json({
      dishId: dish._id,
      dishName: dish.name,
      available: missing.length === 0,
      missing
    });
  } catch (error) {
    next(error);
  }
};

exports.batchCheckAvailability = async (req, res, next) => {
  try {
    const { dishIds } = req.body;
    if (!dishIds || !Array.isArray(dishIds)) {
      return res.status(400).json({ message: 'Se requiere un array dishIds' });
    }

    const dishes = await Dish.find({ _id: { $in: dishIds } }).populate('ingredients.ingredient');
    const results = [];

    for (const dish of dishes) {
      const missing = [];
      for (const item of dish.ingredients) {
        const ing = item.ingredient;
        if (ing) {
          if (ing.stock < item.quantity) {
            missing.push({
              ingredient: ing.name,
              required: item.quantity,
              available: ing.stock,
              deficit: Math.round((item.quantity - ing.stock) * 100) / 100
            });
          }
        } else {
          missing.push({ ingredient: 'Eliminado', quantity: item.quantity, available: 0 });
        }
      }
      results.push({
        dishId: dish._id,
        dishName: dish.name,
        available: missing.length === 0,
        missing
      });
    }

    res.json(results);
  } catch (error) {
    next(error);
  }
};

exports.getAvailabilitySummary = async (req, res, next) => {
  try {
    const dishes = await Dish.find({ isAvailable: true }).populate('ingredients.ingredient');
    const results = [];

    for (const dish of dishes) {
      const ingredientDetails = [];
      let minPortions = Infinity;

      for (const item of dish.ingredients) {
        const ing = item.ingredient;
        if (ing) {
          const maxForThisIngredient = ing.stock / item.quantity;
          if (maxForThisIngredient < minPortions) {
            minPortions = maxForThisIngredient;
          }

          ingredientDetails.push({
            name: ing.name,
            required: item.quantity,
            available: ing.stock,
            unit: ing.unit,
            maxPortions: Math.floor(maxForThisIngredient)
          });
        } else {
          ingredientDetails.push({
            name: 'Eliminado',
            required: item.quantity,
            available: 0,
            unit: 'unidades',
            maxPortions: 0
          });
        }
      }

      const maxPortions = minPortions === Infinity ? 0 : Math.floor(minPortions);
      const recipeCost = dish.ingredients.reduce((sum, item) => sum + (item.ingredient?.cost || 0) * item.quantity, 0);
      const margin = dish.price > 0 ? ((dish.price - recipeCost) / dish.price * 100).toFixed(1) : 0;

      results.push({
        dishId: dish._id,
        dishName: dish.name,
        category: dish.category,
        price: dish.price,
        recipeCost: Math.round(recipeCost * 100) / 100,
        margin: Number(margin),
        available: maxPortions > 0,
        maxPortions,
        ingredients: ingredientDetails
      });
    }

    results.sort((a, b) => b.maxPortions - a.maxPortions);
    res.json({ dishes: results });
  } catch (error) {
    next(error);
  }
};

exports.getAvailabilityById = async (req, res, next) => {
  try {
    const dish = await Dish.findById(req.params.id).populate('ingredients.ingredient');
    if (!dish) return res.status(404).json({ message: 'Plato no encontrado' });

    const ingredientDetails = [];
    let minPortions = Infinity;
    const missing = [];

    for (const item of dish.ingredients) {
      const ing = item.ingredient;
      if (ing) {
        const maxForThisIngredient = ing.stock / item.quantity;
        if (maxForThisIngredient < minPortions) {
          minPortions = maxForThisIngredient;
        }

        ingredientDetails.push({
          name: ing.name,
          required: item.quantity,
          available: ing.stock,
          unit: ing.unit,
          maxPortions: Math.floor(maxForThisIngredient)
        });
      } else {
        ingredientDetails.push({
          name: 'Eliminado',
          required: item.quantity,
          available: 0,
          unit: 'unidades',
          maxPortions: 0
        });
        missing.push({ ingredient: 'Eliminado', required: item.quantity, available: 0 });
        minPortions = 0;
      }

      if (ing.stock < item.quantity) {
        missing.push({
          ingredient: ing.name,
          required: item.quantity,
          available: ing.stock,
          deficit: Math.round((item.quantity - ing.stock) * 100) / 100
        });
      }
    }

    const maxPortions = minPortions === Infinity ? 0 : Math.floor(minPortions);
    const recipeCost = dish.ingredients.reduce((sum, item) => sum + (item.ingredient?.cost || 0) * item.quantity, 0);
    const margin = dish.price > 0 ? ((dish.price - recipeCost) / dish.price * 100).toFixed(1) : 0;

    res.json({
      dishId: dish._id,
      dishName: dish.name,
      category: dish.category,
      price: dish.price,
      recipeCost: Math.round(recipeCost * 100) / 100,
      margin: Number(margin),
      available: maxPortions > 0,
      maxPortions,
      ingredients: ingredientDetails,
      missing
    });
  } catch (error) {
    next(error);
  }
};
