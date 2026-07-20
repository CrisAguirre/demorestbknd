const httpMocks = require('node-mocks-http');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const { connectDB, closeDB, clearDB } = require('../helpers');
const authMiddleware = require('../../src/middleware/auth.middleware');
const User = require('../../src/models/User');

beforeAll(async () => { await connectDB(); });
afterAll(async () => { await closeDB(); });
beforeEach(async () => { await clearDB(); });

describe('Auth Middleware', () => {
  let user;
  beforeEach(async () => {
    user = await User.create({ name: 'Test', email: 'test@test.com', passwordHash: 'Pass123!', role: 'admin' });
  });

  const mockReqRes = () => {
    const req = httpMocks.createRequest();
    const res = httpMocks.createResponse();
    res.status = (code) => { res.statusCode = code; return res; };
    res.json = (data) => { res._data = data; return res; };
    const next = jest.fn();
    return { req, res, next };
  };

  it('should reject missing token', async () => {
    const { req, res, next } = mockReqRes();
    await authMiddleware(req, res, next);
    expect(res.statusCode).toBe(401);
    expect(res._data.message).toBe('Token no proporcionado');
  });

  it('should reject invalid token', async () => {
    const { req, res, next } = mockReqRes();
    req.headers = { authorization: 'Bearer invalid' };
    await authMiddleware(req, res, next);
    expect(res.statusCode).toBe(401);
  });

  it('should accept valid token', async () => {
    const { req, res, next } = mockReqRes();
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET);
    req.headers = { authorization: `Bearer ${token}` };
    await authMiddleware(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(req.user._id.toString()).toBe(user._id.toString());
  });

  it('should reject expired token', async () => {
    const { req, res, next } = mockReqRes();
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '0s' });
    await new Promise(r => setTimeout(r, 100));
    req.headers = { authorization: `Bearer ${token}` };
    await authMiddleware(req, res, next);
    expect(res.statusCode).toBe(401);
    expect(res._data.expired).toBe(true);
  });

  it('should reject inactive user', async () => {
    user.isActive = false;
    await user.save();
    const { req, res, next } = mockReqRes();
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET);
    req.headers = { authorization: `Bearer ${token}` };
    await authMiddleware(req, res, next);
    expect(res.statusCode).toBe(401);
  });
});
