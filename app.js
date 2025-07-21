const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const productRoutes = require('./routes/products');
const cartRoutes = require('./routes/cart');
const quoteRoutes = require('./routes/quote');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));

// Rutas de productos
app.use('/routes/productos', productRoutes);
app.use('/controllers/cartController', cartRoutes);
app.use('/api/quote', quoteRoutes);

// Ruta raíz para comprobar que el servidor funciona
app.get('/', (req, res) => {
  res.send('ERROR 404 - MODULE NOT FOUND');
});

app.listen(PORT, () => {
  console.log(`Servidor backend corriendo en http://localhost:${PORT}`);
});
