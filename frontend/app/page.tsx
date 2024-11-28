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
            {/* Flex container for the SVG images with gap between them */}
            <div className="flex">
              <img
                src="/assets/homepage1.svg"
                alt="Homepage 1"
                className="w-auto h-[300px]"
              />
              <img
                src="/assets/homepage2.svg"
                alt="Homepage 2"
                className="w-auto h-[300px]"
              />
              <img
                src="/assets/homepage3.svg"
                alt="Homepage 3"
                className="w-auto h-[300px]"
              />
            </div>
            <h1 className="text-3xl font-bold text-center text-main-blue mt-10">
              APPOINTMENTS MADE EASY
              <br />
              <span className="text-xl  font-normal">
                for you and all your loved ones
              </span>
            </h1>
            <button
              onClick={scrollToDescription}
              className="mt-5 px-4 py-2 text-white bg-main-blue rounded-lg hover:bg-main-blue-dark"
            >
              read more about us below
            </button>
          </div>

          <div
            id="description-section"
            className="bg-transparent-blue py-32 px-8 mb-20 mx-auto flex"
            style={{ backgroundColor: 'bg-transparent-blue' }}
          >
            <h2 className="text-4xl text-main-blue font-bold mb-20 mx-10 mt-16">
              WITH TOOTH BEACON YOU CAN...
            </h2>
            <ul className="text-main-blue space-y-5 text-xl mx-10">
              <li>
                <FontAwesomeIcon
                  icon={faTooth}
                  style={{ color: "#ffffff", marginRight: "10px" }}
                />
                find dental clinics near you
              </li>
              <li>
                <FontAwesomeIcon
                  icon={faTooth}
                  style={{ color: "#ffffff", marginRight: "10px" }}
                />
                book appointments at your chosen dental clinic
              </li>
              <li>
                <FontAwesomeIcon
                  icon={faTooth}
                  style={{ color: "#ffffff", marginRight: "10px" }}
                />
                find appointments as soon as possible, most suitable
              </li>
              <li>
                <FontAwesomeIcon
                  icon={faTooth} 
                  style={{ color: "#ffffff", marginRight: "10px" }}
                />
                easily cancel your appointments
              </li>
              <li>
                <FontAwesomeIcon
                  icon={faTooth} 
                  style={{ color: "#ffffff", marginRight: "10px" }}
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
