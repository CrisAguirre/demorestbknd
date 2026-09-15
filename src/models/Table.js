const mongoose = require('mongoose');

const tableSchema = new mongoose.Schema({
  number: { type: Number, required: true, unique: true },
  name: { type: String, default: null },
  status: {
    type: String,
    enum: ['libre', 'ocupada', 'reservada'],
    default: 'libre'
  },
  currentSale: { type: mongoose.Schema.Types.ObjectId, ref: 'Sale', default: null },
  currentReservation: { type: mongoose.Schema.Types.ObjectId, ref: 'Reservation', default: null },
  occupiedAt: { type: Date, default: null }
}, { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } });

// Virtual for backward compatibility
tableSchema.virtual('isOccupied').get(function () {
  return this.status === 'ocupada';
});

module.exports = mongoose.model('Table', tableSchema);
