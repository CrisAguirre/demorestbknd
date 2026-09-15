const mongoose = require('mongoose');

// Item unificado: puede ser un Producto (inventario para venta/reventa)
// o un Insumo/Ingrediente (materia prima para preparación de platos).
// Ambos pueden coexistir en la misma orden de compra.
const purchaseItemSchema = new mongoose.Schema({
  itemType:      { type: String, enum: ['product', 'ingredient'], required: true },
  // Referencia dinámica según itemType
  product:       { type: mongoose.Schema.Types.ObjectId, ref: 'Product', default: null },
  ingredient:    { type: mongoose.Schema.Types.ObjectId, ref: 'Ingredient', default: null },
  // Snapshot del nombre al momento de la compra
  itemName:      { type: String, required: true },
  unit:          { type: String, default: 'unidades' },
  quantity:      { type: Number, required: true, min: 0.001 },
  unitCost:      { type: Number, required: true, min: 0 },
  subtotal:      { type: Number, required: true, min: 0 },
  // Si se debe actualizar el costo registrado en el catálogo
  updateCost:    { type: Boolean, default: true }
}, { _id: false });

const purchaseSchema = new mongoose.Schema({
  supplier:       { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier', default: null },
  supplierName:   { type: String, default: 'Sin proveedor' },
  user:           { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  items:          [purchaseItemSchema],
  total:          { type: Number, required: true, min: 0 },
  invoiceNumber:  { type: String, default: '' },
  paymentMethod:  { type: String, enum: ['efectivo', 'transferencia', 'credito', 'mixto'], default: 'efectivo' },
  status:         { type: String, enum: ['pendiente', 'recibida', 'anulada'], default: 'recibida' },
  notes:          { type: String, default: '' }
}, { timestamps: true });

purchaseSchema.index({ status: 1, createdAt: -1 });
purchaseSchema.index({ supplier: 1 });

module.exports = mongoose.model('Purchase', purchaseSchema);
