import pool from '../config/db.js';
import crypto from 'crypto';

// Generate unique ID
const generateId = (prefix) => {
  return prefix + '_' + crypto.randomBytes(8).toString('hex');
};

/**
 * @desc    Get all active vendors except logged-in vendor
 * @route   GET /api/vendor-communications/vendors
 * @access  Private/Vendor
 */
export const getVendors = async (req, res) => {
  try {
    const loggedInVendorId = req.user.id;
    const { search = '', category = '', location = '', page = 1, limit = 20 } = req.query;
    
    const offset = (page - 1) * limit;
    
    let query = `
      SELECT u.id, u.name, u.email, u.phone, u.profile_photo, u.status,
             vp.business_name, vp.category as business_category, vp.city, vp.state, vp.business_logo,
             vp.year_established, vp.store_description, vp.website
      FROM users u
      JOIN vendor_profiles vp ON u.id = vp.user_id
      WHERE u.role = 'VENDOR' 
      AND u.id != ? 
      AND u.status = 'ACTIVE'
    `;
    
    const queryParams = [loggedInVendorId];

    if (search) {
      query += ` AND (vp.business_name LIKE ? OR u.name LIKE ?)`;
      queryParams.push(`%${search}%`, `%${search}%`);
    }

    if (category) {
      query += ` AND vp.category = ?`;
      queryParams.push(category);
    }

    if (location) {
      query += ` AND (vp.city LIKE ? OR vp.state LIKE ?)`;
      queryParams.push(`%${location}%`, `%${location}%`);
    }

    // Count total for pagination
    const countQuery = `SELECT COUNT(*) as total FROM (${query}) as subquery`;
    const [countResult] = await pool.query(countQuery, queryParams);
    const total = countResult[0].total;

    query += ` ORDER BY vp.business_name ASC LIMIT ? OFFSET ?`;
    queryParams.push(parseInt(limit), parseInt(offset));

    const [vendors] = await pool.query(query, queryParams);

    res.json({
      success: true,
      data: vendors,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching vendors:', error);
    res.status(500).json({ success: false, message: 'Server error fetching vendors' });
  }
};

/**
 * @desc    Get recent conversations for logged-in vendor
 * @route   GET /api/vendor-communications/conversations
 * @access  Private/Vendor
 */
export const getConversations = async (req, res) => {
  try {
    const vendorId = req.user.id;
    
    const query = `
      SELECT 
        c.id as conversation_id,
        c.blocked_by,
        c.updated_at as last_activity,
        m.message as last_message,
        m.created_at as last_message_time,
        m.is_read,
        m.sender_vendor_id,
        CASE 
          WHEN c.vendor_one_id = ? THEN c.vendor_two_id 
          ELSE c.vendor_one_id 
        END as other_vendor_id,
        u.name as other_vendor_name,
        vp.business_name as other_business_name,
        u.profile_photo as other_vendor_logo,
        (SELECT COUNT(*) FROM vendor_messages vm WHERE vm.conversation_id = c.id AND vm.receiver_vendor_id = ? AND vm.is_read = FALSE) as unread_count
      FROM vendor_conversations c
      LEFT JOIN vendor_messages m ON c.last_message_id = m.id
      JOIN users u ON u.id = (CASE WHEN c.vendor_one_id = ? THEN c.vendor_two_id ELSE c.vendor_one_id END)
      LEFT JOIN vendor_profiles vp ON u.id = vp.user_id
      WHERE c.vendor_one_id = ? OR c.vendor_two_id = ?
      ORDER BY c.updated_at DESC
    `;
    
    const [conversations] = await pool.query(query, [vendorId, vendorId, vendorId, vendorId, vendorId]);
    
    res.json({
      success: true,
      data: conversations
    });
  } catch (error) {
    console.error('Error fetching conversations:', error);
    res.status(500).json({ success: false, message: 'Server error fetching conversations' });
  }
};

/**
 * @desc    Create or get a conversation with another vendor
 * @route   POST /api/vendor-communications/conversations
 * @access  Private/Vendor
 */
export const createOrGetConversation = async (req, res) => {
  try {
    const loggedInVendorId = req.user.id;
    const { targetVendorId } = req.body;

    if (!targetVendorId || loggedInVendorId === targetVendorId) {
      return res.status(400).json({ success: false, message: 'Valid target vendor ID is required' });
    }

    // Determine vendor_one and vendor_two to maintain uniqueness
    const vendors = [loggedInVendorId, targetVendorId].sort();
    const vendorOneId = vendors[0];
    const vendorTwoId = vendors[1];

    // Check if exists
    const [existing] = await pool.query(
      `SELECT * FROM vendor_conversations WHERE vendor_one_id = ? AND vendor_two_id = ?`,
      [vendorOneId, vendorTwoId]
    );

    if (existing.length > 0) {
      return res.json({ success: true, data: existing[0] });
    }

    // Create new
    const conversationId = generateId('conv');
    await pool.query(
      `INSERT INTO vendor_conversations (id, vendor_one_id, vendor_two_id) VALUES (?, ?, ?)`,
      [conversationId, vendorOneId, vendorTwoId]
    );

    res.status(201).json({ 
      success: true, 
      data: { id: conversationId, vendor_one_id: vendorOneId, vendor_two_id: vendorTwoId } 
    });
  } catch (error) {
    console.error('Error creating conversation:', error);
    res.status(500).json({ success: false, message: 'Server error creating conversation' });
  }
};

/**
 * @desc    Get messages for a specific conversation
 * @route   GET /api/vendor-communications/conversations/:id/messages
 * @access  Private/Vendor
 */
export const getMessages = async (req, res) => {
  try {
    const vendorId = req.user.id;
    const conversationId = req.params.id;

    // Verify ownership
    const [conversation] = await pool.query(
      `SELECT * FROM vendor_conversations WHERE id = ? AND (vendor_one_id = ? OR vendor_two_id = ?)`,
      [conversationId, vendorId, vendorId]
    );

    if (conversation.length === 0) {
      return res.status(404).json({ success: false, message: 'Conversation not found or unauthorized' });
    }

    const [messages] = await pool.query(
      `SELECT * FROM vendor_messages WHERE conversation_id = ? ORDER BY created_at ASC`,
      [conversationId]
    );

    res.json({ success: true, data: messages });
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ success: false, message: 'Server error fetching messages' });
  }
};

