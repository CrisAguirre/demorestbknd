const router = require('express').Router();
const ctrl = require('../controllers/product.controller');
const authMiddleware = require('../middleware/auth.middleware');
const role = require('../middleware/role.middleware');

router.get('/', authMiddleware, ctrl.getAll);
router.get('/next-barcode', authMiddleware, ctrl.nextBarcode);
router.get('/all', authMiddleware, ctrl.getAllActive);
router.get('/:id', authMiddleware, ctrl.getById);
router.post('/', authMiddleware, role('admin'), ctrl.create);
router.put('/:id', authMiddleware, role('admin'), ctrl.update);
router.delete('/:id', authMiddleware, role('admin'), ctrl.remove);
router.patch('/:id/stock', authMiddleware, role('admin', 'cajero'), ctrl.updateStock);

module.exports = router;
