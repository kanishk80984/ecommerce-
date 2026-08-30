/**
 * UNIFIED DEV+SSR SERVER
 * 
 * Runs Vite in "middleware mode" so Express can intercept requests
 * BEFORE Vite serves the HTML shell. This is the key to making SSR
 * work in development without breaking HMR.
 * 
 * Request flow:
 *   Request → Express API routes → SSR handler → Vite (for assets/HMR)
 * 
 * Run with: node dev-server.js (from the server/ directory)
 */

// ─── Global Browser API Polyfills for SSR ────────────────────────────────────
// Must be set BEFORE any React/client module is imported, because authSlice.js
// calls localStorage at module scope which crashes in Node.js.
if (typeof globalThis.localStorage === 'undefined') {
  global.localStorage = {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {},
  };

  global.sessionStorage = {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {},
  };

  console.log('[SSR] localStorage/sessionStorage/document/window polyfilled for Node.js environment');
}

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { connectDB } from './src/config/db.js';
import { errorHandler } from './src/middlewares/errorHandler.js';
import authRoutes from './src/routes/authRoutes.js';
import vendorRoutes from './src/routes/vendorRoutes.js';
import adminRoutes from './src/routes/adminRoutes.js';
import superAdminRoutes from './src/routes/superAdminRoutes.js';
import productRoutes from './src/routes/productRoutes.js';
import cartRoutes from './src/routes/cartRoutes.js';
import orderRoutes from './src/routes/orderRoutes.js';
import publicRoutes from './src/routes/publicRoutes.js';
import addressRoutes from './src/routes/addressRoutes.js';
import serviceRoutes from './src/routes/serviceRoutes.js';
import hsnSkuRoutes from './src/routes/hsnSkuRoutes.js';
import imageRoutes from './src/routes/imageRoutes.js';
import locationRoutes from './src/routes/locationRoutes.js';
import supportRoutes from './src/routes/supportRoutes.js';
import bankAccountRoutes from './src/routes/bankAccountRoutes.js';
import dispatchFlowRoutes from './src/routes/dispatchFlowRoutes.js';
import returnRoutes from './src/routes/returnRoutes.js';
import reviewRoutes from './src/routes/reviewRoutes.js';
import deliveryIntegrationRoutes from './src/routes/deliveryIntegrationRoutes.js';
import apiDocsRoutes from './src/routes/apiDocsRoutes.js';
import vendorCommunicationRoutes from './src/routes/vendorCommunicationRoutes.js';
import jobRoutes from './src/routes/jobRoutes.js';
import { fetchSeoData, resolvePublicAssetUrl } from './src/ssr/fetchSeoData.js';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3013;
const CLIENT_ROOT = path.resolve(__dirname, '../client');
const IS_PROD = process.env.NODE_ENV === 'production';

// ─── Security ───────────────────────────────────────────────────────────────
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' }, contentSecurityPolicy: false }));
app.use(cors({ origin: '*', credentials: true }));

// ─── Rate Limiting ───────────────────────────────────────────────────────────
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: IS_PROD ? 200 : 50000 });
app.use('/api', limiter);

// ─── Body Parsers ────────────────────────────────────────────────────────────
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ─── Static uploads ─────────────────────────────────────────────────────────
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ─── Database ────────────────────────────────────────────────────────────────
await connectDB();

