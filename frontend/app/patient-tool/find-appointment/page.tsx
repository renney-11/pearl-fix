"use client";
import Header from '@/src/components/header';
import SubBackground from '@/src/components/subbackground';
import Background from '@/src/components/background';
import { useState, useEffect } from 'react';

export default function App() {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [availableTimes, setAvailableTimes] = useState<string[]>([]);
  const [isWeekend, setIsWeekend] = useState<boolean>(false);

  useEffect(() => {
    function generateCalendar(year: number, month: number) {
      const calendarElement = document.getElementById("calendar");
      const currentMonthElement = document.getElementById("currentMonth");
      const prevButton = document.getElementById("prevMonth") as HTMLButtonElement;

      if (!calendarElement || !currentMonthElement || !prevButton) return;

      const firstDayOfMonth = new Date(year, month, 1);
      const daysInMonth = new Date(year, month + 1, 0).getDate();

      calendarElement.innerHTML = "";
      const monthNames = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
      ];
      currentMonthElement.innerText = `${monthNames[month]} ${year}`;

      const firstDayOfWeek = firstDayOfMonth.getDay();
      const daysOfWeek = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

      daysOfWeek.forEach(day => {
        const dayElement = document.createElement("div");
        dayElement.className = "text-center font-semibold";
        dayElement.innerText = day;
        calendarElement.appendChild(dayElement);
      });

      for (let i = 0; i < firstDayOfWeek; i++) {
        const emptyDayElement = document.createElement("div");
        calendarElement.appendChild(emptyDayElement);
      }

      for (let day = 1; day <= daysInMonth; day++) {
        const dayElement = document.createElement("div");
        dayElement.className = "text-center py-2 border cursor-pointer";
        dayElement.innerText = String(day);

        const selectedDate = new Date(year, month, day);
        const currentDate = new Date();

        if (year === currentDate.getFullYear() && month === currentDate.getMonth() && day === currentDate.getDate()) {
          dayElement.classList.add("bg-blue-100", "text-almost-black");
        }

        if (selectedDate < currentDate) {
          dayElement.classList.add("text-gray-400", "cursor-not-allowed");
        } else {
          dayElement.addEventListener("click", () => handleDateSelection(selectedDate));
        }

        calendarElement.appendChild(dayElement);
      }

      const currentDate = new Date();
      if (year === currentDate.getFullYear() && month === currentDate.getMonth()) {
        prevButton.disabled = true;
        prevButton.classList.add("opacity-0");
      } else {
        prevButton.disabled = false;
        prevButton.classList.remove("opacity-0");
      }
    }

    const currentDate = new Date();
    let currentYear = currentDate.getFullYear();
    let currentMonth = currentDate.getMonth();

    generateCalendar(currentYear, currentMonth);

    document.getElementById("prevMonth")?.addEventListener("click", () => {
      if (currentMonth === 0) {
        currentMonth = 11;
        currentYear--;
      } else {
        currentMonth--;
      }
      generateCalendar(currentYear, currentMonth);
    });

    document.getElementById("nextMonth")?.addEventListener("click", () => {
      if (currentMonth === 11) {
        currentMonth = 0;
        currentYear++;
      } else {
        currentMonth++;
      }
      generateCalendar(currentYear, currentMonth);
    });
  }, []);

  const handleDateSelection = (date: Date) => {
    const options: Intl.DateTimeFormatOptions = { weekday: "long", year: "numeric", month: "long", day: "numeric" };
    setSelectedDate(date.toLocaleDateString(undefined, options));

    const isWeekendDay = [0, 6].includes(date.getDay());
    setIsWeekend(isWeekendDay);

    // Set available times based on weekday or weekend
    setAvailableTimes(isWeekendDay ? getWeekendHours() : getWeekdayHours());
    setSelectedTime(null);
  };

  const handleTimeSelection = (time: string) => {
    setSelectedTime(time);
  };

  const getWeekdayHours = (): string[] => {
    return ["08:00 AM", "09:00 AM", "10:00 AM", "11:00 AM", "12:00 PM", "01:00 PM", "02:00 PM", "03:00 PM", "04:00 PM"];
  };

  const getWeekendHours = (): string[] => {
    return ["10:00 AM", "11:00 AM", "12:00 PM", "01:00 PM", "02:00 PM", "03:00 PM"];
  };

  const handleSave = () => {
    if (selectedTime) {
      // Redirect to a new page (e.g., confirmation page)
      window.location.href = `/patient-tool/book-appointment`;
    }
  };

  return (
    <div>
      <main>
        <Background>
          <Header />

          <nav className="flex m-8" aria-label="Breadcrumb">
            {/* Breadcrumb content */}
          </nav>

          <SubBackground>
            <div className="flex items-center justify-center hover:max-h-screen ">
              <div className="lg:w-7/12 md:w-9/12 sm:w-10/12 mx-auto p-4">
                <div className="bg-white-blue shadow-lg rounded-lg overflow-hidden">
                  <div className="flex items-center justify-between px-6 py-3 bg-main-blue">
                    <button id="prevMonth" className="text-white-blue">Previous</button>
                    <h2 id="currentMonth" className="text-white-blue"></h2>
                    <button id="nextMonth" className="text-white-blue">Next</button>
                  </div>
                  <div className="grid grid-cols-7 gap-2 p-4" id="calendar"></div>
                </div>
              </div>
            </div>

            {selectedDate && (
              <div className="p-4">
                <h3 className="text-lg font-semibold text-gray-700">Selected Date: {selectedDate}</h3>
                <h4 className="text-md font-medium text-gray-600 mt-4">Select a Time:</h4>
                <ul id="timetable" className="grid grid-cols-3 gap-2 mt-2">
                  {availableTimes.map(time => (
                    <li key={time}>
                      <button
                        className={`w-full px-2 py-1 text-sm font-medium text-center border rounded-lg ${
                          selectedTime === time ? "bg-blue-600 text-white" : "bg-white-blue text-gray-700"
                        }`}
                        onClick={() => handleTimeSelection(time)}
                      >
                        {time}
                      </button>
                    </li>
                  ))}
                </ul>
                {selectedTime && (
                  <div className="flex items-center justify-center mt-4">
                    <button
                      type="button"
                      className="px-16 py-2 text-white bg-main-blue rounded-lg"
                      onClick={handleSave}
                    >
                      Save
                    </button>
                  </div>
                )}
              </div>
            )}
          </SubBackground>
        </Background>
      </main>
    </div>
  );
}
