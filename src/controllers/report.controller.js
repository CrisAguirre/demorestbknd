const Sale = require('../models/Sale');
const Product = require('../models/Product');
const Category = require('../models/Category');

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

    const sales = await Sale.find({ createdAt: { $gte: startDate } });
    const totalRevenue = sales.reduce((sum, s) => sum + s.total, 0);
    const totalTransactions = sales.length;
    const averageTicket = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;

    // Daily trend
    const salesByDay = await Sale.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
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
      { $match: { createdAt: { $gte: thirtyDaysAgo } } },
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
      { $match: { createdAt: { $gte: startDate } } },
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
      { $match: { createdAt: { $gte: startDate } } },
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
      { $match: { createdAt: { $gte: startDate } } },
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
    let totalProducts = products.length;
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
