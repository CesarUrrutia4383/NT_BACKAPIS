const express = require('express');
const { saveCart, getCart, deleteCartItem } = require('../controllers/cartController');
const router = express.Router();

router.post('/', saveCart);
router.get('/:userId', getCart);
router.delete('/:userId/:productId', deleteCartItem);

module.exports = router; 