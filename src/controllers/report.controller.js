const Sale = require('../models/Sale');
const Product = require('../models/Product');
const KitchenOrder = require('../models/KitchenOrder');

// Helper: build start date from period
function getStartDate(period) {
  const now = new Date();
  if (period === 'day') return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (period === 'week') return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  if (period === 'year') return new Date(now.getFullYear(), 0, 1);
  // default: month
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

// ── 1. Sales Summary (KPIs + daily trend) ──
exports.salesSummary = async (req, res, next) => {
  try {
    const { period = 'day' } = req.query;
    const startDate = getStartDate(period);

    const sales = await Sale.find({ createdAt: { $gte: startDate }, status: { $ne: 'cancelada' } });
    const totalRevenue = sales.reduce((sum, s) => sum + s.total, 0);
    const totalTransactions = sales.length;
    const averageTicket = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;

    // Daily trend
    const salesByDay = await Sale.aggregate([
      { $match: { createdAt: { $gte: startDate }, status: { $ne: 'cancelada' } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          total: { $sum: '$total' },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Total items sold
    const totalItems = sales.reduce((sum, s) => sum + s.items.reduce((is, i) => is + i.quantity, 0), 0);

    res.json({ totalRevenue, totalTransactions, averageTicket, salesByDay, totalItems, period });
  } catch (error) {
    next(error);
  }
};

// ── 2. Top Products ──
exports.topProducts = async (req, res, next) => {
  try {
    const { limit = 10 } = req.query;
    const topProducts = await Sale.aggregate([
      { $match: { status: { $ne: 'cancelada' } } },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.product',
          name: { $first: '$items.productName' },
          totalQuantity: { $sum: '$items.quantity' },
          totalRevenue: { $sum: '$items.subtotal' }
        }
      },
      { $sort: { totalQuantity: -1 } },
      { $limit: Number(limit) }
    ]);
    res.json(topProducts);
  } catch (error) {
    next(error);
  }
};

// ── 3. Low Rotation ──
exports.lowRotation = async (req, res, next) => {
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const soldProductIds = await Sale.aggregate([
      { $match: { createdAt: { $gte: thirtyDaysAgo }, status: { $ne: 'cancelada' } } },
      { $unwind: '$items' },
      { $group: { _id: '$items.product' } }
    ]);
    const soldIds = soldProductIds.map(p => p._id);

    const stagnant = await Product.find({
      isActive: true,
      _id: { $nin: soldIds }
    }).populate('category', 'name').sort({ stock: -1 });

    res.json(stagnant);
  } catch (error) {
    next(error);
  }
};

// ── 4. Sales by Category ──
exports.salesByCategory = async (req, res, next) => {
  try {
    const { period = 'month' } = req.query;
    const startDate = getStartDate(period);

    // Get all products with their categories
    const products = await Product.find({}).populate('category', 'name icon');
    const productCategoryMap = {};
    products.forEach(p => {
      productCategoryMap[p._id.toString()] = p.category ? { name: p.category.name, icon: p.category.icon } : { name: 'Sin categoría', icon: '📦' };
    });

    const salesData = await Sale.aggregate([
      { $match: { createdAt: { $gte: startDate }, status: { $ne: 'cancelada' } } },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.product',
          totalRevenue: { $sum: '$items.subtotal' },
          totalQuantity: { $sum: '$items.quantity' }
        }
      }
    ]);

    // Agrupar por categoría
    const categoryMap = {};
    salesData.forEach(item => {
      const cat = productCategoryMap[item._id?.toString()] || { name: 'Otros', icon: '📦' };
      if (!categoryMap[cat.name]) {
        categoryMap[cat.name] = { name: cat.name, icon: cat.icon, revenue: 0, quantity: 0 };
      }
      categoryMap[cat.name].revenue += item.totalRevenue;
      categoryMap[cat.name].quantity += item.totalQuantity;
    });

    const result = Object.values(categoryMap).sort((a, b) => b.revenue - a.revenue);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

// ── 5. Sales by Payment Method ──
exports.salesByPaymentMethod = async (req, res, next) => {
  try {
    const { period = 'month' } = req.query;
    const startDate = getStartDate(period);

    const data = await Sale.aggregate([
      { $match: { createdAt: { $gte: startDate }, status: { $ne: 'cancelada' } } },
      {
        $group: {
          _id: '$paymentMethod',
          totalRevenue: { $sum: '$total' },
          count: { $sum: 1 }
        }
      },
      { $sort: { totalRevenue: -1 } }
    ]);

    res.json(data);
  } catch (error) {
    next(error);
  }
};

// ── 6. Sales by Hour (peak hours) ──
exports.salesByHour = async (req, res, next) => {
  try {
    const { period = 'month' } = req.query;
    const startDate = getStartDate(period);

    const data = await Sale.aggregate([
      { $match: { createdAt: { $gte: startDate }, status: { $ne: 'cancelada' } } },
      {
        $group: {
          _id: { $hour: '$createdAt' },
          totalRevenue: { $sum: '$total' },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Fill all 24 hours
    const hourlyData = [];
    for (let h = 0; h < 24; h++) {
      const found = data.find(d => d._id === h);
      hourlyData.push({
        hour: h,
        label: `${h.toString().padStart(2, '0')}:00`,
        totalRevenue: found ? found.totalRevenue : 0,
        count: found ? found.count : 0
      });
    }

    res.json(hourlyData);
  } catch (error) {
    next(error);
  }
};

// ── 7. Inventory Valuation ──
exports.inventoryValuation = async (req, res, next) => {
  try {
    const products = await Product.find({ isActive: true }).populate('category', 'name');

    let totalCostValue = 0;
    let totalSaleValue = 0;
    const totalProducts = products.length;
    let totalUnits = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;

    const categoryValuation = {};

    products.forEach(p => {
      const costValue = p.stock * p.purchasePrice;
      const saleValue = p.stock * p.salePrice;
      totalCostValue += costValue;
      totalSaleValue += saleValue;
      totalUnits += p.stock;
      if (p.stock === 0) outOfStockCount++;
      else if (p.stock <= p.minStock) lowStockCount++;

      const catName = p.category?.name || 'Sin categoría';
      if (!categoryValuation[catName]) {
        categoryValuation[catName] = { name: catName, costValue: 0, saleValue: 0, units: 0 };
      }
      categoryValuation[catName].costValue += costValue;
      categoryValuation[catName].saleValue += saleValue;
      categoryValuation[catName].units += p.stock;
    });

    const potentialProfit = totalSaleValue - totalCostValue;
    const marginPercent = totalCostValue > 0 ? ((potentialProfit / totalCostValue) * 100).toFixed(1) : 0;

    res.json({
      totalProducts,
      totalUnits,
      totalCostValue,
      totalSaleValue,
      potentialProfit,
      marginPercent,
      lowStockCount,
      outOfStockCount,
      byCategory: Object.values(categoryValuation).sort((a, b) => b.saleValue - a.saleValue)
    });
  } catch (error) {
    next(error);
  }
};

// ── 8. Profit Margin by Product ──
exports.profitMargins = async (req, res, next) => {
  try {
    const products = await Product.find({ isActive: true }).select('name purchasePrice salePrice stock category').populate('category', 'name');

    const margins = products.map(p => {
      const margin = p.salePrice - p.purchasePrice;
      const marginPercent = p.purchasePrice > 0 ? ((margin / p.purchasePrice) * 100).toFixed(1) : 0;
      return {
        _id: p._id,
        name: p.name,
        category: p.category?.name || 'Sin categoría',
        purchasePrice: p.purchasePrice,
        salePrice: p.salePrice,
        margin,
        marginPercent: Number(marginPercent),
        stock: p.stock,
        potentialProfit: margin * p.stock
      };
    }).sort((a, b) => b.marginPercent - a.marginPercent);

    res.json(margins);
  } catch (error) {
    next(error);
  }
};

// Preparation Times
exports.preparationTimes = async (req, res, next) => {
  try {
    const { period = 'month', cookId } = req.query;
    const startDate = getStartDate(period);

    const match = { createdAt: { $gte: startDate }, status: { $in: ['entregado', 'pagado'] } };
    if (cookId) match.assignedCook = cookId;

    const orders = await KitchenOrder.find(match)
      .populate('assignedCook', 'name')
      .sort({ createdAt: -1 })
      .lean();

    const times = orders.map(o => {
      const getTs = (state) => o.stateHistory?.find(h => h.state === state)?.timestamp;
      const nuevo = getTs('nuevo') || o.createdAt;
      const preparacion = getTs('en_preparacion');
      const entregado = getTs('entregado');

      return {
        _id: o._id,
        tableNumber: o.tableNumber,
        items: o.items.length,
        cook: o.assignedCook?.name || 'N/A',
        acceptanceTime: preparacion ? (new Date(preparacion) - new Date(nuevo)) / 60000 : null,
        prepTime: entregado && preparacion ? (new Date(entregado) - new Date(preparacion)) / 60000 : null,
        totalTime: entregado ? (new Date(entregado) - new Date(nuevo)) / 60000 : null,
        createdAt: o.createdAt
      };
    });

    const completed = times.filter(t => t.totalTime !== null);
    const avgAcceptance = completed.reduce((s, t) => s + (t.acceptanceTime || 0), 0) / (completed.length || 1);
    const avgPrep = completed.reduce((s, t) => s + (t.prepTime || 0), 0) / (completed.length || 1);
    const avgTotal = completed.reduce((s, t) => s + t.totalTime, 0) / (completed.length || 1);

    const byCook = {};
    completed.forEach(t => {
      if (!byCook[t.cook]) byCook[t.cook] = { cook: t.cook, orders: 0, totalPrep: 0 };
      byCook[t.cook].orders++;
      byCook[t.cook].totalPrep += t.prepTime || 0;
    });
    const cookStats = Object.values(byCook).map(c => ({
      ...c,
      avgPrepTime: c.orders > 0 ? (c.totalPrep / c.orders).toFixed(1) : 0
    })).sort((a, b) => a.avgPrepTime - b.avgPrepTime);

    res.json({
      period,
      totalCompleted: completed.length,
      totalOrders: orders.length,
      avgAcceptanceMin: avgAcceptance.toFixed(1),
      avgPrepMin: avgPrep.toFixed(1),
      avgTotalMin: avgTotal.toFixed(1),
      byCook: cookStats,
      orders: times.slice(0, 50)
    });
  } catch (error) {
    next(error);
  }
};

// ── 10. CSV Exports ──

function escapeCSV(val) {
  if (val === null || val === undefined) return '';
  const s = String(val);
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function toCSV(rows, columns) {
  const header = columns.map(c => escapeCSV(c.label)).join(',');
  const body = rows.map(row => columns.map(c => escapeCSV(row[c.key])).join(',')).join('\n');
  return `${header}\n${body}`;
}

exports.exportSalesSummaryCSV = async (req, res, next) => {
  try {
    const { period = 'month' } = req.query;
    const startDate = getStartDate(period);
    const sales = await Sale.find({ createdAt: { $gte: startDate }, status: { $ne: 'cancelada' } }).sort({ createdAt: -1 }).lean();

    const rows = sales.map(s => ({
      date: s.createdAt ? s.createdAt.toISOString().split('T')[0] : '',
      time: s.createdAt ? s.createdAt.toTimeString().split(' ')[0] : '',
      id: s._id.toString(),
      customer: s.customerName || '',
      payment: s.paymentMethod || '',
      items: s.items.reduce((sum, i) => sum + i.quantity, 0),
      total: s.total || 0
    }));

    const columns = [
      { key: 'date', label: 'Fecha' },
      { key: 'time', label: 'Hora' },
      { key: 'id', label: 'ID Venta' },
      { key: 'customer', label: 'Cliente' },
      { key: 'payment', label: 'Método Pago' },
      { key: 'items', label: 'Items' },
      { key: 'total', label: 'Total' }
    ];

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=ventas-${period}-${new Date().toISOString().split('T')[0]}.csv`);
    res.send(`\uFEFF${toCSV(rows, columns)}`);
  } catch (error) { next(error); }
};

exports.exportTopProductsCSV = async (req, res, next) => {
  try {
    const topProducts = await Sale.aggregate([
      { $match: { status: { $ne: 'cancelada' } } },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.product',
          name: { $first: '$items.productName' },
          totalQuantity: { $sum: '$items.quantity' },
          totalRevenue: { $sum: '$items.subtotal' }
        }
      },
      { $sort: { totalQuantity: -1 } },
      { $limit: 50 }
    ]);

    const columns = [
      { key: 'name', label: 'Producto' },
      { key: 'totalQuantity', label: 'Unidades Vendidas' },
      { key: 'totalRevenue', label: 'Ingresos' }
    ];

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=top-productos-${new Date().toISOString().split('T')[0]}.csv`);
    res.send(`\uFEFF${toCSV(topProducts, columns)}`);
  } catch (error) { next(error); }
};

exports.exportInventoryCSV = async (req, res, next) => {
  try {
    const products = await Product.find({ isActive: true }).populate('category', 'name').lean();

    const rows = products.map(p => ({
      name: p.name,
      category: p.category?.name || 'Sin categoría',
      stock: p.stock,
      minStock: p.minStock,
      purchasePrice: p.purchasePrice,
      salePrice: p.salePrice,
      margin: p.salePrice - p.purchasePrice,
      marginPct: p.purchasePrice > 0 ? (((p.salePrice - p.purchasePrice) / p.purchasePrice) * 100).toFixed(1) : 0,
      stockValue: p.stock * p.purchasePrice,
      saleValue: p.stock * p.salePrice,
      status: p.stock === 0 ? 'AGOTADO' : p.stock <= p.minStock ? 'BAJO' : 'OK'
    }));

    const columns = [
      { key: 'name', label: 'Producto' },
      { key: 'category', label: 'Categoría' },
      { key: 'stock', label: 'Stock' },
      { key: 'minStock', label: 'Stock Mínimo' },
      { key: 'purchasePrice', label: 'Precio Compra' },
      { key: 'salePrice', label: 'Precio Venta' },
      { key: 'margin', label: 'Margen' },
      { key: 'marginPct', label: 'Margen %' },
      { key: 'stockValue', label: 'Valor Inventario' },
      { key: 'saleValue', label: 'Valor Venta Potencial' },
      { key: 'status', label: 'Estado' }
    ];

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=inventario-${new Date().toISOString().split('T')[0]}.csv`);
    res.send(`\uFEFF${toCSV(rows, columns)}`);
  } catch (error) { next(error); }
};
