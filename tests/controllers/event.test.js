const request = require('supertest');
const express = require('express');
const { connectDB, closeDB, clearDB, createTestUser } = require('../helpers');
const eventRoutes = require('../../src/routes/event.routes');
const User = require('../../src/models/User');
const Event = require('../../src/models/Event');

let app, adminToken, admin;

beforeAll(async () => {
  await connectDB();
  app = express();
  app.use(express.json());
  app.use('/api/events', eventRoutes);
});
afterAll(async () => { await closeDB(); });
beforeEach(async () => {
  await clearDB();
  admin = await createTestUser({ role: 'admin' });
  adminToken = require('jsonwebtoken').sign({ id: admin._id }, process.env.JWT_SECRET);
});

const crearEvento = () => Event.create({
  customerName: 'Cliente', eventType: 'evento_local',
  eventDate: new Date(), totalCost: 10000
});

describe('Event milestones', () => {
  it('should create manual milestones', async () => {
    const ev = await crearEvento();
    const res = await request(app).post(`/api/events/${ev._id}/milestones`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ etiqueta: 'Anticipo acordado', monto: 4000 });
    expect(res.status).toBe(201);
    expect(res.body.milestones).toHaveLength(1);
    expect(res.body.milestones[0].estado).toBe('pendiente');
  });

  it('should reject milestone without label or amount', async () => {
    const ev = await crearEvento();
    const res = await request(app).post(`/api/events/${ev._id}/milestones`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ etiqueta: '', monto: 0 });
    expect(res.status).toBe(400);
  });

  it('should update milestone state when payments are imputed', async () => {
    const ev = await crearEvento();
    const h = await request(app).post(`/api/events/${ev._id}/milestones`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ etiqueta: 'Anticipo', monto: 4000 });
    const mid = h.body.milestones[0]._id;

    const p1 = await request(app).post(`/api/events/${ev._id}/payment`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ amount: 1500, method: 'efectivo', milestone: mid });
    expect(p1.status).toBe(200);
    expect(p1.body.milestones[0].estado).toBe('parcial');

    const p2 = await request(app).post(`/api/events/${ev._id}/payment`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ amount: 2500, method: 'efectivo', milestone: mid });
    expect(p2.body.milestones[0].estado).toBe('pagado');
  });

  it('should not delete milestone with payments', async () => {
    const ev = await crearEvento();
    const h = await request(app).post(`/api/events/${ev._id}/milestones`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ etiqueta: 'Anticipo', monto: 4000 });
    const mid = h.body.milestones[0]._id;
    await request(app).post(`/api/events/${ev._id}/payment`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ amount: 1000, milestone: mid });
    const del = await request(app).delete(`/api/events/${ev._id}/milestones/${mid}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(del.status).toBe(400);
  });

  it('should delete milestone without payments', async () => {
    const ev = await crearEvento();
    const h = await request(app).post(`/api/events/${ev._id}/milestones`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ etiqueta: 'Saldo', monto: 6000 });
    const mid = h.body.milestones[0]._id;
    const del = await request(app).delete(`/api/events/${ev._id}/milestones/${mid}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(del.status).toBe(200);
    expect(del.body.milestones).toHaveLength(0);
  });
});
