const router = require('express').Router();
const ctrl = require('../controllers/reservation.controller');
const authMiddleware = require('../middleware/auth.middleware');
const role = require('../middleware/role.middleware');

router.post('/', authMiddleware, role('admin', 'cajero', 'mesero'), ctrl.create);
router.get('/', authMiddleware, role('admin', 'cajero', 'mesero'), ctrl.getAll);
router.get('/:id', authMiddleware, role('admin', 'cajero', 'mesero'), ctrl.getOne);
router.patch('/:id/cancel', authMiddleware, role('admin', 'cajero', 'mesero'), ctrl.cancel);
router.patch('/:id/complete', authMiddleware, role('admin', 'cajero', 'mesero'), ctrl.complete);

module.exports = router;
