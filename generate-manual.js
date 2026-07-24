const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

const doc = new PDFDocument({
  size: 'LETTER',
  margins: { top: 50, bottom: 50, left: 50, right: 50 },
  info: {
    Title: 'Manual de Usuario - La Soupe à l\'Oignon',
    Author: 'Sistema de Gestión',
    Subject: 'Manual de Usuario'
  }
});

const outPath = path.join(__dirname, 'MANUAL_DE_USUARIO.pdf');
doc.pipe(fs.createWriteStream(outPath));

// Override addPage to auto-add footer on outgoing page (skip cover)
let _pageCount = 0;
const _origAddPage = doc.addPage.bind(doc);
doc.addPage = function() {
  if (_pageCount > 0) addFooter();
  _pageCount++;
  return _origAddPage();
};

// ── Utility functions ──
const gold = '#D4AF37';
const bronze = '#8B5A2B';
const dark = '#151822';
const gray = '#888';
const white = '#FFFFFF';
const green = '#2E8B57';
const red = '#D32F2F';
const orange = '#FF8C00';

function header(text, opts = {}) {
  doc.fillColor(dark).fontSize(opts.size || 22).font('Helvetica-Bold');
  if (opts.color) doc.fillColor(opts.color);
  doc.text(text, { underline: false });
  if (!opts.noLine) {
    doc.moveDown(0.3);
    doc.fillColor(gold).rect(doc.x, doc.y, 60, 2).fill();
    doc.moveDown(0.8);
  }
}

function subheader(text) {
  doc.fillColor(bronze).fontSize(14).font('Helvetica-Bold').text(text, { underline: false });
  doc.moveDown(0.4);
}

function body(text) {
  doc.fillColor(dark).fontSize(10).font('Helvetica').text(text, { align: 'justify', lineGap: 2 });
  doc.moveDown(0.3);
}

function bullet(text, indent = 20) {
  doc.fillColor(dark).fontSize(10).font('Helvetica');
  doc.x = 50 + indent;
  doc.text(`• ${text}`, { indent: 0, lineGap: 2 });
  doc.moveDown(0.1);
}

function spacer(h = 0.5) { doc.moveDown(h); }

// ── Page footer helper ──
function addFooter() {
  // Save state, set footer, restore — must NOT trigger text wrapping that adds pages
  const y = doc.page.height - 35;
  doc.save();
  doc.fontSize(7).font('Helvetica').fillColor('#888888');
  doc.text('La Soupe à l\'Oignon — Manual de Usuario', 50, y, { align: 'center', lineBreak: false });
  doc.restore();
}

// ══════════════════════════════════════════════════
// COVER PAGE
// ══════════════════════════════════════════════════
doc.fillColor(dark).rect(0, 0, doc.page.width, doc.page.height).fill();
doc.fillColor(gold).fontSize(42).font('Helvetica-Bold');
doc.text('La Soupe', 50, 180, { align: 'center' });
doc.text("à l'Oignon", 50, 228, { align: 'center' });
doc.fillColor(white).fontSize(18).font('Helvetica');
doc.text('Manual de Usuario', 50, 300, { align: 'center' });
doc.fillColor(gray).fontSize(11);
doc.text('Sistema de Gestión Restaurantera', 50, 340, { align: 'center' });
doc.text(`Versión 1.0 — ${new Date().toLocaleDateString('es-CO')}`, 50, 365, { align: 'center' });
doc.fillColor(gold).rect(120, 410, 280, 2).fill();

doc.addPage();

