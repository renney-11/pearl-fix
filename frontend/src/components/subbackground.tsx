import React from 'react';

interface SubBackgroundProps {
  children: React.ReactNode;
}

export default function SubBackground({ children }: SubBackgroundProps) {
  return (
    <div className="bg-[#D1E0F1] rounded-2xl p-6 m-10">
      {children}
    </div>
  );
}