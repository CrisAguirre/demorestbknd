const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const { connectDB, closeDB, clearDB, createTestCategory, createTestSupplier } = require('../helpers');
const reportRoutes = require('../../src/routes/report.routes');
const User = require('../../src/models/User');
const Product = require('../../src/models/Product');
const Sale = require('../../src/models/Sale');
const KitchenOrder = require('../../src/models/KitchenOrder');

let app, adminToken, admin, category, supplier, product;

beforeAll(async () => {
  await connectDB();
  app = express();
  app.use(express.json());
  app.use('/api/reports', reportRoutes);
});
afterAll(async () => { await closeDB(); });
beforeEach(async () => {
  await clearDB();
  admin = await User.create({ name: 'Admin', email: 'a@test.com', passwordHash: 'Pass123!', role: 'admin' });
  adminToken = require('jsonwebtoken').sign({ id: admin._id }, process.env.JWT_SECRET);
  category = await createTestCategory();
  supplier = await createTestSupplier();
  product = await Product.create({ name: 'Prod', barcode: 'PRD01', category: category._id, supplier: supplier._id, purchasePrice: 1000, salePrice: 2000, stock: 10 });
});

describe('Report Controller', () => {
  it('should return sales summary KPIs', async () => {
    await Sale.create({ user: admin._id, items: [{ product: product._id, productName: 'P', quantity: 2, unitPrice: 2000, subtotal: 4000 }], total: 4000 });
    const res = await request(app).get('/api/reports/sales-summary').set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.totalRevenue).toBe(4000);
    expect(res.body.totalTransactions).toBe(1);
  });

  it('should return top products', async () => {
    await Sale.create({ user: admin._id, items: [{ product: product._id, productName: 'Top', quantity: 5, unitPrice: 2000, subtotal: 10000 }], total: 10000 });
    const res = await request(app).get('/api/reports/top-products').set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body[0].totalQuantity).toBe(5);
  });

  it('should exclude cancelled sales from summary', async () => {
    await Sale.create({ user: admin._id, status: 'pagada', items: [{ product: product._id, productName: 'P', quantity: 1, unitPrice: 2000, subtotal: 2000 }], total: 2000 });
    await Sale.create({ user: admin._id, status: 'cancelada', items: [{ product: product._id, productName: 'P', quantity: 5, unitPrice: 2000, subtotal: 10000 }], total: 10000 });
    const res = await request(app).get('/api/reports/sales-summary').set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.totalRevenue).toBe(2000);
    expect(res.body.totalTransactions).toBe(1);
  });

  it('should return inventory valuation', async () => {
    const res = await request(app).get('/api/reports/inventory-valuation').set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.totalProducts).toBe(1);
    expect(res.body.totalUnits).toBe(10);
    expect(res.body.totalCostValue).toBe(10000);
    expect(res.body.totalSaleValue).toBe(20000);
  });

  it('should return profit margins', async () => {
    const res = await request(app).get('/api/reports/profit-margins').set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body[0].margin).toBe(1000);
    expect(res.body[0].marginPercent).toBe(100);
  });

  it('should return preparation times', async () => {
    const now = new Date();
    await KitchenOrder.create({
      sale: new mongoose.Types.ObjectId(),
      tableNumber: 5,
      items: [{ product: new mongoose.Types.ObjectId(), productType: 'Product', productName: 'Pizza', quantity: 2 }],
      status: 'entregado',
      stateHistory: [
        { state: 'nuevo', timestamp: new Date(now - 600000) },
        { state: 'en_preparacion', timestamp: new Date(now - 300000) },
        { state: 'entregado', timestamp: now }
      ]
    });
    const res = await request(app).get('/api/reports/preparation-times').set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.totalCompleted).toBe(1);
    expect(Number(res.body.avgTotalMin)).toBeGreaterThan(0);
  });

  // ── CSV Export tests ──

  describe('CSV exports', () => {
    it('should export sales summary as CSV', async () => {
      await Sale.create({ user: admin._id, items: [{ product: product._id, productName: 'P', quantity: 2, unitPrice: 2000, subtotal: 4000 }], total: 4000 });
      const res = await request(app).get('/api/reports/export/sales-summary').set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('text/csv');
      expect(res.text).toContain('Fecha,Hora,ID Venta,Cliente,Método Pago,Items,Total');
    });

    it('should export top products as CSV', async () => {
      await Sale.create({ user: admin._id, items: [{ product: product._id, productName: 'TopProduct', quantity: 3, unitPrice: 2000, subtotal: 6000 }], total: 6000 });
      const res = await request(app).get('/api/reports/export/top-products').set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('text/csv');
      expect(res.text).toContain('TopProduct');
    });

    it('should export inventory as CSV', async () => {
      const res = await request(app).get('/api/reports/export/inventory').set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('text/csv');
      expect(res.text).toContain('Prod');
      expect(res.text).toContain('Estado');
    });

    it('should require auth for CSV export', async () => {
      const res = await request(app).get('/api/reports/export/sales-summary');
      expect(res.status).toBe(401);
    });
  });
});
