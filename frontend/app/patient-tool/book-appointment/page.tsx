"use client";
import Header from '@/src/components/header';
import SubBackground from '@/src/components/subbackground';
import Background from '@/src/components/background';
import { useEffect } from 'react';


export default function App() {
    useEffect(() => {
        function generateCalendar(year: number, month: number) {
          const calendarElement = document.getElementById('calendar');
          const currentMonthElement = document.getElementById('currentMonth');
          const prevButton = document.getElementById('prevMonth') as HTMLButtonElement;
    
          if (!calendarElement || !currentMonthElement || !prevButton) return;
    
          const firstDayOfMonth = new Date(year, month, 1);
          const daysInMonth = new Date(year, month + 1, 0).getDate();
    
          calendarElement.innerHTML = '';
          const monthNames = [
            'January', 'February', 'March', 'April', 'May', 'June', 
            'July', 'August', 'September', 'October', 'November', 'December'
          ];
          currentMonthElement.innerText = `${monthNames[month]} ${year}`;
    
          const firstDayOfWeek = firstDayOfMonth.getDay();
          const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    
          daysOfWeek.forEach(day => {
            const dayElement = document.createElement('div');
            dayElement.className = 'text-center font-semibold';
            dayElement.innerText = day;
            calendarElement.appendChild(dayElement);
          });
    
          for (let i = 0; i < firstDayOfWeek; i++) {
            const emptyDayElement = document.createElement('div');
            calendarElement.appendChild(emptyDayElement);
          }
    
          for (let day = 1; day <= daysInMonth; day++) {
            const dayElement = document.createElement('div');
            dayElement.className = 'text-center py-2 border cursor-pointer';
            dayElement.innerText = String(day);
    
            const currentDate = new Date();
            const selectedDate = new Date(year, month, day);
    
            if (year === currentDate.getFullYear() && month === currentDate.getMonth() && day === currentDate.getDate()) {
              dayElement.classList.add('bg-blue-500', 'text-white');
            }
    
            if (selectedDate < currentDate) {
              dayElement.classList.add('text-gray-400', 'cursor-not-allowed');
            } else {
              dayElement.addEventListener('click', () => {
                const options: Intl.DateTimeFormatOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
                const formattedDate = selectedDate.toLocaleDateString(undefined, options);
                showModal(formattedDate);
              });
            }
    
            calendarElement.appendChild(dayElement);
          }
    
          const currentDate = new Date();
          if (year === currentDate.getFullYear() && month === currentDate.getMonth()) {
            prevButton.disabled = true;
            prevButton.classList.add('opacity-0');
          } else {
            prevButton.disabled = false;
            prevButton.classList.remove('opacity-0');
          }
        }
    
        function showModal(selectedDate: string) {
          const modal = document.getElementById('myModal');
          const modalDateElement = document.getElementById('modalDate');
          if (!modal || !modalDateElement) return;
    
          modalDateElement.innerText = selectedDate;
          modal.classList.remove('hidden');
        }
    
        function hideModal() {
          const modal = document.getElementById('myModal');
          if (!modal) return;
          modal.classList.add('hidden');
        }
    
        const currentDate = new Date();
        let currentYear = currentDate.getFullYear();
        let currentMonth = currentDate.getMonth();
        generateCalendar(currentYear, currentMonth);
    
        document.getElementById('prevMonth')?.addEventListener('click', () => {
          if (currentMonth === 0) {
            currentMonth = 11;
            currentYear--;
          } else {
            currentMonth--;
          }
          generateCalendar(currentYear, currentMonth);
        });
    
        document.getElementById('nextMonth')?.addEventListener('click', () => {
          if (currentMonth === 11) {
            currentMonth = 0;
            currentYear++;
          } else {
            currentMonth++;
          }
          generateCalendar(currentYear, currentMonth);
        });
    
        document.getElementById('closeModal')?.addEventListener('click', hideModal);
      }, []);

  return (
    <div>
      <main>
        <Background>
          <Header />

            <nav className="flex m-8" aria-label="Breadcrumb">
            <ol className="inline-flex items-center space-x-1 md:space-x-2 rtl:space-x-reverse">
                <li className="inline-flex items-center">
                <a href="/" className="inline-flex items-center text-sm font-medium text-popup-blue hover:text-main-blue dark:text-gray-400 dark:hover:text-white">
                    <svg className="w-3 h-3 me-2.5" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 20 20">
                    <path d="m19.707 9.293-2-2-7-7a1 1 0 0 0-1.414 0l-7 7-2 2a1 1 0 0 0 1.414 1.414L2 10.414V18a2 2 0 0 0 2 2h3a1 1 0 0 0 1-1v-4a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v4a1 1 0 0 0 1 1h3a2 2 0 0 0 2-2v-7.586l.293.293a1 1 0 0 0 1.414-1.414Z"/>
                    </svg>
                    home
                </a>
                </li>
                <li>
                <div className="flex items-center">
                    <svg className="rtl:rotate-180 w-3 h-3 text-popup-blue mx-1" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 6 10">
                    <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m1 9 4-4-4-4"/>
                    </svg>
                    <a href="/patient-tool/find-care" className="ms-1 text-sm font-medium text-popup-blue hover:text-main-blue md:ms-2 dark:text-gray-400 dark:hover:text-white">find care</a>
                </div>
                </li>
                <li aria-current="page">
                <div className="flex items-center">
                    <svg className="rtl:rotate-180 w-3 h-3 text-popup-blue mx-1" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 6 10">
                    <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m1 9 4-4-4-4"/>
                    </svg>
                    <span className="ms-1 text-sm font-medium text-gray-500 md:ms-2 dark:text-gray-400">find appointment</span>
                </div>
                </li>
            </ol>
            </nav>

          <SubBackground>
             
          <div className="flex items-center justify-center h-screen">
              <div className="lg:w-7/12 md:w-9/12 sm:w-10/12 mx-auto p-4">
                <div className="bg-[#edf7fb] shadow-lg rounded-lg overflow-hidden">
                  <div className="flex items-center justify-between px-6 py-3 bg-main-blue">
                    <button id="prevMonth" className="text-white">Previous</button>
                    <h2 id="currentMonth" className="text-white"></h2>
                    <button id="nextMonth" className="text-white">Next</button>
                  </div>
                  <div className="grid grid-cols-7 gap-2 p-4" id="calendar"></div>
                  <div id="myModal" className="modal hidden fixed inset-0 flex items-center justify-center z-50">
                    <div className="modal-overlay absolute inset-0 bg-black opacity-50"></div>
                    <div className="modal-container bg-white w-11/12 md:max-w-md mx-auto rounded shadow-lg z-50 overflow-y-auto">
                      <div className="modal-content py-4 text-left px-6">
                        <div className="flex justify-between items-center pb-3">
                          <p className="text-2xl font-bold">Selected Date</p>
                          <button id="closeModal" className="modal-close px-3 py-1 rounded-full bg-gray-200 hover:bg-gray-300">✕</button>
                        </div>
                        <div id="modalDate" className="text-xl font-semibold"></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </SubBackground>
        </Background>
      </main>
    </div>
  );
  
}
