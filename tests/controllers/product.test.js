const request = require('supertest');
const express = require('express');
const { connectDB, closeDB, clearDB, createTestCategory, createTestSupplier } = require('../helpers');
const productRoutes = require('../../src/routes/product.routes');
const User = require('../../src/models/User');
const Product = require('../../src/models/Product');

let app, adminToken, admin, category, supplier;

beforeAll(async () => {
  await connectDB();
  app = express();
  app.use(express.json());
  app.use('/api/products', productRoutes);
});
afterAll(async () => { await closeDB(); });
beforeEach(async () => {
  await clearDB();
  admin = await User.create({ name: 'Admin', email: 'a@test.com', passwordHash: 'Pass123!', role: 'admin' });
  adminToken = require('jsonwebtoken').sign({ id: admin._id }, process.env.JWT_SECRET);
  category = await createTestCategory();
  supplier = await createTestSupplier();
});

describe('Product Controller', () => {
  it('should create a product', async () => {
    const res = await request(app).post('/api/products').set('Authorization', `Bearer ${adminToken}`).send({ name: 'New', barcode: 'NEW001', category: category._id, supplier: supplier._id, purchasePrice: 1500, salePrice: 3500, stock: 20, minStock: 3 });
    expect(res.status).toBe(201);
    expect(res.body.name).toBe('New');
  });

  it('should reject non-admin', async () => {
    const cajero = await User.create({ name: 'C', email: 'c@test.com', passwordHash: 'Pass123!', role: 'cajero' });
    const token = require('jsonwebtoken').sign({ id: cajero._id }, process.env.JWT_SECRET);
    const res = await request(app).post('/api/products').set('Authorization', `Bearer ${token}`).send({ name: 'Test' });
    expect(res.status).toBe(403);
  });

  it('should list products with pagination', async () => {
    await Product.create({ name: 'P1', barcode: 'T001', category: category._id, supplier: supplier._id, purchasePrice: 100, salePrice: 200, stock: 10 });
    const res = await request(app).get('/api/products').set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.products).toHaveLength(1);
    expect(res.body.total).toBe(1);
  });

  it('should generate next barcode', async () => {
    const res = await request(app).get('/api/products/next-barcode').query({ categoryId: category._id.toString(), supplierId: supplier._id.toString() }).set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.barcode).toBe('TCCTS001');
  });

  it('should increment barcode', async () => {
    await Product.create({ name: 'Existing', barcode: 'TCCTS001', category: category._id, supplier: supplier._id, purchasePrice: 100, salePrice: 200, stock: 10 });
    const res = await request(app).get('/api/products/next-barcode').query({ categoryId: category._id.toString(), supplierId: supplier._id.toString() }).set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.barcode).toBe('TCCTS002');
  });

  it('should add stock via entrada', async () => {
    const p = await Product.create({ name: 'Stock', barcode: 'STK01', category: category._id, supplier: supplier._id, purchasePrice: 100, salePrice: 200, stock: 10 });
    const res = await request(app).patch(`/api/products/${p._id}/stock`).set('Authorization', `Bearer ${adminToken}`).send({ quantity: 5, type: 'entrada' });
    expect(res.status).toBe(200);
    expect(res.body.stock).toBe(15);
  });

  it('should reject insufficient stock for salida', async () => {
    const p = await Product.create({ name: 'Low', barcode: 'STK03', category: category._id, supplier: supplier._id, purchasePrice: 100, salePrice: 200, stock: 2 });
    const res = await request(app).patch(`/api/products/${p._id}/stock`).set('Authorization', `Bearer ${adminToken}`).send({ quantity: 5, type: 'salida' });
    expect(res.status).toBe(400);
  });

  it('should permanently delete a product', async () => {
    const p = await Product.create({ name: 'Del', barcode: 'DEL01', category: category._id, supplier: supplier._id, purchasePrice: 100, salePrice: 200, stock: 1 });
    await request(app).delete(`/api/products/${p._id}`).set('Authorization', `Bearer ${adminToken}`);
    const found = await Product.findById(p._id);
    expect(found).toBeNull();
  });
});
