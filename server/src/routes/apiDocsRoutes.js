import express from 'express';

const router = express.Router();

function getRouteCategory(path) {
  if (path.includes('/api/auth')) return 'Authentication';
  if (path.includes('/api/customer') || path.includes('/api/cart') || path.includes('/api/orders') || path.includes('/api/addresses')) return 'Customer APIs';
  if (path.includes('/api/vendor')) return 'Vendor APIs';
  if (path.includes('/api/admin') || path.includes('/api/superadmin')) return 'Admin APIs';
  if (path.includes('/api/delivery')) return 'Delivery APIs';
  if (path.includes('/api/returns')) return 'Return APIs';
  if (path.includes('/webhook')) return 'Webhook APIs';
  return 'Integration APIs';
}

router.get('/', (req, res) => {
  const app = req.app;
  const routes = [];

  function print(path, layer) {
    if (layer.route) {
      layer.route.stack.forEach(print.bind(null, path.concat(split(layer.route.path))));
    } else if (layer.name === 'router' && layer.handle.stack) {
      layer.handle.stack.forEach(print.bind(null, path.concat(split(layer.regexp))));
    } else if (layer.method) {
      const fullPath = (path.join('/')).replace(/\/+/g, '/').replace(/^\//, '');
      const method = layer.method.toUpperCase();
      const actualPath = `/${fullPath}`.replace(/\\\/\?\(\?\=\\\/\|\$\)/g, '').replace(/\\\//g, '/').replace(/\/\?\(\?\=\/\|\$\)/g, '').replace(/\^/g, '').replace(/\$/g, '');
      
      const cleanPath = actualPath.replace(/\/\(\?\:([^)]+)\)\?/g, '/:$1').replace(/\/\(\?\:\/\)\?/g, '');
      
      if (cleanPath.startsWith('/api')) {
        routes.push({
          method,
          path: cleanPath,
          category: getRouteCategory(cleanPath),
          authentication: cleanPath.includes('/auth/login') || cleanPath.includes('/public') ? 'None' : 'Bearer Token',
          headers: [{ key: 'Authorization', type: 'string', required: !(cleanPath.includes('/auth/login') || cleanPath.includes('/public')) }],
          queryParams: cleanPath.match(/:[a-zA-Z0-9_]+/g) || [],
          requestBody: ['POST', 'PUT', 'PATCH'].includes(method) ? { example: { "key": "value" } } : null,
          successResponse: { success: true, data: {} },
          errorResponse: { success: false, message: "Error message" }
        });
      }
    }
  }

  function split(thing) {
    if (typeof thing === 'string') return thing.split('/');
    if (thing.fast_slash) return '';
    const match = thing.toString()
      .replace('\\/?', '')
      .replace('(?=\\/|$)', '$')
      .match(/^\/\^((?:\\[.*+?^${}()|[\]\\\/]|[^.*+?^${}()|[\]\\\/])*)\$\//);
    return match
      ? match[1].replace(/\\(.)/g, '$1').split('/')
      : '<complex:' + thing.toString() + '>';
  }

  app._router.stack.forEach(print.bind(null, []));

  // Deduplicate
  const uniqueRoutes = Array.from(new Set(routes.map(r => JSON.stringify(r)))).map(r => JSON.parse(r));

  res.status(200).json({ success: true, routes: uniqueRoutes });
});

export default router;
