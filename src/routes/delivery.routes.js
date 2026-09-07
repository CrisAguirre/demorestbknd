const router = require('express').Router();
const ctrl = require('../controllers/delivery.controller');
const auth = require('../middleware/auth.middleware');
const role = require('../middleware/role.middleware');

router.get('/', auth, ctrl.getAll);
router.get('/pending', auth, ctrl.getPending);
router.patch('/:id/accept', auth, role('admin', 'cocinero'), ctrl.accept);
router.patch('/:id/dispatch', auth, role('admin'), ctrl.dispatch);
router.patch('/:id/deliver', auth, role('admin'), ctrl.deliver);
router.patch('/:id/cancel', auth, role('admin'), ctrl.cancel);

module.exports = router;
