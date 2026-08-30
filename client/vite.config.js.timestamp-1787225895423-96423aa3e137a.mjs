// vite.config.js
import { defineConfig } from "file:///Z:/project%202.0%20new/client/node_modules/vite/dist/node/index.js";
import react from "file:///Z:/project%202.0%20new/client/node_modules/@vitejs/plugin-react/dist/index.js";
import tailwindcss from "file:///Z:/project%202.0%20new/client/node_modules/@tailwindcss/vite/dist/index.mjs";
import path from "path";
import fs from "fs";
import axios from "file:///Z:/project%202.0%20new/client/node_modules/axios/index.js";
var __vite_injected_original_dirname = "Z:\\project 2.0 new\\client";
var isProd = process.env.NODE_ENV === "production";
var rrEnv = isProd ? "production" : "development";
function reactRouterSsrFixPlugin() {
  return {
    name: "react-router-ssr-fix",
    enforce: "pre",
    resolveId(source, importer, options) {
      if (options.ssr) {
        if (source === "react-router-dom") {
          return path.resolve(__vite_injected_original_dirname, "node_modules/react-router-dom/dist/index.mjs");
        }
        if (source === "react-router/dom") {
          return path.resolve(__vite_injected_original_dirname, `node_modules/react-router/dist/${rrEnv}/dom-export.mjs`);
        }
        if (source === "react-router") {
          return path.resolve(__vite_injected_original_dirname, `node_modules/react-router/dist/${rrEnv}/index.mjs`);
        }
      }
      return null;
    }
  };
}
function viteDevSsrPlugin() {
  return {
    name: "vite-dev-ssr",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = req.url;
        const pathPart = url.split("?")[0];
        const method = req.method;
        if (method !== "GET") {
          return next();
        }
        const accept = req.headers.accept || "";
        const isDoc = accept.includes("text/html") || req.headers["sec-fetch-dest"]?.includes("document");
        if (!isDoc) {
          return next();
        }
        const isApiOrAsset = url.startsWith("/api") || url.startsWith("/uploads") || url.startsWith("/assets") || url.startsWith("/@") || url.startsWith("/node_modules/");
        const hasFileExt = /\.[a-zA-Z0-9]{2,4}$/.test(pathPart);
        if (isApiOrAsset || hasFileExt) {
          return next();
        }
        const PRIVATE_PREFIXES = [
          "/admin",
          "/superadmin",
          "/vendor",
          "/account",
          "/login",
          "/register",
          "/cart",
          "/checkout",
          "/support-portal",
          "/wishlist",
          "/orders",
          "/profile"
        ];
        if (PRIVATE_PREFIXES.some((p) => pathPart.startsWith(p))) {
          return next();
        }
        try {
          const baseOrigin = `${req.connection.encrypted ? "https" : "http"}://${req.headers.host}`;
          const backendUrl = "http://localhost:5001/api/public/ssr-data?url=" + encodeURIComponent(url);
          let ssrData = null;
          try {
            const response = await axios.get(backendUrl);
            if (response.data && response.data.success) {
              ssrData = response.data.ssrData;
            }
          } catch (err) {
            console.warn(`[Vite Dev SSR] Failed to fetch SSR data from backend: ${err.message}`);
          }
          if (!ssrData) {
            ssrData = {
              pageType: "generic",
              seoData: {
                title: "IBC Mart - Enterprise Marketplace",
                description: "Discover local products, services, and opportunities on IBC Mart.",
                canonical: baseOrigin + pathPart
              }
            };
          }
          let template = fs.readFileSync(path.resolve(__vite_injected_original_dirname, "index.html"), "utf-8");
          template = await server.transformIndexHtml(url, template);
          template = template.replace(/<title>[^<]*<\/title>/i, "");
          const ssrModule = await server.ssrLoadModule("/src/entry-server.jsx");
          const render = ssrModule.render;
          globalThis.__SSR_HOST__ = req.headers.host;
          globalThis.__SSR_PROTOCOL__ = req.connection.encrypted ? "https" : "http";
          const { html: appHtml } = render(url, ssrData);
          const seo = ssrData.seoData;
          const escHtml = (str) => String(str || "").replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
          const rawImage = ssrData.business?.business_logo || ssrData.service?.image_path || ssrData.product?.image_path || ssrData.job?.business_logo;
          const resolvePublicAssetUrl = (img) => {
            if (!img) return `${baseOrigin}/og-default.png`;
            const s = String(img).trim();
            if (/^https?:\/\//i.test(s)) return s;
            const idx = s.indexOf("uploads/");
            if (idx !== -1) return `${baseOrigin}/${s.substring(idx)}`;
            return `${baseOrigin}/${s.startsWith("/") ? s.substring(1) : s}`;
          };
          const ogImage = resolvePublicAssetUrl(rawImage);
          let seoHead = `
  <link rel="stylesheet" href="/src/index.css" />
  <title>${escHtml(seo.title)}</title>
  <meta name="description" content="${escHtml(seo.description)}" />
  ${seo.keywords ? `<meta name="keywords" content="${escHtml(seo.keywords)}" />` : ""}
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
            seoHead += `
  <script type="application/ld+json">${JSON.stringify(ssrData.jsonLd)}</script>`;
          }
          if (ssrData.breadcrumb) {
            seoHead += `
  <script type="application/ld+json">${JSON.stringify(ssrData.breadcrumb)}</script>`;
          }
          const safeData = JSON.stringify(ssrData).replace(/</g, "\\u003c");
          seoHead += `
  <script>window.__SSR_DATA__ = ${safeData};</script>`;
          const html = template.replace("<!--ssr-head-->", seoHead).replace("<!--ssr-body-->", appHtml);
          res.statusCode = ssrData.status === 404 ? 404 : 200;
          res.setHeader("Content-Type", "text/html");
          res.end(html);
        } catch (err) {
          console.error(`[Vite Dev SSR] Render error for ${url}:`, err);
          let template = fs.readFileSync(path.resolve(__vite_injected_original_dirname, "index.html"), "utf-8");
          template = await server.transformIndexHtml(url, template);
          res.statusCode = 500;
          res.setHeader("Content-Type", "text/html");
          res.end(template);
        }
      });
    }
  };
}
var vite_config_default = defineConfig({
  plugins: [react(), tailwindcss(), reactRouterSsrFixPlugin(), viteDevSsrPlugin()],
  server: {
    host: "0.0.0.0",
    port: 3013,
    allowedHosts: [
      "www.ibcmart.com",
      "ibcmart.com"
    ],
    proxy: {
      "/api": {
        target: "http://localhost:5001",
        changeOrigin: true,
        secure: false
      },
      "/uploads": {
        target: "http://localhost:5001",
        changeOrigin: true,
        secure: false
      }
    }
  },
  build: {
    outDir: "dist",
    ssr: process.env.VITE_SSR_BUILD === "true"
  },
  ssr: {
    noExternal: /react-router/
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcuanMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJaOlxcXFxwcm9qZWN0IDIuMCBuZXdcXFxcY2xpZW50XCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCJaOlxcXFxwcm9qZWN0IDIuMCBuZXdcXFxcY2xpZW50XFxcXHZpdGUuY29uZmlnLmpzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9aOi9wcm9qZWN0JTIwMi4wJTIwbmV3L2NsaWVudC92aXRlLmNvbmZpZy5qc1wiO2ltcG9ydCB7IGRlZmluZUNvbmZpZyB9IGZyb20gJ3ZpdGUnXG5pbXBvcnQgcmVhY3QgZnJvbSAnQHZpdGVqcy9wbHVnaW4tcmVhY3QnXG5pbXBvcnQgdGFpbHdpbmRjc3MgZnJvbSAnQHRhaWx3aW5kY3NzL3ZpdGUnXG5pbXBvcnQgcGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCBmcyBmcm9tICdmcyc7XG5pbXBvcnQgYXhpb3MgZnJvbSAnYXhpb3MnO1xuXG5jb25zdCBpc1Byb2QgPSBwcm9jZXNzLmVudi5OT0RFX0VOViA9PT0gJ3Byb2R1Y3Rpb24nO1xuY29uc3QgcnJFbnYgPSBpc1Byb2QgPyAncHJvZHVjdGlvbicgOiAnZGV2ZWxvcG1lbnQnO1xuXG5mdW5jdGlvbiByZWFjdFJvdXRlclNzckZpeFBsdWdpbigpIHtcbiAgcmV0dXJuIHtcbiAgICBuYW1lOiAncmVhY3Qtcm91dGVyLXNzci1maXgnLFxuICAgIGVuZm9yY2U6ICdwcmUnLFxuICAgIHJlc29sdmVJZChzb3VyY2UsIGltcG9ydGVyLCBvcHRpb25zKSB7XG4gICAgICBpZiAob3B0aW9ucy5zc3IpIHtcbiAgICAgICAgaWYgKHNvdXJjZSA9PT0gJ3JlYWN0LXJvdXRlci1kb20nKSB7XG4gICAgICAgICAgcmV0dXJuIHBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICdub2RlX21vZHVsZXMvcmVhY3Qtcm91dGVyLWRvbS9kaXN0L2luZGV4Lm1qcycpO1xuICAgICAgICB9XG4gICAgICAgIGlmIChzb3VyY2UgPT09ICdyZWFjdC1yb3V0ZXIvZG9tJykge1xuICAgICAgICAgIHJldHVybiBwYXRoLnJlc29sdmUoX19kaXJuYW1lLCBgbm9kZV9tb2R1bGVzL3JlYWN0LXJvdXRlci9kaXN0LyR7cnJFbnZ9L2RvbS1leHBvcnQubWpzYCk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHNvdXJjZSA9PT0gJ3JlYWN0LXJvdXRlcicpIHtcbiAgICAgICAgICByZXR1cm4gcGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgYG5vZGVfbW9kdWxlcy9yZWFjdC1yb3V0ZXIvZGlzdC8ke3JyRW52fS9pbmRleC5tanNgKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICB9XG59XG5cbi8vIERldmVsb3BtZW50IFNTUiBtaWRkbGV3YXJlIHJ1bm5pbmcgZGlyZWN0bHkgaW5zaWRlIFZpdGUgZGV2IHNlcnZlciAocG9ydCAzMDEzKVxuZnVuY3Rpb24gdml0ZURldlNzclBsdWdpbigpIHtcbiAgcmV0dXJuIHtcbiAgICBuYW1lOiAndml0ZS1kZXYtc3NyJyxcbiAgICBjb25maWd1cmVTZXJ2ZXIoc2VydmVyKSB7XG4gICAgICBzZXJ2ZXIubWlkZGxld2FyZXMudXNlKGFzeW5jIChyZXEsIHJlcywgbmV4dCkgPT4ge1xuICAgICAgICBjb25zdCB1cmwgPSByZXEudXJsO1xuICAgICAgICBjb25zdCBwYXRoUGFydCA9IHVybC5zcGxpdCgnPycpWzBdO1xuXG4gICAgICAgIC8vIDEuIFJvYnVzdCBEb2N1bWVudC9OYXZpZ2F0aW9uIFJlcXVlc3QgRGV0ZWN0aW9uIChHRVQgb25seSlcbiAgICAgICAgY29uc3QgbWV0aG9kID0gcmVxLm1ldGhvZDtcbiAgICAgICAgaWYgKG1ldGhvZCAhPT0gJ0dFVCcpIHtcbiAgICAgICAgICByZXR1cm4gbmV4dCgpO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgYWNjZXB0ID0gcmVxLmhlYWRlcnMuYWNjZXB0IHx8ICcnO1xuICAgICAgICBjb25zdCBpc0RvYyA9IGFjY2VwdC5pbmNsdWRlcygndGV4dC9odG1sJykgfHwgcmVxLmhlYWRlcnNbJ3NlYy1mZXRjaC1kZXN0J10/LmluY2x1ZGVzKCdkb2N1bWVudCcpO1xuICAgICAgICBpZiAoIWlzRG9jKSB7XG4gICAgICAgICAgcmV0dXJuIG5leHQoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEV4Y2x1ZGUgQVBJcywgc3RhdGljIGFzc2V0cywgVml0ZS1zcGVjaWZpYyBpbnRlcm5hbCBtb2R1bGVzLCBhbmQgZmlsZSBleHRlbnNpb25zXG4gICAgICAgIGNvbnN0IGlzQXBpT3JBc3NldCA9IHVybC5zdGFydHNXaXRoKCcvYXBpJykgfHwgdXJsLnN0YXJ0c1dpdGgoJy91cGxvYWRzJykgfHwgdXJsLnN0YXJ0c1dpdGgoJy9hc3NldHMnKSB8fCB1cmwuc3RhcnRzV2l0aCgnL0AnKSB8fCB1cmwuc3RhcnRzV2l0aCgnL25vZGVfbW9kdWxlcy8nKTtcbiAgICAgICAgY29uc3QgaGFzRmlsZUV4dCA9IC9cXC5bYS16QS1aMC05XXsyLDR9JC8udGVzdChwYXRoUGFydCk7XG4gICAgICAgIGlmIChpc0FwaU9yQXNzZXQgfHwgaGFzRmlsZUV4dCkge1xuICAgICAgICAgIHJldHVybiBuZXh0KCk7XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBQUklWQVRFX1BSRUZJWEVTID0gW1xuICAgICAgICAgICcvYWRtaW4nLCAnL3N1cGVyYWRtaW4nLCAnL3ZlbmRvcicsICcvYWNjb3VudCcsXG4gICAgICAgICAgJy9sb2dpbicsICcvcmVnaXN0ZXInLCAnL2NhcnQnLCAnL2NoZWNrb3V0JywgJy9zdXBwb3J0LXBvcnRhbCcsXG4gICAgICAgICAgJy93aXNobGlzdCcsICcvb3JkZXJzJywgJy9wcm9maWxlJyxcbiAgICAgICAgXTtcbiAgICAgICAgaWYgKFBSSVZBVEVfUFJFRklYRVMuc29tZShwID0+IHBhdGhQYXJ0LnN0YXJ0c1dpdGgocCkpKSB7XG4gICAgICAgICAgcmV0dXJuIG5leHQoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIGNvbnNvbGUubG9nKGBbVml0ZSBEZXYgU1NSXSBIVE1MIHJlcXVlc3Q6ICR7dXJsfWApO1xuICAgICAgICAvLyBjb25zb2xlLmxvZyhgW1ZpdGUgRGV2IFNTUl0gUmVuZGVyaW5nIFVSTDogJHt1cmx9YCk7XG4gICAgICAgIFxuICAgICAgICB0cnkge1xuICAgICAgICAgIGNvbnN0IGJhc2VPcmlnaW4gPSBgJHtyZXEuY29ubmVjdGlvbi5lbmNyeXB0ZWQgPyAnaHR0cHMnIDogJ2h0dHAnfTovLyR7cmVxLmhlYWRlcnMuaG9zdH1gO1xuXG4gICAgICAgICAgLy8gMi4gUXVlcnkgRXhwcmVzcyBiYWNrZW5kIChwb3J0IDUwMDEpIGZvciBTU1IgbWV0YWRhdGFcbiAgICAgICAgICBjb25zdCBiYWNrZW5kVXJsID0gJ2h0dHA6Ly9sb2NhbGhvc3Q6NTAwMS9hcGkvcHVibGljL3Nzci1kYXRhP3VybD0nICsgZW5jb2RlVVJJQ29tcG9uZW50KHVybCk7XG4gICAgICAgICAgbGV0IHNzckRhdGEgPSBudWxsO1xuICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IGF4aW9zLmdldChiYWNrZW5kVXJsKTtcbiAgICAgICAgICAgIGlmIChyZXNwb25zZS5kYXRhICYmIHJlc3BvbnNlLmRhdGEuc3VjY2Vzcykge1xuICAgICAgICAgICAgICBzc3JEYXRhID0gcmVzcG9uc2UuZGF0YS5zc3JEYXRhO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgICAgICAgY29uc29sZS53YXJuKGBbVml0ZSBEZXYgU1NSXSBGYWlsZWQgdG8gZmV0Y2ggU1NSIGRhdGEgZnJvbSBiYWNrZW5kOiAke2Vyci5tZXNzYWdlfWApO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIC8vIDMuIEZhbGxiYWNrIG1ldGFkYXRhIGlmIGRhdGFiYXNlIGhhcyBubyBjdXN0b20gU0VPIG1hcHBpbmcgb3IgYmFja2VuZCBxdWVyeSBmYWlsc1xuICAgICAgICAgIGlmICghc3NyRGF0YSkge1xuICAgICAgICAgICAgLy8gY29uc29sZS5sb2coYFtWaXRlIERldiBTU1JdIFVzaW5nIGZhbGxiYWNrIG1ldGFkYXRhIGZvciBVUkw6ICR7dXJsfWApO1xuICAgICAgICAgICAgc3NyRGF0YSA9IHtcbiAgICAgICAgICAgICAgcGFnZVR5cGU6ICdnZW5lcmljJyxcbiAgICAgICAgICAgICAgc2VvRGF0YToge1xuICAgICAgICAgICAgICAgIHRpdGxlOiAnSUJDIE1hcnQgLSBFbnRlcnByaXNlIE1hcmtldHBsYWNlJyxcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ0Rpc2NvdmVyIGxvY2FsIHByb2R1Y3RzLCBzZXJ2aWNlcywgYW5kIG9wcG9ydHVuaXRpZXMgb24gSUJDIE1hcnQuJyxcbiAgICAgICAgICAgICAgICBjYW5vbmljYWw6IGJhc2VPcmlnaW4gKyBwYXRoUGFydFxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9O1xuICAgICAgICAgIH1cblxuICAgICAgICAgIGxldCB0ZW1wbGF0ZSA9IGZzLnJlYWRGaWxlU3luYyhwYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnaW5kZXguaHRtbCcpLCAndXRmLTgnKTtcbiAgICAgICAgICB0ZW1wbGF0ZSA9IGF3YWl0IHNlcnZlci50cmFuc2Zvcm1JbmRleEh0bWwodXJsLCB0ZW1wbGF0ZSk7XG4gICAgICAgICAgdGVtcGxhdGUgPSB0ZW1wbGF0ZS5yZXBsYWNlKC88dGl0bGU+W148XSo8XFwvdGl0bGU+L2ksICcnKTtcblxuICAgICAgICAgIC8vIDUuIExvYWQgYW5kIGV4ZWN1dGUgdGhlIGVudHJ5LXNlcnZlciBtb2R1bGVcbiAgICAgICAgICBjb25zdCBzc3JNb2R1bGUgPSBhd2FpdCBzZXJ2ZXIuc3NyTG9hZE1vZHVsZSgnL3NyYy9lbnRyeS1zZXJ2ZXIuanN4Jyk7XG4gICAgICAgICAgY29uc3QgcmVuZGVyID0gc3NyTW9kdWxlLnJlbmRlcjtcblxuICAgICAgICAgIGdsb2JhbFRoaXMuX19TU1JfSE9TVF9fID0gcmVxLmhlYWRlcnMuaG9zdDtcbiAgICAgICAgICBnbG9iYWxUaGlzLl9fU1NSX1BST1RPQ09MX18gPSByZXEuY29ubmVjdGlvbi5lbmNyeXB0ZWQgPyAnaHR0cHMnIDogJ2h0dHAnO1xuICAgICAgICAgIFxuICAgICAgICAgIGNvbnN0IHsgaHRtbDogYXBwSHRtbCB9ID0gcmVuZGVyKHVybCwgc3NyRGF0YSk7XG5cbiAgICAgICAgICAvLyA2LiBCdWlsZCBTRU8gSGVhZCB0YWdzXG4gICAgICAgICAgY29uc3Qgc2VvID0gc3NyRGF0YS5zZW9EYXRhO1xuICAgICAgICAgIGNvbnN0IGVzY0h0bWwgPSAoc3RyKSA9PiBTdHJpbmcoc3RyIHx8ICcnKS5yZXBsYWNlKC8mL2csICcmYW1wOycpLnJlcGxhY2UoL1wiL2csICcmcXVvdDsnKS5yZXBsYWNlKC88L2csICcmbHQ7JykucmVwbGFjZSgvPi9nLCAnJmd0OycpO1xuICAgICAgICAgIFxuICAgICAgICAgIGNvbnN0IHJhd0ltYWdlID0gc3NyRGF0YS5idXNpbmVzcz8uYnVzaW5lc3NfbG9nbyB8fCBzc3JEYXRhLnNlcnZpY2U/LmltYWdlX3BhdGggfHwgc3NyRGF0YS5wcm9kdWN0Py5pbWFnZV9wYXRoIHx8IHNzckRhdGEuam9iPy5idXNpbmVzc19sb2dvO1xuICAgICAgICAgIFxuICAgICAgICAgIGNvbnN0IHJlc29sdmVQdWJsaWNBc3NldFVybCA9IChpbWcpID0+IHtcbiAgICAgICAgICAgIGlmICghaW1nKSByZXR1cm4gYCR7YmFzZU9yaWdpbn0vb2ctZGVmYXVsdC5wbmdgO1xuICAgICAgICAgICAgY29uc3QgcyA9IFN0cmluZyhpbWcpLnRyaW0oKTtcbiAgICAgICAgICAgIGlmICgvXmh0dHBzPzpcXC9cXC8vaS50ZXN0KHMpKSByZXR1cm4gcztcbiAgICAgICAgICAgIGNvbnN0IGlkeCA9IHMuaW5kZXhPZigndXBsb2Fkcy8nKTtcbiAgICAgICAgICAgIGlmIChpZHggIT09IC0xKSByZXR1cm4gYCR7YmFzZU9yaWdpbn0vJHtzLnN1YnN0cmluZyhpZHgpfWA7XG4gICAgICAgICAgICByZXR1cm4gYCR7YmFzZU9yaWdpbn0vJHtzLnN0YXJ0c1dpdGgoJy8nKSA/IHMuc3Vic3RyaW5nKDEpIDogc31gO1xuICAgICAgICAgIH07XG4gICAgICAgICAgY29uc3Qgb2dJbWFnZSA9IHJlc29sdmVQdWJsaWNBc3NldFVybChyYXdJbWFnZSk7XG5cbiAgICAgICAgICAgbGV0IHNlb0hlYWQgPSBgXG4gIDxsaW5rIHJlbD1cInN0eWxlc2hlZXRcIiBocmVmPVwiL3NyYy9pbmRleC5jc3NcIiAvPlxuICA8dGl0bGU+JHtlc2NIdG1sKHNlby50aXRsZSl9PC90aXRsZT5cbiAgPG1ldGEgbmFtZT1cImRlc2NyaXB0aW9uXCIgY29udGVudD1cIiR7ZXNjSHRtbChzZW8uZGVzY3JpcHRpb24pfVwiIC8+XG4gICR7c2VvLmtleXdvcmRzID8gYDxtZXRhIG5hbWU9XCJrZXl3b3Jkc1wiIGNvbnRlbnQ9XCIke2VzY0h0bWwoc2VvLmtleXdvcmRzKX1cIiAvPmAgOiAnJ31cbiAgPGxpbmsgcmVsPVwiY2Fub25pY2FsXCIgaHJlZj1cIiR7ZXNjSHRtbChzZW8uY2Fub25pY2FsKX1cIiAvPlxuICA8bWV0YSBwcm9wZXJ0eT1cIm9nOnRpdGxlXCIgY29udGVudD1cIiR7ZXNjSHRtbChzZW8udGl0bGUpfVwiIC8+XG4gIDxtZXRhIHByb3BlcnR5PVwib2c6ZGVzY3JpcHRpb25cIiBjb250ZW50PVwiJHtlc2NIdG1sKHNlby5kZXNjcmlwdGlvbil9XCIgLz5cbiAgPG1ldGEgcHJvcGVydHk9XCJvZzp1cmxcIiBjb250ZW50PVwiJHtlc2NIdG1sKHNlby5jYW5vbmljYWwpfVwiIC8+XG4gIDxtZXRhIHByb3BlcnR5PVwib2c6dHlwZVwiIGNvbnRlbnQ9XCJ3ZWJzaXRlXCIgLz5cbiAgPG1ldGEgcHJvcGVydHk9XCJvZzppbWFnZVwiIGNvbnRlbnQ9XCIke29nSW1hZ2V9XCIgLz5cbiAgPG1ldGEgcHJvcGVydHk9XCJvZzpzaXRlX25hbWVcIiBjb250ZW50PVwiSUJDIE1hcnRcIiAvPlxuICA8bWV0YSBuYW1lPVwidGhlbWUtY29sb3JcIiBjb250ZW50PVwiIzBjMjM0MFwiIC8+XG4gIDxtZXRhIG5hbWU9XCJ0d2l0dGVyOmNhcmRcIiBjb250ZW50PVwic3VtbWFyeV9sYXJnZV9pbWFnZVwiIC8+XG4gIDxtZXRhIG5hbWU9XCJ0d2l0dGVyOnRpdGxlXCIgY29udGVudD1cIiR7ZXNjSHRtbChzZW8udGl0bGUpfVwiIC8+XG4gIDxtZXRhIG5hbWU9XCJ0d2l0dGVyOmRlc2NyaXB0aW9uXCIgY29udGVudD1cIiR7ZXNjSHRtbChzZW8uZGVzY3JpcHRpb24pfVwiIC8+XG4gIDxtZXRhIG5hbWU9XCJ0d2l0dGVyOmltYWdlXCIgY29udGVudD1cIiR7b2dJbWFnZX1cIiAvPmA7XG5cbiAgICAgICAgICBpZiAoc3NyRGF0YS5qc29uTGQpIHtcbiAgICAgICAgICAgIHNlb0hlYWQgKz0gYFxcbiAgPHNjcmlwdCB0eXBlPVwiYXBwbGljYXRpb24vbGQranNvblwiPiR7SlNPTi5zdHJpbmdpZnkoc3NyRGF0YS5qc29uTGQpfTwvc2NyaXB0PmA7XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmIChzc3JEYXRhLmJyZWFkY3J1bWIpIHtcbiAgICAgICAgICAgIHNlb0hlYWQgKz0gYFxcbiAgPHNjcmlwdCB0eXBlPVwiYXBwbGljYXRpb24vbGQranNvblwiPiR7SlNPTi5zdHJpbmdpZnkoc3NyRGF0YS5icmVhZGNydW1iKX08L3NjcmlwdD5gO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIGNvbnN0IHNhZmVEYXRhID0gSlNPTi5zdHJpbmdpZnkoc3NyRGF0YSkucmVwbGFjZSgvPC9nLCAnXFxcXHUwMDNjJyk7XG4gICAgICAgICAgc2VvSGVhZCArPSBgXFxuICA8c2NyaXB0PndpbmRvdy5fX1NTUl9EQVRBX18gPSAke3NhZmVEYXRhfTs8L3NjcmlwdD5gO1xuXG4gICAgICAgICAgY29uc3QgaHRtbCA9IHRlbXBsYXRlXG4gICAgICAgICAgICAucmVwbGFjZSgnPCEtLXNzci1oZWFkLS0+Jywgc2VvSGVhZClcbiAgICAgICAgICAgIC5yZXBsYWNlKCc8IS0tc3NyLWJvZHktLT4nLCBhcHBIdG1sKTtcblxuICAgICAgICAgIHJlcy5zdGF0dXNDb2RlID0gc3NyRGF0YS5zdGF0dXMgPT09IDQwNCA/IDQwNCA6IDIwMDtcbiAgICAgICAgICByZXMuc2V0SGVhZGVyKCdDb250ZW50LVR5cGUnLCAndGV4dC9odG1sJyk7XG4gICAgICAgICAgcmVzLmVuZChodG1sKTtcbiAgICAgICAgICAvLyBjb25zb2xlLmxvZyhgW1ZpdGUgRGV2IFNTUl0gUmVuZGVyZWQgJHt1cmx9IHN1Y2Nlc3NmdWxseSAoJHthcHBIdG1sLmxlbmd0aH0gY2hhcnMpYCk7XG4gICAgICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgICAgIGNvbnNvbGUuZXJyb3IoYFtWaXRlIERldiBTU1JdIFJlbmRlciBlcnJvciBmb3IgJHt1cmx9OmAsIGVycik7XG4gICAgICAgICAgLy8gT25seSBmYWxsIGJhY2sgdG8gdW5yZW5kZXJlZCB0ZW1wbGF0ZSBvbiBhY3R1YWwgcmVuZGVyaW5nIGNyYXNoXG4gICAgICAgICAgbGV0IHRlbXBsYXRlID0gZnMucmVhZEZpbGVTeW5jKHBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICdpbmRleC5odG1sJyksICd1dGYtOCcpO1xuICAgICAgICAgIHRlbXBsYXRlID0gYXdhaXQgc2VydmVyLnRyYW5zZm9ybUluZGV4SHRtbCh1cmwsIHRlbXBsYXRlKTtcbiAgICAgICAgICByZXMuc3RhdHVzQ29kZSA9IDUwMDtcbiAgICAgICAgICByZXMuc2V0SGVhZGVyKCdDb250ZW50LVR5cGUnLCAndGV4dC9odG1sJyk7XG4gICAgICAgICAgcmVzLmVuZCh0ZW1wbGF0ZSk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH1cbiAgfTtcbn1cblxuLy8gaHR0cHM6Ly92aXRlanMuZGV2L2NvbmZpZy9cbmV4cG9ydCBkZWZhdWx0IGRlZmluZUNvbmZpZyh7XG4gIHBsdWdpbnM6IFtyZWFjdCgpLCB0YWlsd2luZGNzcygpLCByZWFjdFJvdXRlclNzckZpeFBsdWdpbigpLCB2aXRlRGV2U3NyUGx1Z2luKCldLFxuICBzZXJ2ZXI6IHtcbiAgICBob3N0OiBcIjAuMC4wLjBcIixcbiAgICBwb3J0OiAzMDEzLFxuICAgIGFsbG93ZWRIb3N0czogW1xuICAgICAgXCJ3d3cuaWJjbWFydC5jb21cIixcbiAgICAgIFwiaWJjbWFydC5jb21cIlxuICAgIF0sXG4gICAgcHJveHk6IHtcbiAgICAgICcvYXBpJzoge1xuICAgICAgICB0YXJnZXQ6ICdodHRwOi8vbG9jYWxob3N0OjUwMDEnLFxuICAgICAgICBjaGFuZ2VPcmlnaW46IHRydWUsXG4gICAgICAgIHNlY3VyZTogZmFsc2UsXG4gICAgICB9LFxuICAgICAgJy91cGxvYWRzJzoge1xuICAgICAgICB0YXJnZXQ6ICdodHRwOi8vbG9jYWxob3N0OjUwMDEnLFxuICAgICAgICBjaGFuZ2VPcmlnaW46IHRydWUsXG4gICAgICAgIHNlY3VyZTogZmFsc2UsXG4gICAgICB9XG4gICAgfVxuICB9LFxuICBidWlsZDoge1xuICAgIG91dERpcjogJ2Rpc3QnLFxuICAgIHNzcjogcHJvY2Vzcy5lbnYuVklURV9TU1JfQlVJTEQgPT09ICd0cnVlJ1xuICB9LFxuICBzc3I6IHtcbiAgICBub0V4dGVybmFsOiAvcmVhY3Qtcm91dGVyL1xuICB9XG59KVxuIl0sCiAgIm1hcHBpbmdzIjogIjtBQUF1USxTQUFTLG9CQUFvQjtBQUNwUyxPQUFPLFdBQVc7QUFDbEIsT0FBTyxpQkFBaUI7QUFDeEIsT0FBTyxVQUFVO0FBQ2pCLE9BQU8sUUFBUTtBQUNmLE9BQU8sV0FBVztBQUxsQixJQUFNLG1DQUFtQztBQU96QyxJQUFNLFNBQVMsUUFBUSxJQUFJLGFBQWE7QUFDeEMsSUFBTSxR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
