const { connectDB, closeDB, clearDB, createTestUser } = require('../helpers');
const Settings = require('../../src/models/Settings');
const Sale = require('../../src/models/Sale');
const Ingredient = require('../../src/models/Ingredient');
const Dish = require('../../src/models/Dish');
const { runBootSeeds, CURRENT_SEED_VERSION } = require('../../src/utils/runBootSeeds');

const silent = { log: () => {}, error: () => {} };

beforeAll(async () => { await connectDB(); });
afterAll(async () => { await closeDB(); });
beforeEach(async () => { await clearDB(); });

describe('runBootSeeds', () => {
  it('should mark old pending sales and bump version on first run', async () => {
    const user = await createTestUser();
    await Sale.create({ user: user._id, status: 'pendiente', items: [], total: 100 });

    const r = await runBootSeeds(silent);
    expect(r.ran).toBe(true);
    expect(r.version).toBe(CURRENT_SEED_VERSION);

    const sale = await Sale.findOne({});
    expect(sale.stockDeducted).toBe(true);
    const settings = await Settings.findOne({});
    expect(settings.seedVersion).toBe(CURRENT_SEED_VERSION);
  });

  it('should load demo recipes and bar items', async () => {
    const r = await runBootSeeds(silent);
    expect(r.ran).toBe(true);
    expect(await Ingredient.countDocuments({ code: 'BB-001' })).toBe(1);
    // v7: categorías rellenadas (barra conserva la del seed aunque se renombre)
    expect((await Ingredient.findOne({ code: 'BB-001' })).categoria).toBe('Licores y vinos');
    expect((await Ingredient.findOne({ code: 'BB-015' })).categoria).toBe('Insumos');
    expect((await Ingredient.findOne({ code: 'CP-001' })).categoria).toBe('Proteínas');    // v3 (carta 15) reemplaza el demo: RC-01/RP-01 se eliminan, entran C1..C15
    expect(await Dish.countDocuments({ code: 'RC-01' })).toBe(0);
    expect(await Dish.countDocuments({ code: 'C1' })).toBe(1);
    expect(await Dish.countDocuments({ code: /^C\d+$/ })).toBe(15);
  });

  it('should be a no-op on second run', async () => {
    await runBootSeeds(silent);
    const r2 = await runBootSeeds(silent);
    expect(r2.ran).toBe(false);
  });

  it('should migrate old pre-pago settings to post-pago', async () => {
    await Settings.create({ paymentMode: 'pre-pago' });
    await runBootSeeds(silent);
    const settings = await Settings.findOne({});
    expect(settings.paymentMode).toBe('post-pago');
    expect(settings.seedVersion).toBe(CURRENT_SEED_VERSION);
  });

  it('v8: should repair C1 recipe after manual deletions (stale/empty linkage)', async () => {
    await runBootSeeds(silent);
    // Simula prod con borrados manuales: receta vaciada y CP-001 eliminado.
    await Dish.updateOne({ code: 'C1' }, { $set: { ingredients: [] } });
    const cp = await Ingredient.findOne({ code: 'CP-001' });
    await Ingredient.deleteOne({ _id: cp._id });
    await Settings.updateOne({}, { $set: { seedVersion: 7 } });

    const r = await runBootSeeds(silent);
    expect(r.ran).toBe(true);
    const c1 = await Dish.findOne({ code: 'C1' }).populate('ingredients.ingredient');
    expect(c1.ingredients.length).toBe(12);
    const cpNuevo = await Ingredient.findOne({ code: 'CP-001' });
    expect(cpNuevo).not.toBeNull();
    expect(c1.ingredients.every((i) => i.ingredient)).toBe(true);
  });

  it('v8: should respect manual recipe edits (porcionado en unidades)', async () => {
    await runBootSeeds(silent);
    // El usuario porciona el filete en unidades de 100g: cambia receta manual.
    const cp = await Ingredient.findOne({ code: 'CP-001' });
    await Dish.updateOne(
      { code: 'C1' },
      { $set: { price: 30000, ingredients: [{ ingredient: cp._id, quantity: 1 }] } }
    );
    await Settings.updateOne({}, { $set: { seedVersion: 7 } });

    await runBootSeeds(silent);
    const c1 = await Dish.findOne({ code: 'C1' }).populate('ingredients.ingredient');
    expect(c1.price).toBe(30000);
    expect(c1.ingredients.length).toBe(1);
    expect(c1.ingredients[0].quantity).toBe(1);
  });
});
