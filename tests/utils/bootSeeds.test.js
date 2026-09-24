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
    expect(await Dish.countDocuments({ code: 'RC-01' })).toBe(1);
    expect(await Dish.countDocuments({ code: 'RP-01' })).toBe(1);
  });

  it('should be a no-op on second run', async () => {
    await runBootSeeds(silent);
    const r2 = await runBootSeeds(silent);
    expect(r2.ran).toBe(false);
  });
});
