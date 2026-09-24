const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const { connectDB, closeDB, clearDB, createTestIngredient, createTestUser } = require('../helpers');
const ingredientRoutes = require('../../src/routes/ingredient.routes');
const User = require('../../src/models/User');
const Ingredient = require('../../src/models/Ingredient');
const Dish = require('../../src/models/Dish');

let app, adminToken, ingredient;

beforeAll(async () => {
  await connectDB();
  app = express();
  app.use(express.json());
  app.use('/api/ingredients', ingredientRoutes);
});
afterAll(async () => { await closeDB(); });
beforeEach(async () => {
  await clearDB();
  const admin = await User.create({ name: 'Admin', email: 'a@test.com', passwordHash: 'Pass123!', role: 'admin' });
  adminToken = require('jsonwebtoken').sign({ id: admin._id }, process.env.JWT_SECRET);
  ingredient = await Ingredient.create({ name: 'Tomate', unit: 'kilos', stock: 15, minStock: 5, cost: 2000 });
});

describe('Ingredient Controller - Stock Operations', () => {
  it('should restock an ingredient', async () => {
    const res = await request(app)
      .post(`/api/ingredients/${ingredient._id}/restock`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ quantity: 10, description: 'Reposición semanal' });

    expect(res.status).toBe(200);
    expect(res.body.newStock).toBe(25);
    expect(res.body.added).toBe(10);

    const updated = await Ingredient.findById(ingredient._id);
    expect(updated.movementHistory).toHaveLength(1);
    expect(updated.movementHistory[0].type).toBe('adjustment');
  });

  it('should reject restock with zero or negative quantity', async () => {
    const res = await request(app)
      .post(`/api/ingredients/${ingredient._id}/restock`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ quantity: 0 });

    expect(res.status).toBe(400);
  });

  it('should reject restock for non-existent ingredient', async () => {
    const res = await request(app)
      .post(`/api/ingredients/${new mongoose.Types.ObjectId()}/restock`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ quantity: 5 });

    expect(res.status).toBe(404);
  });

  it('should adjust stock to specific value', async () => {
    const res = await request(app)
      .put(`/api/ingredients/${ingredient._id}/adjust-stock`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ newStock: 20, description: 'Corrección de inventario' });

    expect(res.status).toBe(200);
    expect(res.body.newStock).toBe(20);
    expect(res.body.difference).toBe(5);

    const updated = await Ingredient.findById(ingredient._id);
    expect(updated.movementHistory).toHaveLength(1);
  });

  it('should reject negative stock value', async () => {
    const res = await request(app)
      .put(`/api/ingredients/${ingredient._id}/adjust-stock`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ newStock: -5 });

    expect(res.status).toBe(400);
  });

  it('should not create movement when stock unchanged', async () => {
    const res = await request(app)
      .put(`/api/ingredients/${ingredient._id}/adjust-stock`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ newStock: 15 });

    expect(res.status).toBe(200);
    expect(res.body.difference).toBe(0);

    const updated = await Ingredient.findById(ingredient._id);
    expect(updated.movementHistory).toHaveLength(0);
  });
});

describe('Ingredient Controller - Movement History', () => {
  it('should get movement history', async () => {
    ingredient.movementHistory.push({
      type: 'purchase',
      quantity: 10,
      previousStock: 5,
      newStock: 15,
      description: 'Compra inicial'
    });
    await ingredient.save();

    const res = await request(app)
      .get(`/api/ingredients/${ingredient._id}/movements`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.currentStock).toBe(15);
    expect(res.body.movements).toHaveLength(1);
  });

  it('should support pagination in movements', async () => {
    for (let i = 0; i < 5; i++) {
      ingredient.movementHistory.push({
        type: 'sale',
        quantity: 1,
        previousStock: 15 + i,
        newStock: 14 + i,
        description: `Venta ${i}`
      });
    }
    await ingredient.save();

    const res = await request(app)
      .get(`/api/ingredients/${ingredient._id}/movements?limit=2&skip=0`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.movements).toHaveLength(2);
  });

  it('should return 404 for non-existent ingredient', async () => {
    const res = await request(app)
      .get(`/api/ingredients/${new mongoose.Types.ObjectId()}/movements`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(404);
  });
});

describe('Ingredient Controller - Dishes Using Ingredient', () => {
  it('should list dishes using this ingredient', async () => {
    const ing1 = await Ingredient.create({ name: 'Cebolla', unit: 'kilos', stock: 20, minStock: 5, cost: 1500 });
    const ing2 = await Ingredient.create({ name: 'Papa', unit: 'kilos', stock: 30, minStock: 5, cost: 1000 });

    const dish1 = await Dish.create({ name: 'Sopa de cebolla', category: 'Sopas', price: 12000, ingredients: [{ ingredient: ing1._id, quantity: 2 }] });
    const dish2 = await Dish.create({ name: 'Puré de papa', category: 'Platos fuertes', price: 8000, ingredients: [{ ingredient: ing2._id, quantity: 3 }] });
    await Dish.create({ name: 'Sopa mixta', category: 'Sopas', price: 10000, ingredients: [{ ingredient: ing1._id, quantity: 1 }, { ingredient: ing2._id, quantity: 2 }] });

    const res = await request(app)
      .get(`/api/ingredients/${ing1._id}/dishes`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.dishes).toHaveLength(2);
    expect(res.body.dishes[0].maxPortionsFromThisIngredient).toBe(10);
  });

  it('should calculate max portions correctly', async () => {
    const ing = await Ingredient.create({ name: 'Harina', unit: 'kilos', stock: 25, minStock: 5, cost: 2000 });
    const dish = await Dish.create({ name: 'Arepa', category: 'Acompañamientos', price: 3000, ingredients: [{ ingredient: ing._id, quantity: 0.5 }] });

    const res = await request(app)
      .get(`/api/ingredients/${ing._id}/dishes`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.dishes[0].maxPortionsFromThisIngredient).toBe(50);
  });

  it('should return 404 for non-existent ingredient', async () => {
    const res = await request(app)
      .get(`/api/ingredients/${new mongoose.Types.ObjectId()}/dishes`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(404);
  });
});

describe('Ingredient Controller - Areas', () => {
  it('should filter ingredients by area', async () => {
    await Ingredient.create({ name: 'Pisco', unit: 'botella', stock: 5, minStock: 2, cost: 30000, area: 'barra' });
    const res = await request(app)
      .get('/api/ingredients?area=barra')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.length).toBe(1);
    expect(res.body[0].name).toBe('Pisco');
  });

  it('should backfill area by code on list', async () => {
    await Ingredient.collection.insertOne({ name: 'Vino', unit: 'botella', stock: 5, minStock: 2, cost: 20000, code: 'BB-099', isActive: true });
    const res = await request(app)
      .get('/api/ingredients?area=barra')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.some((i) => i.code === 'BB-099')).toBe(true);
  });
});
