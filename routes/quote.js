const express = require('express');
const { sendQuote, sendEmailServer } = require('../controllers/quoteController');
const router = express.Router();

// Genera el PDF y devuelve base64 (ruta original)
router.post('/', sendQuote);

// Envío de correo desde el servidor con adjunto (pdfBase64)
router.post('/send', sendEmailServer);

module.exports = router; 