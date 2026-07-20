const request = require('supertest');
const express = require('express');
const { connectDB, closeDB, clearDB } = require('../helpers');
const categoryRoutes = require('../../src/routes/category.routes');
const User = require('../../src/models/User');
const Category = require('../../src/models/Category');

let app, adminToken, admin;

beforeAll(async () => {
  await connectDB();
  app = express();
  app.use(express.json());
  app.use('/api/categories', categoryRoutes);
});
afterAll(async () => { await closeDB(); });
beforeEach(async () => {
  await clearDB();
  admin = await User.create({ name: 'Admin', email: 'a@test.com', passwordHash: 'Pass123!', role: 'admin' });
  adminToken = require('jsonwebtoken').sign({ id: admin._id }, process.env.JWT_SECRET);
});

describe('Category Controller', () => {
  it('should create a category', async () => {
    const res = await request(app).post('/api/categories').set('Authorization', `Bearer ${adminToken}`).send({ name: 'Bebidas', icon: '🥤', code: 'BBQ', order: 5 });
    expect(res.status).toBe(201);
    expect(res.body.name).toBe('Bebidas');
  });

  it('should list active categories', async () => {
    await Category.create({ name: 'Sopas', icon: '🥣', code: 'SPA', order: 1, isActive: true });
    await Category.create({ name: 'Inactiva', icon: '❌', code: 'INA', order: 3, isActive: false });
    const res = await request(app).get('/api/categories').set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
  });

  it('should soft-delete a category', async () => {
    const cat = await Category.create({ name: 'Del', icon: '🗑️', code: 'DLT', order: 9, isActive: true });
    await request(app).delete(`/api/categories/${cat._id}`).set('Authorization', `Bearer ${adminToken}`);
    const remaining = await Category.find({ isActive: true });
    expect(remaining).toHaveLength(0);
  });
});
