"use client";
import Header from "@/src/components/header";
import SubBackground from "@/src/components/subbackground";
import Background from "@/src/components/background";
import { useState, useEffect } from "react";

export default function Appointment() {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [currentYear, setCurrentYear] = useState<number>(new Date().getFullYear());
  const [currentMonth, setCurrentMonth] = useState<number>(new Date().getMonth());
  const [availableSlots, setAvailableSlots] = useState<{ start: Date; end: Date }[]>([]);
  const [unavailableDays, setUnavailableDays] = useState<string[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDayUnavailable, setIsDayUnavailable] = useState(false);
  const [isDateBlocked, setIsDateBlocked] = useState(false);
  const [holidays, setHolidays] = useState<string[]>([]); // Store holidays

  const allSlots = [
    "07:00", "08:00", "09:00", "10:00", "11:00", "12:00",
    "13:00", "14:00", "15:00", "16:00", "17:00"
  ];

  const [dateAvailability, setDateAvailability] = useState<Record<string, { start: Date; end: Date }[]>>({});

  useEffect(() => {
    generateCalendar(currentYear, currentMonth);
  }, [currentYear, currentMonth, unavailableDays, dateAvailability, holidays]);

  useEffect(() => {
    const fetchHolidays = async () => {
      try {
        const response = await fetch(
          `https://calendarific.com/api/v2/holidays?api_key=HHCAcL6QW2USf32b9w3CqcvyQBMEZL7M&country=SE&year=${currentYear}`
        );
        const data = await response.json();
        if (data && data.response && data.response.holidays) {
          const holidayDates = data.response.holidays.map((holiday: any) => holiday.date.iso);
          setHolidays(holidayDates);
        }
      } catch (error) {
        console.error("Error fetching holidays:", error);
      }
    };

    fetchHolidays();
  }, [currentYear]);

  const generateCalendar = (year: number, month: number) => {
    const calendarElement = document.getElementById("calendar");
    const currentMonthElement = document.getElementById("currentMonth");
    const prevButton = document.getElementById("prevMonth") as HTMLButtonElement;
    const nextButton = document.getElementById("nextMonth") as HTMLButtonElement;

    if (!calendarElement || !currentMonthElement || !prevButton || !nextButton) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
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
      dayElement.className = "text-center font-semibold text-almost-black text-xs sm:text-base";
      dayElement.innerText = day;
      calendarElement.appendChild(dayElement);
    });

    for (let i = 0; i < firstDayOfWeek; i++) {
      const emptyDayElement = document.createElement("div");
      calendarElement.appendChild(emptyDayElement);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const dayElement = document.createElement("div");
      const currentDate = new Date(year, month, day);
      const dateKey = `${year}-${month + 1}-${day}`; // Adjusted month indexing

      dayElement.className =
        "text-center py-2 border cursor-pointer hover:bg-gray-200 text-xs sm:text-base";
      dayElement.innerText = String(day);

      const isPastDate = currentDate < today;

      if (isPastDate) {
        dayElement.classList.add("text-gray-300", "cursor-not-allowed");
      }

      if (unavailableDays.includes(dateKey)) {
        dayElement.classList.add("bg-red-100", "text-black");
      }

      if (holidays.includes(`${year}-${month + 1 < 10 ? '0' : ''}${month + 1}-${day < 10 ? '0' : ''}${day}`)) {
        dayElement.classList.add("bg-gray-200", "text-red-500");
      }

      if (dateAvailability[dateKey]) {
        const availableCount = dateAvailability[dateKey].length;
        if (availableCount === allSlots.length) {
          dayElement.classList.add("bg-green-100", "text-black");
        } else if (availableCount > 0) {
          dayElement.classList.add("bg-orange-100", "text-black");
        }
      }

      if (!isPastDate) {
        dayElement.addEventListener("click", () => handleDateSelection(currentDate));
      }

      calendarElement.appendChild(dayElement);
    }

    prevButton.disabled = year === today.getFullYear() && month === today.getMonth();
    nextButton.disabled = year === today.getFullYear() && month === today.getMonth() + 1;
  };

  const handleDateSelection = (date: Date) => {
    setSelectedDate(date);

    const dateKey = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
    if (unavailableDays.includes(dateKey)) {
      setIsDayUnavailable(true);
      setAvailableSlots([]);
    } else {
      setIsDayUnavailable(false);
      setAvailableSlots(getAvailableSlotsForDay(date));
    }

    setIsModalOpen(true);
  };

  const handleBlockedDateSelection = () => {
    setIsDateBlocked(true);
    setIsModalOpen(true);
  };

  const getAvailableSlotsForDay = (date: Date) => {
    const today = new Date();
    const availableSlotsForDay = allSlots.map(slot => {
      const [hour, minute] = slot.split(":").map(Number);
      const start = new Date(date);
      start.setHours(hour, minute, 0, 0);
      const end = new Date(start);
      end.setHours(hour + 1, minute, 0, 0);
      return { start, end };
    });

    if (date.toDateString() === today.toDateString()) {
      const currentHour = today.getHours();
      return availableSlotsForDay.filter(slot => slot.start.getHours() > currentHour);
    }

    return availableSlotsForDay;
  };

  const toggleSlotAvailability = (slot: string) => {
    const [hour, minute] = slot.split(":").map(Number);
    const start = new Date(selectedDate);  // Use the selectedDate for the base
    start.setHours(hour, minute, 0, 0);
    const end = new Date(start);
    end.setHours(hour + 1, minute, 0, 0);
  
    setAvailableSlots(prev =>
      prev.some(s => s.start.getTime() === start.getTime())
        ? prev.filter(s => s.start.getTime() !== start.getTime())
        : [...prev, { start, end }]
    );
  };

  const handleMarkDayUnavailable = () => {
    if (!selectedDate) return;

    const dateKey = `${selectedDate.getFullYear()}-${selectedDate.getMonth() + 1}-${selectedDate.getDate()}`;
    setUnavailableDays(prev => [...prev, dateKey]);
    setAvailableSlots([]);
    setIsDayUnavailable(true);
  };

  const handleMarkDayAvailable = () => {
    if (!selectedDate) return;

    const dateKey = `${selectedDate.getFullYear()}-${selectedDate.getMonth() + 1}-${selectedDate.getDate()}`;
    setUnavailableDays(prev => prev.filter(day => day !== dateKey));
    setAvailableSlots(getAvailableSlotsForDay(selectedDate));
    setIsDayUnavailable(false);
  };

  const handleSaveSlots = async () => {
    if (selectedDate) {
      const dateKey = `${selectedDate.getFullYear()}-${selectedDate.getMonth() + 1}-${selectedDate.getDate()}`;
      setDateAvailability(prev => ({
        ...prev,
        [dateKey]: availableSlots
      }));

      const token = sessionStorage.getItem("authToken");
      if (!token) {
        console.error("No token found. Please log in again.");
        return;
      }

      try {
        const response = await fetch("/api/dentistAvailability", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            date: dateKey,
            availableSlots: availableSlots.map(slot => ({
              start: slot.start,
              end: slot.end,
              status: "available"
            })),
          }),
        });

        if (!response.ok) {
          console.error("Failed to save availability:", await response.json());
        }
      } catch (error) {
        console.error("Failed to save availability:", error);
      }
    }

    setIsModalOpen(false);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setIsDateBlocked(false);
    setIsDayUnavailable(false);
  };

  return (
    <div>
      <main>
        <Background>
          <Header />
          <SubBackground>
            <div className="flex items-center justify-center hover:max-h-screen">
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
                      style={{ display: currentMonth === new Date().getMonth() && currentYear === new Date().getFullYear() ? 'none' : 'inline-block' }}
                    >
                      previous
                    </button>
                    <h2 id="currentMonth" className="text-white-blue text-sm sm:text-base text-center w-full">
                      {["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"][currentMonth]} {currentYear}
                    </h2>
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
                      style={{ display: currentYear === new Date().getFullYear() + 1 && currentMonth === 11 ? 'none' : 'inline-block' }}
                    >
                      next
                    </button>
                  </div>
                  <div className="grid grid-cols-7 gap-2 p-4" id="calendar"></div>
                </div>
              </div>
            </div>

            {isModalOpen && (
              <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
                <div className="bg-white-blue p-6 rounded-lg shadow-lg relative">
                  <button
                    onClick={handleCloseModal}
                    className="absolute top-2 right-2 text-xl text-gray-500 hover:text-gray-800"
                  >
                    &times;
                  </button>
                  <h3 className="text-lg font-semibold text-main-blue">
                    {isDateBlocked
                      ? "You can't manage this day"
                      : `Manage availability for ${selectedDate?.toDateString()}`}
                  </h3>
                  {!isDateBlocked && (
                    <>
                      <ul className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2">
  {allSlots.map((slot) => {
    const [hour, minute] = slot.split(":").map(Number);
    const start = new Date(selectedDate);  // Use the selectedDate for the base
    start.setHours(hour, minute, 0, 0);
    const end = new Date(start);
    end.setHours(hour + 1, minute, 0, 0);
    
    return (
      <li key={slot}>
        <input
          type="checkbox"
          id={slot}
          checked={availableSlots.some(s => s.start.getTime() === start.getTime())}
          onChange={() => toggleSlotAvailability(slot)}
          className="hidden"
        />
        <label
          htmlFor={slot}
          className={`inline-flex items-center justify-center w-full px-2 py-1 text-sm font-medium text-center border rounded-lg cursor-pointer ${
            availableSlots.some(s => s.start.getTime() === start.getTime())
              ? "bg-green-100 text-green-700 border-green-500"
              : "bg-red-100 text-red-700 border-red-500"
          }`}
        >
          {slot}
        </label>
      </li>
    );
  })}
</ul>
                      <div className="flex items-center justify-end mt-4 gap-2">
                        {isDayUnavailable ? (
                          <button
                            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-700"
                            onClick={handleMarkDayAvailable}
                          >
                            Make Day Available
                          </button>
                        ) : (
                          <button
                            className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-700"
                            onClick={handleMarkDayUnavailable}
                          >
                            Mark Day Unavailable
                          </button>
                        )}
                        <button
                          className="px-4 py-2 bg-blue-700 text-white rounded hover:bg-blue-900"
                          onClick={handleSaveSlots}
                        >
                          Save
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
          </SubBackground>
        </Background>
      </main>
    </div>
  );
}
