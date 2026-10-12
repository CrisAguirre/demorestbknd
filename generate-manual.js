const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

const doc = new PDFDocument({
  size: 'LETTER',
  margins: { top: 48, bottom: 50, left: 50, right: 50 },
  info: {
    Title: "Manual de Usuario - Sistema de Gestión Integral para Restaurantes",
    Author: "Equipo de Desarrollo La Soupe à l'Oignon",
    Subject: "Manual Oficial del Sistema v2.0",
    Keywords: "restaurante, pos, dashboard, cocina, inventario, caja"
  }
});

const OUT = path.join(__dirname, 'MANUAL_DE_USUARIO.pdf');
const FRONTEND_ASSETS = path.join(__dirname, '..', 'demorest', 'src', 'assets');
const writeStream = fs.createWriteStream(OUT);
doc.pipe(writeStream);

// ── PALETA DE COLORES ELEGANTE ──
const gold = '#D4AF37';
const bronze = '#8B5A2B';
const dark = '#0D111A';
const surface = '#151926';
const cardBg = '#F7F8FA';
const borderCol = '#E2E6EC';
const gray = '#666B7A';
const textDark = '#1F2430';
const green = '#1B8755';
const red = '#DC3545';
const blue = '#0D6EFD';

const date = new Date().toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' });

// ── UTILIDADES DE MAQUETACIÓN ──
function checkPageBreak(spaceNeeded) {
  if (doc.y + spaceNeeded > 730) {
    doc.addPage();
    doc.y = 48;
  }
}

function np() {
  doc.addPage();
  doc.y = 48;
}

function headerBar(title, subtitle) {
  checkPageBreak(50);
  doc.fontSize(16).font('Helvetica-Bold').fillColor(dark).text(title, 50, doc.y);
  doc.moveDown(0.2);
  doc.fillColor(gold).rect(50, doc.y, 45, 2.5).fill();
  doc.moveDown(0.4);
  if (subtitle) {
    doc.fontSize(8.5).font('Helvetica-Oblique').fillColor(gray).text(subtitle, 50, doc.y);
    doc.moveDown(0.4);
  }
}

function h2(t) {
  checkPageBreak(30);
  doc.fontSize(11).font('Helvetica-Bold').fillColor(bronze).text(t, 50, doc.y);
  doc.moveDown(0.25);
}

function txt(t) {
  checkPageBreak(18);
  doc.fontSize(8.5).font('Helvetica').fillColor(textDark).text(t, 50, doc.y, { align: 'justify', lineGap: 2.2 });
  doc.moveDown(0.25);
}

function dot(boldTitle, content) {
  checkPageBreak(16);
  doc.fontSize(8.5).font('Helvetica-Bold').fillColor(dark).text(`  •  ${boldTitle}: `, 50, doc.y, { continued: true });
  doc.font('Helvetica').fillColor(textDark).text(content, { lineGap: 2 });
  doc.moveDown(0.15);
}

function sp(n) {
  doc.moveDown(n || 0.3);
}

function badgeBox(title, items, accentColor = gold) {
  const boxW = 512;
  const itemH = 14;
  const padding = 8;
  const calculatedH = padding * 2 + 16 + items.length * itemH;
  checkPageBreak(calculatedH + 10);

  const startY = doc.y;
  doc.fillColor('#F9FAFC').rect(50, startY, boxW, calculatedH).fill();
  doc.strokeColor(borderCol).lineWidth(0.8).rect(50, startY, boxW, calculatedH).stroke();
  doc.fillColor(accentColor).rect(50, startY, 4, calculatedH).fill();

  doc.fontSize(9.5).font('Helvetica-Bold').fillColor(dark).text(title, 62, startY + 8);
  let curY = startY + 24;
  for (const it of items) {
    doc.fontSize(8).font('Helvetica').fillColor(textDark).text(`✔  ${it}`, 64, curY);
    curY += itemH;
  }
  doc.y = startY + calculatedH + 8;
}

