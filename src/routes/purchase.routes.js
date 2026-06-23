// src/routes/purchase.routes.js
const router = require('express').Router();
const ctrl   = require('../controllers/purchase.controller');
const auth   = require('../middleware/auth.middleware');
const role   = require('../middleware/role.middleware');

router.get('/',              auth, role('admin'), ctrl.getAll);
router.get('/:id',           auth, role('admin'), ctrl.getOne);
router.post('/',             auth, role('admin'), ctrl.create);
router.patch('/:id/status',  auth, role('admin'), ctrl.updateStatus);

module.exports = router;
