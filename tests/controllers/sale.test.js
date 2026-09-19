const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const { connectDB, closeDB, clearDB, createTestCategory, createTestSupplier } = require('../helpers');
const saleRoutes = require('../../src/routes/sale.routes');
const User = require('../../src/models/User');
const Product = require('../../src/models/Product');
const Dish = require('../../src/models/Dish');
const Ingredient = require('../../src/models/Ingredient');
const Sale = require('../../src/models/Sale');
const Alert = require('../../src/models/Alert');
const Table = require('../../src/models/Table');
const KitchenOrder = require('../../src/models/KitchenOrder');

let app, adminToken, admin, category, supplier, product, ingredient, dish;

beforeAll(async () => {
  await connectDB();
  app = express();
  app.use(express.json());
  app.use('/api/sales', saleRoutes);
});
afterAll(async () => { await closeDB(); });
beforeEach(async () => {
  await clearDB();
  admin = await User.create({ name: 'Admin', email: 'a@test.com', passwordHash: 'Pass123!', role: 'admin' });
  adminToken = require('jsonwebtoken').sign({ id: admin._id }, process.env.JWT_SECRET);
  category = await createTestCategory();
  supplier = await createTestSupplier();
  product = await Product.create({ name: 'Test Product', barcode: 'PRD01', category: category._id, supplier: supplier._id, purchasePrice: 1000, salePrice: 2500, stock: 50, minStock: 5 });
  ingredient = await Ingredient.create({ name: 'Test Ingredient', unit: 'kilos', stock: 10, minStock: 2, cost: 5000 });
  dish = await Dish.create({ name: 'Test Dish', category: 'Platos fuertes', price: 15000, ingredients: [{ ingredient: ingredient._id, quantity: 2 }] });
});

