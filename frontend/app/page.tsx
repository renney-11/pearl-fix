"use client";

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
          <div className="flex flex-col items-center py-20" >
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
        </main>
      </Background>
    </div>
  );
}
