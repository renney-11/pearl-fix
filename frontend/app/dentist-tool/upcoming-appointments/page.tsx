"use client";
import Header from '@/src/components/header';
import Background from '@/src/components/background';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faHospitalUser } from '@fortawesome/free-solid-svg-icons';
import { useState } from 'react';

export default function UpcomingAppointments() {
  const [appointments, setAppointments] = useState([
    {
      date: "Wednesday 16th June, 2025",
      time: "13:00",
      patientName: "Celina",
      patientContact: "celina@gmail.com",
    },
    {
      date: "Wednesday 16th June, 2025",
      time: "15:00",
      patientName: "Manely",
      patientContact: "manely@gmail.com",
    },
    {
      date: "Thursday 17th June, 2025",
      time: "09:00",
      patientName: "Saba",
      patientContact: "saba@gmail.com",
    },
  ]);

  const handleCancel = (time: string, patientName: string) => {
    const isConfirmed = window.confirm(`Are you sure you want to cancel the appointment for ${patientName} at ${time}?`);
    if (isConfirmed) {
      setAppointments((prevAppointments) =>
        prevAppointments.filter((appointment) => !(appointment.time === time && appointment.patientName === patientName))
      );
      alert(`Cancelled appointment for ${patientName} at ${time}`);
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

          {/* "Upcoming Appointments" header */}
          <div className="text-center p-8 mb-4">
            <h1 className="text-3xl font-bold text-main-blue">Upcoming Appointments</h1>
          </div>

          <div className="p-6">
            {/* Loop through grouped appointments */}
            {Object.keys(groupedAppointments).map((date, index) => (
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
                          <p className="text-sm font-bold text-main-blue">Patient: <span className="font-normal">{appointment.patientName}</span></p>
                          <p className="text-sm font-bold text-main-blue">Contact: <span className="font-normal">{appointment.patientContact}</span></p>
                        </div>
                      </div>

                      {/* Cancel Button */}
                      <button
                        className="bg-red-500 text-white py-1 px-3 rounded-md text-sm hover:bg-red-600"
                        onClick={() => handleCancel(appointment.time, appointment.patientName)}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </Background>
      </main>
    </div>
  );
}
