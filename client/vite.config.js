import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path';
import fs from 'fs';
import axios from 'axios';

const isProd = process.env.NODE_ENV === 'production';
const rrEnv = isProd ? 'production' : 'development';

function reactRouterSsrFixPlugin() {
  return {
    name: 'react-router-ssr-fix',
    enforce: 'pre',
    resolveId(source, importer, options) {
      if (options.ssr) {
        if (source === 'react-router-dom') {
          return path.resolve(__dirname, 'node_modules/react-router-dom/dist/index.mjs');
        }
        if (source === 'react-router/dom') {
          return path.resolve(__dirname, `node_modules/react-router/dist/${rrEnv}/dom-export.mjs`);
        }
        if (source === 'react-router') {
          return path.resolve(__dirname, `node_modules/react-router/dist/${rrEnv}/index.mjs`);
        }
      }
      return null;
    }
  }
}

// Development SSR middleware running directly inside Vite dev server (port 3013)
function viteDevSsrPlugin() {
  return {
    name: 'vite-dev-ssr',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = req.url;
        const pathPart = url.split('?')[0];

        // 1. Robust Document/Navigation Request Detection (GET only)
        const method = req.method;
        if (method !== 'GET') {
          return next();
        }

        const accept = req.headers.accept || '';
        const isDoc = accept.includes('text/html') || req.headers['sec-fetch-dest']?.includes('document');
        if (!isDoc) {
          return next();
        }

        // Exclude APIs, static assets, Vite-specific internal modules, and file extensions
        const isApiOrAsset = url.startsWith('/api') || url.startsWith('/uploads') || url.startsWith('/assets') || url.startsWith('/@') || url.startsWith('/node_modules/');
        const hasFileExt = /\.[a-zA-Z0-9]{2,4}$/.test(pathPart);
        if (isApiOrAsset || hasFileExt) {
          return next();
        }

        const PRIVATE_PREFIXES = [
          '/admin', '/superadmin', '/vendor', '/account',
          '/login', '/register', '/cart', '/checkout', '/support-portal',
          '/wishlist', '/orders', '/profile',
        ];
        if (PRIVATE_PREFIXES.some(p => pathPart.startsWith(p))) {
          return next();
        }

        // console.log(`[Vite Dev SSR] HTML request: ${url}`);
        // console.log(`[Vite Dev SSR] Rendering URL: ${url}`);
        
        try {
          const baseOrigin = `${req.connection.encrypted ? 'https' : 'http'}://${req.headers.host}`;

          // 2. Query Express backend (port 5001) for SSR metadata
          const backendUrl = 'http://localhost:5001/api/public/ssr-data?url=' + encodeURIComponent(url);
          let ssrData = null;
          try {
            const response = await axios.get(backendUrl);
            if (response.data && response.data.success) {
              ssrData = response.data.ssrData;
            }
          } catch (err) {
            console.warn(`[Vite Dev SSR] Failed to fetch SSR data from backend: ${err.message}`);
          }

          // 3. Fallback metadata if database has no custom SEO mapping or backend query fails
          if (!ssrData) {
            // console.log(`[Vite Dev SSR] Using fallback metadata for URL: ${url}`);
            ssrData = {
              pageType: 'generic',
              seoData: {
                title: 'IBC Mart - Enterprise Marketplace',
                description: 'Discover local products, services, and opportunities on IBC Mart.',
                canonical: baseOrigin + pathPart
              }
            };
          }

          let template = fs.readFileSync(path.resolve(__dirname, 'index.html'), 'utf-8');
          template = await server.transformIndexHtml(url, template);
          template = template.replace(/<title>[^<]*<\/title>/i, '');

          // 5. Load and execute the entry-server module
          const ssrModule = await server.ssrLoadModule('/src/entry-server.jsx');
          const render = ssrModule.render;

          globalThis.__SSR_HOST__ = req.headers.host;
          globalThis.__SSR_PROTOCOL__ = req.connection.encrypted ? 'https' : 'http';
          
          const { html: appHtml } = render(url, ssrData);

          // 6. Build SEO Head tags
          const seo = ssrData.seoData;
          const escHtml = (str) => String(str || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
          
          const rawImage = ssrData.business?.business_logo || ssrData.service?.image_path || ssrData.product?.image_path || ssrData.job?.business_logo;
          
          const resolvePublicAssetUrl = (img) => {
            if (!img) return `${baseOrigin}/og-default.png`;
            const s = String(img).trim();
            if (/^https?:\/\//i.test(s)) return s;
            const idx = s.indexOf('uploads/');
            if (idx !== -1) return `${baseOrigin}/${s.substring(idx)}`;
            return `${baseOrigin}/${s.startsWith('/') ? s.substring(1) : s}`;
          };
          const ogImage = resolvePublicAssetUrl(rawImage);

           let seoHead = `
  <link rel="stylesheet" href="/src/index.css" />
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

          if (ssrData.jsonLd) {
            seoHead += `\n  <script type="application/ld+json">${JSON.stringify(ssrData.jsonLd)}</script>`;
          }
          if (ssrData.breadcrumb) {
            seoHead += `\n  <script type="application/ld+json">${JSON.stringify(ssrData.breadcrumb)}</script>`;
          }

          const safeData = JSON.stringify(ssrData).replace(/</g, '\\u003c');
          seoHead += `\n  <script>window.__SSR_DATA__ = ${safeData};</script>`;

          const html = template
            .replace('<!--ssr-head-->', seoHead)
            .replace('<!--ssr-body-->', appHtml);

          res.statusCode = ssrData.status === 404 ? 404 : 200;
          res.setHeader('Content-Type', 'text/html');
          res.end(html);
          // console.log(`[Vite Dev SSR] Rendered ${url} successfully (${appHtml.length} chars)`);
        } catch (err) {
          console.error(`[Vite Dev SSR] Render error for ${url}:`, err);
          // Only fall back to unrendered template on actual rendering crash
          let template = fs.readFileSync(path.resolve(__dirname, 'index.html'), 'utf-8');
          template = await server.transformIndexHtml(url, template);
          res.statusCode = 500;
          res.setHeader('Content-Type', 'text/html');
          res.end(template);
        }
      });
    }
  };
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), reactRouterSsrFixPlugin(), viteDevSsrPlugin()],
  server: {
    host: "0.0.0.0",
    port: 3013,
    allowedHosts: [
      "www.ibcmart.com",
      "ibcmart.com"
    ],
    proxy: {
      '/api': {
        target: 'http://localhost:5001',
        changeOrigin: true,
        secure: false,
      },
      '/uploads': {
        target: 'http://localhost:5001',
        changeOrigin: true,
        secure: false,
      }
    }
  },
  build: {
    outDir: 'dist',
    ssr: process.env.VITE_SSR_BUILD === 'true'
  },
  ssr: {
    noExternal: /react-router/
  }
})
