const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

const doc = new PDFDocument({
  size: 'LETTER',
  margins: { top: 50, bottom: 50, left: 55, right: 55 },
  info: {
    Title: 'Manual de Usuario - La Soupe à l\'Oignon',
    Author: 'Sistema de Gestión',
    Subject: 'Manual de Usuario'
  }
});

const SCREENSHOTS = 'C:\\Users\\USUARIO\\AppData\\Local\\Temp\\opencode\\screenshots';
const outPath = path.join(__dirname, 'MANUAL_DE_USUARIO.pdf');
doc.pipe(fs.createWriteStream(outPath));

const gold = '#D4AF37';
const bronze = '#8B5A2B';
const dark = '#151822';
const gray = '#888';
const white = '#FFFFFF';
const cream = '#FFFDF5';
const lightBg = '#F8F6F0';
const PAGE_W = doc.page.width - doc.page.margins.left - doc.page.margins.right; // usable width

function writeFooter() {
  doc.save();
  doc.fontSize(6.5).font('Helvetica').fillColor('#BBBBBB');
  doc.text('Manual de Usuario  —  La Soupe à l\'Oignon', doc.page.margins.left, doc.page.height - 30, { lineBreak: false });
  doc.restore();
}
function pageBreak() {
  writeFooter();
  doc.addPage();
}

// ── Layout helpers ──
function checkSpace(needed) {
  const remaining = doc.page.height - doc.page.margins.bottom - doc.y;
  if (remaining < needed) pageBreak();
}

function h1(text) {
  checkSpace(60);
  doc.fillColor(dark).fontSize(22).font('Helvetica-Bold').text(text, { underline: false });
  doc.moveDown(0.15);
  doc.fillColor(gold).rect(doc.page.margins.left, doc.y, 60, 2.5).fill();
  doc.moveDown(0.7);
}

function h2(text) {
  checkSpace(35);
  doc.fillColor(bronze).fontSize(12.5).font('Helvetica-Bold').text(text, { underline: false });
  doc.moveDown(0.25);
}

function body(text) {
  doc.fillColor(dark).fontSize(9).font('Helvetica').text(text, { align: 'justify', lineGap: 2 });
  doc.moveDown(0.2);
}

function bullet(text, indent = 12) {
  checkSpace(12);
  doc.fillColor(dark).fontSize(9).font('Helvetica');
  doc.x = doc.page.margins.left + indent;
  doc.text(`• ${text}`, { lineGap: 1 });
  doc.moveDown(0.08);
}

function spacer(h) { doc.moveDown(h || 0.35); }

function screenshot(name, opts = {}) {
  const fp = path.join(SCREENSHOTS, name);
  if (!fs.existsSync(fp)) { body(`[imagen ${name} no encontrada]`); return; }

  const imgW = opts.width || Math.round(PAGE_W * 0.78);
  // Calculate proportional height
  const imgObj = doc.openImage(fp);
  const ratio = imgW / imgObj.width;
  const imgH = imgObj.height * ratio;
  const needed = imgH + (opts.caption ? 30 : 10);

  checkSpace(needed + 15);

  const xOff = Math.round((PAGE_W - imgW) / 2);
  try {
    doc.image(fp, doc.page.margins.left + xOff, doc.y, { width: imgW });
    doc.moveDown(0.15);
    if (opts.caption) {
      doc.fillColor(gray).fontSize(7).font('Helvetica-Oblique').text(opts.caption, { align: 'center' });
      doc.moveDown(0.25);
    }
  } catch (e) {
    body(`[error al cargar ${name}]`);
  }
}

// ── Tables ──
function drawTable(headers, rows, colW) {
  const left = doc.page.margins.left;
  const totalW = colW.reduce((a, b) => a + b, 0);
  const colX = [];
  let x = left;
  for (const w of colW) { colX.push(x); x += w; }

  const headerH = 22;
  const rowH = 19;
  const tableH = headerH + rows.length * rowH + 4;

  checkSpace(tableH + 20);

  const startY = doc.y;
  // Header
  doc.rect(left, startY, totalW, headerH).fill(dark);
  doc.fillColor(gold).fontSize(7.5).font('Helvetica-Bold');
  for (let i = 0; i < headers.length; i++)
    doc.text(headers[i], colX[i] + 5, startY + 6, { width: colW[i] - 5 });

  let y = startY + headerH;
  for (let ri = 0; ri < rows.length; ri++) {
    const bg = ri % 2 === 0 ? white : lightBg;
    doc.fillColor(bg).rect(left, y, totalW, rowH).fill();
    doc.fillColor(dark).fontSize(7).font('Helvetica');
    for (let ci = 0; ci < rows[ri].length; ci++)
      doc.text(rows[ri][ci], colX[ci] + 5, y + 5, { width: colW[ci] - 5 });
    y += rowH;
  }
  doc.strokeColor('#CCCCCC').lineWidth(0.5).rect(left, startY, totalW, y - startY).stroke();
  doc.y = y + 6;
}

