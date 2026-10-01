const Sale = require('../models/Sale');
const Purchase = require('../models/Purchase');
const Expense = require('../models/Expense');
const Product = require('../models/Product');
const Event = require('../models/Event');

function getRange(period) {
  const now = new Date();
  if (period === 'day') return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (period === 'week') return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  if (period === 'year') return new Date(now.getFullYear(), 0, 1);
  // month (default)
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

// ── 1. Estado Financiero del Mes ──────────────────────────────────────────────
// GET /api/finance/summary?period=month
exports.financialSummary = async (req, res, next) => {
  try {
    const { period = 'month' } = req.query;
    const startDate = getRange(period);

    // Ingresos por ventas (sin anuladas)
    const sales = await Sale.find({ createdAt: { $gte: startDate }, status: { $ne: 'cancelada' } });
    const saleRevenue = sales.reduce((s, sale) => s + sale.total, 0);

    // Ingresos por eventos
    const events = await Event.find({ 'payments.date': { $gte: startDate } });
    let eventRevenue = 0;
    let eventPaymentsCount = 0;
    events.forEach(ev => {
      ev.payments.forEach(p => {
        if (p.date >= startDate) { eventRevenue += p.amount; eventPaymentsCount += 1; }
      });
    });

    const totalRevenue = saleRevenue + eventRevenue;

    // Costo de ventas (COGS) = suma de (qty × purchasePrice) por ítem vendido
    const productIds = [...new Set(sales.flatMap(s => s.items.map(i => i.product?.toString())))];
    const products = await Product.find({ _id: { $in: productIds } }).select('purchasePrice');
    const costMap = Object.fromEntries(products.map(p => [p._id.toString(), p.purchasePrice]));

    const cogs = sales.reduce((acc, sale) => acc + sale.items.reduce((ia, item) => ia + item.quantity * (costMap[item.product?.toString()] ?? item.unitPrice), 0), 0);

    // Compras a proveedores
    const purchases = await Purchase.find({
      createdAt: { $gte: startDate },
      status: { $ne: 'anulada' }
    });
    const totalPurchases = purchases.reduce((s, p) => s + p.total, 0);

    // Gastos operativos
    const expenses = await Expense.find({ date: { $gte: startDate } });
    const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);

    // Agrupación de gastos por categoría
    const expenseByCategory = {};
    expenses.forEach(e => {
      if (!expenseByCategory[e.category]) expenseByCategory[e.category] = 0;
      expenseByCategory[e.category] += e.amount;
    });

    // KPIs contables
    const grossProfit = totalRevenue - cogs;
    const grossMargin = totalRevenue > 0 ? (grossProfit / totalRevenue * 100).toFixed(1) : 0;
    const operatingProfit = grossProfit - totalExpenses;
    const netProfit = operatingProfit; // sin impuestos modelados por ahora
    const netMargin = totalRevenue > 0 ? (netProfit / totalRevenue * 100).toFixed(1) : 0;

    // Tendencia diaria de ingresos, compras y gastos
    const dailySales = await Sale.aggregate([
      { $match: { createdAt: { $gte: startDate }, status: { $ne: 'cancelada' } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, revenue: { $sum: '$total' } } },
      { $sort: { _id: 1 } }
    ]);

    const dailyExpenses = await Expense.aggregate([
      { $match: { date: { $gte: startDate } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$date' } }, amount: { $sum: '$amount' } } },
      { $sort: { _id: 1 } }
    ]);

    const dailyPurchases = await Purchase.aggregate([
      { $match: { createdAt: { $gte: startDate }, status: { $ne: 'anulada' } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, amount: { $sum: '$total' } } },
      { $sort: { _id: 1 } }
    ]);

    const dailyEvents = await Event.aggregate([
      { $unwind: '$payments' },
      { $match: { 'payments.date': { $gte: startDate } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$payments.date' } }, revenue: { $sum: '$payments.amount' }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);

    res.json({
      period,
      startDate,
      // P&L
      totalRevenue,
      saleRevenue,
      eventRevenue,
      cogs,
      grossProfit,
      grossMargin: Number(grossMargin),
      totalExpenses,
      totalPurchases,
      operatingProfit,
      netProfit,
      netMargin: Number(netMargin),
      // Desglose
      expenseByCategory,
      salesCount: sales.length,
      eventPaymentsCount,
      purchasesCount: purchases.length,
      // Tendencias
      dailySales,
      dailyEvents,
      dailyExpenses,
      dailyPurchases
    });
  } catch (err) { next(err); }
};

// ── 2. Flujo de Caja (Cash Flow) ─────────────────────────────────────────────
// GET /api/finance/cashflow?period=month
exports.cashFlow = async (req, res, next) => {
  try {
    const { period = 'month' } = req.query;
    const startDate = getRange(period);

    const [salesData, eventsData, purchasesData, expensesData] = await Promise.all([
      Sale.aggregate([
        { $match: { createdAt: { $gte: startDate }, status: { $ne: 'cancelada' } } },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, inflow: { $sum: '$total' } } }
      ]),
      Event.aggregate([
        { $unwind: '$payments' },
        { $match: { 'payments.date': { $gte: startDate } } },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$payments.date' } }, inflow: { $sum: '$payments.amount' } } }
      ]),
      Purchase.aggregate([
        { $match: { createdAt: { $gte: startDate }, status: { $ne: 'anulada' } } },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, outflow: { $sum: '$total' } } }
      ]),
      Expense.aggregate([
        { $match: { date: { $gte: startDate } } },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$date' } }, outflow: { $sum: '$amount' } } }
      ])
    ]);

    // Combinar por fecha
    const dayMap = {};
    salesData.forEach(d => {
      dayMap[d._id] = { date: d._id, inflow: d.inflow, outflow: 0 };
    });
    eventsData.forEach(d => {
      if (!dayMap[d._id]) dayMap[d._id] = { date: d._id, inflow: 0, outflow: 0 };
      dayMap[d._id].inflow += d.inflow;
    });
    purchasesData.forEach(d => {
      if (!dayMap[d._id]) dayMap[d._id] = { date: d._id, inflow: 0, outflow: 0 };
      dayMap[d._id].outflow += d.outflow;
    });
    expensesData.forEach(d => {
      if (!dayMap[d._id]) dayMap[d._id] = { date: d._id, inflow: 0, outflow: 0 };
      dayMap[d._id].outflow += d.outflow;
    });

    const cashFlow = Object.values(dayMap).sort((a, b) => a.date.localeCompare(b.date)).map(d => ({
      ...d,
      net: d.inflow - d.outflow
    }));

    res.json(cashFlow);
  } catch (err) { next(err); }
};

// ── 4. Historial de ingresos (ventas + pagos de eventos) ─────────────────────
// GET /api/finance/income-history?from=2026-01-01&to=2026-12-31&limit=100
exports.incomeHistory = async (req, res, next) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 100, 500);
    const from = req.query.from ? new Date(req.query.from) : new Date(1970, 0, 1);
    const to = req.query.to ? new Date(req.query.to) : new Date();
    to.setHours(23, 59, 59, 999);

    const sales = await Sale.find({
      createdAt: { $gte: from, $lte: to },
      status: { $ne: 'cancelada' }
    }).select('createdAt total paymentMethod status customerName').lean();

    const events = await Event.find({ 'payments.date': { $gte: from, $lte: to } })
      .select('customerName theme eventType payments').lean();

    const rows = sales.map(s => ({
      tipo: 'venta',
      fecha: s.createdAt,
      referencia: s.customerName || 'Venta mostrador',
      detalle: `Estado: ${s.status}`,
      monto: s.total,
      metodo: s.paymentMethod || ''
    }));

    events.forEach(ev => {
      (ev.payments || []).forEach(p => {
        if (p.date < from || p.date > to) return;
        rows.push({
          tipo: ev.eventType === 'catering_externo' ? 'catering' : 'evento',
          fecha: p.date,
          referencia: ev.customerName || '',
          detalle: ev.theme || '',
          monto: p.amount,
          metodo: p.method || ''
        });
      });
    });

    rows.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
    const total = rows.reduce((s, r) => s + r.monto, 0);

    res.json({ from, to, count: rows.length, total, rows: rows.slice(0, limit) });
  } catch (err) { next(err); }
};

