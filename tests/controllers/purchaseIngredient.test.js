const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const { connectDB, closeDB, clearDB, createTestIngredient, createTestSupplier } = require('../helpers');
const purchaseIngredientRoutes = require('../../src/routes/purchaseIngredient.routes');
const User = require('../../src/models/User');
const Ingredient = require('../../src/models/Ingredient');
const PurchaseIngredient = require('../../src/models/PurchaseIngredient');

let app, adminToken, admin, ingredient, supplier;

beforeAll(async () => {
  await connectDB();
  app = express();
  app.use(express.json());
  app.use('/api/purchases-ingredients', purchaseIngredientRoutes);
});
afterAll(async () => { await closeDB(); });
beforeEach(async () => {
  await clearDB();
  admin = await User.create({ name: 'Admin', email: 'a@test.com', passwordHash: 'Pass123!', role: 'admin' });
  adminToken = require('jsonwebtoken').sign({ id: admin._id }, process.env.JWT_SECRET);
  ingredient = await Ingredient.create({ name: 'Cebolla', unit: 'kilos', stock: 10, minStock: 5, cost: 3000 });
  supplier = await createTestSupplier();
});

describe('PurchaseIngredient Controller', () => {
  it('should create a purchase and increase ingredient stock', async () => {
    const res = await request(app)
      .post('/api/purchases-ingredients')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        supplier: supplier._id,
        supplierName: supplier.name,
        items: [{ ingredient: ingredient._id, quantity: 20, unitCost: 3500 }],
        invoiceNumber: 'FAC-001',
        paymentMethod: 'efectivo'
      });

    expect(res.status).toBe(201);
    expect(res.body.items[0].subtotal).toBe(70000);

    const updated = await Ingredient.findById(ingredient._id);
    expect(updated.stock).toBe(30);
    expect(updated.cost).toBe(3500);
  });

  it('should reject empty items', async () => {
    const res = await request(app)
      .post('/api/purchases-ingredients')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ items: [] });

    expect(res.status).toBe(400);
  });

  it('should reject non-existent ingredient', async () => {
    const res = await request(app)
      .post('/api/purchases-ingredients')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        items: [{ ingredient: new mongoose.Types.ObjectId(), quantity: 5, unitCost: 1000 }]
      });

    expect(res.status).toBe(404);
  });

  it('should list purchases with pagination', async () => {
    await PurchaseIngredient.create({
      user: admin._id,
      items: [{ ingredient: ingredient._id, ingredientName: 'Test', quantity: 5, unitCost: 1000, unit: 'kg', subtotal: 5000 }],
      total: 5000
    });

    const res = await request(app)
      .get('/api/purchases-ingredients')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.purchases).toHaveLength(1);
  });

  it('should get purchase by id', async () => {
    const purchase = await PurchaseIngredient.create({
      user: admin._id,
      supplierName: 'Test',
      items: [{ ingredient: ingredient._id, ingredientName: 'Test', quantity: 3, unitCost: 2000, unit: 'kg', subtotal: 6000 }],
      total: 6000
    });

    const res = await request(app)
      .get(`/api/purchases-ingredients/${purchase._id}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.total).toBe(6000);
  });

  it('should return 404 for non-existent purchase', async () => {
    const res = await request(app)
      .get(`/api/purchases-ingredients/${new mongoose.Types.ObjectId()}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(404);
  });

  it('should update purchase status', async () => {
    const purchase = await PurchaseIngredient.create({
      user: admin._id,
      supplierName: 'Test',
      items: [{ ingredient: ingredient._id, ingredientName: 'Test', quantity: 3, unitCost: 2000, unit: 'kg', subtotal: 6000 }],
      total: 6000,
      status: 'pendiente'
    });

    const res = await request(app)
      .put(`/api/purchases-ingredients/${purchase._id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'recibida' });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('recibida');
  });

  it('should cancel purchase', async () => {
    const purchase = await PurchaseIngredient.create({
      user: admin._id,
      supplierName: 'Test',
      items: [{ ingredient: ingredient._id, ingredientName: 'Test', quantity: 3, unitCost: 2000, unit: 'kg', subtotal: 6000 }],
      total: 6000,
      status: 'recibida'
    });

    const res = await request(app)
      .delete(`/api/purchases-ingredients/${purchase._id}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);

    const updated = await PurchaseIngredient.findById(purchase._id);
    expect(updated.status).toBe('anulada');
  });

  it('should reject unauthenticated request', async () => {
    const res = await request(app)
      .post('/api/purchases-ingredients')
      .send({ items: [{ ingredient: ingredient._id, quantity: 5, unitCost: 1000 }] });

    expect(res.status).toBe(401);
  });

  it('should reject non-admin for create', async () => {
    const cajero = await User.create({ name: 'C', email: 'c@test.com', passwordHash: 'Pass123!', role: 'cajero' });
    const token = require('jsonwebtoken').sign({ id: cajero._id }, process.env.JWT_SECRET);

    const res = await request(app)
      .post('/api/purchases-ingredients')
      .set('Authorization', `Bearer ${token}`)
      .send({ items: [{ ingredient: ingredient._id, quantity: 5, unitCost: 1000 }] });

    expect(res.status).toBe(403);
  });
});
