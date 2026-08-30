import pool from '../config/db.js';
import deliveryIntegrationService from '../services/DeliveryIntegrationService.js';

// --- CUSTOMER APIs ---

export const createReturnRequest = async (req, res, next) => {
  const connection = await pool.getConnection();
  try {
    const userId = req.user.id;
    const { order_id, items } = req.body; 
    // Fallback for older clients sending single item
    let processItems = items;
    if (!processItems && req.body.order_item_id) {
      processItems = [
        {
          order_item_id: req.body.order_item_id,
          return_type: req.body.return_type,
          reason: req.body.reason,
          description: req.body.description,
          images: req.body.images
        }
      ];
    }

    if (!order_id || !processItems || processItems.length === 0) {
      return res.status(400).json({ success: false, message: 'Missing required fields or items' });
    }

    await connection.beginTransaction();
    const createdReturnIds = [];

    for (const item of processItems) {
      const { order_item_id, return_type, reason, description, images } = item;
      
      if (!order_item_id || !return_type || !reason) {
        throw new Error(`Missing fields for item ID ${order_item_id || 'unknown'}`);
      }

      // 1. Validate Order Item Eligibility
      const [itemInfo] = await connection.query(
        `SELECT oi.quantity, oi.price, oi.vendor_id, oi.product_id, oi.delivered_at, o.delivery_received_at, 
                IFNULL(v.return_policy, p.return_policy) as policy, 
                IFNULL(v.return_window_days, 7) as window_days
         FROM order_items oi
         JOIN orders o ON oi.order_id = o.id
         JOIN products p ON oi.product_id = p.id
         LEFT JOIN variants v ON oi.variant_id = v.id
         WHERE oi.id = ? AND o.user_id = ?`,
        [order_item_id, userId]
      );

      if (itemInfo.length === 0) {
        throw new Error(`Order item ${order_item_id} not found or doesn't belong to user`);
      }

      const info = itemInfo[0];
      const actualDeliveryDate = info.delivered_at || info.delivery_received_at;
      if (!actualDeliveryDate) {
        throw new Error(`Item ${order_item_id} must be DELIVERED to request a return.`);
      }

      // 2. Validate Return Window
      const deliveredDate = new Date(actualDeliveryDate);
      const diffDays = Math.ceil(Math.abs(new Date() - deliveredDate) / (1000 * 60 * 60 * 24));
      
      if (diffDays > info.window_days) {
        throw new Error(`Return window of ${info.window_days} days has expired for item ${order_item_id}.`);
      }

      // 3. Validate Return Policy
      const policy = info.policy || 'NO_RETURN';
      if (policy === 'NO_RETURN') {
        throw new Error(`Item ${order_item_id} is not eligible for return or replacement.`);
      }
      if (return_type === 'RETURN' && policy === 'REPLACEMENT_ONLY') {
        throw new Error(`Item ${order_item_id} is only eligible for replacement.`);
      }
      if (return_type === 'REPLACEMENT' && policy === 'REFUND_ONLY') {
        throw new Error(`Item ${order_item_id} is only eligible for refund.`);
      }

      // 4. Check existing return
      const [existingItem] = await connection.query(
        'SELECT id FROM return_requests WHERE order_item_id = ? AND status NOT IN ("REJECTED", "RETURN_REJECTED")',
        [order_item_id]
      );

      if (existingItem.length > 0) {
        throw new Error(`An active request for item ${order_item_id} already exists.`);
      }

      // 5. Create Return Request
      const [returnRes] = await connection.query(
        `INSERT INTO return_requests (user_id, order_id, order_item_id, product_id, vendor_id, quantity, return_type, status, reason, remarks, images) 
         VALUES (?, ?, ?, ?, ?, ?, ?, 'REQUESTED', ?, ?, ?)`,
        [userId, order_id, order_item_id, info.product_id, info.vendor_id, info.quantity, return_type, reason, description || '', images ? JSON.stringify(images) : null]
      );
      const returnId = returnRes.insertId;
      createdReturnIds.push(returnId);

      // 6. Update order_items status
      await connection.query(`UPDATE order_items SET item_status = 'RETURN_REQUESTED' WHERE id = ?`, [order_item_id]);

      // 7. Status Log
      await connection.query(
        `INSERT INTO return_status_logs (return_id, return_request_id, previous_status, new_status, remarks) VALUES (NULL, ?, NULL, 'REQUESTED', 'Customer initiated request')`,
        [returnId]
      );
    }

    // 8. Update Order Status if necessary (check if all items are returned)
    const [allOrderItems] = await connection.query('SELECT id, item_status FROM order_items WHERE order_id = ?', [order_id]);
    const allReturned = allOrderItems.every(i => i.item_status && i.item_status.startsWith('RETURN_'));
    const anyReturned = allOrderItems.some(i => i.item_status && i.item_status.startsWith('RETURN_'));

    let newOrderStatus = null;
    if (allReturned) newOrderStatus = 'RETURNED';
    else if (anyReturned) newOrderStatus = 'PARTIALLY_RETURNED';

    if (newOrderStatus) {
      await connection.query('UPDATE orders SET order_status = ? WHERE id = ?', [newOrderStatus, order_id]);
    }

    await connection.commit();
    res.status(201).json({ success: true, message: 'Return request(s) submitted successfully', returnIds: createdReturnIds });
  } catch (error) {
    await connection.rollback();
    // Return a 400 for business logic errors thrown above
    if (error.message && !error.message.includes('SQL')) {
      return res.status(400).json({ success: false, message: error.message });
    }
    next(error);
  } finally {
    connection.release();
  }
};

