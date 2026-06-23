require('dotenv').config();
const connectDB = require('./src/config/db');
const Category = require('./src/models/Category');

const codes = {
  'Bebidas': '100',
  'Lácteos': '110',
  'Snacks': '120',
  'Granos y Cereales': '130',
  'Aseo Personal': '200',
  'Aseo Hogar': '210',
  'Enlatados': '300',
  'Carnes y Embutidos': '310',
  'Frutas y Verduras': '320',
  'Panadería': '330',
  'Otros': '900',
  'Recargas': '500'
};

connectDB().then(async () => {
  for (const [name, code] of Object.entries(codes)) {
    const result = await Category.updateOne({ name }, { $set: { code } });
    console.log(`${name} -> ${code} (modified: ${result.modifiedCount})`);
  }
  console.log('Done!');
  process.exit(0);
});
