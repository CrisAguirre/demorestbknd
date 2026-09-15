const router = require('express').Router();
const multer = require('multer');
const path = require('path');
const ctrl = require('../controllers/dish.controller');
const authMiddleware = require('../middleware/auth.middleware');
const role = require('../middleware/role.middleware');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
});
const upload = multer({
  storage,
  limits: { fileSize: 3 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|webp/;
    if (allowed.test(path.extname(file.originalname).toLowerCase()) && allowed.test(file.mimetype))
      return cb(null, true);
    cb(new Error('Solo se permiten imágenes (jpg, png, webp)'));
  }
});

router.get('/', authMiddleware, ctrl.getAll);
router.post('/', authMiddleware, role('admin'), upload.single('photo'), ctrl.create);
router.put('/:id', authMiddleware, role('admin'), upload.single('photo'), ctrl.update);
router.delete('/:id', authMiddleware, role('admin'), ctrl.remove);

router.get('/:id/recipe-cost', authMiddleware, ctrl.getRecipeCost);
router.get('/:id/availability', authMiddleware, ctrl.checkAvailability);
router.get('/:id/availability-summary', authMiddleware, ctrl.getAvailabilityById);
router.post('/batch-availability', authMiddleware, ctrl.batchCheckAvailability);
router.get('/availability/summary', authMiddleware, ctrl.getAvailabilitySummary);

module.exports = router;