// ══════════════════════════════════════════════════
// TABLE OF CONTENTS
// ══════════════════════════════════════════════════
header('Índice');
const toc = [
  ['1', 'Roles y Accesos'],
  ['2', 'Primer Ingreso'],
  ['3', 'Módulos Principales'],
  ['', '  3.1 Dashboard'],
  ['', '  3.2 POS — Punto de Venta'],
  ['', '  3.3 Cocina'],
  ['', '  3.4 Domicilios'],
  ['', '  3.5 Caja'],
  ['', '  3.6 Inventario'],
  ['', '  3.7 Reportes — Centro de Inteligencia'],
  ['', '  3.8 Alertas'],
  ['', '  3.9 Configuración'],
  ['', '  3.10 Finanzas'],
  ['', '  3.11 Personal y Usuarios'],
  ['', '  3.12 Talonarios'],
  ['4', 'Funcionalidades Transversales'],
  ['5', 'Flujos de Trabajo Comunes'],
  ['6', 'Solución de Problemas'],
  ['7', 'URLs de Referencia'],
];
for (const [num, title] of toc) {
  doc.fillColor(num ? gold : dark).fontSize(10).font(num ? 'Helvetica-Bold' : 'Helvetica');
  doc.text(`${num ? num + '. ' : '   '}${title}`, 50, doc.y, { lineGap: 4 });
}
doc.addPage();

// ══════════════════════════════════════════════════
// 1. ROLES Y ACCESOS
// ══════════════════════════════════════════════════
header('1. Roles y Accesos');
body('Cada usuario tiene un rol que determina qué módulos puede ver y qué acciones puede realizar. A continuación se describen los roles disponibles y la matriz de acceso completa.');

subheader('Roles del Sistema');
const roles = [
  ['admin', 'Acceso total a toda la plataforma'],
  ['cajero', 'POS, caja, actualización de stock, cocina (pago), domicilios (ver), alertas'],
  ['cocinero', 'Cocina (aceptar/entregar pedidos), domicilios (aceptar)'],
  ['mesero', 'Solo perfil propio, sin acceso a módulos de gestión'],
  ['cliente', 'Perfil personal y tienda pública'],
];
for (const [role, desc] of roles) {
  doc.fillColor(bronze).fontSize(10).font('Helvetica-Bold').text(`${role}`, { continued: true });
  doc.fillColor(dark).font('Helvetica').text(` — ${desc}`);
  doc.moveDown(0.2);
}

spacer();
subheader('Matriz de Acceso por Módulo');

// Table header
const tableTop = doc.y;
const colW = [130, 50, 50, 55, 50, 50];
const headers = ['Módulo', 'admin', 'cajero', 'cocinero', 'mesero', 'cliente'];
const rows = [
  ['Dashboard', '✅', '✅', '✅', '❌', '❌'],
  ['POS (ventas)', '✅', '✅', '❌', '❌', '❌'],
  ['Caja', '✅', '✅', '❌', '❌', '❌'],
  ['Inventario', '✅', '❌', '❌', '❌', '❌'],
  ['Categorías', '✅', '❌', '❌', '❌', '❌'],
  ['Ingredientes', '✅', '❌', '❌', '❌', '❌'],
  ['Platos (recetas)', '✅', '❌', '❌', '❌', '❌'],
  ['Proveedores', '✅', '❌', '❌', '❌', '❌'],
  ['Compras', '✅', '❌', '❌', '❌', '❌'],
  ['Gastos', '✅', '❌', '❌', '❌', '❌'],
  ['Finanzas', '✅', '❌', '❌', '❌', '❌'],
  ['Reportes', '✅', '❌', '❌', '❌', '❌'],
  ['Alertas', '✅', '✅', '❌', '❌', '❌'],
  ['Cocina', '✅', '❌', '✅', '❌', '❌'],
  ['Domicilios', '✅', '✅', '✅', '❌', '❌'],
  ['Staff / Usuarios', '✅', '❌', '❌', '❌', '❌'],
  ['Talonarios', '✅', '✅', '❌', '❌', '❌'],
  ['Mesas', '✅', '✅', '❌', '❌', '❌'],
  ['Configuración', '✅', '❌', '❌', '❌', '✅*'],
];

