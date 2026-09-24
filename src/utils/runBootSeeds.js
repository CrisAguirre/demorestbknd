// Auto-ejecución segura de datos iniciales al arrancar el servidor.
//
// - Solo corre scripts de la LISTA PERMITIDA (todos idempotentes/upsert).
//   NUNCA incluir aquí seeds destructivos (p.ej. seedMenu.js con deleteMany).
// - Se ejecuta UNA sola vez: avanza Settings.seedVersion y en los siguientes
//   arranques (p.ej. Render duerme/despierta el servicio) no hace nada.
// - Un fallo NUNCA tumba el servidor: se registra en log y continúa.
//
// Para agregar un futuro seed: súbelo a PASOS con su versión y aumenta
// CURRENT_SEED_VERSION en +1.
const Settings = require('../models/Settings');
const Sale = require('../models/Sale');
const { seedRecetasData } = require('./seedRecetasDemo');
const { seedBarraData } = require('./seedBarraDemo');

const CURRENT_SEED_VERSION = 2;

async function backfillStockDeducted(log) {
  // Ventas pendientes creadas con el código anterior YA descontaron stock
  // al registrarse: se marcan para que pay() no las descuente de nuevo.
  const r = await Sale.updateMany(
    { status: 'pendiente', stockDeducted: { $ne: true } },
    { $set: { stockDeducted: true } }
  );
  (log || console).log(`[boot-seeds] ventas pendientes marcadas: ${r.modifiedCount || 0}`);
}

async function migrarPostPago(log) {
  // Toda la operación es post-pago: las configs viejas en pre-pago pasan a post-pago.
  const r = await Settings.updateMany(
    { paymentMode: 'pre-pago' },
    { $set: { paymentMode: 'post-pago' } }
  );
  (log || console).log(`[boot-seeds] configs a post-pago: ${r.modifiedCount || 0}`);
}

const PASOS = [
  { version: 1, nombre: 'backfill-stockdeducted', fn: backfillStockDeducted },
  { version: 1, nombre: 'seed-recetas-demo', fn: seedRecetasData },
  { version: 1, nombre: 'seed-barra-demo', fn: seedBarraData },
  { version: 2, nombre: 'migrar-post-pago', fn: migrarPostPago },
];

async function runBootSeeds(log) {
  const logger = log || console;
  const settings = await Settings.getSettings();
  const actual = settings.seedVersion || 0;
  if (actual >= CURRENT_SEED_VERSION) return { ran: false, version: actual };

  logger.log(`[boot-seeds] versión actual ${actual}, aplicando hasta ${CURRENT_SEED_VERSION}...`);
  for (const paso of PASOS.filter((p) => p.version > actual && p.version <= CURRENT_SEED_VERSION)) {
    logger.log(`[boot-seeds] ejecutando: ${paso.nombre}`);
    await paso.fn(logger);
  }
  settings.seedVersion = CURRENT_SEED_VERSION;
  await settings.save();
  logger.log(`[boot-seeds] completado. seedVersion=${CURRENT_SEED_VERSION}`);
  return { ran: true, version: CURRENT_SEED_VERSION };
}

module.exports = { runBootSeeds, CURRENT_SEED_VERSION };
