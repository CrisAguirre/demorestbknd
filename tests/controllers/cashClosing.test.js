const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const { connectDB, closeDB, clearDB } = require('../helpers');
const cashClosingRoutes = require('../../src/routes/cashClosing.routes');
const User = require('../../src/models/User');
const CashClosing = require('../../src/models/CashClosing');
const Sale = require('../../src/models/Sale');

let app, adminToken, admin;

beforeAll(async () => {
  await connectDB();
  app = express();
  app.use(express.json());
  app.use('/api/cash-closings', cashClosingRoutes);
});
afterAll(async () => { await closeDB(); });
beforeEach(async () => {
  await clearDB();
  admin = await User.create({ name: 'Admin', email: 'a@test.com', passwordHash: 'Pass123!', role: 'admin' });
  adminToken = require('jsonwebtoken').sign({ id: admin._id }, process.env.JWT_SECRET);
});

describe('CashClosing Controller', () => {
  it('should open a new cash closing', async () => {
    const res = await request(app).post('/api/cash-closings/open').set('Authorization', `Bearer ${adminToken}`).send({ initialAmount: 100000 });
    expect(res.status).toBe(201);
    expect(res.body.status).toBe('abierta');
  });

  it('should reject opening a second cash closing', async () => {
    await CashClosing.create({ user: admin._id, initialAmount: 50000, status: 'abierta' });
    const res = await request(app).post('/api/cash-closings/open').set('Authorization', `Bearer ${adminToken}`).send({ initialAmount: 20000 });
    expect(res.status).toBe(400);
  });

  it('should close an open cash closing', async () => {
    const closing = await CashClosing.create({ user: admin._id, initialAmount: 50000, status: 'abierta' });
    const res = await request(app).put(`/api/cash-closings/${closing._id}/close`).set('Authorization', `Bearer ${adminToken}`).send({ actualCash: 80000 });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('cerrada');
  });

  it('should calculate expected cash with sales', async () => {
    const closing = await CashClosing.create({ user: admin._id, initialAmount: 50000, status: 'abierta' });
    await Sale.create({ user: admin._id, items: [{ product: new mongoose.Types.ObjectId(), productName: 'Test', quantity: 1, unitPrice: 100, subtotal: 100 }], total: 20000, createdAt: new Date() });
    const res = await request(app).put(`/api/cash-closings/${closing._id}/close`).set('Authorization', `Bearer ${adminToken}`).send({ actualCash: 70000 });
    expect(res.status).toBe(200);
    expect(res.body.totalSales).toBe(20000);
    expect(res.body.expectedCash).toBe(70000);
    expect(res.body.difference).toBe(0);
  });

  it('should return current open cash closing', async () => {
    await CashClosing.create({ user: admin._id, initialAmount: 50000, status: 'abierta' });
    const res = await request(app).get('/api/cash-closings/current').set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.open).toBe(true);
  });

  it('should list all cash closings', async () => {
    await CashClosing.create({ user: admin._id, initialAmount: 50000, status: 'cerrada', closedAt: new Date() });
    await CashClosing.create({ user: admin._id, initialAmount: 30000, status: 'cerrada', closedAt: new Date() });
    const res = await request(app).get('/api/cash-closings').set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.closings).toHaveLength(2);
  });
});