export const getCustomerReturns = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const [returns] = await pool.query(
      `SELECT r.*, 
        p.name as product_name,
        COALESCE(
          (SELECT vi.image_url FROM variant_images vi WHERE vi.variant_id = oi.variant_id AND vi.image_url IS NOT NULL ORDER BY vi.is_default DESC LIMIT 1),
          (SELECT vi.image_url FROM variant_images vi JOIN variants v2 ON vi.variant_id = v2.id JOIN models m2 ON v2.model_id = m2.id WHERE m2.product_id = p.id AND vi.image_url IS NOT NULL LIMIT 1),
          p.thumbnail
        ) as product_thumbnail,
        v.business_name as vendor_name
       FROM return_requests r
       JOIN products p ON r.product_id = p.id
       JOIN order_items oi ON r.order_item_id = oi.id
       JOIN vendor_profiles v ON r.vendor_id = v.user_id
       WHERE r.user_id = ?
       ORDER BY r.created_at DESC`,
      [userId]
    );

    if (returns.length > 0) {
      const returnIds = returns.map(r => r.id);
      const [logs] = await pool.query(
        `SELECT * FROM return_status_logs WHERE return_request_id IN (?) ORDER BY created_at ASC`,
        [returnIds]
      );
      
      const logsByReturn = {};
      logs.forEach(log => {
        if (!logsByReturn[log.return_request_id]) logsByReturn[log.return_request_id] = [];
        logsByReturn[log.return_request_id].push(log);
      });

      returns.forEach(r => {
        r.statusLogs = logsByReturn[r.id] || [];
      });
    }
    
    res.status(200).json({ success: true, returns });
  } catch (error) {
    next(error);
  }
};

// --- VENDOR APIs ---

