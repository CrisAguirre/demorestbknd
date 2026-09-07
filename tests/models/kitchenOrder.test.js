const mongoose = require('mongoose');
const { connectDB, closeDB, clearDB } = require('../helpers');
const KitchenOrder = require('../../src/models/KitchenOrder');

beforeAll(async () => { await connectDB(); });
afterAll(async () => { await closeDB(); });
beforeEach(async () => { await clearDB(); });

describe('KitchenOrder Model', () => {
  const validData = () => ({
    sale: new mongoose.Types.ObjectId(),
    items: [{ product: new mongoose.Types.ObjectId(), productType: 'Product', productName: 'Test Item', quantity: 2 }],
    status: 'nuevo',
    stateHistory: [{ state: 'nuevo', timestamp: new Date() }]
  });

  it('should create a KitchenOrder with valid data', async () => {
    const order = await KitchenOrder.create(validData());
    expect(order).toBeDefined();
    expect(order.status).toBe('nuevo');
    expect(order.items).toHaveLength(1);
    expect(order.items[0].productName).toBe('Test Item');
    expect(order.items[0].productType).toBe('Product');
    expect(order.printCount).toBe(0);
  });

  it('should create KitchenOrder with Dish items', async () => {
    const dishId = new mongoose.Types.ObjectId();
    const order = await KitchenOrder.create({
      sale: new mongoose.Types.ObjectId(),
      items: [
        { product: dishId, productType: 'Dish', productName: 'Sopa especial', quantity: 3 }
      ],
      status: 'nuevo',
      stateHistory: [{ state: 'nuevo', timestamp: new Date() }]
    });
    expect(order.items[0].productType).toBe('Dish');
    expect(order.items[0].product.toString()).toBe(dishId.toString());
  });

  it('should default status to nuevo', async () => {
    const order = await KitchenOrder.create({
      sale: new mongoose.Types.ObjectId(),
      items: [{ product: new mongoose.Types.ObjectId(), productType: 'Product', productName: 'X', quantity: 1 }],
      stateHistory: [{ state: 'nuevo', timestamp: new Date() }]
    });
    expect(order.status).toBe('nuevo');
  });

  it('should reject invalid status enum', async () => {
    const promise = KitchenOrder.create({ ...validData(), status: 'invalido' });
    await expect(promise).rejects.toThrow();
  });

  it('should accept valid status transitions: en_preparacion, entregado, pagado', async () => {
    const base = validData();
    for (const s of ['en_preparacion', 'entregado', 'pagado']) {
      const order = await KitchenOrder.create({ ...base, status: s });
      expect(order.status).toBe(s);
    }
  });

  it('should require sale field', async () => {
    const promise = KitchenOrder.create({ items: [{ product: new mongoose.Types.ObjectId(), productType: 'Product', productName: 'X', quantity: 1 }] });
    await expect(promise).rejects.toThrow();
  });

  it('should require at least one item', async () => {
    const promise = KitchenOrder.create({ sale: new mongoose.Types.ObjectId(), items: [] });
    await expect(promise).rejects.toThrow();
  });

  it('should reject items with quantity < 1', async () => {
    const promise = KitchenOrder.create({
      sale: new mongoose.Types.ObjectId(),
      items: [{ product: new mongoose.Types.ObjectId(), productType: 'Product', productName: 'X', quantity: 0 }],
      stateHistory: [{ state: 'nuevo', timestamp: new Date() }]
    });
    await expect(promise).rejects.toThrow();
  });

  it('should store stateHistory entries', async () => {
    const order = await KitchenOrder.create(validData());
    expect(order.stateHistory).toHaveLength(1);
    expect(order.stateHistory[0].state).toBe('nuevo');
    expect(order.stateHistory[0].timestamp).toBeDefined();
  });

  it('should allow multiple stateHistory entries', async () => {
    const order = await KitchenOrder.create({
      sale: new mongoose.Types.ObjectId(),
      items: [{ product: new mongoose.Types.ObjectId(), productType: 'Product', productName: 'X', quantity: 1 }],
      status: 'entregado',
      stateHistory: [
        { state: 'nuevo', timestamp: new Date(Date.now() - 60000) },
        { state: 'en_preparacion', timestamp: new Date(Date.now() - 30000) },
        { state: 'entregado', timestamp: new Date() }
      ]
    });
    expect(order.stateHistory).toHaveLength(3);
  });

  it('should support tableNumber and assignedCook fields', async () => {
    const cook = new mongoose.Types.ObjectId();
    const order = await KitchenOrder.create({
      ...validData(),
      tableNumber: 5,
      assignedCook: cook
    });
    expect(order.tableNumber).toBe(5);
    expect(order.assignedCook.toString()).toBe(cook.toString());
  });

  it('should include timestamps (createdAt, updatedAt)', async () => {
    const order = await KitchenOrder.create(validData());
    expect(order.createdAt).toBeDefined();
    expect(order.updatedAt).toBeDefined();
  });
});
