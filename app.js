const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const cartRoutes = require('./routes/cart');
const quoteRoutes = require('./routes/quote');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors({
  origin: process.env.VITE_API_FRONT_URL,
  methods: ['GET', 'POST']
}));
app.use(bodyParser.json({ limit: '10mb' }));

// Rutas de productos
app.use('/controllers/cartController', cartRoutes);
app.use('/controllers/quoteController', quoteRoutes);

// Ruta raíz para comprobar que el servidor funciona
app.get('/', (req, res) => {
  res.send('ERROR 404 - MODULE NOT FOUND');
});

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
