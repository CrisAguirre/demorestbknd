require('dotenv').config();
const mongoose = require('mongoose');
const Settings = require('../models/Settings');
const connectDB = require('../config/db');

const setWhatsapp = async () => {
  try {
    await connectDB();
    let settings = await Settings.findOne();
    if (!settings) {
      settings = new Settings({});
    }
    settings.whatsappNumber = '573158527962';
    await settings.save();
    console.log('✅ Número de WhatsApp actualizado a 573158527962');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error actualizando WhatsApp:', error.message);
    process.exit(1);
  }
};

setWhatsapp();
