import Footer from '@/src/components/footer';
import Header from "@/src/components/header";
import Background from '@/src/components/background';


export default function App() {
  return (
    <div>
      <Background>
      <Header />
      <main>
        {/* Other content goes here */}
      </main>
      </Background>
      <Footer />
    </div>
  );
}