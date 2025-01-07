"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";

export default function Login() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault(); // Prevent form submission before validation

    if (formData.password.length < 8) {
      alert("Your password cannot be less than 8 characters.");
      return;
    }

    setLoading(true); // Set loading only after validation passes

    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const token = data.token;

        if (token) {
          sessionStorage.setItem("authToken", token);
          alert("Login successful!");
          sessionStorage.setItem("email", formData.email);
          router.push("/patient-tool/landing-page");
        } else {
          alert("Login successful, but no token received.");
        }
      } else {
        const error = await response.json();
        alert(error.error || "Invalid credentials.");
      }
    } catch (err) {
      console.error("Error logging in:", err);
      alert("Failed to send login data. Please try again later.");
    } finally {
      setLoading(false); // Reset loading state
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-[rgba(3,0,45)]">
      <div className="w-full max-w-2xl p-8 bg-[rgba(180,195,220,255)] rounded-lg shadow-lg">
        <div className="flex flex-col items-center mb-8">
          <a href="/">
            <img
              src="/assets/logo_vertical.png"
              alt="Tooth Beacon Logo"
              className="w-40 h-35 mb-4 mt-1"
            />
          </a>
        </div>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="flex justify-between items-center gap-4">
            <input
              type="email"
              name="email"
              placeholder="email"
              className="w-full px-4 py-2 rounded border border-main-blue bg-transparent placeholder-main-blue text-main-blue focus:outline-none focus:ring-2 focus:ring-main-blue"
              value={formData.email}
              onChange={handleChange}
            />
          </div>
          <div className="flex justify-between items-center gap-4">
            <input
              type="password"
              name="password"
              placeholder="password"
              className="w-full px-4 py-2 rounded border border-main-blue bg-transparent placeholder-main-blue text-main-blue focus:outline-none focus:ring-2 focus:ring-main-blue"
              value={formData.password}
              onChange={handleChange}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`py-2 px-8 mt-4 ${
              loading ? "bg-gray-400" : "bg-main-blue"
            } text-white rounded-full font-semibold hover:bg-blue-900 mx-auto block`}
          >
            {loading ? "logging in..." : "login"}
          </button>
        </form>
        <p className="mt-4 text-center text-main-blue">
          new to PEARL FIX?{" "}
          <a href="/register" className="font-semibold text-blue-900">
            create an account
          </a>
        </p>
      </div>
    </div>
  );
}
