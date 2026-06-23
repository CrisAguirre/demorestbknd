// src/routes/debtor.routes.js
const router = require('express').Router();
const ctrl   = require('../controllers/debtor.controller');
const auth   = require('../middleware/auth.middleware');
const role   = require('../middleware/role.middleware');

router.get('/next-code',             auth, role('admin'), ctrl.getNextCode);
router.get('/',                      auth, role('admin'), ctrl.getAll);
router.get('/:id',                   auth, role('admin'), ctrl.getOne);
router.post('/',                     auth, role('admin'), ctrl.create);
router.put('/:id',                   auth, role('admin'), ctrl.update);
router.delete('/:id',                auth, role('admin'), ctrl.remove);
router.post('/:id/transactions',     auth, role('admin'), ctrl.addTransaction);
router.get('/:id/transactions',      auth, role('admin'), ctrl.getTransactions);
router.post('/check-mora',           auth, role('admin'), ctrl.checkMora);

module.exports = router;
