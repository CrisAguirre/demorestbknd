const express = require('express');

const router = express.Router();
const authMiddleware = require('../middleware/auth.middleware');
const role = require('../middleware/role.middleware');
const purchaseIngredientController = require('../controllers/purchaseIngredient.controller');

router.post('/', authMiddleware, role('admin', 'cajero'), purchaseIngredientController.create);
router.get('/', authMiddleware, role('admin', 'cajero'), purchaseIngredientController.getAll);
router.get('/:id', authMiddleware, role('admin', 'cajero'), purchaseIngredientController.getById);
router.put('/:id', authMiddleware, role('admin'), purchaseIngredientController.update);
router.delete('/:id', authMiddleware, role('admin'), purchaseIngredientController.delete);

module.exports = router;
