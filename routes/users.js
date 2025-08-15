const express = require('express');

const router = express.Router();

// Log para todas las peticiones a /usuarios
router.use((req, res, next) => {
  next();
});

module.exports = router; 