const Table = require('../models/Table');

exports.getAll = async (req, res, next) => {
  try {
    let tables = await Table.find().sort({ number: 1 })
      .populate({ path: 'currentSale', select: 'total createdAt' })
      .populate({ path: 'currentReservation', select: 'customerName numberOfPeople date notes status' });

    if (tables.length === 0) {
      // Create table 0 (takeout) + tables 1-16
      const initial = [{ number: 0, name: 'Para llevar' }];
      for (let i = 1; i <= 16; i++) {
        initial.push({ number: i });
      }
      tables = await Table.insertMany(initial);
    } else {
      // Ensure table 0 exists
      const hasTable0 = tables.some(t => t.number === 0);
      if (!hasTable0) {
        const table0 = await Table.create({ number: 0, name: 'Para llevar' });
        tables.unshift(table0);
      }
    }

    res.json(tables);
  } catch (error) {
    next(error);
  }
};

exports.occupy = async (req, res, next) => {
  try {
    const table = await Table.findById(req.params.id);
    if (!table) return res.status(404).json({ message: 'Mesa no encontrada' });
    if (table.status === 'ocupada') return res.status(400).json({ message: 'La mesa ya está ocupada' });

    table.status = 'ocupada';
    table.currentSale = req.body.saleId || null;
    table.currentReservation = null;
    table.occupiedAt = new Date();
    await table.save();
    res.json(table);
  } catch (error) {
    next(error);
  }
};

exports.free = async (req, res, next) => {
  try {
    const table = await Table.findById(req.params.id);
    if (!table) return res.status(404).json({ message: 'Mesa no encontrada' });

    table.status = 'libre';
    table.currentSale = null;
    table.currentReservation = null;
    table.occupiedAt = null;
    await table.save();
    res.json(table);
  } catch (error) {
    next(error);
  }
};