function drawTable(headers, rows, startY) {
  const colX = [];
  let x = 50;
  for (const w of colW) {
    colX.push(x);
    x += w;
  }

  // Header
  doc.fillColor(dark);
  doc.rect(50, startY, colW.reduce((a, b) => a + b, 0), 22).fill();
  doc.fillColor(gold).fontSize(8).font('Helvetica-Bold');
  for (let i = 0; i < headers.length; i++) {
    doc.text(headers[i], colX[i] + 4, startY + 6, { width: colW[i] - 4 });
  }

  let y = startY + 22;
  for (const row of rows) {
    const bg = y % 44 === 22 ? '#F5F5F5' : white;
    doc.fillColor(bg).rect(50, y, colW.reduce((a, b) => a + b, 0), 22).fill();
    doc.fillColor(dark).fontSize(7.5).font('Helvetica');
    for (let i = 0; i < row.length; i++) {
      doc.text(row[i], colX[i] + 4, y + 6, { width: colW[i] - 4 });
    }
    y += 22;
  }

  // Border
  doc.strokeColor(gray).lineWidth(0.5);
  doc.rect(50, startY, colW.reduce((a, b) => a + b, 0), y - startY).stroke();

  return y + 10;
}

const afterTable = drawTable(headers, rows, doc.y);
doc.y = afterTable;
doc.fillColor(gray).fontSize(7.5).font('Helvetica').text('* Cliente solo ve su perfil personal');

doc.addPage();

// ══════════════════════════════════════════════════
// 2. PRIMER INGRESO
// ══════════════════════════════════════════════════
header('2. Primer Ingreso');
bullet('Ir a https://lasoupealoignon.vercel.app/login');
bullet('Usar las credenciales proporcionadas por el administrador');
bullet('El sistema carga el Dashboard con los KPIs del día');
spacer();
subheader('Usuarios de Prueba');

const userTable = [
  ['admin', 'admin@test.com', 'Admin123!'],
  ['cajero', 'cajero@test.com', 'Cajero123!'],
  ['cocinero', 'cocinero@test.com', 'Cocinero123!'],
  ['mesero', 'mesero@test.com', 'Mesero123!'],
];
const uColW = [80, 180, 140];
const uHeaders = ['Rol', 'Email', 'Contraseña'];
const uRows = userTable.map(r => r);
doc.y = drawTable(uHeaders, uRows, doc.y + 10);

doc.addPage();

// ══════════════════════════════════════════════════
// 3. MÓDULOS PRINCIPALES
// ══════════════════════════════════════════════════
header('3. Módulos Principales');

// ── 3.1 Dashboard ──
subheader('3.1 Dashboard (/dashboard)');
body('Pantalla principal que resume el estado del negocio:');
bullet('Tarjetas de ingresos del día, transacciones y ticket promedio');
bullet('Órdenes de cocina pendientes en tiempo real vía WebSocket');
bullet('Alertas de stock bajo visibles desde el navbar');
bullet('Acceso rápido a POS y Cocina');

// ── 3.2 POS ──
subheader('3.2 POS — Punto de Venta (/pos)');
body('Roles: admin, cajero');
bullet('Seleccionar una mesa (para comer en el local) o dejar vacío para domicilio');
bullet('Agregar productos al carrito: busque por nombre o por código de barras');
bullet('Ajuste cantidades y revise el total');
bullet('Seleccione método de pago: Efectivo, Transferencia o Mixto');
bullet('Click en "Cobrar" para completar la venta');
bullet('Si tiene mesa asignada → se crea una orden de cocina automáticamente');
bullet('Si NO tiene mesa → se crea un domicilio automáticamente');

