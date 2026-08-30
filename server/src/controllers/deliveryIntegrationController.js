import pool from '../config/db.js';
import DeliveryIntegrationService from '../services/DeliveryIntegrationService.js';

export const getSettings = async (req, res, next) => {
  try {
    const [rows] = await pool.query('SELECT * FROM delivery_settings LIMIT 1');
    res.status(200).json({ success: true, settings: rows[0] || null });
  } catch (error) {
    next(error);
  }
};

export const updateSettings = async (req, res, next) => {
  try {
    const { base_url, auth_method, api_credentials, request_timeout, retry_attempts, retry_delay, is_active } = req.body;

    await pool.query(
      `UPDATE delivery_settings SET base_url = ?, auth_method = ?, api_credentials = ?, request_timeout = ?, retry_attempts = ?, retry_delay = ?, is_active = ?`,
      [base_url, auth_method, api_credentials, request_timeout || 5001, retry_attempts || 3, retry_delay || 2000, is_active]
    );

    res.status(200).json({ success: true, message: 'Settings updated successfully' });
  } catch (error) {
    next(error);
  }
};

export const testConnection = async (req, res, next) => {
  try {
    const result = await DeliveryIntegrationService.testConnection();
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getLogs = async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const [rows] = await pool.query('SELECT * FROM delivery_logs ORDER BY created_at DESC LIMIT ? OFFSET ?', [Number(limit), Number(offset)]);
    const [countRows] = await pool.query('SELECT COUNT(*) as total FROM delivery_logs');

    res.status(200).json({ success: true, logs: rows, total: countRows[0].total });
  } catch (error) {
    next(error);
  }
};

export const healthCheck = async (req, res, next) => {
  res.status(200).json({
    success: true,
    message: "Server is running healthily!"
  });
};

export const getDeliveryInfo = async (req, res, next) => {
  try {
    const { orderId } = req.params;
    const { itemId } = req.query; // If specific item

    let query = 'SELECT * FROM order_items WHERE order_id = ?';
    let params = [orderId];
    if (itemId) {
      query += ' AND id = ?';
      params.push(itemId);
    }

    const [items] = await pool.query(query, params);
    res.status(200).json({ success: true, data: items });
  } catch (error) {
    next(error);
  }
};

export const createDeliveryRequest = async (req, res, next) => {
  try {
    const { orderId, itemId, deliveryProvider, trackingNumber } = req.body;

    // Validate eligible
    const [rows] = await pool.query('SELECT item_status FROM order_items WHERE id = ?', [itemId]);
    if (!rows[0]) return res.status(404).json({ success: false, message: 'Item not found' });

    // Update tracking details and status to SHIPPED
    await pool.query(
      "UPDATE order_items SET item_status = 'SHIPPED', delivery_provider = ?, tracking_number = ? WHERE id = ?",
      [deliveryProvider || null, trackingNumber || null, itemId]
    );

    res.status(200).json({ success: true, message: 'Order marked as shipped and tracking details updated.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateDeliveryStatus = async (req, res, next) => {
  try {
    const { orderId, itemId } = req.body;
    const result = await DeliveryIntegrationService.getDeliveryStatus(orderId, itemId);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const retryDeliveryRequest = async (req, res, next) => {
  try {
    const { orderId, itemId } = req.body;
    const result = await DeliveryIntegrationService.retryFailedRequest(orderId, itemId);
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
