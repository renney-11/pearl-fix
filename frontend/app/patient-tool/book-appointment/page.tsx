"use client";
import Header from "@/src/components/header";
import SubBackground from "@/src/components/subbackground";
import Background from "@/src/components/background";
import { useState, useEffect } from "react";

export default function Booking() {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [selectedDentist, setSelectedDentist] = useState<string | null>(null);
  const [selectedClinicName, setSelectedClinicName] = useState<string | null>(null);
  const [selectedClinicAddress, setSelectedClinicAddress] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [selectedEmail, setSelectedEmail] = useState<string | null>(null);



  const fetchUserEmail = async (token: string) => {
    try {
      const response = await fetch("/api/fetchUser", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      
      if (response.ok) {
        const data = await response.json();
        return data.email; // Assuming the email is in the response
      } else {
        throw new Error("Failed to fetch user email");
      }
    } catch (err) {
      console.error("Error fetching user email:", err);
      alert("Failed to retrieve user email.");
      return null;
    }
  };


  // Retrieve date and time from sessionStorage
  useEffect(() => {
    const storedDate = sessionStorage.getItem("selectedDate");
    const storedTime = sessionStorage.getItem("selectedTime");
    const storedDentist = sessionStorage.getItem("dentist");
    const storedClinicName = sessionStorage.getItem("clinicName");
    const storedClinicAddress = sessionStorage.getItem("clinicAddress");
    const storedUser = sessionStorage.getItem("authToken");
    const storedEmail = sessionStorage.getItem("email");

    if (storedDate) setSelectedDate(new Date(storedDate).toDateString());
    if (storedTime) setSelectedTime(storedTime);
    if(storedDentist) setSelectedDentist(storedDentist);
    if(storedClinicName) setSelectedClinicName(storedClinicName);
    if(storedClinicAddress) setSelectedClinicAddress(storedClinicAddress);
    if (storedEmail) setSelectedEmail(storedEmail);
    if (storedUser) {
        // Fetch the user email from the backend using the authToken
        const fetchEmail = async () => {
          const email = await fetchUserEmail(storedUser);
          if (email) setSelectedUser(email);
        };
        
        fetchEmail();
      }
    }, []);

    // Create start and end times based on stored selectedDate and selectedTime
  const createStartEndTimes = () => {
    // Check if selectedDate and selectedTime are available
    const storedDate = sessionStorage.getItem("selectedDate");
    const storedTime = sessionStorage.getItem("selectedTime");

    if (!storedDate || !storedTime) {
      console.error("No selected date or time found in sessionStorage");
      return { start: "", end: "" };
    }

    // Parse the stored selected date to a Date object
    const selectedDate = new Date(storedDate);

    // Extract the hours and minutes from selectedTime (e.g., "14:00")
    const [selectedHours, selectedMinutes] = storedTime.split(":").map(Number);

    // Set the time of the selected date based on selectedTime (use hours and minutes)
    selectedDate.setHours(selectedHours, selectedMinutes, 0, 0);  // Set hours, minutes, and reset seconds and milliseconds

    // The start time is the updated selectedDate
    const start = selectedDate.toISOString();  // Convert to ISO string

    // Create the end time (1 hour after the selected start time)
    const end = new Date(selectedDate);
    end.setHours(selectedDate.getHours() + 1);  // Add 1 hour to the start time
    const endFormatted = end.toISOString();  // Convert to ISO string

    return { start, end: endFormatted };
  };

  const createBooking = async () => {
    console.log("DentistId:", selectedDentist);
    console.log("Patient Email:", selectedUser);
    
    // Ensure time is correctly formatted in UTC
    const timeSlotStart = new Date(selectedDate + " " + selectedTime + ":00 GMT"); // Assuming selectedTime is "13:00"
    const timeSlotEnd = new Date(timeSlotStart);
    timeSlotEnd.setHours(timeSlotStart.getHours() + 1); // Assuming 1 hour duration
  
    console.log("Time Slot:", timeSlotStart.toISOString(), timeSlotEnd.toISOString());
  
    if (!selectedDentist || !selectedUser) return;
  
    const start = timeSlotStart.toISOString();
    const end = timeSlotEnd.toISOString();

    const payload = {
      dentistId: selectedDentist,
      patientEmail: selectedUser,
      timeSlot: { start, end },
    };
  
    try {
      await fetch("/api/createBooking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } catch (err) {
      console.error("Error saving booking:", err);
      alert("Failed to book appointment.");
    }
  };
  

  return (
    <div>
      <main>
        <Background>
          <Header />

          <nav className="flex m-8" aria-label="Breadcrumb">
            <ol className="inline-flex items-center space-x-1 md:space-x-2 rtl:space-x-reverse">
              {/* Breadcrumb navigation */}
              <li className="inline-flex items-center">
                <a
                  href="/patient-tool/landing-page"
                  className="inline-flex items-center text-sm font-medium text-popup-blue hover:text-main-blue dark:text-gray-400 dark:hover:text-white"
                >
                  <svg
                    className="w-3 h-3 me-2.5"
                    aria-hidden="true"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path d="m19.707 9.293-2-2-7-7a1 1 0 0 0-1.414 0l-7 7-2 2a1 1 0 0 0 1.414 1.414L2 10.414V18a2 2 0 0 0 2 2h3a1 1 0 0 0 1-1v-4a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v4a1 1 0 0 0 1 1h3a2 2 0 0 0 2-2v-7.586l.293.293a1 1 0 0 0 1.414-1.414Z" />
                  </svg>
                  home
                </a>
              </li>
              <li>
                <div className="flex items-center">
                  <svg
                    className="rtl:rotate-180 w-3 h-3 text-popup-blue mx-1"
                    aria-hidden="true"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 6 10"
                  >
                    <path
                      stroke="currentColor"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="m1 9 4-4-4-4"
                    />
                  </svg>
                  <a
                    href="/patient-tool/find-care"
                    className="ms-1 text-sm font-medium text-popup-blue hover:text-main-blue md:ms-2 dark:text-gray-400 dark:hover:text-white"
                  >
                    find care
                  </a>
                </div>
              </li>
              <li>
                <div className="flex items-center">
                  <svg
                    className="rtl:rotate-180 w-3 h-3 text-popup-blue mx-1"
                    aria-hidden="true"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 6 10"
                  >
                    <path
                      stroke="currentColor"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="m1 9 4-4-4-4"
                    />
                  </svg>
                  <a
                    href="/patient-tool/find-appointment"
                    className="ms-1 text-sm font-medium text-popup-blue hover:text-main-blue md:ms-2 dark:text-gray-400 dark:hover:text-white"
                  >
                    find appointment
                  </a>
                </div>
              </li>
              <li aria-current="page">
                <div className="flex items-center">
                  <svg
                    className="rtl:rotate-180 w-3 h-3 text-popup-blue mx-1"
                    aria-hidden="true"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 6 10"
                  >
                    <path
                      stroke="currentColor"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="m1 9 4-4-4-4"
                    />
                  </svg>
                  <span className="ms-1 text-sm font-medium text-gray-500 md:ms-2 dark:text-gray-400">
                    book appointment
                  </span>
                </div>
              </li>
            </ol>
          </nav>

          <SubBackground>
          <div className="text-center p-8 mb-50">
              <h1 className="text-3xl font-bold text-main-blue">Your Booking Details</h1>
            </div>
            <div>
              <p className="text-xl font-bold text-main-blue p-4">
                Date: {selectedDate || "Loading..."}
              </p>
              <p className="text-xl font-bold text-main-blue p-4">
                Time: {selectedTime || "Loading..."}
              </p>
              <p className="text-xl font-bold text-main-blue p-4">
                Clinic: {selectedClinicName || "Loading..."} 
              </p>
              <p className="text-xl font-bold text-main-blue p-4">
                Address: {selectedClinicAddress || "Loading..."} 
              </p>
              <p className="text-xl font-bold text-main-blue p-4">
                Your Email: {selectedEmail || "Loading..."} 
              </p>
            </div>
            <div className="flex items-center justify-center mt-4">
              <button
                type="button"
                className="px-16 py-2 text-white-blue bg-main-blue rounded-lg hover:bg-blue-200 hover:text-main-blue hover:scale-110"
                onClick={createBooking}
              >
                confirm appointment
              </button>
            </div>
          </SubBackground>
        </Background>
      </main>
    </div>
  );
}