function callout(text, type = 'info') {
  checkPageBreak(36);
  const startY = doc.y;
  const boxW = 512;
  const bg = type === 'tip' ? '#F0F9F4' : type === 'warn' ? '#FFF9E6' : '#F2F6FC';
  const bar = type === 'tip' ? green : type === 'warn' ? '#E6A23C' : blue;
  const icon = type === 'tip' ? '💡 TIP: ' : type === 'warn' ? '⚠️ IMPORTANTE: ' : 'ℹ️ NOTA: ';

  doc.fillColor(bg).rect(50, startY, boxW, 30).fill();
  doc.fillColor(bar).rect(50, startY, 3, 30).fill();
  doc.fontSize(8).font('Helvetica-Bold').fillColor(bar).text(icon, 58, startY + 8, { continued: true });
  doc.font('Helvetica').fillColor(textDark).text(text, { width: boxW - 20, lineGap: 1.5 });
  doc.y = startY + 36;
}

function tbl(headers, rows, colW) {
  const left = 50;
  const totalW = colW.reduce((a, b) => a + b, 0);
  const colX = [];
  let x = left;
  for (const w of colW) { colX.push(x); x += w; }
  const hdrH = 18;
  const rowH = 15;
  const th = hdrH + rows.length * rowH;

  checkPageBreak(th + 15);

  const sy = doc.y;
  doc.rect(left, sy, totalW, hdrH).fill(dark);
  doc.fillColor(gold).fontSize(7.5).font('Helvetica-Bold');
  for (let i = 0; i < headers.length; i++) {
    doc.text(headers[i], colX[i] + 4, sy + 4.5, { width: colW[i] - 6, align: 'left' });
  }

  let y = sy + hdrH;
  for (let ri = 0; ri < rows.length; ri++) {
    doc.fillColor(ri % 2 === 0 ? '#FFFFFF' : '#F6F8FB').rect(left, y, totalW, rowH).fill();
    doc.fillColor(textDark).fontSize(7).font('Helvetica');
    for (let ci = 0; ci < rows[ri].length; ci++) {
      const val = rows[ri][ci];
      if (val === '✓') {
        doc.font('Helvetica-Bold').fillColor(green);
      } else if (val === '—') {
        doc.font('Helvetica').fillColor('#A0A5B5');
      } else {
        doc.font('Helvetica').fillColor(textDark);
      }
      doc.text(val, colX[ci] + 4, y + 3.5, { width: colW[ci] - 6 });
    }
    y += rowH;
  }
  doc.strokeColor(borderCol).lineWidth(0.5).rect(left, sy, totalW, y - sy).stroke();
  doc.y = y + 8;
}

// ════════════════════════════════════════════════════════════════
// 1. PORTADA ELEGANTE (ESTILO PARISIÉN DE ALTA GAMA)
// ════════════════════════════════════════════════════════════════
doc.fillColor('#090B12').rect(0, 0, doc.page.width, doc.page.height).fill();

// Marcos dorados concéntricos
doc.strokeColor(gold).lineWidth(1).rect(28, 28, doc.page.width - 56, doc.page.height - 56).stroke();
doc.strokeColor(gold).lineWidth(0.4).rect(32, 32, doc.page.width - 64, doc.page.height - 64).stroke();

// Banda dorada superior
doc.fillColor(gold).rect(32, 160, doc.page.width - 64, 2.5).fill();

// Título principal
doc.fillColor(gold).fontSize(30).font('Helvetica-Bold').text('Sistema de Gestión Integral', 0, 215, { align: 'center' });
doc.fontSize(22).font('Helvetica').fillColor('#FFFFFF').text('para Restaurantes', 0, 260, { align: 'center' });
doc.fillColor('#E5D392').fontSize(16).font('Helvetica-Bold').text('MANUAL DE USUARIO', 0, 340, { align: 'center' });
doc.fillColor('#A4B0C6').fontSize(10).font('Helvetica').text('Guía Oficial Operativa y Administrativa', 0, 380, { align: 'center' });

