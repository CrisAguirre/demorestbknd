require('dotenv').config();
const mongoose = require('mongoose');
const Dish = require('../models/Dish');

const seedDishes = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Conectado a MongoDB');

    await Dish.deleteMany({}); // Opcional: limpiar antes de insertar
    
    const menuItems = [
      // Menú ejecutivo
      { name: 'Res plancha', category: 'Menú ejecutivo', price: 13000 },
      { name: 'Res bistec', category: 'Menú ejecutivo', price: 13000 },
      { name: 'Cerdo plancha', category: 'Menú ejecutivo', price: 13000 },
      { name: 'Pollo grille', category: 'Menú ejecutivo', price: 13000 },
      { name: 'Carne en salsa criolla', category: 'Menú ejecutivo', price: 13000 },
      { name: 'Filete de pollo en salsa bbq', category: 'Menú ejecutivo', price: 13000 },
      { name: 'Sobrebarriga a la plancha', category: 'Menú ejecutivo', price: 13000 },
      { name: 'Cerdo en salsa hawaiana', category: 'Menú ejecutivo', price: 13000 },
      { name: 'Albondigas de res', category: 'Menú ejecutivo', price: 13000 },
      
      // Ejecutivo especial
      { name: 'Pollo apanado', category: 'Ejecutivo especial', price: 14000 },
      { name: 'Pollo frito', category: 'Ejecutivo especial', price: 14000 },
      { name: 'Pollo sudado', category: 'Ejecutivo especial', price: 14000 },
      { name: 'Chuleta de pollo', category: 'Ejecutivo especial', price: 14000 },
      { name: 'Chuleta de cerdo', category: 'Ejecutivo especial', price: 14000 },

      // Especialidades
      { name: 'Chuletón de cerdo BBQ', category: 'Especialidades', price: 15000 },
      { name: 'Bistec a caballo', category: 'Especialidades', price: 15000 },
      { name: 'Costilla ahumada', category: 'Especialidades', price: 18000 },
      { name: 'Crispetas de pollo', category: 'Especialidades', price: 20000 },
      { name: 'Trucha entera', category: 'Especialidades', price: 30000 },
      { name: 'Picada para 2', category: 'Especialidades', price: 32000 },
      { name: 'Carnes mixtas', category: 'Especialidades', price: 30000 },
      { name: 'Filete de pollo de 200gr', category: 'Especialidades', price: 24000 },
      
      // Tiquetera
      { name: 'Almuerzo de Tiquetera', category: 'Servicio de tiquetera', price: 0, description: 'Bandeja acompañada con arroz, lentejas, Tajada de maduro, ensalada y jugo. Opciones: Sopa de avena, Porción de fruta, Consomé' }
    ];

    await Dish.insertMany(menuItems);
    console.log('🍲 Platos iniciales creados exitosamente');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error en seed:', error.message);
    process.exit(1);
  }
};

seedDishes();