// ── 3.3 Cocina ──
subheader('3.3 Cocina (/kitchen)');
body('Roles: admin, cocinero. Tres columnas en tiempo real:');
const kitchenCols = [
  ['🆕 Nuevos', 'Click para aceptar el pedido y comenzar la preparación'],
  ['👨‍🍳 En Preparación', 'Click para marcar como entregado al mesero'],
  ['✅ Entregados', 'Solo consulta, el cajero marca como pagado'],
];
for (const [col, desc] of kitchenCols) {
  doc.fillColor(bronze).fontSize(9).font('Helvetica-Bold').text(`${col}`, { continued: true });
  doc.fillColor(dark).font('Helvetica').text(` — ${desc}`);
  doc.moveDown(0.15);
}
spacer(0.3);
bullet('Los pedidos llegan automáticamente vía WebSocket — no necesita recargar');
bullet('Al llegar un nuevo pedido, suena un timbre (notificación sonora)');
bullet('Botón 🖨️ para imprimir ticket del pedido');

// ── 3.4 Domicilios ──
subheader('3.4 Domicilios (/domicilios)');
body('Roles: admin, cajero, cocinero. Kanban con 4 columnas:');
const delCols = [
  ['🆕 Pendientes', 'Click para aceptar el domicilio'],
  ['👨‍🍳 En Preparación', 'Click para despachar (asigna repartidor automáticamente)'],
  ['🛵 En Camino', 'Click para marcar como entregado'],
  ['✅ Entregados', 'Solo consulta'],
];
for (const [col, desc] of delCols) {
  doc.fillColor(bronze).fontSize(9).font('Helvetica-Bold').text(`${col}`, { continued: true });
  doc.fillColor(dark).font('Helvetica').text(` — ${desc}`);
  doc.moveDown(0.15);
}
spacer(0.3);
bullet('Cuando se crea una venta sin mesa, se genera un domicilio automáticamente');

// ── 3.5 Caja ──
subheader('3.5 Caja (/cash)');
body('Roles: admin, cajero');
bullet('Abrir caja: registrar el monto inicial con el que se comienza el turno');
bullet('Cerrar caja: ingresar ingresos/egresos manuales; el sistema calcula la diferencia vs las ventas registradas');
bullet('Historico: consultar cierres de caja anteriores');

// ── 3.6 Inventario ──
subheader('3.6 Inventario (/inventory)');
body('Roles: admin');
bullet('CRUD completo de productos');
bullet('Código de barras auto-generado basado en categoría + proveedor');
bullet('Control de stock con alertas por mínimo configurable');
bullet('Entradas y salidas de stock manuales con registro histórico');

// ── 3.7 Reportes ──
subheader('3.7 Reportes — Centro de Inteligencia (/reports)');
body('Roles: admin. Cuatro pestañas con datos clave del negocio:');
bullet('💰 Ventas — KPIs, tendencia diaria, ventas por categoría, método de pago, horas pico');
bullet('📦 Inventario — valoración por categoría, estado del stock, ganancia potencial');
bullet('⭐ Productos — top 10 más vendidos, productos sin movimiento, márgenes de ganancia');
bullet('👨‍🍳 Cocina — tiempos de preparación por cocinero, detalle de pedidos');
spacer(0.3);
body('Cada pestaña tiene un botón 📥 CSV para exportar los datos a un archivo compatible con Excel.');

// ── 3.8 Alertas ──
subheader('3.8 Alertas (/alerts)');
body('Roles: admin, cajero');
bullet('Lista de alertas de stock bajo y productos agotados');
bullet('Marcar como leídas individualmente o todas a la vez');
bullet('Botón "Verificar Stock" para escanear y generar nuevas alertas automáticamente');
bullet('Si la configuración SMTP está activa, envía un correo electrónico con el detalle de las alertas');

// ── 3.9 Configuración ──
subheader('3.9 Configuración (/settings)');
body('Admin:');
bullet('Nombre del establecimiento, teléfono, dirección y número de WhatsApp');
bullet('Logo del restaurante (subida de imagen)');
bullet('Configuración SMTP: servidor, puerto, usuario, contraseña, email remitente y email destino para recibir alertas de stock');
bullet('Botón "Limpiar Caché Local" para forzar recarga de datos frescos');
spacer(0.3);
body('Cliente:');
bullet('Nombre, teléfono y dirección (perfil personal)');

