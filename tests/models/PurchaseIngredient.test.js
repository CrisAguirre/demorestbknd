const mongoose = require('mongoose');
const { connectDB, closeDB, clearDB, createTestIngredient, createTestSupplier, createTestUser } = require('../helpers');
const PurchaseIngredient = require('../../src/models/PurchaseIngredient');
const Ingredient = require('../../src/models/Ingredient');

beforeAll(async () => { await connectDB(); });
afterAll(async () => { await closeDB(); });
beforeEach(async () => { await clearDB(); });

describe('PurchaseIngredient Model', () => {
  it('should create a purchase with ingredients', async () => {
    const supplier = await createTestSupplier();
    const user = await createTestUser();
    const ing1 = await createTestIngredient({ name: 'Ingr1', stock: 0 });
    const ing2 = await createTestIngredient({ name: 'Ingr2', stock: 0 });

    const purchase = await PurchaseIngredient.create({
      supplier: supplier._id,
      supplierName: supplier.name,
      user: user._id,
      items: [
        { ingredient: ing1._id, ingredientName: 'Ingr1', quantity: 10, unitCost: 5000, unit: 'kilos', subtotal: 50000 },
        { ingredient: ing2._id, ingredientName: 'Ingr2', quantity: 5, unitCost: 3000, unit: 'litros', subtotal: 15000 }
      ],
      total: 65000,
      invoiceNumber: 'INV-001',
      paymentMethod: 'efectivo',
      status: 'recibida'
    });

    expect(purchase.supplierName).toBe(supplier.name);
    expect(purchase.items).toHaveLength(2);
    expect(purchase.total).toBe(65000);
    expect(purchase.status).toBe('recibida');
  });

  it('should default supplierName to Sin proveedor', async () => {
    const user = await createTestUser();
    const ing = await createTestIngredient({ stock: 0 });

    const purchase = await PurchaseIngredient.create({
      user: user._id,
      items: [{ ingredient: ing._id, ingredientName: 'Test', quantity: 5, unitCost: 1000, unit: 'kg', subtotal: 5000 }],
      total: 5000
    });

    expect(purchase.supplierName).toBe('Sin proveedor');
  });

  it('should enforce minimum quantity > 0', async () => {
    const user = await createTestUser();
    const ing = await createTestIngredient({ stock: 0 });

    await expect(PurchaseIngredient.create({
      user: user._id,
      items: [{ ingredient: ing._id, ingredientName: 'Test', quantity: 0, unitCost: 1000, unit: 'kg', subtotal: 0 }],
      total: 0
    })).rejects.toThrow();
  });

  it('should reject negative total', async () => {
    const user = await createTestUser();
    const ing = await createTestIngredient({ stock: 0 });

    await expect(PurchaseIngredient.create({
      user: user._id,
      items: [{ ingredient: ing._id, ingredientName: 'Test', quantity: 1, unitCost: 1000, unit: 'kg', subtotal: -1000 }],
      total: -1000
    })).rejects.toThrow();
  });
});