// ═══════════════════════════════════════════════════════════════════════
// COVER PAGE
// ═══════════════════════════════════════════════════════════════════════
doc.fillColor('#0A0C14').rect(0, 0, doc.page.width, doc.page.height).fill();

// Gold accent stripes
doc.fillColor(gold).rect(0, 170, doc.page.width, 3.5).fill();
doc.fillColor(gold).rect(0, doc.page.height - 80, doc.page.width, 0.5).fill();

doc.fillColor(gold).fontSize(46).font('Helvetica-Bold');
doc.text('La Soupe', 0, 215, { align: 'center' });
doc.text("à l'Oignon", 0, 268, { align: 'center' });

doc.fillColor(white).fontSize(21).font('Helvetica');
doc.text('Manual de Usuario', 0, 340, { align: 'center' });

doc.fillColor('#AAAAAA').fontSize(11).font('Helvetica');
doc.text('Sistema de Gestión Restaurantera', 0, 385, { align: 'center' });
const dateStr = new Date().toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' });
doc.text(`Versión 1.0 — ${dateStr}`, 0, 408, { align: 'center' });

// ═══════════════════════════════════════════════════════════════════════
// TABLE OF CONTENTS
// ═══════════════════════════════════════════════════════════════════════
pageBreak();
h1('Índice');

const toc = [
  [1, 'Roles y Accesos', 'Matriz completa de permisos por rol'],
  [2, 'Primer Ingreso', 'Cómo acceder al sistema y credenciales de prueba'],
  [3, 'Dashboard', 'Panel principal con KPIs del día'],
  [4, 'POS — Punto de Venta', 'Registro de ventas y cobros'],
  [5, 'Cocina', 'Gestión de pedidos en tiempo real'],
  [6, 'Domicilios', 'Kanban de entregas a domicilio'],
  [7, 'Caja', 'Apertura, cierre e histórico de caja'],
  [8, 'Inventario', 'Control de stock y productos'],
  [9, 'Reportes — Centro de Inteligencia', 'Análisis y exportación de datos'],
  [10, 'Alertas', 'Alertas de stock y configuración SMTP'],
  [11, 'Configuración', 'Ajustes del restaurante y perfil'],
  [12, 'Finanzas', 'P&L, flujo de caja y resumen financiero'],
  [13, 'Personal y Usuarios', 'Empleados y cuentas del sistema'],
  [14, 'Talonarios', 'Control de facturación'],
  [15, 'Módulos Administrativos', 'Proveedores, compras, ingredientes, platos, gastos'],
  [16, 'Funcionalidades Transversales', 'WebSocket, caché, CSV, email'],
  [17, 'Solución de Problemas', 'Errores comunes y recomendaciones'],
  [18, 'URLs de Referencia', 'Enlaces a frontend, API y repositorio'],
];

doc.moveDown(0.5);
for (const [num, title, desc] of toc) {
  checkSpace(18);
  const n = `${num.toString().padStart(2, '0')}.`;
  doc.fillColor(gold).fontSize(9).font('Helvetica-Bold').text(n, doc.page.margins.left, doc.y, { width: 28, continued: true });
  doc.fillColor(dark).fontSize(10).font('Helvetica-Bold').text(title, { continued: true });
  doc.fillColor(gray).fontSize(8.5).font('Helvetica').text(`  ${desc}`, { lineGap: 4 });
}

pageBreak();

// ═══════════════════════════════════════════════════════════════════════
// 1. ROLES Y ACCESOS
// ═══════════════════════════════════════════════════════════════════════
h1('1. Roles y Accesos');
body('Cada usuario tiene un rol que determina qué módulos puede ver y qué acciones puede realizar. A continuación se describen los roles y la matriz de acceso completa.');

