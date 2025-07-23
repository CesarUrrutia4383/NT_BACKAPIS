const express = require('express');
const {
  login,
  logout,
  requireAuth,
  getUsuarios,
  addUsuario,
  updateUsuario,
  deleteUsuario
} = require('../controllers/usersController');

const router = express.Router();

// Log para todas las peticiones a /usuarios
router.use((req, res, next) => {
  console.log(`[USERS ROUTE] ${req.method} ${req.originalUrl}`);
  next();
});

// Permitir OPTIONS para /login desde cualquier IP (para pruebas)
router.options('/login', (req, res) => {
  res.sendStatus(200);
});

router.post('/login', login);
router.get('/logout', logout);

// CRUD protegido
router.get('/', requireAuth, getUsuarios);
router.post('/', requireAuth, addUsuario);
router.put('/:id', requireAuth, updateUsuario);
router.delete('/:id', requireAuth, deleteUsuario);

module.exports = router; 