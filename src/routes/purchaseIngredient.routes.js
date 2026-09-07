const express = require('express');

const router = express.Router();
const { verifyToken, requireRole } = require('../middleware/auth.middleware');
const purchaseIngredientController = require('../controllers/purchaseIngredient.controller');

router.use(verifyToken);

router.post('/', requireRole('admin', 'cajero'), purchaseIngredientController.create);
router.get('/', requireRole('admin', 'cajero'), purchaseIngredientController.getAll);
router.get('/:id', requireRole('admin', 'cajero'), purchaseIngredientController.getById);
router.put('/:id', requireRole('admin'), purchaseIngredientController.update);
router.delete('/:id', requireRole('admin'), purchaseIngredientController.delete);

module.exports = router;
