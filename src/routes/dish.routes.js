const router = require('express').Router();
const ctrl = require('../controllers/dish.controller');
const authMiddleware = require('../middleware/auth.middleware');
const role = require('../middleware/role.middleware');

router.get('/', authMiddleware, ctrl.getAll);
router.post('/', authMiddleware, role('admin'), ctrl.create);
router.put('/:id', authMiddleware, role('admin'), ctrl.update);
router.delete('/:id', authMiddleware, role('admin'), ctrl.remove);

router.get('/:id/recipe-cost', authMiddleware, ctrl.getRecipeCost);
router.get('/:id/availability', authMiddleware, ctrl.checkAvailability);
router.post('/batch-availability', authMiddleware, ctrl.batchCheckAvailability);

module.exports = router;
