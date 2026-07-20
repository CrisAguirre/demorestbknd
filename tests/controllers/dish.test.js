const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const { connectDB, closeDB, clearDB } = require('../helpers');
const dishRoutes = require('../../src/routes/dish.routes');
const User = require('../../src/models/User');
const Dish = require('../../src/models/Dish');
const Ingredient = require('../../src/models/Ingredient');

let app, adminToken, admin, ingredient;

beforeAll(async () => {
  await connectDB();
  app = express();
  app.use(express.json());
  app.use('/api/dishes', dishRoutes);
});
afterAll(async () => { await closeDB(); });
beforeEach(async () => {
  await clearDB();
  admin = await User.create({ name: 'Admin', email: 'a@test.com', passwordHash: 'Pass123!', role: 'admin' });
  adminToken = require('jsonwebtoken').sign({ id: admin._id }, process.env.JWT_SECRET);
  ingredient = await Ingredient.create({ name: 'Papa', unit: 'kilos', stock: 20, minStock: 5, cost: 2000 });
});

describe('Dish Controller', () => {
  it('should list available dishes', async () => {
    await Dish.create({ name: 'Test Dish', category: 'Platos fuertes', price: 15000, ingredients: [{ ingredient: ingredient._id, quantity: 2 }] });
    const res = await request(app).get('/api/dishes').set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
  });

  it('should create a dish', async () => {
    const res = await request(app).post('/api/dishes').set('Authorization', `Bearer ${adminToken}`).send({ name: 'New Dish', category: 'Sopas', price: 12000, ingredients: [{ ingredient: ingredient._id, quantity: 1 }] });
    expect(res.status).toBe(201);
    expect(res.body.name).toBe('New Dish');
  });

  it('should reject non-existent ingredient', async () => {
    const res = await request(app).post('/api/dishes').set('Authorization', `Bearer ${adminToken}`).send({ name: 'Bad', category: 'Sopas', price: 10000, ingredients: [{ ingredient: new mongoose.Types.ObjectId(), quantity: 1 }] });
    expect(res.status).toBe(400);
  });

  it('should reject non-admin', async () => {
    const cajero = await User.create({ name: 'C', email: 'c@test.com', passwordHash: 'Pass123!', role: 'cajero' });
    const token = require('jsonwebtoken').sign({ id: cajero._id }, process.env.JWT_SECRET);
    const res = await request(app).post('/api/dishes').set('Authorization', `Bearer ${token}`).send({ name: 'Test', category: 'Sopas', price: 5000 });
    expect(res.status).toBe(403);
  });

  it('should calculate recipe cost and margin', async () => {
    const dish = await Dish.create({ name: 'Cost Test', category: 'Platos fuertes', price: 20000, ingredients: [{ ingredient: ingredient._id, quantity: 3 }] });
    const res = await request(app).get(`/api/dishes/${dish._id}/recipe-cost`).set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.recipeCost).toBe(6000);
    expect(res.body.margin).toBe(70);
  });

  it('should check availability', async () => {
    const dish = await Dish.create({ name: 'Avail', category: 'Sopas', price: 10000, ingredients: [{ ingredient: ingredient._id, quantity: 2 }] });
    const res = await request(app).get(`/api/dishes/${dish._id}/availability`).set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.available).toBe(true);
  });

  it('should return unavailable when stock is insufficient', async () => {
    const lowIng = await Ingredient.create({ name: 'Low', unit: 'kilos', stock: 1, minStock: 2, cost: 1000 });
    const dish = await Dish.create({ name: 'Unavail', category: 'Sopas', price: 10000, ingredients: [{ ingredient: lowIng._id, quantity: 5 }] });
    const res = await request(app).get(`/api/dishes/${dish._id}/availability`).set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.available).toBe(false);
    expect(res.body.missing).toHaveLength(1);
  });

  it('should batch check availability', async () => {
    const d1 = await Dish.create({ name: 'D1', category: 'Sopas', price: 5000, ingredients: [{ ingredient: ingredient._id, quantity: 1 }] });
    const d2 = await Dish.create({ name: 'D2', category: 'Sopas', price: 5000, ingredients: [{ ingredient: ingredient._id, quantity: 1 }] });
    const res = await request(app).post('/api/dishes/batch-availability').set('Authorization', `Bearer ${adminToken}`).send({ dishIds: [d1._id, d2._id] });
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(res.body[0].available).toBe(true);
  });
});
