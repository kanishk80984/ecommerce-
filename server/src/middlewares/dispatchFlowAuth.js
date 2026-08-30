import pool from '../config/db.js';

export const dispatchFlowAuth = async (req, res, next) => {
  try {
    const apiKey = req.headers['x-api-key'] || req.headers['authorization'];
    console.log(`[DispatchFlow Auth] Authenticating request...`);

    let token = apiKey;
    if (token && token.startsWith('Bearer ')) {
      token = token.substring(7);
    }

    if (!token) {
      console.log(`[DispatchFlow Auth Result] Authentication Failed: Missing API key or authorization header`);
      return res.status(401).json({
        success: false,
        message: 'Missing x-api-key or authorization header',
      });
    }

    const [rows] = await pool.query('SELECT auth_method, api_credentials, is_active FROM delivery_settings LIMIT 1');
    const settings = rows[0];

    if (!settings) {
      console.log(`[DispatchFlow Auth Result] Authentication Failed: Delivery settings not found in database`);
      return res.status(500).json({
        success: false,
        message: 'Delivery integration settings not found',
      });
    }

    if (!settings.is_active) {
      console.log(`[DispatchFlow Auth Result] Authentication Failed: Delivery Integration is disabled`);
      return res.status(403).json({
        success: false,
        message: 'Delivery integration is currently disabled',
      });
    }

    if (settings.api_credentials !== token) {
      console.log(`[DispatchFlow Auth Result] Authentication Failed: Invalid credentials. Expected: ${settings.api_credentials}, Received: ${token}`);
      return res.status(401).json({
        success: false,
        message: 'Invalid API Key',
      });
    }

    console.log(`[DispatchFlow Auth Result] Authentication Successful`);
    next();
  } catch (error) {
    console.error('[DispatchFlow Auth Result] Error during authentication:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error during authentication',
    });
  }
};