// Tarjeta central de versión
doc.fillColor(surface).rect(160, 440, doc.page.width - 320, 75).fill();
doc.strokeColor(gold).lineWidth(0.7).rect(160, 440, doc.page.width - 320, 75).stroke();
doc.fillColor(gold).fontSize(11).font('Helvetica-Bold').text('VERSIÓN 2.0 FULL-STACK', 160, 455, { align: 'center' });
doc.fillColor('#FFFFFF').fontSize(8.5).font('Helvetica').text(`Edición Actualizada: ${date}`, 160, 475, { align: 'center' });
doc.fillColor('#8E9AA8').fontSize(7.5).text('Plataforma Web Cloud (Vercel + Render + Socket.IO)', 160, 492, { align: 'center' });

// Pie de portada
doc.fillColor(gold).rect(32, 660, doc.page.width - 64, 1.5).fill();
doc.fillColor('#7E8799').fontSize(8).font('Helvetica').text('Documentación Técnica y Operativa para Administradores, Cajeros y Cocina', 0, 680, { align: 'center' });

np();

// ════════════════════════════════════════════════════════════════
// 2. ÍNDICE GENERAL
// ════════════════════════════════════════════════════════════════
headerBar('Índice de Contenidos', 'Guía estructurada por módulos y procedimientos');

const indexItems = [
  { num: '01', title: 'Roles de Usuario y Matriz de Permisos', desc: 'Perfiles de acceso y seguridad por rol' },
  { num: '02', title: 'Primer Ingreso y Menú Lateral Retraído (Sidebar 60px)', desc: 'Autenticación y navegación por acordeones' },
  { num: '03', title: 'El Nuevo Dashboard Dinámico (Home del Sistema)', desc: 'Métricas en vivo, mapa de mesas, caja y stock crítico' },
  { num: '04', title: 'Operaciones de Salón: Mesas y Punto de Venta (POS)', desc: 'Toma de pedidos, comandas, barcode y cobros' },
  { num: '05', title: 'Cocina en Vivo (KDS) y Barra de Coctelería', desc: 'Kanban en tiempo real, avisos sonoros y recetas' },
  { num: '06', title: 'Logística de Domicilios y Gestión de Eventos', desc: 'Seguimiento de pedidos foráneos y banquetes BEO' },
  { num: '07', title: 'Caja, Turnos y Facturación Consecutiva', desc: 'Aperturas, movimientos, arqueos Z y talonarios' },
  { num: '08', title: 'Cadena de Suministro: Inventarios, Proveedores y Compras', desc: 'Centros de costo, stock crítico y órdenes de compra' },
  { num: '09', title: 'Personal, Turnos y Usuarios del Sistema', desc: 'Administración de talento humano y cuentas' },
  { num: '10', title: 'Módulo de Análisis: Reportes, Finanzas y Alertas', desc: 'Analítica en 4 pestañas, exportación CSV y SMTP' },
  { num: '11', title: 'Gestión Administrativa y Configuración Unificada', desc: 'Identidad, logo, servidor SMTP y catálogo de familias' },
  { num: '12', title: 'Documentación Institucional y SG-SST', desc: 'Manuales de BPM, formatos operativos y matriz de riesgos' },
  { num: '13', title: 'Solución de Problemas Frecuentes y Enlaces', desc: 'Guía de contingencia y URLs de los servicios' }
];

let idxY = doc.y;
for (const item of indexItems) {
  checkPageBreak(30);
  idxY = doc.y;
  doc.fillColor('#F5F7FA').rect(50, idxY, 512, 24).fill();
  doc.strokeColor(borderCol).lineWidth(0.4).rect(50, idxY, 512, 24).stroke();

  doc.fillColor(gold).fontSize(9).font('Helvetica-Bold').text(item.num, 58, idxY + 6);
  doc.fillColor(dark).fontSize(8.5).font('Helvetica-Bold').text(item.title, 85, idxY + 6);
  doc.fillColor(gray).fontSize(7.5).font('Helvetica-Oblique').text(item.desc, 320, idxY + 6.5, { align: 'right', width: 232 });
  doc.y = idxY + 28;
}

np();

// ════════════════════════════════════════════════════════════════
// 3. SECCIÓN 1: ROLES Y PERMISOS
// ════════════════════════════════════════════════════════════════
headerBar('1. Roles de Usuario y Matriz de Permisos', 'Control granular de accesos protegido por tokens JWT');

