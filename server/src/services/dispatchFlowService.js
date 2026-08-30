import pool from '../config/db.js';

class DispatchFlowService {
  async getOrders() {
    const query = `
      SELECT 
        oi.id as order_item_id,
        o.id as order_id,
        cu.name as customer_name,
        ca.phone as customer_phone,
        CONCAT_WS(', ', vp.pickup_address, vp.city, vp.state, vp.pincode) as pickup_address,
        ca.formatted_address as delivery_address,
        p.name as item_name,
        oi.quantity,
        oi.price as item_price,
        p.weight as item_weight,
        o.payment_method,
        o.payment_status,
        vp.business_name as vendor_name,
        vu.phone as vendor_phone,
        oi.item_status
      FROM order_items oi
      JOIN orders o ON oi.order_id = o.id
      JOIN users cu ON o.user_id = cu.id
      JOIN addresses ca ON o.shipping_address_id = ca.id
      JOIN users vu ON oi.vendor_id = vu.id
      LEFT JOIN vendor_profiles vp ON vu.id = vp.user_id
      JOIN products p ON oi.product_id = p.id
      WHERE oi.item_status IN ('ACCEPTED', 'READY_FOR_DISPATCH', 'DISPATCH_REQUEST_SENT', 'WAITING_FOR_PICKUP', 'PACKAGE_COLLECTED', 'IN_TRANSIT', 'OUT_FOR_DELIVERY')
    `;
    const [rows] = await pool.query(query);
    return rows.map((row) => this._formatOrder(row));
  }

  async getOrderById(orderItemId) {
    const query = `
      SELECT 
        oi.id as order_item_id,
        o.id as order_id,
        cu.name as customer_name,
        ca.phone as customer_phone,
        CONCAT_WS(', ', vp.pickup_address, vp.city, vp.state, vp.pincode) as pickup_address,
        ca.formatted_address as delivery_address,
        p.name as item_name,
        oi.quantity,
        oi.price as item_price,
        p.weight as item_weight,
        o.payment_method,
        o.payment_status,
        vp.business_name as vendor_name,
        vu.phone as vendor_phone,
        oi.item_status
      FROM order_items oi
      JOIN orders o ON oi.order_id = o.id
      JOIN users cu ON o.user_id = cu.id
      JOIN addresses ca ON o.shipping_address_id = ca.id
      JOIN users vu ON oi.vendor_id = vu.id
      LEFT JOIN vendor_profiles vp ON vu.id = vp.user_id
      JOIN products p ON oi.product_id = p.id
      WHERE oi.id = ?
    `;
    const [rows] = await pool.query(query, [orderItemId]);
    if (!rows[0]) return null;
    return this._formatOrder(rows[0]);
  }

  async updateOrderStatus(orderItemId, status) {
    const [existing] = await pool.query(
      `SELECT item_status, picked_up_at, delivered_at FROM order_items WHERE id = ?`,
      [orderItemId]
    );
    
    if (!existing[0]) return null;
    const prev = existing[0];
    
    let updateQuery = `UPDATE order_items SET item_status = ?, last_delivery_update = NOW()`;
    const params = [status];
    
    let pickedUpUpdated = false;
    let deliveredUpdated = false;
    
    if (status === 'PACKAGE_COLLECTED') {
      updateQuery += `, picked_up_at = COALESCE(picked_up_at, NOW())`;
      if (!prev.picked_up_at) pickedUpUpdated = true;
    } else if (status === 'DELIVERED') {
      updateQuery += `, delivered_at = COALESCE(delivered_at, NOW())`;
      if (!prev.delivered_at) deliveredUpdated = true;
    }
    
    updateQuery += ` WHERE id = ?`;
    params.push(orderItemId);
    
    await pool.query(updateQuery, params);
    
    console.log(`[Status Update] Order ID: ${orderItemId}`);
    console.log(`[Status Update] Previous Status: ${prev.item_status}`);
    console.log(`[Status Update] New Status: ${status}`);
    if (pickedUpUpdated) console.log(`[Status Update] Pickup Time updated.`);
    if (deliveredUpdated) console.log(`[Status Update] Delivery Time updated.`);
    
    // Check if it's a return status update
    if (['RETURN_ACCEPTED', 'RETURN_PICKED_UP', 'RETURN_COMPLETED'].includes(status)) {
      const [rRows] = await pool.query(
        'SELECT r.id, r.status as r_status FROM returns r JOIN return_items ri ON r.id = ri.return_id WHERE ri.order_item_id = ? ORDER BY r.created_at DESC LIMIT 1',
        [orderItemId]
      );
      if (rRows.length > 0) {
        const returnId = rRows[0].id;
        const prevRStatus = rRows[0].r_status;
        let newRStatus = status; 
        if (status === 'RETURN_ACCEPTED') newRStatus = 'PICKUP_SCHEDULED';
        
        await pool.query('UPDATE returns SET status = ? WHERE id = ?', [newRStatus, returnId]);
        await pool.query(
          'INSERT INTO return_status_logs (return_id, previous_status, new_status, remarks) VALUES (?, ?, ?, ?)',
          [returnId, prevRStatus, newRStatus, 'Delivery Integration Update']
        );
        console.log(`[Status Update] Return ID ${returnId} updated to ${newRStatus}`);
      }
    }
    
    return this.getOrderById(orderItemId);
  }

