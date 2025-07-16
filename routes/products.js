import express from 'express';
import { getAllProducts, addProduct } from '../controllers/productsController.js';

const router = express.Router();

router.get('/', getAllProducts);
router.post('/', addProduct);

export default router;