txt('El sistema opera bajo un modelo de control de acceso basado en roles (RBAC). Cada usuario cuenta con credenciales únicas que restringen la visibilidad de los módulos según su responsabilidad operativa en el restaurante.');

h2('Definición de Perfiles');
dot('Administrador (admin)', 'Acceso ilimitado a operaciones, finanzas, inventarios, configuraciones y reportes.');
dot('Cajero (cajero)', 'Especializado en POS, caja registradora, lectura de domicilios, alertas de insumos y talonarios.');
dot('Cocinero (cocinero)', 'Enfocado en la pantalla KDS de comandas, aceptación de domicilios y panel resumen de pedidos.');
dot('Mesero (mesero)', 'Perfil de salón para consultar comandas de mesas asignadas y perfil propio.');
dot('Cliente (cliente)', 'Acceso exclusivo a perfil personal e historial en la carta pública.');

sp(0.2);
h2('Matriz de Acceso por Módulo');

tbl(
  ['Módulo / Función', 'admin', 'cajero', 'cocinero', 'mesero', 'cliente'],
  [
    ['Dashboard Dinámico (Home)', '✓', '✓', '✓', '✓', '—'],
    ['Mesas (Salones)', '✓', '✓', '—', '✓', '—'],
    ['POS (Punto de Venta)', '✓', '✓', '—', '—', '—'],
    ['Cocina en Vivo (KDS)', '✓', '—', '✓', '—', '—'],
    ['Barra y Coctelería', '✓', '—', '—', '—', '—'],
    ['Domicilios (Kanban)', '✓', '✓', '✓', '—', '—'],
    ['Caja y Turnos', '✓', '✓', '—', '—', '—'],
    ['Talonarios', '✓', '✓', '—', '—', '—'],
    ['Inventarios e Insumos', '✓', '—', '—', '—', '—'],
    ['Platos y Recetas', '✓', '—', '—', '—', '—'],
    ['Proveedores y Compras', '✓', '—', '—', '—', '—'],
    ['Personal y Usuarios', '✓', '—', '—', '—', '—'],
    ['Centro de Reportes', '✓', '—', '—', '—', '—'],
    ['Alertas de Stock', '✓', '✓', '—', '—', '—'],
    ['Finanzas (P&L)', '✓', '—', '—', '—', '—'],
    ['Configuración + Categorías', '✓', '—', '—', '—', '—']
  ],
  [192, 64, 64, 64, 64, 64]
);

callout('Las credenciales están encriptadas con algoritmos seguros en MongoDB. Cualquier intento de acceso no autorizado responderá con código HTTP 403 Forbidden.', 'info');

np();

// ════════════════════════════════════════════════════════════════
// 4. SECCIÓN 2: PRIMER INGRESO Y MENÚ LATERAL RETRAÍDO
// ════════════════════════════════════════════════════════════════
headerBar('2. Primer Ingreso y Menú Lateral Retraído (Sidebar 60px)', 'Ergonomía visual y diseño limpio en el puesto de trabajo');

txt('Al acceder a la plataforma web (URL oficial o local), el usuario encuentra la pantalla de autenticación centralizada. Tras ingresar el correo y contraseña, el sistema redirige automáticamente a la nueva pantalla de Home (Dashboard).');

h2('Características del Nuevo Menú Lateral (Sidebar Acordeón)');
dot('Estado Inicial Retraído', 'Para no saturar la vista del operario y priorizar el espacio de trabajo en pantallas POS o tablets, el sidebar se inicia colapsado con un ancho ergonómico de 60px.');
dot('Botón de Conmutación (Toggle)', 'El botón superior permite alternar en 1 clic entre modo retraído (60px) y modo expandido (240px). La preferencia del usuario se memoriza automáticamente en el navegador.');
dot('Agrupación en 8 Secciones Acordeón', 'Las más de 20 funcionalidades del sistema se organizan en bloques temáticos para administradores:');

