'use client';
import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

// A custom component to update the map view to the user's location dynamically
const UpdateMapView: React.FC<{ location: [number, number] }> = ({ location }) => {
  const map = useMap();
  useEffect(() => {
    map.setView(location, 13);
  }, [location, map]);

  return null;
};

const Map: React.FC = () => {
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);

  // Fetch the user's current location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          console.log("User location:", { latitude, longitude });
          setUserLocation([latitude, longitude]);
        },
        (error) => {
          console.error("Error fetching geolocation:", error);
        },
        { enableHighAccuracy: true }
      );
    } else {
      console.error("Geolocation is not supported by this browser.");
    }
  }, []);

  // Fallback coordinates if user's location is not available
  const gothenburgCoords: [number, number] = [57.7089, 11.9746];

  return (
    <div className="h-[400px] w-full">
      <MapContainer
        center={gothenburgCoords}
        zoom={13}
        scrollWheelZoom={true}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
        />
        {userLocation && (
          <>
            <Marker position={userLocation}>
              <Popup>You are here!</Popup>
            </Marker>
            <UpdateMapView location={userLocation} />
          </>
        )}
      </MapContainer>
    </div>
  );
};

export default Map;
