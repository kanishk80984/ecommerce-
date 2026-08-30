import pool from '../config/db.js';

export const createOrder = async (req, res, next) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const userId = req.user.id;
    const { items, totalAmount, paymentMethod, shippingDetails } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Cart is empty' });
    }

    // 1. Create a shipping address (or use existing)
    let addressId;
    if (req.body.shippingAddressId) {
      addressId = req.body.shippingAddressId;
    } else {
      const [addressResult] = await connection.query(
        `INSERT INTO addresses (user_id, name, phone, type, street, city, state, zip, country) 
         VALUES (?, ?, ?, 'SHIPPING', ?, ?, ?, ?, ?)`,
        [userId, shippingDetails.name, shippingDetails.phone, shippingDetails.street, shippingDetails.city, shippingDetails.state, shippingDetails.zip, shippingDetails.country || 'India']
      );
      addressId = addressResult.insertId;
    }

    // 2. Create the Order
    const [orderResult] = await connection.query(
      `INSERT INTO orders (user_id, shipping_address_id, total_amount, payment_method, payment_status, order_status)
       VALUES (?, ?, ?, ?, ?, 'PLACED')`,
      [userId, addressId, totalAmount, paymentMethod || 'COD', paymentMethod === 'COD' ? 'PENDING' : 'PAID']
    );
    const orderId = orderResult.insertId;

    // 3. Create Order Items and Reduce Stock
    for (const item of items) {
      const quantity = item.quantity || 1;
      let realProductId = String(item.product_id || item.id).trim();
      let realVendorId = String(item.vendor_id || 1).trim();
      let realVariantId = String(item.variant_id || 0).trim();
      
      if (!/^\d+$/.test(realProductId)) {
        const [pRows] = await connection.query("SELECT id FROM products WHERE public_id = ? OR slug = ?", [realProductId, realProductId]);
        if (pRows.length > 0) {
          realProductId = pRows[0].id;
        } else {
          realProductId = 0; // prevent string passing
        }
      } else {
        realProductId = parseInt(realProductId, 10);
      }
      
      if (!/^\d+$/.test(realVendorId)) {
        const [vRows] = await connection.query("SELECT user_id FROM vendor_profiles WHERE public_id = ? OR slug = ?", [realVendorId, realVendorId]);
        if (vRows.length > 0) {
          realVendorId = vRows[0].user_id;
        } else {
          realVendorId = 0;
        }
      } else {
        realVendorId = parseInt(realVendorId, 10);
      }

      if (!/^\d+$/.test(realVariantId)) {
        const [vrRows] = await connection.query("SELECT id FROM variants WHERE public_id = ?", [realVariantId]);
        if (vrRows.length > 0) {
          realVariantId = vrRows[0].id;
        } else {
          realVariantId = 0;
        }
      } else {
        realVariantId = parseInt(realVariantId, 10);
      }

      await connection.query(
        `INSERT INTO order_items (order_id, product_id, vendor_id, variant_id, quantity, price)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [orderId, realProductId, realVendorId, realVariantId, quantity, item.price]
      );

      // Reduce stock
      await connection.query(
        `UPDATE products SET stock = stock - ? WHERE id = ? AND stock >= ?`,
        [quantity, realProductId, quantity]
      );

      if (realVariantId > 0) {
        await connection.query(
          `UPDATE variants SET stock = stock - ? WHERE id = ? AND stock >= ?`,
          [quantity, realVariantId, quantity]
        );
      }
      
      console.log('--- DBG --- userId:', userId, 'realProductId:', realProductId, 'realVariantId:', realVariantId, 'item:', item);
      // Clear the purchased item from the cart in database
      await connection.query(
        'DELETE FROM cart WHERE user_id = ? AND product_id = ? AND variant_id = ?',
        [userId, realProductId, realVariantId]
      );
    }

    await connection.commit();
    res.status(201).json({ success: true, message: 'Order placed successfully!', orderId });

  } catch (error) {
    await connection.rollback();
    next(error);
  } finally {
    connection.release();
  }
};

export const markDeliveryReceived = async (req, res, next) => {
  const connection = await pool.getConnection();
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const [order] = await connection.query('SELECT id FROM orders WHERE id = ? AND user_id = ?', [id, userId]);
    if (order.length === 0) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    await connection.query(
      `UPDATE orders SET order_status = 'DELIVERED', delivery_received_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [id]
    );

    res.status(200).json({ success: true, message: 'Order marked as delivered successfully' });
  } catch (error) {
    next(error);
  } finally {
    connection.release();
  }
};

