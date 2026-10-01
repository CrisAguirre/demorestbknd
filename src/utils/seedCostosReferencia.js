// Costos de REFERENCIA por insumo (COP por unidad g/ml/unidad).
// Valores estimados 2026 para costear recetas en el menú Platos.
// Se ajustan en Insumos o al comprar con updateCost. NO son costos auditados.
// Solo actualiza el campo cost; no toca nada más. Idempotente.
//
// Uso: node src/utils/seedCostosReferencia.js   (requiere .env con MONGODB_URI)
require('dotenv').config();
const mongoose = require('mongoose');
const Ingredient = require('../models/Ingredient');

const COSTOS = {
  'CP-001': 45,
  'CP-002': 18,
  'CP-003': 22,
  'CP-004': 38,
  'CP-005': 30,
  'CP-006': 65,
  'CP-007': 500,
  'CF-001': 12,
  'CF-002': 4,
  'CF-003': 3,
  'CF-004': 40,
  'CF-005': 12,
  'CF-006': 4,
  'CF-007': 10,
  'CF-008': 4,
  'CF-009': 5,
  'CF-011': 12,
  'CF-012': 6,
  'CF-013': 3.5,
  'CF-014': 60,
  'CF-015': 45,
  'CF-016': 3,
  'CF-017': 2.5,
  'CF-018': 2.5,
  'CF-019': 8,
  'CF-020': 4,
  'CF-021': 8,
  'CF-022': 15,
  'CF-023': 4,
  'CL-001': 12,
  'CL-002': 18,
  'CL-003': 25,
  'CL-004': 4,
  'CA-001': 2,
  'CA-002': 100,
  'CA-003': 15,
  'CA-004': 4,
  'CA-008': 3.5,
  'CA-009': 3,
  'CA-012': 9,
  'CA-013': 4.5,
  'CA-014': 4,
  'CA-015': 15,
  'CA-016': 8,
  'CA-017': 6,
  'CA-018': 120,
  'CA-019': 15,
  'CA-020': 9,
  'CA-021': 100,
  'CA-022': 24,
  'CA-023': 6,
  'CA-024': 4,
  'CA-025': 6,
  'CA-026': 15,
  'BI-003': 1,
};

async function seedCostosReferenciaData(log) {
  const logger = log || console;
  let aplicados = 0;
  for (const [code, cost] of Object.entries(COSTOS)) {
    const r = await Ingredient.findOneAndUpdate({ code }, { $set: { cost } }, { runValidators: true });
    if (r) aplicados += 1;
  }
  logger.log(`[costos] referencia aplicada a ${aplicados} insumos`);
  return { aplicados };
}

module.exports = { seedCostosReferenciaData, COSTOS };

// CLI: node src/utils/seedCostosReferencia.js (requiere .env con MONGODB_URI)
if (require.main === module) {
  (async () => {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Conectado a MongoDB');
    await seedCostosReferenciaData();
    await mongoose.disconnect();
    process.exit(0);
  })().catch((err) => {
    console.error('❌ Error en seed:', err.message);
    process.exit(1);
  });
}
