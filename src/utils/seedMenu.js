require('dotenv').config();
const mongoose = require('mongoose');
const Dish = require('../models/Dish');
const Ingredient = require('../models/Ingredient');

// ===== INGREDIENTES =====
const ingredientData = [
  { name: 'Arroz', unit: 'gramos', stock: 50000, minStock: 10000, cost: 3000 },
  { name: 'Pasta', unit: 'gramos', stock: 20000, minStock: 5000, cost: 4000 },
  { name: 'Pastel de maduro', unit: 'unidades', stock: 200, minStock: 50, cost: 1500 },
  { name: 'Ensalada verde', unit: 'unidades', stock: 150, minStock: 30, cost: 2000 },
  { name: 'Jugo natural', unit: 'mililitros', stock: 100000, minStock: 20000, cost: 2000 },
  { name: 'Sopa de arrocillo', unit: 'mililitros', stock: 30000, minStock: 5000, cost: 1500 },
  { name: 'Porcion de fruta', unit: 'unidades', stock: 100, minStock: 20, cost: 2500 },
  { name: 'Pollo apanado', unit: 'unidades', stock: 100, minStock: 20, cost: 6000 },
  { name: 'Pollo frito', unit: 'unidades', stock: 100, minStock: 20, cost: 5500 },
  { name: 'Pollo sudado', unit: 'unidades', stock: 80, minStock: 15, cost: 5000 },
  { name: 'Chuleta de pollo', unit: 'unidades', stock: 80, minStock: 15, cost: 5500 },
  { name: 'Chuleta de cerdo', unit: 'unidades', stock: 80, minStock: 15, cost: 6000 },
  { name: 'Frijolada', unit: 'mililitros', stock: 20000, minStock: 5000, cost: 3000 },
  { name: 'Res plancha', unit: 'unidades', stock: 80, minStock: 15, cost: 7000 },
  { name: 'Res bistec', unit: 'unidades', stock: 80, minStock: 15, cost: 7500 },
  { name: 'Cerdo plancha', unit: 'unidades', stock: 80, minStock: 15, cost: 6500 },
  { name: 'Pollo grille', unit: 'unidades', stock: 80, minStock: 15, cost: 6000 },
  { name: 'Carne en salsa criolla', unit: 'unidades', stock: 60, minStock: 10, cost: 7000 },
  { name: 'Filete pollo salsa bbq', unit: 'unidades', stock: 60, minStock: 10, cost: 6500 },
  { name: 'Sobrebarriga plancha', unit: 'unidades', stock: 50, minStock: 10, cost: 8000 },
  { name: 'Cerdo salsa mango', unit: 'unidades', stock: 50, minStock: 10, cost: 7000 },
  { name: 'Bistec a caballo', unit: 'unidades', stock: 50, minStock: 10, cost: 9000 },
  { name: 'Costilla ahumada', unit: 'unidades', stock: 40, minStock: 8, cost: 10000 },
  { name: 'Crispetas de pollo', unit: 'gramos', stock: 10000, minStock: 2000, cost: 8000 },
  { name: 'Trucha entera', unit: 'unidades', stock: 30, minStock: 5, cost: 15000 },
  { name: 'Picada para 2', unit: 'unidades', stock: 30, minStock: 5, cost: 18000 },
  { name: 'Carnes mixtas', unit: 'unidades', stock: 30, minStock: 5, cost: 16000 },
  { name: 'Filete pollo 200gr', unit: 'unidades', stock: 50, minStock: 10, cost: 10000 },
  { name: 'Huevo', unit: 'unidades', stock: 300, minStock: 60, cost: 500 },
  { name: 'Pure de papa', unit: 'gramos', stock: 15000, minStock: 3000, cost: 2500 },
  { name: 'Verdura salteada', unit: 'gramos', stock: 10000, minStock: 2000, cost: 2000 },
  { name: 'Maduro frito', unit: 'unidades', stock: 150, minStock: 30, cost: 1000 },
  { name: 'Lentejas', unit: 'gramos', stock: 15000, minStock: 3000, cost: 2000 },
  { name: 'Aceite', unit: 'mililitros', stock: 20000, minStock: 5000, cost: 1500 },
  { name: 'Sal', unit: 'gramos', stock: 10000, minStock: 2000, cost: 500 },
  { name: 'Pimienta', unit: 'gramos', stock: 5000, minStock: 1000, cost: 800 },
  { name: 'Comino', unit: 'gramos', stock: 3000, minStock: 500, cost: 600 },
  { name: 'Ajo', unit: 'unidades', stock: 200, minStock: 40, cost: 200 },
  { name: 'Cebolla', unit: 'unidades', stock: 200, minStock: 40, cost: 400 },
  { name: 'Tomate', unit: 'unidades', stock: 150, minStock: 30, cost: 500 },
  { name: 'Papa', unit: 'unidades', stock: 200, minStock: 40, cost: 300 },
  { name: 'Platano maduro', unit: 'unidades', stock: 150, minStock: 30, cost: 800 },
  { name: 'Pan para picada', unit: 'unidades', stock: 50, minStock: 10, cost: 2000 },
  { name: 'Salsa BBQ', unit: 'mililitros', stock: 10000, minStock: 2000, cost: 3000 },
  { name: 'Salsa de mango', unit: 'mililitros', stock: 5000, minStock: 1000, cost: 3500 },
  { name: 'Salsa criolla', unit: 'mililitros', stock: 8000, minStock: 1500, cost: 2000 },
];

