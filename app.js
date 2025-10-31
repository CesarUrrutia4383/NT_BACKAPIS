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

// Configuración de CORS: validar origen con una whitelist y permitir preflight
const whitelist = [
  'https://www.neumaticstool.com',
  'http://localhost:5173',
  'http://localhost:5174',
  'https://nt-catalog.vercel.app'
];

app.use(cors({
  origin: function (origin, callback) {
    // allow requests with no origin (like curl, postman or server-to-server)
    if (!origin) return callback(null, true);
    if (whitelist.indexOf(origin) !== -1) {
      return callback(null, true);
    }
    // Explicitly block other origins
    return callback(new Error('CORS policy: Origin not allowed'), false);
  },
  methods: ['GET', 'POST', 'OPTIONS'],
  // Permitimos algunos headers comunes. NOTA: 'Access-Control-Allow-Origin' es
  // un header de respuesta que no debería ser enviado por el cliente, pero
  // lo incluimos aquí para evitar fallos de preflight si algún cliente lo
  // envía por error. Lo correcto es eliminar ese header en el cliente.
  allowedHeaders: ['Content-Type', 'Accept', 'Origin', 'Authorization', 'Access-Control-Allow-Origin'],
  credentials: false,
  optionsSuccessStatus: 200
}));

// Habilitar pre-flight para todas las rutas
app.options('*', cors());

app.use(bodyParser.json({ limit: '10mb' }));

// Rutas de productos
app.use('/routes/productos', productRoutes);
app.use('/routes/cart', cartRoutes);
app.use('/routes/quote', quoteRoutes);

app.listen(PORT, () => {
  
});