export const getCustomerOrders = async (req, res, next) => {
  try {
    const userId = req.user.id;
    
    // 1. Fetch all orders for user with their shipping addresses
    const [orders] = await pool.query(
      `SELECT o.*, 
              a.name as shipping_name, a.phone as shipping_phone, a.street as shipping_street, 
              a.city as shipping_city, a.state as shipping_state, a.zip as shipping_zip, a.country as shipping_country
       FROM orders o 
       LEFT JOIN addresses a ON o.shipping_address_id = a.id
       WHERE o.user_id = ? 
       ORDER BY o.created_at DESC`,
      [userId]
    );

    if (orders.length === 0) {
      return res.status(200).json({ success: true, orders: [] });
    }

    const orderIds = orders.map(o => o.id);

    // 2. Fetch all order items for these orders with product and variant info
    const [orderItems] = await pool.query(
      `SELECT oi.*, p.name as product_name, p.thumbnail as product_thumbnail, p.return_policy as product_return_policy,
              v.name as variant_name, v.return_policy as variant_return_policy, v.return_window_days as variant_return_window_days,
              c.gst_percentage as category_gst, c.margin_percentage as category_margin,
              vp.business_name, vp.business_address,
              vu.phone as vendor_phone, vu.email as vendor_email
       FROM order_items oi
       JOIN products p ON oi.product_id = p.id
       LEFT JOIN categories c ON p.category_id = c.id
       LEFT JOIN variants v ON oi.variant_id = v.id
       LEFT JOIN vendor_profiles vp ON oi.vendor_id = vp.user_id
       LEFT JOIN users vu ON vp.user_id = vu.id
       WHERE oi.order_id IN (?)`,
      [orderIds]
    );

    // 3. For thumbnails, let's fetch default variant images for fallback resolution if needed
    // Map orderItems to match expected object keys in parsedOrders
    const enrichedItems = [];
    for (const item of orderItems) {
      let thumbnail = item.product_thumbnail;
      if (item.variant_id > 0) {
        const [vImgs] = await pool.query(
          `SELECT image_url FROM variant_images WHERE variant_id = ? AND image_url IS NOT NULL ORDER BY is_default DESC LIMIT 1`,
          [item.variant_id]
        );
        if (vImgs.length > 0) {
          thumbnail = vImgs[0].image_url;
        } else {
          const [fallbackImgs] = await pool.query(
            `SELECT vi.image_url FROM variant_images vi JOIN variants v2 ON vi.variant_id = v2.id JOIN models m2 ON v2.model_id = m2.id WHERE m2.product_id = ? AND vi.image_url IS NOT NULL LIMIT 1`,
            [item.product_id]
          );
          if (fallbackImgs.length > 0) {
            thumbnail = fallbackImgs[0].image_url;
          }
        }
      }

      enrichedItems.push({
        id: item.id,
        order_id: item.order_id,
        product_id: item.product_id,
        quantity: item.quantity,
        price: item.price,
        item_status: item.item_status,
        rejection_reason: item.rejection_reason,
        delivery_request_id: item.delivery_request_id,
        delivery_provider: item.delivery_provider,
        tracking_number: item.tracking_number,
        delivery_agent_name: item.delivery_agent_name,
        delivery_agent_phone: item.delivery_agent_phone,
        picked_up_at: item.picked_up_at,
        delivered_at: item.delivered_at,
        name: item.variant_name ? `${item.product_name} - ${item.variant_name}` : item.product_name,
        variant_name: item.variant_name || null,
        thumbnail: thumbnail,
        return_policy: item.variant_return_policy || item.product_return_policy,
        return_window_days: item.variant_return_window_days || 7,
        category_gst: item.category_gst,
        category_margin: item.category_margin,
        vendor_name: item.business_name,
        vendor_address: item.business_address,
        vendor_phone: item.vendor_phone,
        vendor_email: item.vendor_email
      });
    }

    // 4. Fetch return requests and return status logs if any returned items exist
    const returnItemIds = enrichedItems
      .filter(item => item.item_status && (item.item_status.startsWith('RETURN_') || item.item_status.startsWith('REFUND_') || item.item_status === 'RETURNED' || item.item_status === 'REFUNDED'))
      .map(item => item.id);

    let returnRequests = [];
    let statusLogs = [];
    if (returnItemIds.length > 0) {
      const [rReqs] = await pool.query(
        `SELECT * FROM return_requests WHERE order_item_id IN (?) AND status NOT IN ('REJECTED', 'RETURN_REJECTED')`,
        [returnItemIds]
      );
      returnRequests = rReqs;

      if (returnRequests.length > 0) {
        const returnReqIds = returnRequests.map(r => r.id);
        const [logs] = await pool.query(
          `SELECT * FROM return_status_logs WHERE return_request_id IN (?) ORDER BY created_at DESC`,
          [returnReqIds]
        );
        statusLogs = logs;
      }
    }

    // 5. Build parsedOrders matching the frontend structure
    const parsedOrders = orders.map(order => {
      const items = enrichedItems.filter(item => item.order_id === order.id);

      let computedStatus = order.order_status;
      if (items.length > 0) {
        const total = items.length;
        const delivered = items.filter(i => i.item_status === 'DELIVERED').length;
        const returned = items.filter(i => ['RETURN_COMPLETED', 'RETURNED', 'REFUNDED'].includes(i.item_status)).length;
        const cancelled = items.filter(i => i.item_status === 'CANCELLED').length;
        
        if (cancelled === total) {
          computedStatus = 'CANCELLED';
        } else if (returned === total) {
          computedStatus = 'RETURNED';
        } else if (delivered === total) {
          computedStatus = 'DELIVERED';
        } else if (delivered > 0 && returned > 0) {
          computedStatus = 'PARTIALLY_RETURNED';
        } else if (items.some(i => i.item_status === 'OUT_FOR_DELIVERY')) {
          computedStatus = 'OUT_FOR_DELIVERY';
        } else if (items.some(i => i.item_status === 'IN_TRANSIT')) {
          computedStatus = 'IN_TRANSIT';
        } else {
          // Highest active fulfillment status
          const activeRanks = {
            'PLACED': 1,
            'CONFIRMED': 2,
            'READY_FOR_DISPATCH': 3,
            'WAITING_FOR_PICKUP': 4,
            'PACKAGE_COLLECTED': 5,
            'IN_TRANSIT': 6,
            'OUT_FOR_DELIVERY': 7
          };
          
          let highestRank = -1;
          let highestStatus = null;
          
          for (const item of items) {
            const st = item.item_status || 'PLACED';
            if (activeRanks[st] && activeRanks[st] > highestRank) {
              highestRank = activeRanks[st];
              highestStatus = st;
            }
          }
          
          if (highestStatus) {
            computedStatus = highestStatus;
          }
        }
      }

      // Link return request object structure
      const itemsWithReturns = items.map(item => {
        const matchedReturn = returnRequests.find(r => r.order_item_id === item.id);
        if (matchedReturn) {
          const matchedLogs = statusLogs.filter(l => l.return_request_id === matchedReturn.id);
          return {
            ...item,
            return_request: {
              id: matchedReturn.id,
              return_type: matchedReturn.return_type,
              status: matchedReturn.status,
              reason: matchedReturn.reason,
              created_at: matchedReturn.created_at,
              statusLogs: matchedLogs.map(l => ({
                id: l.id,
                new_status: l.new_status,
                remarks: l.remarks,
                created_at: l.created_at
              }))
            }
          };
        }
        return item;
      });

      return {
        ...order,
        items: itemsWithReturns,
        order_status: computedStatus
      };
    });

    res.status(200).json({ success: true, orders: parsedOrders });
  } catch (error) {
    next(error);
  }
};

