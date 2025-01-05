"use client";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTooth } from "@fortawesome/free-solid-svg-icons"; 
import Header from "@/src/components/header";
import Background from "@/src/components/background";

export default function App() {
  const scrollToDescription = () => {
    const descriptionElement = document.getElementById("description-section");
    if (descriptionElement) {
      descriptionElement.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div>
      <Background>
        <Header />
        <main>
          <div className="flex flex-col items-center py-20 mb-20">
            {/* Flex container for the SVG images */}
            <div className="flex">
              <img
                src="/assets/homepage1.svg"
                alt="Homepage 1"
                className="w-auto h-[300px] 
                tablet:h-[200px] 
                laptop:h-[300px] 
                mobileL:h-[155px] 
                mobileM:h-[125px]"
              />
              <img
                src="/assets/homepage2.svg"
                alt="Homepage 2"
                className="w-auto h-[300px]
                tablet:h-[200px] 
                laptop:h-[300px] 
                mobileL:h-[155px] 
                mobileM:h-[125px]"
              />
              <img
                src="/assets/homepage3.svg"
                alt="Homepage 3"
                className="w-auto h-[300px]
                tablet:h-[200px] 
                laptop:h-[300px] 
                mobileL:h-[155px] 
                mobileM:h-[125px]"
              />
            </div>
            <h1 className="text-3xl font-bold text-center text-main-blue mt-10 
              laptop:text-3xl 
              mobileL:text-2xl mobileM:text-xl">
              APPOINTMENTS MADE EASY
              <br />
              <span className="text-xl font-normal 
                            laptop:text-xl 
                            mobileL:text-lg mobileM:text-base">
                for you and all your loved ones
              </span>
            </h1>

            <button
              onClick={scrollToDescription}
              className="mt-5 px-4 py-2 text-white bg-main-blue rounded-lg hover:bg-main-blue-dark 
              hover:scale-105 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 active:scale-95 transition-all duration-300 ease-in-out
                        laptop:px-6 laptop:py-3
                        mobileL:px-3 mobileL:py-1 mobileM:px-2 mobileM:py-1">
              read more about us below
            </button>

            </div>
            <div
            id="description-section"
            className="bg-transparent-blue py-32 px-8 mb-20 mx-auto flex flex-col-reverse
                      laptop:flex-row tablet:flex-row
                      mobileL:flex-col mobileM:flex-col"
            style={{ backgroundColor: 'bg-transparent-blue' }}
          >
            <h2 className="text-4xl text-main-blue font-bold mb-20 mx-10 mt-16
                          laptop:text-4xl tablet:text-3xl 
                          mobileL:text-3xl mobileL:mb-10 mobileM:text-2xl mobileM:mb-8">
              WITH PEARL FIX YOU CAN...
            </h2>

            <ul className="text-main-blue space-y-5 text-xl mx-10
                          laptop:text-xl tablet:text-lg
                          mobileL:text-lg mobileL:space-y-3 mobileM:text-base mobileM:space-y-2">
              <li>
                <FontAwesomeIcon
                  icon={faTooth}
                  style={{ color: "#ffffff", marginRight: "10px", fontSize: "24px" }} // Adjusted for mobile
                />
                find dental clinics near you
              </li>
              <li>
                <FontAwesomeIcon
                  icon={faTooth}
                  style={{ color: "#ffffff", marginRight: "10px", fontSize: "24px" }} // Adjusted for mobile
                />
                book appointments at your chosen dental clinic
              </li>
              <li>
                <FontAwesomeIcon
                  icon={faTooth}
                  style={{ color: "#ffffff", marginRight: "10px", fontSize: "24px" }} // Adjusted for mobile
                />
                find appointments as soon as possible, most suitable
              </li>
              <li>
                <FontAwesomeIcon
                  icon={faTooth} 
                  style={{ color: "#ffffff", marginRight: "10px", fontSize: "24px" }} // Adjusted for mobile
                />
                easily cancel your appointments
              </li>
              <li>
                <FontAwesomeIcon
                  icon={faTooth} 
                  style={{ color: "#ffffff", marginRight: "10px", fontSize: "24px" }} // Adjusted for mobile
                />
                be notified with updates regarding appointments
              </li>
            </ul>
          </div>

            
         

        </main>
      </Background>
    </div>
  );
}



