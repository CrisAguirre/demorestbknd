// Carta nueva: 15 preparaciones (C1..C15) con receta enlazada.
// Fuente: recetario-carta-15-preparaciones.md (cantidades por porción).
// - Upsert de todos los insumos de las recetas (existentes se conservan).
// - Elimina la carta vieja: platos con código fuera de C1..C15 (RC-01, RP-01).
//   Los platos sin código (carga manual) se conservan.
// - Idempotente: re-ejecutable sin duplicar.
//
// Uso: node src/utils/seedCarta15.js   (requiere .env con MONGODB_URI)
require('dotenv').config();
const mongoose = require('mongoose');
const Ingredient = require('../models/Ingredient');
const Dish = require('../models/Dish');

const ingredientes = [
  // Ya existentes en el catálogo (se verifican, no se pisan)
  { code: 'CP-001', name: 'Filete de pescado blanco', unit: 'g', area: 'cocina', ubicacion: 'Refrigerador 1', stock: 5000, minStock: 500, cost: 0 },
  { code: 'CF-001', name: 'Uvilla', unit: 'g', area: 'cocina', ubicacion: 'Refrigerador 1', stock: 2000, minStock: 300, cost: 0 },
  { code: 'CF-002', name: 'Limón tahití', unit: 'g', area: 'cocina', ubicacion: 'Refrigerador 2', stock: 3000, minStock: 500, cost: 0 },
  { code: 'CF-003', name: 'Cebolla roja', unit: 'g', area: 'cocina', ubicacion: 'Bodega', stock: 2000, minStock: 300, cost: 0 },
  { code: 'CF-004', name: 'Ají limo', unit: 'g', area: 'cocina', ubicacion: 'Refrigerador 2', stock: 500, minStock: 100, cost: 0 },
  { code: 'CF-005', name: 'Ajo', unit: 'g', area: 'cocina', ubicacion: 'Bodega', stock: 500, minStock: 100, cost: 0 },
  { code: 'CF-006', name: 'Apio', unit: 'g', area: 'cocina', ubicacion: 'Refrigerador 2', stock: 500, minStock: 100, cost: 0 },
  { code: 'CF-007', name: 'Cilantro', unit: 'g', area: 'cocina', ubicacion: 'Refrigerador 2', stock: 500, minStock: 100, cost: 0 },
  { code: 'CF-008', name: 'Camote', unit: 'g', area: 'cocina', ubicacion: 'Bodega', stock: 3000, minStock: 500, cost: 0 },
  { code: 'CF-009', name: 'Choclo', unit: 'g', area: 'cocina', ubicacion: 'Refrigerador 2', stock: 3000, minStock: 500, cost: 0 },
  { code: 'CF-011', name: 'Hierbabuena', unit: 'g', area: 'cocina', ubicacion: 'Refrigerador 2', stock: 300, minStock: 50, cost: 0 },
  { code: 'CL-001', name: 'Crema de leche', unit: 'ml', area: 'cocina', ubicacion: 'Refrigerador 3', stock: 2000, minStock: 400, cost: 0 },
  { code: 'CL-002', name: 'Cuajada fresca', unit: 'g', area: 'cocina', ubicacion: 'Refrigerador 3', stock: 1500, minStock: 300, cost: 0 },
  { code: 'CL-003', name: 'Mantequilla sin sal', unit: 'g', area: 'cocina', ubicacion: 'Refrigerador 3', stock: 1000, minStock: 200, cost: 0 },
  { code: 'CA-001', name: 'Sal', unit: 'g', area: 'cocina', ubicacion: 'Bodega', stock: 2000, minStock: 200, cost: 0 },
  { code: 'CA-002', name: 'Pimienta blanca molida', unit: 'g', area: 'cocina', ubicacion: 'Bodega', stock: 200, minStock: 50, cost: 0 },
  { code: 'CA-003', name: 'Cancha serrana', unit: 'g', area: 'cocina', ubicacion: 'Bodega', stock: 1000, minStock: 200, cost: 0 },
  { code: 'CA-004', name: 'Panela', unit: 'g', area: 'cocina', ubicacion: 'Bodega', stock: 2000, minStock: 300, cost: 0 },
  { code: 'CA-008', name: 'Azúcar blanca', unit: 'g', area: 'cocina', ubicacion: 'Bodega', stock: 2000, minStock: 300, cost: 0 },
  { code: 'CA-009', name: 'Harina de trigo', unit: 'g', area: 'cocina', ubicacion: 'Bodega', stock: 2000, minStock: 300, cost: 0 },
  // Proteínas de la carta
  { code: 'CP-002', name: 'Pechuga de pollo', unit: 'g', area: 'cocina', ubicacion: 'Refrigerador 1', stock: 4000, minStock: 1000, cost: 0 },
  { code: 'CP-003', name: 'Gallina criolla', unit: 'g', area: 'cocina', ubicacion: 'Refrigerador 1', stock: 4000, minStock: 1000, cost: 0 },
  { code: 'CP-004', name: 'Carne de res (posta)', unit: 'g', area: 'cocina', ubicacion: 'Refrigerador 1', stock: 4000, minStock: 1000, cost: 0 },
  { code: 'CP-005', name: 'Tocino de cerdo (chicharrón)', unit: 'g', area: 'cocina', ubicacion: 'Refrigerador 1', stock: 3000, minStock: 800, cost: 0 },
  { code: 'CP-006', name: 'Camarón', unit: 'g', area: 'cocina', ubicacion: 'Refrigerador 1', stock: 2000, minStock: 500, cost: 0 },
  { code: 'CP-007', name: 'Huevo', unit: 'unidades', area: 'cocina', ubicacion: 'Refrigerador 3', stock: 60, minStock: 24, cost: 0 },
  // Verduras y tubérculos de la carta
  { code: 'CF-012', name: 'Papa criolla', unit: 'g', area: 'cocina', ubicacion: 'Bodega', stock: 3000, minStock: 800, cost: 0 },
  { code: 'CF-013', name: 'Papa pastusa', unit: 'g', area: 'cocina', ubicacion: 'Bodega', stock: 3000, minStock: 800, cost: 0 },
  { code: 'CF-014', name: 'Guascas', unit: 'g', area: 'cocina', ubicacion: 'Refrigerador 2', stock: 200, minStock: 60, cost: 0 },
  { code: 'CF-015', name: 'Alcaparras', unit: 'g', area: 'cocina', ubicacion: 'Bodega', stock: 300, minStock: 100, cost: 0 },
  { code: 'CF-016', name: 'Plátano maduro', unit: 'g', area: 'cocina', ubicacion: 'Bodega', stock: 2000, minStock: 600, cost: 0 },
  { code: 'CF-017', name: 'Plátano verde', unit: 'g', area: 'cocina', ubicacion: 'Bodega', stock: 2000, minStock: 600, cost: 0 },
  { code: 'CF-018', name: 'Yuca', unit: 'g', area: 'cocina', ubicacion: 'Bodega', stock: 2500, minStock: 600, cost: 0 },
  { code: 'CF-019', name: 'Pimentón rojo', unit: 'g', area: 'cocina', ubicacion: 'Refrigerador 2', stock: 800, minStock: 300, cost: 0 },
  // Extras (*) de la carta
  { code: 'CF-020', name: 'Tomate', unit: 'g', area: 'cocina', ubicacion: 'Bodega', stock: 2000, minStock: 500, cost: 0 },
  { code: 'CF-021', name: 'Aguacate', unit: 'g', area: 'cocina', ubicacion: 'Refrigerador 2', stock: 1000, minStock: 300, cost: 0 },
  { code: 'CF-022', name: 'Perejil', unit: 'g', area: 'cocina', ubicacion: 'Refrigerador 2', stock: 150, minStock: 60, cost: 0 },
  { code: 'CF-023', name: 'Papa sabanera', unit: 'g', area: 'cocina', ubicacion: 'Bodega', stock: 2500, minStock: 700, cost: 0 },
  { code: 'CA-012', name: 'Fríjol cargamanto', unit: 'g', area: 'cocina', ubicacion: 'Bodega', stock: 3000, minStock: 800, cost: 0 },
  { code: 'CA-013', name: 'Arroz blanco', unit: 'g', area: 'cocina', ubicacion: 'Bodega', stock: 5000, minStock: 1000, cost: 0 },
  { code: 'CA-014', name: 'Harina de maíz precocida', unit: 'g', area: 'cocina', ubicacion: 'Bodega', stock: 2000, minStock: 500, cost: 0 },
  { code: 'CA-015', name: 'Leche de coco', unit: 'ml', area: 'cocina', ubicacion: 'Bodega', stock: 1500, minStock: 400, cost: 0 },
  { code: 'CA-016', name: 'Aceite vegetal', unit: 'ml', area: 'cocina', ubicacion: 'Bodega', stock: 3000, minStock: 800, cost: 0 },
  { code: 'CA-017', name: 'Pan rallado', unit: 'g', area: 'cocina', ubicacion: 'Bodega', stock: 1000, minStock: 300, cost: 0 },
  { code: 'CA-018', name: 'Comino molido', unit: 'g', area: 'cocina', ubicacion: 'Bodega', stock: 150, minStock: 50, cost: 0 },
  { code: 'CA-019', name: 'Maní tostado', unit: 'g', area: 'cocina', ubicacion: 'Bodega', stock: 800, minStock: 200, cost: 0 },
  { code: 'CA-020', name: 'Cerveza negra', unit: 'ml', area: 'cocina', ubicacion: 'Bodega', stock: 1000, minStock: 300, cost: 0 },
  { code: 'CA-021', name: 'Salsa Worcestershire', unit: 'ml', area: 'cocina', ubicacion: 'Bodega', stock: 300, minStock: 100, cost: 0 },
  { code: 'CA-022', name: 'Salsa de soya', unit: 'ml', area: 'cocina', ubicacion: 'Bodega', stock: 500, minStock: 150, cost: 0 },
  { code: 'CA-023', name: 'Vinagre blanco', unit: 'ml', area: 'cocina', ubicacion: 'Bodega', stock: 500, minStock: 150, cost: 0 },
  { code: 'CA-024', name: 'Caldo de pollo', unit: 'ml', area: 'cocina', ubicacion: 'Bodega', stock: 2000, minStock: 500, cost: 0 },
  { code: 'CA-025', name: 'Fumet de pescado', unit: 'ml', area: 'cocina', ubicacion: 'Refrigerador 1', stock: 1500, minStock: 400, cost: 0 },
  { code: 'CA-026', name: 'Mayonesa', unit: 'g', area: 'cocina', ubicacion: 'Refrigerador 3', stock: 500, minStock: 150, cost: 0 },
  { code: 'CL-004', name: 'Leche entera', unit: 'ml', area: 'cocina', ubicacion: 'Refrigerador 3', stock: 2000, minStock: 500, cost: 0 },
  { code: 'BI-003', name: 'Hielo en cubos', unit: 'g', area: 'cocina', ubicacion: 'Refrigerador 1', stock: 5000, minStock: 1000, cost: 0 },
];
const platos = [
  {
    code: 'C1',
name: 'Ceviche de pescado blanco',
category: 'Entradas',
price: 28000,
    description: 'Ceviche peruano de autor con leche de tigre de ají limo, camote, choclo y cancha.',
    preparation: '1) Licuar limón, apio, ajo, ají, sal y hielo; colar (leche de tigre). 2) Cubos de pescado 2 cm con la leche y cebolla en juliana. 3) Reposar 2 min y servir con camote, choclo y cancha.',
    receta: [['CP-001', 120], ['CF-002', 60], ['CF-003', 20], ['CF-004', 5], ['CF-007', 5], ['CF-006', 10], ['CF-005', 2], ['CA-001', 2], ['CF-008', 40], ['CF-009', 30], ['CA-003', 10], ['BI-003', 30]],
  },
  {
    code: 'C2',
name: 'Empanadas de maíz con carne',
category: 'Entradas',
price: 14000,
    description: 'Empanadas de maíz rellenas de posta con papa, hogao y ají de uvilla.',
    preparation: '1) Cocer y desmechar la posta; saltear con hogao y papa. 2) Armar la masa con panela, rellenar y freír a 175 °C. 3) Ají: triturar uvilla con ají y cilantro; cocinar con limón y azúcar.',
    receta: [['CA-014', 60], ['CA-001', 1], ['CA-004', 3], ['CP-004', 50], ['CF-012', 20], ['CF-003', 10], ['CF-005', 2], ['CF-019', 10], ['CA-018', 0.5], ['CF-001', 40], ['CF-004', 5], ['CF-007', 3], ['CF-002', 5], ['CA-008', 3], ['CA-016', 10]],
  },
  {
    code: 'C3',
name: 'Tostones con camarones al coco',
category: 'Entradas',
price: 24000,
    description: 'Patacones con camarones sellados en salsa de coco, mantequilla y limón.',
    preparation: '1) Doble fritura del plátano verde. 2) Sofreír en mantequilla cebolla, ajo y pimentón. 3) Sellar camarones, agregar coco, reducir y terminar con limón y cilantro.',
    receta: [['CF-017', 100], ['CP-006', 80], ['CA-015', 40], ['CF-003', 15], ['CF-005', 3], ['CF-019', 15], ['CF-004', 3], ['CF-007', 3], ['CF-002', 5], ['CL-003', 10], ['CA-016', 10]],
  },
  {
    code: 'C4',
name: 'Crema de choclo con cuajada',
category: 'Entradas',
price: 16000,
    description: 'Crema sedosa de choclo con cuajada, chips de papa criolla y hierbabuena.',
    preparation: '1) Sofreír cebolla, ajo y apio en mantequilla. 2) Cocer el choclo en caldo 20 min. 3) Licuar con crema, colar y servir con cuajada, chips e hierbabuena.',
    receta: [['CF-009', 150], ['CF-003', 30], ['CF-005', 3], ['CF-006', 15], ['CL-003', 15], ['CL-001', 40], ['CA-001', 2], ['CA-002', 0.3], ['CA-024', 200], ['CL-002', 25], ['CF-012', 30], ['CF-011', 2]],
  },
  {
    code: 'C5',
name: 'Croquetas de gallina criolla',
category: 'Entradas',
price: 18000,
    description: 'Croquetas de gallina con bechamel, apanadas, y mayonesa de ají limo.',
    preparation: '1) Bechamel espesa con gallina y cebolla; enfriar y formar. 2) Apanar con harina, huevo y pan rallado; freír. 3) Emulsionar yema, limón, ají y aceite.',
    receta: [['CP-003', 60], ['CL-003', 15], ['CA-009', 20], ['CL-004', 100], ['CF-003', 10], ['CA-001', 1], ['CA-002', 0.2], ['CP-007', 1.5], ['CA-017', 25], ['CF-002', 5], ['CF-004', 3], ['CA-016', 40]],
  },
  {
    code: 'C6',
name: 'Causa de pechuga con alcaparras',
category: 'Entradas',
price: 20000,
    description: 'Causa limeña en capas con pechuga, mayonesa, alcaparras, huevo y aguacate.',
    preparation: '1) Prensar la papa cocida y amasar con limón, ají, aceite y sal. 2) Mezclar pechuga con mayonesa, apio, cebolla y alcaparras. 3) Armar en capas y decorar.',
    receta: [['CF-013', 150], ['CF-002', 15], ['CF-004', 5], ['CA-016', 10], ['CA-001', 2], ['CP-002', 60], ['CA-026', 25], ['CF-006', 10], ['CF-003', 10], ['CF-015', 5], ['CP-007', 0.5], ['CF-021', 20]],
  },
  {
    code: 'C7',
name: 'Ajiaco santafereño',
category: 'Sopas',
price: 32000,
    description: 'Sopa insignia bogotana con tres papas, pollo, guascas, crema y alcaparras. Arroz aparte.',
    preparation: '1) Cocer la pechuga con cebolla y ajo. 2) Agregar papas en orden de dureza y guascas. 3) Espesar con la pastusa; servir con crema, alcaparras, aguacate y arroz.',
    receta: [['CP-002', 180], ['CF-013', 100], ['CF-012', 60], ['CF-023', 100], ['CF-009', 80], ['CF-014', 3], ['CF-003', 20], ['CF-005', 3], ['CA-001', 3], ['CA-002', 0.3], ['CL-001', 30], ['CF-015', 8], ['CF-021', 30], ['CA-013', 80]],
  },
  {
    code: 'C8',
name: 'Encocado de pescado',
category: 'Platos fuertes',
price: 36000,
    description: 'Pescado del Pacífico en salsa de coco con arroz de coco y plátano maduro.',
    preparation: '1) Sazonar el pescado con sal, ajo y limón. 2) Hogao con coco hasta espesar; pochar el pescado 6 min. 3) Arroz con coco y panela; plátano frito.',
    receta: [['CP-001', 200], ['CA-001', 3], ['CF-002', 10], ['CF-005', 3], ['CA-015', 180], ['CF-003', 25], ['CF-019', 20], ['CF-007', 5], ['CF-004', 3], ['CA-013', 80], ['CA-004', 5], ['CF-016', 60]],
  },
  {
    code: 'C9',
name: 'Posta negra cartagenera',
category: 'Platos fuertes',
price: 38000,
    description: 'Posta caramelizada en panela, cerveza negra y Worcestershire, con arroz y plátano.',
    preparation: '1) Sellar la posta. 2) Sofreír y caramelizar panela con cerveza, Worcestershire y caldo. 3) Cocinar tapada 2-3 h; napar con la salsa reducida.',
    receta: [['CP-004', 220], ['CA-004', 20], ['CA-001', 3], ['CF-005', 4], ['CF-003', 30], ['CF-006', 15], ['CA-020', 100], ['CA-021', 15], ['CA-018', 1], ['CA-024', 200], ['CA-013', 100], ['CF-016', 80], ['CL-003', 10]],
  },
  {
    code: 'C10',
name: 'Fríjolada cargamanto',
category: 'Platos fuertes',
price: 30000,
    description: 'Fríjoles espesos con hogao, chicharrón crocante, arroz, plátano, huevo y aguacate.',
    preparation: '1) Cocer el fríjol remojado con hogao hasta espesar. 2) Chicharrón lento hasta dorar. 3) Freír plátano y huevo; servir con arroz y aguacate.',
    receta: [['CA-012', 120], ['CF-003', 25], ['CF-005', 4], ['CF-019', 15], ['CA-001', 3], ['CF-020', 30], ['CP-005', 100], ['CA-013', 80], ['CF-016', 70], ['CP-007', 1], ['CF-021', 30]],
  },
  {
    code: 'C11',
name: 'Gallina criolla en salsa de ají de maní',
category: 'Platos fuertes',
price: 34000,
    description: 'Gallina pastusa nappada en crema de maní y ají, con papa criolla y arroz.',
    preparation: '1) Cocer la gallina con verduras. 2) Triturar maní con ají y caldo; cocinar 10 min. 3) Terminar con crema y servir con papa y arroz.',
    receta: [['CP-003', 250], ['CA-001', 3], ['CF-005', 4], ['CF-003', 30], ['CF-006', 15], ['CA-019', 40], ['CA-024', 150], ['CF-004', 5], ['CL-001', 30], ['CF-012', 120], ['CA-013', 80]],
  },
  {
    code: 'C12',
name: 'Piccata de pechuga',
category: 'Platos fuertes',
price: 36000,
    description: 'Medallones de pollo en salsa de limón y alcaparras con puré cremoso de yuca.',
    preparation: '1) Sazonar, enharinar y sellar en mantequilla. 2) Salsa con ajo, limón, caldo y alcaparras; montar con mantequilla fría. 3) Puré de yuca con mantequilla y crema.',
    receta: [['CP-002', 200], ['CA-009', 25], ['CA-001', 5], ['CA-002', 0.5], ['CL-003', 50], ['CF-002', 40], ['CF-015', 15], ['CF-005', 3], ['CA-024', 80], ['CF-022', 3], ['CF-018', 180], ['CL-001', 30]],
  },
  {
    code: 'C13',
name: 'Arroz meloso de camarón',
category: 'Platos fuertes',
price: 38000,
    description: 'Arroz cremoso con camarones, choclo, mantequilla y crema, coronado con limón.',
    preparation: '1) Sofrito y nacarado del arroz; caldar poco a poco con fumet. 2) Sellar camarones aparte. 3) Terminar con mantequilla, crema, choclo y limón.',
    receta: [['CA-013', 100], ['CP-006', 120], ['CF-009', 40], ['CF-003', 25], ['CF-005', 4], ['CF-019', 25], ['CF-004', 3], ['CF-007', 5], ['CA-025', 350], ['CL-003', 20], ['CL-001', 30], ['CF-002', 10], ['CA-001', 3]],
  },
  {
    code: 'C14',
name: 'Filete en costra de plátano verde',
category: 'Platos fuertes',
price: 40000,
    description: 'Pescado en costra crocante de plátano con salsa de alcaparras y bastones de yuca.',
    preparation: '1) Apanar con harina, huevo y plátano rallado; freír a 170 °C. 2) Salsa: ajo, fumet, limón, alcaparras y crema. 3) Yuca en bastones fritos.',
    receta: [['CP-001', 180], ['CA-001', 3], ['CA-002', 0.3], ['CA-009', 15], ['CP-007', 0.5], ['CF-017', 60], ['CL-003', 15], ['CF-005', 3], ['CF-015', 10], ['CF-002', 20], ['CL-001', 40], ['CA-025', 50], ['CF-007', 3], ['CF-018', 120], ['CA-016', 60]],
  },
  {
    code: 'C15',
name: 'Lomo saltado de posta',
category: 'Platos fuertes',
price: 36000,
    description: 'Salteado chifa con soya, papas fritas, verduras al wok y arroz blanco.',
    preparation: '1) Marinar tiras de posta con soya, ajo y pimienta; freír papas. 2) Saltear a fuego alto con verduras y ají. 3) Deglasar, sumar papas y cilantro; servir con arroz.',
    receta: [['CP-004', 200], ['CF-003', 50], ['CF-019', 40], ['CF-020', 50], ['CF-004', 4], ['CF-005', 4], ['CA-022', 25], ['CA-023', 10], ['CF-007', 4], ['CA-001', 2], ['CA-002', 0.5], ['CF-013', 150], ['CA-016', 80], ['CA-013', 100]],
  },
];

