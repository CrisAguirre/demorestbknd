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
  it('should create a sale with product items', async () => {
    const res = await request(app).post('/api/sales').set('Authorization', `Bearer ${adminToken}`).send({ items: [{ product: product._id, quantity: 3 }] });
    expect(res.status).toBe(201);
    expect(res.body.total).toBe(7500);
    const updated = await Product.findById(product._id);
    expect(updated.stock).toBe(47);
  });

  it('should create a sale with dish items (deduct ingredients)', async () => {
    const res = await request(app).post('/api/sales').set('Authorization', `Bearer ${adminToken}`).send({ items: [{ product: dish._id, quantity: 2 }] });
    expect(res.status).toBe(201);
    expect(res.body.total).toBe(30000);
    const updated = await Ingredient.findById(ingredient._id);
    expect(updated.stock).toBe(6);
  });

  it('should reject insufficient product stock', async () => {
    const res = await request(app).post('/api/sales').set('Authorization', `Bearer ${adminToken}`).send({ items: [{ product: product._id, quantity: 100 }] });
    expect(res.status).toBe(400);
  });

  it('should reject insufficient ingredient stock', async () => {
    const res = await request(app).post('/api/sales').set('Authorization', `Bearer ${adminToken}`).send({ items: [{ product: dish._id, quantity: 10 }] });
    expect(res.status).toBe(400);
  });

  it('should create alert when stock goes below minStock', async () => {
    const lowStock = await Product.create({ name: 'Low', barcode: 'LOW01', category: category._id, supplier: supplier._id, purchasePrice: 100, salePrice: 200, stock: 5, minStock: 5 });
    await request(app).post('/api/sales').set('Authorization', `Bearer ${adminToken}`).send({ items: [{ product: lowStock._id, quantity: 1 }] });
    const alerts = await Alert.find({});
    expect(alerts.length).toBeGreaterThan(0);
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
