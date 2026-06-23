/**
 * preload.routes.js
 *
 * Single authenticated GET /api/preload route.
 * Requires a valid JWT — call it right after login().
 */

const router = require('express').Router();
const auth   = require('../middleware/auth.middleware');
const { preload } = require('../controllers/preload.controller');

// GET /api/preload  (auth required)
router.get('/', auth, preload);

module.exports = router;
