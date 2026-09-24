const mongoose = require('mongoose');
const Sale = require('../models/Sale');
const Product = require('../models/Product');
const Dish = require('../models/Dish');
const Ingredient = require('../models/Ingredient');
const Alert = require('../models/Alert');
const Table = require('../models/Table');
const KitchenOrder = require('../models/KitchenOrder');
const DeliveryOrder = require('../models/DeliveryOrder');
const Settings = require('../models/Settings');
const { emitKitchenEvent, emitDataChange } = require('../services/socketService');

// Interruptor maestro del descuento de inventario.
// En OFF (actual): las ventas NO validan ni descuentan stock; la mesa
// siempre se cobra al final. En ON: se valida al registrar y se descuenta
// al cobrar. Cambiar a true cuando recetas e inventario estén configurados.
let DESCONTAR_INVENTARIO = false;
exports.setDescontarInventario = (v) => { DESCONTAR_INVENTARIO = !!v; };
exports.getDescontarInventario = () => DESCONTAR_INVENTARIO;

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

// Descuenta del inventario todo lo vendido en la factura (productos + insumos
// de platos según los consumos guardados al registrar). Se ejecuta al cobrar.
// Retorna null si todo OK, o un mensaje de error (sin mutar nada en ese caso,
// pues quien llama aborta la transacción).
async function deductSaleStock(sale, userId, session, eventsToEmit, alertsToCreate) {
  for (const i of sale.items) {
    const product = await Product.findById(i.product).session(session);
    if (!product) return `Producto "${i.productName}" ya no existe en inventario`;
    if (product.stock < i.quantity) {
      return `Stock insuficiente para "${product.name}" (disponible: ${product.stock})`;
    }
    const previousStock = product.stock;
    product.stock -= i.quantity;
    await product.save({ session });

    await recordMovement(
      product, 'sale', i.quantity, previousStock, product.stock,
      userId, sale._id, 'Sale', `Venta ${sale._id} cobrada (${i.quantity} unidades)`
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
  }

  for (const d of sale.dishItems) {
    for (const c of (d.ingredientsConsumed || [])) {
      const ing = await Ingredient.findById(c.ingredient).session(session);
      if (!ing) return `Insumo "${c.ingredientName}" ya no existe en inventario`;
      if (ing.stock < c.quantity) {
        return `Stock insuficiente de "${ing.name}" (necesario: ${c.quantity}, disponible: ${ing.stock})`;
      }
      const previousStock = ing.stock;
      ing.stock -= c.quantity;
      await ing.save({ session });

      await recordMovement(
        ing, 'sale', c.quantity, previousStock, ing.stock,
        userId, sale._id, 'Sale', `Consumo venta ${sale._id} ("${d.dishName}" x${d.quantity})`
      );
      await ing.save({ session });

      eventsToEmit.push({ entity: 'ingredient', action: 'update', data: { _id: ing._id, stock: ing.stock } });

      if (ing.stock <= ing.minStock) {
        alertsToCreate.push({
          ingredient: ing._id,
          type: ing.stock === 0 ? 'sin_stock' : 'stock_bajo',
          message: ing.stock === 0
            ? `"${ing.name}" se ha agotado (insumo para "${d.dishName}")`
            : `"${ing.name}" tiene stock bajo (${ing.stock}) - insumo para "${d.dishName}"`,
          priority: ing.stock === 0 ? 'alta' : 'media'
        });
      }
    }
  }

  return null;
}

exports.create = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { items, paymentMethod, customerName, notes, tableNumber } = req.body;
    // La mesa 0 (Para llevar) también puede tener venta abierta: el 0 es válido
    const hasTable = tableNumber !== undefined && tableNumber !== null;

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
        if (DESCONTAR_INVENTARIO && product.stock < item.quantity) {
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
        // NOTA: el stock NO se descuenta aquí. Se descuenta al cobrar (pay),
        // cuando la compra se concreta. Aquí solo se valida disponibilidad.
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
            if (DESCONTAR_INVENTARIO && ing.stock < needed) {
              await session.abortTransaction();
              return res.status(400).json({
                message: `Stock insuficiente de "${ing.name}" para "${dish.name}" (necesario: ${needed}, disponible: ${ing.stock})`
              });
            }
          }
        }

        const subtotal = dish.price * item.quantity;
        // Se calculan los consumos para guardarlos en la venta (se descuentan al cobrar).
        // Aquí solo se valida disponibilidad, sin mover stock.
        for (const recipeItem of dish.ingredients) {
          const ing = recipeItem.ingredient;
          if (ing) {
            const needed = recipeItem.quantity * item.quantity;
            ingredientsConsumed.push({
              ingredient: ing._id,
              ingredientName: ing.name,
              quantity: needed,
              unit: ing.unit
            });
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

    // Todo pedido con mesa (incluido Para llevar) trabaja post-pago:
    // queda pendiente hasta el cobro. Solo mostrador sin mesa cobra de inmediato.
    // Excepción explícita: pagoInmediato=true cobra al crear sin ocupar mesa.
    const settings = await Settings.getSettings();
    const pagoInmediato = req.body.pagoInmediato === true;
    let status = 'pagada';
    if (hasTable && !pagoInmediato) {
      status = 'pendiente';
    }

    const sale = await Sale.create([{
      user: req.user._id,
      items: saleItems,
      dishItems,
      total,
      status,
      paymentMethod: paymentMethod || 'efectivo',
      customerName: customerName || 'Cliente general',
      notes
    }], { session });

    const createdSale = sale[0];

    // Cobro inmediato: como nadie pasará por pay(), se descuenta aquí
    // (solo si el interruptor está activo).
    if (pagoInmediato && status === 'pagada' && DESCONTAR_INVENTARIO && !createdSale.stockDeducted) {
      const stockError = await deductSaleStock(createdSale, req.user._id, session, eventsToEmit, alertsToCreate);
      if (stockError) {
        await session.abortTransaction();
        return res.status(400).json({ message: stockError });
      }
      createdSale.stockDeducted = true;
      await createdSale.save({ session });
    }

    // Solo se ocupa la mesa si la venta queda abierta (pendiente).
    // Una venta de cobro inmediato (pagada) no debe ocupar mesa.
    if (hasTable && status === 'pendiente') {
      const table = await Table.findOne({ number: tableNumber }).session(session);
      if (table && table.status !== 'ocupada') {
        table.status = 'ocupada';
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
        if (DESCONTAR_INVENTARIO && product.stock < item.quantity) {
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
          subtotal,
          esAdicional: true
        });
        extraTotal += subtotal;
        // NOTA: el stock NO se descuenta aquí. Se descuenta al cobrar (pay).
        // Aquí solo se valida disponibilidad.
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
            if (DESCONTAR_INVENTARIO && ing.stock < needed) {
              await session.abortTransaction();
              return res.status(400).json({
                message: `Stock insuficiente de "${ing.name}" para "${dish.name}" (necesario: ${needed}, disponible: ${ing.stock})`
              });
            }
          }
        }

        const subtotal = dish.price * item.quantity;
        // Se calculan los consumos para guardarlos en la venta (se descuentan al cobrar).
        // Aquí solo se valida disponibilidad, sin mover stock.
        for (const recipeItem of dish.ingredients) {
          const ing = recipeItem.ingredient;
          if (ing) {
            const needed = recipeItem.quantity * item.quantity;
            ingredientsConsumed.push({
              ingredient: ing._id,
              ingredientName: ing.name,
              quantity: needed,
              unit: ing.unit
            });
          }
        }

        newDishItems.push({
          dish: dish._id,
          dishName: dish.name,
          quantity: item.quantity,
          unitPrice: dish.price,
          subtotal,
          esAdicional: true,
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

exports.pay = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const saleId = req.params.id;
    const { paymentMethod } = req.body;

    const sale = await Sale.findById(saleId).session(session);
    if (!sale) {
      await session.abortTransaction();
      return res.status(404).json({ message: 'Venta no encontrada' });
    }

    if (sale.status === 'pagada') {
      await session.abortTransaction();
      return res.status(400).json({ message: 'Esta venta ya está pagada' });
    }

    if (sale.status === 'cancelada') {
      await session.abortTransaction();
      return res.status(400).json({ message: 'Esta venta está anulada y no se puede cobrar' });
    }

    // Al concretarse la compra con el cobro se descuenta el inventario
    // (solo si el interruptor está activo; si no, la venta fluye sin stock).
    const eventsToEmit = [];
    const alertsToCreate = [];
    if (!sale.stockDeducted && DESCONTAR_INVENTARIO) {
      const stockError = await deductSaleStock(sale, req.user._id, session, eventsToEmit, alertsToCreate);
      if (stockError) {
        await session.abortTransaction();
        return res.status(400).json({ message: stockError });
      }
      sale.stockDeducted = true;
    }

    sale.status = 'pagada';
    if (paymentMethod) sale.paymentMethod = paymentMethod;

    await sale.save({ session });

    // Liberar la mesa
    const table = await Table.findOne({ currentSale: sale._id }).session(session);
    if (table) {
      table.status = 'libre';
      table.currentSale = null;
      table.occupiedAt = null;
      await table.save({ session });
    }

    const insertedAlerts = await Alert.insertMany(alertsToCreate, { session });
    if (insertedAlerts && insertedAlerts.length > 0) {
      insertedAlerts.forEach(alert => {
        eventsToEmit.push({ entity: 'alert', action: 'create', data: alert });
      });
    }

    await session.commitTransaction();

    eventsToEmit.forEach(ev => emitDataChange(ev.entity, ev.action, ev.data));
    emitDataChange('sale', 'update', sale);
    emitDataChange('current-cash', 'update', null);
    if (table) {
      emitDataChange('table', 'update', table);
    }

    res.json(sale);
  } catch (error) {
    await session.abortTransaction();
    next(error);
  } finally {
    session.endSession();
  }
};

exports.cancel = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { reason } = req.body;
    if (!reason || !reason.trim()) {
      await session.abortTransaction();
      return res.status(400).json({ message: 'El motivo de anulación es obligatorio' });
    }

    const sale = await Sale.findById(req.params.id).session(session);
    if (!sale) {
      await session.abortTransaction();
      return res.status(404).json({ message: 'Venta no encontrada' });
    }

    if (sale.status === 'pagada') {
      await session.abortTransaction();
      return res.status(400).json({ message: 'No se puede anular una venta ya pagada' });
    }

    if (sale.status === 'cancelada') {
      await session.abortTransaction();
      return res.status(400).json({ message: 'Esta venta ya está anulada' });
    }

    // Como el inventario se descuenta al cobrar y esta venta nunca se cobró,
    // no hay stock que devolver: solo se marca y se libera la mesa.
    sale.status = 'cancelada';
    sale.notes = sale.notes ? `${sale.notes} | Anulada: ${reason.trim()}` : `Anulada: ${reason.trim()}`;
    await sale.save({ session });

    const table = await Table.findOne({ currentSale: sale._id }).session(session);
    if (table) {
      table.status = 'libre';
      table.currentSale = null;
      table.occupiedAt = null;
      await table.save({ session });
    }

    await session.commitTransaction();

    emitDataChange('sale', 'update', sale);
    if (table) {
      emitDataChange('table', 'update', table);
    }

    res.json(sale);
  } catch (error) {
    await session.abortTransaction();
    next(error);
  } finally {
    session.endSession();
  }
};
