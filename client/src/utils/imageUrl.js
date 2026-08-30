/**
 * Centralized utility to resolve backend image and asset URLs dynamically.
 * Automatically adapts between local development and live production (HTTPS / domain).
 */

export const getBaseBackendUrl = () => {
  const apiUrl = typeof import.meta !== 'undefined' ? import.meta.env?.VITE_API_URL : undefined;
  if (apiUrl) {
    if (apiUrl.startsWith('http')) {
      // e.g., "https://api.yourdomain.com/api" -> "https://api.yourdomain.com"
      // e.g., "http://10.119.181.173:5001/api" -> "http://10.119.181.173:5001"
      const cleaned = apiUrl.replace(/\/api\/?$/, '').replace(/\/$/, '');
      if (cleaned) return cleaned;
    } else {
      // For relative path e.g. "/api", return empty string to use relative asset routing
      return '';
    }
  }

  // Dynamic host/protocol detection from global context on server
  if (typeof window === 'undefined') {
    if (typeof globalThis !== 'undefined' && globalThis.__SSR_HOST__) {
      const host = globalThis.__SSR_HOST__; // e.g. "192.168.29.252:3013" or "localhost:3013"
      const protocol = globalThis.__SSR_PROTOCOL__ || 'http';
      const cleanHost = host.split(':')[0];
      
      // If we are serving locally on LAN or localhost, backend port is always 5001
      if (cleanHost === 'localhost' || cleanHost === '127.0.0.1' || /^192\.168\./.test(cleanHost) || /^10\./.test(cleanHost) || /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(cleanHost)) {
        return `${protocol}://${cleanHost}:5001`;
      }
      
      // For production (e.g. www.ibcmart.com), use the same host (reverse proxy setup)
      return `${protocol}://${host}`;
    }
    return 'http://localhost:5001';
  }

  // Fallback if running in browser
  if (typeof window !== 'undefined') {
    const isHttps = window.location.protocol === 'https:';
    const hostname = window.location.hostname;
    // If running on custom domain / port 80/443 without explicit port
    if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
      return `${window.location.protocol}//${hostname}${window.location.port && window.location.port !== '80' && window.location.port !== '443' && window.location.port !== '3011' ? `:${window.location.port}` : ':5001'}`;
    }
    return `http://${hostname}:5001`;
  }

  return 'http://localhost:5001';
};

export const getImageUrl = (rawPath) => {
  if (!rawPath) return '';

  let path = rawPath;
  if (Array.isArray(path)) {
    path = path[0] || '';
  }
  if (typeof path === 'string' && path.startsWith('[') && path.endsWith(']')) {
    try {
      const parsed = JSON.parse(path);
      if (Array.isArray(parsed) && parsed.length > 0) {
        path = parsed[0];
      }
    } catch { }
  }

  const strPath = String(path).replace(/[\[\]"]/g, '').replace(/\\/g, '/').trim();
  if (!strPath || strPath === 'null' || strPath === 'undefined') return '';

  // Data URLs and Blobs (previews)
  if (strPath.startsWith('data:') || strPath.startsWith('blob:')) {
    return strPath;
  }

  // If already a full external URL (e.g. Cloudinary, S3, external CDN)
  if (strPath.startsWith('http://') || strPath.startsWith('https://')) {
    // Cloudinary, S3, GCS, Spaces or non-local external URLs pass through directly
    if (strPath.includes('cloudinary.com') || strPath.includes('amazonaws.com') || strPath.includes('digitaloceanspaces.com') || strPath.includes('storage.googleapis.com')) {
      if (typeof window !== 'undefined' && window.location.protocol === 'https:' && strPath.startsWith('http://')) {
        return strPath.replace(/^http:\/\//, 'https://');
      }
      return strPath;
    }

    // Legacy absolute URL with local /uploads/ path
    if (strPath.includes('/uploads/')) {
      const baseBackend = getBaseBackendUrl();
      const uploadsIndex = strPath.indexOf('uploads/');
      const relativeUploadPath = strPath.substring(uploadsIndex);
      return `${baseBackend}/${relativeUploadPath}`;
    }

    // Other external URLs
    if (typeof window !== 'undefined' && window.location.protocol === 'https:' && strPath.startsWith('http://')) {
      return strPath.replace(/^http:\/\//, 'https://');
    }
    return strPath;
  }

  // Relative path e.g. "uploads/products/image.webp" or "/uploads/products/image.webp"
  const baseBackend = getBaseBackendUrl();
  const cleanPath = strPath.startsWith('/') ? strPath.substring(1) : strPath;
  return `${baseBackend}/${cleanPath}`;
};

export default getImageUrl;
