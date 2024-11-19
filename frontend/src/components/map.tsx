'use client';
import 'leaflet/dist/leaflet.css';
import React from 'react';
import { MapContainer, TileLayer } from 'react-leaflet';

const Map: React.FC = () => {
  // Coordinates for Gothenburg
  const gothenburgCoords: [number, number] = [57.7089, 11.9746];

  return (
    <div style={{ height: '400px', width: '100%' }}>
      {/* Reduce height */}
      <MapContainer
        center={gothenburgCoords}
        zoom={13}
        scrollWheelZoom={false}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
        />
      </MapContainer>
    </div>
  );
};

export default Map;
