const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

const doc = new PDFDocument({
  size: 'LETTER',
  margins: { top: 50, bottom: 55, left: 55, right: 55 },
  info: { Title: 'Manual de Usuario - La Soupe à l\'Oignon' }
});

const IMG = 'C:\\Users\\USUARIO\\AppData\\Local\\Temp\\opencode\\screenshots';
const OUT = path.join(__dirname, 'MANUAL_DE_USUARIO.pdf');

doc.pipe(fs.createWriteStream(OUT));

const gold = '#D4AF37', bronze = '#8B5A2B', dark = '#151822', gray = '#888';
const date = new Date().toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' });

function np() { doc.addPage(); doc.y = 50; }
function h1(t) { doc.fontSize(20).font('Helvetica-Bold').fillColor(dark).text(t, 55, doc.y); doc.moveDown(0.25); doc.fillColor(gold).rect(55, doc.y, 50, 2.5).fill(); doc.moveDown(0.5); }
function h2(t) { doc.fontSize(12).font('Helvetica-Bold').fillColor(bronze).text(t, 55, doc.y); doc.moveDown(0.3); }
function txt(t) { doc.fontSize(9).font('Helvetica').fillColor(dark).text(t, 55, doc.y, { align: 'justify', lineGap: 2 }); doc.moveDown(0.2); }
function dot(t) { doc.fontSize(9).font('Helvetica').fillColor(dark).text(`  \u2022 ${t}`, 55, doc.y, { lineGap: 2 }); doc.moveDown(0.05); }
function sp(n) { doc.moveDown(n || 0.3); }

function pic(name, caption, width) {
  const fp = path.join(IMG, name);
  if (!fs.existsSync(fp)) { txt(`[imagen ${name} no encontrada]`); return; }
  const w = width || 300;
  const img = doc.openImage(fp);
  const h = img.height * (w / img.width);
  if (doc.y + h + 35 > 732) np();
  doc.image(fp, 55 + (502 - w) / 2, doc.y, { width: w });
  doc.y += h + 3;
  if (caption) { doc.fontSize(7).font('Helvetica-Oblique').fillColor(gray).text(caption, 55, doc.y, { align: 'center' }); doc.moveDown(0.3); }
}

