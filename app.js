const express = require('express');
console.log('Express loaded successfully');

const cors = require('cors');
console.log('CORS loaded successfully');

const bodyParser = require('body-parser');
console.log('Body Parser loaded successfully');

const dotenv = require('dotenv');
console.log('Dotenv loaded successfully');

const errorHandler = require('./middleware/errorHandler');
console.log('Error handler loaded successfully');

// Cargar variables de entorno
dotenv.config();
console.log('Environment variables loaded. NODE_ENV:', process.env.NODE_ENV);

// Importar rutas solo si la conexión a la base de datos es exitosa
let productRoutes, cartRoutes, quoteRoutes;

console.log('Attempting to connect to database and load routes...');
try {
    const { pool, isConnected } = require('./config/db');
    console.log('Database module loaded, connection status:', isConnected());
    
    productRoutes = require('./routes/products');
    console.log('Product routes loaded successfully');
    
    cartRoutes = require('./routes/cart');
    console.log('Cart routes loaded successfully');
    
    quoteRoutes = require('./routes/quote');
    console.log('Quote routes loaded successfully');
} catch (error) {
    console.error('Error during initialization:', error);
    console.error('Stack trace:', error.stack);
}

console.log('Creating Express application...');
const app = express();

// Configuración básica
console.log('Setting up basic middleware...');
app.use(bodyParser.json({ limit: '10mb' }));
app.use(cors());

// Ruta de prueba y diagnóstico
console.log('Setting up diagnostic routes...');
app.get('/', (req, res) => {
  console.log('Handling root route request');
  const diagnostics = {
    message: 'API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    config: {
      node_version: process.version,
      dependencies_loaded: {
        express: !!express,
        cors: !!cors,
        bodyParser: !!bodyParser,
        dotenv: !!dotenv
      },
      routes_loaded: {
        products: !!productRoutes,
        cart: !!cartRoutes,
        quote: !!quoteRoutes
      },
      env_vars_set: {
        NODE_ENV: !!process.env.NODE_ENV,
        DB_HOST: !!process.env.DB_HOST,
        DB_USER_INV: !!process.env.DB_USER_INV,
        DB_NAME: !!process.env.DB_NAME,
        MAIL_SERVICE: !!process.env.MAIL_SERVICE
      }
    }
  };
  console.log('Diagnostic data:', diagnostics);
  res.json(diagnostics);
});

// Rutas de API con manejo de errores mejorado
console.log('Setting up API routes...');
try {
  console.log('Loading route modules...');
  
  // Middleware para loggear todas las peticiones
  app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
  });

  // Prefijo /api para todas las rutas
  app.use('/api/productos', productRoutes);
  console.log('Products routes mounted at /api/productos');
  
  app.use('/api/cart', cartRoutes);
  console.log('Cart routes mounted at /api/cart');
  
  app.use('/api/quote', quoteRoutes);
  console.log('Quote routes mounted at /api/quote');

} catch (error) {
  console.error('Error setting up routes:', error);
}

// Error handler mejorado
app.use((err, req, res, next) => {
  console.error('Error details:', {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method
  });
  
  res.status(500).json({ 
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong',
    timestamp: new Date().toISOString(),
    path: req.path,
    requestId: req.headers['x-request-id'],
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

// Manejo de desarrollo local
if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 4000;
  app.listen(PORT, () => {
    console.log(`Development server running on port ${PORT}`);
  });
}

console.log('Express application setup completed');
module.exports = app;