badgeBox('Estructura de los 8 Grupos Acordeón del Menú', [
  'Inicio: Dashboard general del restaurante (/dashboard)',
  'Operaciones: Mesas (/mesas), POS (/pos), Domicilios (/domicilios), Eventos (/events)',
  'Cocina y Carta: Cocina KDS (/cocina), Barra (/barra), Platos/Recetas (/dishes), Tiqueteras (/ticket-books)',
  'Caja y Ventas: Caja registradora (/cash), Talonarios (/talonarios)',
  'Compras y Costos: Insumos (Cocina, Barra, Servicio), Proveedores, Compras, Gastos',
  'Personal: Gestión de Personal y Turnos de trabajo (/staff)',
  'Análisis: Módulo de Análisis Financiero (/finance), Reportes (/reports) y Alertas (/alerts)',
  'Gestión y Administración: Documentación (/documentacion), SG-SST (/sg-sst), Configuración (/settings)'
], gold);

dot('Auto-Expansión Inteligente', 'Si el usuario navega a cualquier submódulo (ej. Insumos Cocina), el acordeón correspondiente se despliega de forma automática y resalta la opción activa con una marca visual dorada.');

np();

// ════════════════════════════════════════════════════════════════
// 5. SECCIÓN 3: EL NUEVO DASHBOARD DINÁMICO (HOME)
// ════════════════════════════════════════════════════════════════
headerBar('3. El Nuevo Dashboard Dinámico (Home del Sistema)', 'Centro neurálgico en tiempo real: ventas, mesas, pedidos y stock');

txt('El Dashboard sustituye las vistas estáticas iniciales para transformarse en el verdadero centro de control del restaurante, disponible inmediatamente tras iniciar sesión en la ruta raíz (/dashboard).');

h2('Componentes del Dashboard en Tiempo Real');
dot('1. Tarjetas Métricas Superiores (KPIs)', 'Indicadores clave del día: Total de Ventas Facturadas, Número de Transacciones, Ticket Promedio y Órdenes Pendientes.');
dot('2. Mini Mapa de Mesas en Vivo', 'Monitor rápido de la distribución de mesas (Salón 1, Salón 2, Para llevar) con indicadores circulares por color: Verde (Libre), Rojo (Ocupada con cuenta abierta) y Amarillo (Reservada).');
dot('3. Monitor de Domicilios Activos', 'Listado visual con los pedidos foráneos en curso, tiempo transcurrido y repartidor asignado con punto luminoso pulsante.');
dot('4. Estado de Caja del Turno', 'Alerta en vivo del estado de la gaveta (Abierta / Cerrada), base inicial y dinero acumulado en el turno actual.');
dot('5. Top 5 Insumos Críticos de Stock', 'Detecta los 5 insumos con existencia más baja frente a su mínimo de seguridad. Muestra el stock actual, stock mínimo y un enlace directo de 1 clic a "/inventory/insumos".');
dot('6. Gráfica Semanal de Ventas', 'Comparativa gráfica de ingresos de los últimos 7 días con totales consolidados.');
dot('7. Ranking de Productos Más Vendidos', 'Top 5 de preparaciones más populares con conteo de unidades despachadas.');
dot('8. Accesos Rápidos de 1 Clic', 'Botonera para saltar instantáneamente a: "+ Nueva Venta (POS)", "🍳 Ver Cocina (KDS)", "💵 Arqueo de Caja" y "📦 Nueva Compra".');

callout('El Dashboard está sincronizado mediante WebSockets (Socket.IO): cada vez que un mesero toma una comanda o un cocinero entrega un plato, los números se actualizan sin refrescar la página.', 'tip');

np();

// ════════════════════════════════════════════════════════════════
// 6. SECCIÓN 4: OPERACIONES DE SALÓN Y POS
// ════════════════════════════════════════════════════════════════
headerBar('4. Operaciones de Salón: Mesas y Punto de Venta (POS)', 'Agilidad en la comanda, código de barras y liquidación');

txt('El módulo POS (/pos) y la gestión de salones (/mesas) están diseñados para brindar la máxima velocidad de atención en horas pico.');

