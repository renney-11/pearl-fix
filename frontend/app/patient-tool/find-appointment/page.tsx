"use client";
import Header from '@/src/components/header';
import SubBackground from '@/src/components/subbackground';
import Background from '@/src/components/background';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Appointment() {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [currentYear, setCurrentYear] = useState<number>(new Date().getFullYear());
  const [currentMonth, setCurrentMonth] = useState<number>(new Date().getMonth());
  const [availableTimes, setAvailableTimes] = useState<string[]>([]);
  const router = useRouter();

  useEffect(() => {
    generateCalendar(currentYear, currentMonth);
  }, [currentYear, currentMonth, selectedDate]);

  const generateCalendar = (year: number, month: number) => {
    const calendarElement = document.getElementById("calendar");
    const currentMonthElement = document.getElementById("currentMonth");
    const prevButton = document.getElementById("prevMonth") as HTMLButtonElement;

    if (!calendarElement || !currentMonthElement || !prevButton) return;

    const today = new Date();
    const firstDayOfMonth = new Date(year, month, 1);
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    calendarElement.innerHTML = "";
    const monthNames = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];
    currentMonthElement.innerText = `${monthNames[month]} ${year}`;

    const firstDayOfWeek = (firstDayOfMonth.getDay() + 6) % 7;
    const daysOfWeek = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

    daysOfWeek.forEach(day => {
      const dayElement = document.createElement("div");
      dayElement.className = "text-center font-semibold text-almost-black";
      dayElement.innerText = day;
      calendarElement.appendChild(dayElement);
    });

    // Add empty spaces for days before the first day of the month
    for (let i = 0; i < firstDayOfWeek; i++) {
      const emptyDayElement = document.createElement("div");
      calendarElement.appendChild(emptyDayElement);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const dayElement = document.createElement("div");
      const currentDate = new Date(year, month, day);

      dayElement.className =
        "text-center py-2 border cursor-pointer hover:bg-gray-200";
      dayElement.innerText = String(day);

      if (currentDate < today) {
        dayElement.className =
          "text-center py-2 border text-gray-200 cursor-not-allowed";
      }

      // Style for today
      if (
        currentDate.getFullYear() === today.getFullYear() &&
        currentDate.getMonth() === today.getMonth() &&
        currentDate.getDate() === today.getDate()
      ) {
        dayElement.classList.add("bg-violet-50", "text-blue-700");
      }

      // Style for selected date
      if (
        selectedDate &&
        currentDate.getFullYear() === selectedDate.getFullYear() &&
        currentDate.getMonth() === selectedDate.getMonth() &&
        currentDate.getDate() === selectedDate.getDate()
      ) {
        dayElement.classList.add("bg-blue-200", "text-white");
      }

      // Click handler for selectable dates
      if (currentDate >= today) {
        dayElement.addEventListener("click", () => handleDateSelection(currentDate));
      }

      calendarElement.appendChild(dayElement);
    }

    // Disable the "Previous" button if viewing the current month
    if (year === today.getFullYear() && month === today.getMonth()) {
      prevButton.disabled = true;
      prevButton.classList.add("opacity-0");
    } else {
      prevButton.disabled = false;
      prevButton.classList.remove("opacity-0");
    }
  };

  const handleDateSelection = (date: Date) => {
    setSelectedDate(date);

    const isWeekend = [0, 6].includes(date.getDay());
    setAvailableTimes(isWeekend ? getWeekendHours() : getWeekdayHours());
  };

  const getWeekdayHours = (): string[] => {
    return ["07:00", "08:00", "09:00", "10:00", "12:00", "13:00", "14:00", "16:00", "17:00"];
  };

  const getWeekendHours = (): string[] => {
    return ["9:00", "10:00", "11:00", "13:00", "14:00", "15:00"];
  };

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
          <SubBackground>
            <div className="flex items-center justify-center hover:max-h-screen ">
              <div className="lg:w-7/12 md:w-9/12 sm:w-10/12 mx-auto p-4">
                <div className="bg-white-blue shadow-lg rounded-lg overflow-hidden">
                  <div className="flex items-center justify-between px-6 py-3 bg-main-blue">
                    <button
                      id="prevMonth"
                      className="text-white-blue"
                      onClick={() => setCurrentMonth((prev) => (prev === 0 ? 11 : prev - 1))}
                    >
                      Previous
                    </button>
                    <h2 id="currentMonth" className="text-white-blue"></h2>
                    <button
                      id="nextMonth"
                      className="text-white-blue"
                      onClick={() => setCurrentMonth((prev) => (prev === 11 ? 0 : prev + 1))}
                    >
                      Next
                    </button>
                  </div>
                  <div className="grid grid-cols-7 gap-2 p-4" id="calendar"></div>
                </div>
              </div>
            </div>

            {selectedDate && (
              <div className="p-4">
                <h3 className="text-lg font-semibold text-gray-700">Selected Date: {selectedDate.toDateString()}</h3>
                <h4 className="text-md font-medium text-gray-600 mt-4">Select a Time:</h4>
                <ul className="grid grid-cols-3 gap-2 mt-2">
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
                    className="px-16 py-2 text-white bg-main-blue rounded-lg"
                    onClick={handleSave}
                  >
                    Save
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
