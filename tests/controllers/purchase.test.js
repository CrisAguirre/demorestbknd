const request = require('supertest');
const express = require('express');
const { connectDB, closeDB, clearDB, createTestCategory, createTestSupplier } = require('../helpers');
const purchaseRoutes = require('../../src/routes/purchase.routes');
const User = require('../../src/models/User');
const Product = require('../../src/models/Product');
const Purchase = require('../../src/models/Purchase');

let app, adminToken, admin, category, supplier, product;

beforeAll(async () => {
  await connectDB();
  app = express();
  app.use(express.json());
  app.use('/api/purchases', purchaseRoutes);
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

describe('Purchase Controller', () => {
  it('should create a purchase and update stock', async () => {
    const res = await request(app).post('/api/purchases').set('Authorization', `Bearer ${adminToken}`).send({ supplierId: supplier._id, items: [{ itemType: 'product', itemId: product._id, quantity: 20, unitCost: 1200 }] });
    expect(res.status).toBe(201);
    expect(res.body.total).toBe(24000);
    const updated = await Product.findById(product._id);
    expect(updated.stock).toBe(30);
  });

  it('should revert stock when cancelled', async () => {
    const purchase = await Purchase.create({ supplier: supplier._id, supplierName: 'Sup', user: admin._id, items: [{ itemType: 'product', product: product._id, itemName: 'P', quantity: 10, unitCost: 100, subtotal: 1000 }], total: 1000, status: 'recibida' });
    product.stock = 20;
    await product.save();
    const res = await request(app).patch(`/api/purchases/${purchase._id}/status`).set('Authorization', `Bearer ${adminToken}`).send({ status: 'anulada' });
    expect(res.status).toBe(200);
    const updated = await Product.findById(product._id);
    expect(updated.stock).toBe(10);
  });

  it('should create requisition pending without moving stock, and add on receive', async () => {
    const Ingredient = require('../../src/models/Ingredient');
    const ing = await Ingredient.create({ code: 'CF-099', name: 'Prueba', unit: 'g', stock: 5 });
    const res = await request(app).post('/api/purchases').set('Authorization', `Bearer ${adminToken}`).send({
      origen: 'requisicion', area: 'cocina', status: 'pendiente',
      items: [{ itemType: 'ingredient', itemCode: 'CF-099', quantity: 10, unitCost: 0 }]
    });
    expect(res.status).toBe(201);
    expect(res.body.status).toBe('pendiente');
    expect(res.body.origen).toBe('requisicion');
    expect((await Ingredient.findById(ing._id)).stock).toBe(5);

    const rec = await request(app).patch(`/api/purchases/${res.body._id}/status`).set('Authorization', `Bearer ${adminToken}`).send({ status: 'recibida' });
    expect(rec.status).toBe(200);
    expect((await Ingredient.findById(ing._id)).stock).toBe(15);
  });

  it('should upsert unknown ingredient codes from requisitions', async () => {
    const Ingredient = require('../../src/models/Ingredient');
    const res = await request(app).post('/api/purchases').set('Authorization', `Bearer ${adminToken}`).send({
      origen: 'requisicion', area: 'barra', status: 'pendiente',
      items: [{ itemType: 'ingredient', itemCode: 'XX-001', itemName: 'Nuevo Insumo', unit: 'g', quantity: 3, unitCost: 0 }]
    });
    expect(res.status).toBe(201);
    expect(await Ingredient.findOne({ code: 'XX-001' })).toBeTruthy();
  });

  it('should not allow recibida back to pendiente', async () => {
    const purchase = await Purchase.create({ user: admin._id, items: [{ itemType: 'product', product: product._id, itemName: 'P', quantity: 1, unitCost: 100, subtotal: 100 }], total: 100, status: 'recibida' });
    const res = await request(app).patch(`/api/purchases/${purchase._id}/status`).set('Authorization', `Bearer ${adminToken}`).send({ status: 'pendiente' });
    expect(res.status).toBe(400);
  });
});
