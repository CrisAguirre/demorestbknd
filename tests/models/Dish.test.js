const mongoose = require('mongoose');
const { connectDB, closeDB, clearDB, createTestIngredient } = require('../helpers');
const Dish = require('../../src/models/Dish');

beforeAll(async () => { await connectDB(); });
afterAll(async () => { await closeDB(); });
beforeEach(async () => { await clearDB(); });

describe('Dish Model', () => {
  it('should create a dish with ingredients', async () => {
    const ing = await createTestIngredient();
    const dish = await Dish.create({ name: 'Test Dish', category: 'Platos fuertes', price: 15000, ingredients: [{ ingredient: ing._id, quantity: 2 }] });
    expect(dish.name).toBe('Test Dish');
    expect(dish.ingredients).toHaveLength(1);
    expect(dish.isAvailable).toBe(true);
  });

  it('should calculate virtual recipeCost', async () => {
    const ing = await createTestIngredient({ cost: 2000 });
    const dish = await Dish.create({ name: 'Cost Test', category: 'Sopas', price: 20000, ingredients: [{ ingredient: ing._id, quantity: 3 }] });
    const populated = await Dish.findById(dish._id).populate('ingredients.ingredient');
    expect(populated.recipeCost).toBe(6000);
  });
});
