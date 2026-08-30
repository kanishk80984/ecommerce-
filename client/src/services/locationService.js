import api from './api';

export const locationService = {
  /**
   * Automatically detect user's location via IP
   */
  async detectLocation() {
    try {
      const res = await api.get('/location');
      return res.data;
    } catch (error) {
      console.error('Failed to detect location:', error);
      return { success: false, message: error.message };
    }
  },

  /**
   * Search locations using Nominatim OpenStreetMap Proxy
   */

  async search(query) {
    if (!query || query.trim().length < 2) return [];
    try {
      const res = await api.get('/location/search', {
        params: { q: query }
      });
      return res.data.results || [];
    } catch (error) {
      console.error('Failed to search address via OpenStreetMap:', error);
      return [];
    }
  },

  /**
   * Reverse geocode coordinates to structured address
   */
  async reverse(lat, lng) {
    if (!lat || !lng) return null;
    try {
      const res = await api.get('/location/reverse', {
        params: { lat, lng }
      });
      return res.data.location || null;
    } catch (error) {
      console.error('Failed to reverse geocode coordinates:', error);
      return null;
    }
  },

  /**
   * Get all vendor store map points for Admin/Customer directory
   */
  async getVendorMapPoints() {
    try {
      const res = await api.get('/location/vendor-map-points');
      return res.data.vendors || [];
    } catch (error) {
      console.error('Failed to fetch vendor map points:', error);
      return [];
    }
  }
};

export default locationService;
