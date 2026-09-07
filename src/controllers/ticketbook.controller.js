const TicketBook = require('../models/TicketBook');

exports.getAll = async (req, res, next) => {
  try {
    const ticketBooks = await TicketBook.find({ isActive: true }).sort({ createdAt: -1 });
    res.json(ticketBooks);
  } catch (error) {
    next(error);
  }
};

exports.create = async (req, res, next) => {
  try {
    const ticketBook = await TicketBook.create(req.body);
    res.status(201).json(ticketBook);
  } catch (error) {
    next(error);
  }
};

exports.update = async (req, res, next) => {
  try {
    const ticketBook = await TicketBook.findByIdAndUpdate(req.params.id, req.body, {
      new: true, runValidators: true
    });
    if (!ticketBook) return res.status(404).json({ message: 'Tiquetera no encontrada' });
    res.json(ticketBook);
  } catch (error) {
    next(error);
  }
};

exports.consume = async (req, res, next) => {
  try {
    const ticketBook = await TicketBook.findById(req.params.id);
    if (!ticketBook) return res.status(404).json({ message: 'Tiquetera no encontrada' });

    if (ticketBook.consumedMeals >= ticketBook.totalMeals) {
      return res.status(400).json({ message: 'Tiquetera agotada' });
    }

    ticketBook.consumedMeals += 1;
    ticketBook.consumptions.push({ date: new Date(), notes: req.body.notes || '' });

    if (ticketBook.consumedMeals >= ticketBook.totalMeals) {
      ticketBook.isActive = false; // Agotada
    }

    await ticketBook.save();
    res.json(ticketBook);
  } catch (error) {
    next(error);
  }
};

exports.remove = async (req, res, next) => {
  try {
    const ticketBook = await TicketBook.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
    if (!ticketBook) return res.status(404).json({ message: 'Tiquetera no encontrada' });
    res.json({ message: 'Tiquetera desactivada' });
  } catch (error) {
    next(error);
  }
};