h2('Roles del Sistema');
const roles = [
  ['admin',    'Acceso total a todos los módulos y funcionalidades del sistema'],
  ['cajero',   'POS, caja, domicilios (lectura), alertas, talonarios, cocina (marcar pagado)'],
  ['cocinero', 'Cocina (aceptar/entregar), domicilios (aceptar), dashboard'],
  ['mesero',   'Solo perfil personal, sin acceso a módulos de gestión'],
  ['cliente',  'Perfil personal y tienda pública'],
];
spacer(0.2);
for (const [role, desc] of roles) {
  checkSpace(15);
  doc.fillColor(bronze).fontSize(9).font('Helvetica-Bold').text(` ${role}  `, { continued: true });
  doc.fillColor(dark).font('Helvetica').text(desc, { lineGap: 3 });
}

spacer(0.5);
h2('Matriz de Acceso por Módulo');

drawTable(
  ['Módulo', 'admin', 'cajero', 'cociner', 'mesero', 'cliente'],
  [
    ['Dashboard',        '✓', '✓', '✓', '—', '—'],
    ['POS (ventas)',     '✓', '✓', '—', '—', '—'],
    ['Caja',             '✓', '✓', '—', '—', '—'],
    ['Inventario',       '✓', '—', '—', '—', '—'],
    ['Categorías',       '✓', '—', '—', '—', '—'],
    ['Ingredientes',     '✓', '—', '—', '—', '—'],
    ['Platos',           '✓', '—', '—', '—', '—'],
    ['Proveedores',      '✓', '—', '—', '—', '—'],
    ['Compras',          '✓', '—', '—', '—', '—'],
    ['Gastos',           '✓', '—', '—', '—', '—'],
    ['Finanzas',         '✓', '—', '—', '—', '—'],
    ['Reportes',         '✓', '—', '—', '—', '—'],
    ['Alertas',          '✓', '✓', '—', '—', '—'],
    ['Cocina',           '✓', '—', '✓', '—', '—'],
    ['Domicilios',       '✓', '✓', '✓', '—', '—'],
    ['Staff/Usuarios',   '✓', '—', '—', '—', '—'],
    ['Talonarios',       '✓', '✓', '—', '—', '—'],
    ['Mesas',            '✓', '✓', '—', '—', '—'],
    ['Configuración',    '✓', '—', '—', '—', '*}'],
  ],
  [130, 48, 48, 48, 48, 48]
);
doc.fillColor(gray).fontSize(7).font('Helvetica-Oblique').text('  * Cliente solo ve su perfil personal');
pageBreak();

// ═══════════════════════════════════════════════════════════════════════
// 2. PRIMER INGRESO
// ═══════════════════════════════════════════════════════════════════════
h1('2. Primer Ingreso');
body('Abra su navegador y diríjase a la URL del frontend. Aparecerá la pantalla de inicio de sesión con el logo del restaurante.');

screenshot('01-login.png', { caption: 'Pantalla de inicio de sesión con formulario de acceso' });

body('Ingrese su correo electrónico y contraseña. Si es la primera vez, utilice las credenciales proporcionadas por el administrador.');

h2('Credenciales de Prueba');
drawTable(
  ['Perfil', 'Email', 'Contraseña'],
  [
    ['admin',    'admin@test.com',    'Admin123!'],
    ['cajero',   'cajero@test.com',   'Cajero123!'],
    ['cocinero', 'cocinero@test.com', 'Cocinero123!'],
    ['mesero',   'mesero@test.com',   'Mesero123!'],
  ],
  [80, 200, 130]
);

pageBreak();

// ═══════════════════════════════════════════════════════════════════════
// 3. DASHBOARD
// ═══════════════════════════════════════════════════════════════════════
h1('3. Dashboard');
body('El dashboard es la pantalla principal que resume el estado del negocio en tiempo real. Muestra indicadores clave como ingresos del día, número de transacciones, ticket promedio, y las órdenes de cocina pendientes. Los datos se actualizan automáticamente vía WebSocket.');

screenshot('02-dashboard.png', { caption: 'Dashboard principal con KPIs del día y pedidos en curso' });

body('Acceda rápidamente a POS, Cocina y demás módulos desde las tarjetas de acceso directo. Las alertas de stock bajo aparecen como notificaciones en el navbar.');

pageBreak();

// ═══════════════════════════════════════════════════════════════════════
// 4. POS — PUNTO DE VENTA
// ═══════════════════════════════════════════════════════════════════════
h1('4. POS — Punto de Venta');
body('El módulo POS permite registrar ventas de forma rápida e intuitiva. Accesible para admin y cajero.');

