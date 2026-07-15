const router = require('express').Router();
const ctrl = require('../controllers/table.controller');
const authMiddleware = require('../middleware/auth.middleware');
const role = require('../middleware/role.middleware');

router.get('/', authMiddleware, ctrl.getAll);
router.patch('/:id/occupy', authMiddleware, role('admin', 'cajero'), ctrl.occupy);
router.patch('/:id/free', authMiddleware, role('admin', 'cajero'), ctrl.free);

module.exports = router;
