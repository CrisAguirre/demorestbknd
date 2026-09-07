const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
  storeName: { type: String, default: 'La Soupe a l\'Oignon' },
  logoUrl: { type: String, default: '' },
  phone: { type: String, default: '' },
  address: { type: String, default: 'Carrera 5 # 16-11, Miraflores' },
  whatsappNumber: { type: String, default: '' },
  theme: {
    primaryNeon: { type: String, default: '#D4AF37' },
    secondaryNeon: { type: String, default: '#8B5A2B' }
  },
  manualUrl: { type: String, default: '' },
  email: {
    host: { type: String, default: '' },
    port: { type: Number, default: 587 },
    secure: { type: Boolean, default: false },
    user: { type: String, default: '' },
    pass: { type: String, default: '' },
    from: { type: String, default: '' },
    alertEmail: { type: String, default: '' }
  }
}, { timestamps: true });

// Singleton: solo permite un documento de configuración
settingsSchema.statics.getSettings = async function () {
  let settings = await this.findOne();
  if (!settings) {
    settings = await this.create({});
  }
  return settings;
};

module.exports = mongoose.model('Settings', settingsSchema);
