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
  
  const [responseMessage, setResponseMessage] = useState<string | null>(null);
  const [responseMessageType, setResponseMessageType] = useState<"success" | "error" | null>(null); // success or error
  const [loading, setLoading] = useState(false);

/*
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
  };*/


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
    /*if (storedUser) {
        // Fetch the user email from the backend using the authToken
        const fetchEmail = async () => {
          const email = await fetchUserEmail(storedUser);
          if (email) setSelectedUser(email);
        };
        
        fetchEmail();
      }*/
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
    console.log("Patient Email:", selectedEmail);
    
    // Ensure time is correctly formatted in UTC
    const timeSlotStart = new Date(selectedDate + " " + selectedTime + ":00 GMT"); // Assuming selectedTime is "13:00"
    const timeSlotEnd = new Date(timeSlotStart);
    timeSlotEnd.setHours(timeSlotStart.getHours() + 1); // Assuming 1 hour duration
  
    console.log("Time Slot:", timeSlotStart.toISOString(), timeSlotEnd.toISOString());
  
    if (!selectedDentist || !selectedEmail) return;
  
    const start = timeSlotStart.toISOString();
    const end = timeSlotEnd.toISOString();

    const payload = {
      dentistId: selectedDentist,
      patientEmail: selectedEmail,
      timeSlot: { "start": start, "end": end },
    };
    setLoading(true); 
    try {
      const response = await fetch("/api/createBooking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        setResponseMessage("Booking successfully created!");
        setResponseMessageType("success");
      } else {
        const data = await response.json();
        setResponseMessage(data.error || "Failed to book appointment.");
        setResponseMessageType("error");
      }
    } catch (err) {
      console.error("Error saving booking:", err);
      setResponseMessage("An error occurred while saving the booking.");
      setResponseMessageType("error");
    } finally {
      setLoading(false); // Reset loading state once booking is complete
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
                  className="inline-flex items-center text-sm font-medium text-popup-blue hover:text-main-blue dark:text-gray-400 dark:hover:text-blue"
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
                  Home
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
                    className="ms-1 text-sm font-medium text-popup-blue hover:text-main-blue md:ms-2 dark:text-gray-400 dark:hover:text-blue"
                  >
                    Find Care
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
                    className="ms-1 text-sm font-medium text-popup-blue hover:text-main-blue md:ms-2 dark:text-gray-400 dark:hover:text-blue"
                  >
                    Find Appointment
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
                    Book Appointment
                  </span>
                </div>
              </li>
            </ol>
          </nav>

          <SubBackground>
          <div className="text-center">
              <h1 className="text-4xl font-bold text-[#1E3582] mb-3">Your Booking Details</h1>
              <p className="text-lg text-gray-600 mb-3">
                Below, you can see the details of the appointment that will be booked for you. 
                You can also view these details later on the "Monitor Appointments" page.
              </p>
              <p className="text-lg text-gray-600 mb-6">
                <span className="font-bold">Please note:</span> You cannot change the details after confirmation.
              </p>
            </div>


            <div className="flex flex-col tablet:flex-row items-start justify-between space-x-8 mt-20 mb-20">
            {/* Date */}
            <div className="flex flex-col items-start space-y-2 w-full">
              <p className="font-bold text-xl text-main-blue">Date:</p>
              <p className="text-xl text-main-blue">{selectedDate || "Loading..."}</p>
            </div>
            <div className="border-l-2 border-gray-300 h-24"></div> {/* Vertical Divider */}

            {/* Time */}
            <div className="flex flex-col items-start space-y-2 w-full">
              <p className="font-bold text-xl text-main-blue">Time:</p>
              <p className="text-xl text-main-blue">{selectedTime || "Loading..."}</p>
            </div>
            <div className="border-l-2 border-gray-300 h-24"></div> {/* Vertical Divider */}

            {/* Clinic */}
            <div className="flex flex-col items-start space-y-2 w-full">
              <p className="font-bold text-xl text-main-blue">Clinic:</p>
              <p className="text-xl text-main-blue">{selectedClinicName || "Loading..."}</p>
            </div>
            <div className="border-l-2 border-gray-300 h-24"></div> {/* Vertical Divider */}

            {/* Address */}
            <div className="flex flex-col items-start space-y-2 w-full">
              <p className="font-bold text-xl text-main-blue">Address:</p>
              <p className="text-xl text-main-blue">{selectedClinicAddress || "Loading..."}</p>
            </div>
            <div className="border-l-2 border-gray-300 h-24"></div> {/* Vertical Divider */}

            {/* Email */}
            <div className="flex flex-col items-start space-y-2 w-full">
              <p className="font-bold text-xl text-main-blue">Your Email:</p>
              <p className="text-xl text-main-blue">{selectedEmail || "Loading..."}</p>
            </div>
          </div>



            {/* Display success or error message */}
            {responseMessage && (
              <div
                className={`mt-4 p-4 rounded-lg ${
                  responseMessageType === "success" ? "text-green-500 text-center" : "text-red-500 text-center"
                }`}
              >
                <p>{responseMessage}</p>
              </div>
            )}

            <div className="flex items-center justify-center mt-4">
            <button
            type="button"
            disabled={loading}
            className="px-8 py-3 text-white font-semibold bg-main-blue rounded-lg shadow-md hover:scale-105 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 active:scale-95 transition-all duration-300 ease-in-out"
            onClick={createBooking}
          >
           {loading ? "Booking..." : "Confirm Appointment"}
          </button>

            </div>
          </SubBackground>
        </Background>
      </main>
    </div>
  );
}
