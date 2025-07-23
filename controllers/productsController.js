const { pool}= require ('../config/db.js');


const getAllProducts = async (req, res) => {
  console.log('Solicitud recibida para obtener productos'); // LOG
  try {
    const [rows] = await pool.query('SELECT * FROM productos'); // LOG
    res.json(rows);
  } catch (error) {// LOG
    res.status(500).json({ message: 'Error fetching products', error });
  }
};

module.exports = { getAllProducts };