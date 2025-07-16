import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import productRoutes from './routes/products.js';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));

// Rutas de productos
app.use('/routes/productos', productRoutes);

// Ruta raíz para comprobar que el servidor funciona
app.get('/', (req, res) => {
  res.send('Bienvenido a la API de productos de NeumaticsTools');
});

app.listen(PORT, () => {
  console.log(`Servidor backend corriendo en http://localhost:${PORT}`);
});
