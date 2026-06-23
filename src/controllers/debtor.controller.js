const Debtor = require('../models/Debtor');
const Alert  = require('../models/Alert');

// ── GET /api/debtors ────────────────────────────────────────────────────────
exports.getAll = async (req, res, next) => {
  try {
    const { search, active, status } = req.query;
    const filter = {};
    if (active !== undefined) filter.isActive = active === 'true';
    if (search) filter.$text = { $search: search };

    let debtors = await Debtor.find(filter)
      .select('-transactions')          // Exclude heavy array on listing
      .sort({ createdAt: -1 });

    // Filter by mora status client-side (> 30 days without payment)
    if (status === 'mora') {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      debtors = debtors.filter(d =>
        d.totalDebt > 0 &&
        (!d.lastPaymentDate || d.lastPaymentDate < thirtyDaysAgo)
      );
    }

    res.json(debtors);
  } catch (err) { next(err); }
};

// ── GET /api/debtors/next-code ──────────────────────────────────────────────
exports.getNextCode = async (req, res, next) => {
  try {
    const all = await Debtor.find({}, 'code');
    let maxNum = 0;
    all.forEach(d => {
      // Code format: DEU-001, DEU-002 ...
      const match = d.code.match(/DEU-(\d+)/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNum) maxNum = num;
      }
    });
    const nextCode = 'DEU-' + (maxNum + 1).toString().padStart(3, '0');
    res.json({ nextCode });
  } catch (err) { next(err); }
};

// ── GET /api/debtors/:id ────────────────────────────────────────────────────
exports.getOne = async (req, res, next) => {
  try {
    const debtor = await Debtor.findById(req.params.id);
    if (!debtor) return res.status(404).json({ message: 'Deudor no encontrado' });
    res.json(debtor);
  } catch (err) { next(err); }
};

// ── POST /api/debtors ───────────────────────────────────────────────────────
exports.create = async (req, res, next) => {
  try {
    // Auto-generate code
    const all = await Debtor.find({}, 'code');
    let maxNum = 0;
    all.forEach(d => {
      const match = d.code.match(/DEU-(\d+)/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNum) maxNum = num;
      }
    });
    req.body.code = 'DEU-' + (maxNum + 1).toString().padStart(3, '0');

    // If initial debt, add as first transaction
    const initialDebt = Number(req.body.totalDebt) || 0;
    if (initialDebt > 0) {
      req.body.transactions = [{
        type: 'nueva_deuda',
        amount: initialDebt,
        balanceBefore: 0,
        balanceAfter: initialDebt,
        notes: 'Deuda inicial al registrar deudor'
      }];
    }

    const debtor = new Debtor(req.body);
    await debtor.save();
    res.status(201).json(debtor);
  } catch (err) { next(err); }
};

// ── PUT /api/debtors/:id ────────────────────────────────────────────────────
exports.update = async (req, res, next) => {
  try {
    // Only allow updating basic info, not transactions or debt
    const { name, address, phone, creditLimit, isActive } = req.body;
    const update = {};
    if (name !== undefined) update.name = name;
    if (address !== undefined) update.address = address;
    if (phone !== undefined) update.phone = phone;
    if (creditLimit !== undefined) update.creditLimit = creditLimit;
    if (isActive !== undefined) update.isActive = isActive;

    const debtor = await Debtor.findByIdAndUpdate(
      req.params.id, update, { new: true, runValidators: true }
    );
    if (!debtor) return res.status(404).json({ message: 'Deudor no encontrado' });
    res.json(debtor);
  } catch (err) { next(err); }
};

// ── DELETE /api/debtors/:id  (soft-delete) ──────────────────────────────────
exports.remove = async (req, res, next) => {
  try {
    const debtor = await Debtor.findByIdAndUpdate(
      req.params.id, { isActive: false }, { new: true }
    );
    if (!debtor) return res.status(404).json({ message: 'Deudor no encontrado' });
    res.json({ message: 'Deudor desactivado', debtor });
  } catch (err) { next(err); }
};

