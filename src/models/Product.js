const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: { type: String, required: [true, 'El nombre del producto es requerido'], trim: true },
  barcode: { type: String, unique: true, sparse: true, trim: true },
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
  supplier: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier' },
  purchasePrice: { type: Number, required: true, min: 0 },
  salePrice: { type: Number, required: true, min: 0 },
  stock: { type: Number, required: true, default: 0, min: 0 },
  minStock: { type: Number, default: 5, min: 0 },
  imageUrl: { type: String, default: '' },
  description: { type: String, default: '' },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

productSchema.index({ name: 'text', barcode: 'text' });
productSchema.index({ isActive: 1, name: 1 });          // list active sorted
productSchema.index({ isActive: 1, category: 1 });      // filter by category
productSchema.index({ isActive: 1, supplier: 1 });      // filter by supplier

module.exports = mongoose.model('Product', productSchema);
