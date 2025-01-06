"use client";
import Header from '@/src/components/header';
import Background from '@/src/components/background';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import React, { useEffect, useRef, useState } from "react";
import { faFaceSadTear, faHospitalUser } from '@fortawesome/free-solid-svg-icons';

interface Booking {
  dentistId: string; // Reference to the Dentist
  patientId: string; // Reference to the Patient
  availabilityId: string; // Reference to Availability
  timeSlot: {
    start: Date;
    end: Date;
  };
  status: "available" | "booked";
  clinicId: string; // Reference to the Clinic (optional)
}

export default function UpcomingAppointments() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [appointments, setAppointments] = useState([
    {
      date: "Wednesday 16th June, 2025",
      time: "13:00",
      dentist: "Dr. Sarah Thompson",
      clinic: "Bright Smiles Dental",
      address: "Vasaplatsen 1, 411 26 Göteborg, Sweden",
    },
    {
      date: "Wednesday 16th June, 2025",
      time: "15:00",
      dentist: "Dr. James Wilson",
      clinic: "Sunny Days Dentistry",
      address: "Drottninggatan 83, 111 60 Stockholm, Sweden",
    },
    {
      date: "Thursday 17th June, 2025",
      time: "09:00",
      dentist: "Dr. Laura Green",
      clinic: "Pearl White Clinic",
      address: "Hisingen, 417 05 Göteborg, Sweden",
    },
  ]);

  useEffect(() => {
      const fetchBookings = async () => {
        try {
          const response = await fetch("/api/getPatientBookings");
          const data = await response.json();
          setBookings(data.bookings);
        } catch (error) {
          console.error("Error fetching bookings:", error);
        }
      };
      fetchBookings();
    }, []);

  const handleCancel = (time: string, dentist: string, date: string) => {
    const isConfirmed = window.confirm(`Are you sure you want to cancel the appointment with ${dentist} on ${date} at ${time}?`);
    if (isConfirmed) {
      setAppointments((prevAppointments) =>
        prevAppointments.filter(
          (appointment) => !(appointment.time === time && appointment.dentist === dentist && appointment.date === date)
        )
      );
      alert(`Cancelled appointment with ${dentist} on ${date} at ${time}`);
    }
  };

  // Helper function to remove ordinal suffixes
  const removeOrdinalSuffix = (dateString: string) => {
    return dateString.replace(/(\d+)(st|nd|rd|th)/, "$1");
  };

  // Sort appointments by date and time
  const sortedAppointments = [...appointments].sort((a, b) => {
    const dateTimeA = new Date(`${removeOrdinalSuffix(a.date)} ${a.time}`);
    const dateTimeB = new Date(`${removeOrdinalSuffix(b.date)} ${b.time}`);
    return dateTimeA.getTime() - dateTimeB.getTime();
  });

  // Group appointments by date
  const groupedAppointments = sortedAppointments.reduce((groups: Record<string, typeof sortedAppointments>, appointment) => {
    const date = appointment.date;
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(appointment);
    return groups;
  }, {});

  return (
    <div>
      <main>
        <Background>
          <Header />

          <nav className="flex m-8" aria-label="Breadcrumb">
            <ol className="inline-flex items-center space-x-1 md:space-x-2 rtl:space-x-reverse">
                <li className="inline-flex items-center">
                <a href="/patient-tool/landing-page" className="inline-flex items-center text-sm font-medium text-popup-blue hover:text-main-blue dark:text-gray-400 dark:hover:text-blue">
                    <svg className="w-3 h-3 me-2.5" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 20 20">
                    <path d="m19.707 9.293-2-2-7-7a1 1 0 0 0-1.414 0l-7 7-2 2a1 1 0 0 0 1.414 1.414L2 10.414V18a2 2 0 0 0 2 2h3a1 1 0 0 0 1-1v-4a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v4a1 1 0 0 0 1 1h3a2 2 0 0 0 2-2v-7.586l.293.293a1 1 0 0 0 1.414-1.414Z"/>
                    </svg>
                    Home
                </a>
                </li>
                <li aria-current="page">
                <div className="flex items-center">
                    <svg className="rtl:rotate-180 w-3 h-3 text-popup-blue mx-1" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 6 10">
                    <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m1 9 4-4-4-4"/>
                    </svg>
                    <span className="ms-1 text-sm font-medium text-gray-500 md:ms-2 dark:text-gray-400">Monitor Appointments</span>
                </div>
                </li>
            </ol>
            </nav>

          {/* outside, centered */}
          <div className="text-center p-8 mb-50">
            <h1 className="text-3xl font-bold text-main-blue">Your Upcoming Appointments</h1>
          </div>

          <div className="p-6">
            {/* Check if there are no upcoming appointments */}
            {appointments.length === 0 ? (
              <div className="min-h-0 bg-transparent-blue flex flex-col items-center justify-center p-6">
                <div className="text-center text-3xl font-bold text-main-blue mb-4">
                  <p>You don't have any upcoming appointments <FontAwesomeIcon icon={faFaceSadTear} /></p>
                </div>
                <div className="text-center text-lg text-main-blue mb-6">
                  <p>Why wait? Schedule your next visit today!</p>
                </div>
                {/* Book Now Button */}
                <div>
                  <a
                    href="http://localhost:3000/patient-tool/find-care"
                    className="bg-main-blue text-white py-2 px-6 rounded-md hover:bg-blue-700 transition"
                  >
                    Book Now
                  </a>
                </div>
              </div>
            ) : (
              // Loop through grouped appointments
              Object.keys(groupedAppointments).map((date, index) => (
                <div key={index}>
                  {/* Date Header */}
                  <h3 className="text-xl font-semibold text-main-blue mb-4">{date}</h3>

                  {/* Loop through appointments for this date */}
                  {groupedAppointments[date].map((appointment, idx) => (
                    <div key={idx} className="p-4 mb-4 border-2 border-main-blue rounded-md bg-[#D1E0F1]">
                      <div className="flex justify-between items-center">
                        {/* FontAwesome Icon */}
                        <div className="flex items-center">
                          <FontAwesomeIcon
                            icon={faHospitalUser}
                            style={{
                              color: "#ffffff",
                              fontSize: "50px",
                              marginRight: "12px",
                              marginTop: "4px"
                            }}
                          />
                          <div>
                            <p className="text-sm font-bold text-main-blue">Time: <span className="font-normal">{appointment.time}</span></p>
                            <p className="text-sm font-bold text-main-blue">Dentist: <span className="font-normal">{appointment.dentist}</span></p>
                            <p className="text-sm font-bold text-main-blue">Clinic: <span className="font-normal">{appointment.clinic}</span></p>
                            <p className="text-sm font-bold text-main-blue">Address: <span className="font-normal">{appointment.address}</span></p>
                          </div>
                        </div>

                        {/* Cancel Button */}
                        <button
                          className="bg-red-600 text-white py-1 px-3 rounded-md text-sm
                          hover:scale-105 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 active:scale-95 transition-all duration-300 ease-in-out"
                          onClick={() => handleCancel(appointment.time, appointment.dentist, appointment.date)}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ))
            )}
          </div>
        </Background>
      </main>
    </div>
  );
}