screenshot('03-pos.png', { caption: 'Pantalla del POS con carrito de compras y productos' });

h2('Flujo de uso');
bullet('Seleccione una mesa (consumo en local) o déjela vacía (domicilio)');
bullet('Busque productos por nombre o código de barras y agréguelos al carrito');
bullet('Ajuste cantidades según sea necesario');
bullet('Seleccione el método de pago: Efectivo, Transferencia o Mixto');
bullet('Presione "Cobrar" para completar la transacción');
bullet('Con mesa asignada → se crea una orden de cocina');
bullet('Sin mesa → se genera un domicilio automáticamente');

pageBreak();

// ═══════════════════════════════════════════════════════════════════════
// 5. COCINA
// ═══════════════════════════════════════════════════════════════════════
h1('5. Cocina');
body('El panel de cocina permite gestionar las órdenes en tiempo real. Roles: admin y cocinero. Las órdenes llegan automáticamente desde POS sin necesidad de recargar la página, gracias a WebSocket.');

screenshot('04-kitchen.png', { caption: 'Panel de cocina con pedidos organizados por estado' });

h2('Columnas de estado');
bullet('🆕 Nuevos — pedidos recién creados. Click "Aceptar" para iniciar preparación');
bullet('👨‍🍳 En Preparación — pedidos en curso. Click "Entregado" al finalizar');
bullet('✅ Entregados — pedidos completados. El cajero marca como pagado');
spacer(0.2);
body('Al llegar un nuevo pedido, el sistema reproduce un timbre (Web Audio API). También hay un botón 🖨️ para imprimir el ticket del pedido.');

pageBreak();

// ═══════════════════════════════════════════════════════════════════════
// 6. DOMICILIOS
// ═══════════════════════════════════════════════════════════════════════
h1('6. Domicilios');
body('Kanban de entregas a domicilio con actualización en tiempo real. Roles: admin, cajero (solo lectura), cocinero.');

screenshot('05-domicilios.png', { caption: 'Gestión de domicilios en vista Kanban con cuatro estados' });

h2('Columnas de estado');
bullet('🆕 Pendientes — aceptar el domicilio para comenzar preparación');
bullet('👨‍🍳 En Preparación — despachar cuando esté listo (asigna repartidor)');
bullet('🛵 En Camino — marcar como entregado cuando finalice');
bullet('✅ Entregados — histórico de entregas completadas');

pageBreak();

// ═══════════════════════════════════════════════════════════════════════
// 7. CAJA
// ═══════════════════════════════════════════════════════════════════════
h1('7. Caja');
body('Gestión de apertura y cierre de caja. Roles: admin y cajero. Permite controlar ingresos y egresos del turno.');

screenshot('06-caja.png', { caption: 'Pantalla de caja con resumen del turno' });

h2('Funcionalidades');
bullet('Abrir caja — registrar el monto inicial del turno');
bullet('Cerrar caja — ingresar ingresos/egresos manuales; el sistema calcula la diferencia vs ventas registradas');
bullet('Historial — consultar cierres de caja anteriores con detalle');

pageBreak();

// ═══════════════════════════════════════════════════════════════════════
// 8. INVENTARIO
// ═══════════════════════════════════════════════════════════════════════
h1('8. Inventario');
body('Control completo de productos e inventario. Rol: admin. Gestione el stock, precios y alertas de cada producto.');

screenshot('07-inventario.png', { caption: 'Listado del inventario con controles CRUD' });

h2('Funcionalidades');
bullet('CRUD completo: nombre, precio, stock, categoría, código de barras');
bullet('Código de barras auto-generado basado en categoría + proveedor');
bullet('Alertas configurables por stock mínimo');
bullet('Entradas y salidas manuales con registro histórico');
bullet('Escáner integrado para búsqueda por código de barras');

pageBreak();

// ═══════════════════════════════════════════════════════════════════════
// 9. REPORTES — CENTRO DE INTELIGENCIA
// ═══════════════════════════════════════════════════════════════════════
h1('9. Reportes — Centro de Inteligencia');
body('Análisis detallado del negocio en cuatro pestañas. Rol: admin. Cada pestaña presenta gráficos, tablas y un botón de exportación a CSV.');

screenshot('08-reportes.png', { caption: 'Centro de Inteligencia con pestañas de análisis' });

