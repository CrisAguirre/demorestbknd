const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

const doc = new PDFDocument({
  size: 'LETTER',
  margins: { top: 45, bottom: 45, left: 45, right: 45 },
  info: {
    Title: 'Manual de Usuario - La Soupe à l\'Oignon',
    Author: 'Sistema de Gestión',
    Subject: 'Manual de Usuario'
  }
});

const OUT_DIR = 'C:\\Users\\USUARIO\\AppData\\Local\\Temp\\opencode\\screenshots';
const outPath = path.join(__dirname, 'MANUAL_DE_USUARIO.pdf');
doc.pipe(fs.createWriteStream(outPath));

const gold = '#D4AF37';
const bronze = '#8B5A2B';
const dark = '#151822';
const gray = '#888';
const white = '#FFFFFF';

function h1(text) {
  doc.fillColor(dark).fontSize(20).font('Helvetica-Bold').text(text, { underline: false });
  doc.moveDown(0.2);
  doc.fillColor(gold).rect(doc.x, doc.y, 50, 2).fill();
  doc.moveDown(0.6);
}

function h2(text) {
  doc.fillColor(bronze).fontSize(13).font('Helvetica-Bold').text(text, { underline: false });
  doc.moveDown(0.3);
}

function p(text) {
  doc.fillColor(dark).fontSize(9.5).font('Helvetica').text(text, { align: 'justify', lineGap: 1 });
  doc.moveDown(0.2);
}

function bullet(text, indent = 15) {
  doc.fillColor(dark).fontSize(9.5).font('Helvetica');
  doc.x = 45 + indent;
  doc.text(`• ${text}`, { indent: 0, lineGap: 1 });
  doc.moveDown(0.05);
}

function spacer(h = 0.4) { doc.moveDown(h); }

function img(name, opts = {}) {
  const fp = path.join(OUT_DIR, name);
  if (!fs.existsSync(fp)) { p(`[imagen no encontrada: ${name}]`); return; }
  const maxW = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const w = opts.width || maxW;
  try {
    doc.image(fp, doc.page.margins.left + (opts.indent || 0), doc.y, {
      width: w, align: 'center'
    });
    doc.moveDown(0.1);
    if (opts.caption) {
      doc.fillColor(gray).fontSize(7).font('Helvetica-Oblique').text(opts.caption, { align: 'center' });
      doc.moveDown(0.3);
    }
  } catch (e) {
    p(`[error al cargar imagen: ${name}]`);
  }
}

// ── Tables ──
function drawTable(headers, rows, colW, startY) {
  const totalW = colW.reduce((a, b) => a + b, 0);
  const left = doc.page.margins.left;
  const colX = [];
  let x = left;
  for (const w of colW) { colX.push(x); x += w; }

  const headerH = 20;
  const rowH = 20;

  doc.rect(left, startY, totalW, headerH).fill(dark);
  doc.fillColor(gold).fontSize(7.5).font('Helvetica-Bold');
  for (let i = 0; i < headers.length; i++) {
    doc.text(headers[i], colX[i] + 4, startY + 5, { width: colW[i] - 4 });
  }

  let y = startY + headerH;
  for (const row of rows) {
    const bg = (y - startY - headerH) % (rowH * 2) === 0 ? '#F5F5F5' : white;
    doc.fillColor(bg).rect(left, y, totalW, rowH).fill();
    doc.fillColor(dark).fontSize(7).font('Helvetica');
    for (let i = 0; i < row.length; i++) {
      doc.text(row[i], colX[i] + 4, y + 5, { width: colW[i] - 4 });
    }
    y += rowH;
  }

  doc.strokeColor(gray).lineWidth(0.5).rect(left, startY, totalW, y - startY).stroke();
  return y + 8;
}

// ── Add page footer ──
let pageCount = 0;
const origAddPage = doc.addPage.bind(doc);
doc.addPage = function() {
  if (pageCount > 0) addFooter();
  pageCount++;
  return origAddPage();
};

function addFooter() {
  const y = doc.page.height - 30;
  doc.save();
  doc.fontSize(6.5).font('Helvetica').fillColor('#AAAAAA');
  doc.text('La Soupe à l\'Oignon — Manual de Usuario', 45, y, { align: 'center', lineBreak: false });
  doc.restore();
}

