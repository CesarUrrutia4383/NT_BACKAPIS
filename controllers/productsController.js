const { pool }= require ('../config/db.js');
const axios = require('axios');

const getAllProducts = async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM productos');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching products', error });
  }
};

const addProduct = async (req, res) => {
  const { id, nombre, marca, proposito, cantidad } = req.body;
  try {
    const [result] = await pool.query(
      'INSERT INTO productos (id, nombre, marca, proposito, cantidad) VALUES (?, ?, ?, ?,?)',
      [id, nombre, marca, proposito, cantidad]
    );
    res.status(201).json({ id: result.insertId });
  } catch (error) {
    res.status(500).json({ message: 'Error adding product', error });
  }
};
module.exports = { getAllProducts, addProduct };