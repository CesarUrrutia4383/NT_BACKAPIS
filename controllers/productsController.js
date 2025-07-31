const { pool }= require ('../config/db.js');

const getAllProducts = async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT codigo_producto, nombre_producto, marca, proposito, existencias, info, imagen_url FROM productos');
    
    // Debug log para ver los datos de la base de datos
    console.log('Datos de la base de datos:', rows);
    
    // Mapear los campos a los nombres esperados por el frontend
    const productos = rows.map(row => ({
      id: row.codigo_producto,
      nombre: row.nombre_producto,
      marca: row.marca,
      proposito: row.proposito,
      cantidad: row.existencias,
      info: row.info,
      imagen_url: row.imagen_url
    }));
    
    // Debug log para ver los productos mapeados
    console.log('Productos mapeados:', productos);
    
    res.json(productos);
  } catch (error) {
    console.error('Error en getAllProducts:', error);
    res.status(500).json({ message: 'Error fetching products', error });
  }
};

module.exports = { getAllProducts };