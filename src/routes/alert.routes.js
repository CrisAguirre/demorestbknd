const router = require('express').Router();
const ctrl = require('../controllers/alert.controller');
const authMiddleware = require('../middleware/auth.middleware');
const role = require('../middleware/role.middleware');

router.get('/', authMiddleware, role('admin'), ctrl.getAll);
router.patch('/:id/read', authMiddleware, role('admin'), ctrl.markAsRead);
router.patch('/read-all', authMiddleware, role('admin'), ctrl.markAllRead);
router.post('/check-stock', authMiddleware, role('admin'), ctrl.checkStockAlerts);

module.exports = router;