h2('Paso a Paso: Registro de una Venta en POS');
dot('Paso 1: Asignación de Mesa', 'Seleccione la mesa física en el menú desplegable superior. Si el pedido es para llevar o domicilio, déjela sin asignar.');
dot('Paso 2: Búsqueda de Productos', 'Navegue por las categorías visuales de la carta o use el buscador en vivo ingresando el nombre del plato o pasando el lector de código de barras.');
dot('Paso 3: Personalización de la Comanda', 'Haga clic en un plato para sumarlo al carrito. Puede ajustar porciones o añadir notas especiales (ej. "Término medio", "Té sin azúcar").');
dot('Paso 4: Selección del Método de Pago', 'El cajero puede elegir: Efectivo (calcula cambio), Transferencia (QR / datáfono) o Mixto (divide valores).');
dot('Paso 5: Cobro y Cierre', 'Presione "Cobrar". El sistema dispara tres acciones automáticas inmediatas:');

badgeBox('Acciones Automáticas al Cobrar', [
  'Emisión y despacho de la comanda a la pantalla de Cocina / KDS vía WebSocket.',
  'Deducción inmediata de los insumos según la receta y escandallo del plato.',
  'Consumo de un consecutivo del talonario de facturación activo.'
], bronze);

np();

// ════════════════════════════════════════════════════════════════
// 7. SECCIÓN 5: COCINA EN VIVO Y BARRA
// ════════════════════════════════════════════════════════════════
headerBar('5. Cocina en Vivo (KDS) y Barra de Coctelería', 'Organización de producción sin papeles ni pérdidas');

txt('El Kitchen Display System (/cocina) sustituye las antiguas comandas de papel por una pantalla dinámica e interactiva de producción.');

h2('Flujo de Comandas en Cocina');
dot('Timbre Sonoro de Notificación', 'Al ingresar un nuevo pedido desde el POS, el sistema emite una campanada sonora (Web Audio API) que alerta al equipo de cocina.');
dot('Columna "Nuevos"', 'Muestra las comandas recién recibidas. El cocinero revisa los platos y presiona "Aceptar" para asumir la comanda.');
dot('Columna "En Preparación"', 'Indica las comandas en fogón con el tiempo transcurrido en minutos. Al terminar los platos, el cocinero presiona "Entregado".');
dot('Columna "Entregados"', 'Comandas listas para ser retiradas por el mesero y servidas a la mesa.');

h2('Módulo de Barra y Coctelería (/barra)');
txt('Administra la preparación de bebidas frías, cocteles de autor (15 recetas estándar) y servicio de té parisino, asegurando la dosificación exacta de 1.5 oz por copa.');

h2('Platos, Recetas y Escandallo (/dishes)');
txt('Permite costear cada plato de la carta en función de los ingredientes que lo componen. El sistema calcula en tiempo real el costo unitario de producción y sugiere el precio de venta óptimo garantizando el margen del restaurante.');

np();

// ════════════════════════════════════════════════════════════════
// 8. SECCIÓN 6: CAJA, TURNOS Y FACTURACIÓN
// ════════════════════════════════════════════════════════════════
headerBar('6. Caja, Turnos y Facturación Consecutiva', 'Auditoría estricta de ingresos, egresos y cierres de turno');

txt('El módulo de Caja (/cash) garantiza el cuadre perfecto del dinero en caja chica y cuentas bancarias en cada turno laboral.');

h2('Ciclo Diario de Caja');
dot('1. Apertura de Caja', 'El cajero entrante ingresa el valor de la base en efectivo disponible (por defecto $300.000 COP) y confirma la apertura.');
dot('2. Movimientos del Turno', 'Permite registrar egresos justificados (compra urgente de insumos menores) o ingresos extraordinarios.');
dot('3. Arqueo Ciego', 'Al finalizar la jornada, el cajero cuenta físicamente el dinero en gaveta e ingresa la cantidad sin ver el total acumulado en el sistema.');
dot('4. Cierre Z y Cuadre', 'El sistema contrasta el conteo físico contra las ventas registradas por POS (efectivo y transferencias) y determina si hay descuadre (sobrante o faltante).');

h2('Control de Talonarios (/talonarios)');
txt('Permite registrar rangos de numeración consecutiva autorizada para comprobantes. Al emitir ventas, el talonario descuenta los folios y alerta cuando quedan menos de 50 disponibles.');

np();

