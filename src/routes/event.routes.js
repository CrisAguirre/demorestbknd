const router = require('express').Router();
const ctrl = require('../controllers/event.controller');
const authMiddleware = require('../middleware/auth.middleware');
const role = require('../middleware/role.middleware');

router.get('/', authMiddleware, ctrl.getAll);
router.get('/:id', authMiddleware, ctrl.getById);
router.post('/', authMiddleware, role('admin', 'cajero'), ctrl.create);
router.put('/:id', authMiddleware, role('admin', 'cajero'), ctrl.update);
router.delete('/:id', authMiddleware, role('admin'), ctrl.delete);
router.post('/:id/payment', authMiddleware, role('admin', 'cajero'), ctrl.addPayment);
router.post('/:id/milestones', authMiddleware, role('admin', 'cajero'), ctrl.addMilestone);
router.delete('/:id/milestones/:mid', authMiddleware, role('admin', 'cajero'), ctrl.removeMilestone);

module.exports = router;
