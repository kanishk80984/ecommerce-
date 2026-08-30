import express from 'express';
import { protect, authorize } from '../middlewares/authMiddleware.js';
import {
  getVendors,
  getConversations,
  createOrGetConversation,
  getMessages,
  sendMessage,
  markMessagesRead,
  clearChatMessages,
  blockUnblockConversation
} from '../controllers/vendorCommunicationController.js';

const router = express.Router();

// Apply middleware to all routes in this file
router.use(protect);
router.use(authorize('VENDOR', 'ADMIN', 'SUPER_ADMIN')); // Allow admins just in case

// Vendor directory
router.get('/vendors', getVendors);

// Conversations
router.route('/conversations')
  .get(getConversations)
  .post(createOrGetConversation);

router.route('/conversations/:id/messages')
  .get(getMessages)
  .post(sendMessage)
  .delete(clearChatMessages);

router.patch('/conversations/:id/block', blockUnblockConversation);

// Messages
router.patch('/messages/read', markMessagesRead);

export default router;
