// Uso único tras desplegar el cambio "descuento al cobrar":
// Las ventas pendientes creadas con el código anterior YA descontaron stock
// al registrarse. Este script las marca stockDeducted=true para que pay()
// no las descuente por segunda vez.
//
// Uso: node backfill-stockdeducted.js   (requiere .env con MONGODB_URI)
require('dotenv').config();
const mongoose = require('mongoose');
const Sale = require('./src/models/Sale');

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('✅ Conectado a MongoDB');

  const res = await Sale.updateMany(
    { status: 'pendiente', stockDeducted: { $ne: true } },
    { $set: { stockDeducted: true } }
  );
  console.log(`✅ Ventas pendientes marcadas como ya descontadas: ${res.modifiedCount}`);

  await mongoose.disconnect();
  process.exit(0);
}

run().catch((err) => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
