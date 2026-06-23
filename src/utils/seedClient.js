require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const connectDB = require('../config/db');

const seedClient = async () => {
  try {
    await connectDB();
    const email = 'cliente@demostore.com';
    const clientExists = await User.findOne({ email });
    if (!clientExists) {
      await User.create({
        name: 'Cliente Prueba',
        email,
        passwordHash: 'Janis724',
        role: 'cliente'
      });
      console.log('👤 Cliente creado: cliente@demostore.com / Janis724');
    } else {
      console.log('👤 Cliente ya existe');
    }
    process.exit(0);
  } catch (error) {
    console.error('❌ Error en seed:', error.message);
    process.exit(1);
  }
};

seedClient();
