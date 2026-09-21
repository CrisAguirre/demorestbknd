const Table = require('../models/Table');

// Distribución de salones: 1-8 Salón 1, 9-16 Salón 2, 0 Para llevar
function zonaPorNumero(number) {
  if (number === 0) return 'Para llevar';
  if (number >= 9) return 'Salón 2';
  return 'Salón 1';
}

exports.getAll = async (req, res, next) => {
  try {
    let tables = await Table.find().sort({ number: 1 })
      .populate({ path: 'currentSale', select: 'total createdAt' })
      .populate({ path: 'currentReservation', select: 'customerName numberOfPeople date notes status' });

    if (tables.length === 0) {
      // Create table 0 (takeout) + tables 1-16
      const initial = [{ number: 0, name: 'Para llevar', zona: zonaPorNumero(0) }];
      for (let i = 1; i <= 16; i++) {
        initial.push({ number: i, zona: zonaPorNumero(i) });
      }
      tables = await Table.insertMany(initial);
    } else {
      // Ensure table 0 exists
      const hasTable0 = tables.some(t => t.number === 0);
      if (!hasTable0) {
        const table0 = await Table.create({ number: 0, name: 'Para llevar', zona: zonaPorNumero(0) });
        tables.unshift(table0);
      }
      // Backfill: asignar zona a mesas creadas antes de este campo.
      // Se hace directo en BD porque el default del schema ocultaría los faltantes al leer.
      const sinZona = { $or: [{ zona: { $exists: false } }, { zona: null }, { zona: '' }] };
      await Table.updateMany({ ...sinZona, number: 0 }, { $set: { zona: 'Para llevar' } });
      await Table.updateMany({ ...sinZona, number: { $gte: 9 } }, { $set: { zona: 'Salón 2' } });
      await Table.updateMany({ ...sinZona, number: { $gte: 1, $lt: 9 } }, { $set: { zona: 'Salón 1' } });
      tables = await Table.find().sort({ number: 1 })
        .populate({ path: 'currentSale', select: 'total createdAt' })
        .populate({ path: 'currentReservation', select: 'customerName numberOfPeople date notes status' });
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