// ── 3.10 Finanzas ──
subheader('3.10 Finanzas (/finance)');
body('Roles: admin');
bullet('Resumen financiero completo con ingresos, costos, gastos y utilidad neta');
bullet('Flujo de caja detallado por período');
bullet('Estado de Pérdidas y Ganancias (P&L) mensual');

// ── 3.11 Staff ──
subheader('3.11 Personal y Usuarios (/staff)');
body('Roles: admin. Dos pestañas:');
bullet('👥 Empleados — gestión de empleados (nombre, cargo, salario, datos de contacto)');
bullet('🔐 Usuarios del Sistema — CRUD completo de usuarios con asignación de roles (admin, cajero, cocinero, mesero, cliente)');

// ── 3.12 Talonarios ──
subheader('3.12 Talonarios (/ticket-books)');
body('Roles: admin, cajero');
bullet('Registro de talonarios de facturación');
bullet('Control de rangos numéricos (desde/hasta)');
bullet('Consumo automático de facturas al realizar ventas');

doc.addPage();

// ══════════════════════════════════════════════════
// 4. FUNCIONALIDADES TRANSVERSALES
// ══════════════════════════════════════════════════
header('4. Funcionalidades Transversales');

subheader('WebSocket — Tiempo Real');
body('El sistema utiliza WebSocket (Socket.IO) para actualizaciones en tiempo real. La cocina, los domicilios y el dashboard se actualizan automáticamente cuando ocurre un evento, sin necesidad de recargar la página. Un indicador ⚡ en la esquina superior muestra el estado de la conexión (verde = conectado).');

subheader('Notificación Sonora');
body('Cuando llega un nuevo pedido a cocina, el sistema reproduce un timbre (chime) utilizando la Web Audio API del navegador. No requiere archivos de audio externos y funciona en cualquier navegador moderno.');

subheader('Caché Inteligente');
body('Los datos se almacenan en caché local (memoria + localStorage) para reducir las llamadas al servidor y mejorar la velocidad de navegación. Cada tipo de dato tiene un TTL (tiempo de vida) configurable:');
bullet('Productos: 5 minutos');
bullet('Categorías: 10 minutos');
bullet('Alertas: 2 minutos');
bullet('Configuración: 30 minutos');
bullet('Reportes: 5 minutos');
spacer(0.3);
body('Para forzar una recarga fresca de todos los datos, use el botón "Limpiar Caché Local" en la página de Configuración.');

subheader('Exportación de Reportes (CSV)');
body('Cada pestaña del Centro de Inteligencia tiene un botón de exportación:');
bullet('📥 CSV Ventas — exporta todas las transacciones del período seleccionado');
bullet('📥 CSV Productos — exporta los 50 productos más vendidos');
bullet('📥 CSV Inventario — exporta todos los productos con stock, precios, márgenes y estado');
spacer(0.3);
body('Los archivos CSV se generan con BOM UTF-8, lo que garantiza compatibilidad con Microsoft Excel y correcta visualización de caracteres especiales.');

subheader('Alertas por Correo Electrónico');
body('Cuando se ejecuta la verificación de stock y se detectan productos con inventario bajo o agotado, el sistema puede enviar un correo electrónico automático con una tabla detallada. Para habilitar esta función, configure los datos SMTP en Configuración > Email.');

doc.addPage();

// ══════════════════════════════════════════════════
// 5. FLUJOS DE TRABAJO COMUNES
// ══════════════════════════════════════════════════
header('5. Flujos de Trabajo Comunes');

subheader('5.1 Venta en Mesa');
body('El flujo completo para una venta con mesa sigue estos pasos:');
bullet('Cajero: POS → seleccionar mesa → agregar items → cobrar');
bullet('Cocinero: recibe el pedido en 🆕 Nuevos → lo acepta → lo cocina');
bullet('Cocinero: marca como entregado');
bullet('Cajero: marca como pagado → la mesa se libera automáticamente');

