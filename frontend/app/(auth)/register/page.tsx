"use client";
import React, { useState } from "react";

export default function Login() {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

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
        alert("Login data sent successfully!");
      } else {
        const error = await response.json();
        alert(`Error: ${error.error}`);
      }
    } catch (err) {
      console.error("Error submitting form:", err);
      alert("Failed to send login data.");
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-main-blue">
      <div className="w-full max-w-lg p-8 bg-transparent-blue rounded-lg shadow-lg">
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
          <input
            type="email"
            name="email"
            placeholder="email"
            className="w-full px-4 py-2 rounded bg-transparent-input text-white placeholder-blue-300 focus:outline-none"
            value={formData.email}
            onChange={handleChange}
          />
          <input
            type="password"
            name="password"
            placeholder="password"
            className="w-full px-4 py-2 rounded bg-transparent-input text-white placeholder-blue-300 focus:outline-none"
            value={formData.password}
            onChange={handleChange}
          />
          <button
            type="submit"
            className="py-2 px-8 mt-4 text-blue-900 bg-white rounded-full font-semibold hover:bg-gray-200 mx-auto block"
          >
            login
          </button>
        </form>
        <p className="mt-4 text-center text-white">
          already have an account?{" "}
          <a href="/login" className="font-semibold text-blue-300">
            log in
          </a>
        </p>
      </div>
    </div>
  );
}