export const getVendorReturns = async (req, res, next) => {
  try {
    const vendorId = req.user.id;
    const [returns] = await pool.query(
      `SELECT r.*, 
        u.name as customer_name,
        u.email as customer_email,
        u.phone as customer_phone,
        a.street as customer_street,
        a.city as customer_city,
        a.state as customer_state,
        a.zip as customer_zip,
        a.country as customer_country,
        IF(v.name IS NOT NULL, CONCAT(p.name, ' - ', v.name), p.name) as product_name,
        COALESCE(
          (SELECT vi.image_url FROM variant_images vi WHERE vi.variant_id = oi.variant_id AND vi.image_url IS NOT NULL ORDER BY vi.is_default DESC LIMIT 1),
          (SELECT vi.image_url FROM variant_images vi JOIN variants v2 ON vi.variant_id = v2.id JOIN models m2 ON v2.model_id = m2.id WHERE m2.product_id = p.id AND vi.image_url IS NOT NULL LIMIT 1),
          p.thumbnail
        ) as product_thumbnail
       FROM return_requests r
       JOIN users u ON r.user_id = u.id
       JOIN products p ON r.product_id = p.id
       JOIN order_items oi ON r.order_item_id = oi.id
       LEFT JOIN orders o ON oi.order_id = o.id
       LEFT JOIN addresses a ON o.shipping_address_id = a.id
       LEFT JOIN variants v ON oi.variant_id = v.id
       WHERE r.vendor_id = ?
       ORDER BY r.created_at DESC`,
      [vendorId]
    );

    if (returns.length > 0) {
      const returnIds = returns.map(r => r.id);
      const [logs] = await pool.query(
        `SELECT * FROM return_status_logs WHERE return_request_id IN (?) ORDER BY created_at ASC`,
        [returnIds]
      );
      
      const logsByReturn = {};
      logs.forEach(log => {
        if (!logsByReturn[log.return_request_id]) logsByReturn[log.return_request_id] = [];
        logsByReturn[log.return_request_id].push(log);
      });

      returns.forEach(r => {
        r.statusLogs = logsByReturn[r.id] || [];
      });
    }

    res.status(200).json({ success: true, returns });
  } catch (error) {
    next(error);
  }
};

