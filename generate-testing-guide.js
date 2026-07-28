const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

const doc = new PDFDocument({
  size: 'LETTER',
  margins: { top: 50, bottom: 55, left: 50, right: 50 },
  info: { Title: 'Plan de Pruebas Manuales - La Soupe à l\'Oignon' }
});

const OUT = path.join(__dirname, 'PLAN_DE_PRUEBAS_MANUALES.pdf');
doc.pipe(fs.createWriteStream(OUT));

const gold = '#D4AF37', bronze = '#8B5A2B', dark = '#151822', gray = '#888', green = '#27AE60';

function np() { doc.addPage(); doc.y = 50; }
function h1(t) { doc.fontSize(18).font('Helvetica-Bold').fillColor(dark).text(t, 50, doc.y); doc.moveDown(0.15); doc.fillColor(gold).rect(50, doc.y, 40, 2.5).fill(); doc.moveDown(0.5); }
function h2(t) { doc.fontSize(12).font('Helvetica-Bold').fillColor(bronze).text(t, 50, doc.y); doc.moveDown(0.3); }
function txt(t) { doc.fontSize(9).font('Helvetica').fillColor(dark).text(t, 50, doc.y, { align: 'justify', lineGap: 2 }); doc.moveDown(0.15); }
function dot(t) { doc.fontSize(9).font('Helvetica').fillColor(dark).text(`  \u2022 ${t}`, 50, doc.y, { lineGap: 2 }); doc.moveDown(0.05); }
function sp(n) { doc.moveDown(n || 0.3); }
function br() { doc.moveDown(0.1); }

function step(n, title, browser, account) {
  const label = account ? ` [${browser} \u2014 ${account}]` : '';
  doc.fontSize(11).font('Helvetica-Bold').fillColor(dark).text(`Paso ${n}: ${title}${label}`, 50, doc.y);
  doc.moveDown(0.15);
  doc.fillColor(gold).rect(50, doc.y, 30, 1.5).fill();
  doc.moveDown(0.3);
}

function note(t) {
  doc.fontSize(8).font('Helvetica-Oblique').fillColor(gray).text(`  ${t}`, 50, doc.y, { lineGap: 1 });
  doc.moveDown(0.1);
}

function tbl(h, rows, colW) {
  const left = 50, totalW = colW.reduce((a,b)=>a+b,0);
  const colX = []; let x = left;
  for (const w of colW) { colX.push(x); x += w; }
  const hdrH = 18, rowH = 15, th = hdrH + rows.length * rowH + 4;
  if (doc.y + th + 20 > 732) np();
  const sy = doc.y;
  doc.rect(left, sy, totalW, hdrH).fill(dark);
  doc.fillColor(gold).fontSize(7).font('Helvetica-Bold');
  for (let i = 0; i < h.length; i++) doc.text(h[i], colX[i] + 4, sy + 5, { width: colW[i] - 4 });
  let y = sy + hdrH;
  for (let ri = 0; ri < rows.length; ri++) {
    doc.fillColor(ri % 2 === 0 ? '#FFF' : '#F5F3EE').rect(left, y, totalW, rowH).fill();
    doc.fillColor(dark).fontSize(6.5).font('Helvetica');
    for (let ci = 0; ci < rows[ri].length; ci++) doc.text(rows[ri][ci], colX[ci] + 4, y + 4, { width: colW[ci] - 4 });
    y += rowH;
  }
  doc.strokeColor('#CCC').lineWidth(0.5).rect(left, sy, totalW, y - sy).stroke();
  doc.y = y + 4;
}

// ═══════════ COVER ═══════════
doc.fillColor('#0A0C14').rect(0, 0, doc.page.width, doc.page.height).fill();
doc.fillColor(gold).rect(0, 160, doc.page.width, 3).fill();
doc.fillColor(gold).fontSize(44).font('Helvetica-Bold').text('La Soupe', 0, 210, { align: 'center' });
doc.text("à l'Oignon", 0, 260, { align: 'center' });
doc.fillColor('#FFF').fontSize(18).font('Helvetica').text('Plan de Pruebas Manuales', 0, 330, { align: 'center' });
doc.fillColor('#AAA').fontSize(11).text('Gu\u00eda paso a paso \u2014 4 cuentas, 4 navegadores', 0, 365, { align: 'center' });
const date = new Date().toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' });
doc.text(`Versi\u00f3n 1.0 \u2014 ${date}`, 0, 395, { align: 'center' });

np();

