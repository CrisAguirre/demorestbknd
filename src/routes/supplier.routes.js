// src/routes/supplier.routes.js
const router = require('express').Router();
const ctrl   = require('../controllers/supplier.controller');
const auth   = require('../middleware/auth.middleware');
const role   = require('../middleware/role.middleware');

router.get('/',      auth, ctrl.getAll);
router.get('/:id',   auth, ctrl.getOne);
router.post('/',     auth, role('admin'), ctrl.create);
router.put('/:id',   auth, role('admin'), ctrl.update);
router.delete('/:id',auth, role('admin'), ctrl.remove);

module.exports = router;