export const updateReturnStatus = async (req, res, next) => {
  const connection = await pool.getConnection();
  try {
    const vendorId = req.user.id;
    const { returnId } = req.params;
    const { action, reason } = req.body; 
    // Actions: APPROVE, REJECT, INSPECT_APPROVE, INSPECT_REJECT, REFUND_APPROVE, REFUND_REJECT, REPLACEMENT_READY

    await connection.beginTransaction();

    const [returnRec] = await connection.query('SELECT * FROM return_requests WHERE id = ? AND vendor_id = ?', [returnId, vendorId]);
    if (returnRec.length === 0) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: 'Return request not found' });
    }

    const currentReturn = returnRec[0];
    let newStatus = currentReturn.status;
    let remarks = reason || '';
    let newItemStatus = null;
    let vendorRejectionCol = 'vendor_rejection_reason';
    let inspectionRemarksCol = 'vendor_inspection_remarks';

    if (action === 'APPROVE' || action === 'REJECT') {
      if (currentReturn.status !== 'REQUESTED' && currentReturn.status !== 'VENDOR_REVIEW') {
        await connection.rollback();
        return res.status(400).json({ success: false, message: 'Return is no longer pending initial review' });
      }
      newStatus = action === 'APPROVE' ? 'RETURN_APPROVED' : 'RETURN_REJECTED';
      newItemStatus = newStatus;
      remarks = reason || (action === 'APPROVE' ? 'Vendor Approved' : 'Vendor Rejected');
      
      await connection.query(
        `UPDATE return_requests SET status = ?, vendor_rejection_reason = ? WHERE id = ?`,
        [newStatus, action === 'REJECT' ? reason : null, returnId]
      );
    } 
    else if (action === 'RECEIVE_RETURN') {
      if (currentReturn.status !== 'RETURN_IN_TRANSIT') {
        await connection.rollback();
        return res.status(400).json({ success: false, message: 'Return must be shipped by customer first' });
      }
      newStatus = 'RETURN_RECEIVED';
      newItemStatus = newStatus;
      remarks = reason || 'Package received by Vendor';
      
      await connection.query(
        `UPDATE return_requests SET status = ? WHERE id = ?`,
        [newStatus, returnId]
      );
    }
    else if (action === 'INSPECT_APPROVE' || action === 'INSPECT_REJECT') {
      if (currentReturn.status !== 'RETURN_RECEIVED') {
        await connection.rollback();
        return res.status(400).json({ success: false, message: 'Return must be received before inspection' });
      }
      newStatus = action === 'INSPECT_APPROVE' ? 'INSPECTION_APPROVED' : 'INSPECTION_REJECTED';
      newItemStatus = newStatus;
      remarks = reason || (action === 'INSPECT_APPROVE' ? 'Inspection Approved' : 'Inspection Rejected');
      
      await connection.query(
        `UPDATE return_requests SET status = ?, vendor_inspection_remarks = ? WHERE id = ?`,
        [newStatus, remarks, returnId]
      );
    }
    else if (action === 'REFUND_APPROVE' || action === 'REFUND_REJECT') {
      if (currentReturn.status !== 'INSPECTION_APPROVED') {
        await connection.rollback();
        return res.status(400).json({ success: false, message: 'Inspection must be approved before refund processing' });
      }
      newStatus = action === 'REFUND_APPROVE' ? 'REFUND_APPROVED' : 'REFUND_REJECTED';
      newItemStatus = newStatus;
      remarks = reason || (action === 'REFUND_APPROVE' ? 'Refund Approved by Vendor' : 'Refund Rejected by Vendor');
      
      await connection.query(
        `UPDATE return_requests SET status = ? WHERE id = ?`,
        [newStatus, returnId]
      );

      if (action === 'REFUND_APPROVE') {
        const [itemData] = await connection.query('SELECT oi.price, oi.quantity, oi.order_id, o.user_id FROM order_items oi JOIN orders o ON oi.order_id = o.id WHERE oi.id = ?', [currentReturn.order_item_id]);
        if (itemData.length > 0) {
           const refundAmount = itemData[0].price * itemData[0].quantity;
           await connection.query(
             'INSERT INTO refund_requests (user_id, order_id, order_item_id, amount, reason, request_type, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
             [itemData[0].user_id, itemData[0].order_id, currentReturn.order_item_id, refundAmount, 'Return Approved by Vendor', 'REFUND', 'PENDING']
           );
        }
      }
    }
    else if (action === 'REPLACEMENT_READY') {
      if (currentReturn.status !== 'INSPECTION_APPROVED') {
        await connection.rollback();
        return res.status(400).json({ success: false, message: 'Inspection must be approved before replacement' });
      }
      newStatus = 'REPLACEMENT_SHIPPED';
      newItemStatus = 'REPLACEMENT_READY';
      remarks = reason || 'Replacement product shipped by Vendor';
      
      const { replacementDeliveryProvider, replacementTrackingNumber } = req.body;
      await connection.query(
        `UPDATE return_requests SET status = ?, replacement_delivery_provider = ?, replacement_tracking_number = ? WHERE id = ?`,
        [newStatus, replacementDeliveryProvider || null, replacementTrackingNumber || null, returnId]
      );
    }
    else if (action === 'REPLACEMENT_DELIVERED') {
      if (currentReturn.status !== 'REPLACEMENT_SHIPPED') {
        await connection.rollback();
        return res.status(400).json({ success: false, message: 'Replacement must be shipped first' });
      }
      newStatus = 'REPLACEMENT_DELIVERED';
      newItemStatus = 'RETURN_COMPLETED';
      remarks = reason || 'Replacement product delivered to customer';
      
      await connection.query(
        `UPDATE return_requests SET status = ? WHERE id = ?`,
        [newStatus, returnId]
      );
    } else {
      await connection.rollback();
      return res.status(400).json({ success: false, message: 'Invalid action provided' });
    }

    // Update order_items
    if (newItemStatus) {
      await connection.query('UPDATE order_items SET item_status = ? WHERE id = ?', [newItemStatus, currentReturn.order_item_id]);
    }

    // Insert timeline log
    await connection.query(
      `INSERT INTO return_status_logs (return_id, return_request_id, previous_status, new_status, remarks) VALUES (NULL, ?, ?, ?, ?)`,
      [returnId, currentReturn.status, newStatus, remarks]
    );

    // Update orders tracking_timeline for the customer
    const [oRows] = await connection.query('SELECT tracking_timeline FROM orders WHERE id = ?', [currentReturn.order_id]);
    let timeline = [];
    if (oRows.length > 0 && oRows[0].tracking_timeline) {
      try {
        timeline = typeof oRows[0].tracking_timeline === 'string' ? JSON.parse(oRows[0].tracking_timeline) : oRows[0].tracking_timeline;
      } catch (e) { timeline = []; }
    }
    timeline.push({
      item_id: currentReturn.order_item_id,
      event: newStatus,
      timestamp: new Date().toISOString(),
      notes: remarks
    });
    await connection.query('UPDATE orders SET tracking_timeline = ? WHERE id = ?', [JSON.stringify(timeline), currentReturn.order_id]);

    await connection.commit();

    // Trigger external integrations asynchronously
    if (newStatus === 'RETURN_APPROVED') {
      console.log(`[Reverse Pickup] Triggering reverse pickup for Return ID: ${returnId}`);
      if (typeof deliveryIntegrationService.initiateReversePickup === 'function') {
        deliveryIntegrationService.initiateReversePickup(returnId).catch(e => console.error('[Reverse Pickup] Failed:', e));
      }
    } else if (newStatus === 'REPLACEMENT_READY') {
      // In a real app, create a replacement order here.
      console.log(`[Replacement] Creating replacement order for Return ID: ${returnId}`);
    }

    res.status(200).json({ success: true, message: `Return request updated to ${newStatus} successfully.` });
  } catch (error) {
    await connection.rollback();
    next(error);
  } finally {
    connection.release();
  }
};

