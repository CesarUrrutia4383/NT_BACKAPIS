const { pool }= require ('../config/db.js');

const getAllProducts = async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT codigo_producto, nombre_producto, Marca, Proposito, Existencias, Info, imagen_base64 FROM productos');
    // Mapear los campos a los nombres esperados por el frontend
    const productos = rows.map(row => ({
      id: row.codigo_producto,
      nombre: row.nombre_producto,
      marca: row.Marca,
      proposito: row.Proposito,
      cantidad: row.Existencias,
      info: row.Info,
      imagen_base64: row.imagen_base64
    }));
    res.json(productos);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching products', error });
  }
};

module.exports = { getAllProducts };