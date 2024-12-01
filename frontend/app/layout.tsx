import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PEARL FIX",
  description: "Guide you to the best dental care",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className="antialiased"
      >
        {children}
      </body>
    </html>
  );
}
