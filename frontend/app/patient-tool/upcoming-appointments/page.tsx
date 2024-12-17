"use client";
import Header from '@/src/components/header';
import Background from '@/src/components/background';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFaceSadTear, faHospitalUser } from '@fortawesome/free-solid-svg-icons';
import { useState } from 'react';

export default function UpcomingAppointments() {
  // Initialize the appointments as state
  const [appointments, setAppointments] = useState([
    // For now, this part is hard-coded
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

  const handleCancel = (time: string, dentist: string, date: string) => {
    // Ask for confirmation before proceeding with the cancellation
    const isConfirmed = window.confirm(`Are you sure you want to cancel the appointment with ${dentist} on ${date} at ${time}?`);

    if (isConfirmed) {
      // Remove the cancelled appointment from the list
      setAppointments((prevAppointments) => 
        prevAppointments.filter(appointment => 
          !(appointment.time === time && appointment.dentist === dentist && appointment.date === date)
        )
      );

      // Replace this alert with actual cancellation logic, such as an API call
      alert(`Cancelled appointment with ${dentist} on ${date} at ${time}`);
    }
  };

  // Group appointments by date
  const groupedAppointments = appointments.reduce((groups: Record<string, typeof appointments>, appointment) => {
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
                    <div
                      key={idx}
                      className="p-4 mb-4 border-2 border-white rounded-md bg-transparent-blue"
                    >
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
                          className="bg-red-500 text-white py-1 px-3 rounded-md text-sm hover:bg-red-600"
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
