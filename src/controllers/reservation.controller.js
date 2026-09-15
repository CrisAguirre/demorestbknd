const Reservation = require('../models/Reservation');
const Table = require('../models/Table');

exports.create = async (req, res, next) => {
  try {
    const { table, customerName, numberOfPeople, date, notes } = req.body;

    const tableDoc = await Table.findById(table);
    if (!tableDoc) return res.status(404).json({ message: 'Mesa no encontrada' });
    if (tableDoc.status !== 'libre') {
      return res.status(400).json({ message: 'La mesa no está libre' });
    }

    const reservation = await Reservation.create({
      table,
      customerName,
      numberOfPeople,
      date,
      notes: notes || '',
      createdBy: req.user._id
    });

    tableDoc.status = 'reservada';
    tableDoc.currentReservation = reservation._id;
    await tableDoc.save();

    res.status(201).json(reservation);
  } catch (error) {
    next(error);
  }
};

exports.getAll = async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    if (req.query.table) filter.table = req.query.table;
    if (req.query.date) {
      const start = new Date(req.query.date);
      start.setHours(0, 0, 0, 0);
      const end = new Date(req.query.date);
      end.setHours(23, 59, 59, 999);
      filter.date = { $gte: start, $lte: end };
    }

    const reservations = await Reservation.find(filter)
      .populate('table', 'number name')
      .populate('createdBy', 'name')
      .sort({ date: 1 });

    res.json(reservations);
  } catch (error) {
    next(error);
  }
};

exports.getOne = async (req, res, next) => {
  try {
    const reservation = await Reservation.findById(req.params.id)
      .populate('table', 'number name')
      .populate('createdBy', 'name');

    if (!reservation) return res.status(404).json({ message: 'Reservación no encontrada' });
    res.json(reservation);
  } catch (error) {
    next(error);
  }
};

exports.cancel = async (req, res, next) => {
  try {
    const reservation = await Reservation.findById(req.params.id);
    if (!reservation) return res.status(404).json({ message: 'Reservación no encontrada' });

    reservation.status = 'cancelada';
    await reservation.save();

    // Free the table
    await Table.findByIdAndUpdate(reservation.table, {
      status: 'libre',
      currentReservation: null
    });

    res.json(reservation);
  } catch (error) {
    next(error);
  }
};

exports.complete = async (req, res, next) => {
  try {
    const reservation = await Reservation.findById(req.params.id);
    if (!reservation) return res.status(404).json({ message: 'Reservación no encontrada' });

    reservation.status = 'completada';
    await reservation.save();

    // Mark table as occupied (transitioning from reservation to active order)
    await Table.findByIdAndUpdate(reservation.table, {
      status: 'ocupada',
      currentReservation: null,
      occupiedAt: new Date()
    });

    res.json(reservation);
  } catch (error) {
    next(error);
  }
};