describe('Sale Controller', () => {
  it('should create a sale with product items WITHOUT deducting stock (deducts on pay)', async () => {
    const res = await request(app).post('/api/sales').set('Authorization', `Bearer ${adminToken}`).send({ items: [{ product: product._id, quantity: 3 }] });
    expect(res.status).toBe(201);
    expect(res.body.total).toBe(7500);
    expect(res.body.stockDeducted).toBe(false);
    const updated = await Product.findById(product._id);
    expect(updated.stock).toBe(50);
  });

  it('should create KitchenOrder when sale has tableNumber', async () => {
    const Settings = require('../../src/models/Settings');
    await Settings.create({ paymentMode: 'post-pago' });
    await Table.create({ number: 5, status: 'libre' });
    const res = await request(app).post('/api/sales').set('Authorization', `Bearer ${adminToken}`).send({
      items: [{ product: product._id, quantity: 2 }],
      tableNumber: 5
    });
    expect(res.status).toBe(201);
    expect(res.body.status).toBe('pendiente');
    const kitchenOrders = await KitchenOrder.find({ tableNumber: 5 });
    expect(kitchenOrders).toHaveLength(1);
    expect(kitchenOrders[0].status).toBe('nuevo');
    expect(kitchenOrders[0].items).toHaveLength(1);
    expect(kitchenOrders[0].items[0].productName).toBe('Test Product');
    const table = await Table.findOne({ number: 5 });
    expect(table.status).toBe('ocupada');
    expect(table.currentSale.toString()).toBe(res.body._id);
    const updated = await Product.findById(product._id);
    expect(updated.stock).toBe(50);
  });

  it('should create a sale with dish items WITHOUT deducting ingredients (deducts on pay)', async () => {
    const res = await request(app).post('/api/sales').set('Authorization', `Bearer ${adminToken}`).send({ items: [{ product: dish._id, quantity: 2 }] });
    expect(res.status).toBe(201);
    expect(res.body.total).toBe(30000);
    const updated = await Ingredient.findById(ingredient._id);
    expect(updated.stock).toBe(10);
  });

  it('should reject insufficient product stock', async () => {
    const res = await request(app).post('/api/sales').set('Authorization', `Bearer ${adminToken}`).send({ items: [{ product: product._id, quantity: 100 }] });
    expect(res.status).toBe(400);
  });

  it('should reject insufficient ingredient stock', async () => {
    const res = await request(app).post('/api/sales').set('Authorization', `Bearer ${adminToken}`).send({ items: [{ product: dish._id, quantity: 10 }] });
    expect(res.status).toBe(400);
  });

  it('should create alert when stock goes below minStock on pay', async () => {
    const lowStock = await Product.create({ name: 'Low', barcode: 'LOW01', category: category._id, supplier: supplier._id, purchasePrice: 100, salePrice: 200, stock: 5, minStock: 5 });
    const sale = await Sale.create({ user: admin._id, status: 'pendiente', items: [{ product: lowStock._id, productName: 'Low', quantity: 1, unitPrice: 200, subtotal: 200 }], total: 200 });
    await request(app).post(`/api/sales/${sale._id}/pay`).set('Authorization', `Bearer ${adminToken}`).send({ paymentMethod: 'efectivo' });
    const alerts = await Alert.find({});
    expect(alerts.length).toBeGreaterThan(0);
  });

  describe('pay deducts stock', () => {
    it('should deduct product stock and mark stockDeducted on pay', async () => {
      const sale = await Sale.create({ user: admin._id, status: 'pendiente', items: [{ product: product._id, productName: 'Test Product', quantity: 3, unitPrice: 2500, subtotal: 7500 }], total: 7500 });
      const res = await request(app).post(`/api/sales/${sale._id}/pay`).set('Authorization', `Bearer ${adminToken}`).send({ paymentMethod: 'efectivo' });
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('pagada');
      expect(res.body.stockDeducted).toBe(true);
      const updated = await Product.findById(product._id);
      expect(updated.stock).toBe(47);
    });

    it('should deduct dish ingredients on pay', async () => {
      const sale = await Sale.create({ user: admin._id, status: 'pendiente', dishItems: [{ dish: dish._id, dishName: 'Test Dish', quantity: 2, unitPrice: 15000, subtotal: 30000, ingredientsConsumed: [{ ingredient: ingredient._id, ingredientName: 'Test Ingredient', quantity: 4, unit: 'kilos' }] }], total: 30000 });
      const res = await request(app).post(`/api/sales/${sale._id}/pay`).set('Authorization', `Bearer ${adminToken}`).send({});
      expect(res.status).toBe(200);
      const updated = await Ingredient.findById(ingredient._id);
      expect(updated.stock).toBe(6);
    });

    it('should reject pay with insufficient stock at billing time', async () => {
      const sale = await Sale.create({ user: admin._id, status: 'pendiente', items: [{ product: product._id, productName: 'Test Product', quantity: 3, unitPrice: 2500, subtotal: 7500 }], total: 7500 });
      await Product.findByIdAndUpdate(product._id, { stock: 1 });
      const res = await request(app).post(`/api/sales/${sale._id}/pay`).set('Authorization', `Bearer ${adminToken}`).send({});
      expect(res.status).toBe(400);
      const stillPending = await Sale.findById(sale._id);
      expect(stillPending.status).toBe('pendiente');
      const updated = await Product.findById(product._id);
      expect(updated.stock).toBe(1);
    });

    it('should reject paying an already paid sale', async () => {
      const sale = await Sale.create({ user: admin._id, status: 'pagada', stockDeducted: true, items: [{ product: product._id, productName: 'Test Product', quantity: 1, unitPrice: 2500, subtotal: 2500 }], total: 2500 });
      const res = await request(app).post(`/api/sales/${sale._id}/pay`).set('Authorization', `Bearer ${adminToken}`).send({});
      expect(res.status).toBe(400);
    });

    it('should free the table on pay', async () => {
      const table = await Table.create({ number: 7, status: 'ocupada' });
      const sale = await Sale.create({ user: admin._id, status: 'pendiente', items: [{ product: product._id, productName: 'Test Product', quantity: 1, unitPrice: 2500, subtotal: 2500 }], total: 2500 });
      table.currentSale = sale._id;
      await table.save();
      await request(app).post(`/api/sales/${sale._id}/pay`).set('Authorization', `Bearer ${adminToken}`).send({});
      const freed = await Table.findById(table._id);
      expect(freed.status).toBe('libre');
      expect(freed.currentSale).toBeNull();
    });
  });

  describe('cancel sale', () => {
    it('should cancel a pending sale and free the table WITHOUT touching stock', async () => {
      const table = await Table.create({ number: 8, status: 'ocupada' });
      const sale = await Sale.create({ user: admin._id, status: 'pendiente', items: [{ product: product._id, productName: 'Test Product', quantity: 2, unitPrice: 2500, subtotal: 5000 }], total: 5000 });
      table.currentSale = sale._id;
      await table.save();
      const res = await request(app).post(`/api/sales/${sale._id}/cancel`).set('Authorization', `Bearer ${adminToken}`).send({ reason: 'Cliente se fue' });
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('cancelada');
      const updated = await Product.findById(product._id);
      expect(updated.stock).toBe(50);
      const freed = await Table.findById(table._id);
      expect(freed.status).toBe('libre');
      expect(freed.currentSale).toBeNull();
    });

    it('should require a reason to cancel', async () => {
      const sale = await Sale.create({ user: admin._id, status: 'pendiente', items: [], total: 0 });
      const res = await request(app).post(`/api/sales/${sale._id}/cancel`).set('Authorization', `Bearer ${adminToken}`).send({});
      expect(res.status).toBe(400);
    });

    it('should reject cancelling a paid sale', async () => {
      const sale = await Sale.create({ user: admin._id, status: 'pagada', stockDeducted: true, items: [], total: 100 });
      const res = await request(app).post(`/api/sales/${sale._id}/cancel`).set('Authorization', `Bearer ${adminToken}`).send({ reason: 'x' });
      expect(res.status).toBe(400);
    });

    it('should return 404 when cancelling non-existent sale', async () => {
      const res = await request(app).post(`/api/sales/${new mongoose.Types.ObjectId()}/cancel`).set('Authorization', `Bearer ${adminToken}`).send({ reason: 'x' });
      expect(res.status).toBe(404);
    });
  });

  it('should list sales with pagination', async () => {
    await Sale.create({ user: admin._id, items: [{ product: product._id, productName: 'Test', quantity: 1, unitPrice: 100, subtotal: 100 }], total: 100 });
    const res = await request(app).get('/api/sales').set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.sales).toHaveLength(1);
  });

  it('should return sale by id', async () => {
    const sale = await Sale.create({ user: admin._id, items: [{ product: product._id, productName: 'Test', quantity: 1, unitPrice: 100, subtotal: 100 }], total: 100 });
    const res = await request(app).get(`/api/sales/${sale._id}`).set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(100);
  });

  it('should return 404 for non-existent sale', async () => {
    const res = await request(app).get(`/api/sales/${new mongoose.Types.ObjectId()}`).set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(404);
  });
});
