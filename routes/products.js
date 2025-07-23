const express = require ('express');
const { getAllProducts} =require ('../controllers/productsController.js');

const router = express.Router();

router.get('/', getAllProducts);

module.exports =router;
