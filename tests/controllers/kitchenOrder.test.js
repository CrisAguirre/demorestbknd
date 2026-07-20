const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const { connectDB, closeDB, clearDB, createTestUser, authHeader, createTestTable } = require('../helpers');
const kitchenOrderRoutes = require('../../src/routes/kitchenOrder.routes');
const KitchenOrder = require('../../src/models/KitchenOrder');
const Table = require('../../src/models/Table');

let app;
let admin, adminToken, cocineroUser, cocineroToken, cajeroUser, cajeroToken, meseroUser, meseroToken;

beforeAll(async () => {
  await connectDB();
  app = express();
  app.use(express.json());
  app.use('/api/kitchen-orders', kitchenOrderRoutes);
});
afterAll(async () => { await closeDB(); });
beforeEach(async () => {
  await clearDB();
  admin = await createTestUser({ role: 'admin' });
  adminToken = authHeader(admin._id).Authorization.replace('Bearer ', '');
  cocineroUser = await createTestUser({ name: 'Cocinero', email: 'cocinero@test.com', role: 'cocinero' });
  cocineroToken = authHeader(cocineroUser._id).Authorization.replace('Bearer ', '');
  cajeroUser = await createTestUser({ name: 'Cajero', email: 'cajero@test.com', role: 'cajero' });
  cajeroToken = authHeader(cajeroUser._id).Authorization.replace('Bearer ', '');
  meseroUser = await createTestUser({ name: 'Mesero', email: 'mesero@test.com', role: 'mesero' });
  meseroToken = authHeader(meseroUser._id).Authorization.replace('Bearer ', '');
});

