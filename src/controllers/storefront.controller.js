const Product = require('../models/Product');
const Category = require('../models/Category');

// Endpoints públicos para la tienda virtual
exports.getProducts = async (req, res, next) => {
  try {
    const { category, search, page = 1, limit = 20 } = req.query;
    const filter = { isActive: true, stock: { $gt: 0 } };

    if (category) filter.category = category;
    if (search) filter.$text = { $search: search };

    const products = await Product.find(filter)
      .select('name salePrice stock imageUrl description category')
      .populate('category', 'name icon')
      .sort({ name: 1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const total = await Product.countDocuments(filter);
    res.json({ products, total, page: Number(page), pages: Math.ceil(total / limit) });
  } catch (error) {
    next(error);
  }
};

exports.getCategories = async (req, res, next) => {
  try {
    const categories = await Category.find({ isActive: true }).sort({ order: 1 });
    res.json(categories);
  } catch (error) {
    next(error);
  }
};

exports.checkAvailability = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id)
      .select('name salePrice stock imageUrl');
    if (!product) return res.status(404).json({ message: 'Producto no encontrado' });
    res.json({ available: product.stock > 0, product });
  } catch (error) {
    next(error);
  }
};
