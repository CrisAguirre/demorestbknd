const mongoose = require('mongoose');

const productMovementSchema = new mongoose.Schema({
  type: { type: String, enum: ['sale', 'purchase', 'adjustment', 'initial'], required: true },
  quantity: { type: Number, required: true },
  previousStock: { type: Number, required: true },
  newStock: { type: Number, required: true },
  reference: { type: mongoose.Schema.Types.ObjectId, default: null },
  referenceModel: { type: String, default: null },
  description: { type: String, default: '' },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }
}, { _id: false, timestamps: true });

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
  isActive: { type: Boolean, default: true },
  movementHistory: [productMovementSchema]
}, { timestamps: true });

productSchema.index({ name: 'text', barcode: 'text' });
productSchema.index({ isActive: 1, name: 1 }); // list active sorted
productSchema.index({ isActive: 1, category: 1 }); // filter by category
productSchema.index({ isActive: 1, supplier: 1 }); // filter by supplier

module.exports = mongoose.model('Product', productSchema);
