"use client";
import { faStreetView } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { divIcon } from "leaflet";
import "leaflet/dist/leaflet.css";
import React, { useEffect, useState } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";

// Type for Clinic
interface Clinic {
  name: string;
  coordinates: {
    latitude: number;
    longitude: number;
  };
}

// Custom Map View Updater
const UpdateMapView: React.FC<{ location: [number, number] }> = ({
  location,
}) => {
  const map = useMap();
  useEffect(() => {
    map.setView(location, 13);
  }, [location, map]);
  return null;
};

const Map: React.FC = () => {
  const [userLocation, setUserLocation] = useState<[number, number] | null>(
    null
  );
  const [clinics, setClinics] = useState<Clinic[]>([]);

  // Fetch the user's current location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
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

  // Fetch clinics from the backend API
  useEffect(() => {
    const fetchClinics = async () => {
      try {
        const response = await fetch("/api/getClinics");
        const data = await response.json();
        setClinics(data.clinics);
      } catch (error) {
        console.error("Error fetching clinics:", error);
      }
    };

    fetchClinics();
  }, []);

  // Fallback coordinates if user's location is not available
  const gothenburgCoords: [number, number] = [57.7089, 11.9746];

  // Define custom marker icon
  const customIcon = divIcon({
    html: renderToStaticMarkup(
      <div className="text-[24px] text-[#1e3582]">
        <FontAwesomeIcon icon={faStreetView} />
      </div>
    ),
    className: "custom-div-icon",
    iconAnchor: [12, 24], // Anchor to ensure icon is properly centered
    popupAnchor: [0, -24], // Ensure the popup is directly centered beneath the icon
  });

  return (
    <div className="h-[400px] w-full">
      <MapContainer
        center={gothenburgCoords}
        zoom={13}
        scrollWheelZoom={true}
        className="h-full w-full"
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
        />

        {/* User's location marker */}
        {userLocation && (
          <>
            <Marker position={userLocation} icon={customIcon}>
              <Popup closeButton={true}>
                <div>
                  <span className="text-main-blue">You are here!</span>
                  <div className="absolute w-3 h-3 rotate-45 transform bottom-[-6px] left-1/2 translate-x-[-50%] z-10" />
                </div>
              </Popup>
            </Marker>
            <UpdateMapView location={userLocation} />
          </>
        )}

        {/* Clinic markers */}
        {clinics.map((clinic, index) => {
          const position: [number, number] = [
            clinic.coordinates.latitude,
            clinic.coordinates.longitude,
          ];
          return (
            <Marker key={index} position={position} icon={customIcon}>
              <Popup>
                <div>
                  <h3 className="font-bold text-lg">{clinic.name}</h3>
                  <p>Latitude: {clinic.coordinates.latitude}</p>
                  <p>Longitude: {clinic.coordinates.longitude}</p>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
};

export default Map;
