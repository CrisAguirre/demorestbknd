const Table = require('../models/Table');

exports.getAll = async (req, res, next) => {
  try {
    let tables = await Table.find().sort({ number: 1 }).populate('currentSale', 'total createdAt');
    if (tables.length === 0) {
      const initial = [];
      for (let i = 1; i <= 16; i++) {
        initial.push({ number: i });
      }
      tables = await Table.insertMany(initial);
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
    if (table.isOccupied) return res.status(400).json({ message: 'La mesa ya está ocupada' });
    table.isOccupied = true;
    table.currentSale = req.body.saleId || null;
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
    table.isOccupied = false;
    table.currentSale = null;
    table.occupiedAt = null;
    await table.save();
    res.json(table);
  } catch (error) {
    next(error);
  }
};