// ═══════════════════════════════════════════════════════════════════
// COVER
// ═══════════════════════════════════════════════════════════════════
doc.fillColor('#0D0F16').rect(0, 0, doc.page.width, doc.page.height).fill();

// Decorative gold line
doc.fillColor(gold).rect(0, 160, doc.page.width, 3).fill();

doc.fillColor(gold).fontSize(44).font('Helvetica-Bold');
doc.text('La Soupe', 45, 200, { align: 'center' });
doc.text("à l'Oignon", 45, 252, { align: 'center' });
doc.fillColor(white).fontSize(20).font('Helvetica');
doc.text('Manual de Usuario', 45, 320, { align: 'center' });

doc.fillColor(gray).fontSize(11).font('Helvetica');
doc.text('Sistema de Gestión Restaurantera', 45, 370, { align: 'center' });
doc.text(`Versión 1.0 — ${new Date().toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' })}`, 45, 395, { align: 'center' });

doc.fillColor(gold).rect(170, doc.page.height - 100, doc.page.width - 340, 1).fill();

doc.addPage();

// ═══════════════════════════════════════════════════════════════════
// TABLE OF CONTENTS
// ═══════════════════════════════════════════════════════════════════
h1('Índice');
const tocItems = [
  ['1', 'Roles y Accesos'],
  ['2', 'Primer Ingreso'],
  ['3', 'Dashboard'],
  ['4', 'POS — Punto de Venta'],
  ['5', 'Cocina'],
  ['6', 'Domicilios'],
  ['7', 'Caja'],
  ['8', 'Inventario'],
  ['9', 'Centro de Inteligencia — Reportes'],
  ['10', 'Alertas'],
  ['11', 'Configuración'],
  ['12', 'Finanzas'],
  ['13', 'Personal y Usuarios'],
  ['14', 'Talonarios'],
  ['15', 'Proveedores, Compras, Ingredientes, Platos, Gastos'],
  ['16', 'Funcionalidades Transversales'],
  ['17', 'Solución de Problemas'],
  ['18', 'URLs de Referencia'],
];
for (const [num, title] of tocItems) {
  doc.fillColor(dark).fontSize(10).font('Helvetica-Bold');
  const txt = `${num}. ${title}`;
  const w = doc.widthOfString(txt);
  doc.text(txt, 45, doc.y, { lineGap: 5 });
}
doc.addPage();

// ═══════════════════════════════════════════════════════════════════
// 1. ROLES Y ACCESOS
// ═══════════════════════════════════════════════════════════════════
h1('1. Roles y Accesos');
p('Cada usuario del sistema tiene un rol que determina qué módulos puede ver y qué acciones puede ejecutar. A continuación se presenta la matriz completa de acceso.');

h2('Roles del Sistema');
const roles = [
  ['admin', 'Acceso total a todos los módulos y funcionalidades'],
  ['cajero', 'POS, caja, domicilios (lectura), alertas, talonarios, cocina (marcar pagado)'],
  ['cocinero', 'Cocina (aceptar/entregar), domicilios (aceptar), dashboard'],
  ['mesero', 'Solo perfil personal, sin acceso a módulos de gestión'],
  ['cliente', 'Perfil personal y tienda pública'],
];
for (const [role, desc] of roles) {
  doc.fillColor(bronze).fontSize(9.5).font('Helvetica-Bold').text(role, { continued: true });
  doc.fillColor(dark).font('Helvetica').text(` — ${desc}`);
  doc.moveDown(0.15);
}

