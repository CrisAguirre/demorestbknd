const mongoose = require('mongoose');
const Sale = require('../models/Sale');
const Product = require('../models/Product');
const Dish = require('../models/Dish');
const Alert = require('../models/Alert');
const Table = require('../models/Table');
const KitchenOrder = require('../models/KitchenOrder');
const DeliveryOrder = require('../models/DeliveryOrder');
const { emitKitchenEvent, emitDataChange } = require('../services/socketService');

async function recordMovement(document, type, quantity, previousStock, newStock, userId, reference, referenceModel, description) {
  document.movementHistory.push({
    type,
    quantity,
    previousStock,
    newStock,
    reference,
    referenceModel,
    description,
    user: userId
  });
}

exports.create = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { items, paymentMethod, customerName, notes, tableNumber } = req.body;

    if (!items || items.length === 0) {
      await session.abortTransaction();
      return res.status(400).json({ message: 'La venta debe tener al menos un item' });
    }

    const saleItems = [];
    const dishItems = [];
    let total = 0;
    const alertsToCreate = [];
    const eventsToEmit = [];

    for (const item of items) {
      const product = await Product.findById(item.product).session(session);
      if (product) {
        if (product.stock < item.quantity) {
          await session.abortTransaction();
          return res.status(400).json({
            message: `Stock insuficiente para "${product.name}" (disponible: ${product.stock})`
          });
        }
        const subtotal = product.salePrice * item.quantity;
        saleItems.push({
          product: product._id,
          productName: product.name,
          itemType: 'Product',
          quantity: item.quantity,
          unitPrice: product.salePrice,
          subtotal
        });
        total += subtotal;

        const previousStock = product.stock;
        product.stock -= item.quantity;
        await product.save({ session });

        await recordMovement(
          product,
          'sale',
          item.quantity,
          previousStock,
          product.stock,
          req.user._id,
          null,
          'Sale',
          `Venta de ${item.quantity} unidades`
        );
        await product.save({ session });
        
        eventsToEmit.push({ entity: 'product', action: 'update', data: { _id: product._id, stock: product.stock } });

        if (product.stock <= product.minStock) {
          alertsToCreate.push({
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
          await session.abortTransaction();
          return res.status(404).json({ message: `Item ${item.product} no encontrado (ni producto ni plato)` });
        }

        const ingredientsConsumed = [];
        for (const recipeItem of dish.ingredients) {
          const ing = recipeItem.ingredient;
          if (ing) {
            const needed = recipeItem.quantity * item.quantity;
            if (ing.stock < needed) {
              await session.abortTransaction();
              return res.status(400).json({
                message: `Stock insuficiente de "${ing.name}" para "${dish.name}" (necesario: ${needed}, disponible: ${ing.stock})`
              });
            }
          }
        }

        const subtotal = dish.price * item.quantity;
        for (const recipeItem of dish.ingredients) {
          const ing = recipeItem.ingredient;
          if (ing) {
            const needed = recipeItem.quantity * item.quantity;
            const previousStock = ing.stock;
            ing.stock -= needed;
            await ing.save({ session });

            await recordMovement(
              ing,
              'sale',
              needed,
              previousStock,
              ing.stock,
              req.user._id,
              null,
              'Sale',
              `Consumo para "${dish.name}" x${item.quantity}`
            );
            await ing.save({ session });
            
            eventsToEmit.push({ entity: 'ingredient', action: 'update', data: { _id: ing._id, stock: ing.stock } });

            ingredientsConsumed.push({
              ingredient: ing._id,
              ingredientName: ing.name,
              quantity: needed,
              unit: ing.unit
            });

            if (ing.stock <= ing.minStock) {
              alertsToCreate.push({
                ingredient: ing._id,
                type: ing.stock === 0 ? 'sin_stock' : 'stock_bajo',
                message: ing.stock === 0
                  ? `"${ing.name}" se ha agotado (insumo para "${dish.name}")`
                  : `"${ing.name}" tiene stock bajo (${ing.stock}) - insumo para "${dish.name}"`,
                priority: ing.stock === 0 ? 'alta' : 'media'
              });
            }
          }
        }

        dishItems.push({
          dish: dish._id,
          dishName: dish.name,
          quantity: item.quantity,
          unitPrice: dish.price,
          subtotal,
          ingredientsConsumed
        });
        total += subtotal;
      }
    }

    const sale = await Sale.create([{
      user: req.user._id,
      items: saleItems,
      dishItems,
      total,
      paymentMethod: paymentMethod || 'efectivo',
      customerName: customerName || 'Cliente general',
      notes
    }], { session });

    const createdSale = sale[0];

    if (tableNumber) {
      const table = await Table.findOne({ number: tableNumber }).session(session);
      if (table && !table.isOccupied) {
        table.isOccupied = true;
        table.currentSale = createdSale._id;
        table.occupiedAt = new Date();
        await table.save({ session });
      }
    }

    const kitchenItems = [
      ...saleItems.map(i => ({
        product: i.product,
        productType: 'Product',
        productName: i.productName,
        quantity: i.quantity
      })),
      ...dishItems.map(d => ({
        product: d.dish,
        productType: 'Dish',
        productName: d.dishName,
        quantity: d.quantity
      }))
    ];

    const kitchenOrder = await KitchenOrder.create([{
      sale: createdSale._id,
      tableNumber,
      items: kitchenItems,
      status: 'nuevo',
      stateHistory: [{ state: 'nuevo', timestamp: new Date() }]
    }], { session });

    if (tableNumber) {
      emitKitchenEvent('kitchen:order:new', kitchenOrder[0]);
    } else {
      const delivery = await DeliveryOrder.create([{
        sale: createdSale._id,
        customerName: customerName || 'Cliente general',
        customerPhone: req.body.customerPhone || '',
        customerAddress: req.body.customerAddress || 'Sin dirección',
        deliveryFee: req.body.deliveryFee || 0,
        items: kitchenItems.map(i => ({
          productName: i.productName,
          quantity: i.quantity
        })),
        status: 'pendiente',
        stateHistory: [{ state: 'pendiente', timestamp: new Date() }]
      }], { session });

      emitKitchenEvent('delivery:new', delivery[0]);
      emitKitchenEvent('kitchen:order:new', kitchenOrder[0]);
    }

    const insertedAlerts = await Alert.insertMany(alertsToCreate, { session });
    if (insertedAlerts && insertedAlerts.length > 0) {
      insertedAlerts.forEach(alert => {
        eventsToEmit.push({ entity: 'alert', action: 'create', data: alert });
      });
    }

    await session.commitTransaction();
    
    eventsToEmit.forEach(ev => emitDataChange(ev.entity, ev.action, ev.data));
    
    res.status(201).json(createdSale);
  } catch (error) {
    await session.abortTransaction();
    next(error);
  } finally {
    session.endSession();
  }
};

