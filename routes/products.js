const express = require ('express');
const { getAllProducts, addProduct, updateProduct, deleteProduct } =require ('../controllers/productsController.js');

const router = express.Router();

router.get('/', getAllProducts);
router.post('/', addProduct);
router.put('/:id', updateProduct);
router.delete('/:id', deleteProduct);

module.exports =router;