spacer();
h2('Matriz de Acceso por Módulo');
const modHeaders = ['Módulo', 'admin', 'cajero', 'cocinero', 'mesero', 'cliente'];
const modColW = [130, 48, 48, 52, 48, 48];
const modRows = [
  ['Dashboard',        '✅', '✅', '✅', '❌', '❌'],
  ['POS (ventas)',     '✅', '✅', '❌', '❌', '❌'],
  ['Caja',             '✅', '✅', '❌', '❌', '❌'],
  ['Inventario',       '✅', '❌', '❌', '❌', '❌'],
  ['Categorías',       '✅', '❌', '❌', '❌', '❌'],
  ['Ingredientes',     '✅', '❌', '❌', '❌', '❌'],
  ['Platos (recetas)','✅', '❌', '❌', '❌', '❌'],
  ['Proveedores',      '✅', '❌', '❌', '❌', '❌'],
  ['Compras',          '✅', '❌', '❌', '❌', '❌'],
  ['Gastos',           '✅', '❌', '❌', '❌', '❌'],
  ['Finanzas',         '✅', '❌', '❌', '❌', '❌'],
  ['Reportes',         '✅', '❌', '❌', '❌', '❌'],
  ['Alertas',          '✅', '✅', '❌', '❌', '❌'],
  ['Cocina',           '✅', '❌', '✅', '❌', '❌'],
  ['Domicilios',       '✅', '✅', '✅', '❌', '❌'],
  ['Staff / Usuarios','✅', '❌', '❌', '❌', '❌'],
  ['Talonarios',       '✅', '✅', '❌', '❌', '❌'],
  ['Mesas',            '✅', '✅', '❌', '❌', '❌'],
  ['Configuración',    '✅', '❌', '❌', '❌', '✅*'],
];
doc.y = drawTable(modHeaders, modRows, modColW, doc.y);
doc.fillColor(gray).fontSize(7).font('Helvetica-Oblique').text('* Cliente solo ve su perfil personal');

doc.addPage();

// ═══════════════════════════════════════════════════════════════════
// 2. PRIMER INGRESO
// ═══════════════════════════════════════════════════════════════════
h1('2. Primer Ingreso');

p('Para acceder al sistema, abra su navegador y diríjase a la URL del frontend. Aparecerá la pantalla de inicio de sesión.');

img('01-login.png', { caption: 'Pantalla de inicio de sesión' });

spacer();
p('Ingrese su correo electrónico y contraseña. Si es la primera vez, utilice las credenciales proporcionadas por el administrador.');

h2('Credenciales de Prueba');
const credHeaders = ['Perfil', 'Email', 'Contraseña'];
const credColW = [75, 200, 130];
const credRows = [
  ['admin',   'admin@test.com',    'Admin123!'],
  ['cajero',  'cajero@test.com',   'Cajero123!'],
  ['cocinero','cocinero@test.com', 'Cocinero123!'],
  ['mesero',  'mesero@test.com',   'Mesero123!'],
];
doc.y = drawTable(credHeaders, credRows, credColW, doc.y);

doc.addPage();

// ═══════════════════════════════════════════════════════════════════
// 3. DASHBOARD
// ═══════════════════════════════════════════════════════════════════
h1('3. Dashboard');
p('Pantalla principal que resume el estado del negocio en tiempo real. Muestra indicadores clave como ingresos del día, número de transacciones, ticket promedio y las órdenes de cocina pendientes. La información se actualiza automáticamente vía WebSocket.');

img('02-dashboard.png', { caption: 'Dashboard principal con KPIs del día' });

doc.addPage();

// ═══════════════════════════════════════════════════════════════════
// 4. POS
// ═══════════════════════════════════════════════════════════════════
h1('4. POS — Punto de Venta');
p('El módulo POS permite registrar ventas de forma rápida e intuitiva. Roles: admin y cajero.');

img('03-pos.png', { caption: 'Pantalla del POS con carrito de compras' });

spacer();
p('Flujo de uso:');
bullet('Seleccione una mesa (para consumo en el local) o déjela vacía (para domicilio)');
bullet('Busque productos por nombre o código de barras y agréguelos al carrito');
bullet('Ajuste cantidades según sea necesario');
bullet('Seleccione el método de pago: Efectivo, Transferencia o Mixto');
bullet('Presione "Cobrar" para completar la transacción');
bullet('Si tiene mesa asignada → se crea una orden de cocina automáticamente');
bullet('Si NO tiene mesa → se genera un domicilio automáticamente');

doc.addPage();

// ═══════════════════════════════════════════════════════════════════
// 5. COCINA
// ═══════════════════════════════════════════════════════════════════
h1('5. Cocina');
p('El panel de cocina permite gestionar las órdenes en tiempo real. Roles: admin y cocinero. Las órdenes llegan automáticamente desde POS sin necesidad de recargar la página.');

img('04-kitchen.png', { caption: 'Panel de cocina con columnas de estado' });

