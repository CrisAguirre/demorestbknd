const router = require('express').Router();
const ctrl = require('../controllers/kitchenOrder.controller');
const auth = require('../middleware/auth.middleware');
const role = require('../middleware/role.middleware');

router.get('/', auth, ctrl.getAll);
router.get('/pending', auth, ctrl.getPending);
router.get('/status/:status', auth, ctrl.getByStatus);
router.patch('/:id/accept', auth, role('cocinero', 'admin'), ctrl.accept);
router.patch('/:id/deliver', auth, role('cocinero', 'admin'), ctrl.deliver);
router.patch('/:id/paid', auth, role('admin', 'cajero'), ctrl.markPaid);
router.get('/:id/print', auth, ctrl.printTicket);

module.exports = router;
