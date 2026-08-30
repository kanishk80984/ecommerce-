import pool from '../config/db.js';

// Create a support ticket
export const createTicket = async (req, res, next) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const userId = req.user.id;
    const { subject, message } = req.body;

    if (!subject || !message) {
      return res.status(400).json({ success: false, message: 'Subject and message are required' });
    }

    // Generate unique ticket number > 8 digits (e.g. 10 digit number)
    const ticketNumber = 'TK' + Math.floor(10000000 + Math.random() * 90000000);

    const [ticketResult] = await connection.query(
      'INSERT INTO support_tickets (ticket_number, user_id, subject, status) VALUES (?, ?, ?, "PENDING")',
      [ticketNumber, userId, subject]
    );
    const ticketId = ticketResult.insertId;

    await connection.query(
      'INSERT INTO support_messages (ticket_id, sender_id, message) VALUES (?, ?, ?)',
      [ticketId, userId, message]
    );

    await connection.commit();
    res.status(201).json({ success: true, message: 'Ticket raised successfully', ticketNumber, ticketId });
  } catch (error) {
    await connection.rollback();
    next(error);
  } finally {
    connection.release();
  }
};

// Get tickets for logged-in customer
export const getCustomerTickets = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const [tickets] = await pool.query(
      'SELECT * FROM support_tickets WHERE user_id = ? ORDER BY created_at DESC',
      [userId]
    );
    res.status(200).json({ success: true, tickets });
  } catch (error) {
    next(error);
  }
};

// Get messages for a ticket
export const getTicketMessages = async (req, res, next) => {
  try {
    const { id } = req.params;
    const [messages] = await pool.query(
      `SELECT sm.*, u.name as sender_name, u.role as sender_role 
       FROM support_messages sm 
       JOIN users u ON sm.sender_id = u.id 
       WHERE sm.ticket_id = ? 
       ORDER BY sm.created_at ASC`,
      [id]
    );
    res.status(200).json({ success: true, messages });
  } catch (error) {
    next(error);
  }
};

// Send a message on a ticket
export const sendTicketMessage = async (req, res, next) => {
  try {
    const { id } = req.params;
    const senderId = req.user.id;
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ success: false, message: 'Message is required' });
    }

    await pool.query(
      'INSERT INTO support_messages (ticket_id, sender_id, message) VALUES (?, ?, ?)',
      [id, senderId, message]
    );

    // If support team member replies, mark ticket as IN_PROGRESS automatically
    if (req.user.role === 'TECHNICAL_SUPPORT' || req.user.role === 'ADMIN' || req.user.role === 'SUPER_ADMIN') {
      await pool.query('UPDATE support_tickets SET status = "IN_PROGRESS" WHERE id = ? AND status = "PENDING"', [id]);
    }

    res.status(201).json({ success: true, message: 'Message sent successfully' });
  } catch (error) {
    next(error);
  }
};

// Tech Support Endpoint: Get all tickets
export const getSupportTickets = async (req, res, next) => {
  try {
    const [tickets] = await pool.query(
      `SELECT st.*, u.name as customer_name, u.email as customer_email 
       FROM support_tickets st 
       JOIN users u ON st.user_id = u.id 
       ORDER BY st.created_at DESC`
    );
    res.status(200).json({ success: true, tickets });
  } catch (error) {
    next(error);
  }
};

// Tech Support Endpoint: Get details of a ticket, customer purchased products and booked services
export const getTicketDetailsForSupport = async (req, res, next) => {
  try {
    const { id } = req.params;

    const [tickets] = await pool.query(
      `SELECT st.*, u.id as customer_id, u.name as customer_name, u.phone as customer_phone, u.email as customer_email 
       FROM support_tickets st 
       JOIN users u ON st.user_id = u.id 
       WHERE st.id = ?`,
      [id]
    );

    if (tickets.length === 0) {
      return res.status(404).json({ success: false, message: 'Ticket not found' });
    }
    const ticket = tickets[0];
    const customerId = ticket.customer_id;

    // Fetch customer product purchases using a flat join to support older MySQL/MariaDB databases
    const [rows] = await pool.query(
      `SELECT o.id as order_id, o.payment_status, o.order_status, o.total_amount, o.created_at,
              p.name as item_name, oi.price as item_price, oi.quantity as item_quantity
       FROM orders o
       JOIN order_items oi ON o.id = oi.order_id
       JOIN products p ON oi.product_id = p.id
       WHERE o.user_id = ?
       ORDER BY o.created_at DESC`,
      [customerId]
    );

    const ordersMap = {};
    for (const row of rows) {
      if (!ordersMap[row.order_id]) {
        ordersMap[row.order_id] = {
          order_id: row.order_id,
          payment_status: row.payment_status,
          order_status: row.order_status,
          total_amount: row.total_amount,
          created_at: row.created_at,
          items: []
        };
      }
      if (row.item_name) {
        ordersMap[row.order_id].items.push({
          name: row.item_name,
          price: row.item_price,
          quantity: row.item_quantity
        });
      }
    }
    const parsedOrders = Object.values(ordersMap);

    // Fetch customer service bookings
    const [services] = await pool.query(
      `SELECT se.id as booking_id, se.status as booking_status, se.created_at, 
              vs.name as service_name, vs.amount as service_amount,
              'PAID' as payment_status -- Default status as MySQL doesn't have payment status column for service_enquiries yet
       FROM service_enquiries se
       JOIN vendor_services vs ON se.service_id = vs.id
       WHERE se.customer_id = ?
       ORDER BY se.created_at DESC`,
      [customerId]
    );

    res.status(200).json({
      success: true,
      ticket,
      orders: parsedOrders,
      services
    });
  } catch (error) {
    next(error);
  }
};

// Tech Support Endpoint: Update status (e.g. resolve/close ticket)
export const updateTicketStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // 'PENDING' | 'IN_PROGRESS' | 'RESOLVED'

    if (!['PENDING', 'IN_PROGRESS', 'RESOLVED'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    await pool.query(
      'UPDATE support_tickets SET status = ? WHERE id = ?',
      [status, id]
    );

    res.status(200).json({ success: true, message: `Ticket marked as ${status} successfully` });
  } catch (error) {
    next(error);
  }
};

// Customer/Vendor Endpoint: Reopen ticket
export const reopenTicket = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    const [tickets] = await pool.query('SELECT id, user_id FROM support_tickets WHERE id = ?', [id]);
    if (tickets.length === 0) {
      return res.status(404).json({ success: false, message: 'Ticket not found' });
    }

    const ticket = tickets[0];
    if (ticket.user_id !== userId && !['TECHNICAL_SUPPORT', 'ADMIN', 'SUPER_ADMIN'].includes(userRole)) {
      return res.status(403).json({ success: false, message: 'Unauthorized to reopen this ticket' });
    }

    await pool.query(
      "UPDATE support_tickets SET status = 'IN_PROGRESS' WHERE id = ?",
      [id]
    );

    await pool.query(
      "INSERT INTO support_messages (ticket_id, sender_id, message) VALUES (?, ?, 'Ticket has been REOPENED')",
      [id, userId]
    );

    res.status(200).json({ success: true, message: 'Ticket reopened successfully' });
  } catch (error) {
    next(error);
  }
};
