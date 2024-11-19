import Footer from '@/src/components/footer';
import Header from "@/src/components/header";
import Background from '@/src/components/background';
import SubBackground from '@/src/components/subbackground';


export default function App() {
  return (
    <div>
      <Background>
      <Header />
      <SubBackground>
      <main>
        {/* Other content goes here */}
      </main>
      </SubBackground>
      </Background>
      <Footer />
    </div>
  );
}