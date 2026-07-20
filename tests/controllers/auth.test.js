const request = require('supertest');
const express = require('express');
const { connectDB, closeDB, clearDB } = require('../helpers');
const authRoutes = require('../../src/routes/auth.routes');
const User = require('../../src/models/User');

let app;

beforeAll(async () => {
  await connectDB();
  app = express();
  app.use(express.json());
  app.use('/api/auth', authRoutes);
});
afterAll(async () => { await closeDB(); });
beforeEach(async () => { await clearDB(); });

describe('Auth Controller', () => {
  describe('POST /api/auth/login', () => {
    it('should login with valid credentials', async () => {
      await User.create({ name: 'Test', email: 'test@test.com', passwordHash: 'Password123!', role: 'admin' });
      const res = await request(app).post('/api/auth/login').send({ email: 'test@test.com', password: 'Password123!' });
      expect(res.status).toBe(200);
      expect(res.body.accessToken).toBeDefined();
      expect(res.body.refreshToken).toBeDefined();
      expect(res.body.user.passwordHash).toBeUndefined();
    });

    it('should reject invalid password', async () => {
      await User.create({ name: 'Test', email: 'test@test.com', passwordHash: 'Password123!' });
      const res = await request(app).post('/api/auth/login').send({ email: 'test@test.com', password: 'Wrong' });
      expect(res.status).toBe(401);
    });

    it('should reject non-existent email', async () => {
      const res = await request(app).post('/api/auth/login').send({ email: 'no@test.com', password: 'Pass123!' });
      expect(res.status).toBe(401);
    });

    it('should reject inactive user', async () => {
      await User.create({ name: 'T', email: 'i@test.com', passwordHash: 'Pass123!', isActive: false });
      const res = await request(app).post('/api/auth/login').send({ email: 'i@test.com', password: 'Pass123!' });
      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user when admin', async () => {
      const admin = await User.create({ name: 'Admin', email: 'a@test.com', passwordHash: 'Pass123!', role: 'admin' });
      const token = require('jsonwebtoken').sign({ id: admin._id }, process.env.JWT_SECRET);
      const res = await request(app).post('/api/auth/register').set('Authorization', `Bearer ${token}`).send({ name: 'New', email: 'new@test.com', password: 'Pass123!' });
      expect(res.status).toBe(201);
    });

    it('should reject without auth', async () => {
      const res = await request(app).post('/api/auth/register').send({ name: 'New', email: 'n@test.com', password: 'Pass123!' });
      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/auth/register-client', () => {
    it('should register a client publicly', async () => {
      const res = await request(app).post('/api/auth/register-client').send({ name: 'Client', email: 'c@test.com', password: 'Pass123!' });
      expect(res.status).toBe(201);
      expect(res.body.user.role).toBe('cliente');
      expect(res.body.accessToken).toBeDefined();
    });
  });

  describe('POST /api/auth/refresh', () => {
    it('should refresh tokens', async () => {
      const user = await User.create({ name: 'T', email: 'r@test.com', passwordHash: 'Pass123!' });
      const refreshToken = require('jsonwebtoken').sign({ id: user._id }, process.env.JWT_REFRESH_SECRET);
      const res = await request(app).post('/api/auth/refresh').send({ refreshToken });
      expect(res.status).toBe(200);
      expect(res.body.accessToken).toBeDefined();
    });

    it('should reject invalid refresh token', async () => {
      const res = await request(app).post('/api/auth/refresh').send({ refreshToken: 'invalid' });
      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/auth/profile', () => {
    it('should return user profile', async () => {
      const user = await User.create({ name: 'Profile', email: 'p@test.com', passwordHash: 'Pass123!' });
      const token = require('jsonwebtoken').sign({ id: user._id }, process.env.JWT_SECRET);
      const res = await request(app).get('/api/auth/profile').set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.user.email).toBe('p@test.com');
    });
  });

  describe('PUT /api/auth/change-password', () => {
    it('should change password with correct current password', async () => {
      const user = await User.create({ name: 'T', email: 'cp@test.com', passwordHash: 'OldPass123!' });
      const token = require('jsonwebtoken').sign({ id: user._id }, process.env.JWT_SECRET);
      const res = await request(app).put('/api/auth/change-password').set('Authorization', `Bearer ${token}`).send({ currentPassword: 'OldPass123!', newPassword: 'NewPass123!' });
      expect(res.status).toBe(200);
      const updated = await User.findById(user._id);
      expect(await updated.comparePassword('NewPass123!')).toBe(true);
    });
  });
});
