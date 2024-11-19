import teethBackground from "../public/assets/teeth-background.jpg"; // import image
import React from 'react';

interface BackgroundProps {
  children: React.ReactNode;
}
export default function Background({ children }: BackgroundProps) {
  return (
<div className="absolute top-0 left-0 w-full h-full bg-[url('/assets/teeth-background.jpg')] bg-cover bg-center">
      {children}
    </div>
  );
}
