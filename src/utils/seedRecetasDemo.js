// Carga los 2 platos demo (RC-01 Ceviche peruano, RP-01 Postre de uvilla)
// con sus ingredientes, SIN enlazar recetas por ahora: los platos quedan
// con su ficha (descripción, preparación) pero receta vacía ("Sin receta").
// El enlace global de recetas se hará después y la info actual cambiará.
// Usa UPSERT por código: no borra nada existente ni duplica.
//
// Uso: node src/utils/seedRecetasDemo.js   (requiere .env con MONGODB_URI)
require('dotenv').config();
const mongoose = require('mongoose');
const Ingredient = require('../models/Ingredient');
const Dish = require('../models/Dish');

const ingredientes = [
  // Ceviche (cantidades de referencia para stock demo)
  { code: 'CP-001', name: 'Filete de pescado blanco', unit: 'g', stock: 5000, minStock: 500, cost: 0 },
  { code: 'CF-002', name: 'Limón tahití', unit: 'g', stock: 3000, minStock: 500, cost: 0 },
  { code: 'CF-003', name: 'Cebolla roja', unit: 'g', stock: 2000, minStock: 300, cost: 0 },
  { code: 'CF-004', name: 'Ají limo', unit: 'g', stock: 500, minStock: 100, cost: 0 },
  { code: 'CF-005', name: 'Ajo', unit: 'g', stock: 500, minStock: 100, cost: 0 },
  { code: 'CF-006', name: 'Apio', unit: 'g', stock: 500, minStock: 100, cost: 0 },
  { code: 'CF-007', name: 'Cilantro', unit: 'g', stock: 500, minStock: 100, cost: 0 },
  { code: 'CF-008', name: 'Camote', unit: 'g', stock: 3000, minStock: 500, cost: 0 },
  { code: 'CF-009', name: 'Choclo', unit: 'g', stock: 3000, minStock: 500, cost: 0 },
  { code: 'CF-010', name: 'Lechuga crespa', unit: 'g', stock: 1000, minStock: 200, cost: 0 },
  { code: 'CA-001', name: 'Sal', unit: 'g', stock: 2000, minStock: 200, cost: 0 },
  { code: 'CA-002', name: 'Pimienta blanca molida', unit: 'g', stock: 200, minStock: 50, cost: 0 },
  { code: 'CA-003', name: 'Cancha serrana', unit: 'g', stock: 1000, minStock: 200, cost: 0 },
  { code: 'BI-003', name: 'Hielo en cubos', unit: 'g', stock: 5000, minStock: 1000, cost: 0 },
  // Postre
  { code: 'CF-001', name: 'Uvilla', unit: 'g', stock: 2000, minStock: 300, cost: 0 },
  { code: 'CA-004', name: 'Panela', unit: 'g', stock: 2000, minStock: 300, cost: 0 },
  { code: 'CA-005', name: 'Canela en rama', unit: 'g', stock: 200, minStock: 50, cost: 0 },
  { code: 'CA-007', name: 'Clavo de olor', unit: 'g', stock: 100, minStock: 20, cost: 0 },
  { code: 'CL-001', name: 'Crema de leche', unit: 'ml', stock: 2000, minStock: 400, cost: 0 },
  { code: 'CL-002', name: 'Cuajada fresca', unit: 'g', stock: 1500, minStock: 300, cost: 0 },
  { code: 'CA-008', name: 'Azúcar blanca', unit: 'g', stock: 2000, minStock: 300, cost: 0 },
  { code: 'CA-011', name: 'Esencia de vainilla', unit: 'ml', stock: 200, minStock: 50, cost: 0 },
  { code: 'CA-009', name: 'Harina de trigo', unit: 'g', stock: 2000, minStock: 300, cost: 0 },
  { code: 'CL-003', name: 'Mantequilla sin sal', unit: 'g', stock: 1000, minStock: 200, cost: 0 },
  { code: 'CA-010', name: 'Quinua inflada', unit: 'g', stock: 500, minStock: 100, cost: 0 },
  { code: 'CA-006', name: 'Canela molida', unit: 'g', stock: 200, minStock: 50, cost: 0 },
  { code: 'CF-011', name: 'Hierbabuena', unit: 'g', stock: 300, minStock: 50, cost: 0 },
];