/**
 * @desc    Send a message
 * @route   POST /api/vendor-communications/conversations/:id/messages
 * @access  Private/Vendor
 */
export const sendMessage = async (req, res) => {
  try {
    const senderId = req.user.id;
    const conversationId = req.params.id;
    const { message, messageType = 'text' } = req.body;

    if (!message) {
      return res.status(400).json({ success: false, message: 'Message content is required' });
    }

    // Verify ownership and get receiver
    const [conversation] = await pool.query(
      `SELECT * FROM vendor_conversations WHERE id = ? AND (vendor_one_id = ? OR vendor_two_id = ?)`,
      [conversationId, senderId, senderId]
    );

    if (conversation.length === 0) {
      return res.status(404).json({ success: false, message: 'Conversation not found or unauthorized' });
    }

    if (conversation[0].blocked_by) {
      return res.status(403).json({ success: false, message: 'Conversation is blocked' });
    }

    const receiverId = conversation[0].vendor_one_id === senderId ? conversation[0].vendor_two_id : conversation[0].vendor_one_id;
    const messageId = generateId('msg');

    await pool.query(
      `INSERT INTO vendor_messages (id, conversation_id, sender_vendor_id, receiver_vendor_id, message, message_type) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [messageId, conversationId, senderId, receiverId, message, messageType]
    );

    await pool.query(
      `UPDATE vendor_conversations SET last_message_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [messageId, conversationId]
    );

    const [newMessage] = await pool.query(`SELECT * FROM vendor_messages WHERE id = ?`, [messageId]);

    // Emit socket event if available
    if (req.app.get('io')) {
       req.app.get('io').to(receiverId).emit('new_message', newMessage[0]);
    }

    res.status(201).json({ success: true, data: newMessage[0] });
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ success: false, message: 'Server error sending message' });
  }
};

