const mongoose = require('mongoose');
const { connectDB, closeDB, clearDB } = require('../helpers');
const User = require('../../src/models/User');

beforeAll(async () => { await connectDB(); });
afterAll(async () => { await closeDB(); });
beforeEach(async () => { await clearDB(); });

describe('User Model', () => {
  it('should create a user with valid data', async () => {
    const user = await User.create({ name: 'Test User', email: 'test@test.com', passwordHash: 'Password123!', role: 'admin' });
    expect(user.name).toBe('Test User');
    expect(user.role).toBe('admin');
    expect(user.isActive).toBe(true);
  });

  it('should hash password on save', async () => {
    const user = await User.create({ name: 'Test', email: 'hash@test.com', passwordHash: 'Password123!' });
    expect(user.passwordHash).not.toBe('Password123!');
    expect(user.passwordHash).toMatch(/^\$2[aby]\$\d{2}\$/);
  });

  it('should compare passwords correctly', async () => {
    const user = await User.create({ name: 'Test', email: 'c@test.com', passwordHash: 'Password123!' });
    expect(await user.comparePassword('Password123!')).toBe(true);
    expect(await user.comparePassword('WrongPass')).toBe(false);
  });

  it('should remove passwordHash on toJSON', async () => {
    const user = await User.create({ name: 'Test', email: 'j@test.com', passwordHash: 'Pass123!' });
    expect(user.toJSON().passwordHash).toBeUndefined();
  });

  it('should enforce required fields', async () => {
    await expect(User.create({})).rejects.toThrow();
  });

  it('should enforce email uniqueness', async () => {
    await User.create({ name: 'A', email: 'dup@test.com', passwordHash: 'Pass123!' });
    await expect(User.create({ name: 'B', email: 'dup@test.com', passwordHash: 'Pass456!' })).rejects.toThrow();
  });

  it('should default role to cajero', async () => {
    const user = await User.create({ name: 'Default', email: 'd@test.com', passwordHash: 'Pass123!' });
    expect(user.role).toBe('cajero');
  });
});