// --- ADMIN APIs ---
export const getAllReturns = async (req, res, next) => {
  try {
    const [returns] = await pool.query(
      `SELECT r.*, 
        u.name as customer_name,
        v.business_name as vendor_name,
        p.name as product_name
       FROM return_requests r
       JOIN users u ON r.user_id = u.id
       JOIN vendor_profiles v ON r.vendor_id = v.user_id
       JOIN products p ON r.product_id = p.id
       WHERE r.return_type = 'RETURN'
       ORDER BY r.created_at DESC`
    );

    if (returns.length > 0) {
      const returnIds = returns.map(r => r.id);
      const [logs] = await pool.query(
        `SELECT * FROM return_status_logs WHERE return_request_id IN (?) ORDER BY created_at ASC`,
        [returnIds]
      );
      
      const logsByReturn = {};
      logs.forEach(log => {
        if (!logsByReturn[log.return_request_id]) logsByReturn[log.return_request_id] = [];
        logsByReturn[log.return_request_id].push(log);
      });

      returns.forEach(r => {
        r.statusLogs = logsByReturn[r.id] || [];
      });
    }

    res.status(200).json({ success: true, returns });
  } catch (error) {
    next(error);
  }
};

export const getReturnDetails = async (req, res, next) => {
  try {
    const { returnId } = req.params;
    const [returns] = await pool.query(
      `SELECT r.*, 
        u.name as customer_name, u.email as customer_email, u.phone as customer_phone,
        v.business_name as vendor_name, v.business_address as vendor_address,
        p.name as product_name, p.thumbnail as product_thumbnail
       FROM return_requests r
       JOIN users u ON r.user_id = u.id
       JOIN vendor_profiles v ON r.vendor_id = v.user_id
       JOIN products p ON r.product_id = p.id
       WHERE r.id = ?`,
      [returnId]
    );

    if (returns.length === 0) {
      return res.status(404).json({ success: false, message: 'Return not found' });
    }

    const [logs] = await pool.query('SELECT * FROM return_status_logs WHERE return_request_id = ? ORDER BY created_at ASC', [returnId]);

    res.status(200).json({ success: true, returnRequest: returns[0], timeline: logs });
  } catch (error) {
    next(error);
  }
};

