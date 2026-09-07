const router = require('express').Router();
const ctrl = require('../controllers/ingredient.controller');
const authMiddleware = require('../middleware/auth.middleware');
const role = require('../middleware/role.middleware');

router.get('/', authMiddleware, ctrl.getAll);
router.post('/', authMiddleware, role('admin'), ctrl.create);
router.put('/:id', authMiddleware, role('admin'), ctrl.update);
router.delete('/:id', authMiddleware, role('admin'), ctrl.remove);

router.post('/:id/restock', authMiddleware, role('admin', 'cajero'), ctrl.restock);
router.put('/:id/adjust-stock', authMiddleware, role('admin'), ctrl.adjustStock);
router.get('/:id/movements', authMiddleware, ctrl.getMovementHistory);
router.get('/:id/dishes', authMiddleware, ctrl.getDishesUsingIngredient);

module.exports = router;