exports.getAll = async (req, res, next) => {
  try {
    const { startDate, endDate, page = 1, limit = 20 } = req.query;
    const filter = {};

    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(`${endDate}T23:59:59.999Z`);
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
    const sale = await Sale.findById(req.params.id)
      .populate('user', 'name')
      .populate('dishItems.dish')
      .populate('dishItems.ingredientsConsumed.ingredient');
    if (!sale) return res.status(404).json({ message: 'Venta no encontrada' });
    res.json(sale);
  } catch (error) {
    next(error);
  }
};

exports.addItems = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const saleId = req.params.id;
    const { items, notes } = req.body;

    if (!items || items.length === 0) {
      await session.abortTransaction();
      return res.status(400).json({ message: 'Debe enviar al menos un item para agregar' });
    }

    const sale = await Sale.findById(saleId).session(session);
    if (!sale) {
      await session.abortTransaction();
      return res.status(404).json({ message: 'Venta no encontrada' });
    }

    const newSaleItems = [];
    const newDishItems = [];
    let extraTotal = 0;
    const alertsToCreate = [];
    const eventsToEmit = [];

    for (const item of items) {
      const product = await Product.findById(item.product).session(session);
      if (product) {
        if (product.stock < item.quantity) {
          await session.abortTransaction();
          return res.status(400).json({
            message: `Stock insuficiente para "${product.name}" (disponible: ${product.stock})`
          });
        }
        const subtotal = product.salePrice * item.quantity;
        newSaleItems.push({
          product: product._id,
          productName: product.name,
          itemType: 'Product',
          quantity: item.quantity,
          unitPrice: product.salePrice,
          subtotal
        });
        extraTotal += subtotal;

        const previousStock = product.stock;
        product.stock -= item.quantity;
        await product.save({ session });

        await recordMovement(
          product,
          'sale',
          item.quantity,
          previousStock,
          product.stock,
          req.user._id,
          sale._id,
          'Sale',
          `Adición a venta de ${item.quantity} unidades`
        );
        await product.save({ session });
        
        eventsToEmit.push({ entity: 'product', action: 'update', data: { _id: product._id, stock: product.stock } });

        if (product.stock <= product.minStock) {
          alertsToCreate.push({
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
          await session.abortTransaction();
          return res.status(404).json({ message: `Item ${item.product} no encontrado (ni producto ni plato)` });
        }

        const ingredientsConsumed = [];
        for (const recipeItem of dish.ingredients) {
          const ing = recipeItem.ingredient;
          if (ing) {
            const needed = recipeItem.quantity * item.quantity;
            if (ing.stock < needed) {
              await session.abortTransaction();
              return res.status(400).json({
                message: `Stock insuficiente de "${ing.name}" para "${dish.name}" (necesario: ${needed}, disponible: ${ing.stock})`
              });
            }
          }
        }

        const subtotal = dish.price * item.quantity;
        for (const recipeItem of dish.ingredients) {
          const ing = recipeItem.ingredient;
          if (ing) {
            const needed = recipeItem.quantity * item.quantity;
            const previousStock = ing.stock;
            ing.stock -= needed;
            await ing.save({ session });

            await recordMovement(
              ing,
              'sale',
              needed,
              previousStock,
              ing.stock,
              req.user._id,
              sale._id,
              'Sale',
              `Consumo extra para "${dish.name}" x${item.quantity}`
            );
            await ing.save({ session });
            
            eventsToEmit.push({ entity: 'ingredient', action: 'update', data: { _id: ing._id, stock: ing.stock } });

            ingredientsConsumed.push({
              ingredient: ing._id,
              ingredientName: ing.name,
              quantity: needed,
              unit: ing.unit
            });

            if (ing.stock <= ing.minStock) {
              alertsToCreate.push({
                ingredient: ing._id,
                type: ing.stock === 0 ? 'sin_stock' : 'stock_bajo',
                message: ing.stock === 0
                  ? `"${ing.name}" se ha agotado (insumo para "${dish.name}")`
                  : `"${ing.name}" tiene stock bajo (${ing.stock}) - insumo para "${dish.name}"`,
                priority: ing.stock === 0 ? 'alta' : 'media'
              });
            }
          }
        }

        newDishItems.push({
          dish: dish._id,
          dishName: dish.name,
          quantity: item.quantity,
          unitPrice: dish.price,
          subtotal,
          ingredientsConsumed
        });
        extraTotal += subtotal;
      }
    }

    sale.items.push(...newSaleItems);
    sale.dishItems.push(...newDishItems);
    sale.total += extraTotal;
    if (notes) {
      sale.notes = sale.notes ? `${sale.notes} | Adicional: ${notes}` : `Adicional: ${notes}`;
    }
    await sale.save({ session });

    const kitchenItems = [
      ...newSaleItems.map(i => ({
        product: i.product,
        productType: 'Product',
        productName: i.productName,
        quantity: i.quantity
      })),
      ...newDishItems.map(d => ({
        product: d.dish,
        productType: 'Dish',
        productName: d.dishName,
        quantity: d.quantity
      }))
    ];

    let createdKitchenOrder = null;
    const table = await Table.findOne({ currentSale: sale._id }).session(session);
    
    if (kitchenItems.length > 0) {
      const kitchenOrder = await KitchenOrder.create([{
        sale: sale._id,
        tableNumber: table ? table.number : null,
        items: kitchenItems,
        status: 'nuevo',
        stateHistory: [{ state: 'nuevo', timestamp: new Date() }]
      }], { session });
      createdKitchenOrder = kitchenOrder[0];
    }

    const insertedAlerts = await Alert.insertMany(alertsToCreate, { session });
    if (insertedAlerts && insertedAlerts.length > 0) {
      insertedAlerts.forEach(alert => {
        eventsToEmit.push({ entity: 'alert', action: 'create', data: alert });
      });
    }

    await session.commitTransaction();
    
    eventsToEmit.forEach(ev => emitDataChange(ev.entity, ev.action, ev.data));
    if (createdKitchenOrder) {
      emitKitchenEvent('kitchen:order:new', createdKitchenOrder);
    }
    
    res.status(200).json(sale);
  } catch (error) {
    await session.abortTransaction();
    next(error);
  } finally {
    session.endSession();
  }
};
