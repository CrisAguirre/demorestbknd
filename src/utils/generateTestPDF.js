const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

const doc = new PDFDocument({ margin: 50 });
const outputPath = path.join('C:\\Users\\USUARIO\\Desktop', 'Pruebas_Manuales_Inventarios_Compuestos.pdf');

doc.pipe(fs.createWriteStream(outputPath));

// Header
doc.fontSize(20).font('Helvetica-Bold').text('PRUEBAS MANUALES', { align: 'center' });
doc.fontSize(16).text('Inventarios Compuestos - La Soupe a l\'Oignon', { align: 'center' });
doc.moveDown(2);

// Info
doc.fontSize(10).font('Helvetica');
doc.text(`Fecha: ${new Date().toLocaleDateString('es-CO')}`);
doc.text('Versión API: Backend con transacciones atómicas');
doc.text('Módulo: Inventarios, Platos, Ventas, Ingredientes');
doc.moveDown(2);

// Helper functions
function section(title) {
  doc.fontSize(14).font('Helvetica-Bold').text(title, { underline: true });
  doc.moveDown(0.5);
}

function testCase(id, title, steps, expected) {
  doc.fontSize(11).font('Helvetica-Bold').text(`TEST ${id}: ${title}`);
  doc.fontSize(10).font('Helvetica');
  doc.text('Pasos:');
  steps.forEach((step, i) => {
    doc.text(`  ${i + 1}. ${step}`);
  });
  doc.text('Resultado Esperado:');
  expected.forEach(e => doc.text(`  - ${e}`));
  doc.moveDown(1);
}

function header2(text) {
  doc.fontSize(12).font('Helvetica-Bold').fillColor('darkblue').text(text);
  doc.fillColor('black');
  doc.moveDown(0.3);
}

// SECCIÓN 1: INGREDIENTES
section('1. GESTIÓN DE INGREDIENTES');

testCase('ING-01', 'Crear ingrediente', [
  'Ir a Módulo de Ingredientes',
  'Click en "Nuevo Ingrediente"',
  'Ingresar: Nombre="Harina de Trigo", Unidad="kilos", Stock=50, Costo=5000, Stock Mínimo=10',
  'Guardar'
], [
  'Ingrediente creado exitosamente',
  'Aparece en la lista de ingredientes',
  'Sin alertas generadas (stock > minStock)'
]);

testCase('ING-02', 'Reposición de stock (restock)', [
  'Seleccionar ingrediente "Harina de Trigo"',
  'Click en "Reposición" o "Restock"',
  'Ingresar cantidad: 25',
  'Ingresar descripción: "Reposición semanal"',
  'Guardar'
], [
  'Stock aumenta de 50 a 75',
  'Se registra movimiento en historial',
  'Tipo de movimiento: "adjustment"'
]);

testCase('ING-03', 'Ver historial de movimientos', [
  'Seleccionar ingrediente "Harina de Trigo"',
  'Ir a "Historial de Movimientos"'
], [
  'Se muestran todos los movimientos (sale, purchase, adjustment)',
  'Cada movimiento tiene: tipo, cantidad, stock anterior, stock nuevo, fecha'
]);

testCase('ING-04', 'Ver platos que usan un ingrediente', [
  'Seleccionar ingrediente "Harina de Trigo"',
  'Ir a "Platos que lo usan"'
], [
  'Lista de platos que contienen este ingrediente',
  'Se muestra: nombre del plato, cantidad por porción, porciones máximas'
]);

testCase('ING-05', 'Alerta automática por stock bajo', [
  'Crear ingrediente con Stock=8 y Stock Mínimo=10',
  'Vender productos suficientes para dejar el stock en 5'
], [
  'Se genera alerta de tipo "stock_bajo"',
  'Mensaje indica el ingrediente y stock actual'
]);

// SECCIÓN 2: PLATOS CON RECETAS
section('2. GESTIÓN DE PLATOS (RECETAS COMPUESTAS)');

testCase('PLT-01', 'Crear plato con ingredientes', [
  'Ir a Módulo de Platos',
  'Click en "Nuevo Plato"',
  'Nombre: "Arepa con Queso"',
  'Categoría: "Acompañamientos"',
  'Precio: 8000',
  'Agregar ingrediente: "Harina de Trigo", Cantidad: 0.5 kilos',
  'Agregar ingrediente: "Queso mozzarella", Cantidad: 0.2 kilos',
  'Guardar'
], [
  'Plato creado exitosamente',
  'Se calcula costo de receta automáticamente',
  'Ingredientes vinculados al plato'
]);