function tbl(h, rows, colW) {
  const left = 55, totalW = colW.reduce((a,b)=>a+b,0);
  const colX = []; let x = left;
  for (const w of colW) { colX.push(x); x += w; }
  const hdrH = 19, rowH = 16, th = hdrH + rows.length * rowH + 4;
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
doc.fillColor(gold).rect(0, 170, doc.page.width, 3).fill();
doc.fillColor(gold).fontSize(46).font('Helvetica-Bold').text('La Soupe', 0, 220, { align: 'center' });
doc.text("à l'Oignon", 0, 270, { align: 'center' });
doc.fillColor('#FFF').fontSize(20).font('Helvetica').text('Manual de Usuario', 0, 340, { align: 'center' });
doc.fillColor('#AAA').fontSize(10).text('Sistema de Gesti\u00f3n Restaurantera', 0, 385, { align: 'center' });
doc.text(`Versi\u00f3n 1.0 \u2014 ${date}`, 0, 408, { align: 'center' });
np();

// ═══════════ INDEX ═══════════
h1('\u00cdndice');
sp(0.3);
for (const i of ['1. Roles y Accesos','2. Primer Ingreso','3. Dashboard','4. POS \u2014 Punto de Venta','5. Cocina','6. Domicilios','7. Caja','8. Inventario','9. Reportes \u2014 Centro de Inteligencia','10. Alertas','11. Configuraci\u00f3n','12. Finanzas','13. Personal y Usuarios','14. Talonarios','15. M\u00f3dulos Administrativos','16. Funcionalidades Transversales','17. Soluci\u00f3n de Problemas','18. URLs de Referencia']) {
  doc.fontSize(10).font('Helvetica').fillColor(dark).text(i, 55, doc.y, { lineGap: 5 });
}
np();

// ═══════════ 1. ROLES ═══════════
h1('1. Roles y Accesos');
txt('Cada usuario tiene un rol que determina qu\u00e9 m\u00f3dulos puede ver y qu\u00e9 acciones puede realizar.');
h2('Roles del Sistema');
for (const [r, d] of [['admin','Acceso total a todos los m\u00f3dulos'],['cajero','POS, caja, domicilios (lectura), alertas, talonarios'],['cocinero','Cocina, domicilios (aceptar), dashboard'],['mesero','Solo perfil personal'],['cliente','Perfil personal y tienda p\u00fablica']]) {
  doc.fontSize(9).font('Helvetica-Bold').fillColor(bronze).text(` ${r}  `, 55, doc.y, { continued: true });
  doc.font('Helvetica').fillColor(dark).text(d, { lineGap: 3 });
}
sp(0.4);
h2('Matriz de Acceso por M\u00f3dulo');
tbl(['M\u00f3dulo','admin','cajero','cociner','mesero','cliente'],
  [['Dashboard','\u2713','\u2713','\u2713','\u2014','\u2014'],['POS','\u2713','\u2713','\u2014','\u2014','\u2014'],
   ['Caja','\u2713','\u2713','\u2014','\u2014','\u2014'],['Inventario','\u2713','\u2014','\u2014','\u2014','\u2014'],
   ['Categor\u00edas','\u2713','\u2014','\u2014','\u2014','\u2014'],['Ingredientes','\u2713','\u2014','\u2014','\u2014','\u2014'],
   ['Platos','\u2713','\u2014','\u2014','\u2014','\u2014'],['Proveedores','\u2713','\u2014','\u2014','\u2014','\u2014'],
   ['Compras','\u2713','\u2014','\u2014','\u2014','\u2014'],['Gastos','\u2713','\u2014','\u2014','\u2014','\u2014'],
   ['Finanzas','\u2713','\u2014','\u2014','\u2014','\u2014'],['Reportes','\u2713','\u2014','\u2014','\u2014','\u2014'],
   ['Alertas','\u2713','\u2713','\u2014','\u2014','\u2014'],['Cocina','\u2713','\u2014','\u2713','\u2014','\u2014'],
   ['Domicilios','\u2713','\u2713','\u2713','\u2014','\u2014'],['Staff','\u2713','\u2014','\u2014','\u2014','\u2014'],
   ['Talonarios','\u2713','\u2713','\u2014','\u2014','\u2014'],['Configuraci\u00f3n','\u2713','\u2014','\u2014','\u2014','*}']],
  [130,46,46,48,46,46]);
doc.fontSize(7).font('Helvetica-Oblique').fillColor(gray).text('  * Cliente solo ve su perfil personal');
np();

// ═══════════ 2. PRIMER INGRESO ═══════════
h1('2. Primer Ingreso');
txt('Abra su navegador en la URL del frontend. Aparecer\u00e1 la pantalla de inicio de sesi\u00f3n.');

sp(0.1);
h2('Paso 1: Ingresar credenciales');
pic('login-clean.png', 'Formulario de inicio de sesi\u00f3n');
txt('Ingrese su correo electr\u00f3nico y contrase\u00f1a. Presione "Ingresar" para acceder al sistema.');

h2('Paso 2: Dashboard');
sp(0.1);
txt('Tras iniciar sesi\u00f3n, el sistema carga el Dashboard con los indicadores del d\u00eda.');

h2('Credenciales de Prueba');
tbl(['Perfil','Email','Contrase\u00f1a'],
  [['admin','admin@test.com','Admin123!'],['cajero','cajero@test.com','Cajero123!'],
   ['cocinero','cocinero@test.com','Cocinero123!'],['mesero','mesero@test.com','Mesero123!']],
  [80,200,130]);
np();

// ═══════════ 3. DASHBOARD ═══════════
h1('3. Dashboard');
txt('Resumen del negocio en tiempo real: ingresos del d\u00eda, transacciones, ticket promedio y pedidos pendientes. Datos actualizados v\u00eda WebSocket.');
pic('02-dashboard.png', 'Dashboard con KPIs y \u00f3rdenes en curso', 340);
txt('Acceso r\u00e1pido a POS, Cocina y dem\u00e1s m\u00f3dulos desde tarjetas de acceso directo.');
np();

// ═══════════ 4. POS ═══════════
h1('4. POS \u2014 Punto de Venta');
txt('Registro de ventas r\u00e1pido e intuitivo. Roles: admin y cajero.');

h2('Paso 1: Vista principal');
pic('pos-main.png', 'Pantalla principal del POS con productos y categor\u00edas', 340);
txt('Seleccione una mesa para consumo en local o d\u00e9jela vac\u00eda para domicilio. El POS muestra los productos organizados por categor\u00edas.');

sp(0.3);
h2('Paso 2: Buscar producto');
pic('pos-search.png', 'B\u00fasqueda de producto por nombre o c\u00f3digo de barras', 340);
txt('Escriba el nombre del producto o escanee el c\u00f3digo de barras. Los resultados se filtran en tiempo real.');

sp(0.3);
h2('Paso 3: Agregar al carrito y cobrar');
pic('pos-cart.png', 'Productos agregados al carrito con selector de pago', 340);
txt('Ajuste cantidades, seleccione el m\u00e9todo de pago (Efectivo, Transferencia o Mixto) y presione "Cobrar". Con mesa asignada se crea una orden de cocina; sin mesa se genera un domicilio autom\u00e1ticamente.');
np();

// ═══════════ 5. COCINA ═══════════
h1('5. Cocina');
txt('\u00d3rdenes en tiempo real v\u00eda WebSocket. Roles: admin y cocinero.');

h2('Paso 1: Nuevos pedidos');
txt('Cuando un cajero realiza una venta con mesa, el pedido aparece autom\u00e1ticamente en la columna "Nuevos". El cocinero hace clic en "Aceptar" para iniciar la preparaci\u00f3n.');

h2('Paso 2: En Preparaci\u00f3n');
txt('El pedido se mueve a la columna central. El cocinero prepara los platos y al finalizar hace clic en "Entregado".');

h2('Paso 3: Entregados');
pic('04-kitchen.png', 'Panel de cocina con pedidos organizados por estado', 340);
txt('Los pedidos completados pasan a la columna "Entregados". El cajero los marca como pagados desde Caja. Al llegar un nuevo pedido suena un timbre de notificaci\u00f3n.');
np();

// ═══════════ 6. DOMICILIOS ═══════════
h1('6. Domicilios');
txt('Kanban de entregas en tiempo real. Roles: admin, cajero (lectura), cocinero.');

h2('Paso 1: Pendientes');
txt('Los domicilios nuevos aparecen en la columna "Pendientes". Acepte el domicilio para iniciar la preparaci\u00f3n.');

h2('Paso 2: En Preparaci\u00f3n');
txt('Despache el pedido cuando est\u00e9 listo. El sistema asigna un repartidor autom\u00e1ticamente.');

h2('Paso 3: En Camino y Entregados');
pic('05-domicilios.png', 'Kanban de domicilios con cuatro estados', 340);
txt('Cuando el repartidor entrega, marque como "Entregado". El hist\u00f3rico completo queda en la \u00faltima columna.');
np();

// ═══════════ 7. CAJA ═══════════
h1('7. Caja');
txt('Apertura y cierre de caja. Roles: admin y cajero.');
pic('06-caja.png', 'Pantalla de caja con resumen del turno', 340);
h2('Funciones');
dot('Abrir caja \u2014 registrar el monto inicial del turno');
dot('Cerrar caja \u2014 ingresar ingresos/egresos manuales, c\u00e1lculo de diferencia vs ventas');
dot('Historial \u2014 consultar cierres de caja anteriores con detalle');
np();

// ═══════════ 8. INVENTARIO ═══════════
h1('8. Inventario');
txt('Control de stock. Rol: admin.');
pic('07-inventario.png', 'Listado de productos del inventario', 340);
h2('Funciones');
dot('CRUD completo: nombre, precio, stock, categor\u00eda, c\u00f3digo de barras');
dot('C\u00f3digo de barras auto-generado por categor\u00eda + proveedor');
dot('Alertas configurables por stock m\u00ednimo');
dot('Entradas/salidas manuales con registro hist\u00f3rico');
dot('Esc\u00e1ner de c\u00f3digo de barras integrado');
np();

// ═══════════ 9. REPORTES ═══════════
h1('9. Reportes \u2014 Centro de Inteligencia');
txt('An\u00e1lisis del negocio en cuatro pesta\u00f1as. Rol: admin. Exportaci\u00f3n a CSV.');
pic('08-reportes.png', 'Centro de Inteligencia con pesta\u00f1as de an\u00e1lisis', 340);
h2('Pesta\u00f1as');
dot('[Ventas] \u2014 KPIs, tendencia, categor\u00edas, m\u00e9todo de pago, horas pico');
dot('[Inventario] \u2014 valoraci\u00f3n, estado del stock, ganancia potencial');
dot('[Productos] \u2014 top 10 m\u00e1s vendidos, productos sin movimiento, m\u00e1rgenes');
dot('[Cocina] \u2014 tiempos de preparaci\u00f3n por cocinero');
np();

// ═══════════ 10. ALERTAS ═══════════
h1('10. Alertas');
txt('Alertas de stock bajo y productos agotados. Roles: admin y cajero.');
pic('09-alertas.png', 'Panel de alertas con nivel de criticidad', 340);
h2('Funciones');
dot('Lista con nivel de criticidad: bajo, cr\u00edtico, agotado');
dot('Marcar como le\u00eddas (individual o todas)');
dot('Verificar Stock \u2014 escanea y genera alertas autom\u00e1ticamente');
dot('Env\u00edo de correo SMTP si est\u00e1 configurado');
np();

// ═══════════ 11. CONFIGURACIÓN ═══════════
h1('11. Configuraci\u00f3n');
txt('Ajustes del sistema. Admin ve todo; cliente solo su perfil.');
pic('10-configuracion.png', 'P\u00e1gina de configuraci\u00f3n del restaurante', 340);
h2('Campos para administrador');
dot('Nombre del establecimiento, tel\u00e9fono, direcci\u00f3n, WhatsApp');
dot('Logo del restaurante (subida de imagen)');
dot('Configuraci\u00f3n SMTP: servidor, puerto, credenciales, email');
dot('Manual de Usuario \u2014 enlace directo al PDF');
dot('Limpiar Cach\u00e9 Local');
np();

// ═══════════ 12. FINANZAS ═══════════
h1('12. Finanzas');
txt('Panel financiero completo. Rol: admin.');
pic('11-finanzas.png', 'Panel financiero con P&L y flujo de caja', 340);
h2('Indicadores');
dot('Ingresos, costos, gastos y utilidad neta');
dot('Flujo de caja por per\u00edodo');
dot('Estado de P\u00e9rdidas y Ganancias mensual');
dot('Gr\u00e1ficos de ingresos vs gastos');
np();

// ═══════════ 13. STAFF ═══════════
h1('13. Personal y Usuarios');
txt('Gesti\u00f3n del equipo y cuentas. Rol: admin.');
pic('12-staff.png', 'Gesti\u00f3n de personal y usuarios', 340);
dot('Empleados \u2014 datos laborales: nombre, cargo, salario, contacto');
dot('Usuarios del Sistema \u2014 CRUD con roles: admin, cajero, cocinero, mesero, cliente');
np();

// ═══════════ 14. TALONARIOS ═══════════
h1('14. Talonarios');
txt('Control de facturaci\u00f3n. Roles: admin y cajero.');
pic('13-talonarios.png', 'Registro de talonarios', 340);
dot('Rangos num\u00e9ricos (desde/hasta)');
dot('Consumo autom\u00e1tico al realizar ventas');
dot('Numeraci\u00f3n consecutiva');
np();

// ═══════════ 15. MÓDULOS ADMIN ═══════════
h1('15. M\u00f3dulos Administrativos');
h2('Proveedores');
txt('CRUD completo de proveedores con datos de contacto, tel\u00e9fono y direcci\u00f3n.');
h2('Compras');
txt('\u00d3rdenes de compra con estados: pendiente, recibida, cancelada.');
h2('Ingredientes');
txt('Cat\u00e1logo con unidad de medida, costo unitario y stock m\u00ednimo. Base para recetas.');
h2('Platos (Recetas)');
txt('Cada plato se compone de ingredientes con cantidades. Costo y precio calculados autom\u00e1ticamente.');
pic('17-platos.png', 'Gesti\u00f3n de platos con recetas e ingredientes', 340);
h2('Gastos');
txt('Gastos operativos categorizados con reportes mensuales.');
np();

// ═══════════ 16. FUNCIONALIDADES ═══════════
h1('16. Funcionalidades Transversales');
h2('WebSocket \u2014 Tiempo Real');
txt('Socket.IO para actualizaciones en cocina, domicilios y dashboard. Indicador verde = conectado.');
h2('Notificaci\u00f3n Sonora');
txt('Timbre al llegar nuevo pedido a cocina v\u00eda Web Audio API.');
h2('Cach\u00e9 Inteligente');
txt('Almacenamiento en memoria + localStorage con TTL: productos 5 min, categor\u00edas 10 min, alertas 2 min, config 30 min, reportes 5 min.');
txt('\u00daselo el bot\u00f3n "Limpiar Cach\u00e9 Local" en Configuraci\u00f3n para forzar recarga.');
h2('Exportaci\u00f3n CSV');
txt('Cada pesta\u00f1a de Reportes tiene bot\u00f3n de exportaci\u00f3n CSV con BOM UTF-8 para Excel.');
h2('Alertas por Correo');
txt('Con SMTP configurado, al verificar stock se env\u00eda correo autom\u00e1tico con productos cr\u00edticos.');
np();

// ═══════════ 17. SOLUCIÓN DE PROBLEMAS ═══════════
h1('17. Soluci\u00f3n de Problemas');
tbl(['Problema','Soluci\u00f3n'],
  [['No carga el dashboard','Verificar conexi\u00f3n. Cerrar sesi\u00f3n y reiniciar.'],
   ['Pedidos no aparecen en cocina','Revisar conexi\u00f3n WebSocket. Recargar p\u00e1gina.'],
   ['No llegan correos de alerta','Configurar SMTP en Settings.'],
   ['Datos desactualizados','Settings > Limpiar Cach\u00e9 Local.'],
   ['Error 403','Rol sin permisos. Contactar al admin.'],
   ['Error 401','Sesi\u00f3n expirada. Iniciar sesi\u00f3n.'],
   ['Stock insuficiente','Revisar inventario y realizar compra.'],
   ['No puedo iniciar sesi\u00f3n','Verificar credenciales. Contactar al admin.'],
   ['Error interno','Esperar e intentar de nuevo. Reportar si persiste.']],
  [170,340]);
sp(0.4);
h2('Recomendaciones');
dot('Mantener sesi\u00f3n activa \u2014 la inactividad prolongada cierra la sesi\u00f3n');
dot('Usar Chrome o Edge actualizados');
dot('Verificar el indicador de conexi\u00f3n WebSocket antes de reportar problemas');
dot('Limpiar cach\u00e9 peri\u00f3dicamente');
np();

// ═══════════ 18. URLs ═══════════
h1('18. URLs de Referencia');
tbl(['Recurso','URL'],
  [['App Frontend','https://lasoupealoignon.vercel.app'],
   ['API Backend','https://demorestbknd.onrender.com'],
   ['Health Check','https://demorestbknd.onrender.com/api/health'],
   ['Repositorio','https://github.com/CrisAguirre/demorest']],
  [130,380]);
sp(1.5);
doc.fontSize(13).font('Helvetica-Bold').fillColor(gold).text('La Soupe \u00e0 l\'Oignon', 55, doc.y, { align: 'center' });
sp(0.3);
doc.fontSize(9).font('Helvetica').fillColor(gray).text('Buen provecho y excelentes ventas.', { align: 'center' });
doc.fontSize(7).fillColor('#AAA').text(`Documento generado el ${date}`, { align: 'center' });
doc.end();
console.log('PDF generado:', OUT);
