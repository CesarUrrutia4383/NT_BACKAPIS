const { pool, adminPool } = require('../config/db');
const bcrypt = require('bcrypt');


// Login: solo desde red local
const login = async (req, res) => {
  const { nombre, contrasena } = req.body;
  if (!nombre || !contrasena) {
    return res.status(400).json({ message: 'Faltan datos' });
  }
  try {
    // El login siempre usa pool (invitado)
    const [rows] = await pool.query('SELECT id, nombre, contrasena FROM usuarios WHERE nombre = ?', [nombre]);
    if (!rows.length) {
      return res.status(401).json({ message: 'Usuario o contraseña incorrectos' });
    }
    const usuario = rows[0];
    const match = await bcrypt.compare(contrasena, usuario.contrasena);
    if (!match) {
      return res.status(401).json({ message: 'Usuario o contraseña incorrectos' });
    }
    req.session.usuario = { id: usuario.id, nombre: usuario.nombre };
    res.json({ message: 'Login exitoso', usuario: { id: usuario.id, nombre: usuario.nombre } });
  } catch (err) {
    res.status(500).json({ message: 'Error en login', error: err.message });
  }
};

const logout = (req, res) => {
  req.session.destroy(() => {
    res.json({ message: 'Sesión cerrada' });
  });
};

const requireAuth = (req, res, next) => {
  if (!req.session.usuario) {
    return res.status(401).json({ message: 'No autenticado' });
  }
  next();
};

// CRUD de usuarios
const getUsuarios = async (req, res) => {
  try {
    // Si está autenticado, usa adminPool
    const db = req.session.usuario ? adminPool : pool;
    const [rows] = await db.query('SELECT id, nombre FROM usuarios');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: 'Error al obtener usuarios', error: err.message });
  }
};

const addUsuario = async (req, res) => {
  const { id, nombre, contrasena } = req.body;
  if (!id || !nombre || !contrasena) {
    return res.status(400).json({ message: 'Faltan datos' });
  }
  try {
    const db = req.session.usuario ? adminPool : pool;
    const hash = await bcrypt.hash(contrasena, 10);
    await db.query('INSERT INTO usuarios (id, nombre, contrasena) VALUES (?, ?, ?)', [id, nombre, hash]);
    res.status(201).json({ message: 'Usuario creado' });
  } catch (err) {
    res.status(500).json({ message: 'Error al crear usuario', error: err.message });
  }
};

const updateUsuario = async (req, res) => {
  const { id } = req.params;
  const { nombre, contrasena } = req.body;
  if (!nombre && !contrasena) {
    return res.status(400).json({ message: 'Nada que actualizar' });
  }
  try {
    const db = req.session.usuario ? adminPool : pool;
    let query = 'UPDATE usuarios SET ';
    let params = [];
    if (nombre) {
      query += 'nombre = ?';
      params.push(nombre);
    }
    if (contrasena) {
      if (params.length) query += ', ';
      query += 'contrasena = ?';
      const hash = await bcrypt.hash(contrasena, 10);
      params.push(hash);
    }
    query += ' WHERE id = ?';
    params.push(id);
    await db.query(query, params);
    res.json({ message: 'Usuario actualizado' });
  } catch (err) {
    res.status(500).json({ message: 'Error al actualizar usuario', error: err.message });
  }
};

const deleteUsuario = async (req, res) => {
  const { id } = req.params;
  try {
    const db = req.session.usuario ? adminPool : pool;
    await db.query('DELETE FROM usuarios WHERE id = ?', [id]);
    res.json({ message: 'Usuario eliminado' });
  } catch (err) {
    res.status(500).json({ message: 'Error al eliminar usuario', error: err.message });
  }
};

const deleteProduct = async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM productos WHERE id=?', [id]);
    res.json({ message: 'Producto eliminado' });
  } catch (error) {
    if (error.code === 'ER_ROW_IS_REFERENCED_2' || error.errno === 1451) {
      res.status(409).json({ message: 'No se puede eliminar el producto porque está referenciado en otra tabla.' });
    } else {
      res.status(500).json({ message: 'Error eliminando producto', error });
    }
  }
};

module.exports = {
  login,
  logout,
  requireAuth,
  getUsuarios,
  addUsuario,
  updateUsuario,
  deleteUsuario,
  deleteProduct
}; 