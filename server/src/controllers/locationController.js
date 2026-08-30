import pool from '../config/db.js';
import { getClientIp, isPrivateOrLocalIp, getLocationFromIP } from '../services/locationService.js';


// In-memory cache for geocoding queries & coordinates (TTL: 1 hour)
const geocodeCache = new Map();
const CACHE_TTL_MS = 60 * 60 * 1000;

const getCached = (key) => {
  const cached = geocodeCache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }
  if (cached) geocodeCache.delete(key);
  return null;
};

const setCache = (key, data) => {
  if (geocodeCache.size > 500) {
    const firstKey = geocodeCache.keys().next().value;
    geocodeCache.delete(firstKey);
  }
  geocodeCache.set(key, { data, timestamp: Date.now() });
};

// Helper: Normalize Nominatim Address Object into Marketplace Location Standard
const normalizeNominatimAddress = (item) => {
  const addr = item.address || {};
  const houseNo = addr.house_number || addr.building || addr.flat || '';
  const street = addr.road || addr.street || addr.lane || addr.suburb || '';
  const area = addr.neighbourhood || addr.suburb || addr.residential || addr.locality || addr.quarter || '';
  const city = addr.city || addr.town || addr.village || addr.municipality || addr.county || '';
  const district = addr.state_district || addr.district || addr.county || city;
  const state = addr.state || addr.region || '';
  const country = addr.country || 'India';
  const pincode = addr.postcode || addr.postal_code || '';

  const displayParts = [houseNo, street, area, city, state, pincode].filter(Boolean);
  const formattedAddress = displayParts.length > 0 ? displayParts.join(', ') : item.display_name;

  return {
    latitude: parseFloat(item.lat),
    longitude: parseFloat(item.lon),
    house_no: houseNo,
    street: street,
    area: area,
    city: city,
    district: district,
    state: state,
    country: country,
    pincode: pincode,
    formatted_address: formattedAddress || item.display_name,
    raw_display_name: item.display_name,
    place_id: item.place_id
  };
};

/**
 * Search Location via Nominatim API Proxy
 * GET /api/location/search?q=chennai
 */
export const searchLocation = async (req, res, next) => {
  try {
    const { q } = req.query;
    if (!q || q.trim().length < 2) {
      return res.status(200).json({ success: true, results: [] });
    }

    const queryStr = q.trim().toLowerCase();
    const cacheKey = `search:${queryStr}`;
    const cachedResults = getCached(cacheKey);

    if (cachedResults) {
      return res.status(200).json({ success: true, results: cachedResults, source: 'cache' });
    }

    const searchUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q.trim())}&addressdetails=1&limit=8`;

    const response = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'MarketplaceEnterpriseApp/1.0 (contact@marketplace.local)'
      }
    });

    if (!response.ok) {
      throw new Error(`Nominatim returned status ${response.status}`);
    }

    const data = await response.json();
    const results = (data || []).map(normalizeNominatimAddress);
    setCache(cacheKey, results);

    res.status(200).json({ success: true, results, source: 'nominatim' });
  } catch (error) {
    console.error('Location search error:', error.message);
    res.status(200).json({ success: true, results: [], error: 'Failed to search location via OpenStreetMap' });
  }
};

/**
 * Reverse Geocode via Nominatim API Proxy
 * GET /api/location/reverse?lat=13.0827&lng=80.2707
 */
export const reverseGeocode = async (req, res, next) => {
  try {
    const { lat, lng } = req.query;
    if (!lat || !lng) {
      return res.status(400).json({ success: false, message: 'Latitude and Longitude are required' });
    }

    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);

    const cacheKey = `reverse:${latitude.toFixed(4)},${longitude.toFixed(4)}`;
    const cachedResult = getCached(cacheKey);

    if (cachedResult) {
      return res.status(200).json({ success: true, location: cachedResult, source: 'cache' });
    }

    const reverseUrl = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1`;

    const response = await fetch(reverseUrl, {
      headers: {
        'User-Agent': 'MarketplaceEnterpriseApp/1.0 (contact@marketplace.local)'
      }
    });

    if (!response.ok) {
      throw new Error(`Nominatim returned status ${response.status}`);
    }

    const data = await response.json();

    if (!data || data.error) {
      return res.status(404).json({ success: false, message: 'Location address not found' });
    }

    const location = normalizeNominatimAddress(data);
    setCache(cacheKey, location);

    res.status(200).json({ success: true, location, source: 'nominatim' });
  } catch (error) {
    console.error('Reverse geocode error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to reverse geocode location' });
  }
};

/**
 * Get Vendor Map Points (for Admin Map & Customer Store Directory)
 * GET /api/location/vendor-map-points
 */
export const getVendorMapPoints = async (req, res, next) => {
  try {
    const [vendors] = await pool.query(`
      SELECT 
        vp.id,
        vp.user_id,
        vp.business_name,
        vp.business_logo,
        vp.business_address,
        vp.city,
        vp.state,
        vp.pincode,
        vp.latitude,
        vp.longitude,
        vp.formatted_address,
        vp.whatsapp_number,
        vp.working_hours,
        u.name as owner_name,
        u.email as owner_email,
        u.phone as owner_phone
      FROM vendor_profiles vp
      JOIN users u ON vp.user_id = u.id
      WHERE vp.latitude IS NOT NULL AND vp.longitude IS NOT NULL
    `);

    res.status(200).json({ success: true, vendors });
  } catch (error) {
    next(error);
  }
};

/**
 * Detect client IP and return approximate location
 * GET /api/location
 */
export const detectLocation = async (req, res, next) => {
  try {
    let ip = getClientIp(req);
    
    // Check if the IP is localhost/private
    if (isPrivateOrLocalIp(ip)) {
      try {
        // Fallback: Fetch external public IP of the current machine (only for local development)
        const ipifyRes = await fetch('https://api.ipify.org?format=json', { signal: AbortSignal.timeout(3000) });
        if (ipifyRes.ok) {
          const data = await ipifyRes.json();
          if (data && data.ip && !isPrivateOrLocalIp(data.ip)) {
            ip = data.ip;
          }
        }
      } catch (err) {
        console.warn('Could not retrieve public IP fallback for local development:', err.message);
      }
    }

    // If still local/private, return LOCAL_IP error
    if (isPrivateOrLocalIp(ip)) {
      return res.status(200).json({
        success: false,
        code: 'LOCAL_IP',
        message: 'Public IP location is unavailable in local development.'
      });
    }

    const geo = await getLocationFromIP(ip);
    if (!geo) {
      return res.status(200).json({
        success: false,
        message: 'Failed to look up location for the client IP.'
      });
    }

    res.status(200).json({
      success: true,
      data: {
        ip: geo.ip,
        country: geo.country.name,
        countryCode: geo.country.code,
        state: geo.state,
        city: geo.city,
        postalCode: geo.postalCode,
        latitude: geo.latitude,
        longitude: geo.longitude,
        timezone: geo.timezone
      }
    });
  } catch (error) {
    console.error('IP geocoding error:', error.message);
    res.status(200).json({
      success: false,
      message: 'Error looking up location from IP.'
    });
  }
};

