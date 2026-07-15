const mongoose = require('mongoose');

const tableSchema = new mongoose.Schema({
  number: { type: Number, required: true, unique: true },
  isOccupied: { type: Boolean, default: false },
  currentSale: { type: mongoose.Schema.Types.ObjectId, ref: 'Sale', default: null },
  occupiedAt: { type: Date, default: null }
}, { timestamps: true });

module.exports = mongoose.model('Table', tableSchema);
