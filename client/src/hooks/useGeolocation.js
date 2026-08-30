import { useState, useCallback } from 'react';

/**
 * Custom hook for HTML5 Geolocation API with permissions & error handling
 */
export const useGeolocation = () => {
  const [location, setLocation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const getCurrentLocation = useCallback(() => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        const err = 'Geolocation is not supported by your browser';
        setError(err);
        reject(err);
        return;
      }

      setLoading(true);
      setError(null);

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const coords = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy
          };
          setLocation(coords);
          setLoading(false);
          resolve(coords);
        },
        (err) => {
          let errorMsg = 'Failed to get current location';
          if (err.code === err.PERMISSION_DENIED) {
            errorMsg = 'Location permission denied. Please allow location access in your browser.';
          } else if (err.code === err.POSITION_UNAVAILABLE) {
            errorMsg = 'Location information is currently unavailable.';
          } else if (err.code === err.TIMEOUT) {
            errorMsg = 'Location request timed out. Please try again.';
          }
          setError(errorMsg);
          setLoading(false);
          reject(errorMsg);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 30000
        }
      );
    });
  }, []);

  return {
    location,
    loading,
    error,
    getCurrentLocation
  };
};

export default useGeolocation;