testCase('PLT-02', 'Ver costo de receta y margen', [
  'Seleccionar plato "Arepa con Queso"',
  'Ir a "Costo de Receta"'
], [
  'Se muestra desglose de ingredientes con costos',
  'Costo total de receta',
  'Precio de venta',
  'Margen de ganancia en %'
]);

testCase('PLT-03', 'Verificar disponibilidad de plato', [
  'Seleccionar plato "Arepa con Queso"',
  'Ir a "Disponibilidad"'
], [
  'available: true/false',
  'maxPortions: número máximo de porciones posibles',
  'Detalle por ingrediente: stock actual vs requerido'
]);

testCase('PLT-04', 'Resumen de disponibilidad de todos los platos', [
  'Ir a "Platos > Resumen de Disponibilidad"'
], [
  'Lista de TODOS los platos disponibles',
  'Cada plato muestra: maxPortions, available',
  'Platos ordenados por disponibilidad'
]);

testCase('PLT-05', 'Plato NO disponible por falta de ingredientes', [
  'Asegurar que un ingrediente tiene stock menor al requerido',
  'Verificar disponibilidad del plato'
], [
  'available: false',
  'missing: lista de ingredientes faltantes',
  'deficit: cantidad que falta'
]);

// SECCIÓN 3: VENTAS CON TRANSACCIÓN ATÓMICA
section('3. VENTAS CON INVENTARIO COMPUESTO');

testCase('VT-01', 'Vender producto directo (reduce stock)', [
  'Ir a POS / Nueva Venta',
  'Agregar producto: "Gaseosa", cantidad=3',
  'Completar venta'
], [
  'Venta creada exitosamente',
  'Stock de producto reduce en 3',
  'Alerta si stock <= minStock'
]);

testCase('VT-02', 'Vender plato (reduce ingredientes)', [
  'Ir a POS / Nueva Venta',
  'Agregar plato: "Arepa con Queso", cantidad=2',
  'Completar venta'
], [
  'Venta creada exitosamente',
  'Stock de Harina reduce: 0.5 * 2 = 1 kilo',
  'Stock de Queso reduce: 0.2 * 2 = 0.4 kilos',
  'Se registra consumo en dishItems de la venta'
]);

testCase('VT-03', 'Venta rechazada por stock insuficiente (producto)', [
  'Producto "Gaseosa" tiene stock=2',
  'Intentar vender 5 unidades'
], [
  'Venta RECHAZADA con error 400',
  'Mensaje: "Stock insuficiente para Gaseosa"',
  'Stock del producto NO se modifica (transacción abortada)'
]);

testCase('VT-04', 'Venta rechazada por stock insuficiente (plato)', [
  'Plato "Arepa con Queso" requiere 1 kilo de Harina',
  'Harina tiene stock=0.5 kilo',
  'Intentar vender 1 porción'
], [
  'Venta RECHAZADA con error 400',
  'Mensaje indica ingrediente faltante y déficit',
  'Stock de ingredientes NO se modifica (transacción abortada)'
]);

testCase('VT-05', 'Venta mixta: producto + plato', [
  'Vender 2 productos + 1 plato en la misma venta'
], [
  'Venta creada exitosamente',
  'Productos reducen su stock',
  'Plato reduce sus ingredientes',
  'Todo en UNA transacción (todo o nada)'
]);

testCase('VT-06', 'Ver venta con detalle de ingredientes consumidos', [
  'Buscar una venta que incluya platos',
  'Abrir detalle de la venta'
], [
  'dishItems muestra los platos vendidos',
  'ingredientsConsumed muestra cada ingrediente usado',
  'Con cantidades exactas consumidas'
]);

// SECCIÓN 4: COMPRAS DE INGREDIENTES
section('4. COMPRAS DE INGREDIENTES (PURCHASE INGREDIENT)');

testCase('CMP-01', 'Registrar compra de ingredientes', [
  'Ir a "Compras de Insumos"',
  'Click en "Nueva Compra"',
  'Seleccionar proveedor (o "Sin proveedor")',
  'Agregar: Ingrediente="Harina de Trigo", Cantidad=20, Costo Unitario=4500',
  'Agregar: Ingrediente="Queso mozzarella", Cantidad=10, Costo Unitario=12000',
  'Guardar'
], [
  'Compra creada exitosamente',
  'Stock de ingredientes aumenta',
  'Costo de ingredientes se actualiza al nuevo precio',
  'Se registra movimiento tipo "purchase"'
]);

