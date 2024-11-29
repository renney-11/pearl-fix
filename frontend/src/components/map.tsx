"use client";
import { faStreetView, faTooth } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { divIcon } from "leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import "leaflet-routing-machine";
import React, { useEffect, useState, useRef } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";

// Type for Clinic
interface Clinic {
  clinicName: string;
  address: string;
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
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
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

  // Define custom marker icon for user location
  const userLocationIcon = divIcon({
    html: renderToStaticMarkup(
      <div className="text-[24px] text-[#1e3582]">
        <FontAwesomeIcon icon={faStreetView} />
      </div>
    ),
    className: "custom-div-icon",
    iconAnchor: [12, 24],
    popupAnchor: [0, -24],
  });

  // Define custom marker icon for clinics
  const clinicIcon = divIcon({
    html: renderToStaticMarkup(
      <div className="text-[24px] text-[#1e3582]">
        <FontAwesomeIcon icon={faTooth} />
      </div>
    ),
    className: "custom-div-icon",
    iconAnchor: [12, 24],
    popupAnchor: [0, -24],
  });

  // Map component to handle routing
  const MapWithRouting: React.FC = () => {
    const map = useMap();
  
    const handleNavigate = (clinicCoordinates: [number, number], markerRef: React.RefObject<L.Marker>) => {
      if (!userLocation) {
        alert("User location is not available.");
        return;
      }
  
      // Clear any existing route on the map
      const existingRoutes = map._layers;  // Get all layers
      for (const layerId in existingRoutes) {
        const layer = existingRoutes[layerId];
        if (layer instanceof L.Routing.Control) {
          map.removeLayer(layer);  // Remove any existing routing control layers
        }
      }
  
      // Close the popup (close it by accessing the marker instance directly)
      if (markerRef.current) {
        markerRef.current.closePopup();  // Close the popup on the marker
      }
  
      // Create routing control
      const routingControl = L.Routing.control({
        waypoints: [
          L.latLng(userLocation[0], userLocation[1]), // User's location
          L.latLng(clinicCoordinates[0], clinicCoordinates[1]), // Clinic location
        ],
        routeWhileDragging: true, // Optionally, allows for interactive route adjustment
        show: false, // Prevents routing control from showing the user location dot.
      }).addTo(map);
  
      // Disable the blue dot that appears with geolocation
      map.on('locationfound', (event: L.LocationEvent) => {
        // Remove the default location marker (blue dot)
        if (event) {
          map.removeLayer(event);
        }
      });
  
      // Optional: Disable geolocation control entirely (prevents blue dot)
      const geolocationControl = map.locate({
        watch: true, // Keep tracking the location
        setView: true, // Adjust map view to follow the user
        enableHighAccuracy: true, // Allow higher accuracy
        maxZoom: 16,
        timeout: 10000, // 10 seconds timeout
      });
  
      // After the route is drawn, apply the styles to the routing container
      routingControl.on("routesfound", () => {
        const routeContainer = document.querySelector(".leaflet-routing-container");
  
        // Ensure the container exists before applying styles
        if (routeContainer && routeContainer instanceof HTMLElement) {
          routeContainer.style.maxHeight = "370px";  // Set a max height for the instructions container
          routeContainer.style.overflowY = "auto";  // Enable vertical scrolling
        
          // Set an off-white background color
          routeContainer.style.backgroundColor = "#f8f8f8";  // Off-white background
  
          // Optional: Add padding and border-radius for a nicer appearance
          routeContainer.style.padding = "10px";
          routeContainer.style.borderRadius = "8px";
          routeContainer.style.boxShadow = "0 2px 5px rgba(0, 0, 0, 0.1)";  // Optional shadow for better visibility
        }
      });
    };
  
    return (
      <>
        {/* Clinic markers */}
        {clinics.map((clinic, index) => {
          const position: [number, number] = [
            clinic.coordinates.latitude,
            clinic.coordinates.longitude,
          ];
          const markerRef = useRef<L.Marker>(null);  // Create ref for marker instance
          return (
            <Marker key={index} position={position} icon={clinicIcon} ref={markerRef}>
              <Popup>
                <div className="p-4 bg-white rounded-lg shadow-lg w-[220px]">
                  <h3 className="text-lg font-semibold text-[#1e3582] mb-2">
                    {clinic.clinicName}
                  </h3>
                  <p className="text-sm text-[#1e3582] font-medium">Address: {clinic.address}</p>
                  <div className="flex justify-between">
                    <button
                      className="bg-blue-600 text-white py-1 px-3 rounded-md text-sm hover:bg-blue-700"
                      onClick={() => handleNavigate(position, markerRef)}  // Pass the markerRef to handleNavigate
                    >
                      Navigate
                    </button>
                    <button
                      className="bg-green-600 text-white py-1 px-3 rounded-md text-sm hover:bg-green-700"
                      onClick={() => {
                        alert("Booking appointment...");
                      }}
                    >
                      Book Now
                    </button>
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </>
    );
  };

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
            <Marker position={userLocation} icon={userLocationIcon}>
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

        {/* Map with routing */}
        <MapWithRouting />
      </MapContainer>
    </div>
  );
};

export default Map;