// ── 3. Cuenta de Resultados (P&L) por mes ────────────────────────────────────
// GET /api/finance/monthly-pl?months=6
exports.monthlyPL = async (req, res, next) => {
  try {
    const months = Math.min(Number(req.query.months) || 6, 12);
    const results = [];

    for (let i = months - 1; i >= 0; i--) {
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);

      const [salesAgg, expAgg, purAgg, evtAgg] = await Promise.all([
        Sale.aggregate([
          { $match: { createdAt: { $gte: start, $lte: end }, status: { $ne: 'cancelada' } } },
          { $group: { _id: null, revenue: { $sum: '$total' }, count: { $sum: 1 } } }
        ]),
        Expense.aggregate([
          { $match: { date: { $gte: start, $lte: end } } },
          { $group: { _id: null, total: { $sum: '$amount' } } }
        ]),
        Purchase.aggregate([
          { $match: { createdAt: { $gte: start, $lte: end }, status: { $ne: 'anulada' } } },
          { $group: { _id: null, total: { $sum: '$total' } } }
        ]),
        Event.aggregate([
          { $unwind: '$payments' },
          { $match: { 'payments.date': { $gte: start, $lte: end } } },
          { $group: { _id: null, revenue: { $sum: '$payments.amount' }, count: { $sum: 1 } } }
        ])
      ]);

      const revenue = (salesAgg[0]?.revenue || 0) + (evtAgg[0]?.revenue || 0);
      const eventRevenue = evtAgg[0]?.revenue || 0;
      const expenses = expAgg[0]?.total || 0;
      const purchases = purAgg[0]?.total || 0;
      const profit = revenue - expenses - purchases;

      results.push({
        month: start.toISOString().slice(0, 7),
        label: start.toLocaleString('es-CO', { month: 'short', year: '2-digit' }),
        revenue,
        eventRevenue,
        expenses,
        purchases,
        profit,
        salesCount: salesAgg[0]?.count || 0
      });
    }

    res.json(results);
  } catch (err) { next(err); }
};
