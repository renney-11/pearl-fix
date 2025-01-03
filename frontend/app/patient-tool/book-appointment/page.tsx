"use client";
import Header from "@/src/components/header";
import SubBackground from "@/src/components/subbackground";
import Background from "@/src/components/background";
import { useState, useEffect } from "react";

export default function Booking() {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);

  // Retrieve date and time from sessionStorage
  useEffect(() => {
    const storedDate = sessionStorage.getItem("selectedDate");
    const storedTime = sessionStorage.getItem("selectedTime");

    if (storedDate) setSelectedDate(new Date(storedDate).toDateString());
    if (storedTime) setSelectedTime(storedTime);
  }, []);

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
              <p className="text-xl font-bold text-main-blue p-4">Dentist: </p>
              <p className="text-xl font-bold text-main-blue p-4">Clinic: </p>
              <p className="text-xl font-bold text-main-blue p-4">Address: </p>
            </div>
            <div className="flex items-center justify-center mt-4">
              <button
                type="button"
                className="px-16 py-2 text-white-blue bg-main-blue rounded-lg hover:bg-blue-200 hover:text-main-blue hover:scale-110"
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
