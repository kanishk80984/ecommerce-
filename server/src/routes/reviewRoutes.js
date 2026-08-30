import express from 'express';
import { 
  submitReview, 
  submitServiceReview,
  updateReview, 
  deleteReview, 
  voteHelpful, 
  getReviewsForProduct,
  getMyReviews
} from '../controllers/reviewController.js';
import { protect, authorize } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Public Routes
router.get('/product/:productId', getReviewsForProduct);

// Customer Routes
router.get('/my-reviews', protect, getMyReviews);
router.post('/', protect, submitReview);
router.post('/service', protect, submitServiceReview);
router.put('/:reviewId', protect, updateReview);
router.delete('/:reviewId', protect, deleteReview);
router.post('/:reviewId/vote', protect, voteHelpful);

export default router;
