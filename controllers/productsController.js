import { pool } from '../config/db.js';

export const getAllProducts = async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM productos');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching products', error });
  }
};

export const addProduct = async (req, res) => {
  const { id, nombre, marca, proposito, imagen_base64 } = req.body;
  try {
    const [result] = await pool.query(
      'INSERT INTO productos (id, nombre, marca, proposito, imagen_base64) VALUES (?, ?, ?, ?, ?)',
      [id, nombre, marca, proposito, imagen_base64]
    );
    res.status(201).json({ id: result.insertId });
  } catch (error) {
    res.status(500).json({ message: 'Error adding product', error });
  }
};
