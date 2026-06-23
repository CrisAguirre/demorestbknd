const Product = require('../models/Product');
const Category = require('../models/Category');
const Alert = require('../models/Alert');
const Supplier = require('../models/Supplier');

exports.nextBarcode = async (req, res, next) => {
  try {
    const { categoryId, supplierId } = req.query;
    if (!categoryId || !supplierId) {
      return res.status(400).json({ message: 'Categoría y proveedor son requeridos' });
    }

    const category = await Category.findById(categoryId);
    const supplier = await Supplier.findById(supplierId);

    if (!category || !category.code) return res.status(400).json({ message: 'Categoría inválida o sin código' });
    if (!supplier || !supplier.code) return res.status(400).json({ message: 'Proveedor inválido o sin código' });

    const prefix = category.code + supplier.code;
    // Find highest barcode with this exact prefix
    const last = await Product.findOne({ barcode: { $regex: `^${prefix}` } }).sort({ barcode: -1 });
    let nextNum = 1;
    if (last && last.barcode) {
      const suffix = last.barcode.substring(prefix.length);
      nextNum = parseInt(suffix, 10) + 1;
    }
    // Code of product only has 3 digits as consecutive
    const barcode = prefix + nextNum.toString().padStart(3, '0');
    res.json({ barcode, prefix });
  } catch (error) {
    next(error);
  }
};

exports.getAll = async (req, res, next) => {
  try {
    const { search, category, supplier, page = 1, limit = 50, active } = req.query;
    const filter = {};

    if (search) {
      // Use $text index for multi-word search (fast, uses index)
      // Falls back to regex only for very short terms where $text is less effective
      if (search.length >= 2) {
        filter.$text = { $search: search };
      } else {
        filter.$or = [
          { name: { $regex: search, $options: 'i' } },
          { barcode: { $regex: search, $options: 'i' } }
        ];
      }
    }
    if (category) filter.category = category;
    if (supplier) {
      filter.supplier = { $in: supplier.split(',') };
    }
    if (active !== undefined) filter.isActive = active === 'true';

    // Run both queries in parallel
    const [products, total] = await Promise.all([
      Product.find(filter)
        .populate('category', 'name icon code')
        .populate('supplier', 'name code')
        .sort({ name: 1 })
        .skip((page - 1) * limit)
        .limit(Number(limit))
        .lean(),
      Product.countDocuments(filter)
    ]);

    res.json({ products, total, page: Number(page), pages: Math.ceil(total / limit) });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/products/all
 * Returns ALL active products in a single lean query.
 * The frontend uses this for local-first search (POS + Inventory).
 */
exports.getAllActive = async (req, res, next) => {
  try {
    const products = await Product.find({})
      .populate('category', 'name icon code')
      .populate('supplier', 'name code')
      .sort({ name: 1 })
      .lean();

    res.json({ products, total: products.length });
  } catch (error) {
    next(error);
  }
};

exports.getById = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate('category', 'name icon code')
      .populate('supplier', 'name code');
    if (!product) return res.status(404).json({ message: 'Producto no encontrado' });
    res.json(product);
  } catch (error) {
    next(error);
  }
};

exports.create = async (req, res, next) => {
  try {
    const product = await Product.create(req.body);
    res.status(201).json(product);
  } catch (error) {
    next(error);
  }
};

exports.update = async (req, res, next) => {
  try {
    const product = await Product.findByIdAndUpdate(req.params.id, req.body, {
      new: true, runValidators: true
    }).populate('category', 'name icon code').populate('supplier', 'name code');
    if (!product) return res.status(404).json({ message: 'Producto no encontrado' });
    res.json(product);
  } catch (error) {
    next(error);
  }
};

exports.remove = async (req, res, next) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) return res.status(404).json({ message: 'Producto no encontrado' });
    res.json({ message: 'Producto eliminado permanentemente' });
  } catch (error) {
    next(error);
  }
};

exports.updateStock = async (req, res, next) => {
  try {
    const { quantity, type } = req.body; // type: 'entrada' | 'salida'
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: 'Producto no encontrado' });

    if (type === 'entrada') {
      product.stock += Number(quantity);
    } else {
      if (product.stock < quantity) {
        return res.status(400).json({ message: 'Stock insuficiente' });
      }
      product.stock -= Number(quantity);
    }

    await product.save();

    // Generar alerta si el stock está bajo
    if (product.stock <= product.minStock) {
      await Alert.create({
        product: product._id,
        type: product.stock === 0 ? 'sin_stock' : 'stock_bajo',
        message: product.stock === 0
          ? `"${product.name}" se ha agotado`
          : `"${product.name}" tiene stock bajo (${product.stock} unidades)`,
        priority: product.stock === 0 ? 'alta' : 'media'
      });
    }

    res.json(product);
  } catch (error) {
    next(error);
  }
};
