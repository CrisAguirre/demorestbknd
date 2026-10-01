const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const { connectDB, closeDB, clearDB, createTestCategory, createTestSupplier } = require('../helpers');
const financeRoutes = require('../../src/routes/finance.routes');
const User = require('../../src/models/User');
const Product = require('../../src/models/Product');
const Sale = require('../../src/models/Sale');
const Expense = require('../../src/models/Expense');

let app, adminToken, admin, category, supplier, product;

beforeAll(async () => {
  await connectDB();
  app = express();
  app.use(express.json());
  app.use('/api/finance', financeRoutes);
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

describe('Finance Controller', () => {
  it('should return financial summary with P&L', async () => {
    await Sale.create({ user: admin._id, items: [{ product: product._id, productName: 'P', quantity: 2, unitPrice: 2000, subtotal: 4000 }], total: 4000 });
    await Expense.create({ category: 'arriendo', description: 'Rent', amount: 1000, date: new Date(), user: admin._id });
    const res = await request(app).get('/api/finance/summary').set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.totalRevenue).toBe(4000);
    expect(res.body.cogs).toBe(2000);
    expect(res.body.grossProfit).toBe(2000);
    expect(res.body.operatingProfit).toBe(1000);
  });

  it('should return cash flow data', async () => {
    await Sale.create({ user: admin._id, items: [{ product: product._id, productName: 'P', quantity: 1, unitPrice: 2000, subtotal: 2000 }], total: 2000 });
    const res = await request(app).get('/api/finance/cashflow').set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThan(0);
    expect(res.body[0].inflow).toBe(2000);
  });

  it('should return monthly P&L', async () => {
    await Sale.create({ user: admin._id, items: [{ product: product._id, productName: 'P', quantity: 1, unitPrice: 2000, subtotal: 2000 }], total: 2000 });
    const res = await request(app).get('/api/finance/monthly-pl').query({ months: 3 }).set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(3);
  });

  it('should include event payments in summary, cashflow, monthly-pl and income-history', async () => {
    const Event = require('../../src/models/Event');
    await Sale.create({ user: admin._id, items: [{ product: product._id, productName: 'P', quantity: 1, unitPrice: 2000, subtotal: 2000 }], total: 2000 });
    await Event.create({
      customerName: 'Cliente Ev', eventType: 'evento_local',
      eventDate: new Date(), totalCost: 5000,
      payments: [{ amount: 2000, method: 'efectivo', user: admin._id, date: new Date() }]
    });

    const sum = await request(app).get('/api/finance/summary').set('Authorization', `Bearer ${adminToken}`);
    expect(sum.status).toBe(200);
    expect(sum.body.saleRevenue).toBe(2000);
    expect(sum.body.eventRevenue).toBe(2000);
    expect(sum.body.totalRevenue).toBe(4000);
    expect(sum.body.eventPaymentsCount).toBe(1);

    const flow = await request(app).get('/api/finance/cashflow').set('Authorization', `Bearer ${adminToken}`);
    expect(flow.status).toBe(200);
    expect(flow.body.find(d => d.inflow >= 4000)).toBeTruthy();

    const pl = await request(app).get('/api/finance/monthly-pl').query({ months: 1 }).set('Authorization', `Bearer ${adminToken}`);
    expect(pl.status).toBe(200);
    expect(pl.body[0].eventRevenue).toBe(2000);
    expect(pl.body[0].revenue).toBe(4000);

    const hist = await request(app).get('/api/finance/income-history').set('Authorization', `Bearer ${adminToken}`);
    expect(hist.status).toBe(200);
    expect(hist.body.count).toBe(2);
    expect(hist.body.total).toBe(4000);
    expect(hist.body.rows.map(r => r.tipo).sort()).toEqual(['evento', 'venta']);
  });
});
