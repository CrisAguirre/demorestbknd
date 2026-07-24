const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const { connectDB, closeDB, clearDB, createTestUser, authHeader } = require('../helpers');
const deliveryRoutes = require('../../src/routes/delivery.routes');
const DeliveryOrder = require('../../src/models/DeliveryOrder');

let app;
let admin, adminToken, cocineroToken, cajeroToken, meseroToken;

beforeAll(async () => {
  await connectDB();
  app = express();
  app.use(express.json());
  app.use('/api/delivery', deliveryRoutes);
});
afterAll(async () => { await closeDB(); });
beforeEach(async () => {
  await clearDB();
  admin = await createTestUser({ role: 'admin' });
  adminToken = authHeader(admin._id).Authorization.replace('Bearer ', '');
  const cocinero = await createTestUser({ name: 'Cocinero', email: 'coc@test.com', role: 'cocinero' });
  cocineroToken = authHeader(cocinero._id).Authorization.replace('Bearer ', '');
  const cajero = await createTestUser({ name: 'Cajero', email: 'caj@test.com', role: 'cajero' });
  cajeroToken = authHeader(cajero._id).Authorization.replace('Bearer ', '');
  const mesero = await createTestUser({ name: 'Mesero', email: 'mes@test.com', role: 'mesero' });
  meseroToken = authHeader(mesero._id).Authorization.replace('Bearer ', '');
});

describe('DeliveryOrder Controller', () => {
  const createDelivery = async (overrides = {}) => {
    const Sale = require('../../src/models/Sale');
    const sale = await Sale.create({
      user: admin._id,
      items: [{ product: new mongoose.Types.ObjectId(), productName: 'Test', quantity: 1, unitPrice: 100, subtotal: 100 }],
      total: 100
    });
    return await DeliveryOrder.create({
      sale: sale._id,
      customerName: 'Juan Perez',
      customerPhone: '3001234567',
      customerAddress: 'Calle 123 #45-67',
      deliveryFee: 3000,
      items: [{ productName: 'Pizza', quantity: 1 }],
      status: 'pendiente',
      stateHistory: [{ state: 'pendiente', timestamp: new Date() }],
      ...overrides
    });
  };

  describe('GET /api/delivery', () => {
    it('should list all delivery orders', async () => {
      await createDelivery();
      await createDelivery({ customerName: 'Maria' });
      const res = await request(app).get('/api/delivery').set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.length).toBe(2);
    });

    it('should filter by status', async () => {
      await createDelivery();
      await createDelivery({ status: 'entregado', stateHistory: [{ state: 'entregado', timestamp: new Date() }] });
      const res = await request(app).get('/api/delivery?status=pendiente').set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.length).toBe(1);
    });

    it('should require auth', async () => {
      const res = await request(app).get('/api/delivery');
      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/delivery/pending', () => {
    it('should return active orders', async () => {
      await createDelivery();
      await createDelivery({ status: 'en_preparacion', stateHistory: [{ state: 'en_preparacion', timestamp: new Date() }] });
      await createDelivery({ status: 'entregado', stateHistory: [{ state: 'entregado', timestamp: new Date() }] });
      const res = await request(app).get('/api/delivery/pending').set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.length).toBe(2);
    });
  });

  describe('PATCH /api/delivery/:id/accept', () => {
    it('should accept a pendiente order', async () => {
      const d = await createDelivery();
      const res = await request(app).patch(`/api/delivery/${d._id}/accept`).set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('en_preparacion');
    });

    it('should allow cocinero to accept', async () => {
      const d = await createDelivery();
      const res = await request(app).patch(`/api/delivery/${d._id}/accept`).set('Authorization', `Bearer ${cocineroToken}`);
      expect(res.status).toBe(200);
    });

    it('should reject with cajero role (403)', async () => {
      const d = await createDelivery();
      const res = await request(app).patch(`/api/delivery/${d._id}/accept`).set('Authorization', `Bearer ${cajeroToken}`);
      expect(res.status).toBe(403);
    });

    it('should reject with mesero role (403)', async () => {
      const d = await createDelivery();
      const res = await request(app).patch(`/api/delivery/${d._id}/accept`).set('Authorization', `Bearer ${meseroToken}`);
      expect(res.status).toBe(403);
    });

    it('should reject already accepted order', async () => {
      const d = await createDelivery({ status: 'en_preparacion', stateHistory: [{ state: 'en_preparacion', timestamp: new Date() }] });
      const res = await request(app).patch(`/api/delivery/${d._id}/accept`).set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(400);
    });

    it('should return 404 for non-existent order', async () => {
      const res = await request(app).patch(`/api/delivery/${new mongoose.Types.ObjectId()}/accept`).set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(404);
    });
  });

  describe('PATCH /api/delivery/:id/dispatch', () => {
    it('should dispatch an en_preparacion order', async () => {
      const d = await createDelivery({ status: 'en_preparacion', stateHistory: [{ state: 'en_preparacion', user: admin._id, userName: admin.name, timestamp: new Date() }] });
      const res = await request(app).patch(`/api/delivery/${d._id}/dispatch`).set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('en_camino');
    });

    it('should reject dispatch of pendiente order', async () => {
      const d = await createDelivery();
      const res = await request(app).patch(`/api/delivery/${d._id}/dispatch`).set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(400);
    });

    it('should reject non-admin role', async () => {
      const d = await createDelivery({ status: 'en_preparacion', stateHistory: [{ state: 'en_preparacion', user: admin._id, userName: admin.name, timestamp: new Date() }] });
      const res = await request(app).patch(`/api/delivery/${d._id}/dispatch`).set('Authorization', `Bearer ${cocineroToken}`);
      expect(res.status).toBe(403);
    });
  });

  describe('PATCH /api/delivery/:id/deliver', () => {
    it('should deliver an en_camino order', async () => {
      const d = await createDelivery({
        status: 'en_camino',
        assignedDriver: admin._id,
        stateHistory: [
          { state: 'pendiente', timestamp: new Date() },
          { state: 'en_preparacion', user: admin._id, userName: admin.name, timestamp: new Date() },
          { state: 'en_camino', user: admin._id, userName: admin.name, timestamp: new Date() }
        ]
      });
      const res = await request(app).patch(`/api/delivery/${d._id}/deliver`).set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('entregado');
    });

    it('should reject non-en_camino order', async () => {
      const d = await createDelivery({ status: 'en_preparacion', stateHistory: [{ state: 'en_preparacion', user: admin._id, userName: admin.name, timestamp: new Date() }] });
      const res = await request(app).patch(`/api/delivery/${d._id}/deliver`).set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(400);
    });

    it('should reject non-admin role', async () => {
      const d = await createDelivery({
        status: 'en_camino',
        assignedDriver: admin._id,
        stateHistory: [
          { state: 'pendiente', timestamp: new Date() },
          { state: 'en_preparacion', user: admin._id, userName: admin.name, timestamp: new Date() },
          { state: 'en_camino', user: admin._id, userName: admin.name, timestamp: new Date() }
        ]
      });
      const res = await request(app).patch(`/api/delivery/${d._id}/deliver`).set('Authorization', `Bearer ${cajeroToken}`);
      expect(res.status).toBe(403);
    });
  });

  describe('PATCH /api/delivery/:id/cancel', () => {
    it('should cancel a delivery order', async () => {
      const d = await createDelivery();
      const res = await request(app).patch(`/api/delivery/${d._id}/cancel`).set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('cancelado');
    });

    it('should return 404 for non-existent order', async () => {
      const res = await request(app).patch(`/api/delivery/${new mongoose.Types.ObjectId()}/cancel`).set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(404);
    });
  });
});
