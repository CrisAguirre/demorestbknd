const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
const { connectDB, closeDB, clearDB } = require('../helpers');
const settingsRoutes = require('../../src/routes/settings.routes');
const User = require('../../src/models/User');
const Settings = require('../../src/models/Settings');

let app, adminToken, admin;

beforeAll(async () => {
  await connectDB();
  app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use('/api/settings', settingsRoutes);
});
afterAll(async () => { await closeDB(); });
beforeEach(async () => {
  await clearDB();
  admin = await User.create({ name: 'Admin', email: 'a@test.com', passwordHash: 'Pass123!', role: 'admin' });
  adminToken = require('jsonwebtoken').sign({ id: admin._id }, process.env.JWT_SECRET);
});

describe('Settings Controller', () => {
  describe('GET /api/settings', () => {
    it('should return default settings when none exist', async () => {
      const res = await request(app).get('/api/settings');
      expect(res.status).toBe(200);
      expect(res.body.storeName).toBe("La Soupe a l'Oignon");
    });

    it('should return saved settings', async () => {
      const s = await Settings.getSettings();
      s.storeName = 'Mi Tienda';
      await s.save();
      const res = await request(app).get('/api/settings');
      expect(res.status).toBe(200);
      expect(res.body.storeName).toBe('Mi Tienda');
    });
  });

  describe('PUT /api/settings', () => {
    it('should update store settings', async () => {
      const res = await request(app)
        .put('/api/settings')
        .set('Authorization', `Bearer ${adminToken}`)
        .field('storeName', 'Nuevo Nombre')
        .field('phone', '3001112233');
      expect(res.status).toBe(200);
      expect(res.body.storeName).toBe('Nuevo Nombre');
      expect(res.body.phone).toBe('3001112233');
    });

    it('should update email config via JSON string', async () => {
      const emailConfig = {
        host: 'smtp.gmail.com',
        port: 587,
        secure: false,
        user: 'test@gmail.com',
        pass: 'app123',
        from: 'test@gmail.com',
        alertEmail: 'admin@test.com'
      };
      const res = await request(app)
        .put('/api/settings')
        .set('Authorization', `Bearer ${adminToken}`)
        .field('email', JSON.stringify(emailConfig));
      expect(res.status).toBe(200);
      expect(res.body.email.host).toBe('smtp.gmail.com');
      expect(res.body.email.port).toBe(587);
      expect(res.body.email.user).toBe('test@gmail.com');
    });

    it('should reject non-admin', async () => {
      const res = await request(app).put('/api/settings').field('storeName', 'X');
      expect(res.status).toBe(401);
    });

    it('should handle invalid email JSON gracefully', async () => {
      const res = await request(app)
        .put('/api/settings')
        .set('Authorization', `Bearer ${adminToken}`)
        .field('email', 'not-json');
      expect(res.status).toBe(200);
      // Falls back to defaults
      expect(res.body.email?.host).toBe('');
    });
  });
});
