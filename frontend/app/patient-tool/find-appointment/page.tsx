"use client";
import Header from "@/src/components/header";
import SubBackground from "@/src/components/subbackground";
import Background from "@/src/components/background";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Appointment() {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [currentYear, setCurrentYear] = useState<number>(new Date().getFullYear());
  const [currentMonth, setCurrentMonth] = useState<number>(new Date().getMonth());
  const [availableTimes, setAvailableTimes] = useState<string[]>([]);
  const [availabilities, setAvailabilities] = useState<Record<string, any> | null>(null);
  const router = useRouter();


  // Fetch availabilities on component mount
  useEffect(() => {
    const fetchAvailabilities = async () => {
      try {
        const response = await fetch("/api/booking", {
          method: "GET",
          headers: { "Cache-Control": "no-store" }, // Ensure fresh data
        });
        const data = await response.json();
        console.log("Received availabilities:", data);

        // Transform timeSlots into a date-keyed structure
        if (data && data.timeSlots) {
          const transformedAvailabilities: Record<string, any> = {};
          data.timeSlots.forEach((slot: any) => {
            const dateKey = new Date(slot.start).toISOString().split("T")[0]; // Extract YYYY-MM-DD
            if (!transformedAvailabilities[dateKey]) {
              transformedAvailabilities[dateKey] = {
                timeSlots: [],
              };
            }
            transformedAvailabilities[dateKey].timeSlots.push(slot);
          });

          setAvailabilities(transformedAvailabilities); // Store transformed data
          console.log("Transformed availabilities:", transformedAvailabilities);
        } else {
          setAvailabilities(null); // No availabilities found
        }
      } catch (error) {
        console.error("Error fetching availabilities:", error);
      }
    };

    fetchAvailabilities();
  }, []); // Only on mount


  // Re-render calendar when year, month, or availabilities change
  useEffect(() => {
    generateCalendar(currentYear, currentMonth);
  }, [currentYear, currentMonth, availabilities]); // Trigger on availabilities change


  // Generate the calendar for a given year and month
  const generateCalendar = (year: number, month: number) => {
    const calendarElement = document.getElementById("calendar");
    const currentMonthElement = document.getElementById("currentMonth");
    const prevButton = document.getElementById("prevMonth") as HTMLButtonElement;

    if (!calendarElement || !currentMonthElement || !prevButton) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const firstDayOfMonth = new Date(year, month, 1);
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    calendarElement.innerHTML = "";
    const monthNames = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December",
    ];
    currentMonthElement.innerText = `${monthNames[month]} ${year}`;

    const firstDayOfWeek = (firstDayOfMonth.getDay() + 6) % 7;
    const daysOfWeek = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

    // Add headers for days of the week
    daysOfWeek.forEach((day) => {
      const dayElement = document.createElement("div");
      dayElement.className = "text-center font-semibold text-almost-black text-xs sm:text-base";
      dayElement.innerText = day;
      calendarElement.appendChild(dayElement);
    });

    // Add empty slots for days before the first day of the month
    for (let i = 0; i < firstDayOfWeek; i++) {
      const emptyDayElement = document.createElement("div");
      calendarElement.appendChild(emptyDayElement);
    }

    // Loop through all days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const dayElement = document.createElement("div");
      const currentDate = new Date(year, month, day);
      const formattedDate = currentDate.toISOString().split("T")[0]; // Format: YYYY-MM-DD

      dayElement.className =
        "text-center py-2 border cursor-pointer hover:bg-gray-200 text-xs sm:text-base";
      dayElement.innerText = String(day);

      if (currentDate < today) {
        // Disable past dates
        dayElement.className =
          "text-center py-2 border text-gray-200 cursor-not-allowed text-xs sm:text-base";
      } else if (availabilities && availabilities[formattedDate]?.timeSlots?.length > 0) {
        // Enable clickable dates with availability
        dayElement.classList.add("bg-violet-50", "text-blue-700", "cursor-pointer");
        dayElement.addEventListener("click", () => handleDateSelection(currentDate));
      } else {
        // Dates with no availability
        dayElement.className =
          "text-center py-2 border text-gray-300 cursor-not-allowed text-xs sm:text-base";
      }

      // Highlight selected date
      if (
        selectedDate &&
        currentDate.getFullYear() === selectedDate.getFullYear() &&
        currentDate.getMonth() === selectedDate.getMonth() &&
        currentDate.getDate() === selectedDate.getDate()
      ) {
        dayElement.classList.add("bg-blue-200", "text-white");
      }

      calendarElement.appendChild(dayElement);
    }

    // Disable previous button if viewing the current month
    if (year === today.getFullYear() && month === today.getMonth()) {
      prevButton.disabled = true;
      prevButton.classList.add("opacity-0");
    } else {
      prevButton.disabled = false;
      prevButton.classList.remove("opacity-0");
    }
  };


  // Handle date selection
  const handleDateSelection = (date: Date) => {
    const formattedDate = date.toISOString().split("T")[0];
    setSelectedDate(date);

    if (availabilities && availabilities[formattedDate]?.timeSlots) {
      setAvailableTimes(availabilities[formattedDate].timeSlots.map((slot: any) => slot.start));
    } else {
      setAvailableTimes([]);
    }
  };

  // Handle saving the booking
  const handleSave = async () => {
    if (!selectedDate || !availableTimes.length) return;

    const payload = {
      date: selectedDate.toISOString(),
      time: availableTimes[0],
    };

    try {
      await fetch("/api/booking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      router.push(`/patient-tool/book-appointment`);
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
                    find appointment
                  </span>
                </div>
              </li>
            </ol>
          </nav>

          <SubBackground>
            <div className="flex items-center justify-center hover:max-h-screen ">
              <div className="lg:w-7/12 md:w-9/12 sm:w-10/12 mx-auto p-4">
                <div className="bg-white-blue shadow-lg rounded-lg overflow-hidden">
                  <div className="flex items-center justify-between px-6 py-3 bg-main-blue">
                    <button
                      id="prevMonth"
                      className="text-white-blue"
                      onClick={() => {
                        if (currentMonth === 0) {
                          setCurrentMonth(11);
                          setCurrentYear((prev) => prev - 1);
                        } else {
                          setCurrentMonth((prev) => prev - 1);
                        }
                      }}
                    >
                      previous
                    </button>
                    <h2 id="currentMonth" className="text-white-blue text-sm sm:text-base"></h2>
                    <button
                      id="nextMonth"
                      className="text-white-blue"
                      onClick={() => {
                        if (currentMonth === 11) {
                          setCurrentMonth(0);
                          setCurrentYear((prev) => prev + 1);
                        } else {
                          setCurrentMonth((prev) => prev + 1);
                        }
                      }}
                    >
                      next
                    </button>
                  </div>
                  <div className="grid grid-cols-7 gap-2 p-4" id="calendar"></div>
                </div>
              </div>
            </div>

            {selectedDate && (
              <div className="p-4">
                <h3 className="text-lg font-semibold text-main-blue">
                  selected date: {selectedDate.toDateString()}
                </h3>
                <h4 className="text-md font-medium text-main-blue mt-4">select a time:</h4>
                <ul className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2">
                  {availableTimes.map((time) => (
                    <li key={time}>
                      <input
                        type="radio"
                        id={time}
                        name="time"
                        value={time}
                        className="hidden peer"
                      />
                      <label
                        htmlFor={time}
                        className="inline-flex items-center justify-center w-full px-2 py-1 text-sm font-medium text-center bg-white-blue border rounded-lg cursor-pointer text-gray-500 border-gray-200 peer-checked:border-blue-700 peer-checked:text-blue-700 peer-checked:bg-blue-50 hover:bg-gray-50"
                      >
                        {time}
                      </label>
                    </li>
                  ))}
                </ul>
                <div className="flex items-center justify-center mt-4">
                  <button
                    type="button"
                    className="px-16 py-2 text-white-blue bg-main-blue rounded-lg hover:bg-blue-200 hover:text-main-blue hover:scale-110"
                    onClick={handleSave}
                  >
                    save
                  </button>
                </div>
              </div>
            )}
          </SubBackground>
        </Background>
      </main>
    </div>
  );
}
