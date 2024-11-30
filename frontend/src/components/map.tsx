"use client";
import { faStreetView, faTooth } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import L, { divIcon } from "leaflet";
import "leaflet-routing-machine";
import "leaflet/dist/leaflet.css";
import { useRouter } from "next/navigation"; // Import useRouter
import React, { useEffect, useRef, useState } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";

interface Clinic {
  clinicName: string;
  address: string;
  coordinates: {
    latitude: number;
    longitude: number;
  };
  openingHours: {
    start: string;
    end: string;
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
  const [isNavigationActive, setIsNavigationActive] = useState(false); // State for navigation status
  const routingControlRef = useRef<L.Routing.Control | null>(null); // Ref for routing control
  const router = useRouter(); // Initialize useRouter hook

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
        const response = await fetch("/api/getAllClinics");
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

    const handleNavigate = (
      clinicCoordinates: [number, number],
      markerRef: React.RefObject<L.Marker>
    ) => {
      if (!userLocation) {
        alert("User location is not available.");
        return;
      }

      // Clear any existing routes on the map
      map.eachLayer((layer: L.Layer) => {
        if (layer instanceof L.Routing.Control) {
          map.removeLayer(layer);
        }
      });

      // Close the popup on the marker
      if (markerRef.current) {
        markerRef.current.closePopup();
      }

      // Create a Plan with PlanOptions (including createMarker)
      const plan = L.Routing.plan(
        [
          L.latLng(userLocation[0], userLocation[1]),
          L.latLng(clinicCoordinates[0], clinicCoordinates[1]),
        ],
        {
          createMarker: () => false,
        }
      );

      // Create Routing Control and pass the Plan to it
      const routingControl = L.Routing.control({
        plan,
        lineOptions: {
          styles: [{ color: "blue", opacity: 1, weight: 5 }],
          extendToWaypoints: true,
          missingRouteTolerance: 0.01,
        },
        show: false,
      }).addTo(map);

      // Store the routing control in the ref
      routingControlRef.current = routingControl;

      // Set navigation state to active
      setIsNavigationActive(true);

      // Customize the route container (for better UI appearance)
      routingControl.on("routesfound", () => {
        const routeContainer = document.querySelector(
          ".leaflet-routing-container"
        );

        if (routeContainer && routeContainer instanceof HTMLElement) {
          routeContainer.style.maxHeight = "370px";
          routeContainer.style.overflowY = "auto";
          routeContainer.style.backgroundColor = "#f8f8f8";
          routeContainer.style.padding = "10px";
          routeContainer.style.borderRadius = "8px";
          routeContainer.style.boxShadow = "0 2px 5px rgba(0, 0, 0, 0.1)";
        }
      });

      // Geolocation tracking
      map.locate({
        watch: true,
        setView: true,
        enableHighAccuracy: true,
        maxZoom: 16,
        timeout: 10000,
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
          const markerRef = useRef<L.Marker>(null); // Create ref for marker instance
          return (
            <Marker
              key={index}
              position={position}
              icon={clinicIcon}
              ref={markerRef}
            >
              <Popup>
                <div className="p-4 bg-white rounded-lg shadow-lg w-[220px]">
                  <h3 className="text-lg font-semibold text-[#1e3582] mb-2">
                    {clinic.clinicName}
                  </h3>
                  <p className="text-sm text-[#1e3582] font-medium">
                    Address: {clinic.address}
                  </p>

                  {/* Displaying the opening hours */}
                  <p className="text-sm text-[#1e3582] font-medium">
                    Opening Hours: {clinic.openingHours.start} -{" "}
                    {clinic.openingHours.end}
                  </p>

                  <div className="flex justify-between">
                    <button
                      className="bg-blue-600 text-white py-1 px-3 rounded-md text-sm hover:bg-blue-700"
                      onClick={() => handleNavigate(position, markerRef)} // Pass the markerRef to handleNavigate
                    >
                      Navigate
                    </button>
                    <button
                      className="bg-green-600 text-white py-1 px-3 rounded-md text-sm hover:bg-green-700"
                      onClick={() =>
                        router.push("/patient-tool/find-appointment")
                      } // Navigate to booking page
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

  const stopNavigation = () => {
    if (routingControlRef.current) {
      routingControlRef.current.remove(); // Properly remove the routing control
      routingControlRef.current = null; // Reset the ref
    }
    setIsNavigationActive(false); // Set navigation state to inactive
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
                  <div className="absolute w-3 h-3 rotate-45 transform bottom-[-6px] left-[6px] border-t-[3px] border-t-transparent border-l-[3px] border-l-white" />
                </div>
              </Popup>
            </Marker>
            <UpdateMapView location={userLocation} />
          </>
        )}

        {/* Map with clinic markers and routing */}
        <MapWithRouting />
      </MapContainer>

      {/* Conditional rendering of Stop Navigation button */}
      {isNavigationActive && (
        <button
          onClick={stopNavigation}
          className="absolute bottom-32 left-1/2 transform -translate-x-1/2 bg-red-600 text-white py-2 px-4 rounded-full hover:bg-red-700"
        >
          Stop Navigation
        </button>
      )}
    </div>
  );
};

export default Map;