// ═══════════ CONFIGURACIÓN ═══════════
h1('Configuraci\u00f3n de los 4 Navegadores');
txt('Cada persona abre una cuenta distinta en un navegador diferente para simular la interacci\u00f3n simult\u00e1nea en el sistema.');

tbl(['Navegador', 'Cuenta', 'Rol', 'Contrase\u00f1a'],
  [['Chrome', 'admin@test.com', 'admin', 'Admin123!'],
   ['Firefox', 'cajero@test.com', 'cajero', 'Cajero123!'],
   ['Edge', 'cocinero@test.com', 'cocinero', 'Cocinero123!'],
   ['Opera / Brave', 'mesero@test.com', 'mesero', 'Mesero123!']],
  [100, 150, 80, 130]);

sp(0.3);
h2('Enlace');
doc.fontSize(10).font('Helvetica').fillColor('#2980B9').text('https://lasoupealoignon.vercel.app/', 50, doc.y);
doc.moveDown(0.5);

// ═══════════ 1 ═══════════
np();
h1('Paso 1: Login en los 4 navegadores');
txt('Todos abren el enlace del frontend e inician sesi\u00f3n con sus respectivas credenciales.');
br();
h2('Verificaciones');
for (const c of [
  'Admin ve el Dashboard con todos los m\u00f3dulos en el men\u00fa lateral',
  'Cajero ve: Dashboard, POS, Caja, Alertas, Talonarios, Domicilios',
  'Cocinero ve: Dashboard, Cocina, Domicilios',
  'Mesero ve \u00fanicamente el Dashboard'
]) dot(c);
note('Si alg\u00fan m\u00f3dulo no aparece, el RoleGuard est\u00e1 funcionando correctamente.');

// ═══════════ 2 ═══════════
np();
h1('Paso 2: Admin explora Configuraci\u00f3n');
step(2.1, 'Ir a Configuraci\u00f3n (Settings)', 'Chrome', 'admin');
for (const c of [
  'Revisar datos del restaurante y logo',
  'Probar "Limpiar Cach\u00e9 Local"',
  'Descargar / visualizar el Manual de Usuario PDF'
]) dot(c);
note('La cach\u00e9 limpia los datos almacenados en PreloadService (memoria + localStorage).');

// ═══════════ 3 ═══════════
np();
h1('Paso 3: Admin crea datos de prueba');
step(3.1, 'Ir a Proveedores y crear 1', 'Chrome', 'admin');
dot('Crear proveedor: "Distribuidora XYZ", contacto, tel\u00e9fono, direcci\u00f3n.');
step(3.2, 'Ir a Categor\u00edas y crear 1', 'Chrome', 'admin');
dot('Crear categor\u00eda: "Bebidas" (o la que prefieran).');
step(3.3, 'Ir a Insumos y crear 2', 'Chrome', 'admin');
doc.fontSize(9).font('Helvetica').fillColor(dark).text('   1. "Harina" \u2014 unidad: kg, stock: 10, minStock: 2, costo: $2,000', 50, doc.y, { lineGap: 2 }); doc.moveDown(0.1);
doc.fontSize(9).font('Helvetica').fillColor(dark).text('   2. "Huevos" \u2014 unidad: unidad, stock: 24, minStock: 6, costo: $500', 50, doc.y, { lineGap: 2 }); doc.moveDown(0.1);
step(3.4, 'Ir a Platos y crear 1 con receta', 'Chrome', 'admin');
dot('Nombre: "Tortilla Francesa", precio: $8,000, categor\u00eda: platos fuertes');
dot('Agregar ingredientes: 0.2 kg Harina, 2 Huevos');
dot('Escribir preparaci\u00f3n (ej: "Batir huevos, mezclar harina, cocinar en sart\u00e9n")');
step(3.5, 'Ir a Productos y crear 1', 'Chrome', 'admin');
dot('Nombre: "Jugo Natural", barcode: JUG001, stock: 20, precio venta: $8,000, categor\u00eda: Bebidas');

// ═══════════ 4 ═══════════
np();
h1('Paso 4: Cajero abre POS y crea una venta');
step(4.1, 'Ir a POS', 'Firefox', 'cajero');
dot('Verificar que los platos cargan correctamente en la cuadr\u00edcula');
step(4.2, 'Agregar productos al carrito', 'Firefox', 'cajero');
dot('Buscar "Tortilla Francesa" y agregar 2 unidades');
dot('Buscar "Jugo Natural" y agregar 1 unidad');
dot('Verificar que el total se calcula correctamente');
step(4.3, 'Seleccionar mesa y finalizar', 'Firefox', 'cajero');
dot('En el campo tableNumber escribir "Mesa 1"');
dot('Presionar "Cobrar" y confirmar la venta');
step(4.4, 'Verificar descuento de stock', 'Firefox', 'cajero');
dot('Ir a Insumos \u2192 Harina debe ser 9.6 kg, Huevos debe ser 22');
dot('Ir a Productos \u2192 Jugo Natural debe ser 19');

