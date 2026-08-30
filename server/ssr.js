import fs from 'fs';
import path from 'path';
import { fetchSeoData, resolvePublicAssetUrl } from './src/ssr/fetchSeoData.js';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// This function will be exported to be used as a middleware
export async function ssrMiddleware(req, res, next) {
  try {
    const url = req.originalUrl;
    
    // Skip API, assets, private routes, and static files
    const pathPart = url.split('?')[0];

    console.log(`[SSR DEBUG] Incoming request: ${url}`);
    console.log(`[SSR DEBUG] Host: ${req.headers.host}`);
    console.log(`[SSR DEBUG] Port: ${process.env.PORT || 5001}`);
    console.log(`[SSR DEBUG] NODE_ENV: ${process.env.NODE_ENV}`);
    console.log(`[SSR DEBUG] Request path: ${pathPart}`);
    console.log(`[SSR DEBUG] SSR mode: PRODUCTION`);
    const isStaticFile = /\.(ico|png|jpg|jpeg|gif|svg|json|xml|txt|css|js|map|woff|woff2|ttf|eot)$/i.test(pathPart);
    if (url.startsWith('/api') || url.startsWith('/assets') || isStaticFile ||
        url.startsWith('/admin') || url.startsWith('/vendor') || 
        url.startsWith('/login') || url.startsWith('/register') ||
        url.startsWith('/account') || url.startsWith('/cart') || 
        url.startsWith('/checkout') || url.startsWith('/superadmin') || 
        url.startsWith('/support-portal')) {
      return next();
    }

    // 1. Fetch data
    console.log('Fetching SEO data for', url);
    const ssrData = await fetchSeoData(url, 'https://www.ibcmart.com');
    if (!ssrData) {
      console.log('No SEO data found, skipping SSR');
      // If no SEO data, fallback to normal SPA serving
      return next();
    }
    
    if (ssrData.status === 301 && ssrData.redirectUrl) {
      console.log(`Redirecting to correct Product URL: ${ssrData.redirectUrl}`);
      return res.redirect(301, ssrData.redirectUrl);
    }
    
    if (ssrData.status === 404) {
      res.status(404);
    }
    console.log('Fetched SEO data:', ssrData.pageType);

    // Redirect for old business urls with 5 segments
    const parts = url.split('/').filter(Boolean);
    if (parts.length >= 5 && parts[1] === 'shop') {
      const canonical = `/${parts[0]}/shop/${parts[2]}/${parts[3]}`;
      return res.redirect(301, canonical);
    }

    // 2. Read template (production vs dev)
    let template = '';
    let render = null;

    if (process.env.NODE_ENV === 'production') {
      console.log('Loading production SSR assets...');
      template = fs.readFileSync(path.resolve(__dirname, '../client/dist/client/index.html'), 'utf-8');
      const entryServer = await import(`file://${path.resolve(__dirname, '../client/dist/server/entry-server.js').replace(/\\/g, '/')}`);
      render = entryServer.render;
      console.log('Production SSR assets loaded.');
    } else {
      console.log('Not in production, skipping SSR');
      // In development, Vite middleware handles this, but if we hit this, we shouldn't block
      return next();
    }

    // 3. Render React
    console.log('Rendering React...');
    globalThis.__SSR_HOST__ = req.get('host');
    globalThis.__SSR_PROTOCOL__ = req.protocol;
    const { html: appHtml } = render(url, ssrData);
    console.log('React rendered.');

    // 4. Generate SEO Head
    const seoData = ssrData.seoData;
    const rawImage = ssrData.business?.business_logo || ssrData.service?.image_path || ssrData.product?.image_path || ssrData.job?.business_logo;
    const ogImage = resolvePublicAssetUrl(rawImage, 'https://www.ibcmart.com');

    let seoHead = `
      <title>${seoData.title}</title>
      <meta name="description" content="${seoData.description}" />
      ${seoData.keywords ? `<meta name="keywords" content="${seoData.keywords}" />` : ''}
      <link rel="canonical" href="${seoData.canonical}" />
      <meta property="og:title" content="${seoData.title}" />
      <meta property="og:description" content="${seoData.description}" />
      <meta property="og:url" content="${seoData.canonical}" />
      <meta property="og:type" content="website" />
      <meta property="og:image" content="${ogImage}" />
      <meta name="theme-color" content="#0c2340" />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content="${seoData.title}" />
      <meta name="twitter:description" content="${seoData.description}" />
      <meta name="twitter:image" content="${ogImage}" />
    `;

    // Inject JSON-LD structured data (pre-constructed by fetchSeoData for consistency)
    if (ssrData.jsonLd) {
      seoHead += `\n<script type="application/ld+json">\n${JSON.stringify(ssrData.jsonLd)}\n</script>`;
    }
    if (ssrData.breadcrumb) {
      seoHead += `\n<script type="application/ld+json">\n${JSON.stringify(ssrData.breadcrumb)}\n</script>`;
    }

    // Inject SSR data for client hydration (avoids duplicate fetch)
    const safeData = JSON.stringify(ssrData).replace(/</g, '\\u003c');
    seoHead += `\n<script>window.__SSR_DATA__ = ${safeData};</script>`;

    // 5. Inject into HTML
    const html = template
      .replace(/<title>.*?<\/title>/gi, '')
      .replace('<!--ssr-head-->', seoHead)
      .replace('<!--ssr-body-->', appHtml);

    res.status(res.statusCode || 200).set({ 'Content-Type': 'text/html' }).end(html);

  } catch (error) {
    console.error('SSR Middleware Error:', error);
    next(error);
  }
}
