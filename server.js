require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs');

const connectDB = require('./src/config/db');
const corsOptions = require('./src/config/cors');
const { generalLimiter } = require('./src/middleware/rateLimiter');
const errorHandler = require('./src/middleware/errorHandler');

// Importar rutas
const authRoutes = require('./src/routes/auth.routes');
const productRoutes = require('./src/routes/product.routes');
const categoryRoutes = require('./src/routes/category.routes');
const saleRoutes = require('./src/routes/sale.routes');
const cashClosingRoutes = require('./src/routes/cashClosing.routes');
const alertRoutes = require('./src/routes/alert.routes');
const reportRoutes = require('./src/routes/report.routes');
const storefrontRoutes = require('./src/routes/storefront.routes');
const settingsRoutes = require('./src/routes/settings.routes');
const preloadRoutes  = require('./src/routes/preload.routes');
const supplierRoutes = require('./src/routes/supplier.routes');
const purchaseRoutes = require('./src/routes/purchase.routes');
const expenseRoutes = require('./src/routes/expense.routes');
const financeRoutes = require('./src/routes/finance.routes');
const debtorRoutes  = require('./src/routes/debtor.routes');

const app = express();
const PORT = process.env.PORT || 4000;

// Crear carpeta uploads si no existe
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Middlewares globales
app.use(helmet());
app.use(cors(corsOptions));
app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(generalLimiter);

// Archivos estáticos (logos subidos)
app.use('/uploads', express.static(uploadsDir));

// Rutas de la API
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/sales', saleRoutes);
app.use('/api/cash-closings', cashClosingRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/storefront', storefrontRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/preload',  preloadRoutes);
app.use('/api/suppliers', supplierRoutes);
app.use('/api/purchases', purchaseRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/finance', financeRoutes);
app.use('/api/debtors', debtorRoutes);

// Ruta de health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString(), app: 'Daily Mart API' });
});

// Manejo de errores global
app.use(errorHandler);

// Conectar a BD e iniciar servidor
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`\n🏪 Daily Mart API corriendo en puerto ${PORT}`);
    console.log(`📡 Entorno: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔗 Health: http://localhost:${PORT}/api/health\n`);
  });
});