// ═══════════ 5 ═══════════
np();
h1('Paso 5: Cocinero recibe orden en Kanban de cocina');
step(5.1, 'Ir a Cocina', 'Edge', 'cocinero');
dot('La orden debe aparecer autom\u00e1ticamente en columna "Nuevos" (sin recargar)');
step(5.2, 'Aceptar la orden', 'Edge', 'cocinero');
dot('Presionar "Aceptar" \u2192 la orden pasa a "En Preparaci\u00f3n"');
dot('Verificar que aparece el nombre del cocinero asignado');
step(5.3, 'Entregar la orden', 'Edge', 'cocinero');
dot('Presionar "Entregado" \u2192 la orden pasa a columna "Entregados"');
note('Escuchar el timbre de notificaci\u00f3n sonora al llegar un nuevo pedido.');

// ═══════════ 6 ═══════════
np();
h1('Paso 6: Cajero marca como pagado');
step(6.1, 'Ir a la orden entregada', 'Firefox', 'cajero');
dot('Desde POS o Cocina, localizar la orden en estado "Entregado"');
dot('Presionar "Marcar Pagado" \u2192 estado cambia a "Pagado"');
dot('Verificar que la Mesa 1 se libera autom\u00e1ticamente');

// ═══════════ 7 ═══════════
np();
h1('Paso 7: Admin verifica Reportes y Finanzas');
step(7.1, 'Ir a Reportes', 'Chrome', 'admin');
for (const c of [
  'Pesta\u00f1a Ventas: ver KPIs, probar exportar CSV',
  'Pesta\u00f1a Inventario: ver productos con stock bajo',
  'Pesta\u00f1a Productos: ver top m\u00e1s vendidos',
  'Pesta\u00f1a Cocina: ver tiempos de preparaci\u00f3n'
]) dot(c);
step(7.2, 'Ir a Finanzas', 'Chrome', 'admin');
dot('Ver P&L (P\u00e9rdidas y Ganancias)');
dot('Ver flujo de caja y gr\u00e1ficos de ingresos vs gastos');

// ═══════════ 8 ═══════════
np();
h1('Paso 8: Corte de Caja');
step(8.1, 'Ir a Caja', 'Firefox', 'cajero');
dot('Realizar Apertura de caja: monto inicial ej. $100,000');
step(8.2, 'Crear otra venta en POS', 'Firefox', 'cajero');
dot('Hacer una venta peque\u00f1a r\u00e1pida para tener movimiento');
step(8.3, 'Cerrar caja', 'Firefox', 'cajero');
dot('Ingresar monto final, verificar diferencia vs ventas registradas');
dot('Confirmar el cierre');

// ═══════════ 9 ═══════════
np();
h1('Paso 9: Prueba de Alertas');
step(9.1, 'Forzar alerta de stock bajo', 'Chrome', 'admin');
dot('Ir a Insumos \u2192 editar "Harina" y poner stock = 1 (menor al m\u00ednimo de 2)');
step(9.2, 'Ir a Alertas', 'Chrome', 'admin');
dot('Verificar que aparece alerta de stock bajo con nivel cr\u00edtico');
dot('Probar bot\u00f3n "Verificar Stock"');
step(9.3, 'Probar env\u00edo de email (opcional)', 'Chrome', 'admin');
dot('Si tienen credenciales SMTP, configurarlas en Settings');
dot('Probar "Enviar alerta por email"');

// ═══════════ 10 ═══════════
np();
h1('Paso 10: Delivery (Domicilios)');
step(10.1, 'Crear venta SIN mesa', 'Firefox', 'cajero');
dot('Ir a POS, agregar productos, NO escribir mesa');
dot('Finalizar venta \u2192 se crea como domicilio autom\u00e1ticamente');
step(10.2, 'Gestionar domicilio', 'Edge', 'cocinero');
dot('Ir a Domicilios');
dot('Ver pedido en columna "Pendientes"');
dot('Aceptar \u2192 pasa a "En Preparaci\u00f3n"');
dot('Despachar \u2192 pasa a "En Camino"');
dot('Entregar \u2192 pasa a "Entregados"');
note('Verificar que WebSocket actualiza las columnas en tiempo real.');

