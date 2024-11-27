import Header from '@/src/components/header';
import SubBackground from '@/src/components/subbackground';
import Background from '@/src/components/background';
import Map from '@/src/components/map';

export default function App() {
  return (
    <div>
      <main>
        <Background>
          <Header />
          <SubBackground>
            <h2 className="text-4xl font-bold text-[#1E3582] text-center mb-5">
              find your nearest care
            </h2>
            <div className="m-10">
              <Map />
            </div>
          </SubBackground>
        </Background>
      </main>
    </div>
  );
}
