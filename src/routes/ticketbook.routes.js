const router = require('express').Router();
const ctrl = require('../controllers/ticketbook.controller');
const authMiddleware = require('../middleware/auth.middleware');
const role = require('../middleware/role.middleware');

router.get('/', authMiddleware, ctrl.getAll);
router.post('/', authMiddleware, role('admin'), ctrl.create);
router.put('/:id', authMiddleware, role('admin'), ctrl.update);
router.post('/:id/consume', authMiddleware, ctrl.consume);
router.delete('/:id', authMiddleware, role('admin'), ctrl.remove);

module.exports = router;