// ═══════════ 11 ═══════════
np();
h1('Paso 11: Talonarios');
step(11.1, 'Ir a Talonarios', 'Chrome o Firefox', 'admin o cajero');
dot('Crear un talonario: rango 001 - 050');
dot('Asignarlo a un mesero');
dot('Registrar una comanda de prueba');

// ═══════════ 12 ═══════════
np();
h1('Paso 12: Gastos y Compras');
step(12.1, 'Ir a Gastos', 'Chrome', 'admin');
dot('Registrar un gasto: "Arriendo", $500,000, categor\u00eda: operativo');
step(12.2, 'Ir a Compras', 'Chrome', 'admin');
dot('Crear orden de compra a "Distribuidora XYZ"');
dot('Agregar \u00edtems (ej: 10 kg Harina, 24 unidades Huevos)');
dot('Marcar como "Recibida" \u2192 verificar que el stock se actualiza');

// ═══════════ 13 ═══════════
np();
h1('Paso 13: Staff');
step(13.1, 'Ir a Staff', 'Chrome', 'admin');
for (const c of [
  'Ver lista de usuarios existentes',
  'Crear un nuevo usuario de prueba con rol "mesero"',
  'Editar alg\u00fan usuario existente',
  'Cambiar el rol de un usuario y verificar restricci\u00f3n de acceso'
]) dot(c);

// ═══════════ 14 ═══════════
np();
h1('Paso 14: Mesero verifica restricciones');
step(14.1, 'Dashboard', 'Opera/Brave', 'mesero');
dot('Confirmar que ve el Dashboard (es su \u00fanico m\u00f3dulo)');
step(14.2, 'Probar bloqueo de rutas', 'Opera/Brave', 'mesero');
dot('Intentar navegar manualmente a /pos');
dot('Intentar navegar a /kitchen');
dot('Intentar navegar a /caja');
note('El RoleGuard debe redirigir al Dashboard o mostrar error 403.');

// ═══════════ 15 ═══════════
np();
h1('Paso 15: WebSockets en tiempo real');
txt('Prueba de simultaneidad entre todos los navegadores:');
br();
for (const c of [
  'Cajero crea una venta en POS \u2192 Cocinero la ve aparecer en Cocina sin recargar',
  'Cocinero acepta/entrega \u2192 Cajero ve el cambio en POS',
  'Admin ve cambios reflejados en Dashboard en tiempo real',
  'Verificar el indicador verde de conexi\u00f3n WebSocket en todos'
]) dot(c);

// ═══════════ CHECKLIST ═══════════
np();
h1('Checklist de Verificaci\u00f3n');
tbl(['Funcionalidad', 'Qui\u00e9n prueba', '\u2713'],
  [['Login 4 cuentas', 'Todos', ''],
   ['Dashboard con KPIs', 'Todos', ''],
   ['Configuraci\u00f3n + Manual PDF', 'Admin', ''],
   ['Crear Proveedor', 'Admin', ''],
   ['Crear Categor\u00eda', 'Admin', ''],
   ['Crear Insumos (2)', 'Admin', ''],
   ['Crear Plato con Receta', 'Admin', ''],
   ['Crear Producto', 'Admin', ''],
   ['POS \u2014 Venta con mesa', 'Cajero', ''],
   ['Stock descontado tras venta', 'Cajero', ''],
   ['Cocina \u2014 nuevo\u2192pagado', 'Cocinero + Cajero', ''],
   ['Timbre notificaci\u00f3n sonora', 'Cocinero', ''],
   ['Corte de Caja', 'Cajero', ''],
   ['Alertas stock bajo', 'Admin', ''],
   ['Reportes + CSV', 'Admin', ''],
   ['Finanzas P&L', 'Admin', ''],
   ['Domicilios (4 columnas)', 'Cajero + Cocinero', ''],
   ['Gastos', 'Admin', ''],
   ['Compras + recibir stock', 'Admin', ''],
   ['Staff / Usuarios', 'Admin', ''],
   ['Talonarios', 'Admin / Cajero', ''],
   ['Bloqueo por roles', 'Mesero', ''],
   ['WebSocket en tiempo real', 'Todos', '']],
  [180, 120, 30]);

sp(0.8);
doc.fontSize(11).font('Helvetica-Bold').fillColor(gold).text('La Soupe \u00e0 l\'Oignon', 50, doc.y, { align: 'center' });
sp(0.2);
doc.fontSize(9).font('Helvetica').fillColor(gray).text('Buen provecho y excelentes pruebas.', { align: 'center' });
doc.fontSize(7).fillColor('#AAA').text(`Documento generado el ${date}`, { align: 'center' });
doc.end();

console.log('PDF generado:', OUT);
