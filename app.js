const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const productRoutes = require('./routes/products');
const cartRoutes = require('./routes/cart');
const quoteRoutes = require('./routes/quote');
const dotenv = require('dotenv');
const { pool } = require('./config/db');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

// Configuración de CORS más permisiva
app.use(cors({
  origin: [
    'https://nt-catalog.vercel.app',
    'http://localhost:5173',
    'http://localhost:5174'
  ],
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Accept', 'Origin', 'Access-Control-Allow-Origin'],
  credentials: false,
  optionsSuccessStatus: 200
}));

// Habilitar pre-flight para todas las rutas
app.options('*', cors());

app.use(bodyParser.json({ limit: '10mb' }));

// Middleware para headers CORS adicionales
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', 'https://nt-catalog.vercel.app');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Accept, Origin');
  res.header('Access-Control-Allow-Credentials', 'false');
  
  // Handle OPTIONS method
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Rutas de productos
app.use('/routes/productos', productRoutes);
app.use('/routes/cart', cartRoutes);
app.use('/routes/quote', quoteRoutes);

app.listen(PORT, () => {
  
});
