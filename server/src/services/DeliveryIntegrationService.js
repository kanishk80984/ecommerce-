import axios from 'axios';
import pool from '../config/db.js';

class DeliveryIntegrationService {
  async getSettings() {
    const [rows] = await pool.query('SELECT * FROM delivery_settings LIMIT 1');
    return rows[0] || null;
  }

  async logRequest(orderId, orderItemId, endpoint, method, reqPayload, resPayload, statusCode, status, errorMsg, attempt = 1) {
    try {
      await pool.query(
        `INSERT INTO delivery_logs 
          (order_id, order_item_id, endpoint, method, request_payload, response_payload, status_code, status, error_message, attempt_number) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          orderId || null,
          orderItemId || null,
          endpoint,
          method,
          reqPayload ? JSON.stringify(reqPayload) : null,
          resPayload ? JSON.stringify(resPayload) : null,
          statusCode || null,
          status,
          errorMsg || null,
          attempt
        ]
      );
    } catch (error) {
      console.error('Failed to insert delivery log:', error);
    }
  }

  getAxiosConfig(settings) {
    const headers = {
      'Content-Type': 'application/json'
    };

    if (settings.auth_method === 'BEARER_TOKEN') {
      headers['Authorization'] = `Bearer ${settings.api_credentials}`;
    } else {
      headers['x-api-key'] = settings.api_credentials;
    }

    return {
      baseURL: settings.base_url,
      timeout: settings.request_timeout || 5001,
      headers
    };
  }

  async updateSyncStatus(status) {
    await pool.query('UPDATE delivery_settings SET last_connection_time = NOW(), last_sync_status = ?', [status]);
  }

  async testConnection() {
    const settings = await this.getSettings();
    if (!settings || !settings.base_url) throw new Error('Delivery API is not configured.');

    const api = axios.create(this.getAxiosConfig(settings));
    const testEndpoint = '/'; // Do not use /health to avoid recursive loops

    console.log(`[DispatchFlow Test] Initiating connection test to: ${settings.base_url}${testEndpoint}`);

    try {
      const response = await api.get(testEndpoint);

      console.log(`[DispatchFlow Test] Request URL: ${settings.base_url}${testEndpoint}`);
      console.log(`[DispatchFlow Test] Response Status: ${response.status}`);
      console.log(`[DispatchFlow Test] Response Body:`, response.data);

      await this.updateSyncStatus('SUCCESS');
      await pool.query('UPDATE delivery_settings SET connection_status = ?', ['CONNECTED']);

      await this.logRequest(null, null, testEndpoint, 'GET', null, response.data, response.status, 'SUCCESS', null);

      return { success: true, message: 'Connection successful', data: response.data };
    } catch (error) {
      const errorMsg = error.response ? JSON.stringify(error.response.data) : error.message;
      const status = error.response?.status || 500;

      console.error(`[DispatchFlow Test] Request URL: ${settings.base_url}${testEndpoint}`);
      console.error(`[DispatchFlow Test] Response Status: ${status}`);
      console.error(`[DispatchFlow Test] Error Message: ${error.message}`);
      if (error.response) {
        console.error(`[DispatchFlow Test] Response Body:`, error.response.data);
      }

      await this.updateSyncStatus('FAILED');
      await pool.query('UPDATE delivery_settings SET connection_status = ?', ['ERROR']);

      await this.logRequest(null, null, testEndpoint, 'GET', null, error.response?.data, status, 'FAILED', errorMsg);

      throw new Error(`Connection failed: ${error.message}`);
    }
  }

  async createDeliveryRequest(orderId, itemId, is_reverse = false) {
    console.log(`[DeliveryRequest] Starting request for orderId: ${orderId}, itemId: ${itemId}, is_reverse: ${is_reverse}`);

    if (!orderId || !itemId) {
      throw new Error(`Invalid inputs: orderId (${orderId}) and itemId (${itemId}) are required.`);
    }

    let settings;
    try {
      console.log(`[DeliveryRequest] Fetching delivery settings...`);
      settings = await this.getSettings();
    } catch (err) {
      console.error(`[DeliveryRequest] Error fetching settings:`, err);
      throw new Error(`Database error fetching settings: ${err.message}`);
    }

    if (!settings || !settings.is_active) {
      throw new Error('Delivery Integration is not active.');
    }

    // Fetch order details
    let itemRows;
    try {
      console.log(`[DeliveryRequest] Fetching order details for itemId: ${itemId}...`);
      const [rows] = await pool.query(
        `SELECT oi.*, o.shipping_address_id, a.street, a.city, a.state, a.zip, a.phone, a.name as address_name, 
                u.name as customer_name, u.email as customer_email, p.name as product_name, v.business_address, vu.phone as vendor_phone
         FROM order_items oi
         JOIN orders o ON oi.order_id = o.id
         JOIN addresses a ON o.shipping_address_id = a.id
         JOIN users u ON o.user_id = u.id
         JOIN products p ON oi.product_id = p.id
         JOIN users vu ON oi.vendor_id = vu.id
         LEFT JOIN vendor_profiles v ON oi.vendor_id = v.user_id
         WHERE oi.id = ?`,
        [itemId]
      );
      itemRows = rows;
    } catch (err) {
      console.error(`[DeliveryRequest] SQL Error fetching order details:`, err);
      throw new Error(`Database error fetching order details: ${err.message}`);
    }

    console.log(`[DeliveryRequest] SQL query result rows count: ${itemRows.length}`);

    if (itemRows.length === 0) throw new Error('Order item not found.');
    const item = itemRows[0];

    // Verification
    if (!item.shipping_address_id) throw new Error('Shipping address does not exist for this order.');
    if (!item.vendor_id) throw new Error('Vendor does not exist for this order item.');

    const currentAttempt = (item.retry_count || 0) + 1;

    let pickup_address, pickup_phone, drop_address, drop_name, drop_phone;
    if (is_reverse) {
      pickup_address = `${item.street}, ${item.city}, ${item.state} ${item.zip}`;
      pickup_phone = item.phone;
      drop_address = item.business_address || 'Vendor Address';
      drop_name = item.product_name;
      drop_phone = item.vendor_phone || 'Vendor Phone';
    } else {
      pickup_address = item.business_address || 'Vendor Address';
      pickup_phone = item.vendor_phone || 'Vendor Phone';
      drop_address = `${item.street}, ${item.city}, ${item.state} ${item.zip}`;
      drop_name = item.address_name || item.customer_name;
      drop_phone = item.phone;
    }

    const payload = {
      reference_id: `REQ-${orderId}-${itemId}${is_reverse ? '-REV' : ''}`,
      is_reverse,
      pickup_address,
      pickup_phone,
      drop_address,
      drop_name,
      drop_phone,
      item_name: item.product_name,
      quantity: item.quantity,
      value: item.price
    };

    console.log(`[DeliveryRequest] Payload ready to be sent:`, JSON.stringify(payload, null, 2));

    const api = axios.create(this.getAxiosConfig(settings));
    let response;

    try {
      console.log(`[DeliveryRequest] Sending POST request to DispatchFlow (/delivery/request)...`);
      // Use mock response for now since we don't have a real delivery API
      // response = await api.post('/delivery/request', payload);
      response = {
        data: {
          delivery_request_id: `MOCK-DEL-${Date.now()}`,
          provider: 'Mock Provider'
        },
        status: 200
      };
      console.log(`[DeliveryRequest] Response received from DispatchFlow:`, JSON.stringify(response.data, null, 2));
    } catch (err) {
      console.error(`[DeliveryRequest] Axios Error calling DispatchFlow:`, err.message);
      if (err.response) {
        console.error(`[DeliveryRequest] DispatchFlow Response Data:`, err.response.data);
      }

      const errorMsg = err.response ? JSON.stringify(err.response.data) : err.message;

      try {
        await pool.query(
          `UPDATE order_items 
           SET api_sync_status = 'FAILED', 
               retry_count = ?,
               last_sync_time = NOW()
           WHERE id = ?`,
          [currentAttempt, itemId]
        );
        await this.logRequest(orderId, itemId, '/delivery/request', 'POST', payload, err.response?.data, err.response?.status, 'FAILED', errorMsg, currentAttempt);
        await this.updateSyncStatus('FAILED');
      } catch (dbErr) {
        console.error(`[DeliveryRequest] Database error while logging failure:`, dbErr);
      }

      throw new Error(`Failed to create delivery request: ${err.message}`);
    }

    try {
      console.log(`[DeliveryRequest] Updating order_items and logs on success...`);
      const reqId = response.data.delivery_request_id;
      const provider = response.data.provider;

      await pool.query(
        `UPDATE order_items 
         SET item_status = 'WAITING_FOR_PICKUP', 
             delivery_request_id = ?, 
             delivery_provider = ?, 
             api_sync_status = 'SYNCED',
             last_sync_time = NOW(),
             retry_count = ?
         WHERE id = ?`,
        [reqId, provider, currentAttempt, itemId]
      );

      await this.logRequest(orderId, itemId, '/delivery/request', 'POST', payload, response.data, response.status, 'SUCCESS', null, currentAttempt);
      await this.updateSyncStatus('SUCCESS');

      console.log(`[DeliveryRequest] Successfully processed delivery request.`);
      return { success: true, message: 'Delivery request created.', delivery_request_id: reqId };
    } catch (err) {
      console.error(`[DeliveryRequest] Database error while finalizing success:`, err);
      throw new Error(`Database error finalizing delivery request: ${err.message}`);
    }
  }

  async getDeliveryStatus(orderId, itemId) {
    const settings = await this.getSettings();
    if (!settings || !settings.is_active) throw new Error('Delivery API is inactive.');

    const [rows] = await pool.query('SELECT delivery_request_id FROM order_items WHERE id = ?', [itemId]);
    const reqId = rows[0]?.delivery_request_id;
    if (!reqId) throw new Error('No delivery request ID found for this item.');

    const api = axios.create(this.getAxiosConfig(settings));

    try {
      // Mock response
      // const response = await api.get(`/delivery/status/${reqId}`);
      const response = {
        data: {
          status: 'PICKED_UP',
          tracking_number: `TRK-${Date.now()}`,
          agent_name: 'John Doe',
          agent_phone: '1234567890'
        },
        status: 200
      };

      const extStatus = response.data?.status;
      let internalStatus = null;
      if (extStatus === 'PICKED_UP') internalStatus = 'PACKAGE_COLLECTED';
      else if (extStatus === 'IN_TRANSIT') internalStatus = 'IN_TRANSIT';
      else if (extStatus === 'OUT_FOR_DELIVERY') internalStatus = 'OUT_FOR_DELIVERY';
      else if (extStatus === 'DELIVERED') internalStatus = 'DELIVERED';
      else if (extStatus === 'FAILED') internalStatus = 'RETURNED_FAILED_DELIVERY';

      if (internalStatus) {
        await pool.query(
          `UPDATE order_items SET item_status = ?, last_delivery_update = NOW(), api_sync_status = 'SYNCED', tracking_number = ?, delivery_agent_name = ?, delivery_agent_phone = ? WHERE id = ?`,
          [internalStatus, response.data?.tracking_number, response.data?.agent_name, response.data?.agent_phone, itemId]
        );
      }

      await this.logRequest(orderId, itemId, `/delivery/status/${reqId}`, 'GET', null, response.data, response.status, 'SUCCESS', null);

      return response.data;
    } catch (error) {
      const errorMsg = error.message;
      await this.logRequest(orderId, itemId, `/delivery/status/${reqId}`, 'GET', null, error.response?.data, error.response?.status, 'FAILED', errorMsg);
      throw error;
    }
  }

  async initiateReversePickup(returnId) {
    console.log(`[Reverse Pickup Log] Vendor approved return ID: ${returnId}`);

    if (!returnId) {
      throw new Error("returnId is required");
    }

    let settings;
    try {
      settings = await this.getSettings();
    } catch (err) {
      console.error(`[Reverse Pickup Log] Errors fetching settings:`, err);
      throw new Error(`Database error fetching settings: ${err.message}`);
    }

    if (!settings || !settings.is_active) {
      throw new Error('Delivery Integration is not active.');
    }

    // Fetch return request and associated details
    const [rows] = await pool.query(
      `SELECT 
        r.id as return_request_id,
        r.order_id,
        r.order_item_id,
        cu.name as customer_name,
        ca.phone as customer_phone,
        CONCAT_WS(', ', ca.street, ca.city, ca.state, ca.zip) as pickup_address,
        vp.business_name as vendor_name,
        vu.phone as vendor_phone,
        vp.business_address as vendor_address,
        p.name as product_name,
        r.quantity,
        r.return_type,
        r.reason as return_reason
       FROM return_requests r
       JOIN orders o ON r.order_id = o.id
       JOIN users cu ON o.user_id = cu.id
       JOIN addresses ca ON o.shipping_address_id = ca.id
       JOIN users vu ON r.vendor_id = vu.id
       LEFT JOIN vendor_profiles vp ON r.vendor_id = vp.user_id
       JOIN order_items oi ON r.order_item_id = oi.id
       JOIN products p ON oi.product_id = p.id
       WHERE r.id = ?
       LIMIT 1`,
      [returnId]
    );

    if (rows.length === 0) {
      throw new Error(`Return request with ID ${returnId} not found.`);
    }

    const row = rows[0];

    const payload = {
      return_request_id: row.return_request_id,
      order_id: row.order_id,
      order_item_id: row.order_item_id,
      reference_id: `RET-REQ-${row.return_request_id}`,
      customer_name: row.customer_name,
      customer_phone: row.customer_phone,
      pickup_address: row.pickup_address,
      vendor_name: row.vendor_name || 'Vendor',
      vendor_phone: row.vendor_phone || '',
      vendor_address: row.vendor_address || 'Vendor Address',
      product_name: row.product_name,
      quantity: row.quantity,
      return_type: row.return_type,
      return_reason: row.return_reason
    };

    console.log(`[Reverse Pickup Log] Return payload built:`, JSON.stringify(payload, null, 2));

    const targetEndpoint = '/return-requests/incoming';
    console.log(`[Reverse Pickup Log] Target endpoint: ${settings.base_url}${targetEndpoint}`);
    console.log(`[Reverse Pickup Log] Payload:`, JSON.stringify(payload, null, 2));

    const api = axios.create(this.getAxiosConfig(settings));
    let response;

    try {
      response = await api.post(targetEndpoint, payload);
      console.log(`[Reverse Pickup Log] Response:`, JSON.stringify(response.data, null, 2));
    } catch (err) {
      const errorMsg = err.response ? JSON.stringify(err.response.data) : err.message;
      console.error(`[Reverse Pickup Log] Errors:`, err.message, err.response?.data);

      try {
        await this.logRequest(
          row.order_id,
          row.order_item_id,
          targetEndpoint,
          'POST',
          payload,
          err.response?.data,
          err.response?.status || 500,
          'FAILED',
          errorMsg
        );
      } catch (logErr) {
        console.error(`[Reverse Pickup Log] Errors saving fail log:`, logErr);
      }

      throw err;
    }

    try {
      const deliveryReqId = response.data?.return_request_id || response.data?.id || response.data?.data?.return_request_id || response.data?.data?.id || `DEL-RET-${Date.now()}`;

      // Update return status to SENT_TO_DELIVERY and store the delivery request id
      await pool.query(
        `UPDATE return_requests 
         SET status = 'SENT_TO_DELIVERY', 
             delivery_request_id = ? 
         WHERE id = ?`,
        [deliveryReqId, returnId]
      );

      // Insert log in status logs
      await pool.query(
        `INSERT INTO return_status_logs (return_id, return_request_id, previous_status, new_status, remarks) 
         VALUES (?, ?, 'APPROVED', 'SENT_TO_DELIVERY', 'Sent to delivery system successfully')`,
        [returnId, returnId]
      );

      await this.logRequest(
        row.order_id,
        row.order_item_id,
        targetEndpoint,
        'POST',
        payload,
        response.data,
        response.status,
        'SUCCESS',
        null
      );

      return { success: true, delivery_request_id: deliveryReqId };
    } catch (dbErr) {
      console.error(`[Reverse Pickup Log] Errors saving database success status:`, dbErr);
      throw dbErr;
    }
  }

  async retryFailedRequest(orderId, itemId) {
    // Just calls createDeliveryRequest again
    return this.createDeliveryRequest(orderId, itemId);
  }
}

export default new DeliveryIntegrationService();
