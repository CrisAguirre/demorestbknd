const router = require('express').Router();
const multer = require('multer');
const path = require('path');
const ctrl = require('../controllers/settings.controller');
const authMiddleware = require('../middleware/auth.middleware');
const role = require('../middleware/role.middleware');

// Configuración de Multer para subir logos
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|svg|webp/;
    const ext = allowed.test(path.extname(file.originalname).toLowerCase());
    const mime = allowed.test(file.mimetype);
    if (ext && mime) return cb(null, true);
    cb(new Error('Solo se permiten imágenes (jpg, png, svg, webp)'));
  }
});

const uploadPDF = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext === '.pdf') return cb(null, true);
    cb(new Error('Solo se permiten archivos PDF'));
  }
});

router.get('/', ctrl.get);
router.put('/', authMiddleware, role('admin'), upload.single('logo'), ctrl.update);
router.put('/manual', authMiddleware, role('admin'), uploadPDF.single('manual'), ctrl.uploadManual);

module.exports = router;
