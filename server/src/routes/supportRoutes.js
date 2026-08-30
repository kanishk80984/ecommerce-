import express from 'express';
import { 
  createTicket, getCustomerTickets, getTicketMessages, sendTicketMessage, 
  getSupportTickets, getTicketDetailsForSupport, updateTicketStatus, reopenTicket
} from '../controllers/supportController.js';
import { protect, authorize } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.use(protect);

// Customer endpoints
router.post('/tickets', createTicket);
router.get('/tickets', getCustomerTickets);
router.get('/tickets/:id/messages', getTicketMessages);
router.post('/tickets/:id/messages', sendTicketMessage);
router.put('/tickets/:id/reopen', reopenTicket);

// Tech Support / Admin endpoints
router.get('/admin/tickets', authorize('TECHNICAL_SUPPORT', 'ADMIN', 'SUPER_ADMIN'), getSupportTickets);
router.get('/admin/tickets/:id', authorize('TECHNICAL_SUPPORT', 'ADMIN', 'SUPER_ADMIN'), getTicketDetailsForSupport);
router.put('/admin/tickets/:id/status', authorize('TECHNICAL_SUPPORT', 'ADMIN', 'SUPER_ADMIN'), updateTicketStatus);

export default router;
