import Header from '@/src/components/header';
import SubBackground from "@/src/components/subbackground";
import Background from '@/src/components/background';
import Map from '@/src/components/map';
import { faStreetView, faTooth } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

export default function App() {
  return (
    <div>
      <main>
        <Background>
          <Header />
          <nav className="flex m-8" aria-label="Breadcrumb">
            <ol className="inline-flex items-center space-x-1 md:space-x-2 rtl:space-x-reverse">
                <li className="inline-flex items-center">
                <a href="/patient-tool/landing-page" className="inline-flex items-center text-sm font-medium text-popup-blue hover:text-main-blue dark:text-gray-400 dark:hover:text-blue">
                    <svg className="w-3 h-3 me-2.5" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 20 20">
                    <path d="m19.707 9.293-2-2-7-7a1 1 0 0 0-1.414 0l-7 7-2 2a1 1 0 0 0 1.414 1.414L2 10.414V18a2 2 0 0 0 2 2h3a1 1 0 0 0 1-1v-4a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v4a1 1 0 0 0 1 1h3a2 2 0 0 0 2-2v-7.586l.293.293a1 1 0 0 0 1.414-1.414Z"/>
                    </svg>
                    Home
                </a>
                </li>
                <li aria-current="page">
                <div className="flex items-center">
                    <svg className="rtl:rotate-180 w-3 h-3 text-popup-blue mx-1" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 6 10">
                    <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m1 9 4-4-4-4"/>
                    </svg>
                    <span className="ms-1 text-sm font-medium text-gray-500 md:ms-2 dark:text-gray-400">Find care</span>
                </div>
                </li>
            </ol>
            </nav>
            <SubBackground>
            <h2 className="text-4xl font-bold text-[#1E3582] text-center mb-5">
            Find your nearest care
          </h2>
          <div className="text-lg font-medium text-[#1E3582] text-center mb-8">
            <p>Explore the map to find nearby clinics and either navigate to them or book an appointment</p>
          </div>

          <div className="m-10">
            <Map />
          </div>

          <div className="flex justify-start items-center gap-8 mt-5 text-[#1E3582] ml-10">
            <div className="flex items-center gap-2">
              <div className="text-[24px] text-[#1E3582]">
                <FontAwesomeIcon icon={faStreetView} />
              </div>
              <span>Your current location</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="text-[24px] text-[#1E3582]">
                <FontAwesomeIcon icon={faTooth} />
              </div>
              <span>Available clinics</span>
            </div>
          </div>

          </SubBackground>
        </Background>
      </main>
    </div>
  );
}