// ── POST /api/debtors/:id/transactions ──────────────────────────────────────
// Types: abono, pago_completo, aumento_credito, nueva_deuda
exports.addTransaction = async (req, res, next) => {
  try {
    const debtor = await Debtor.findById(req.params.id);
    if (!debtor) return res.status(404).json({ message: 'Deudor no encontrado' });

    const { type, amount, notes } = req.body;
    if (!type || amount === undefined || amount === null) {
      return res.status(400).json({ message: 'Tipo y monto son requeridos' });
    }

    const balanceBefore = debtor.totalDebt;
    let balanceAfter = balanceBefore;

    switch (type) {
      case 'abono':
        if (amount <= 0) return res.status(400).json({ message: 'El abono debe ser mayor a 0' });
        if (amount > balanceBefore) return res.status(400).json({ message: 'El abono no puede superar la deuda actual' });
        balanceAfter = balanceBefore - amount;
        debtor.lastPaymentDate = new Date();
        break;

      case 'pago_completo':
        balanceAfter = 0;
        debtor.lastPaymentDate = new Date();
        break;

      case 'aumento_credito':
        if (amount <= 0) return res.status(400).json({ message: 'El monto debe ser mayor a 0' });
        balanceAfter = balanceBefore + amount;
        break;

      case 'nueva_deuda':
        if (amount <= 0) return res.status(400).json({ message: 'El monto debe ser mayor a 0' });
        balanceAfter = balanceBefore + amount;
        break;

      default:
        return res.status(400).json({ message: 'Tipo de transacción no válido' });
    }

    const transaction = {
      type,
      amount: type === 'pago_completo' ? balanceBefore : amount,
      balanceBefore,
      balanceAfter,
      notes: notes || ''
    };

    debtor.transactions.push(transaction);
    debtor.totalDebt = balanceAfter;
    await debtor.save();

    res.status(201).json(debtor);
  } catch (err) { next(err); }
};

// ── GET /api/debtors/:id/transactions ───────────────────────────────────────
exports.getTransactions = async (req, res, next) => {
  try {
    const debtor = await Debtor.findById(req.params.id).select('transactions name code');
    if (!debtor) return res.status(404).json({ message: 'Deudor no encontrado' });
    // Return transactions sorted newest first
    const sorted = debtor.transactions.sort((a, b) =>
      new Date(b.createdAt) - new Date(a.createdAt)
    );
    res.json({ transactions: sorted, name: debtor.name, code: debtor.code });
  } catch (err) { next(err); }
};

// ── POST /api/debtors/check-mora ────────────────────────────────────────────
// Generates a single Alert if there are debtors with > 30 days overdue
exports.checkMora = async (req, res, next) => {
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const overdueDebtors = await Debtor.find({
      isActive: true,
      totalDebt: { $gt: 0 },
      $or: [
        { lastPaymentDate: { $lt: thirtyDaysAgo } },
        { lastPaymentDate: null }
      ]
    }).select('name code totalDebt lastPaymentDate createdAt');

    // Only count those created more than 30 days ago (or with lastPayment > 30 days)
    const truly = overdueDebtors.filter(d => {
      const refDate = d.lastPaymentDate || d.createdAt;
      return refDate < thirtyDaysAgo;
    });

    if (truly.length > 0) {
      // Check if an unread alert of this type already exists
      const existing = await Alert.findOne({ type: 'deudor_mora', read: false });
      if (!existing) {
        await Alert.create({
          type: 'deudor_mora',
          message: `Hay ${truly.length} deudor(es) con más de 30 días de mora. Revisa el módulo de Deudores.`,
          priority: 'alta'
        });
      }
    }

    res.json({ overdueCount: truly.length, debtors: truly });
  } catch (err) { next(err); }
};
