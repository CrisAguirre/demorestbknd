const KitchenOrder = require('../models/KitchenOrder');
const PDFDocument = require('pdfkit');
const path = require('path');
const { emitKitchenEvent } = require('../services/socketService');

exports.getPending = async (req, res, next) => {
  try {
    const orders = await KitchenOrder.find({ status: { $in: ['nuevo', 'en_preparacion'] } })
      .populate('assignedCook', 'name')
      .sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) { next(err); }
};

exports.getByStatus = async (req, res, next) => {
  try {
    const { status } = req.params;
    const orders = await KitchenOrder.find({ status })
      .populate('assignedCook', 'name')
      .sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) { next(err); }
};

exports.getAll = async (req, res, next) => {
  try {
    const orders = await KitchenOrder.find()
      .populate('assignedCook', 'name')
      .populate('sale', 'total paymentMethod')
      .sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) { next(err); }
};

exports.accept = async (req, res, next) => {
  try {
    const order = await KitchenOrder.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Pedido no encontrado' });
    if (order.status !== 'nuevo') return res.status(400).json({ message: 'El pedido ya fue aceptado' });

    order.status = 'en_preparacion';
    order.assignedCook = req.user._id;
    order.stateHistory.push({
      state: 'en_preparacion',
      user: req.user._id,
      userName: req.user.name,
      timestamp: new Date()
    });
    await order.save();
    emitKitchenEvent('kitchen:order:accepted', order);
    res.json(order);
  } catch (err) { next(err); }
};

exports.deliver = async (req, res, next) => {
  try {
    const order = await KitchenOrder.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Pedido no encontrado' });
    if (order.status !== 'en_preparacion') return res.status(400).json({ message: 'El pedido debe estar en preparaci\u00f3n' });

    order.status = 'entregado';
    order.stateHistory.push({
      state: 'entregado',
      user: req.user._id,
      userName: req.user.name,
      timestamp: new Date()
    });
    await order.save();
    emitKitchenEvent('kitchen:order:delivered', order);
    res.json(order);
  } catch (err) { next(err); }
};

exports.markPaid = async (req, res, next) => {
  try {
    const order = await KitchenOrder.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Pedido no encontrado' });
    if (order.status !== 'entregado') return res.status(400).json({ message: 'El pedido debe estar entregado para pagarse' });

    order.status = 'pagado';
    order.stateHistory.push({
      state: 'pagado',
      user: req.user._id,
      userName: req.user.name,
      timestamp: new Date()
    });
    await order.save();
    emitKitchenEvent('kitchen:order:paid', order);

    const Table = require('../models/Table');
    if (order.tableNumber) {
      const table = await Table.findOne({ number: order.tableNumber });
      if (table) {
        table.isOccupied = false;
        table.currentSale = null;
        table.occupiedAt = null;
        await table.save();
      }
    }
    res.json(order);
  } catch (err) { next(err); }
};

exports.printTicket = async (req, res, next) => {
  try {
    const order = await KitchenOrder.findById(req.params.id).populate('sale', 'createdAt');
    if (!order) return res.status(404).json({ message: 'Pedido no encontrado' });

    const doc = new PDFDocument({ size: [80, 300], margin: 5 });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename=pedido-${order._id}.pdf`);
    doc.pipe(res);

    const title = order.tableNumber ? `MESA ${order.tableNumber}` : 'DOMICILIO';
    doc.fontSize(10).text(title, { align: 'center' });
    doc.moveDown(0.3);
    doc.fontSize(7).text(`# ${order._id.toString().slice(-6).toUpperCase()}`, { align: 'center' });
    doc.moveDown(0.3);
    doc.fontSize(6).text(` ${new Date().toLocaleString('es-CO')}`, { align: 'center' });
    doc.moveDown(0.5);

    const startY = doc.y;
    doc.fontSize(7).text('CANT', 5, startY, { width: 25 });
    doc.text('PRODUCTO', 30, startY, { width: 45 });
    doc.moveDown(0.5);
    doc.fontSize(6);

    for (const item of order.items) {
      const y = doc.y;
      doc.text(String(item.quantity), 5, y, { width: 25 });
      doc.text(item.productName, 30, y, { width: 45 });
      if (item.notes) {
        doc.fontSize(5).text(`(${item.notes})`, 30, doc.y, { width: 45 });
        doc.fontSize(6);
      }
      doc.moveDown(0.3);
    }

    order.printCount += 1;
    await order.save();
    doc.end();
  } catch (err) { next(err); }
};