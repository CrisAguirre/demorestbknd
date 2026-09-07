const mongoose = require('mongoose');

const purchaseIngredientItemSchema = new mongoose.Schema({
  ingredient: { type: mongoose.Schema.Types.ObjectId, ref: 'Ingredient', required: true },
  ingredientName: { type: String, required: true },
  quantity: { type: Number, required: true, min: 0.01 },
  unitCost: { type: Number, required: true, min: 0 },
  unit: { type: String, default: 'unidades' },
  subtotal: { type: Number, required: true, min: 0 }
}, { _id: false });

const purchaseIngredientSchema = new mongoose.Schema({
  supplier: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier', default: null },
  supplierName: { type: String, default: 'Sin proveedor' },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  items: [purchaseIngredientItemSchema],
  total: { type: Number, required: true, min: 0 },
  invoiceNumber: { type: String, default: '' },
  paymentMethod: { type: String, enum: ['efectivo', 'transferencia', 'credito', 'mixto'], default: 'efectivo' },
  status: { type: String, enum: ['pendiente', 'recibida', 'anulada'], default: 'recibida' },
  notes: { type: String, default: '' }
}, { timestamps: true });

purchaseIngredientSchema.index({ status: 1, createdAt: -1 });
purchaseIngredientSchema.index({ supplier: 1 });

module.exports = mongoose.model('PurchaseIngredient', purchaseIngredientSchema);
