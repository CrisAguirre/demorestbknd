const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const { connectDB, closeDB, clearDB, createTestCategory, createTestSupplier, createTestProduct } = require('../helpers');
const alertRoutes = require('../../src/routes/alert.routes');
const User = require('../../src/models/User');
const Alert = require('../../src/models/Alert');

let app, adminToken, admin;

beforeAll(async () => {
  await connectDB();
  app = express();
  app.use(express.json());
  app.use('/api/alerts', alertRoutes);
});
afterAll(async () => { await closeDB(); });
beforeEach(async () => {
  await clearDB();
  admin = await User.create({ name: 'Admin', email: 'a@test.com', passwordHash: 'Pass123!', role: 'admin' });
  adminToken = require('jsonwebtoken').sign({ id: admin._id }, process.env.JWT_SECRET);
});

describe('Alert Controller', () => {
  describe('GET /api/alerts', () => {
    it('should list alerts', async () => {
      await Alert.create({ type: 'stock_bajo', message: 'Stock bajo' });
      const res = await request(app).get('/api/alerts').set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.alerts).toHaveLength(1);
    });

    it('should filter by read status', async () => {
      await Alert.create({ type: 'stock_bajo', message: 'No leída', read: false });
      await Alert.create({ type: 'sin_stock', message: 'Leída', read: true });
      const res = await request(app).get('/api/alerts?read=false').set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.alerts).toHaveLength(1);
    });
  });

  describe('PATCH /api/alerts/:id/read', () => {
    it('should mark alert as read', async () => {
      const alert = await Alert.create({ type: 'stock_bajo', message: 'Test' });
      const res = await request(app).patch(`/api/alerts/${alert._id}/read`).set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      const updated = await Alert.findById(alert._id);
      expect(updated.read).toBe(true);
    });
  });

  describe('PATCH /api/alerts/read-all', () => {
    it('should mark all alerts as read', async () => {
      await Alert.create({ type: 'stock_bajo', message: 'A', read: false });
      await Alert.create({ type: 'sin_stock', message: 'B', read: false });
      const res = await request(app).patch('/api/alerts/read-all').set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      const unread = await Alert.countDocuments({ read: false });
      expect(unread).toBe(0);
    });
  });

  describe('POST /api/alerts/check-stock', () => {
    it('should create alerts for low stock products', async () => {
      const category = await createTestCategory();
      const supplier = await createTestSupplier();
      const Product = require('../../src/models/Product');
      await Product.create({ name: 'Low', barcode: 'LOW01', category: category._id, supplier: supplier._id, purchasePrice: 100, salePrice: 200, stock: 1, minStock: 5 });
      await Product.create({ name: 'Zero', barcode: 'ZERO01', category: category._id, supplier: supplier._id, purchasePrice: 100, salePrice: 200, stock: 0, minStock: 3 });
      await Product.create({ name: 'Ok', barcode: 'OK01', category: category._id, supplier: supplier._id, purchasePrice: 100, salePrice: 200, stock: 20, minStock: 5 });

      const res = await request(app).post('/api/alerts/check-stock').set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.total).toBe(2);
      expect(res.body.message).toMatch(/alertas generadas/);
    });

    it('should not create duplicate alerts', async () => {
      const Product = require('../../src/models/Product');
      const category = await createTestCategory();
      const supplier = await createTestSupplier();
      const prod = await Product.create({ name: 'Low', barcode: 'LOW02', category: category._id, supplier: supplier._id, purchasePrice: 100, salePrice: 200, stock: 1, minStock: 5 });
      await Alert.create({ product: prod._id, type: 'stock_bajo', message: 'Ya alertado', read: false });

      const res = await request(app).post('/api/alerts/check-stock').set('Authorization', `Bearer ${adminToken}`);
      const alerts = await Alert.find({});
      expect(alerts.length).toBe(1);
    });
  });
});
