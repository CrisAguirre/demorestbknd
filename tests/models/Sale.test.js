const mongoose = require('mongoose');
const { connectDB, closeDB, clearDB } = require('../helpers');
const Sale = require('../../src/models/Sale');

beforeAll(async () => { await connectDB(); });
afterAll(async () => { await closeDB(); });
beforeEach(async () => { await clearDB(); });

describe('Sale Model', () => {
  it('should create a sale with valid data', async () => {
    const sale = await Sale.create({ user: new mongoose.Types.ObjectId(), items: [{ product: new mongoose.Types.ObjectId(), productName: 'Test', quantity: 2, unitPrice: 2500, subtotal: 5000 }], total: 5000, paymentMethod: 'efectivo' });
    expect(sale.items).toHaveLength(1);
    expect(sale.total).toBe(5000);
    expect(sale.customerName).toBe('Cliente general');
  });

  it('should reject negative total', async () => {
    await expect(Sale.create({ user: new mongoose.Types.ObjectId(), items: [], total: -100 })).rejects.toThrow();
  });

  it('should reject invalid payment method', async () => {
    await expect(Sale.create({ user: new mongoose.Types.ObjectId(), items: [], total: 0, paymentMethod: 'invalid' })).rejects.toThrow();
  });
});
