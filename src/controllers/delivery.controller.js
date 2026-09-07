const DeliveryOrder = require('../models/DeliveryOrder');
const { emitKitchenEvent } = require('../services/socketService');

exports.getAll = async (req, res, next) => {
  try {
    const { status } = req.query;
    const filter = {};
    if (status) filter.status = status;
    const orders = await DeliveryOrder.find(filter)
      .populate('assignedDriver', 'name')
      .populate('sale', 'total paymentMethod')
      .sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) { next(err); }
};

exports.getPending = async (req, res, next) => {
  try {
    const orders = await DeliveryOrder.find({ status: { $in: ['pendiente', 'en_preparacion', 'en_camino'] } })
      .populate('assignedDriver', 'name')
      .populate('sale', 'total paymentMethod')
      .sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) { next(err); }
};

exports.accept = async (req, res, next) => {
  try {
    const order = await DeliveryOrder.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Pedido no encontrado' });
    if (order.status !== 'pendiente') return res.status(400).json({ message: 'El pedido ya fue aceptado' });

    order.status = 'en_preparacion';
    order.stateHistory.push({ state: 'en_preparacion', user: req.user._id, userName: req.user.name, timestamp: new Date() });
    await order.save();
    emitKitchenEvent('delivery:accepted', order);
    res.json(order);
  } catch (err) { next(err); }
};

exports.dispatch = async (req, res, next) => {
  try {
    const order = await DeliveryOrder.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Pedido no encontrado' });
    if (order.status !== 'en_preparacion') return res.status(400).json({ message: 'El pedido debe estar en preparación' });

    order.status = 'en_camino';
    order.assignedDriver = req.user._id;
    order.stateHistory.push({ state: 'en_camino', user: req.user._id, userName: req.user.name, timestamp: new Date() });
    await order.save();
    emitKitchenEvent('delivery:dispatched', order);
    res.json(order);
  } catch (err) { next(err); }
};

exports.deliver = async (req, res, next) => {
  try {
    const order = await DeliveryOrder.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Pedido no encontrado' });
    if (order.status !== 'en_camino') return res.status(400).json({ message: 'El pedido debe estar en camino' });

    order.status = 'entregado';
    order.stateHistory.push({ state: 'entregado', user: req.user._id, userName: req.user.name, timestamp: new Date() });
    await order.save();
    emitKitchenEvent('delivery:delivered', order);
    res.json(order);
  } catch (err) { next(err); }
};

exports.cancel = async (req, res, next) => {
  try {
    const order = await DeliveryOrder.findByIdAndUpdate(req.params.id, { status: 'cancelado' }, { new: true });
    if (!order) return res.status(404).json({ message: 'Pedido no encontrado' });
    emitKitchenEvent('delivery:cancelled', order);
    res.json(order);
  } catch (err) { next(err); }
};
