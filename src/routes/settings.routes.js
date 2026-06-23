const router = require('express').Router();
const ctrl = require('../controllers/settings.controller');
const authMiddleware = require('../middleware/auth.middleware');
const role = require('../middleware/role.middleware');
const multer = require('multer');
const path = require('path');

// Configuración de Multer para subir logos
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `logo-${Date.now()}${ext}`);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|svg|webp/;
    const ext = allowed.test(path.extname(file.originalname).toLowerCase());
    const mime = allowed.test(file.mimetype);
    if (ext && mime) return cb(null, true);
    cb(new Error('Solo se permiten imágenes (jpg, png, svg, webp)'));
  }
});

// Público: la tienda virtual necesita leer la configuración
router.get('/', ctrl.get);
router.put('/', authMiddleware, role('admin'), upload.single('logo'), ctrl.update);

module.exports = router;
