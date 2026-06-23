const mongoose = require('mongoose');

const staffSchema = new mongoose.Schema({
  name: { type: String, required: [true, 'El nombre es requerido'], trim: true },
  phone: { type: String, default: '' },
  position: { type: String, required: true, default: 'Empleado' }, // Mesero, Cocinero, Administrador
  salary: { type: Number, required: true, default: 0 },
  paymentDate: { type: Date }, // Próxima fecha de pago o fecha de pago recurrente
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

staffSchema.index({ name: 'text', phone: 'text' });
staffSchema.index({ isActive: 1, name: 1 });

module.exports = mongoose.model('Staff', staffSchema);
