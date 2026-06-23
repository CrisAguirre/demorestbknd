const router = require('express').Router();
const auth = require('../controllers/auth.controller');
const authMiddleware = require('../middleware/auth.middleware');
const { authLimiter } = require('../middleware/rateLimiter');

router.post('/login', authLimiter, auth.login);
router.post('/login-guest', authLimiter, auth.loginGuest);
router.post('/register-client', authLimiter, auth.registerClient); // Registro público de cliente
router.post('/register', authMiddleware, auth.register); // Solo autenticados (admin)
router.post('/refresh', auth.refreshToken);
router.get('/profile', authMiddleware, auth.getProfile);
router.put('/update-profile', authMiddleware, auth.updateProfile);
router.put('/change-password', authMiddleware, auth.changePassword);

module.exports = router;
