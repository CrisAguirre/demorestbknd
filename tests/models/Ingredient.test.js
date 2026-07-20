const { connectDB, closeDB, clearDB } = require('../helpers');
const Ingredient = require('../../src/models/Ingredient');

beforeAll(async () => { await connectDB(); });
afterAll(async () => { await closeDB(); });
beforeEach(async () => { await clearDB(); });

describe('Ingredient Model', () => {
  it('should create an ingredient with valid data', async () => {
    const ing = await Ingredient.create({ name: 'Test', unit: 'kilos', stock: 10, minStock: 2, cost: 5000 });
    expect(ing.name).toBe('Test');
    expect(ing.unit).toBe('kilos');
    expect(ing.isActive).toBe(true);
  });

  it('should default unit to unidades', async () => {
    const ing = await Ingredient.create({ name: 'Default', stock: 5, minStock: 1, cost: 1000 });
    expect(ing.unit).toBe('unidades');
  });

  it('should enforce minimums', async () => {
    await expect(Ingredient.create({ name: 'Bad', stock: -1, cost: -1 })).rejects.toThrow();
  });
});