// --- REFUND REQUESTS (USER) ---
export const raiseRefundRequest = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { order_id, order_item_id, amount, reason, request_type } = req.body;

    if (!order_id || !amount) {
      return res.status(400).json({ success: false, message: 'Order ID and Amount are required.' });
    }

    // Check if a refund/replacement request already exists for this order item
    const [existing] = await pool.query('SELECT id FROM refund_requests WHERE order_id = ? AND user_id = ? AND order_item_id = ?', [order_id, userId, order_item_id || null]);
    if (existing.length > 0) {
      return res.status(409).json({ success: false, message: 'A request for this item already exists.' });
    }

    if (order_item_id) {
      // Validate policy and window
      const [itemInfo] = await pool.query(
        `SELECT oi.delivered_at, o.delivery_received_at, IFNULL(v.return_policy, p.return_policy) as policy, IFNULL(v.return_window_days, 7) as window_days
         FROM order_items oi
         JOIN orders o ON oi.order_id = o.id
         JOIN products p ON oi.product_id = p.id
         LEFT JOIN variants v ON oi.variant_id = v.id
         WHERE oi.id = ?`,
        [order_item_id]
      );

      if (itemInfo.length > 0) {
        const info = itemInfo[0];
        const actualDeliveryDate = info.delivered_at || info.delivery_received_at;
        if (!actualDeliveryDate) {
          return res.status(400).json({ success: false, message: 'Order has not been marked as delivered yet.' });
        }
        
        const deliveredDate = new Date(actualDeliveryDate);
        const currentDate = new Date();
        const diffDays = Math.ceil(Math.abs(currentDate - deliveredDate) / (1000 * 60 * 60 * 24));
        
        if (diffDays > info.window_days) {
          return res.status(400).json({ success: false, message: `Return window of ${info.window_days} days has expired.` });
        }

        const policy = info.policy || 'NO_RETURN';
        if (policy === 'NO_RETURN') {
          return res.status(400).json({ success: false, message: 'This item is not eligible for return or replacement.' });
        }
        if (request_type === 'REFUND' && policy === 'REPLACEMENT_ONLY') {
          return res.status(400).json({ success: false, message: 'This item is only eligible for replacement.' });
        }
        if (request_type === 'REPLACEMENT' && policy === 'REFUND_ONLY') {
          return res.status(400).json({ success: false, message: 'This item is only eligible for refund.' });
        }
      }
    }

    const [result] = await pool.query(
      'INSERT INTO refund_requests (user_id, order_id, order_item_id, amount, reason, request_type) VALUES (?, ?, ?, ?, ?, ?)',
      [userId, order_id, order_item_id || null, amount, reason || null, request_type || 'REFUND']
    );

    res.status(201).json({ success: true, message: 'Refund request raised successfully.', id: result.insertId });
  } catch (error) {
    next(error);
  }
};

