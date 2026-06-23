const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
  storeName: { type: String, default: 'Daily Mart' },
  logoUrl: { type: String, default: '' },
  phone: { type: String, default: '' },
  address: { type: String, default: 'Carrera 5 # 16-11, Miraflores' },
  whatsappNumber: { type: String, default: '' },
  theme: {
    primaryNeon: { type: String, default: '#00E5FF' },
    secondaryNeon: { type: String, default: '#7C4DFF' }
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
