// Actualización colombiana del área Barra (v4).
// - Renombra BB-001 (Pisco → Ron Viejo de Caldas) con $set (el seed v1 usaba $setOnInsert).
// - Agrega 4 insumos de coctelería colombiana (BB-015..018).
// Idempotente: re-ejecutable sin duplicar.
//
// Uso: node src/utils/seedBarraColombia.js   (requiere .env con MONGODB_URI)
require('dotenv').config();
const mongoose = require('mongoose');
const Ingredient = require('../models/Ingredient');

const RENOMBRES = [
  { code: 'BB-001', name: 'Ron Viejo de Caldas 750ml' },
];

const NUEVOS = [
  { code: 'BB-015', name: 'Panela para coctelería', unit: 'kg', area: 'barra', ubicacion: 'Barra', stock: 3, minStock: 1, cost: 0 },
  { code: 'BB-016', name: 'Limón tahití', unit: 'kg', area: 'barra', ubicacion: 'Refrigerador barra', stock: 2, minStock: 1, cost: 0 },
  { code: 'BB-017', name: 'Lulo', unit: 'kg', area: 'barra', ubicacion: 'Refrigerador barra', stock: 2, minStock: 1, cost: 0 },
  { code: 'BB-018', name: 'Maracuyá', unit: 'kg', area: 'barra', ubicacion: 'Refrigerador barra', stock: 2, minStock: 1, cost: 0 },
];

async function seedBarraColombiaData() {
  for (const r of RENOMBRES) {
    await Ingredient.findOneAndUpdate(
      { code: r.code },
      { $set: { name: r.name } },
      { runValidators: true }
    );
  }
  console.log(`🍹 Barra: ${RENOMBRES.length} nombre(s) actualizado(s)`);

  for (const item of NUEVOS) {
    await Ingredient.findOneAndUpdate(
      { code: item.code },
      { $setOnInsert: item },
      { upsert: true, new: true, runValidators: true }
    );
  }
  console.log(`🍹 Barra: ${NUEVOS.length} insumo(s) verificados (sin duplicar)`);

  console.log('\n✅ Seed barra colombia completado');
  return { renombres: RENOMBRES.length, nuevos: NUEVOS.length };
}

module.exports = { seedBarraColombiaData };

// CLI: node src/utils/seedBarraColombia.js (requiere .env con MONGODB_URI)
if (require.main === module) {
  (async () => {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Conectado a MongoDB');
    await seedBarraColombiaData();
    await mongoose.disconnect();
    process.exit(0);
  })().catch((err) => {
    console.error('❌ Error en seed:', err.message);
    process.exit(1);
  });
}