spacer();
p('El sistema organiza los pedidos en tres columnas:');
bullet('🆕 Nuevos — pedidos recién creados. Click en "Aceptar" para comenzar la preparación');
bullet('👨‍🍳 En Preparación — pedidos en curso. Click en "Entregado" cuando estén listos');
bullet('✅ Entregados — pedidos finalizados. El cajero marca como pagado desde Caja');
spacer(0.3);
p('Al llegar un nuevo pedido, el sistema reproduce un timbre de notificación sonora (Web Audio API). También hay un botón 🖨️ para imprimir el ticket del pedido.');

doc.addPage();

// ═══════════════════════════════════════════════════════════════════
// 6. DOMICILIOS
// ═══════════════════════════════════════════════════════════════════
h1('6. Domicilios');
p('Kanban de entregas a domicilio con actualización en tiempo real. Roles: admin, cajero (lectura), cocinero.');

img('05-domicilios.png', { caption: 'Gestión de domicilios en vista Kanban' });

spacer();
p('Cuatro columnas de estado:');
bullet('🆕 Pendientes — aceptar el domicilio para iniciar preparación');
bullet('👨‍🍳 En Preparación — despachar cuando esté listo (asigna repartidor automáticamente)');
bullet('🛵 En Camino — marcar como entregado cuando el repartidor finalice');
bullet('✅ Entregados — histórico de entregas completadas');

doc.addPage();

// ═══════════════════════════════════════════════════════════════════
// 7. CAJA
// ═══════════════════════════════════════════════════════════════════
h1('7. Caja');
p('Módulo de gestión de caja para controlar ingresos y egresos del turno. Roles: admin y cajero.');

img('06-caja.png', { caption: 'Gestión de apertura y cierre de caja' });

spacer();
p('Funcionalidades:');
bullet('Abrir caja — registrar el monto inicial del turno');
bullet('Cerrar caja — ingresar ingresos/egresos manuales; el sistema calcula la diferencia vs ventas registradas');
bullet('Historial — consultar cierres de caja anteriores');

doc.addPage();

// ═══════════════════════════════════════════════════════════════════
// 8. INVENTARIO
// ═══════════════════════════════════════════════════════════════════
h1('8. Inventario');
p('Control completo de productos e inventario. Rol: admin.');

img('07-inventario.png', { caption: 'Listado de productos del inventario' });

spacer();
p('Funcionalidades:');
bullet('CRUD completo de productos con nombre, precio, stock, categoría');
bullet('Código de barras auto-generado basado en categoría + proveedor');
bullet('Control de stock con alertas por mínimo configurable');
bullet('Entradas y salidas manuales con registro histórico');
bullet('Escáner integrado para buscar productos por código de barras');

doc.addPage();

// ═══════════════════════════════════════════════════════════════════
// 9. REPORTES
// ═══════════════════════════════════════════════════════════════════
h1('9. Centro de Inteligencia — Reportes');
p('El módulo de reportes ofrece análisis detallado del negocio en cuatro pestañas. Rol: admin.');

img('08-reportes.png', { caption: 'Centro de Inteligencia con pestañas de análisis' });

spacer();
p('Pestañas disponibles:');
bullet('💰 Ventas — KPIs, tendencia diaria, ventas por categoría, método de pago, horas pico');
bullet('📦 Inventario — valoración por categoría, estado del stock, ganancia potencial');
bullet('⭐ Productos — top 10 más vendidos, productos sin movimiento, márgenes');
bullet('👨‍🍳 Cocina — tiempos de preparación por cocinero, detalle de pedidos');
spacer(0.3);
p('Cada pestaña tiene un botón 📥 CSV para exportar los datos a un archivo compatible con Microsoft Excel.');

doc.addPage();

// ═══════════════════════════════════════════════════════════════════
// 10. ALERTAS
// ═══════════════════════════════════════════════════════════════════
h1('10. Alertas');
p('Gestión de alertas de stock bajo y productos agotados. Roles: admin y cajero.');

img('09-alertas.png', { caption: 'Panel de alertas de inventario' });

spacer();
p('Funcionalidades:');
bullet('Lista de alertas de stock bajo y productos agotados con nivel de criticidad');
bullet('Marcar alertas como leídas (individualmente o todas)');
bullet('Botón "Verificar Stock" para escanear el inventario y generar nuevas alertas');
bullet('Si la configuración SMTP está activa, envía un correo automático con el detalle');

