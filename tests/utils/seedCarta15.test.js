const { connectDB, closeDB, clearDB } = require('../helpers');
const { seedCarta15Data, limpiezaTotalCarta } = require('../../src/utils/seedCarta15');
const Dish = require('../../src/models/Dish');
const Ingredient = require('../../src/models/Ingredient');

beforeAll(async () => { await connectDB(); });
afterAll(async () => { await closeDB(); });
beforeEach(async () => { await clearDB(); });

describe('seedCarta15', () => {
  it('should create 15 dishes with linked recipes and remove the old menu', async () => {
    await Dish.create({ code: 'RC-01', name: 'Ceviche viejo', category: 'Entradas', price: 0 });
    await Dish.create({ name: 'Plato manual sin código', category: 'Platos fuertes', price: 10000 });

    const r = await seedCarta15Data();

    expect(r.platos).toBe(15);
    expect(r.eliminados).toBe(2);
    expect(await Dish.findOne({ code: 'RC-01' })).toBeNull();
    expect(await Dish.findOne({ name: 'Plato manual sin código' })).toBeNull();

    const c1 = await Dish.findOne({ code: 'C1' }).populate('ingredients.ingredient');
    expect(c1).toBeTruthy();
    expect(c1.category).toBe('Entradas');
    expect(c1.price).toBe(28000);
    expect(c1.ingredients.length).toBe(12);
    expect(c1.ingredients[0].ingredient.code).toBe('CP-001');

    const c8 = await Dish.findOne({ code: 'C8' });
    expect(c8.price).toBe(36000);

    const ingCount = await Ingredient.countDocuments({ code: { $in: ['CF-020', 'CA-026', 'CL-004', 'BI-003'] } });
    expect(ingCount).toBe(4);
  });

  it('should be idempotent', async () => {
    await seedCarta15Data();
    const r2 = await seedCarta15Data();
    expect(r2.platos).toBe(15);
    expect(await Dish.countDocuments({ code: /^C\d+$/ })).toBe(15);
  });

  it('should assign categoria on create and fill missing without overwriting user edits', async () => {
    await seedCarta15Data();
    expect((await Ingredient.findOne({ code: 'CP-001' })).categoria).toBe('Proteínas');
    expect((await Ingredient.findOne({ code: 'CF-002' })).categoria).toBe('Verduras y frutas');
    expect((await Ingredient.findOne({ code: 'CL-001' })).categoria).toBe('Lácteos');
    expect((await Ingredient.findOne({ code: 'CA-001' })).categoria).toBe('Abarrotes');

    // No pisa ediciones del usuario, pero sí rellena donde falta
    await Ingredient.updateOne({ code: 'CP-001' }, { $set: { categoria: 'Especial' } });
    await Ingredient.updateOne({ code: 'CA-001' }, { $set: { categoria: '' } });
    await seedCarta15Data();
    expect((await Ingredient.findOne({ code: 'CP-001' })).categoria).toBe('Especial');
    expect((await Ingredient.findOne({ code: 'CA-001' })).categoria).toBe('Abarrotes');
  });

  it('should wipe every non-C dish via limpiezaTotalCarta (v5 step)', async () => {
    await Dish.create({ code: 'RC-01', name: 'Viejo', category: 'Entradas', price: 0 });
    await Dish.create({ name: 'Manual sin código', category: 'Sopas', price: 5000 });
    await Dish.create({ code: 'C1', name: 'Ceviche', category: 'Entradas', price: 28000 });
    const r = await limpiezaTotalCarta();
    expect(r.eliminados).toBe(2);
    expect(await Dish.countDocuments({})).toBe(1);
    expect(await Dish.findOne({ code: 'C1' })).toBeTruthy();
  });
});
