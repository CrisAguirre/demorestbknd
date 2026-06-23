const router = require('express').Router();
const ctrl = require('../controllers/storefront.controller');

// Rutas públicas - no requieren autenticación
router.get('/products', ctrl.getProducts);
router.get('/categories', ctrl.getCategories);
router.get('/products/:id/availability', ctrl.checkAvailability);

module.exports = router;
