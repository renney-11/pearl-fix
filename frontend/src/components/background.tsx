import React from 'react';

interface BackgroundProps {
  children: React.ReactNode;
}
export default function Background({ children }: BackgroundProps) {
  return (
    <div
      className="relative w-full min-h-screen bg-[url('/assets/teeth-background.jpg')] bg-cover bg-center overflow-y-auto"
    >
      {children}
    </div>
  );
}
