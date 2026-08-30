import express from 'express';
import { syncCart, addToCart, updateCartQuantity, removeFromCart, clearCart } from '../controllers/cartController.js';
import { protect } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.use(protect);

router.post('/sync', syncCart);
router.post('/', addToCart);
router.put('/:productId', updateCartQuantity);
router.delete('/:productId', removeFromCart);
router.delete('/', clearCart);

export default router;
