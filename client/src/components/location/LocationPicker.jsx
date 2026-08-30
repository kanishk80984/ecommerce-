import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Search, MapPin, Navigation, Compass, AlertCircle, CheckCircle, 
  Loader2, X, RefreshCw, Layers, ZoomIn, ZoomOut
} from 'lucide-react';


import useNominatimGeocoding from '../../hooks/useNominatimGeocoding';
import useGeolocation from '../../hooks/useGeolocation';

let L = null;
let customPinIcon = null;

const initLeaflet = async () => {
  if (typeof window === 'undefined' || L) return;
  const leafletPkg = await import('leaflet');
  L = leafletPkg.default || leafletPkg;
  await import('leaflet/dist/leaflet.css');
  
  delete L.Icon.Default.prototype._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  });

  // Custom Red Pin Icon for Marketplace
  customPinIcon = L.divIcon({
    className: 'custom-map-pin',
    html: `<div style="
      background: #ef4444;
      width: 36px;
      height: 36px;
      border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg);
      border: 3px solid white;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      display: flex;
      align-items: center;
      justify-content: center;
    ">
      <div style="
        width: 12px;
        height: 12px;
        background: white;
        border-radius: 50%;
        transform: rotate(45deg);
      "></div>
    </div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 36],
    popupAnchor: [0, -36]
  });
};

const DEFAULT_CENTER = { lat: 13.0827, lng: 80.2707 }; // Chennai, India default

const LocationPicker = ({
  initialLocation = null,
  onSave,
  onCancel,
  darkMode = false,
  title = "Select Delivery / Shop Location",
  subtitle = "Search or drag the marker to your precise location on OpenStreetMap"
}) => {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerInstanceRef = useRef(null);

  // Coordinates & Address Form States
  const [coords, setCoords] = useState(() => {
    if (initialLocation?.latitude && initialLocation?.longitude) {
      return { lat: parseFloat(initialLocation.latitude), lng: parseFloat(initialLocation.longitude) };
    }
    return DEFAULT_CENTER;
  });

  const [addressDetails, setAddressDetails] = useState({
    house_no: initialLocation?.house_no || '',
    street: initialLocation?.street || '',
    area: initialLocation?.area || '',
    city: initialLocation?.city || '',
    district: initialLocation?.district || '',
    state: initialLocation?.state || '',
    country: initialLocation?.country || 'India',
    pincode: initialLocation?.pincode || initialLocation?.zip || '',
    formatted_address: initialLocation?.formatted_address || initialLocation?.street || ''
  });

  const [isReverseLoading, setIsReverseLoading] = useState(false);
  const [isMapReady, setIsMapReady] = useState(false);

  // Hooks
  const { query, setQuery, suggestions, loading: searchLoading, clearSuggestions, reverseGeocodeCoords } = useNominatimGeocoding();
  const { getCurrentLocation, loading: geoLoading, error: geoError } = useGeolocation();

  // Reverse geocode when coordinates change
  const handleCoordsChange = useCallback(async (lat, lng, isInitial = false) => {
    setCoords({ lat, lng });

    if (!isInitial) {
      setIsReverseLoading(true);
      const loc = await reverseGeocodeCoords(lat, lng);
      setIsReverseLoading(false);

      if (loc) {
        setAddressDetails(prev => ({
          ...prev,
          house_no: loc.house_no || prev.house_no,
          street: loc.street || prev.street,
          area: loc.area || prev.area,
          city: loc.city || prev.city,
          district: loc.district || prev.district,
          state: loc.state || prev.state,
          country: loc.country || prev.country,
          pincode: loc.pincode || prev.pincode,
          formatted_address: loc.formatted_address
        }));
      }
    }
  }, [reverseGeocodeCoords]);

  // Initialize Leaflet Map
  useEffect(() => {
    let active = true;
    const initMap = async () => {
      if (!mapContainerRef.current || mapInstanceRef.current) return;
      if (!L) await initLeaflet();
      if (!active || typeof window === 'undefined') return;

      const map = L.map(mapContainerRef.current, {
        center: [coords.lat, coords.lng],
        zoom: 15,
        zoomControl: false
      });

      // OpenStreetMap Tile Layer
      const tileLayerUrl = darkMode
        ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
        : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

      L.tileLayer(tileLayerUrl, {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      }).addTo(map);

      // Draggable Marker
      const marker = L.marker([coords.lat, coords.lng], {
        icon: customPinIcon,
        draggable: true
      }).addTo(map);

      // Marker Drag End Handler
      marker.on('dragend', (e) => {
        const position = e.target.getLatLng();
        handleCoordsChange(position.lat, position.lng);
      });

      // Map Click Handler
      map.on('click', (e) => {
        const { lat, lng } = e.latlng;
        marker.setLatLng([lat, lng]);
        handleCoordsChange(lat, lng);
      });

      mapInstanceRef.current = map;
      markerInstanceRef.current = marker;
      setIsMapReady(true);
      
      // Add Zoom Control at bottom right
      L.control.zoom({ position: 'bottomright' }).addTo(map);
    };

    initMap();

    return () => {
      active = false;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []); // Run once on mount

  // Sync Marker & Center when coords update programmatically (e.g. search or geolocation)
  const panToCoords = (lat, lng, zoomLevel = 16) => {
    if (mapInstanceRef.current && markerInstanceRef.current) {
      mapInstanceRef.current.setView([lat, lng], zoomLevel);
      markerInstanceRef.current.setLatLng([lat, lng]);
    }
  };

  // Handle Search Result Selection
  const handleSelectSuggestion = (item) => {
    clearSuggestions();
    setQuery('');
    const lat = item.latitude;
    const lng = item.longitude;

    setCoords({ lat, lng });
    panToCoords(lat, lng, 16);

    setAddressDetails({
      house_no: item.house_no,
      street: item.street,
      area: item.area,
      city: item.city,
      district: item.district,
      state: item.state,
      country: item.country,
      pincode: item.pincode,
      formatted_address: item.formatted_address
    });
  };

  // Handle "Use My Current Location"
  const handleUseCurrentLocation = async () => {
    try {
      const pos = await getCurrentLocation();
      if (pos) {
        setCoords({ lat: pos.latitude, lng: pos.longitude });
        panToCoords(pos.latitude, pos.longitude, 17);
        await handleCoordsChange(pos.latitude, pos.longitude);
      }
    } catch (err) {
      // Error handled by hook
    }
  };

  // Zoom controls
  const handleZoomIn = () => mapInstanceRef.current?.zoomIn();
  const handleZoomOut = () => mapInstanceRef.current?.zoomOut();

  // Save handler
  const handleSaveLocation = (e) => {
    e?.preventDefault();
    if (!addressDetails.city || !addressDetails.state) {
      alert('Please ensure City and State are filled.');
      return;
    }

    const payload = {
      latitude: coords.lat,
      longitude: coords.lng,
      house_no: addressDetails.house_no,
      street: addressDetails.street,
      area: addressDetails.area,
      city: addressDetails.city,
      district: addressDetails.district,
      state: addressDetails.state,
      country: addressDetails.country,
      pincode: addressDetails.pincode,
      formatted_address: addressDetails.formatted_address || `${addressDetails.street}, ${addressDetails.city}, ${addressDetails.state} ${addressDetails.pincode}`
    };

    if (onSave) onSave(payload);
  };

  return (
    <div className={`flex flex-col h-full rounded-2xl overflow-hidden shadow-2xl border ${darkMode ? 'bg-gray-900 text-white border-gray-800' : 'bg-white text-gray-900 border-gray-200'}`}>
      
      {/* Header */}
      <div className={`hidden md:flex px-6 py-4 border-b items-center justify-between ${darkMode ? 'bg-gray-800/80 border-gray-800' : 'bg-gray-50 border-gray-100'}`}>
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-500/10 text-blue-600 rounded-xl">
            <MapPin className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-extrabold text-base leading-tight">{title}</h3>
            <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>
          </div>
        </div>
        {onCancel && (
          <button onClick={onCancel} className="p-2 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all">
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Main Grid: Map & Form */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 min-h-[500px]">

        {/* Map Panel (7 cols) */}
        <div className="lg:col-span-7 relative flex flex-col min-h-[350px] bg-gray-100 dark:bg-gray-950">
          
          {/* Top Floating Search Bar */}
          <div className="absolute top-4 left-4 right-16 md:right-4 z-[1000]">
            <div className="relative shadow-lg rounded-xl overflow-visible">
              <div className={`flex items-center px-4 py-3 rounded-xl border ${darkMode ? 'bg-gray-900 border-gray-700 text-white' : 'bg-white border-gray-200 text-gray-900'}`}>
                <Search className="w-4 h-4 text-gray-400 flex-shrink-0 mr-3" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search landmark, street, city, pincode..."
                  className="w-full bg-transparent text-sm focus:outline-none placeholder-gray-400 font-medium"
                />
                {searchLoading && <Loader2 className="w-4 h-4 text-blue-500 animate-spin flex-shrink-0 ml-2" />}
                {query && (
                  <button onClick={() => { setQuery(''); clearSuggestions(); }} className="text-gray-400 hover:text-gray-600 ml-2">
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Suggestions Dropdown */}
              {suggestions.length > 0 && (
                <div className={`absolute top-full left-0 right-0 mt-2 rounded-xl shadow-2xl border max-h-60 overflow-y-auto z-[1001] divide-y ${darkMode ? 'bg-gray-900 border-gray-700 divide-gray-800' : 'bg-white border-gray-200 divide-gray-100'}`}>
                  {suggestions.map((item, idx) => (
                    <button
                      key={item.place_id || idx}
                      type="button"
                      onClick={() => handleSelectSuggestion(item)}
                      className={`w-full text-left p-3.5 flex items-start gap-3 transition-colors ${darkMode ? 'hover:bg-gray-800' : 'hover:bg-blue-50/50'}`}
                    >
                      <MapPin className="w-4 h-4 text-blue-500 flex-shrink-0 mt-1" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold truncate">{item.formatted_address}</p>
                        <p className="text-[10px] text-gray-400 truncate mt-0.5">{item.city}, {item.state} {item.pincode}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Mobile Close Button */}
          {onCancel && (
            <button 
              onClick={onCancel} 
              className="md:hidden absolute top-4 right-4 z-[1000] p-3 bg-white text-gray-500 rounded-xl shadow-lg border border-gray-200 hover:bg-gray-50 flex items-center justify-center"
            >
              <X className="w-4 h-4" />
            </button>
          )}

          {/* Leaflet Map Canvas */}
          <div ref={mapContainerRef} className="w-full h-full min-h-[350px] z-1" />

          {/* Map Controls (Right Side Floating) */}
          <div className="absolute bottom-4 right-4 z-[1000] flex flex-col gap-2">
            <button
              type="button"
              onClick={handleUseCurrentLocation}
              disabled={geoLoading}
              className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xl transition-all disabled:opacity-50"
              title="Locate Me"
            >
              {geoLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Navigation className="w-4 h-4" />}
              <span>{geoLoading ? 'Locating...' : 'Use Current Location'}</span>
            </button>

            <div className="flex items-center bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-xl overflow-hidden self-end">
              <button onClick={handleZoomIn} className="p-2.5 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                <ZoomIn className="w-4 h-4" />
              </button>
              <div className="w-px h-4 bg-gray-200 dark:bg-gray-800" />
              <button onClick={handleZoomOut} className="p-2.5 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                <ZoomOut className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Reverse Geocode Loading Badge */}
          {isReverseLoading && (
            <div className="absolute bottom-4 left-4 z-[1000] bg-gray-900/90 text-white text-xs font-bold px-3 py-2 rounded-xl backdrop-blur flex items-center gap-2 shadow-xl">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-400" />
              <span>Updating address...</span>
            </div>
          )}

          {/* Geolocation Error Toast */}
          {geoError && (
            <div className="absolute top-20 left-4 right-4 z-[1000] bg-red-500 text-white text-xs font-semibold px-4 py-3 rounded-xl shadow-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span className="flex-1">{geoError}</span>
            </div>
          )}
        </div>

        {/* Address Form Panel (5 cols) */}
        <div className={`lg:col-span-5 p-6 flex flex-col justify-between overflow-y-auto ${darkMode ? 'bg-gray-900' : 'bg-white'}`}>
          <form onSubmit={handleSaveLocation} className="space-y-4">
            
            <div className="flex items-center justify-between border-b pb-3 border-gray-100 dark:border-gray-800">
              <span className="text-xs font-extrabold uppercase tracking-wider text-gray-400">Selected Address Details</span>
              <span className="text-[10px] font-mono text-gray-400">
                {coords.lat.toFixed(4)}, {coords.lng.toFixed(4)}
              </span>
            </div>

            {/* Formatted Address Box */}
            <div className="p-3 bg-blue-50/50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/40 rounded-xl space-y-1">
              <p className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">Formatted Address</p>
              <p className="text-xs text-gray-700 dark:text-gray-300 font-medium leading-relaxed">
                {addressDetails.formatted_address || 'Drag pin or search above to select address'}
              </p>
            </div>

            {/* Inputs Grid */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">House / Flat No</label>
                <input
                  type="text"
                  value={addressDetails.house_no}
                  onChange={(e) => setAddressDetails({ ...addressDetails, house_no: e.target.value })}
                  placeholder="e.g. Flat 302, Green Towers"
                  className={`w-full border rounded-xl p-2.5 text-xs font-semibold focus:outline-none focus:border-blue-500 ${darkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-gray-50 border-gray-200'}`}
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">Street / Landmark</label>
                <input
                  type="text"
                  value={addressDetails.street}
                  onChange={(e) => setAddressDetails({ ...addressDetails, street: e.target.value })}
                  placeholder="e.g. MG Road, Near Park"
                  className={`w-full border rounded-xl p-2.5 text-xs font-semibold focus:outline-none focus:border-blue-500 ${darkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-gray-50 border-gray-200'}`}
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">Area / Suburb</label>
                <input
                  type="text"
                  value={addressDetails.area}
                  onChange={(e) => setAddressDetails({ ...addressDetails, area: e.target.value })}
                  placeholder="e.g. Anna Nagar"
                  className={`w-full border rounded-xl p-2.5 text-xs font-semibold focus:outline-none focus:border-blue-500 ${darkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-gray-50 border-gray-200'}`}
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">City *</label>
                <input
                  type="text"
                  required
                  value={addressDetails.city}
                  onChange={(e) => setAddressDetails({ ...addressDetails, city: e.target.value })}
                  placeholder="e.g. Chennai"
                  className={`w-full border rounded-xl p-2.5 text-xs font-semibold focus:outline-none focus:border-blue-500 ${darkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-gray-50 border-gray-200'}`}
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">State *</label>
                <input
                  type="text"
                  required
                  value={addressDetails.state}
                  onChange={(e) => setAddressDetails({ ...addressDetails, state: e.target.value })}
                  placeholder="e.g. Tamil Nadu"
                  className={`w-full border rounded-xl p-2.5 text-xs font-semibold focus:outline-none focus:border-blue-500 ${darkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-gray-50 border-gray-200'}`}
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">Pincode *</label>
                <input
                  type="text"
                  required
                  value={addressDetails.pincode}
                  onChange={(e) => setAddressDetails({ ...addressDetails, pincode: e.target.value })}
                  placeholder="e.g. 600001"
                  className={`w-full border rounded-xl p-2.5 text-xs font-semibold focus:outline-none focus:border-blue-500 ${darkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-gray-50 border-gray-200'}`}
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-end gap-3">
              {onCancel && (
                <button
                  type="button"
                  onClick={onCancel}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  Cancel
                </button>
              )}
              <button
                type="submit"
                className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white text-xs font-extrabold rounded-xl shadow-lg shadow-blue-500/20 transition-all flex items-center gap-2"
              >
                <CheckCircle className="w-4 h-4" />
                Confirm & Save Location
              </button>
            </div>

          </form>
        </div>

      </div>

    </div>
  );
};

export default LocationPicker;
