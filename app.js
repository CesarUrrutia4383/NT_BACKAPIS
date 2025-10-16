const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const dotenv = require('dotenv');

// Cargar variables de entorno
dotenv.config();

// Importar rutas solo si la conexión a la base de datos es exitosa
let productRoutes, cartRoutes, quoteRoutes;
try {
    const { pool } = require('./config/db');
    productRoutes = require('./routes/products');
    cartRoutes = require('./routes/cart');
    quoteRoutes = require('./routes/quote');
} catch (error) {
    console.error('Error importing routes or database:', error);
}

const app = express();

// Configuración básica
app.use(bodyParser.json({ limit: '10mb' }));
app.use(cors());

// Ruta de prueba y diagnóstico
app.get('/', (req, res) => {
  res.json({ 
    message: 'API is running',
    env: {
      NODE_ENV: process.env.NODE_ENV,
      DATABASE_URL: process.env.DATABASE_URL ? 'Configured' : 'Not configured',
      MAIL_SERVICE: process.env.MAIL_SERVICE ? 'Configured' : 'Not configured'
    }
  });
});

// Rutas protegidas con try-catch
if (productRoutes && cartRoutes && quoteRoutes) {
  app.use('/productos', productRoutes);
  app.use('/cart', cartRoutes);
  app.use('/quote', quoteRoutes);
}

// Error handler
app.use((err, req, res, next) => {
  console.error('Error occurred:', err);
  res.status(500).json({ 
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong',
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

// Solo iniciar el servidor en desarrollo
if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 4000;
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

module.exports = app;

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
