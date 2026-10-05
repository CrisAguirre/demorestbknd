// Categoría de submenú de inventario por código de insumo.
//
// Los seeds asignan `categoria` al crear y rellenan el campo en documentos
// existentes que no lo tengan (sin pisar ediciones del usuario ni el stock).
// Cocina/Barra/Servicio usan la misma tabla para mostrar y para generar
// el siguiente código libre por categoría.
//
// Uso:
//   const { rellenarCategorias } = require('./categoriaInsumos');
//   await rellenarCategorias([{ code: 'CP-001', categoria: 'Proteínas' }]);
const Ingredient = require('../models/Ingredient');

async function rellenarCategorias(lista, log) {
  let rellenados = 0;
  for (const item of lista) {
    if (item.code && item.categoria) {
      const r = await Ingredient.updateOne(
        { code: item.code, $or: [{ categoria: { $exists: false } }, { categoria: '' }] },
        { $set: { categoria: item.categoria } }
      );
      rellenados += r.modifiedCount || 0;
    }
  }
  (log || console).log(`🏷️ Categorías de insumos rellenadas: ${rellenados} de ${lista.length} códigos`);
  return { rellenados, total: lista.length };
}

module.exports = { rellenarCategorias };
