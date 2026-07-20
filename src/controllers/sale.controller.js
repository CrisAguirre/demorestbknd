const Sale = require('../models/Sale');
const Product = require('../models/Product');
const Dish = require('../models/Dish');
const Ingredient = require('../models/Ingredient');
const Alert = require('../models/Alert');
const Table = require('../models/Table');
const KitchenOrder = require('../models/KitchenOrder');

exports.create = async (req, res, next) => {
  try {
    const { items, paymentMethod, customerName, notes, tableNumber } = req.body;
    if (!items || items.length === 0) {
      return res.status(400).json({ message: 'La venta debe tener al menos un item' });
    }

    const saleItems = [];
    let total = 0;

    for (const item of items) {
      const product = await Product.findById(item.product);
      if (product) {
        if (product.stock < item.quantity) {
          return res.status(400).json({
            message: `Stock insuficiente para "${product.name}" (disponible: ${product.stock})`
          });
        }
        const subtotal = product.salePrice * item.quantity;
        saleItems.push({
          product: product._id,
          productName: product.name,
          quantity: item.quantity,
          unitPrice: product.salePrice,
          subtotal
        });
        total += subtotal;
        product.stock -= item.quantity;
        await product.save();
        if (product.stock <= product.minStock) {
          await Alert.create({
            product: product._id,
            type: product.stock === 0 ? 'sin_stock' : 'stock_bajo',
            message: product.stock === 0
              ? `"${product.name}" se ha agotado`
              : `"${product.name}" tiene stock bajo (${product.stock} unidades)`,
            priority: product.stock === 0 ? 'alta' : 'media'
          });
        }
      } else {
        const dish = await Dish.findById(item.product).populate('ingredients.ingredient');
        if (!dish) {
          return res.status(404).json({ message: `Item ${item.product} no encontrado (ni producto ni plato)` });
        }
        for (const recipeItem of dish.ingredients) {
          const ing = recipeItem.ingredient;
          if (!ing) continue;
          const needed = recipeItem.quantity * item.quantity;
          if (ing.stock < needed) {
            return res.status(400).json({
              message: `Stock insuficiente de "${ing.name}" para "${dish.name}" (necesario: ${needed}, disponible: ${ing.stock})`
            });
          }
        }
        const subtotal = dish.price * item.quantity;
        saleItems.push({
          product: dish._id,
          productName: dish.name,
          quantity: item.quantity,
          unitPrice: dish.price,
          subtotal
        });
        total += subtotal;
        for (const recipeItem of dish.ingredients) {
          const ing = recipeItem.ingredient;
          if (!ing) continue;
          const needed = recipeItem.quantity * item.quantity;
          ing.stock -= needed;
          await ing.save();
          if (ing.stock <= ing.minStock) {
            await Alert.create({
              product: ing._id,
              type: ing.stock === 0 ? 'sin_stock' : 'stock_bajo',
              message: ing.stock === 0
                ? `"${ing.name}" se ha agotado (insumo para "${dish.name}")`
                : `"${ing.name}" tiene stock bajo (${ing.stock}) — insumo para "${dish.name}"`,
              priority: ing.stock === 0 ? 'alta' : 'media'
            });
          }
        }
      }
    }

    const sale = await Sale.create({
      user: req.user._id,
      items: saleItems,
      total,
      paymentMethod: paymentMethod || 'efectivo',
      customerName: customerName || 'Cliente general',
      notes
    });

    if (tableNumber) {
      const table = await Table.findOne({ number: tableNumber });
      if (table && !table.isOccupied) {
        table.isOccupied = true;
        table.currentSale = sale._id;
        table.occupiedAt = new Date();
        await table.save();
      }
    }

    if (tableNumber) {
      await KitchenOrder.create({
        sale: sale._id,
        tableNumber,
        items: saleItems.map(i => ({
          product: i.product,
          productName: i.productName,
          quantity: i.quantity
        })),
        status: 'nuevo',
        stateHistory: [{
          state: 'nuevo',
          timestamp: new Date()
        }]
      });
    }

    res.status(201).json(sale);
  } catch (error) {
    next(error);
  }
};

exports.getAll = async (req, res, next) => {
  try {
    const { startDate, endDate, page = 1, limit = 20 } = req.query;
    const filter = {};

    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate + 'T23:59:59.999Z');
    }

    const sales = await Sale.find(filter)
      .populate('user', 'name')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const total = await Sale.countDocuments(filter);
    res.json({ sales, total, page: Number(page), pages: Math.ceil(total / limit) });
  } catch (error) {
    next(error);
  }
};

exports.getById = async (req, res, next) => {
  try {
    const sale = await Sale.findById(req.params.id).populate('user', 'name');
    if (!sale) return res.status(404).json({ message: 'Venta no encontrada' });
    res.json(sale);
  } catch (error) {
    next(error);
  }
};