  async addTracking(orderItemId, eventDetails) {
    // DispatchFlow API wants to save tracking events. We will save it in orders.tracking_timeline
    // But since DispatchFlow handles orderItems individually, we'll need to append to orders timeline or order_items.
    // The existing schema has orders.tracking_timeline JSON. 
    // We'll fetch existing, append, and update.
    const [rows] = await pool.query('SELECT o.id, o.tracking_timeline FROM orders o JOIN order_items oi ON o.id = oi.order_id WHERE oi.id = ?', [orderItemId]);
    if (!rows[0]) return false;

    const orderId = rows[0].id;
    let timeline = rows[0].tracking_timeline || [];
    if (typeof timeline === 'string') {
      try { timeline = JSON.parse(timeline); } catch (e) { timeline = []; }
    }
    
    timeline.push({
      item_id: orderItemId,
      event: eventDetails.status,
      location: eventDetails.location || '',
      timestamp: new Date().toISOString(),
      notes: eventDetails.notes || ''
    });

    await pool.query('UPDATE orders SET tracking_timeline = ? WHERE id = ?', [JSON.stringify(timeline), orderId]);
    return true;
  }

  async logApiRequest(orderItemId, endpoint, method, reqPayload, resPayload, statusCode, status, errorMsg = '') {
    try {
      // Find orderId if orderItemId is provided
      let orderId = null;
      if (orderItemId) {
        const [rows] = await pool.query('SELECT order_id FROM order_items WHERE id = ?', [orderItemId]);
        if (rows[0]) orderId = rows[0].order_id;
      }

      await pool.query(`
        INSERT INTO delivery_logs 
        (order_id, order_item_id, endpoint, method, request_payload, response_payload, status_code, status, error_message)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        orderId, 
        orderItemId || null, 
        endpoint, 
        method, 
        reqPayload ? JSON.stringify(reqPayload) : null,
        resPayload ? JSON.stringify(resPayload) : null,
        statusCode, 
        status, 
        errorMsg
      ]);
    } catch (err) {
      console.error('Failed to log API request:', err.message);
    }
  }

  _formatOrder(row) {
    return {
      "Order ID": row.order_item_id,
      "Order Number": `ORD-${row.order_id}`,
      "Customer Name": row.customer_name,
      "Customer Phone": row.customer_phone || '',
      "Pickup Address": row.pickup_address || 'Vendor Address Pending',
      "Delivery Address": row.delivery_address || '',
      "Items": [
        {
          "name": row.item_name,
          "quantity": row.quantity
        }
      ],
      "Quantity": row.quantity,
      "Weight": row.item_weight || 1.0,
      "COD Amount": row.payment_method === 'COD' && row.payment_status === 'PENDING' ? (row.quantity * row.item_price) : 0,
      "Payment Status": row.payment_status,
      "Vendor Name": row.vendor_name || 'Vendor',
      "Vendor Phone": row.vendor_phone || '',
      "Current Order Status": row.item_status
    };
  }
}

export default new DispatchFlowService();
