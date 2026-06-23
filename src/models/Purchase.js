const mongoose = require('mongoose');

const purchaseItemSchema = new mongoose.Schema({
  product:     { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  productName: { type: String, required: true },
  quantity:    { type: Number, required: true, min: 1 },
  unitCost:    { type: Number, required: true, min: 0 },
  subtotal:    { type: Number, required: true, min: 0 }
}, { _id: false });

const purchaseSchema = new mongoose.Schema({
  supplier:      { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier', required: true },
  supplierName:  { type: String, required: true },          // snapshot
  user:          { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  items:         [purchaseItemSchema],
  total:         { type: Number, required: true, min: 0 },
  invoiceNumber: { type: String, default: '' },             // N° factura proveedor
  paymentMethod: { type: String, enum: ['efectivo', 'transferencia', 'credito', 'mixto'], default: 'efectivo' },
  status:        { type: String, enum: ['pendiente', 'recibida', 'anulada'], default: 'recibida' },
  notes:         { type: String, default: '' }
}, { timestamps: true });

module.exports = mongoose.model('Purchase', purchaseSchema);