doc.addPage();

// ═══════════════════════════════════════════════════════════════════
// 11. CONFIGURACIÓN
// ═══════════════════════════════════════════════════════════════════
h1('11. Configuración');
p('Ajustes generales del sistema. Admin ve configuración completa; cliente ve solo su perfil.');

img('10-configuracion.png', { caption: 'Página de configuración del restaurante' });

spacer();
p('Campos disponibles para admin:');
bullet('Nombre del establecimiento, teléfono, dirección y número de WhatsApp');
bullet('Logo del restaurante (subida de imagen)');
bullet('Configuración SMTP: servidor, puerto, usuario, contraseña, email remitente y alerta');
bullet('Botón "Limpiar Caché Local" para forzar recarga de datos frescos');
spacer(0.3);
p('Para clientes: nombre, teléfono y dirección (perfil personal).');

doc.addPage();

// ═══════════════════════════════════════════════════════════════════
// 12. FINANZAS
// ═══════════════════════════════════════════════════════════════════
h1('12. Finanzas');
p('Panel financiero completo del restaurante. Rol: admin.');

img('11-finanzas.png', { caption: 'Panel de finanzas con P&L y flujo de caja' });

spacer();
p('Indicadores disponibles:');
bullet('Resumen financiero: ingresos, costos, gastos y utilidad neta');
bullet('Flujo de caja detallado por período');
bullet('Estado de Pérdidas y Ganancias (P&L) mensual');
bullet('Gráficos comparativos de ingresos vs gastos');

doc.addPage();

// ═══════════════════════════════════════════════════════════════════
// 13. STAFF
// ═══════════════════════════════════════════════════════════════════
h1('13. Personal y Usuarios');
p('Gestión del equipo de trabajo y cuentas del sistema. Rol: admin.');

img('12-staff.png', { caption: 'Gestión de personal y usuarios del sistema' });

spacer();
p('Dos pestañas:');
bullet('👥 Empleados — gestión de datos: nombre, cargo, salario, contacto');
bullet('🔐 Usuarios del Sistema — CRUD de cuentas con asignación de roles (admin, cajero, cocinero, mesero, cliente)');

doc.addPage();

// ═══════════════════════════════════════════════════════════════════
// 14. TALONARIOS
// ═══════════════════════════════════════════════════════════════════
h1('14. Talonarios');
p('Control de talonarios de facturación. Roles: admin y cajero.');

img('13-talonarios.png', { caption: 'Registro de talonarios de facturación' });

spacer();
p('Funcionalidades:');
bullet('Registro de talonarios con rangos numéricos (desde/hasta)');
bullet('Consumo automático de facturas al realizar ventas');
bullet('Control de numeración consecutiva');

doc.addPage();

// ═══════════════════════════════════════════════════════════════════
// 15. PROVEEDORES, COMPRAS, INGREDIENTES, PLATOS, GASTOS
// ═══════════════════════════════════════════════════════════════════
h1('15. Módulos Administrativos');

h2('15.1 Proveedores');
p('Gestión de proveedores del restaurante. CRUD completo con datos de contacto.');

h2('15.2 Compras');
p('Registro de órdenes de compra a proveedores. Control de estado (pendiente, recibida, cancelada).');

h2('15.3 Ingredientes');
p('Catálogo de ingredientes con unidad de medida, costo unitario y stock mínimo. Base para las recetas.');

h2('15.4 Platos (Recetas)');
p('Definición de platos del menú con recetas: cada plato se compone de ingredientes con cantidades específicas. Los costos y precios se calculan automáticamente.');

img('17-platos.png', { caption: 'Gestión de platos con recetas e ingredientes' });

h2('15.5 Gastos');
p('Registro de gastos operativos del negocio con categorización y reportes.');

doc.addPage();

// ═══════════════════════════════════════════════════════════════════
// 16. FUNCIONALIDADES TRANSVERSALES
// ═══════════════════════════════════════════════════════════════════
h1('16. Funcionalidades Transversales');

h2('WebSocket — Tiempo Real');
p('El sistema utiliza Socket.IO para actualizaciones en tiempo real. La cocina, domicilios y dashboard se actualizan automáticamente. Un indicador ⚡ en la esquina superior muestra el estado de conexión (verde = conectado, rojo = desconectado).');

