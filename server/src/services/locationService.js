import maxmind from 'maxmind';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.resolve(__dirname, '../data/GeoLite2-City.mmdb');

let lookupInstance = null;
let initPromise = null;

/**
 * Initializes the MaxMind lookup reader once and caches it.
 */
export async function initLookup() {
  if (lookupInstance) return lookupInstance;
  if (initPromise) return initPromise;

  initPromise = maxmind.open(dbPath)
    .then((reader) => {
      lookupInstance = reader;
      return reader;
    })
    .catch((err) => {
      console.error('Failed to initialize MaxMind GeoLite2 reader:', err);
      initPromise = null;
      throw err;
    });

  return initPromise;
}

/**
 * Clean and normalize client IP.
 */
export function getClientIp(req) {
  let ip = '';
  
  if (req.headers['cf-connecting-ip']) {
    ip = req.headers['cf-connecting-ip'];
  } else if (req.headers['x-forwarded-for']) {
    const parts = req.headers['x-forwarded-for'].split(',');
    ip = parts[0].trim();
  } else if (req.headers['x-real-ip']) {
    ip = req.headers['x-real-ip'];
  } else if (req.socket && req.socket.remoteAddress) {
    ip = req.socket.remoteAddress;
  }
  
  if (ip && ip.startsWith('::ffff:')) {
    ip = ip.substring(7);
  }
  
  return ip;
}

/**
 * Check if the given IP address is a private, loopback, or invalid IP.
 */
export function isPrivateOrLocalIp(ip) {
  if (!ip) return true;
  
  const cleanIp = ip.trim();
  
  if (cleanIp === 'localhost' || cleanIp === '::1' || cleanIp === '0.0.0.0') {
    return true;
  }
  
  const ipv4Pattern = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
  const match = cleanIp.match(ipv4Pattern);
  if (match) {
    const parts = match.slice(1).map(Number);
    if (parts.some(p => p > 255)) return true;
    
    if (parts[0] === 127) return true;
    if (parts[0] === 10) return true;
    if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
    if (parts[0] === 192 && parts[1] === 168) return true;
    if (parts[0] === 169 && parts[1] === 254) return true;
    
    return false;
  }
  
  const lowerIp = cleanIp.toLowerCase();
  if (lowerIp.startsWith('fe80:') || lowerIp.startsWith('fc00:') || lowerIp.startsWith('fd00:')) {
    return true;
  }
  
  return false;
}

/**
 * Looks up geolocation data for an IP.
 */
export async function getLocationFromIP(ip) {
  const reader = await initLookup();
  const geoData = reader.get(ip);
  if (!geoData) return null;

  const countryCode = geoData.country?.iso_code || '';
  const countryName = geoData.country?.names?.en || '';
  
  const subdivisions = geoData.subdivisions || [];
  const state = subdivisions[0]?.names?.en || '';
  
  const city = geoData.city?.names?.en || '';
  const postalCode = geoData.postal?.code || '';
  const latitude = geoData.location?.latitude || null;
  const longitude = geoData.location?.longitude || null;
  const timezone = geoData.location?.time_zone || '';

  return {
    ip,
    country: {
      code: countryCode,
      name: countryName
    },
    state,
    city,
    postalCode,
    latitude,
    longitude,
    timezone
  };
}
