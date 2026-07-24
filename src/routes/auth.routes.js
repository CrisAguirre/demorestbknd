const router = require('express').Router();
const auth = require('../controllers/auth.controller');
const authMiddleware = require('../middleware/auth.middleware');
const role = require('../middleware/role.middleware');
const { authLimiter } = require('../middleware/rateLimiter');

router.post('/login', authLimiter, auth.login);

router.post('/register-client', authLimiter, auth.registerClient);
router.post('/register', authMiddleware, auth.register);
router.post('/refresh', auth.refreshToken);
router.get('/profile', authMiddleware, auth.getProfile);
router.put('/update-profile', authMiddleware, auth.updateProfile);
router.put('/change-password', authMiddleware, auth.changePassword);

// Admin user management
router.get('/users', authMiddleware, role('admin'), auth.getAllUsers);
router.put('/users/:id', authMiddleware, role('admin'), auth.updateUser);
router.delete('/users/:id', authMiddleware, role('admin'), auth.deleteUser);

module.exports = router;