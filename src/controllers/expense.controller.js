const Expense = require('../models/Expense');
const { EXPENSE_CATEGORIES } = require('../models/Expense');

// GET /api/expenses/categories  — lista de categorías válidas
exports.getCategories = (req, res) => {
  const labels = {
    arriendo: 'Arriendo',
    servicios_publicos: 'Servicios Públicos',
    nomina: 'Nómina / Salarios',
    mantenimiento_reparaciones: 'Mantenimiento y Reparaciones',
    insumos_aseo: 'Insumos de Aseo',
    papeleria_oficina: 'Papelería y Oficina',
    transporte_logistica: 'Transporte y Logística',
    publicidad_marketing: 'Publicidad y Marketing',
    impuestos_tasas: 'Impuestos y Tasas',
    otros: 'Otros'
  };
  res.json(EXPENSE_CATEGORIES.map(c => ({ value: c, label: labels[c] || c })));
};

// GET /api/expenses
exports.getAll = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, category, from, to } = req.query;
    const filter = {};
    if (category) filter.category = category;
    if (from || to) {
      filter.date = {};
      if (from) filter.date.$gte = new Date(from);
      if (to)   filter.date.$lte = new Date(to + 'T23:59:59');
    }

    const [expenses, total] = await Promise.all([
      Expense.find(filter)
        .populate('user', 'name')
        .populate('supplier', 'name')
        .sort({ date: -1 })
        .skip((page - 1) * limit)
        .limit(Number(limit)),
      Expense.countDocuments(filter)
    ]);

    res.json({ expenses, total, page: Number(page), pages: Math.ceil(total / limit) });
  } catch (err) { next(err); }
};

// POST /api/expenses
exports.create = async (req, res, next) => {
  try {
    const expense = new Expense({ ...req.body, user: req.user._id });
    await expense.save();
    await expense.populate('user', 'name');
    res.status(201).json(expense);
  } catch (err) { next(err); }
};

// PUT /api/expenses/:id
exports.update = async (req, res, next) => {
  try {
    const expense = await Expense.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('user', 'name');
    if (!expense) return res.status(404).json({ message: 'Gasto no encontrado' });
    res.json(expense);
  } catch (err) { next(err); }
};

// DELETE /api/expenses/:id
exports.remove = async (req, res, next) => {
  try {
    const expense = await Expense.findByIdAndDelete(req.params.id);
    if (!expense) return res.status(404).json({ message: 'Gasto no encontrado' });
    res.json({ message: 'Gasto eliminado' });
  } catch (err) { next(err); }
};
