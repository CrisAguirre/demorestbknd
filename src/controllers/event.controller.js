const Event = require('../models/Event');

exports.getAll = async (req, res, next) => {
  try {
    const events = await Event.find().sort({ eventDate: 1 });
    res.json(events);
  } catch (error) {
    next(error);
  }
};

exports.getById = async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: 'Evento no encontrado' });
    res.json(event);
  } catch (error) {
    next(error);
  }
};

exports.create = async (req, res, next) => {
  try {
    const event = await Event.create(req.body);
    res.status(201).json(event);
  } catch (error) {
    next(error);
  }
};

exports.update = async (req, res, next) => {
  try {
    const event = await Event.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!event) return res.status(404).json({ message: 'Evento no encontrado' });
    res.json(event);
  } catch (error) {
    next(error);
  }
};

exports.delete = async (req, res, next) => {
  try {
    const event = await Event.findByIdAndDelete(req.params.id);
    if (!event) return res.status(404).json({ message: 'Evento no encontrado' });
    res.json({ message: 'Evento eliminado' });
  } catch (error) {
    next(error);
  }
};

exports.addPayment = async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: 'Evento no encontrado' });

    const payment = {
      amount: req.body.amount,
      method: req.body.method || 'efectivo',
      milestone: req.body.milestone || null,
      user: req.user._id,
      date: new Date()
    };

    event.payments.push(payment);

    // Recalcular estado del hito imputado
    if (payment.milestone) {
      const hito = event.milestones.id(payment.milestone);
      if (hito) {
        const abonado = event.payments
          .filter(p => String(p.milestone) === String(hito._id))
          .reduce((s, p) => s + p.amount, 0);
        hito.estado = abonado >= hito.monto ? 'pagado' : (abonado > 0 ? 'parcial' : 'pendiente');
      }
    }

    await event.save();

    res.json(event);
  } catch (error) {
    next(error);
  }
};

// POST /api/events/:id/milestones — crear hito manual
exports.addMilestone = async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: 'Evento no encontrado' });
    const { etiqueta, monto, vencimiento } = req.body;
    if (!etiqueta || !(monto > 0)) {
      return res.status(400).json({ message: 'Etiqueta y monto mayor a 0 son obligatorios.' });
    }
    event.milestones.push({ etiqueta, monto, vencimiento: vencimiento || null });
    await event.save();
    res.status(201).json(event);
  } catch (error) {
    next(error);
  }
};

// DELETE /api/events/:id/milestones/:mid — eliminar hito (solo si no tiene abonos)
exports.removeMilestone = async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: 'Evento no encontrado' });
    const hito = event.milestones.id(req.params.mid);
    if (!hito) return res.status(404).json({ message: 'Hito no encontrado.' });
    const conAbonos = event.payments.some(p => String(p.milestone) === String(hito._id));
    if (conAbonos) return res.status(400).json({ message: 'El hito tiene abonos y no se puede eliminar.' });
    hito.deleteOne();
    await event.save();
    res.json(event);
  } catch (error) {
    next(error);
  }
};
