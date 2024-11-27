"use client";

import React, { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faMapLocationDot, faTeeth, faClock } from "@fortawesome/free-solid-svg-icons";

interface Service {
  id: number;
  icon: any;
  text: string;
  link: string;
}

const PatientLandingPage: React.FC = () => {
  const services: Service[] = [
    { id: 1, icon: faMapLocationDot, text: "book appointment", link: "/patient-tool/find-care" },
    { id: 2, icon: faTeeth, text: "monitor appointments", link: "/patient-tool/monitor-appointments" },
    { id: 3, icon: faClock, text: "emergency booking", link: "/patient-tool/emergency-booking" },
  ];

  const [hovered, setHovered] = useState<number | null>(null);

  return (
    <div>
      <h2>select a service:</h2>
      <div>
        {services.map((service) => (
          <a
            key={service.id}
            href={service.link}
            onMouseEnter={() => setHovered(service.id)}
            onMouseLeave={() => setHovered(null)}
          >
            <FontAwesomeIcon icon={service.icon} />
            <p>{service.text}</p>
          </a>
        ))}
      </div>
    </div>
  );
};

export default PatientLandingPage;
