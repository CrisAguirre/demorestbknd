const CashClosing = require('../models/CashClosing');
const Sale = require('../models/Sale');

exports.open = async (req, res, next) => {
  try {
    // Verificar si ya hay una caja abierta
    const openCash = await CashClosing.findOne({ status: 'abierta' });
    if (openCash) {
      return res.status(400).json({ message: 'Ya existe una caja abierta. Ciérrela primero.' });
    }

    const cashClosing = await CashClosing.create({
      user: req.user._id,
      initialAmount: req.body.initialAmount || 0
    });
    res.status(201).json(cashClosing);
  } catch (error) {
    next(error);
  }
};

exports.close = async (req, res, next) => {
  try {
    const cashClosing = await CashClosing.findById(req.params.id);
    if (!cashClosing) return res.status(404).json({ message: 'Arqueo no encontrado' });
    if (cashClosing.status === 'cerrada') {
      return res.status(400).json({ message: 'Esta caja ya fue cerrada' });
    }

    // Calcular ventas del periodo
    const sales = await Sale.find({
      createdAt: { $gte: cashClosing.openedAt, $lte: new Date() }
    });

    const totalSales = sales.reduce((sum, s) => sum + s.total, 0);
    const expectedCash = cashClosing.initialAmount + totalSales;

    cashClosing.closedAt = new Date();
    cashClosing.totalSales = totalSales;
    cashClosing.totalTransactions = sales.length;
    cashClosing.expectedCash = expectedCash;
    cashClosing.actualCash = req.body.actualCash || 0;
    cashClosing.difference = cashClosing.actualCash - expectedCash;
    cashClosing.notes = req.body.notes || '';
    cashClosing.status = 'cerrada';

    await cashClosing.save();
    res.json(cashClosing);
  } catch (error) {
    next(error);
  }
};

exports.getAll = async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const closings = await CashClosing.find()
      .populate('user', 'name')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const total = await CashClosing.countDocuments();
    res.json({ closings, total, page: Number(page), pages: Math.ceil(total / limit) });
  } catch (error) {
    next(error);
  }
};

exports.getCurrent = async (req, res, next) => {
  try {
    const current = await CashClosing.findOne({ status: 'abierta' }).populate('user', 'name');
    if (!current) return res.json({ open: false, message: 'No hay caja abierta' });

    // Calcular ventas actuales
    const sales = await Sale.find({ createdAt: { $gte: current.openedAt } });
    const totalSales = sales.reduce((sum, s) => sum + s.total, 0);

    res.json({
      open: true,
      cashClosing: current,
      currentTotalSales: totalSales,
      currentTransactions: sales.length
    });
  } catch (error) {
    next(error);
  }
};
