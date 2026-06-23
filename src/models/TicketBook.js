const mongoose = require('mongoose');

const consumptionSchema = new mongoose.Schema({
  date: { type: Date, default: Date.now },
  notes: { type: String, default: '' }
});

const ticketBookSchema = new mongoose.Schema({
  customerName: { type: String, required: [true, 'El nombre del cliente es requerido'], trim: true },
  phone: { type: String, default: '' },
  totalMeals: { type: Number, required: true, default: 10, min: 1 },
  consumedMeals: { type: Number, default: 0, min: 0 },
  pricePaid: { type: Number, required: true, min: 0 },
  consumptions: [consumptionSchema],
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

ticketBookSchema.index({ customerName: 'text', phone: 'text' });
ticketBookSchema.index({ isActive: 1, customerName: 1 });

module.exports = mongoose.model('TicketBook', ticketBookSchema);
