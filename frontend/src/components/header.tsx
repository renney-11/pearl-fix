"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Header() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const router = useRouter();

  // Check if authToken is stored in sessionStorage
  useEffect(() => {
    const token = sessionStorage.getItem("authToken");
    setIsAuthenticated(!!token);
  }, []);

  const handleLogout = async () => {
    try {
      const email = sessionStorage.getItem("email");
  
      if (email) {
        const logoutResponse = await fetch("/api/logout", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email }),
        });
  
        if (!logoutResponse.ok) {
          console.error("Failed to send logout message");
          return;
        }
        console.log("Logout message sent successfully.");
      } else {
        console.error("Email not found in session storage.");
      }
  
      const purgeResponse = await fetch("/api/purge", { method: "POST" });
      if (purgeResponse.ok) {
        console.log("Queues purged successfully.");
      } else {
        console.error("Failed to purge queues.");
      }
  
      // Clear session data
      sessionStorage.removeItem("authToken");
      sessionStorage.removeItem("email");
      sessionStorage.removeItem("clinic");
      sessionStorage.removeItem("clinicAddress");
      sessionStorage.removeItem("clinicName");
      sessionStorage.removeItem("dentist");
      sessionStorage.removeItem("selectedTime");
      sessionStorage.removeItem("selectedDate");
        
      setIsAuthenticated(false);
      router.push("/");
    } catch (error) {
      console.error("Error during logout:", error);
    }
  };  


  return (
    <nav className="bg-[rgba(229,243,253,255)] py-6 px-8 shadow-md">
      <div className="container mx-auto flex items-center justify-between flex-col sm:flex-row">
        {/* Logo Section */}
        <div className="flex items-center mb-4 sm:mb-0">
          <img
            src="/assets/logo_horizontal.png"
            alt="Logo"
            className="h-20 w-auto"
          />
        </div>

        {/* Login and Sign Up/Logout Buttons Section */}
        <div className="flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-6">
          {isAuthenticated ? (
            // If authenticated, show Logout
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-[#1E3582] text-[rgba(229,243,253,255)] rounded-full font-semibold"
            >
              log out
            </button>
          ) : (
            <>
              {/* Login Button */}
              <a
                href="/login"
                className="text-[#1E3582] hover:text-[#1C1C28] relative group"
              >
                log in
                <span className="block h-0.5 w-0 bg-[#A3B4D3] group-hover:w-full transition-all duration-300"></span>
              </a>

              {/* Sign Up Button */}
              <a
                href="/register"
                className="px-4 py-2 bg-[#1E3582] text-[rgba(229,243,253,255)] rounded-full font-semibold"
              >
                sign up
              </a>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
