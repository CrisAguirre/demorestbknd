// src/routes/expense.routes.js
const router = require('express').Router();
const ctrl   = require('../controllers/expense.controller');
const auth   = require('../middleware/auth.middleware');
const role   = require('../middleware/role.middleware');

router.get('/categories', auth, ctrl.getCategories);
router.get('/',           auth, role('admin'), ctrl.getAll);
router.post('/',          auth, role('admin'), ctrl.create);
router.put('/:id',        auth, role('admin'), ctrl.update);
router.delete('/:id',     auth, role('admin'), ctrl.remove);

module.exports = router;
