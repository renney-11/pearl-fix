import React from 'react';

interface SubBackgroundProps {
  children: React.ReactNode;
}

export default function SubBackground({ children }: SubBackgroundProps) {
  return (
    <div className="bg-[#E0DCFB] rounded-2xl p-6">
      {children}
    </div>
  );
}