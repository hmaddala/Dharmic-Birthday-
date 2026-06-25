import React, { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix default marker icon issue with Leaflet and Webpack/Vite
delete (L.Icon.Default.prototype as any)._getIconUrl;

L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

function MapUpdater({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, map.getZoom(), { animate: true });
  }, [center, map]);
  return null;
}

function ClickHandler({ onClick }: { onClick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export function LocationMap({ placeName, onChange }: { placeName: string, onChange: (newPlace: string) => void }) {
  const [center, setCenter] = useState<[number, number]>([20.5937, 78.9629]); // Default to India
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!placeName) return;
    
    // We do not want to geocode again if it's the exact string we just reverse geocoded
    // But it's hard to track. We'll just geocode the placeName.
    const geocode = async () => {
      setLoading(true);
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(placeName)}&format=json&limit=1`);
        const data = await res.json();
        if (data && data.length > 0) {
           setCenter([parseFloat(data[0].lat), parseFloat(data[0].lon)]);
        }
      } catch (err) {
        console.error("Geocoding error:", err);
      } finally {
        setLoading(false);
      }
    };
    
    const timer = setTimeout(() => {
      geocode();
    }, 500); // add a slight debounce
    
    return () => clearTimeout(timer);
  }, [placeName]);

  const handleMapClick = async (lat: number, lng: number) => {
    setCenter([lat, lng]);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1`, {
          headers: {
            'Accept-Language': 'en-US,en;q=0.9',
            'User-Agent': 'DharmaCalendarAssistant/1.0'
          }
      });
      const data = await res.json();
      if (data && data.display_name) {
          onChange(data.display_name);
      }
    } catch (err) {
       console.error("Reverse geocoding error:", err);
    }
  };

  return (
    <div className="relative w-full h-full">
      <MapContainer center={center} zoom={5} scrollWheelZoom={true} style={{ height: "100%", width: "100%" }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker position={center} />
        <MapUpdater center={center} />
        <ClickHandler onClick={handleMapClick} />
      </MapContainer>
      {loading && (
        <div className="absolute top-2 right-2 z-[1000] bg-white p-1 rounded shadow">
          <span className="text-xs text-gray-500">Loading...</span>
        </div>
      )}
    </div>
  );
}
