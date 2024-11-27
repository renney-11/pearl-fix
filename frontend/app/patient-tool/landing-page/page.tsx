"use client";

import React, { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faMapLocationDot, faTeeth, faClock } from "@fortawesome/free-solid-svg-icons";
import Footer from "@/src/components/footer";
import Header from "@/src/components/header";
import Background from "@/src/components/background";


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
    <Background>
      <Header />
      <main className="text-center p-8 min-h-screen flex flex-col items-center justify-start mt-12">
        <h2 className="text-3xl font-bold text-[#1E3582] mb-20">select a service:</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-screen-xl px-8">
          {services.map((service) => (
            <a
              key={service.id}
              href={service.link}
              className={`bg-[#1E3582] text-white rounded-2xl p-10 flex flex-col items-center justify-center 
                shadow-lg hover:shadow-xl transition-transform transform ${
                  hovered === service.id ? "translate-y-[-6px]" : "translate-y-0"
                }`}
              onMouseEnter={() => setHovered(service.id)}
              onMouseLeave={() => setHovered(null)}
              style={{ minHeight: "200px" }}
            >
              <FontAwesomeIcon icon={service.icon} className="text-white text-5xl mb-4" />
              <p className="text-xl capitalize text-[#E0DCFB]">{service.text}</p>
            </a>
          ))}
        </div>
      </main>
      <Footer />
    </Background>
  );
};

export default PatientLandingPage;