// ===== PLATOS =====
const dishData = [
  // ── Menú Ejecutivo (Bandeja con arroz, pasta, pastel de maduro, ensalada y jugo) ──
  {
    name: 'Res plancha',
    category: 'Menú ejecutivo',
    price: 13000,
    description: 'Bandeja acompañada con arroz, pasta, pastel de maduro, ensalada y jugo',
    preparation: 'Sazonar la res con sal, pimienta y comino. Cocinar a la plancha con un poco de aceite hasta el punto deseado. Servir con los acompañamientos de la bandeja.',
    ingredients: [
      { name: 'Arroz', qty: 200 },
      { name: 'Pasta', qty: 100 },
      { name: 'Pastel de maduro', qty: 1 },
      { name: 'Ensalada verde', qty: 1 },
      { name: 'Jugo natural', qty: 300 },
      { name: 'Res plancha', qty: 1 },
    ]
  },
  {
    name: 'Res bistec',
    category: 'Menú ejecutivo',
    price: 13000,
    description: 'Bandeja acompañada con arroz, pasta, pastel de maduro, ensalada y jugo',
    preparation: 'Golpear el bistec para ablandarlo. Sazonar con sal, pimienta y ajo picado. Cocinar a la plancha con aceite. Servir con bandeja.',
    ingredients: [
      { name: 'Arroz', qty: 200 },
      { name: 'Pasta', qty: 100 },
      { name: 'Pastel de maduro', qty: 1 },
      { name: 'Ensalada verde', qty: 1 },
      { name: 'Jugo natural', qty: 300 },
      { name: 'Res bistec', qty: 1 },
    ]
  },
  {
    name: 'Cerdo plancha',
    category: 'Menú ejecutivo',
    price: 13000,
    description: 'Bandeja acompañada con arroz, pasta, pastel de maduro, ensalada y jugo',
    preparation: 'Sazonar la carne de cerdo con sal, pimienta y comino. Cocinar a la plancha hasta que esté dorada. Servir con bandeja.',
    ingredients: [
      { name: 'Arroz', qty: 200 },
      { name: 'Pasta', qty: 100 },
      { name: 'Pastel de maduro', qty: 1 },
      { name: 'Ensalada verde', qty: 1 },
      { name: 'Jugo natural', qty: 300 },
      { name: 'Cerdo plancha', qty: 1 },
    ]
  },
  {
    name: 'Pollo grille',
    category: 'Menú ejecutivo',
    price: 13000,
    description: 'Bandeja acompañada con arroz, pasta, pastel de maduro, ensalada y jugo',
    preparation: 'Sazonar la pechuga de pollo con sal, pimienta y ajo. Cocinar a la parrilla hasta que esté cocida. Servir con bandeja.',
    ingredients: [
      { name: 'Arroz', qty: 200 },
      { name: 'Pasta', qty: 100 },
      { name: 'Pastel de maduro', qty: 1 },
      { name: 'Ensalada verde', qty: 1 },
      { name: 'Jugo natural', qty: 300 },
      { name: 'Pollo grille', qty: 1 },
    ]
  },
  {
    name: 'Carne en salsa criolla',
    category: 'Menú ejecutivo',
    price: 13000,
    description: 'Bandeja acompañada con arroz, pasta, pastel de maduro, ensalada y jugo',
    preparation: 'Cocinar la carne en trozos con cebolla, tomate, ajo y salsa criolla. Dejar hervir hasta que la carne esté suave. Servir con bandeja.',
    ingredients: [
      { name: 'Arroz', qty: 200 },
      { name: 'Pasta', qty: 100 },
      { name: 'Pastel de maduro', qty: 1 },
      { name: 'Ensalada verde', qty: 1 },
      { name: 'Jugo natural', qty: 300 },
      { name: 'Carne en salsa criolla', qty: 1 },
      { name: 'Salsa criolla', qty: 50 },
      { name: 'Cebolla', qty: 1 },
      { name: 'Tomate', qty: 1 },
    ]
  },
  {
    name: 'Filete de pollo en salsa bbq',
    category: 'Menú ejecutivo',
    price: 13000,
    description: 'Bandeja acompañada con arroz, pasta, pastel de maduro, ensalada y jugo',
    preparation: 'Sazonar el filete de pollo y cocinar a la plancha. Bañar con salsa BBQ y dejar caramelizar. Servir con bandeja.',
    ingredients: [
      { name: 'Arroz', qty: 200 },
      { name: 'Pasta', qty: 100 },
      { name: 'Pastel de maduro', qty: 1 },
      { name: 'Ensalada verde', qty: 1 },
      { name: 'Jugo natural', qty: 300 },
      { name: 'Filete pollo salsa bbq', qty: 1 },
      { name: 'Salsa BBQ', qty: 50 },
    ]
  },
  {
    name: 'Sobrebarriga a la plancha',
    category: 'Menú ejecutivo',
    price: 13000,
    description: 'Bandeja acompañada con arroz, pasta, pastel de maduro, ensalada y jugo',
    preparation: 'Sazonar la sobrebarriga con sal, pimienta y ajo. Cocinar a la plancha lentamente. Servir con bandeja.',
    ingredients: [
      { name: 'Arroz', qty: 200 },
      { name: 'Pasta', qty: 100 },
      { name: 'Pastel de maduro', qty: 1 },
      { name: 'Ensalada verde', qty: 1 },
      { name: 'Jugo natural', qty: 300 },
      { name: 'Sobrebarriga plancha', qty: 1 },
    ]
  },
  {
    name: 'Cerdo en salsa de mango',
    category: 'Menú ejecutivo',
    price: 13000,
    description: 'Bandeja acompañada con arroz, pasta, pastel de maduro, ensalada y jugo',
    preparation: 'Sazonar el cerdo y cocinar a la plancha. Preparar salsa de mango con cebolla y ajo. Bañar el cerdo con la salsa. Servir con bandeja.',
    ingredients: [
      { name: 'Arroz', qty: 200 },
      { name: 'Pasta', qty: 100 },
      { name: 'Pastel de maduro', qty: 1 },
      { name: 'Ensalada verde', qty: 1 },
      { name: 'Jugo natural', qty: 300 },
      { name: 'Cerdo salsa mango', qty: 1 },
      { name: 'Salsa de mango', qty: 50 },
    ]
  },

  // ── Ejecutivo Especial ──
  {
    name: 'Pollo apanado',
    category: 'Ejecutivo especial',
    price: 14000,
    description: 'Pollo empanizado servido con papas fritas y ensalada',
    preparation: 'Sazonar la pechuga, pasar por harina, huevo y pan rallado. Freir en aceite caliente hasta dorar. Servir con papas fritas.',
    ingredients: [
      { name: 'Pollo apanado', qty: 1 },
      { name: 'Papa', qty: 3 },
      { name: 'Ensalada verde', qty: 1 },
      { name: 'Aceite', qty: 100 },
    ]
  },
  {
    name: 'Pollo frito',
    category: 'Ejecutivo especial',
    price: 14000,
    description: 'Presas de pollo frito servidas con papa y ensalada',
    preparation: 'Sazonar las presas de pollo con sal, pimienta y comino. Freir en aceite caliente hasta que estén doradas y cocidas.',
    ingredients: [
      { name: 'Pollo frito', qty: 1 },
      { name: 'Papa', qty: 3 },
      { name: 'Ensalada verde', qty: 1 },
      { name: 'Aceite', qty: 150 },
    ]
  },
  {
    name: 'Pollo sudado',
    category: 'Ejecutivo especial',
    price: 14000,
    description: 'Pollo cocinado en salsa con verduras, servido con arroz y ensalada',
    preparation: 'Dorar el pollo en aceite. Agregar cebolla, tomate, ajo y agua. Cocinar a fuego lento hasta que el pollo esté suave. Servir con arroz.',
    ingredients: [
      { name: 'Pollo sudado', qty: 1 },
      { name: 'Arroz', qty: 200 },
      { name: 'Ensalada verde', qty: 1 },
      { name: 'Cebolla', qty: 1 },
      { name: 'Tomate', qty: 1 },
      { name: 'Ajo', qty: 2 },
    ]
  },
  {
    name: 'Chuleta de pollo',
    category: 'Ejecutivo especial',
    price: 14000,
    description: 'Chuleta de pollo empanizada con papas fritas y ensalada',
    preparation: 'Sazonar la chuleta de pollo, empanizar con harina y huevo. Freir en aceite caliente. Servir con papas fritas y ensalada.',
    ingredients: [
      { name: 'Chuleta de pollo', qty: 1 },
      { name: 'Papa', qty: 3 },
      { name: 'Ensalada verde', qty: 1 },
      { name: 'Aceite', qty: 100 },
    ]
  },
  {
    name: 'Chuleta de cerdo',
    category: 'Ejecutivo especial',
    price: 14000,
    description: 'Chuleta de cerdo empanizada con papas fritas y ensalada',
    preparation: 'Sazonar la chuleta de cerdo con sal y pimienta. Empanizar y freir. Servir con papas fritas y ensalada.',
    ingredients: [
      { name: 'Chuleta de cerdo', qty: 1 },
      { name: 'Papa', qty: 3 },
      { name: 'Ensalada verde', qty: 1 },
      { name: 'Aceite', qty: 100 },
    ]
  },
  {
    name: 'Frijolada',
    category: 'Ejecutivo especial',
    price: 15000,
    description: 'Frijoles con cerdo, arroz, aguacate y ensalada',
    preparation: 'Cocinar los frijoles con carne de cerdo, cebolla y ajo. Servir con arroz, aguacate y ensalada.',
    ingredients: [
      { name: 'Frijolada', qty: 1 },
      { name: 'Arroz', qty: 200 },
      { name: 'Ensalada verde', qty: 1 },
    ]
  },

  // ── Especialidades ──
  {
    name: 'Bistec a caballo',
    category: 'Especialidades',
    price: 18000,
    description: 'Bistec de res con huevo frito encima, arroz, papas fritas y ensalada',
    preparation: 'Cocinar el bistec a la plancha. Freir un huevo. Servir el bistec con el huevo encima, acompañado de arroz, papas fritas y ensalada.',
    ingredients: [
      { name: 'Res bistec', qty: 1 },
      { name: 'Huevo', qty: 2 },
      { name: 'Arroz', qty: 200 },
      { name: 'Papa', qty: 3 },
      { name: 'Ensalada verde', qty: 1 },
      { name: 'Aceite', qty: 80 },
    ]
  },
  {
    name: 'Costilla ahumada',
    category: 'Especialidades',
    price: 18000,
    description: 'Costilla de cerdo ahumada con salsa BBQ, papas y ensalada',
    preparation: 'Sazonar las costillas y cocinar lentamente. Bañar con salsa BBQ y caramelizar al horno. Servir con papas y ensalada.',
    ingredients: [
      { name: 'Costilla ahumada', qty: 1 },
      { name: 'Salsa BBQ', qty: 80 },
      { name: 'Papa', qty: 3 },
      { name: 'Ensalada verde', qty: 1 },
    ]
  },
  {
    name: 'Crispetas de pollo',
    category: 'Especialidades',
    price: 20000,
    description: 'Trozos pequeños de pollo empanizados con salsas y papas',
    preparation: 'Cortar el pollo en trozos pequeños, sazonar, empanizar y freir. Servir con salsas y papas.',
    ingredients: [
      { name: 'Crispetas de pollo', qty: 250 },
      { name: 'Papa', qty: 3 },
      { name: 'Aceite', qty: 200 },
      { name: 'Salsa BBQ', qty: 50 },
    ]
  },
  {
    name: 'Trucha entera',
    category: 'Especialidades',
    price: 30000,
    description: 'Trucha frita entera con arroz, papas y ensalada',
    preparation: 'Limpiar la trucha, sazonar con sal, ajo y limón. Freir en aceite caliente. Servir con arroz, papas y ensalada.',
    ingredients: [
      { name: 'Trucha entera', qty: 1 },
      { name: 'Arroz', qty: 200 },
      { name: 'Papa', qty: 3 },
      { name: 'Ensalada verde', qty: 1 },
      { name: 'Aceite', qty: 150 },
      { name: 'Ajo', qty: 3 },
    ]
  },
  {
    name: 'Picada para 2',
    category: 'Especialidades',
    price: 32000,
    description: 'Variedad de carnes, chorizo, papa, plátano y ensalada para dos personas',
    preparation: 'Preparar todas las carnes a la plancha. Freir el plátano maduro y las papas. Servir en una bandeja grande con ensalada y pan.',
    ingredients: [
      { name: 'Picada para 2', qty: 1 },
      { name: 'Papa', qty: 4 },
      { name: 'Platano maduro', qty: 2 },
      { name: 'Ensalada verde', qty: 2 },
      { name: 'Pan para picada', qty: 4 },
      { name: 'Aceite', qty: 150 },
    ]
  },
  {
    name: 'Carnes mixtas',
    category: 'Especialidades',
    price: 30000,
    description: 'Combinación de res, cerdo y pollo a la plancha con papas y ensalada',
    preparation: 'Sazonar y cocinar a la plancha los tres tipos de carne. Servir con papas fritas y ensalada.',
    ingredients: [
      { name: 'Carnes mixtas', qty: 1 },
      { name: 'Papa', qty: 3 },
      { name: 'Ensalada verde', qty: 1 },
      { name: 'Aceite', qty: 100 },
    ]
  },
  {
    name: 'Filete de pollo de 200gr',
    category: 'Especialidades',
    price: 24000,
    description: 'Filete de pollo de 200 gramos con pure de papa y verduras salteadas',
    preparation: 'Sazonar el filete de pollo con sal y pimienta. Cocinar a la plancha. Servir con pure de papa y verduras salteadas.',
    ingredients: [
      { name: 'Filete pollo 200gr', qty: 1 },
      { name: 'Pure de papa', qty: 200 },
      { name: 'Verdura salteada', qty: 150 },
    ]
  },
];

async function seed() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Conectado a MongoDB');

    await Ingredient.deleteMany({});
    await Dish.deleteMany({});
    console.log('🗑️ Datos anteriores eliminados');

    const createdIngredients = await Ingredient.insertMany(ingredientData);
    console.log(`🧅 ${createdIngredients.length} ingredientes creados`);

    const ingredientMap = {};
    createdIngredients.forEach(ing => {
      ingredientMap[ing.name] = ing._id;
    });

    const dishes = dishData.map(d => ({
      name: d.name,
      category: d.category,
      price: d.price,
      description: d.description || '',
      preparation: d.preparation || '',
      isAvailable: true,
      ingredients: d.ingredients.map(i => ({
        ingredient: ingredientMap[i.name],
        quantity: i.qty
      }))
    }));

    await Dish.insertMany(dishes);
    console.log(`🍲 ${dishes.length} platos creados con sus recetas`);

    console.log('\n✅ Seed completado exitosamente');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error en seed:', error.message);
    process.exit(1);
  }
}

seed();
