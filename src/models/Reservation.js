const mongoose = require('mongoose');

const reservationSchema = new mongoose.Schema({
  table: { type: mongoose.Schema.Types.ObjectId, ref: 'Table', required: true },
  customerName: { type: String, required: true, trim: true },
  numberOfPeople: { type: Number, required: true, min: 1 },
  date: { type: Date, required: true },
  notes: { type: String, default: '', trim: true },
  status: {
    type: String,
    enum: ['pendiente', 'confirmada', 'completada', 'cancelada'],
    default: 'pendiente'
  },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

module.exports = mongoose.model('Reservation', reservationSchema);
