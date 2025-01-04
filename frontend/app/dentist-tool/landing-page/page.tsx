"use client";

import React, { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCalendarDays, faUserDoctor } from "@fortawesome/free-solid-svg-icons"; 
import Header from "@/src/components/header";
import Background from "@/src/components/background";

interface Service {
  id: number;
  icon: any;
  title: string;
  description: string;
  link: string;
}

const DentistLandingPage: React.FC = () => {
  const services: Service[] = [
    {
      id: 1,
      icon: faCalendarDays,
      title: "Schedule Availability",
      description: "Set your available time slots for patients to book with you.",
      link: "/dentist-tool/schedule-availability",
    },
    {
      id: 2,
      icon: faUserDoctor, 
      title: "Manage Appointments",
      description: "View and manage your upcoming appointments. Cancel those you can no longer accommodate.",
      link: "/dentist-tool/manage-appointments",
    },
  ];

  const [hovered, setHovered] = useState<number | null>(null);

  return (
    <Background>
      <Header />
      <main className="text-center p-8 min-h-screen flex flex-col items-center justify-start mt-12">
        <h2 className="text-4xl font-bold mb-16 text-[rgba(30,53,130,255)]">Your Dental Services</h2>
        
        {/* flex container for responsiveness */}
        <div className="flex flex-wrap justify-center gap-8 w-full max-w-screen-xl px-8">
          {services.map((service) => (
            <a
              key={service.id}
              href={service.link}
              className={`bg-[rgba(30,53,130,255)] text-white rounded-xl p-10 flex flex-col items-center justify-between
                shadow-lg hover:shadow-2xl transition-transform transform ${
                  hovered === service.id ? "translate-y-[-8px]" : "translate-y-0"
                }`}
              onMouseEnter={() => setHovered(service.id)}
              onMouseLeave={() => setHovered(null)}
              style={{ minHeight: "320px", maxWidth: "380px" }} 
            >
              <div
                className="bg-white text-[rgba(30,53,130,255)] rounded-full p-6 mb-6"
                style={{ fontSize: "2.5rem" }}
              >
                <FontAwesomeIcon icon={service.icon} />
              </div>
              <h3 className="text-xl sm:text-lg md:text-xl lg:text-xl font-semibold mb-2">{service.title}</h3>
              <p className="text-sm sm:text-xs md:text-sm lg:text-sm text-[#E0DCFB] mb-4">{service.description}</p>
              <span className="text-[#E0DCFB] font-medium hover:underline">Learn More</span>
            </a>
          ))}
        </div>
      </main>
    </Background>
  );
};

export default DentistLandingPage;
