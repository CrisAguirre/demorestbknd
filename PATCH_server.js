// ── PATCH para server.js ──────────────────────────────────────────────────────
// Agregar DESPUÉS de la línea: const preloadRoutes = require('./src/routes/preload.routes');

const supplierRoutes = require('./src/routes/supplier.routes');
const purchaseRoutes = require('./src/routes/purchase.routes');
const expenseRoutes  = require('./src/routes/expense.routes');
const financeRoutes  = require('./src/routes/finance.routes');

// Agregar DESPUÉS de: app.use('/api/preload', preloadRoutes);

app.use('/api/suppliers', supplierRoutes);
app.use('/api/purchases', purchaseRoutes);
app.use('/api/expenses',  expenseRoutes);
app.use('/api/finance',   financeRoutes);
