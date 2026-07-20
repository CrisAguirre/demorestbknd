const request = require('supertest');
const express = require('express');
const { connectDB, closeDB, clearDB } = require('../helpers');
const supplierRoutes = require('../../src/routes/supplier.routes');
const User = require('../../src/models/User');
const Supplier = require('../../src/models/Supplier');
require('../../src/models/Category'); // register for populate

let app, adminToken, admin;

beforeAll(async () => {
  await connectDB();
  app = express();
  app.use(express.json());
  app.use('/api/suppliers', supplierRoutes);
});
afterAll(async () => { await closeDB(); });
beforeEach(async () => {
  await clearDB();
  admin = await User.create({ name: 'Admin', email: 'a@test.com', passwordHash: 'Pass123!', role: 'admin' });
  adminToken = require('jsonwebtoken').sign({ id: admin._id }, process.env.JWT_SECRET);
});

describe('Supplier Controller', () => {
  it('should create with auto-generated code', async () => {
    const res = await request(app).post('/api/suppliers').set('Authorization', `Bearer ${adminToken}`).send({ name: 'Proveedor Test', contactName: 'Juan', phone: '3001112233' });
    expect(res.status).toBe(201);
    expect(res.body.code).toBe('01');
  });

  it('should assign sequential codes', async () => {
    await Supplier.create({ name: 'S1', code: '01', isActive: true });
    const res = await request(app).post('/api/suppliers').set('Authorization', `Bearer ${adminToken}`).send({ name: 'S2', contactName: 'Maria' });
    expect(res.status).toBe(201);
    expect(res.body.code).toBe('02');
  });

  it('should soft-delete a supplier', async () => {
    const sup = await Supplier.create({ name: 'Del', code: '99', isActive: true });
    const res = await request(app).delete(`/api/suppliers/${sup._id}`).set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.supplier.isActive).toBe(false);
  });
});