subheader('5.2 Domicilio');
body('Cuando se crea una venta sin número de mesa:');
bullet('Cajero: POS → sin mesa → agregar items → cobrar');
bullet('Cocinero: recibe orden de cocina para preparar los alimentos');
bullet('Cocinero/Admin: acepta el domicilio pendiente → cocina');
bullet('Admin: despacha el pedido (asigna repartidor)');
bullet('Admin: cuando el repartidor entrega, marca como entregado');

subheader('5.3 Alerta de Stock Bajo');
body('Cuando una venta consume el último inventario de un ingrediente:');
bullet('El sistema crea una alerta automática de tipo "stock_bajo" o "sin_stock"');
bullet('La alerta aparece en la página /alerts con una notificación en el navbar');
bullet('Si el SMTP está configurado, se envía un correo con la lista de productos en riesgo');
bullet('El administrador puede verificar el stock y crear una orden de compra');

doc.addPage();

// ══════════════════════════════════════════════════
// 6. SOLUCIÓN DE PROBLEMAS
// ══════════════════════════════════════════════════
header('6. Solución de Problemas');

const probHeaders = ['Problema', 'Solución'];
const probColW = [220, 340];
const probRows = [
  ['No carga el dashboard', 'Verificar conexión a Internet. Cerrar sesión y volver a iniciar.'],
  ['Pedidos no aparecen en cocina', 'Revisar el indicador ⚡ (debe estar verde). Si está rojo, recargar la página.'],
  ['No llegan correos de alerta', 'Configurar SMTP en Settings > Email con credenciales válidas y guardar.'],
  ['Datos desactualizados', 'Ir a Settings y usar el botón "🧹 Limpiar Caché Local".'],
  ['Error 403 al acceder a un módulo', 'Su rol no tiene permisos para esa sección. Contactar al administrador.'],
  ['Error 401 (no autorizado)', 'La sesión ha expirado. Iniciar sesión nuevamente.'],
  ['Error de stock insuficiente', 'Revisar el inventario en /inventory y realizar una compra para reponer.'],
  ['No puedo iniciar sesión', 'Verificar credenciales. Si olvidó la contraseña, contactar al administrador.'],
  ['Error interno del servidor', 'Esperar unos minutos e intentar de nuevo. Si persiste, reportar al administrador.'],
];

doc.y = drawTable(probHeaders, probRows, doc.y + 10);

spacer();
subheader('Recomendaciones Generales');
bullet('Mantener la sesión activa — si el sistema está inactivo por mucho tiempo, la sesión expirará automáticamente');
bullet('Usar Chrome o Edge actualizados para mejor compatibilidad');
bullet('Verificar la conexión ⚡ WebSocket antes de reportar problemas de tiempo real');
bullet('Limpiar la caché periódicamente si nota datos inconsistentes');

doc.addPage();

// ══════════════════════════════════════════════════
// 7. URLs DE REFERENCIA
// ══════════════════════════════════════════════════
header('7. URLs de Referencia');

const urlHeaders = ['Recurso', 'URL'];
const urlColW = [150, 410];
const urlRows = [
  ['App Frontend', 'https://lasoupealoignon.vercel.app'],
  ['API Backend', 'https://demorestbknd.onrender.com'],
  ['Health Check', 'https://demorestbknd.onrender.com/api/health'],
  ['Repositorio', 'https://github.com/CrisAguirre/demorest'],
];

doc.y = drawTable(urlHeaders, urlRows, doc.y + 10);
spacer(1);

// ── Final note ──
doc.fillColor(gold).fontSize(11).font('Helvetica-Bold').text('La Soupe à l\'Oignon', { align: 'center' });
doc.fillColor(gray).fontSize(9).font('Helvetica').text('Buen provecho y excelentes ventas.', { align: 'center' });
doc.fillColor(gray).fontSize(7.5).text(`Documento generado el ${new Date().toLocaleDateString('es-CO')}`, { align: 'center' });

addFooter();
doc.end();
console.log(`✅ PDF generado: ${outPath}`);
