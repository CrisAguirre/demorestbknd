/**
 * preload.controller.js
 *
 * Single endpoint that fires all common queries in parallel and returns
 * everything the frontend needs right after login — in ONE round trip.
 *
 * Response shape mirrors each individual endpoint exactly, so the
 * frontend cache can transparently serve the data to every component.
 */

const Sale     = require('../models/Sale');
const Product  = require('../models/Product');
const Category = require('../models/Category');
const Alert    = require('../models/Alert');
const CashClosing = require('../models/CashClosing');
const Settings = require('../models/Settings');

// ── helpers (replicated from report.controller to avoid circular deps) ──────
function getStartDate(period) {
  const now = new Date();
  if (period === 'day')  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (period === 'week') return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

async function buildSalesSummary(period) {
  const startDate = getStartDate(period);
  const [sales, salesByDay] = await Promise.all([
    Sale.find({ createdAt: { $gte: startDate } }).lean(),
    Sale.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          total: { $sum: '$total' },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ])
  ]);

  const totalRevenue      = sales.reduce((s, x) => s + x.total, 0);
  const totalTransactions = sales.length;
  const averageTicket     = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;
  const totalItems        = sales.reduce((s, x) => s + x.items.reduce((is, i) => is + i.quantity, 0), 0);

  return { totalRevenue, totalTransactions, averageTicket, salesByDay, totalItems, period };
}

async function buildCurrentCash() {
  const current = await CashClosing.findOne({ status: 'abierta' }).populate('user', 'name').lean();
  if (!current) return { open: false, message: 'No hay caja abierta' };

  const sales = await Sale.find({ createdAt: { $gte: current.openedAt } }).lean();
  const totalSales = sales.reduce((s, x) => s + x.total, 0);
  return {
    open: true,
    cashClosing: current,
    currentTotalSales: totalSales,
    currentTransactions: sales.length
  };
}

// ── Main handler ─────────────────────────────────────────────────────────────
exports.preload = async (req, res, next) => {
  try {
    const [
      settings,
      categories,
      productsResult,
      alertsResult,
      salesDay,
      salesWeek,
      topProducts,
      currentCash
    ] = await Promise.all([
      // 1. Settings
      Settings.getSettings(),

      // 2. Categories (active only, ordered)
      Category.find({ isActive: true }).sort({ order: 1 }).lean(),

      // 3. Products for POS (active, up to 200) — same params POS uses
      (async () => {
        const [products, total] = await Promise.all([
          Product.find({ isActive: true })
            .populate('category', 'name icon')
            .sort({ name: 1 })
            .limit(200)
            .lean(),
          Product.countDocuments({ isActive: true })
        ]);
        return { products, total, page: 1, pages: Math.ceil(total / 200) };
      })(),

      // 4. Unread alerts (same filter as navbar badge)
      (async () => {
        const [alerts, total, unread] = await Promise.all([
          Alert.find({ read: false })
            .populate('product', 'name stock minStock')
            .sort({ createdAt: -1 })
            .limit(30)
            .lean(),
          Alert.countDocuments({ read: false }),
          Alert.countDocuments({ read: false })
        ]);
        return { alerts, total, unread, page: 1 };
      })(),

      // 5. Sales summary — today
      buildSalesSummary('day'),

      // 6. Sales summary — this week
      buildSalesSummary('week'),

      // 7. Top 5 products
      Sale.aggregate([
        { $unwind: '$items' },
        {
          $group: {
            _id: '$items.product',
            name: { $first: '$items.productName' },
            totalQuantity: { $sum: '$items.quantity' },
            totalRevenue:  { $sum: '$items.subtotal' }
          }
        },
        { $sort: { totalQuantity: -1 } },
        { $limit: 5 }
      ]),

      // 8. Current cash status
      buildCurrentCash()
    ]);

    res.json({
      settings,
      categories,
      products: productsResult,
      alerts:   alertsResult,
      salesDay,
      salesWeek,
      topProducts,
      currentCash
    });
  } catch (error) {
    next(error);
  }
};
