const Supplier = require('../models/Supplier');

// GET /api/suppliers
exports.getAll = async (req, res, next) => {
  try {
    const { search, active } = req.query;
    const filter = {};
    if (active !== undefined) filter.isActive = active === 'true';
    if (search) filter.$text = { $search: search };

    const suppliers = await Supplier.find(filter).populate('categories', 'name icon code').sort({ name: 1 });
    res.json(suppliers);
  } catch (err) { next(err); }
};

// GET /api/suppliers/:id
exports.getOne = async (req, res, next) => {
  try {
    const supplier = await Supplier.findById(req.params.id);
    if (!supplier) return res.status(404).json({ message: 'Proveedor no encontrado' });
    res.json(supplier);
  } catch (err) { next(err); }
};

// POST /api/suppliers
exports.create = async (req, res, next) => {
  try {
    // Auto-generate supplier code (sequential)
    // Buscamos el mayor código numérico normal (menor a 99) para ignorar códigos especiales (ej. 99, 100)
    const allSuppliers = await Supplier.find({}, 'code');
    let maxNormalCode = 0;
    
    allSuppliers.forEach(s => {
      const num = parseInt(s.code, 10);
      if (!isNaN(num) && num < 99 && num > maxNormalCode) {
        maxNormalCode = num;
      }
    });

    const nextCode = (maxNormalCode + 1).toString().padStart(2, '0');
    req.body.code = nextCode;

    const supplier = new Supplier(req.body);
    await supplier.save();
    // Populate categories before returning
    await supplier.populate('categories', 'name icon code');
    res.status(201).json(supplier);
  } catch (err) { next(err); }
};

// PUT /api/suppliers/:id
exports.update = async (req, res, next) => {
  try {
    const supplier = await Supplier.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!supplier) return res.status(404).json({ message: 'Proveedor no encontrado' });
    res.json(supplier);
  } catch (err) { next(err); }
};

// DELETE /api/suppliers/:id  (soft-delete)
exports.remove = async (req, res, next) => {
  try {
    const supplier = await Supplier.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );
    if (!supplier) return res.status(404).json({ message: 'Proveedor no encontrado' });
    res.json({ message: 'Proveedor desactivado', supplier });
  } catch (err) { next(err); }
};