const NUEVOS = platos.map((p) => p.code);

async function seedCarta15Data() {
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
    const receta = p.receta
      .map(([code, quantity]) => ({ ingredient: mapa[code], quantity }))
      .filter((i) => i.ingredient);
    if (receta.length !== p.receta.length) {
      console.log(`⚠️ Plato ${p.code}: ${p.receta.length - receta.length} insumo(s) sin código, se omiten`);
    }
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
          ingredients: receta,
        },
        $setOnInsert: { code: p.code },
      },
      { upsert: true, new: true, runValidators: true }
    );
    console.log(`🍲 Plato ${p.code} ${p.name} verificado (${receta.length} insumos)`);
  }

  // Limpieza total de carta vieja: elimina TODO plato fuera de C1..C15,
  // incluidos los manuales sin código. Solo sobrevive la carta nueva.
  const fuera = await Dish.deleteMany({ $or: [{ code: { $nin: NUEVOS } }, { code: { $exists: false } }] });
  console.log(`🧹 Carta vieja eliminada: ${fuera.deletedCount || 0} plato(s) con código fuera de C1..C15`);

  console.log('\n✅ Seed carta 15 completado (upsert + limpieza de carta vieja)');
  return { ingredientes: ingredientes.length, platos: platos.length, eliminados: fuera.deletedCount || 0 };
}

// Limpieza total standalone (paso v5 de boot-seeds): elimina TODO plato
// fuera de C1..C15, incluidos manuales sin código. Solo sobrevive la carta nueva.
async function limpiezaTotalCarta() {
  const fuera = await Dish.deleteMany({ $or: [{ code: { $nin: NUEVOS } }, { code: { $exists: false } }] });
  console.log(`🧹 Limpieza total carta: ${fuera.deletedCount || 0} plato(s) viejo(s) eliminado(s)`);
  return { eliminados: fuera.deletedCount || 0 };
}

module.exports = { seedCarta15Data, limpiezaTotalCarta };

// CLI: node src/utils/seedCarta15.js (requiere .env con MONGODB_URI)
if (require.main === module) {
  (async () => {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Conectado a MongoDB');
    await seedCarta15Data();
    await mongoose.disconnect();
    process.exit(0);
  })().catch((err) => {
    console.error('❌ Error en seed:', err.message);
    process.exit(1);
  });
}