// ════════════════════════════════════════════════════════════════
// 9. SECCIÓN 7: INVENTARIOS, PROVEEDORES Y COMPRAS
// ════════════════════════════════════════════════════════════════
headerBar('7. Cadena de Suministro e Inventarios', 'Control de existencias por 3 áreas y compras directas');

txt('El restaurante maneja inventarios sectorizados para evitar confusiones de bodega:');
dot('Insumos de Cocina (/inventory/insumos)', 'Proteínas, quesos franceses, verduras, harinas, aceites y condimentos.');
dot('Insumos de Barra (/inventory/barra)', 'Licores nacionales e importados, mixers, jarabes, café especial y té.');
dot('Insumos de Servicio (/inventory/servicio)', 'Servilletas, empaques biodegradables, vajilla, copas y mantelería.');

h2('Proveedores y Órdenes de Compra (/suppliers & /purchases)');
dot('Código Automático de Proveedor', 'Al crear un proveedor, el sistema le asigna un código mnemotécnico irrepetible.');
dot('Órdenes de Compra', 'Permite registrar pedidos a proveedores con precios unitarios pactados. Al recibir la mercancía, el sistema ingresa los insumos al inventario y actualiza el costo promedio ponderado.');

callout('Cada insumo cuenta con un nivel de Stock Mínimo. Cuando la existencia baja de este límite, el sistema genera una alerta visual y en el Dashboard.', 'warn');

np();

// ════════════════════════════════════════════════════════════════
// 10. SECCIÓN 8: MÓDULO DE ANÁLISIS, REPORTES Y ALERTAS
// ════════════════════════════════════════════════════════════════
headerBar('8. Módulo de Análisis: Reportes, Finanzas y Alertas', 'Analítica estratégica de ventas, márgenes y productividad');

txt('El módulo de Análisis (/reports y /finance) reúne toda la información histórica en cuatro perspectivas especializadas:');

badgeBox('Pestañas de Analítica Empresarial', [
  'Ventas: Gráfica de ingresos, ticket promedio, franjas horarias de mayor consumo y métodos de pago.',
  'Inventario: Valorización monetaria del stock en almacén y estimación de utilidad potencial.',
  'Productos: Ranking de los 10 platos estrella, productos sin rotación y márgenes de rentabilidad.',
  'Cocina: Medición de tiempos de preparación por turno y cocinero para optimizar el servicio.'
], blue);

h2('Exportación de Datos');
txt('Cada pestaña cuenta con un botón para descargar la información a archivos CSV con codificación UTF-8 BOM, 100% compatibles con Microsoft Excel y Google Sheets.');

h2('Panel Financiero (P&L) (/finance)');
txt('Muestra el estado mensual consolidado: Ingresos Totales (-) Costo de Alimentos (COGS) (-) Gastos Operativos (=) Utilidad Neta real del negocio.');

h2('Alertas de Stock y Envíos por Correo (/alerts)');
txt('Permite revisar insumos bajo mínimos, con botón "Verificar Stock" que analiza todo el catálogo y emite correos automáticos si el servidor SMTP está configurado.');

np();

// ════════════════════════════════════════════════════════════════
// 11. SECCIÓN 9: ADMINISTRACIÓN Y CONFIGURACIÓN UNIFICADA
// ════════════════════════════════════════════════════════════════
headerBar('9. Configuración y Categorías Unificadas', 'Consolidación de parámetros maestros en un solo punto');

txt('En la versión 2.0, el menú lateral fue optimizado unificando el catálogo de Categorías dentro del módulo de Configuración (/settings) mediante un sistema intuitivo de pestañas:');

h2('Pestaña 1: ⚙️ General');
dot('Datos del Establecimiento', 'Nombre comercial, NIT, teléfono de contacto, WhatsApp y dirección física.');
dot('Logotipo Oficial', 'Subida y actualización del logo en alta resolución para encabezados de tickets.');
dot('Servidor de Correo SMTP', 'Host, puerto (465 SSL / 587 TLS), usuario y clave de aplicación para despacho de alertas.');
dot('Manual de Usuario', 'Botón de acceso directo para visualizar o descargar este documento en PDF.');
dot('Limpiar Caché Local', 'Botón para renovar inmediatamente la memoria del navegador en caso de actualizaciones.');

