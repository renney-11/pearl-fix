import React from 'react';
import Footer from './footer';

interface BackgroundProps {
  children: React.ReactNode;
}

export default function Background({ children }: BackgroundProps) {
  return (
    <div
      className="relative w-full min-h-screen overflow-y-auto"
      style={{ backgroundColor: 'rgba(229,243,253,255)' }}  // Set your desired background color
    >
      {children}
      <Footer /> {/* Footer is part of the content flow */}
    </div>
  );
}
