const request = require('supertest');
const express = require('express');
const { connectDB, closeDB, clearDB, createTestUser } = require('../helpers');
const reservationRoutes = require('../../src/routes/reservation.routes');
const Table = require('../../src/models/Table');
const Reservation = require('../../src/models/Reservation');

let app, token;

beforeAll(async () => {
  await connectDB();
  app = express();
  app.use(express.json());
  app.use('/api/reservations', reservationRoutes);
});
afterAll(async () => { await closeDB(); });
beforeEach(async () => {
  await clearDB();
  const admin = await createTestUser({ role: 'admin' });
  token = require('jsonwebtoken').sign({ id: admin._id }, process.env.JWT_SECRET);
  await Table.create({ number: 5 });
});

const auth = (req) => req.set('Authorization', `Bearer ${token}`);

describe('Reservations multi-reserva', () => {
  it('should allow several reservations on a reserved table', async () => {
    const t = await Table.findOne({ number: 5 });
    const r1 = await auth(request(app).post('/api/reservations')).send({
      table: t._id.toString(), customerName: 'Uno', numberOfPeople: 2, date: new Date(2026, 9, 10, 19, 0).toISOString()
    });
    expect(r1.status).toBe(201);
    const r2 = await auth(request(app).post('/api/reservations')).send({
      table: t._id.toString(), customerName: 'Dos', numberOfPeople: 4, date: new Date(2026, 9, 11, 20, 0).toISOString()
    });
    expect(r2.status).toBe(201);
    expect((await Table.findById(t._id)).status).toBe('reservada');
    expect(await Reservation.countDocuments({ table: t._id, status: 'pendiente' })).toBe(2);
  });

  it('should reject reservation on occupied table', async () => {
    const t = await Table.findOne({ number: 5 });
    t.status = 'ocupada';
    await t.save();
    const r = await auth(request(app).post('/api/reservations')).send({
      table: t._id.toString(), customerName: 'X', numberOfPeople: 2, date: new Date().toISOString()
    });
    expect(r.status).toBe(400);
  });

  it('should keep table reserved when cancelling one of several', async () => {
    const t = await Table.findOne({ number: 5 });
    const mk = (n, d) => auth(request(app).post('/api/reservations')).send({
      table: t._id.toString(), customerName: n, numberOfPeople: 2, date: d.toISOString()
    });
    const a = await mk('A', new Date(2026, 9, 10, 19, 0));
    await mk('B', new Date(2026, 9, 11, 20, 0));
    const c = await auth(request(app).patch(`/api/reservations/${a.body._id}/cancel`));
    expect(c.status).toBe(200);
    const mesa = await Table.findById(t._id);
    expect(mesa.status).toBe('reservada');
    expect(mesa.currentReservation).toBeTruthy();
  });

  it('should free table when cancelling the last one', async () => {
    const t = await Table.findOne({ number: 5 });
    const a = await auth(request(app).post('/api/reservations')).send({
      table: t._id.toString(), customerName: 'A', numberOfPeople: 2, date: new Date().toISOString()
    });
    await auth(request(app).patch(`/api/reservations/${a.body._id}/cancel`));
    expect((await Table.findById(t._id)).status).toBe('libre');
  });
});
