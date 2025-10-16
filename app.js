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

// Ruta de prueba para verificar que el servidor está funcionando
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

// Ruta de prueba
app.get('/', (req, res) => {
  res.json({ message: 'API is running' });
});

// Rutas de productos
app.use('/productos', productRoutes);
app.use('/cart', cartRoutes);
app.use('/quote', quoteRoutes);

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    error: 'Something broke!',
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

// Para desarrollo local
if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 4000;
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

module.exports = app;
