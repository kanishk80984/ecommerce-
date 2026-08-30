import React, { useEffect, useRef } from 'react';


import { MapPin, Phone, MessageSquare, ExternalLink } from 'lucide-react';
import { getImageUrl } from '../../utils/imageUrl';

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

const createCustomPopupHtml = (item) => {

  return `
    <div style="min-width: 200px; padding: 4px;">
      <div style="display: flex; items-center; gap: 10px; margin-bottom: 8px;">
        <img src="${getImageUrl(item.business_logo || item.logo)}" style="width: 42px; height: 42px; border-radius: 8px; object-fit: cover; border: 1px solid #e5e7eb;" />
        <div>
          <h4 style="margin:0; font-size: 13px; font-weight: 800; color: #111827;">${item.business_name || item.name || 'Store'}</h4>
          <p style="margin:2px 0 0 0; font-size: 10px; color: #6b7280;">${item.city || ''}, ${item.state || ''}</p>
        </div>
      </div>
      <p style="margin: 4px 0 8px 0; font-size: 11px; color: #374151; line-height: 1.3;">
        ${item.formatted_address || item.business_address || 'No address provided'}
      </p>
      ${item.owner_phone ? `<div style="font-size: 11px; color: #2563eb; font-weight: 700; display:flex; items-center; gap: 4px;">📞 ${item.owner_phone}</div>` : ''}
      <a href="https://www.openstreetmap.org/directions?engine=fossgis_osrm_car&route=;${item.latitude},${item.longitude}" target="_blank" rel="noreferrer" style="display: inline-block; margin-top: 6px; font-size: 10px; font-weight: 700; color: #059669; text-decoration: none;">
        Get Directions ↗
      </a>
    </div>
  `;
};

const MapView = ({
  markers = [], // Array of { id, latitude, longitude, business_name, business_address, etc. }
  center = null,
  zoom = 13,
  height = "450px",
  darkMode = false
}) => {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);

  useEffect(() => {
    let active = true;
    const initMap = async () => {
      if (!mapRef.current) return;
      if (!L) await initLeaflet();
      if (!active || typeof window === 'undefined') return;

      const initialCenter = center || (markers.length > 0 && markers[0].latitude && markers[0].longitude
        ? [parseFloat(markers[0].latitude), parseFloat(markers[0].longitude)]
        : [13.0827, 80.2707]);

      if (!mapInstanceRef.current) {
        const map = L.map(mapRef.current, {
          center: initialCenter,
          zoom: zoom
        });

        const tileLayerUrl = darkMode
          ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
          : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

        L.tileLayer(tileLayerUrl, {
          maxZoom: 19,
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        }).addTo(map);

        mapInstanceRef.current = map;
      }

      const map = mapInstanceRef.current;

      // Clear existing markers
      map.eachLayer((layer) => {
        if (layer instanceof L.Marker) {
          map.removeLayer(layer);
        }
      });

      // Add new markers
      if (markers && markers.length > 0) {
        const bounds = L.latLngBounds();
        let addedCount = 0;

        markers.forEach(item => {
          if (item.latitude && item.longitude) {
            const lat = parseFloat(item.latitude);
            const lng = parseFloat(item.longitude);
            if (!isNaN(lat) && !isNaN(lng)) {
              const marker = L.marker([lat, lng], { icon: customPinIcon }).addTo(map);
              marker.bindPopup(createCustomPopupHtml(item), {
                maxWidth: 250,
                className: 'custom-popup'
              });
              bounds.extend([lat, lng]);
              addedCount++;
            }
          }
        });

        if (addedCount > 0 && !center) {
          map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
        }
      }
    };
    
    initMap();
    
    return () => { active = false; };
  }, [markers, center, zoom, darkMode]);

  return (
    <div className="relative w-full rounded-2xl overflow-hidden shadow-lg border border-gray-200 dark:border-gray-800">
      <div ref={mapRef} style={{ height }} className="w-full" />
    </div>
  );
};

export default MapView;
