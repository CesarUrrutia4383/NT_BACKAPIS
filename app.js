const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const productRoutes = require('./routes/products');
const cartRoutes = require('./routes/cart');
const quoteRoutes = require('./routes/quote');
const userRoutes = require('./routes/users');
const dotenv = require('dotenv');
const { pool, adminPool } = require('./config/db');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
}));
app.use(bodyParser.json({ limit: '10mb' }));

// Rutas de productos
app.use('/routes/productos', productRoutes);
app.use('/controllers/cartController', cartRoutes);
app.use('/controllers/quoteController', quoteRoutes);
app.use('/usuarios', userRoutes);

// Ruta raíz para comprobar que el servidor funciona
app.get('/', (req, res) => {
  res.send('ERROR 404 - MODULE NOT FOUND');
});

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
