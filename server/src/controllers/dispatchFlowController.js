import dispatchFlowService from '../services/dispatchFlowService.js';

export const healthCheck = async (req, res, next) => {
  // 8. GET /health should return: { "success": true, "message": "Server is running healthily!" }
  res.status(200).json({
    success: true,
    message: "Server is running healthily!"
  });
};

export const getOrders = async (req, res, next) => {
  try {
    const orders = await dispatchFlowService.getOrders();
    
    // Log the API Request
    await dispatchFlowService.logApiRequest(
      null, 
      '/api/delivery/orders', 
      'GET', 
      req.query, 
      { count: orders.length }, 
      200, 
      'SUCCESS'
    );

    res.status(200).json({ success: true, data: orders });
  } catch (error) {
    console.error('getOrders Error:', error);
    await dispatchFlowService.logApiRequest(null, '/api/delivery/orders', 'GET', req.query, null, 500, 'FAILED', error.message);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const getOrderById = async (req, res, next) => {
  try {
    const { orderId } = req.params;
    const order = await dispatchFlowService.getOrderById(orderId);

    if (!order) {
      await dispatchFlowService.logApiRequest(orderId, `/api/delivery/orders/${orderId}`, 'GET', null, null, 404, 'FAILED', 'Order not found');
      return res.status(404).json({ success: false, message: 'Order not found or not ready for dispatch' });
    }

    await dispatchFlowService.logApiRequest(orderId, `/api/delivery/orders/${orderId}`, 'GET', null, order, 200, 'SUCCESS');
    res.status(200).json({ success: true, data: order });
  } catch (error) {
    console.error('getOrderById Error:', error);
    await dispatchFlowService.logApiRequest(req.params.orderId, `/api/delivery/orders/${req.params.orderId}`, 'GET', null, null, 500, 'FAILED', error.message);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const updateOrderStatus = async (req, res, next) => {
  try {
    const { orderId } = req.params;
    const { status } = req.body;

    // Map DispatchFlow status to our DB ENUM status if needed
    let dbStatus = status;
    if (status === 'FAILED_DELIVERY' || status === 'RETURN_TO_SELLER') {
      dbStatus = 'RETURNED_FAILED_DELIVERY'; // or CANCELLED, based on schema, RETURNED_FAILED_DELIVERY is valid
    }

    const updated = await dispatchFlowService.updateOrderStatus(orderId, dbStatus);

    if (!updated) {
      await dispatchFlowService.logApiRequest(orderId, `/api/delivery/orders/${orderId}/status`, 'POST', req.body, null, 404, 'FAILED', 'Order not found');
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    await dispatchFlowService.logApiRequest(orderId, `/api/delivery/orders/${orderId}/status`, 'POST', req.body, { success: true }, 200, 'SUCCESS');
    res.status(200).json({ success: true, message: 'Order status updated successfully', data: updated });
  } catch (error) {
    console.error('updateOrderStatus Error:', error);
    await dispatchFlowService.logApiRequest(req.params.orderId, `/api/delivery/orders/${req.params.orderId}/status`, 'POST', req.body, null, 500, 'FAILED', error.message);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const addTracking = async (req, res, next) => {
  try {
    const { orderId } = req.params;
    
    const added = await dispatchFlowService.addTracking(orderId, req.body);

    if (!added) {
      await dispatchFlowService.logApiRequest(orderId, `/api/delivery/orders/${orderId}/tracking`, 'POST', req.body, null, 404, 'FAILED', 'Order not found');
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    await dispatchFlowService.logApiRequest(orderId, `/api/delivery/orders/${orderId}/tracking`, 'POST', req.body, { success: true }, 200, 'SUCCESS');
    res.status(200).json({ success: true, message: 'Tracking event added successfully' });
  } catch (error) {
    console.error('addTracking Error:', error);
    await dispatchFlowService.logApiRequest(req.params.orderId, `/api/delivery/orders/${req.params.orderId}/tracking`, 'POST', req.body, null, 500, 'FAILED', error.message);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};
