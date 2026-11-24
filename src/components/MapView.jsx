import { useEffect, useRef } from 'react';
import L from 'leaflet';
import { STATION } from '../constants';

// Fix Vite asset URL resolution for Leaflet default icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

export default function MapView() {
  const element = useRef(null);
  const mapRef = useRef(null);

  useEffect(() => {
    const container = element.current;

    if (!container || mapRef.current) {
      return;
    }

    let map;

    try {
      map = L.map(container, {
        scrollWheelZoom: false,
        zoomControl: true,
        preferCanvas: true
      }).setView(
        [STATION.lat, STATION.lng],
        14
      );

      mapRef.current = map;

      L.tileLayer(
        'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        {
          maxZoom: 19,
          attribution: '&copy; OpenStreetMap contributors'
        }
      ).addTo(map);

      const marker = L.marker([
        STATION.lat,
        STATION.lng
      ]).addTo(map);

      marker.bindPopup(`
        <strong>${STATION.name}</strong><br/>
        CPCB monitoring station<br/>
        Data source: OpenAQ
      `);

      const resizeMap = () => {
        if (map && mapRef.current === map) {
          map.invalidateSize({
            animate: false,
            pan: false
          });
        }
      };

      const observer = new ResizeObserver(resizeMap);
      observer.observe(container);

      map.whenReady(() => {
        requestAnimationFrame(() => {
          resizeMap();
        });
      });

      return () => {
        observer.disconnect();

        if (map) {
          map.remove();
        }

        if (mapRef.current === map) {
          mapRef.current = null;
        }
      };
    } catch (error) {
      console.error('AirMesh map initialization failed:', error);

      if (map) {
        map.remove();
      }

      mapRef.current = null;
    }
  }, []);

  return (
    <div
      ref={element}
      className="map-canvas"
      role="region"
      aria-label="Kadri air quality monitoring station interactive map"
    />
  );
}
