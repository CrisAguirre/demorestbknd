const Sale     = require('../models/Sale');
const Purchase = require('../models/Purchase');
const Expense  = require('../models/Expense');
const Product  = require('../models/Product');

function getRange(period) {
  const now = new Date();
  if (period === 'day')   return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (period === 'week')  return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  if (period === 'year')  return new Date(now.getFullYear(), 0, 1);
  // month (default)
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

// ── 1. Estado Financiero del Mes ──────────────────────────────────────────────
// GET /api/finance/summary?period=month
exports.financialSummary = async (req, res, next) => {
  try {
    const { period = 'month' } = req.query;
    const startDate = getRange(period);

    // Ingresos por ventas
    const sales = await Sale.find({ createdAt: { $gte: startDate } });
    const totalRevenue = sales.reduce((s, sale) => s + sale.total, 0);

    // Costo de ventas (COGS) = suma de (qty × purchasePrice) por ítem vendido
    const productIds = [...new Set(sales.flatMap(s => s.items.map(i => i.product?.toString())))];
    const products   = await Product.find({ _id: { $in: productIds } }).select('purchasePrice');
    const costMap    = Object.fromEntries(products.map(p => [p._id.toString(), p.purchasePrice]));

    const cogs = sales.reduce((acc, sale) =>
      acc + sale.items.reduce((ia, item) =>
        ia + item.quantity * (costMap[item.product?.toString()] ?? item.unitPrice), 0), 0);

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
    const grossProfit     = totalRevenue - cogs;
    const grossMargin     = totalRevenue > 0 ? (grossProfit / totalRevenue * 100).toFixed(1) : 0;
    const operatingProfit = grossProfit - totalExpenses;
    const netProfit       = operatingProfit;                 // sin impuestos modelados por ahora
    const netMargin       = totalRevenue > 0 ? (netProfit / totalRevenue * 100).toFixed(1) : 0;

    // Tendencia diaria de ingresos, compras y gastos
    const dailySales = await Sale.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
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

    res.json({
      period,
      startDate,
      // P&L
      totalRevenue,
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
      purchasesCount: purchases.length,
      // Tendencias
      dailySales,
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

    const [salesData, purchasesData, expensesData] = await Promise.all([
      Sale.aggregate([
        { $match: { createdAt: { $gte: startDate } } },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, inflow: { $sum: '$total' } } }
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

// ── 3. Cuenta de Resultados (P&L) por mes ────────────────────────────────────
// GET /api/finance/monthly-pl?months=6
exports.monthlyPL = async (req, res, next) => {
  try {
    const months = Math.min(Number(req.query.months) || 6, 12);
    const results = [];

    for (let i = months - 1; i >= 0; i--) {
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const end   = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);

      const [salesAgg, expAgg, purAgg] = await Promise.all([
        Sale.aggregate([
          { $match: { createdAt: { $gte: start, $lte: end } } },
          { $group: { _id: null, revenue: { $sum: '$total' }, count: { $sum: 1 } } }
        ]),
        Expense.aggregate([
          { $match: { date: { $gte: start, $lte: end } } },
          { $group: { _id: null, total: { $sum: '$amount' } } }
        ]),
        Purchase.aggregate([
          { $match: { createdAt: { $gte: start, $lte: end }, status: { $ne: 'anulada' } } },
          { $group: { _id: null, total: { $sum: '$total' } } }
        ])
      ]);

      const revenue  = salesAgg[0]?.revenue  || 0;
      const expenses = expAgg[0]?.total      || 0;
      const purchases = purAgg[0]?.total     || 0;
      const profit   = revenue - expenses - purchases;

      results.push({
        month: start.toISOString().slice(0, 7),
        label: start.toLocaleString('es-CO', { month: 'short', year: '2-digit' }),
        revenue,
        expenses,
        purchases,
        profit,
        salesCount: salesAgg[0]?.count || 0
      });
    }

    res.json(results);
  } catch (err) { next(err); }
};
