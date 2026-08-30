import { useState, useEffect, useRef, useCallback } from 'react';
import locationService from '../services/locationService';

/**
 * Custom hook for OpenStreetMap Nominatim Geocoding & Address Search
 */
export const useNominatimGeocoding = (initialQuery = '') => {
  const [query, setQuery] = useState(initialQuery);
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const debounceTimerRef = useRef(null);

  const performSearch = useCallback(async (searchTerm) => {
    if (!searchTerm || searchTerm.trim().length < 2) {
      setSuggestions([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const results = await locationService.search(searchTerm);
      setSuggestions(results);
    } catch (err) {
      setError('Unable to search address. Please check network connection.');
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      performSearch(query);
    }, 400);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [query, performSearch]);

  const reverseGeocodeCoords = useCallback(async (lat, lng) => {
    setLoading(true);
    setError(null);
    try {
      const location = await locationService.reverse(lat, lng);
      return location;
    } catch (err) {
      setError('Could not reverse geocode coordinates');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    query,
    setQuery,
    suggestions,
    loading,
    error,
    clearSuggestions: () => setSuggestions([]),
    reverseGeocodeCoords
  };
};

export default useNominatimGeocoding;
