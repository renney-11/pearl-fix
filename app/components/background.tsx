import teethBackground from "../public/assets/teeth-background.jpg"; // import image

export default function Background() {
  return (
<div className="absolute top-0 left-0 w-full h-full bg-[url('/assets/teeth-background.jpg')] bg-cover bg-center">
      {/* Background image is set here */}
    </div>
  );
}
