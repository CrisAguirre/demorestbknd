// src/routes/finance.routes.js
const router = require('express').Router();
const ctrl   = require('../controllers/finance.controller');
const auth   = require('../middleware/auth.middleware');
const role   = require('../middleware/role.middleware');

router.get('/summary',    auth, role('admin'), ctrl.financialSummary);
router.get('/cashflow',   auth, role('admin'), ctrl.cashFlow);
router.get('/monthly-pl', auth, role('admin'), ctrl.monthlyPL);

module.exports = router;
