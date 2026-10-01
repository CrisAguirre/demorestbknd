const Reservation = require('../models/Reservation');
const Table = require('../models/Table');

exports.create = async (req, res, next) => {
  try {
    const { table, customerName, numberOfPeople, date, notes } = req.body;

    const tableDoc = await Table.findById(table);
    if (!tableDoc) return res.status(404).json({ message: 'Mesa no encontrada' });
    // Se permiten varias reservas activas por mesa (distintas horas/fechas).
    // Solo se bloquea si la mesa está ocupada con venta en curso.
    if (tableDoc.status === 'ocupada') {
      return res.status(400).json({ message: 'La mesa está ocupada con una venta en curso' });
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
    // currentReservation apunta a la próxima reserva (la más cercana); si ya hay una, se conserva.
    if (!tableDoc.currentReservation) {
      tableDoc.currentReservation = reservation._id;
    } else {
      const actual = await Reservation.findById(tableDoc.currentReservation);
      const activa = actual && (actual.status === 'pendiente' || actual.status === 'confirmada');
      if (!activa || new Date(actual.date) > new Date(reservation.date)) {
        tableDoc.currentReservation = reservation._id;
      }
    }
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

    // Libera la mesa solo si no quedan más reservas activas; si quedan,
    // apunta currentReservation a la próxima.
    const otra = await Reservation.findOne({
      table: reservation.table,
      status: { $in: ['pendiente', 'confirmada'] },
      _id: { $ne: reservation._id }
    }).sort({ date: 1 });
    if (otra) {
      await Table.findByIdAndUpdate(reservation.table, {
        status: 'reservada',
        currentReservation: otra._id
      });
    } else {
      await Table.findByIdAndUpdate(reservation.table, {
        status: 'libre',
        currentReservation: null
      });
    }

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