h2('Pestañas');
bullet('💰 Ventas — KPIs, tendencia diaria, ventas por categoría, método de pago, horas pico');
bullet('📦 Inventario — valoración por categoría, estado del stock, ganancia potencial');
bullet('⭐ Productos — top 10 más vendidos, productos sin movimiento, márgenes');
bullet('👨‍🍳 Cocina — tiempos de preparación, detalle de pedidos por cocinero');

pageBreak();

// ═══════════════════════════════════════════════════════════════════════
// 10. ALERTAS
// ═══════════════════════════════════════════════════════════════════════
h1('10. Alertas');
body('Gestión de alertas de stock bajo y productos agotados. Roles: admin y cajero.');

screenshot('09-alertas.png', { caption: 'Panel de alertas con nivel de criticidad' });

h2('Funcionalidades');
bullet('Lista de alertas con nivel de criticidad (bajo, crítico, agotado)');
bullet('Marcar como leídas individualmente o todas a la vez');
bullet('Botón "Verificar Stock" para escanear y generar nuevas alertas');
bullet('Envío automático de correo SMTP si está configurado');

pageBreak();

// ═══════════════════════════════════════════════════════════════════════
// 11. CONFIGURACIÓN
// ═══════════════════════════════════════════════════════════════════════
h1('11. Configuración');
body('Ajustes generales del sistema. Admin ve la configuración completa; el cliente ve solo su perfil personal.');

screenshot('10-configuracion.png', { caption: 'Página de configuración del restaurante' });

h2('Campos para administrador');
bullet('Nombre del establecimiento, teléfono, dirección, WhatsApp');
bullet('Logo del restaurante (subida de imagen)');
bullet('Configuración SMTP: servidor, puerto, credenciales, email remitente y alerta');
bullet('Botón "Limpiar Caché Local" para forzar recarga de datos');

pageBreak();

// ═══════════════════════════════════════════════════════════════════════
// 12. FINANZAS
// ═══════════════════════════════════════════════════════════════════════
h1('12. Finanzas');
body('Panel financiero completo del restaurante. Rol: admin. Incluye estado de resultados, flujo de caja y gráficos comparativos.');

screenshot('11-finanzas.png', { caption: 'Panel de finanzas con P&L y flujo de caja' });

h2('Indicadores');
bullet('Resumen financiero: ingresos, costos, gastos y utilidad neta');
bullet('Flujo de caja detallado por período');
bullet('Estado de Pérdidas y Ganancias (P&L) mensual');
bullet('Gráficos de ingresos vs gastos');

pageBreak();

// ═══════════════════════════════════════════════════════════════════════
// 13. PERSONAL Y USUARIOS
// ═══════════════════════════════════════════════════════════════════════
h1('13. Personal y Usuarios');
body('Gestión del equipo de trabajo y cuentas del sistema. Rol: admin. Dos pestañas para administrar empleados y usuarios del sistema.');

screenshot('12-staff.png', { caption: 'Gestión de personal y usuarios del sistema' });

h2('Pestañas');
bullet('👥 Empleados — datos del personal: nombre, cargo, salario, contacto');
bullet('🔐 Usuarios del Sistema — CRUD de cuentas con roles: admin, cajero, cocinero, mesero, cliente');

pageBreak();

// ═══════════════════════════════════════════════════════════════════════
// 14. TALONARIOS
// ═══════════════════════════════════════════════════════════════════════
h1('14. Talonarios');
body('Control de talonarios de facturación. Roles: admin y cajero.');

screenshot('13-talonarios.png', { caption: 'Registro de talonarios de facturación' });

h2('Funcionalidades');
bullet('Registro de talonarios con rangos numéricos (desde/hasta)');
bullet('Consumo automático de facturas al realizar ventas');
bullet('Control de numeración consecutiva');

pageBreak();

// ═══════════════════════════════════════════════════════════════════════
// 15. MÓDULOS ADMINISTRATIVOS
// ═══════════════════════════════════════════════════════════════════════
h1('15. Módulos Administrativos');

h2('15.1 Proveedores');
body('CRUD completo de proveedores con datos de contacto, teléfono y dirección. Rol: admin.');

h2('15.2 Compras');
body('Órdenes de compra a proveedores con control de estado: pendiente, recibida, cancelada. Rol: admin.');

h2('15.3 Ingredientes');
body('Catálogo de ingredientes con unidad de medida, costo unitario y stock mínimo. Base para la construcción de recetas. Rol: admin.');

h2('15.4 Platos (Recetas)');
body('Definición del menú: cada plato se compone de ingredientes con cantidades específicas. El sistema calcula automáticamente el costo y sugiere el precio de venta. Rol: admin.');