testCase('CMP-02', 'Listar compras de ingredientes', [
  'Ir a "Compras de Insumos"',
  'Ver lista de compras'
], [
  'Muestra todas las compras con paginación',
  'Filtros por fecha y estado'
]);

testCase('CMP-03', 'Ver detalle de compra', [
  'Seleccionar una compra de la lista'
], [
  'Muestra proveedor, fecha, items',
  'Cada item: ingrediente, cantidad, costo unitario, subtotal'
]);

testCase('CMP-04', 'Anular compra de ingredientes', [
  'Seleccionar una compra',
  'Click en "Anular"'
], [
  'Estado cambia a "anulada"',
  'Stock de ingredientes NO se revierte (por simplicidad)'
]);

// SECCIÓN 5: ALERTAS
section('5. SISTEMA DE ALERTAS');

testCase('ALT-01', 'Alerta de stock bajo (ingrediente)', [
  'Ingrediente tiene stock=6, minStock=10',
  'Vender plato que use ese ingrediente'
], [
  'Se genera alerta tipo "stock_bajo"',
  'Vinculada al ingrediente (campo ingredient)',
  'Prioridad: media'
]);

testCase('ALT-02', 'Alerta de sin stock (ingrediente)', [
  'Ingrediente tiene stock=0',
  'Intentar vender plato que use ese ingrediente'
], [
  'Se genera alerta tipo "sin_stock"',
  'Prioridad: alta'
]);

testCase('ALT-03', 'Alerta de stock bajo (producto)', [
  'Producto tiene stock=5, minStock=10',
  'Vender producto'
], [
  'Se genera alerta tipo "stock_bajo"',
  'Vinculada al producto (campo product)'
]);

// SECCIÓN 6: COCINA Y ÓRDENES
section('6. ÓRDENES DE COCINA');

testCase('COC-01', 'Orden de cocina con mesa', [
  'Crear venta con tableNumber=5',
  'Agregar platos a la venta'
], [
  'Se crea KitchenOrder automáticamente',
  'items tienen productType: "Dish"',
  'Estado inicial: "nuevo"'
]);

testCase('COC-02', 'Aceptar orden en cocina', [
  'Ir a vista de cocina',
  'Seleccionar orden con estado "nuevo"',
  'Click en "Aceptar"'
], [
  'Estado cambia a "en_preparacion"',
  'Se registra cook asignado',
  'Historial de estados se actualiza'
]);

testCase('COC-03', 'Marcar orden como entregada', [
  'Seleccionar orden en estado "en_preparacion"',
  'Click en "Entregar"'
], [
  'Estado cambia a "entregado"',
  'Historial actualizado'
]);

testCase('COC-04', 'Marcar orden como pagada', [
  'Seleccionar orden en estado "entregado"',
  'Click en "Marcar Pagada"'
], [
  'Estado cambia a "pagado"',
  'Mesa se libera (isOccupied=false)'
]);

// SECCIÓN 7: REPORTES
section('7. REPORTES');

testCase('REP-01', 'Reporte de ventas por período', [
  'Ir a Reportes > Resumen de Ventas',
  'Seleccionar rango de fechas'
], [
  'Total de ventas',
  'Ventas por método de pago',
  'Gráficos de tendencias'
]);

testCase('REP-02', 'Productos más vendidos', [
  'Ir a Reportes > Productos más vendidos'
], [
  'Top 10 productos/platos',
  'Cantidad vendida y revenue'
]);

testCase('REP-03', 'Valoración de inventario', [
  'Ir a Reportes > Valoración de Inventario'
], [
  'Stock actual de productos',
  'Stock actual de ingredientes',
  'Valor total en pesos'
]);

// Footer
doc.moveDown(4);
doc.fontSize(10).font('Helvetica-Bold').text('NOTAS IMPORTANTES:', { underline: true });
doc.fontSize(9).font('Helvetica');
doc.text('- Todas las ventas con platos usan transacciones atómicas (MongoDB sessions)');
doc.text('- Si falla cualquier operación, TODA la transacción se revierte');
doc.text('- El stock de ingredientes se decrementa al confirmar la venta');
doc.text('- Las alertas se crean después de la venta, si el stock queda bajo');
doc.text('- El campo dishItems en Sale guarda exactamente qué ingredientes se consumieron');

doc.moveDown(2);
doc.text(`Documento generado: ${new Date().toISOString()}`, { align: 'right' });

doc.end();

console.log(`PDF generado exitosamente en: ${outputPath}`);