h2('Notificación Sonora');
p('Cuando llega un nuevo pedido a cocina, el sistema reproduce un timbre usando la Web Audio API. No requiere archivos de audio externos y funciona en cualquier navegador moderno.');

h2('Caché Inteligente');
p('Los datos se almacenan en caché local (memoria + localStorage) para reducir llamadas al servidor. Cada tipo de dato tiene un TTL configurable:');
bullet('Productos: 5 minutos');
bullet('Categorías: 10 minutos');
bullet('Alertas: 2 minutos');
bullet('Configuración: 30 minutos');
bullet('Reportes: 5 minutos');
spacer(0.2);
p('Use el botón "Limpiar Caché Local" en Configuración para forzar una recarga completa.');

h2('Exportación de Reportes (CSV)');
p('Cada pestaña del Centro de Inteligencia tiene un botón 📥 CSV. Los archivos se generan con BOM UTF-8 para compatibilidad con Microsoft Excel y correcta visualización de caracteres especiales.');

h2('Alertas por Correo Electrónico');
p('Si la configuración SMTP está activa, al verificar el stock se envía un correo automático con el detalle de productos en nivel crítico.');

doc.addPage();

// ═══════════════════════════════════════════════════════════════════
// 17. SOLUCIÓN DE PROBLEMAS
// ═══════════════════════════════════════════════════════════════════
h1('17. Solución de Problemas');
const probHeaders = ['Problema', 'Solución'];
const probColW = [180, 320];
const probRows = [
  ['No carga el dashboard',           'Verificar conexión a Internet. Cerrar sesión y volver a iniciar.'],
  ['Pedidos no aparecen en cocina',   'Revisar el indicador ⚡ (debe estar verde). Recargar la página.'],
  ['No llegan correos de alerta',     'Configurar SMTP en Settings > Email con credenciales válidas.'],
  ['Datos desactualizados',           'Ir a Settings y usar "🧹 Limpiar Caché Local".'],
  ['Error 403 en un módulo',          'Su rol no tiene permisos. Contactar al administrador.'],
  ['Error 401 (no autorizado)',       'La sesión expiró. Iniciar sesión nuevamente.'],
  ['Stock insuficiente',              'Revisar inventario y realizar una compra para reponer.'],
  ['No puedo iniciar sesión',         'Verificar credenciales. Contactar al administrador.'],
  ['Error interno del servidor',      'Esperar e intentar de nuevo. Reportar al administrador si persiste.'],
];
doc.y = drawTable(probHeaders, probRows, probColW, doc.y);

spacer();
h2('Recomendaciones');
bullet('Mantener la sesión activa — si está inactivo mucho tiempo, la sesión expira');
bullet('Usar Chrome o Edge actualizados para mejor compatibilidad');
bullet('Verificar la conexión ⚡ WebSocket antes de reportar problemas de tiempo real');
bullet('Limpiar la caché periódicamente si nota datos inconsistentes');

doc.addPage();

// ═══════════════════════════════════════════════════════════════════
// 18. URLs DE REFERENCIA
// ═══════════════════════════════════════════════════════════════════
h1('18. URLs de Referencia');
const urlHeaders = ['Recurso', 'URL'];
const urlColW = [130, 380];
const urlRows = [
  ['App Frontend',   'https://lasoupealoignon.vercel.app'],
  ['API Backend',    'https://demorestbknd.onrender.com'],
  ['Health Check',   'https://demorestbknd.onrender.com/api/health'],
  ['Repositorio',    'https://github.com/CrisAguirre/demorest'],
];
doc.y = drawTable(urlHeaders, urlRows, urlColW, doc.y);

spacer(1.5);
doc.fillColor(gold).fontSize(13).font('Helvetica-Bold').text('La Soupe à l\'Oignon', { align: 'center' });
doc.fillColor(gray).fontSize(9.5).font('Helvetica').text('Buen provecho y excelentes ventas.', { align: 'center' });
doc.fillColor(gray).fontSize(7).text(`Documento generado el ${new Date().toLocaleDateString('es-CO')} — Todos los derechos reservados`, { align: 'center' });

addFooter();
doc.end();
console.log(`PDF generado: ${outPath}`);
