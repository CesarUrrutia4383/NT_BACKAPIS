const express = require('express');

const router = express.Router();

// Log para todas las peticiones a /usuarios
router.use((req, res, next) => {
  console.log(`[USERS ROUTE] ${req.method} ${req.originalUrl}`);
  next();
});

module.exports = router; 