import express from 'express';
import { getBankAccounts, createOrUpdateBankAccount, getMyBankAccount } from '../controllers/adminController.js';
import { protect, authorize } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Apply protect middleware to all routes
router.use(protect);

// Allow any authenticated user to manage their own bank account
router.get('/my', getMyBankAccount);
router.post('/my', createOrUpdateBankAccount);

// Allow admins and super admins to view all bank accounts
router.get('/', authorize('ADMIN', 'SUPER_ADMIN'), getBankAccounts);

export default router;
