const { connectDB, closeDB, clearDB } = require('../helpers');
const { seedBarraColombiaData } = require('../../src/utils/seedBarraColombia');
const Ingredient = require('../../src/models/Ingredient');

beforeAll(async () => { await connectDB(); });
afterAll(async () => { await closeDB(); });
beforeEach(async () => { await clearDB(); });

describe('seedBarraColombia', () => {
  it('should rename pisco to ron and add cocktail items', async () => {
    await Ingredient.create({ code: 'BB-001', name: 'Pisco quebranta 750ml', unit: 'botella', stock: 6, minStock: 4 });
    const r = await seedBarraColombiaData();
    expect(r.renombres).toBe(1);
    expect(r.nuevos).toBe(4);
    expect((await Ingredient.findOne({ code: 'BB-001' })).name).toBe('Ron Viejo de Caldas 750ml');
    expect(await Ingredient.countDocuments({ code: { $in: ['BB-015', 'BB-016', 'BB-017', 'BB-018'] } })).toBe(4);
  });

  it('should be idempotent', async () => {
    await seedBarraColombiaData();
    await seedBarraColombiaData();
    expect(await Ingredient.countDocuments({ code: { $in: ['BB-015', 'BB-016', 'BB-017', 'BB-018'] } })).toBe(4);
  });
});