export const adminUpdateReturnStatus = async (req, res, next) => {
  const connection = await pool.getConnection();
  try {
    const { returnId } = req.params;
    const { action, remarks } = req.body; // action = PROCESS_REFUND
    
    await connection.beginTransaction();
    const [returnRec] = await connection.query('SELECT * FROM return_requests WHERE id = ?', [returnId]);
    if (returnRec.length === 0) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: 'Return request not found' });
    }
    
    const currentReturn = returnRec[0];
    let newStatus = currentReturn.status;
    let newItemStatus = null;
    let adminRemarks = remarks || 'Processed by Admin';

    if (action === 'PROCESS_REFUND') {
      if (currentReturn.status !== 'REFUND_APPROVED') {
        await connection.rollback();
        return res.status(400).json({ success: false, message: 'Return must be approved for refund by vendor first' });
      }
      newStatus = 'REFUND_COMPLETED';
      newItemStatus = newStatus;
      
      await connection.query(
        `UPDATE return_requests SET status = ?, admin_verification_remarks = ? WHERE id = ?`,
        [newStatus, adminRemarks, returnId]
      );
    } else {
      await connection.rollback();
      return res.status(400).json({ success: false, message: 'Invalid Admin Action' });
    }

    if (newItemStatus) {
      await connection.query('UPDATE order_items SET item_status = ? WHERE id = ?', [newItemStatus, currentReturn.order_item_id]);
    }

    await connection.query(
      `INSERT INTO return_status_logs (return_id, return_request_id, previous_status, new_status, remarks) VALUES (NULL, ?, ?, ?, ?)`,
      [returnId, currentReturn.status, newStatus, adminRemarks]
    );

    await connection.commit();
    res.status(200).json({ success: true, message: `Return request updated to ${newStatus} successfully.` });
  } catch (error) {
    await connection.rollback();
    next(error);
  } finally {
    connection.release();
  }
};

export const submitCustomerReturnTracking = async (req, res, next) => {
  const connection = await pool.getConnection();
  try {
    const userId = req.user.id;
    const { returnId } = req.params;
    const { deliveryProvider, trackingNumber } = req.body;

    if (!deliveryProvider || !trackingNumber) {
      return res.status(400).json({ success: false, message: 'Website/Carrier name and tracking number are required' });
    }

    await connection.beginTransaction();

    const [returnRec] = await connection.query('SELECT * FROM return_requests WHERE id = ? AND user_id = ?', [returnId, userId]);
    if (returnRec.length === 0) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: 'Return request not found or unauthorized' });
    }

    const currentReturn = returnRec[0];
    if (currentReturn.status !== 'RETURN_APPROVED') {
      await connection.rollback();
      return res.status(400).json({ success: false, message: 'Return request must be approved by vendor first' });
    }

    const newStatus = 'RETURN_IN_TRANSIT';
    
    // Update return request
    await connection.query(
      `UPDATE return_requests SET status = ?, return_delivery_provider = ?, return_tracking_number = ? WHERE id = ?`,
      [newStatus, deliveryProvider, trackingNumber, returnId]
    );

    // Update order items
    await connection.query('UPDATE order_items SET item_status = ? WHERE id = ?', [newStatus, currentReturn.order_item_id]);

    // Insert timeline log
    await connection.query(
      `INSERT INTO return_status_logs (return_id, return_request_id, previous_status, new_status, remarks) VALUES (NULL, ?, ?, ?, ?)`,
      [returnId, currentReturn.status, newStatus, `Customer submitted return shipment details (Carrier: ${deliveryProvider}, Tracking ID: ${trackingNumber})`]
    );

    await connection.commit();
    res.status(200).json({ success: true, message: 'Return tracking details submitted successfully' });
  } catch (error) {
    await connection.rollback();
    next(error);
  } finally {
    connection.release();
  }
};