h2('Pestaña 2: 📂 Categorías');
txt('Permite administrar las familias de productos de la carta y del almacén:');
dot('Listado Interactivo', 'Tabla con código de categoría, nombre, tipo (Alimentos, Bebidas, Servicios), icono y orden.');
dot('Acciones CRUD', 'Botones para crear una nueva categoría, editar datos o desactivarla con alertas seguras.');

callout('La antigua ruta independiente "/categories" ahora redirige de forma transparente y automática a "/settings", manteniendo total compatibilidad con enlaces guardados.', 'info');

np();

// ════════════════════════════════════════════════════════════════
// 12. SECCIÓN 10: SOLUCIÓN DE PROBLEMAS Y ENLACES
// ════════════════════════════════════════════════════════════════
headerBar('10. Guía de Solución de Problemas y Enlaces Útiles', 'Protocolo de contingencia y referencias operativas');

h2('Resolución de Incidencias Frecuentes');

tbl(
  ['Problema Detectado', 'Causa Probable', 'Solución Recomendada'],
  [
    ['El Dashboard no actualiza datos', 'Conexión débil o caché expirada', 'Recargue la página o vaya a Settings > Limpiar Caché.'],
    ['La cocina no emite sonido', 'Audio silenciado en navegador', 'Active el permiso de reproducción de sonido en el navegador.'],
    ['No se envían correos de alerta', 'Credenciales SMTP erróneas', 'Revise usuario y use contraseña de aplicación en Settings.'],
    ['Error 403 Prohibido', 'Rol sin permisos para el menú', 'Ingrese con cuenta admin o solicite permisos al encargado.'],
    ['Error 401 No Autorizado', 'Sesión expirada por inactividad', 'Vuelva a iniciar sesión con sus credenciales.'],
    ['No permite cobrar en POS', 'Caja cerrada o sin talonario', 'Abra el turno en Caja y asigne folios en Talonarios.']
  ],
  [140, 160, 212]
);

sp(0.4);
h2('Directorio de Enlaces y Accesos');

tbl(
  ['Servicio / Recurso', 'Dirección URL', 'Uso'],
  [
    ['Frontend de Producción', 'https://lasoupealoignon.vercel.app', 'Aplicación web oficial'],
    ['API Backend (Render)', 'https://demorestbknd.onrender.com/api', 'Servicios REST y Socket.IO'],
    ['Health Check Backend', 'https://demorestbknd.onrender.com/api/health', 'Monitor de estado del servidor'],
    ['Frontend de Producción', 'https://lasoupealoignon.vercel.app', 'Aplicación web oficial']
  ],
  [130, 232, 150]
);

sp(1.2);
doc.fontSize(12).font('Helvetica-Bold').fillColor(gold).text("Sistema de Gestión Integral para Restaurantes", 50, doc.y, { align: 'center' });
doc.moveDown(0.2);
doc.fontSize(8.5).font('Helvetica-Oblique').fillColor(gray).text('Tradición culinaria francesa & excelencia operativa digital.', { align: 'center' });
doc.moveDown(0.2);
doc.fontSize(7).font('Helvetica').fillColor('#9AA0B0').text(`Documentación generada el ${date} — Versión 2.0`, { align: 'center' });

// Finalizar documento
doc.end();

writeStream.on('finish', () => {
  console.log('✅ PDF generado con éxito en:', OUT);
  try {
    if (fs.existsSync(FRONTEND_ASSETS)) {
      const copyDest1 = path.join(FRONTEND_ASSETS, 'manual.pdf');
      const copyDest2 = path.join(FRONTEND_ASSETS, 'MANUAL_USUARIO.pdf');
      fs.copyFileSync(OUT, copyDest1);
      fs.copyFileSync(OUT, copyDest2);
      console.log('✅ PDF copiado exitosamente a frontend assets:');
      console.log('   ->', copyDest1);
      console.log('   ->', copyDest2);
    }
  } catch (err) {
    console.error('⚠️ Error al copiar a frontend assets:', err.message);
  }
});