// ─── API Routes ──────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => res.json({ success: true, message: 'Server is running healthily!' }));
app.use('/api/public', publicRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/vendor', vendorRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/superadmin', superAdminRoutes);
app.use('/api/products', productRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/returns', returnRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/addresses', addressRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api', hsnSkuRoutes);
app.use('/api/images', imageRoutes);
app.use('/api/location', locationRoutes);
app.use('/api/support', supportRoutes);
app.use('/api/bank-accounts', bankAccountRoutes);
app.use('/api/delivery', dispatchFlowRoutes);
app.use('/api/delivery', deliveryIntegrationRoutes);
app.use('/api/docs', apiDocsRoutes);
app.use('/api/vendor-communications', vendorCommunicationRoutes);
app.use('/api/jobs', jobRoutes);

// ─── Vite (dev) or Static (prod) ─────────────────────────────────────────────
let vite;
if (!IS_PROD) {
  const { createServer: createViteServer } = await import(
    `file://${path.resolve(CLIENT_ROOT, 'node_modules/vite/dist/node/index.js').replace(/\\/g, '/')}`
  );
  vite = await createViteServer({
    root: CLIENT_ROOT,
    server: {
      middlewareMode: true,
      allowedHosts: ['www.ibcmart.com', 'ibcmart.com', 'localhost', '192.168.29.252'],
    },
    appType: 'custom',
  });
  app.use((req, res, next) => {
    const url = req.url;
    const pathPart = url.split('?')[0];
    const isStaticFile = /\.(ico|png|jpg|jpeg|gif|svg|json|xml|txt|css|js|map|woff|woff2|ttf|eot|mjs|jsx|ts|tsx)$/i.test(pathPart);
    if (url.startsWith('/@') || url.includes('/src/') || url.startsWith('/node_modules/') || url.startsWith('/assets') || isStaticFile) {
      return vite.middlewares(req, res, next);
    }
    next();
  });
} else {
  app.use(express.static(path.resolve(CLIENT_ROOT, 'dist/client'), { index: false }));
}

// ─── Private / SPA routes (skip SSR) ────────────────────────────────────────
const PRIVATE_PREFIXES = [
  '/admin', '/superadmin', '/vendor', '/account',
  '/login', '/register', '/cart', '/checkout', '/support-portal',
  '/wishlist', '/orders', '/profile',
];

// ─── SSR Handler ─────────────────────────────────────────────────────────────
async function ssrHandler(req, res, next) {
  const fullUrl = req.originalUrl;
  const pathPart = fullUrl.split('?')[0];

  console.log(`[SSR DEBUG] Incoming request: ${fullUrl}`);
  console.log(`[SSR DEBUG] Host: ${req.headers.host}`);
  console.log(`[SSR DEBUG] Port: ${PORT}`);
  console.log(`[SSR DEBUG] NODE_ENV: ${process.env.NODE_ENV}`);
  console.log(`[SSR DEBUG] Request path: ${pathPart}`);
  console.log(`[SSR DEBUG] SSR mode: ${IS_PROD ? 'PRODUCTION' : 'DEVELOPMENT'}`);

  // 1. Let API and private/static routes pass
  const isStaticFile = /\.(ico|png|jpg|jpeg|gif|svg|json|xml|txt|css|js|map|woff|woff2|ttf|eot)$/i.test(pathPart);
  if (fullUrl.startsWith('/api') || fullUrl.startsWith('/uploads') || fullUrl.startsWith('/assets') || fullUrl.startsWith('/@') || isStaticFile) {
    return next();
  }
  if (PRIVATE_PREFIXES.some(p => fullUrl.startsWith(p))) {
    return serveSpaShell(req, res, next, fullUrl);
  }

  // 2. Redirect old 5-segment URLs to canonical 4-segment
  const parts = pathPart.split('/').filter(Boolean);
  if (parts.length >= 5 && parts[1] === 'shop') {
    const canonical = `/${parts[0]}/shop/${parts[2]}/${parts[3]}`;
    console.log(`[SSR] 301 Redirect: ${pathPart} → ${canonical}`);
    return res.redirect(301, canonical);
  }

  console.log(`[SSR] Request: ${fullUrl}`);

  // 3. Fetch SEO data from DB
  const baseOrigin = IS_PROD ? 'https://www.ibcmart.com' : `${req.protocol}://${req.get('host')}`;
  let ssrData = null;
  try {
    ssrData = await fetchSeoData(fullUrl, baseOrigin);
  } catch (err) {
    console.error('[SSR] fetchSeoData failed:', err.message);
  }

  if (!ssrData) {
    console.log(`[SSR] No SEO match for ${fullUrl}, falling back to SPA shell`);
    return serveSpaShell(req, res, next, fullUrl);
  }

  if (ssrData.status === 404) {
    res.status(404);
  }
  
  // Route type identified: ssrData.pageType

  try {
    // Start SSR React render
    // 4. Load the index.html template
    let template;
    if (!IS_PROD) {
      template = fs.readFileSync(path.resolve(CLIENT_ROOT, 'index.html'), 'utf-8');
      template = await vite.transformIndexHtml(fullUrl, template);
    } else {
      template = fs.readFileSync(path.resolve(CLIENT_ROOT, 'dist/client/index.html'), 'utf-8');
    }

    // 5. Load and call entry-server.jsx render function
    let render;
    if (!IS_PROD) {
      // Set browser globals BEFORE ssrLoadModule so that authSlice.js (which
      // calls localStorage at module scope) does not crash in Node.js.
      if (typeof globalThis.localStorage === 'undefined') {
        const noopStore = {
          _d: {}, getItem(k){return this._d[k]??null;}, setItem(k,v){this._d[k]=String(v);},
          removeItem(k){delete this._d[k];}, clear(){this._d={};},
          key(i){return Object.keys(this._d)[i]??null;}, get length(){return Object.keys(this._d).length;}
        };
        globalThis.localStorage = noopStore;
        globalThis.sessionStorage = {...noopStore, _d: {}};
      }
      if (typeof globalThis.navigator === 'undefined') globalThis.navigator = { userAgent: 'node' };

      const ssrModule = await vite.ssrLoadModule(path.resolve(CLIENT_ROOT, 'src/entry-server.jsx'));
      render = ssrModule.render;
    } else {
      const { render: prodRender } = await import(
        `file://${path.resolve(CLIENT_ROOT, 'dist/server/entry-server.js').replace(/\\/g, '/')}`
      );
      render = prodRender;
    }

    globalThis.__SSR_HOST__ = req.get('host');
    globalThis.__SSR_PROTOCOL__ = req.protocol;
    const { html: appHtml } = render(fullUrl, ssrData);

    // 6. Build SEO <head> tags
    const seo = ssrData.seoData;
    const rawImage = ssrData.business?.business_logo || ssrData.service?.image_path || ssrData.product?.image_path || ssrData.job?.business_logo;
    const ogImage = resolvePublicAssetUrl(rawImage, baseOrigin);

    let seoHead = `
  <title>${escHtml(seo.title)}</title>
  <meta name="description" content="${escHtml(seo.description)}" />
  ${seo.keywords ? `<meta name="keywords" content="${escHtml(seo.keywords)}" />` : ''}
  <link rel="canonical" href="${escHtml(seo.canonical)}" />
  <meta property="og:title" content="${escHtml(seo.title)}" />
  <meta property="og:description" content="${escHtml(seo.description)}" />
  <meta property="og:url" content="${escHtml(seo.canonical)}" />
  <meta property="og:type" content="website" />
  <meta property="og:image" content="${ogImage}" />
  <meta property="og:site_name" content="IBC Mart" />
  <meta name="theme-color" content="#0c2340" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${escHtml(seo.title)}" />
  <meta name="twitter:description" content="${escHtml(seo.description)}" />
  <meta name="twitter:image" content="${ogImage}" />`;

    // Inject compiled CSS in development mode to prevent Flash Of Unstyled Content (FOUC)
    if (!IS_PROD && vite) {
      try {
        const cssModule = await vite.ssrLoadModule('/src/index.css?inline');
        if (cssModule && cssModule.default) {
          seoHead += `\n  <style id="vite-ssr-css">${cssModule.default}</style>`;
        }
      } catch (err) {
        console.error('[SSR] Failed to inject dev CSS:', err);
      }
    }

    // 7. JSON-LD structured data (pre-constructed by fetchSeoData for consistency)
    if (ssrData.jsonLd) {
      seoHead += `\n  <script type="application/ld+json">${JSON.stringify(ssrData.jsonLd)}</script>`;
    }
    if (ssrData.breadcrumb) {
      seoHead += `\n  <script type="application/ld+json">${JSON.stringify(ssrData.breadcrumb)}</script>`;
    }

    // 8. Inject SSR data for client hydration (avoids duplicate fetch)
    const safeData = JSON.stringify(ssrData).replace(/</g, '\\u003c');
    seoHead += `\n  <script>window.__SSR_DATA__ = ${safeData};</script>`;

    // 9. Replace placeholders
    const html = template
      .replace(/<title>.*?<\/title>/gi, '')
      .replace('<!--ssr-head-->', seoHead)
      .replace('<!--ssr-body-->', appHtml);

    console.log(`[SSR] Rendered ${fullUrl} successfully (${appHtml.length} chars)`);
    res.status(res.statusCode || 200).set('Content-Type', 'text/html').end(html);

  } catch (err) {
    console.error('[SSR] Render error:', err);
    if (!IS_PROD && vite) {
      vite.ssrFixStacktrace(err);
    }
    return serveSpaShell(req, res, next, fullUrl);
  }
}

// Serve the plain SPA shell (for non-SSR routes and fallback)
async function serveSpaShell(req, res, next, url) {
  try {
    if (!IS_PROD) {
      let template = fs.readFileSync(path.resolve(CLIENT_ROOT, 'index.html'), 'utf-8');
      template = await vite.transformIndexHtml(url, template);
      res.status(200).set('Content-Type', 'text/html').end(template);
    } else {
      res.sendFile(path.resolve(CLIENT_ROOT, 'dist/client/index.html'));
    }
  } catch (err) {
    next(err);
  }
}

function escHtml(str) {
  return String(str || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// ─── Mount SSR handler ────────────────────────────────────────────────────────
app.get('*', ssrHandler);

// ─── Error handler ────────────────────────────────────────────────────────────
app.use(errorHandler);

import http from 'http';
import { initSocket } from './src/socket.js';

const httpServer = http.createServer(app);
const io = initSocket(httpServer);
app.set('io', io);

httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🚀 Unified SSR Server running on http://0.0.0.0:${PORT}`);
  console.log(`   Mode: ${IS_PROD ? 'PRODUCTION' : 'DEVELOPMENT (Vite middleware)'}\n`);
});
