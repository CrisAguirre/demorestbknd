const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const jwt = require('jsonwebtoken');

let mongoServer;

async function connectDB() {
  if (mongoose.connection.readyState !== 0) return;
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  process.env.JWT_SECRET = 'test-jwt-secret';
  process.env.JWT_REFRESH_SECRET = 'test-jwt-refresh-secret';
  process.env.JWT_EXPIRES_IN = '15m';
  process.env.JWT_REFRESH_EXPIRES_IN = '7d';
  process.env.NODE_ENV = 'test';
  await mongoose.connect(uri);
}

async function closeDB() {
  await mongoose.disconnect();
  if (mongoServer) {
    await mongoServer.stop();
    mongoServer = null;
  }
}

async function clearDB() {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    try {
      await collections[key].deleteMany({});
    } catch (e) {}
  }
}

async function createTestUser(overrides = {}) {
  const User = require('../src/models/User');
  return await User.create({
    name: 'Test Admin',
    email: 'admin@test.com',
    passwordHash: 'Password123!',
    role: 'admin',
    phone: '3001234567',
    address: 'Test Address',
    ...overrides
  });
}

function generateToken(userId) {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: '15m' });
}

function authHeader(userId) {
  return { Authorization: `Bearer ${generateToken(userId)}` };
}

async function createTestCategory(overrides = {}) {
  const Category = require('../src/models/Category');
  return await Category.create({
    name: 'Test Category',
    icon: '📦',
    code: 'TCC',
    order: 1,
    isActive: true,
    ...overrides
  });
}

async function createTestSupplier(overrides = {}) {
  const Supplier = require('../src/models/Supplier');
  return await Supplier.create({
    name: 'Test Supplier',
    code: 'TS',
    contactName: 'Contact',
    phone: '3001112233',
    email: 'supplier@test.com',
    isActive: true,
    ...overrides
  });
}

async function createTestProduct(overrides = {}) {
  const Product = require('../src/models/Product');
  const category = overrides.category || await createTestCategory();
  const supplier = overrides.supplier || await createTestSupplier();
  return await Product.create({
    name: 'Test Product',
    barcode: 'TC001',
    category: category._id,
    supplier: supplier._id,
    purchasePrice: 1000,
    salePrice: 2500,
    stock: 50,
    minStock: 5,
    isActive: true,
    ...overrides
  });
}

async function createTestIngredient(overrides = {}) {
  const Ingredient = require('../src/models/Ingredient');
  return await Ingredient.create({
    name: 'Test Ingredient',
    unit: 'kilos',
    stock: 10,
    minStock: 2,
    cost: 5000,
    isActive: true,
    ...overrides
  });
}

async function createTestDish(overrides = {}) {
  const Dish = require('../src/models/Dish');
  const ingredient = overrides.ingredient || await createTestIngredient();
  return await Dish.create({
    name: 'Test Dish',
    category: 'Platos fuertes',
    price: 15000,
    description: 'Test description',
    preparation: 'Test preparation',
    isAvailable: true,
    ingredients: [{ ingredient: ingredient._id, quantity: 2 }],
    ...overrides
  });
}

async function createTestTable(overrides = {}) {
  const Table = require('../src/models/Table');
  return await Table.create({
    number: overrides.number || 1,
    isOccupied: false,
    ...overrides
  });
}

async function createTestKitchenOrder(overrides = {}) {
  const KitchenOrder = require('../src/models/KitchenOrder');
  const Sale = require('../src/models/Sale');
  const ObjectId = mongoose.Types.ObjectId;
  if (!overrides.sale) {
    const user = await createTestUser();
    const sale = await Sale.create({ user: user._id, items: [{ product: new ObjectId(), productName: 'Test', quantity: 1, unitPrice: 100, subtotal: 100 }], total: 100 });
    overrides.sale = sale._id;
  }
  return await KitchenOrder.create({
    sale: overrides.sale,
    tableNumber: 1,
    items: [{ product: new ObjectId(), productName: 'Test Item', quantity: 2 }],
    status: 'nuevo',
    stateHistory: [{ state: 'nuevo', timestamp: new Date() }],
    ...overrides
  });
}

async function createTestCashClosing(overrides = {}) {
  const CashClosing = require('../src/models/CashClosing');
  return await CashClosing.create({
    user: overrides.user || null,
    initialAmount: 50000,
    status: 'abierta',
    ...overrides
  });
}

async function createTestPurchaseIngredient(overrides = {}) {
  const PurchaseIngredient = require('../src/models/PurchaseIngredient');
  const user = overrides.user || await createTestUser();
  const supplier = overrides.supplier || await createTestSupplier();
  const ingredient = overrides.ingredient || await createTestIngredient({ stock: 0 });
  return await PurchaseIngredient.create({
    supplier: supplier._id,
    supplierName: supplier.name,
    user: user._id,
    items: [{
      ingredient: ingredient._id,
      ingredientName: ingredient.name,
      quantity: 10,
      unitCost: ingredient.cost,
      unit: ingredient.unit,
      subtotal: ingredient.cost * 10
    }],
    total: ingredient.cost * 10,
    status: 'recibida',
    ...overrides
  });
}

module.exports = {
  connectDB,
  closeDB,
  clearDB,
  createTestUser,
  generateToken,
  authHeader,
  createTestCategory,
  createTestSupplier,
  createTestProduct,
  createTestIngredient,
  createTestDish,
  createTestTable,
  createTestKitchenOrder,
  createTestCashClosing,
  createTestPurchaseIngredient
};
