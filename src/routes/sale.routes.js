const router = require('express').Router();
const ctrl = require('../controllers/sale.controller');
const authMiddleware = require('../middleware/auth.middleware');
const role = require('../middleware/role.middleware');

router.post('/', authMiddleware, role('admin', 'cajero'), ctrl.create);
router.get('/', authMiddleware, role('admin'), ctrl.getAll);
router.get('/:id', authMiddleware, ctrl.getById);

module.exports = router;
