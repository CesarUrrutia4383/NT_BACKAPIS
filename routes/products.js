const express = require ('express');
const { getAllProducts, addProduct } =require ('../controllers/productsController.js');

const router = express.Router();

router.get('/', getAllProducts);
router.post('/', addProduct);

module.exports =router;
