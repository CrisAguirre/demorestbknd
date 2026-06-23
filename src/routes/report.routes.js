const router = require('express').Router();
const ctrl = require('../controllers/report.controller');
const authMiddleware = require('../middleware/auth.middleware');
const role = require('../middleware/role.middleware');

router.get('/sales-summary', authMiddleware, role('admin'), ctrl.salesSummary);
router.get('/top-products', authMiddleware, role('admin'), ctrl.topProducts);
router.get('/low-rotation', authMiddleware, role('admin'), ctrl.lowRotation);
router.get('/sales-by-category', authMiddleware, role('admin'), ctrl.salesByCategory);
router.get('/sales-by-payment', authMiddleware, role('admin'), ctrl.salesByPaymentMethod);
router.get('/sales-by-hour', authMiddleware, role('admin'), ctrl.salesByHour);
router.get('/inventory-valuation', authMiddleware, role('admin'), ctrl.inventoryValuation);
router.get('/profit-margins', authMiddleware, role('admin'), ctrl.profitMargins);

module.exports = router;