describe('KitchenOrder Controller', () => {
  const createOrder = async (overrides = {}) => {
    const Sale = require('../../src/models/Sale');
    const sale = await Sale.create({
      user: admin._id,
      items: [{ product: new mongoose.Types.ObjectId(), productName: 'Test', quantity: 1, unitPrice: 100, subtotal: 100 }],
      total: 100
    });
    return await KitchenOrder.create({
      sale: sale._id,
      tableNumber: 1,
      items: [{ product: new mongoose.Types.ObjectId(), productName: 'Burger', quantity: 2 }],
      status: 'nuevo',
      stateHistory: [{ state: 'nuevo', timestamp: new Date() }],
      ...overrides
    });
  };

  describe('GET /api/kitchen-orders', () => {
    it('should list all kitchen orders', async () => {
      await createOrder();
      await createOrder({ tableNumber: 2 });
      const res = await request(app).get('/api/kitchen-orders').set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.length).toBe(2);
    });

    it('should require auth', async () => {
      const res = await request(app).get('/api/kitchen-orders');
      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/kitchen-orders/pending', () => {
    it('should return nuevo and en_preparacion orders', async () => {
      await createOrder();
      await createOrder({ status: 'en_preparacion' });
      await createOrder({ status: 'entregado' });
      await createOrder({ status: 'pagado' });
      const res = await request(app).get('/api/kitchen-orders/pending').set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.length).toBe(2);
    });
  });

  describe('GET /api/kitchen-orders/status/:status', () => {
    it('should filter by status', async () => {
      await createOrder();
      await createOrder({ status: 'entregado' });
      const res = await request(app).get('/api/kitchen-orders/status/entregado').set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.length).toBe(1);
      expect(res.body[0].status).toBe('entregado');
    });
  });

  describe('PATCH /api/kitchen-orders/:id/accept', () => {
    it('should accept a nuevo order (admin)', async () => {
      const order = await createOrder();
      const res = await request(app).patch(`/api/kitchen-orders/${order._id}/accept`).set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('en_preparacion');
      expect(res.body.assignedCook).toBe(admin._id.toString());
    });

    it('should accept a nuevo order (cocinero)', async () => {
      const order = await createOrder();
      const res = await request(app).patch(`/api/kitchen-orders/${order._id}/accept`).set('Authorization', `Bearer ${cocineroToken}`);
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('en_preparacion');
      expect(res.body.assignedCook).toBe(cocineroUser._id.toString());
    });

    it('should reject with mesero role (403)', async () => {
      const order = await createOrder();
      const res = await request(app).patch(`/api/kitchen-orders/${order._id}/accept`).set('Authorization', `Bearer ${meseroToken}`);
      expect(res.status).toBe(403);
    });

    it('should reject with cajero role (403)', async () => {
      const order = await createOrder();
      const res = await request(app).patch(`/api/kitchen-orders/${order._id}/accept`).set('Authorization', `Bearer ${cajeroToken}`);
      expect(res.status).toBe(403);
    });

    it('should reject already accepted order', async () => {
      const order = await createOrder({ status: 'en_preparacion' });
      const res = await request(app).patch(`/api/kitchen-orders/${order._id}/accept`).set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(400);
      expect(res.body.message).toContain('ya fue aceptado');
    });

    it('should return 404 for non-existent order', async () => {
      const res = await request(app).patch(`/api/kitchen-orders/${new mongoose.Types.ObjectId()}/accept`).set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(404);
    });
  });

  describe('PATCH /api/kitchen-orders/:id/deliver', () => {
    it('should deliver an en_preparacion order', async () => {
      const order = await createOrder({ status: 'en_preparacion' });
      const res = await request(app).patch(`/api/kitchen-orders/${order._id}/deliver`).set('Authorization', `Bearer ${cocineroToken}`);
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('entregado');
    });

    it('should reject delivering nuevo order', async () => {
      const order = await createOrder();
      const res = await request(app).patch(`/api/kitchen-orders/${order._id}/deliver`).set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(400);
      expect(res.body.message).toContain('preparación');
    });

    it('should reject with cajero role (403)', async () => {
      const order = await createOrder({ status: 'en_preparacion' });
      const res = await request(app).patch(`/api/kitchen-orders/${order._id}/deliver`).set('Authorization', `Bearer ${cajeroToken}`);
      expect(res.status).toBe(403);
    });
  });

  describe('PATCH /api/kitchen-orders/:id/paid', () => {
    it('should mark entregado order as pagado', async () => {
      const order = await createOrder({ status: 'entregado' });
      const res = await request(app).patch(`/api/kitchen-orders/${order._id}/paid`).set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('pagado');
    });

    it('should allow cajero to mark paid', async () => {
      const order = await createOrder({ status: 'entregado' });
      const res = await request(app).patch(`/api/kitchen-orders/${order._id}/paid`).set('Authorization', `Bearer ${cajeroToken}`);
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('pagado');
    });

    it('should free table after markPaid', async () => {
      await createTestTable({ number: 1, isOccupied: true, currentSale: new mongoose.Types.ObjectId() });
      const order = await createOrder({ status: 'entregado', tableNumber: 1 });
      const res = await request(app).patch(`/api/kitchen-orders/${order._id}/paid`).set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      const table = await Table.findOne({ number: 1 });
      expect(table.isOccupied).toBe(false);
      expect(table.currentSale).toBeNull();
    });

    it('should reject with mesero role (403)', async () => {
      const order = await createOrder({ status: 'entregado' });
      const res = await request(app).patch(`/api/kitchen-orders/${order._id}/paid`).set('Authorization', `Bearer ${meseroToken}`);
      expect(res.status).toBe(403);
    });

    it('should reject non-entregado order', async () => {
      const order = await createOrder();
      const res = await request(app).patch(`/api/kitchen-orders/${order._id}/paid`).set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/kitchen-orders/:id/print', () => {
    it('should return PDF for existing order', async () => {
      const order = await createOrder();
      const res = await request(app).get(`/api/kitchen-orders/${order._id}/print`).set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toBe('application/pdf');
      expect(res.headers['content-disposition']).toContain('inline');
    });

    it('should increment printCount', async () => {
      const order = await createOrder();
      await request(app).get(`/api/kitchen-orders/${order._id}/print`).set('Authorization', `Bearer ${adminToken}`);
      const updated = await KitchenOrder.findById(order._id);
      expect(updated.printCount).toBe(1);
    });

    it('should return 404 for non-existent order', async () => {
      const res = await request(app).get(`/api/kitchen-orders/${new mongoose.Types.ObjectId()}/print`).set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(404);
    });
  });
});
