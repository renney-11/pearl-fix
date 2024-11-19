import Footer from '@/src/components/footer';
import Header from "@/src/components/header";
import SubBackground from "@/src/components/subbackground";
import Map from "@/src/components/map";  // Import the Map component

export default function App() {
  return (
    <div>
      <Header />
      <main>
        <div>
          <SubBackground>
            {/* Integrate the Map component here */}
            <Map />
          </SubBackground>
        </div>
        {/* Other content goes here */}
      </main>
      <Footer />
    </div>
  );
}
