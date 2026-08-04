import React, { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default marker icons in Leaflet with bundlers
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

function MapEvents({ onChange, setCenter }: { onChange: (newPlace: string) => void, setCenter: (c: [number, number]) => void }) {
  const map = useMapEvents({
    click: async (e) => {
      const lat = e.latlng.lat;
      const lng = e.latlng.lng;
      setCenter([lat, lng]);
      map.flyTo([lat, lng], map.getZoom());

      try {
        const response = await fetch(`/api/reverse?lat=${lat}&lon=${lng}`);
        const data = await response.json();
        if (data && data.display_name) {
          onChange(data.display_name);
        } else {
          onChange(`${lat.toFixed(4)}, ${lng.toFixed(4)}`);
        }
      } catch (err) {
        console.error("Reverse geocoding error:", err);
        onChange(`${lat.toFixed(4)}, ${lng.toFixed(4)}`);
      }
    }
  });
  return null;
}

function MapUpdater({ center }: { center: [number, number] }) {
  const map = useMapEvents({});
  useEffect(() => {
    map.flyTo(center, 10);
  }, [center, map]);

  useEffect(() => {
    const observer = new ResizeObserver(() => {
      map.invalidateSize();
    });
    const container = map.getContainer();
    if (container) {
      observer.observe(container);
    }
    return () => observer.disconnect();
  }, [map]);

  return null;
}

export function LocationMap({ placeName, onChange }: { placeName: string, onChange: (newPlace: string) => void }) {
  const [center, setCenter] = useState<[number, number]>([20.5937, 78.9629]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!placeName) return;
    
    const geocode = async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(placeName)}`);
        const data = await response.json();
        if (data && data.length > 0) {
          const lat = parseFloat(data[0].lat);
          const lon = parseFloat(data[0].lon);
          if (!isNaN(lat) && !isNaN(lon)) {
            setCenter([lat, lon]);
          }
        }
      } catch (err) {
        console.error("Geocoding error:", err);
      } finally {
        setLoading(false);
      }
    };
    
    geocode();
  }, [placeName]);

  return (
    <div className="relative w-full h-full z-0">
      <MapContainer 
        center={center} 
        zoom={5} 
        scrollWheelZoom={true} 
        style={{ width: '100%', height: '100%', zIndex: 1 }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker position={center} />
        <MapEvents onChange={onChange} setCenter={setCenter} />
        <MapUpdater center={center} />
      </MapContainer>
      
      {loading && (
        <div className="absolute bottom-8 right-2 z-[1000] bg-white p-1 rounded shadow">
          <span className="text-xs text-gray-500">Loading...</span>
        </div>
      )}
    </div>
  );
}
