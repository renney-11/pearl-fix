"use client";
import Header from '@/src/components/header';
import Background from '@/src/components/background';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faHospitalUser } from '@fortawesome/free-solid-svg-icons';
import React, { useEffect, useRef, useState } from "react";

interface Booking {
  dentistId: string; // Reference to the Dentist
  patientId: string; // Reference to the Patient
  availabilityId: string; // Reference to Availability
  bookingId: string;
  timeSlot: {
    start: Date;
    end: Date;
  };
  status: "available" | "booked";
  patientName: string; // Reference to the Clinic (optional)
  patientEmail: string;
}

export default function UpcomingAppointments() {
  const [selectedEmail, setSelectedEmail] = useState<string | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  
    useEffect(() => {
      const storedEmail = sessionStorage.getItem("email");
      if (storedEmail) setSelectedEmail(storedEmail);
    }, []);

    useEffect(() => {
      if (!selectedEmail) return;
  
      const fetchBookings = async () => {
          try {
              const response = await fetch("/api/getDentistBookings", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ dentistEmail: selectedEmail }),
              });
  
              if (response.ok) {
                  const data = await response.json();
                  if (data.bookings && data.bookings.length > 0) {
                      const uniqueBookings = Array.from(
                          new Map(data.bookings.map((booking: any) => [booking._id, booking])).values()
                      );
                      const transformedBookings: Booking[] = uniqueBookings.map((booking: any) => ({
                          dentistId: booking.dentistId || "",
                          patientId: booking.patientId || "",
                          availabilityId: booking.availabilityId || "",
                          bookingId: booking._id || "",
                          timeSlot: {
                              start: new Date(booking.start),
                              end: new Date(booking.end),
                          },
                          status: "booked",
                          patientName: booking.patientName || "Unknown",
                          patientEmail: booking.patientEmail || "Unknown",
                      }));
                      setBookings(transformedBookings);
                  } else {
                      setBookings([]);
                  }
              } else {
                  console.error("Failed to fetch bookings");
              }
          } catch (error) {
              console.error("Error fetching bookings:", error);
          }
      };
  
      fetchBookings();
  }, [selectedEmail]);
  


  const handleCancel = (bookingId: string) => {
    const isConfirmed = window.confirm(`Are you sure you want to cancel this booking?`);
    if (isConfirmed) {
      setBookings((prevBookings) =>
        prevBookings.filter((booking) => booking.bookingId !== bookingId)
      );
      alert("Booking cancelled");
    }
  };

  // Helper function to remove ordinal suffixes
  const removeOrdinalSuffix = (dateString: string) => {
    return dateString.replace(/(\d+)(st|nd|rd|th)/, "$1");
  };

  const sortedBookings = [...bookings].sort((a, b) => a.timeSlot.start.getTime() - b.timeSlot.start.getTime());

  const groupedBookings = sortedBookings.reduce((groups: Record<string, Booking[]>, booking) => {
    const date = booking.timeSlot.start.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(booking);
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
                <a href="/dentist-tool/landing-page" className="inline-flex items-center text-sm font-medium text-popup-blue hover:text-main-blue dark:text-gray-400 dark:hover:text-blue">
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
                    <span className="ms-1 text-sm font-medium text-gray-500 md:ms-2 dark:text-gray-400">Manage Appointments</span>
                </div>
                </li>
            </ol>
            </nav>

          {/* "Upcoming Appointments" header */}
          <div className="text-center p-8 mb-4">
            <h1 className="text-3xl font-bold text-main-blue">Manage Your Upcoming Appointments</h1>
          </div>

          <div className="p-6">
            {/* Loop through grouped bookings */}
            {bookings.length === 0 ? (
                          <div className="min-h-0 bg-transparent-blue flex flex-col items-center justify-center p-6">
                            <div className="text-center text-xl font-bold text-main-blue mb-4">
                              <p> You don't have any upcoming appointments </p>
                            </div>
                            <div className="text-center text-l font-bold text-main-blue mb-4">
                              <p> You will get an email notifaction when a new appointment has been made. </p>
                            </div>
                          </div>
                        ) : (
                          // Loop through grouped bookings
                          Object.keys(groupedBookings).map((date, index) => (
                            <div key={index}>
                              {/* Date Header */}
                              <h3 className="text-xl font-semibold text-main-blue mb-4">{date}</h3>
            
                              {/* Loop through bookings for this date */}
                              {groupedBookings[date].map((booking, idx) => (
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
                                        <p className="text-sm font-bold text-main-blue">Time: <span className="font-normal">{new Date(booking.timeSlot.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })} - {new Date(booking.timeSlot.end).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })}</span></p>
                                        <p className="text-sm font-bold text-main-blue">Patient Name: <span className="font-normal">{booking.patientName}</span></p>
                                        <p className="text-sm font-bold text-main-blue">Patient Contact: <span className="font-normal">{booking.patientEmail}</span></p>
                                      </div>
                                    </div>
            
                                    {/* Cancel Button */}
                                    <button
                                      className="bg-red-600 text-white py-1 px-3 rounded-md text-sm
                                      hover:scale-105 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 active:scale-95 transition-all duration-300 ease-in-out"
                                      onClick={() => handleCancel(booking.bookingId)}
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
