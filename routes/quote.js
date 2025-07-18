const express = require('express');
const { sendQuote } = require('../controllers/quoteController');
const router = express.Router();

router.post('/', sendQuote);

module.exports = router; 