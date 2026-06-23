require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const Settings = require('../models/Settings');
const Category = require('../models/Category');

const seedAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Conectado a MongoDB');

    // Crear admin si no existe
    const adminExists = await User.findOne({ email: 'admin@demostore.com' });
    if (!adminExists) {
      await User.create({
        name: 'Libardo Jesús Meza Pantoja',
        email: 'admin@demostore.com',
        passwordHash: 'Janis724',
        role: 'admin'
      });
      console.log('👤 Admin creado: admin@demostore.com / Janis724');
    } else {
      console.log('👤 Admin ya existe');
    }

    // Crear configuración inicial
    await Settings.getSettings();
    console.log('⚙️  Configuración inicializada');

    // Crear categorías iniciales
    const defaultCategories = [
      { name: 'Bebidas', icon: '🥤', order: 1 },
      { name: 'Lácteos', icon: '🥛', order: 2 },
      { name: 'Snacks', icon: '🍿', order: 3 },
      { name: 'Granos y Cereales', icon: '🌾', order: 4 },
      { name: 'Aseo Personal', icon: '🧴', order: 5 },
      { name: 'Aseo Hogar', icon: '🧹', order: 6 },
      { name: 'Enlatados', icon: '🥫', order: 7 },
      { name: 'Carnes y Embutidos', icon: '🥩', order: 8 },
      { name: 'Frutas y Verduras', icon: '🥬', order: 9 },
      { name: 'Panadería', icon: '🍞', order: 10 },
      { name: 'Otros', icon: '📦', order: 11 }
    ];

    for (const cat of defaultCategories) {
      const exists = await Category.findOne({ name: cat.name });
      if (!exists) await Category.create(cat);
    }
    console.log('📂 Categorías iniciales creadas');

    console.log('\n🚀 Seed completado exitosamente');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error en seed:', error.message);
    process.exit(1);
  }
};

seedAdmin();