const platos = [
  {
    code: 'RC-01',
    name: 'Ceviche peruano clásico',
    category: 'Entradas',
    price: 0,
    description: 'Entrada fría. Rinde 4 porciones de ≈ 400 g. Servir a 4–8 °C en plato hondo. Alérgenos: pescado, apio.',
    preparation: '1) Camote y choclo cocidos, enfriar. 2) Cebolla en pluma lavada en agua con hielo. 3) Leche de tigre: licuar limón, ají, ajo, apio, tallos de cilantro, recortes de pescado y hielo; colar (<5 °C). 4) Cubos de pescado 2 cm, sal y pimienta. 5) Mezclar al servir, marinar 3–5 min. Montaje: lechuga, camote, choclo, ceviche, cancha y cilantro.',
    receta: [
      ['CP-001', 700], ['CF-002', 420], ['CF-003', 200], ['CF-004', 25],
      ['CF-005', 6], ['CF-006', 30], ['CF-007', 30], ['CF-008', 400],
      ['CF-009', 500], ['CF-010', 60], ['CA-001', 8], ['CA-002', 1],
      ['CA-003', 40], ['BI-003', 100],
    ],
  },
  {
    code: 'RP-01',
    name: 'Postre andino de uvilla',
    category: 'Postres',
    price: 0,
    description: 'Postre frío. Rinde 10 porciones de ≈ 125 g en vaso de 180 ml. Alérgenos: gluten, lácteos.',
    preparation: '1) Compota: uvilla, panela, canela, clavo y limón 15–20 min; enfriar. 2) Crumble: harina, mantequilla, panela, canela, sal + quinua; hornear 170 °C 15–18 min. 3) Crema: batir crema, procesar cuajada con azúcar y vainilla, integrar. 4) Montaje: 40 g compota, 60 g crema, 15 g crumble, uvilla fresca y menta.',
    receta: [
      ['CF-001', 700], ['CA-004', 160], ['CA-005', 5], ['CA-007', 1],
      ['CF-002', 40], ['CL-001', 400], ['CL-002', 250], ['CA-008', 50],
      ['CA-011', 5], ['CA-009', 100], ['CL-003', 60], ['CA-010', 30],
      ['CA-006', 2], ['CA-001', 1], ['CF-011', 10],
    ],
  },
];

async function seed() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('✅ Conectado a MongoDB');

  const mapa = {};
  for (const ing of ingredientes) {
    const doc = await Ingredient.findOneAndUpdate(
      { code: ing.code },
      { $setOnInsert: ing },
      { upsert: true, new: true, runValidators: true }
    );
    mapa[ing.code] = doc._id;
  }
  console.log(`🧅 ${ingredientes.length} ingredientes verificados (sin duplicar)`);

  for (const p of platos) {
    await Dish.findOneAndUpdate(
      { code: p.code },
      {
        $set: {
          name: p.name,
          category: p.category,
          price: p.price,
          description: p.description,
          preparation: p.preparation,
          isAvailable: true,
          ingredients: [],
        },
        $setOnInsert: { code: p.code },
      },
      { upsert: true, new: true, runValidators: true }
    );
    console.log(`🍲 Plato ${p.code} verificado (sin receta por ahora)`);
  }

  console.log('\n✅ Seed demo completado (upsert, nada existente fue borrado)');
  await mongoose.disconnect();
  process.exit(0);
}

seed().catch((err) => {
  console.error('❌ Error en seed:', err.message);
  process.exit(1);
});
