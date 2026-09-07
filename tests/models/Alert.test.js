const mongoose = require('mongoose');
const { connectDB, closeDB, clearDB } = require('../helpers');
const Alert = require('../../src/models/Alert');
const Product = require('../../src/models/Product');
const Ingredient = require('../../src/models/Ingredient');
const Category = require('../../src/models/Category');
const Supplier = require('../../src/models/Supplier');

beforeAll(async () => { await connectDB(); });
afterAll(async () => { await closeDB(); });
beforeEach(async () => { await clearDB(); });

describe('Alert Model', () => {
  it('should create an alert for product', async () => {
    const category = await Category.create({ name: 'Test', code: 'TST', icon: '📦' });
    const supplier = await Supplier.create({ name: 'Supplier', code: 'SUP' });
    const product = await Product.create({ name: 'Test Product', barcode: 'TST01', category: category._id, supplier: supplier._id, purchasePrice: 1000, salePrice: 2000, stock: 0, minStock: 5 });

    const alert = await Alert.create({
      product: product._id,
      type: 'sin_stock',
      message: 'Producto agotado',
      priority: 'alta'
    });

    expect(alert.product.toString()).toBe(product._id.toString());
    expect(alert.ingredient).toBeNull();
    expect(alert.type).toBe('sin_stock');
    expect(alert.priority).toBe('alta');
    expect(alert.read).toBe(false);
  });

  it('should create an alert for ingredient', async () => {
    const ingredient = await Ingredient.create({ name: 'Test Ingredient', unit: 'kilos', stock: 2, minStock: 5, cost: 1000 });

    const alert = await Alert.create({
      ingredient: ingredient._id,
      type: 'stock_bajo',
      message: 'Ingrediente con stock bajo',
      priority: 'media'
    });

    expect(alert.ingredient.toString()).toBe(ingredient._id.toString());
    expect(alert.product).toBeNull();
    expect(alert.type).toBe('stock_bajo');
  });

  it('should enforce valid alert types', async () => {
    await expect(Alert.create({
      type: 'invalid_type',
      message: 'Test'
    })).rejects.toThrow();
  });

  it('should enforce valid priority levels', async () => {
    await expect(Alert.create({
      type: 'stock_bajo',
      message: 'Test',
      priority: 'invalid_priority'
    })).rejects.toThrow();
  });

  it('should default read to false', async () => {
    const alert = await Alert.create({
      type: 'stock_bajo',
      message: 'Test alert'
    });
    expect(alert.read).toBe(false);
  });
});