screenshot('17-platos.png', { caption: 'Gestión de platos con recetas e ingredientes' });

h2('15.5 Gastos');
body('Registro de gastos operativos categorizados (servicios, insumos, nómina, etc.) con reportes mensuales. Rol: admin.');

pageBreak();

// ═══════════════════════════════════════════════════════════════════════
// 16. FUNCIONALIDADES TRANSVERSALES
// ═══════════════════════════════════════════════════════════════════════
h1('16. Funcionalidades Transversales');

h2('WebSocket — Tiempo Real');
body('El sistema utiliza Socket.IO para actualizaciones en tiempo real en Cocina, Domicilios y Dashboard. Un indicador ⚡ en la esquina superior muestra el estado de la conexión (verde = conectado, rojo = desconectado).');

h2('Notificación Sonora');
body('Al llegar un nuevo pedido a cocina, el sistema reproduce un timbre usando la Web Audio API del navegador. No requiere archivos externos.');

h2('Caché Inteligente');
body('Los datos se almacenan en memoria + localStorage con TTL configurable para reducir viajes al servidor:');
bullet('Productos: 5 min | Categorías: 10 min | Alertas: 2 min | Config: 30 min | Reportes: 5 min');
spacer(0.15);
body('Use el botón "Limpiar Caché Local" en Configuración para forzar recarga completa.');

h2('Exportación CSV');
body('Cada pestaña del Centro de Inteligencia tiene un botón 📥 CSV. Los archivos se generan con BOM UTF-8 para compatibilidad con Excel y caracteres especiales.');

h2('Alertas por Correo');
body('Si la configuración SMTP está activa en Settings, al verificar stock se envía un correo automático con la tabla de productos en nivel crítico.');

pageBreak();

// ═══════════════════════════════════════════════════════════════════════
// 17. SOLUCIÓN DE PROBLEMAS
// ═══════════════════════════════════════════════════════════════════════
h1('17. Solución de Problemas');

drawTable(
  ['Problema', 'Solución'],
  [
    ['No carga el dashboard',         'Verificar conexión. Cerrar sesión y volver a iniciar.'],
    ['Pedidos no aparecen en cocina',  'Revisar indicador ⚡ (debe estar verde). Recargar.'],
    ['No llegan correos de alerta',    'Configurar SMTP en Settings > Email.'],
    ['Datos desactualizados',          'Settings > "🧹 Limpiar Caché Local".'],
    ['Error 403 en un módulo',         'Su rol no tiene permisos. Contactar al admin.'],
    ['Error 401 (no autorizado)',      'Sesión expirada. Iniciar sesión de nuevo.'],
    ['Stock insuficiente',             'Revisar inventario y realizar compra.'],
    ['No puedo iniciar sesión',        'Verificar credenciales. Contactar al admin.'],
    ['Error interno del servidor',     'Esperar e intentar de nuevo. Reportar si persiste.'],
  ],
  [170, 340]
);

spacer(0.6);
h2('Recomendaciones');
bullet('Mantener la sesión activa — la inactividad prolongada cierra la sesión');
bullet('Usar Chrome o Edge actualizados para mejor compatibilidad');
bullet('Verificar ⚡ WebSocket antes de reportar problemas de tiempo real');
bullet('Limpiar caché periódicamente si nota datos inconsistentes');

pageBreak();

// ═══════════════════════════════════════════════════════════════════════
// 18. URLs DE REFERENCIA
// ═══════════════════════════════════════════════════════════════════════
h1('18. URLs de Referencia');

drawTable(
  ['Recurso', 'URL'],
  [
    ['App Frontend',  'https://lasoupealoignon.vercel.app'],
    ['API Backend',   'https://demorestbknd.onrender.com'],
    ['Health Check',  'https://demorestbknd.onrender.com/api/health'],
    ['Repositorio',   'https://github.com/CrisAguirre/demorest'],
  ],
  [130, 380]
);

spacer(2);
doc.fillColor(gold).fontSize(14).font('Helvetica-Bold').text('La Soupe à l\'Oignon', { align: 'center' });
doc.fillColor(gray).fontSize(9.5).font('Helvetica').text('Buen provecho y excelentes ventas.', { align: 'center', lineGap: 4 });
doc.fillColor('#AAAAAA').fontSize(7).text(`Documento generado el ${new Date().toLocaleDateString('es-CO')}`);

writeFooter();
doc.end();
console.log(`PDF generado: ${outPath}`);
