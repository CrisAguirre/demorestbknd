const { connectDB, closeDB, clearDB } = require('../helpers');
const { seedCostosReferenciaData, COSTOS } = require('../../src/utils/seedCostosReferencia');
const Ingredient = require('../../src/models/Ingredient');

beforeAll(async () => { await connectDB(); });
afterAll(async () => { await closeDB(); });
beforeEach(async () => { await clearDB(); });

describe('seedCostosReferencia', () => {
  it('should set reference costs without touching stock', async () => {
    await Ingredient.create({ code: 'CP-001', name: 'Pescado', unit: 'g', stock: 100, minStock: 10, cost: 0 });
    const r = await seedCostosReferenciaData();
    expect(r.aplicados).toBe(1);
    const ing = await Ingredient.findOne({ code: 'CP-001' });
    expect(ing.cost).toBe(COSTOS['CP-001']);
    expect(ing.stock).toBe(100);
  });

  it('should be idempotent', async () => {
    await Ingredient.create({ code: 'CA-001', name: 'Sal', unit: 'g', stock: 50, cost: 0 });
    await seedCostosReferenciaData();
    await seedCostosReferenciaData();
    expect((await Ingredient.findOne({ code: 'CA-001' })).cost).toBe(COSTOS['CA-001']);
  });
});
