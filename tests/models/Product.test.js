const mongoose = require('mongoose');
const { connectDB, closeDB, clearDB, createTestCategory, createTestSupplier } = require('../helpers');
const Product = require('../../src/models/Product');

beforeAll(async () => { await connectDB(); });
afterAll(async () => { await closeDB(); });
beforeEach(async () => { await clearDB(); });

describe('Product Model', () => {
  it('should create a product with valid data', async () => {
    const cat = await createTestCategory();
    const sup = await createTestSupplier();
    const p = await Product.create({ name: 'Test', barcode: 'T001', category: cat._id, supplier: sup._id, purchasePrice: 1000, salePrice: 2500, stock: 50, minStock: 5 });
    expect(p.name).toBe('Test');
    expect(p.stock).toBe(50);
    expect(p.isActive).toBe(true);
  });

  it('should enforce minimum prices', async () => {
    const cat = await createTestCategory();
    const sup = await createTestSupplier();
    await expect(Product.create({ name: 'Bad', barcode: 'B001', category: cat._id, supplier: sup._id, purchasePrice: -1, salePrice: -1 })).rejects.toThrow();
  });

  it('should default minStock to 5', async () => {
    const cat = await createTestCategory();
    const sup = await createTestSupplier();
    const p = await Product.create({ name: 'Default', barcode: 'D001', category: cat._id, supplier: sup._id, purchasePrice: 100, salePrice: 200, stock: 10 });
    expect(p.minStock).toBe(5);
  });

  it('should enforce unique barcode', async () => {
    const cat = await createTestCategory();
    const sup = await createTestSupplier();
    await Product.create({ name: 'P1', barcode: 'UNIQUE', category: cat._id, supplier: sup._id, purchasePrice: 100, salePrice: 200 });
    await expect(Product.create({ name: 'P2', barcode: 'UNIQUE', category: cat._id, supplier: sup._id, purchasePrice: 100, salePrice: 200 })).rejects.toThrow();
  });
});
