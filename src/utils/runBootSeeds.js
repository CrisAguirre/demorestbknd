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
const { seedRecetasData, categoriasRecetasDemo } = require('./seedRecetasDemo');
const { seedBarraData, categoriasBarraDemo } = require('./seedBarraDemo');
const { seedCarta15Data, repararCarta15Data, limpiezaTotalCarta, categoriasCarta15 } = require('./seedCarta15');
const { seedBarraColombiaData, categoriasBarraColombia } = require('./seedBarraColombia');
const { seedCostosReferenciaData } = require('./seedCostosReferencia');
const { rellenarCategorias } = require('./categoriaInsumos');

const CURRENT_SEED_VERSION = 8;

async function backfillStockDeducted(log) {
  // Ventas pendientes creadas con el código anterior YA descontaron stock
  // al registrarse: se marcan para que pay() no las descuente de nuevo.
  const r = await Sale.updateMany(
    { status: 'pendiente', stockDeducted: { $ne: true } },
    { $set: { stockDeducted: true } }
  );
  (log || console).log(`[boot-seeds] ventas pendientes marcadas: ${r.modifiedCount || 0}`);
}

async function rellenarCategoriasInsumos(log) {
  // v7: los insumos ya existían sin categoría. Se rellena desde los seeds
  // (solo donde falta, sin pisar ediciones del usuario, stock ni nombres).
  const lista = [
    ...categoriasRecetasDemo,
    ...categoriasBarraDemo,
    ...categoriasCarta15,
    ...categoriasBarraColombia,
  ];
  await rellenarCategorias(lista, log);
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
  // seed-carta-15 incluye deleteMany ACOTADO a códigos fuera de C1..C15 (carta vieja, orden explícita).
  { version: 3, nombre: 'seed-carta-15', fn: seedCarta15Data },
  { version: 4, nombre: 'seed-barra-colombia', fn: seedBarraColombiaData },
  // v5: la limpieza total del PR #7 quedó con versión 4 y nunca se ejecutó en prod.
  { version: 5, nombre: 'limpieza-total-carta', fn: limpiezaTotalCarta },
  { version: 6, nombre: 'costos-referencia', fn: seedCostosReferenciaData },
  { version: 7, nombre: 'categorias-insumos', fn: rellenarCategoriasInsumos },
  // v8: repara recetas C1..C15 tras borrados manuales SIN pisar ediciones del
  // usuario (p.ej. porcionado en unidades de 100g). Solo re-enlaza por código
  // los _id vigentes cuando la receta está vacía o apunta a insumos que ya no
  // existen (borrado y recreado cambia el _id y el cobro no descuenta).
  // Idempotente y seguro de re-ejecutar.
  { version: 8, nombre: 'reparar-carta-15', fn: repararCarta15Data },
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