export const getMyRefundRequests = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const [refunds] = await pool.query('SELECT * FROM refund_requests WHERE user_id = ? ORDER BY created_at DESC', [userId]);
    res.status(200).json({ success: true, refunds });
  } catch (error) {
    next(error);
  }
};

export const handleReturnStatusCallback = async (req, res, next) => {
  const connection = await pool.getConnection();
  try {
    const { orderId } = req.params;
    const { return_request_id, order_id, order_item_id, status, updated_at, reference_id, reference, enterprise_return_request_id } = req.body;

    console.log(`[Return Status Callback] Callback payload received:`, JSON.stringify(req.body, null, 2));

    const targetOrderId = orderId || order_id;
    const targetOrderItemId = order_item_id;
    const deliveryReturnReqId = return_request_id;
    const reqReferenceId = reference_id || reference;
    const entReturnReqId = enterprise_return_request_id;

    let returnReq = null;
    let searchLogs = [];

    // Search Priority 1: enterprise_return_request_id
    if (entReturnReqId) {
      searchLogs.push(`Priority 1: enterprise_return_request_id = ${entReturnReqId}`);
      const [recs] = await connection.query('SELECT * FROM return_requests WHERE id = ?', [entReturnReqId]);
      if (recs.length > 0) returnReq = recs[0];
    }

    // Try parsing return_request_id as internal ID if it's a numeric ID
    if (!returnReq && deliveryReturnReqId && !isNaN(Number(deliveryReturnReqId))) {
      searchLogs.push(`Priority 1 Fallback: return_request_id as numeric ID = ${deliveryReturnReqId}`);
      const [recs] = await connection.query('SELECT * FROM return_requests WHERE id = ?', [Number(deliveryReturnReqId)]);
      if (recs.length > 0) returnReq = recs[0];
    }

    // Search Priority 2: reference_id
    if (!returnReq && reqReferenceId) {
      searchLogs.push(`Priority 2: reference_id = ${reqReferenceId}`);
      let parsedId = null;
      if (typeof reqReferenceId === 'string' && reqReferenceId.startsWith('RET-REQ-')) {
        parsedId = Number(reqReferenceId.replace('RET-REQ-', ''));
      }
      if (parsedId && !isNaN(parsedId)) {
        const [recs] = await connection.query('SELECT * FROM return_requests WHERE id = ?', [parsedId]);
        if (recs.length > 0) returnReq = recs[0];
      }
    }

    // Search Priority 2 Fallback: delivery_request_id matching the Delivery App's return_request_id
    if (!returnReq && deliveryReturnReqId) {
      searchLogs.push(`Priority 2 Fallback: delivery_request_id = ${deliveryReturnReqId}`);
      const [recs] = await connection.query('SELECT * FROM return_requests WHERE delivery_request_id = ?', [deliveryReturnReqId]);
      if (recs.length > 0) returnReq = recs[0];
    }

    // Search Priority 3: order_id + order_item_id
    if (!returnReq && targetOrderId && targetOrderItemId) {
      searchLogs.push(`Priority 3: order_id = ${targetOrderId} and order_item_id = ${targetOrderItemId}`);
      const [recs] = await connection.query(
        `SELECT * FROM return_requests WHERE order_id = ? AND order_item_id = ? LIMIT 1`,
        [targetOrderId, targetOrderItemId]
      );
      if (recs.length > 0) returnReq = recs[0];
    }

    if (!returnReq) {
      const errorMsg = `Return request not found. Searched identifiers: [${searchLogs.join(' | ')}]`;
      console.log(`[Return Status Callback Result] Failure: ${errorMsg}`);
      return res.status(404).json({
        success: false,
        message: errorMsg,
        searched_identifiers: searchLogs
      });
    }

    const targetReturnReqId = returnReq.id;

    let mappedReturnStatus = status;
    if (status === 'RETURN_ACCEPTED') {
      mappedReturnStatus = 'PICKUP_SCHEDULED';
    } else if (status === 'RETURN_PICKED_UP') {
      mappedReturnStatus = 'RETURN_PICKED_UP';
    } else if (status === 'RETURN_COMPLETED') {
      mappedReturnStatus = 'RETURN_RECEIVED';
    }

    await connection.beginTransaction();

    // 1. Update return_requests table status
    await connection.query(
      'UPDATE return_requests SET status = ?, updated_at = NOW() WHERE id = ?',
      [mappedReturnStatus, targetReturnReqId]
    );

    // 2. Update order_items return status
    if (returnReq.order_item_id) {
      await connection.query(
        'UPDATE order_items SET item_status = ? WHERE id = ?',
        [mappedReturnStatus, returnReq.order_item_id]
      );
    }

    // 3. Update vendor timeline (return_status_logs)
    let remarks = `Delivery status update: ${status}`;
    if (status === 'RETURN_COMPLETED') {
      remarks = 'Return package delivered to vendor';
    }
    await connection.query(
      `INSERT INTO return_status_logs (return_id, return_request_id, previous_status, new_status, remarks) 
       VALUES (NULL, ?, ?, ?, ?)`,
      [targetReturnReqId, returnReq.status, mappedReturnStatus, remarks]
    );

    // 4. Update customer timeline (orders.tracking_timeline)
    if (returnReq.order_id) {
      const [oRows] = await connection.query('SELECT tracking_timeline FROM orders WHERE id = ?', [returnReq.order_id]);
      let timeline = [];
      if (oRows.length > 0 && oRows[0].tracking_timeline) {
        try {
          timeline = typeof oRows[0].tracking_timeline === 'string'
            ? JSON.parse(oRows[0].tracking_timeline)
            : oRows[0].tracking_timeline;
        } catch (e) {
          timeline = [];
        }
      }

      let displayStatus = status;
      if (status === 'RETURN_ACCEPTED') displayStatus = 'Return Approved & Pickup Scheduled';
      else if (status === 'RETURN_PICKED_UP') displayStatus = 'Return Package Picked Up';
      else if (status === 'RETURN_COMPLETED') displayStatus = 'Return Successful';

      timeline.push({
        item_id: returnReq.order_item_id,
        event: displayStatus,
        timestamp: updated_at || new Date().toISOString(),
        notes: `Delivery integration update callback`
      });

      await connection.query('UPDATE orders SET tracking_timeline = ? WHERE id = ?', [JSON.stringify(timeline), returnReq.order_id]);
    }

    await connection.commit();

    console.log(`[Return Status Callback Result] Success: Status updated successfully for Return ID: ${targetReturnReqId}. New Status: ${mappedReturnStatus}`);

    res.status(200).json({ 
      success: true, 
      message: 'Return status callback processed successfully.',
      data: {
        return_request_id: targetReturnReqId,
        order_id: targetOrderId,
        status: mappedReturnStatus,
        updated_at: new Date().toISOString()
      }
    });
  } catch (error) {
    await connection.rollback();
    console.error(`[Return Status Callback Result] Error processing status update:`, error);
    next(error);
  } finally {
    connection.release();
  }
};
