const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: { type: String, required: [true, 'El nombre es requerido'], trim: true },
  email: {
    type: String, required: [true, 'El email es requerido'],
    unique: true, lowercase: true, trim: true
  },
  passwordHash: { type: String, required: [true, 'La contraseña es requerida'] },
  phone: { type: String, trim: true },
  address: { type: String, trim: true },
  role: { type: String, enum: ['admin', 'cajero', 'cliente', 'invitado'], default: 'cajero' },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

userSchema.pre('save', async function () {
  if (!this.isModified('passwordHash')) return;
  this.passwordHash = await bcrypt.hash(this.passwordHash, 12);
});

userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.passwordHash);
};

userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.passwordHash;
  return obj;
};

module.exports = mongoose.model('User', userSchema);
