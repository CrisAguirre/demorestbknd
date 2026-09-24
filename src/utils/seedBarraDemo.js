// Carga los 20 ítems demo del área Barra (los mismos del listado de ejemplo).
// Usa UPSERT por código: no borra nada existente ni duplica.
// Stocks y costos de demostración: reemplázalos con conteo y costos reales.
//
// Uso: node src/utils/seedBarraDemo.js   (requiere .env con MONGODB_URI)
require('dotenv').config();
const mongoose = require('mongoose');
const Ingredient = require('../models/Ingredient');

const items = [
  { code: 'BB-001', name: 'Pisco quebranta 750ml', unit: 'botella', ubicacion: 'Cava', stock: 6, minStock: 4, cost: 0, area: 'barra' },
  { code: 'BB-002', name: 'Vino blanco seco 750ml', unit: 'botella', ubicacion: 'Cava', stock: 2, minStock: 4, cost: 0, area: 'barra' },
  { code: 'BB-004', name: 'Aguardiente anisado 750ml', unit: 'botella', ubicacion: 'Cava', stock: 5, minStock: 3, cost: 0, area: 'barra' },
  { code: 'BB-008', name: 'Vino tinto 750ml', unit: 'botella', ubicacion: 'Cava', stock: 3, minStock: 3, cost: 0, area: 'barra' },
  { code: 'BB-009', name: 'Ron añejo 750ml', unit: 'botella', ubicacion: 'Cava', stock: 1, minStock: 2, cost: 0, area: 'barra' },
  { code: 'BB-003', name: 'Cerveza lager 330ml', unit: 'caja', ubicacion: 'Nevera barra', stock: 10, minStock: 6, cost: 0, area: 'barra' },
  { code: 'BB-010', name: 'Cerveza artesanal 330ml', unit: 'caja', ubicacion: 'Nevera barra', stock: 4, minStock: 4, cost: 0, area: 'barra' },
  { code: 'BB-005', name: 'Agua sin gas 600ml', unit: 'caja', ubicacion: 'Bodega', stock: 8, minStock: 8, cost: 0, area: 'barra' },
  { code: 'BB-006', name: 'Agua con gas 330ml', unit: 'caja', ubicacion: 'Bodega', stock: 4, minStock: 6, cost: 0, area: 'barra' },
  { code: 'BB-007', name: 'Gaseosa lima-limón 350ml', unit: 'caja', ubicacion: 'Nevera barra', stock: 7, minStock: 5, cost: 0, area: 'barra' },
  { code: 'BB-011', name: 'Jugo de naranja 1L', unit: 'caja', ubicacion: 'Refrigerador barra', stock: 5, minStock: 4, cost: 0, area: 'barra' },
  { code: 'BB-012', name: 'Agua tónica 200ml', unit: 'caja', ubicacion: 'Nevera barra', stock: 6, minStock: 3, cost: 0, area: 'barra' },
  { code: 'BB-013', name: 'Café en grano', unit: 'kg', ubicacion: 'Barra', stock: 2, minStock: 1, cost: 0, area: 'barra' },
  { code: 'BB-014', name: 'Leche entera 1L', unit: 'caja', ubicacion: 'Refrigerador barra', stock: 3, minStock: 4, cost: 0, area: 'barra' },
  { code: 'BI-001', name: 'Clara de huevo pasteurizada', unit: 'litro', ubicacion: 'Refrigerador 1', stock: 1, minStock: 2, cost: 0, area: 'barra' },
  { code: 'BI-002', name: 'Amargo aromático (bitters)', unit: 'botella', ubicacion: 'Barra', stock: 3, minStock: 1, cost: 0, area: 'barra' },
  { code: 'BI-003', name: 'Hielo en cubos', unit: 'kg', ubicacion: 'Congelador', stock: 15, minStock: 10, cost: 0, area: 'barra' },
  { code: 'BI-004', name: 'Azúcar refinada', unit: 'kg', ubicacion: 'Barra', stock: 2, minStock: 1, cost: 0, area: 'barra' },
  { code: 'BI-005', name: 'Granadina', unit: 'botella', ubicacion: 'Barra', stock: 1, minStock: 1, cost: 0, area: 'barra' },
  { code: 'BI-006', name: 'Menta fresca para coctelería', unit: 'atado', ubicacion: 'Refrigerador barra', stock: 4, minStock: 3, cost: 0, area: 'barra' },
];

async function seed() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('✅ Conectado a MongoDB');

  let creados = 0;
  for (const item of items) {
    const r = await Ingredient.findOneAndUpdate(
      { code: item.code },
      { $setOnInsert: item },
      { upsert: true, runValidators: true }
    );
    if (r && r.createdAt && r.updatedAt && r.createdAt.getTime() === r.updatedAt.getTime()) creados += 1;
  }
  console.log(`🍹 Barra: ${items.length} ítems verificados (${creados} nuevos, resto intactos)`);
  console.log('\n✅ Seed completado (upsert, nada existente fue borrado ni modificado)');

  await mongoose.disconnect();
  process.exit(0);
}

seed().catch((err) => {
  console.error('❌ Error en seed:', err.message);
  process.exit(1);
});