/**
 * @desc    Mark messages as read
 * @route   PATCH /api/vendor-communications/messages/read
 * @access  Private/Vendor
 */
export const markMessagesRead = async (req, res) => {
  try {
    const receiverId = req.user.id;
    const { conversationId } = req.body;

    if (!conversationId) {
      return res.status(400).json({ success: false, message: 'Conversation ID is required' });
    }

    await pool.query(
      `UPDATE vendor_messages SET is_read = TRUE, read_at = CURRENT_TIMESTAMP 
       WHERE conversation_id = ? AND receiver_vendor_id = ? AND is_read = FALSE`,
      [conversationId, receiverId]
    );

    // Broadcast read event if needed
    if (req.app.get('io')) {
       // Need to emit to sender that their messages were read
       const [conversation] = await pool.query('SELECT * FROM vendor_conversations WHERE id = ?', [conversationId]);
       if (conversation.length > 0) {
          const senderId = conversation[0].vendor_one_id === receiverId ? conversation[0].vendor_two_id : conversation[0].vendor_one_id;
          req.app.get('io').to(senderId).emit('messages_read', { conversationId });
       }
    }

    res.json({ success: true, message: 'Messages marked as read' });
  } catch (error) {
    console.error('Error marking messages as read:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * @desc    Delete all messages in a conversation
 * @route   DELETE /api/vendor-communications/conversations/:id/messages
 * @access  Private/Vendor
 */
export const clearChatMessages = async (req, res) => {
  try {
    const { id } = req.params;
    const vendorId = req.user.id;

    // Verify conversation belongs to user
    const [conversations] = await pool.query(
      `SELECT * FROM vendor_conversations WHERE id = ? AND (vendor_one_id = ? OR vendor_two_id = ?)`,
      [id, vendorId, vendorId]
    );

    if (conversations.length === 0) {
      return res.status(404).json({ success: false, message: 'Conversation not found' });
    }

    // Hard delete messages for simplicity, normally you'd implement soft delete per user
    await pool.query('DELETE FROM vendor_messages WHERE conversation_id = ?', [id]);
    
    // Also clear last_message_id
    await pool.query('UPDATE vendor_conversations SET last_message_id = NULL WHERE id = ?', [id]);

    res.json({ success: true, message: 'Messages deleted' });
  } catch (error) {
    console.error('Error clearing chat:', error);
    res.status(500).json({ success: false, message: 'Server error clearing chat' });
  }
};

/**
 * @desc    Block or unblock a conversation
 * @route   PATCH /api/vendor-communications/conversations/:id/block
 * @access  Private/Vendor
 */
export const blockUnblockConversation = async (req, res) => {
  try {
    const { id } = req.params;
    const { action } = req.body; // 'block' or 'unblock'
    const vendorId = req.user.id;

    const [conversations] = await pool.query(
      `SELECT * FROM vendor_conversations WHERE id = ? AND (vendor_one_id = ? OR vendor_two_id = ?)`,
      [id, vendorId, vendorId]
    );

    if (conversations.length === 0) {
      return res.status(404).json({ success: false, message: 'Conversation not found' });
    }

    const conversation = conversations[0];
    
    let blocked_by = conversation.blocked_by;

    if (action === 'block') {
      // You can only block if it's not already blocked, or if you want to override it
      blocked_by = vendorId;
    } else if (action === 'unblock') {
      // Only the person who blocked can unblock
      if (blocked_by == vendorId) {
        blocked_by = null;
      }
    }

    await pool.query('UPDATE vendor_conversations SET blocked_by = ? WHERE id = ?', [blocked_by, id]);

    res.json({ success: true, blocked_by });
  } catch (error) {
    console.error('Error blocking/unblocking:', error);
    res.status(500).json({ success: false, message: 'Server error updating block status' });
  }
};
