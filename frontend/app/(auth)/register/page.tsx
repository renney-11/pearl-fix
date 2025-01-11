"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";

export default function SignUp() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "patient",
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!formData.name.includes(" ")) {
      alert("please enter both your first and last name.");
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      alert("passwords do not match!");
      return;
    }

    if (formData.password.length <= 7) {
      alert("password must be at least 8 characters");
      return;
    }

    setLoading(true); 

    try {
      const response = await fetch("/api/register", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          password: formData.password,
          role: formData.role,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const token = data.token;

        if (token) {
          sessionStorage.setItem("authToken", token);

          alert("Signup successful!");
          sessionStorage.setItem("email", formData.email);
          router.push("/patient-tool/landing-page");
        } else {
          alert("Signup successful, but no token received.");
        }
      } else {
        const error = await response.json();
        alert(`Error: ${error.error}`);
      }
    } catch (err) {
      console.error("Error submitting form:", err);
      alert("Failed to send signup data.");
    } finally {
      setLoading(false); 
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-[rgba(3,0,45)]">
      <div className="w-full max-w-2xl p-8 bg-[rgba(180,195,220,255)] rounded-lg shadow-lg">
        <div className="flex flex-col items-center mb-8">
          <a href="/">
            <img
              src="/assets/logo_vertical.png"
              alt="tooth beacon logo"
              className="w-40 h-35 mb-4 mt-1"
            />
          </a>
        </div>
        <form className="space-y-4" onSubmit={handleSubmit}>
          {/* Form inputs */}
          <div className="flex justify-between items-center gap-4">
            <input
              id="name"
              type="text"
              name="name"
              placeholder="Full name"
              className="w-full px-4 py-2 rounded border border-main-blue bg-transparent placeholder-main-blue text-main-blue focus:outline-none focus:ring-2 focus:ring-main-blue"
              value={formData.name}
              onChange={handleChange}
            />
          </div>
          <div className="flex justify-between items-center gap-4">
            <input
              id="email"
              type="email"
              name="email"
              placeholder="Email"
              className="w-full px-4 py-2 rounded border border-main-blue bg-transparent placeholder-main-blue text-main-blue focus:outline-none focus:ring-2 focus:ring-main-blue"
              value={formData.email}
              onChange={handleChange}
            />
          </div>
          <div className="flex justify-between items-center gap-4">
            <input
              id="password"
              type="password"
              name="password"
              placeholder="Password"
              className="w-full px-4 py-2 rounded border border-main-blue bg-transparent placeholder-main-blue text-main-blue focus:outline-none focus:ring-2 focus:ring-main-blue"
              value={formData.password}
              onChange={handleChange}
            />
          </div>
          <div className="flex justify-between items-center gap-4">
            <input
              id="confirmPassword"
              type="password"
              name="confirmPassword"
              placeholder="Confirm password"
              className="w-full px-4 py-2 rounded border border-main-blue bg-transparent placeholder-main-blue text-main-blue focus:outline-none focus:ring-2 focus:ring-main-blue"
              value={formData.confirmPassword}
              onChange={handleChange}
            />
          </div>
          <button
            type="submit"
            className="py-2 px-8 mt-4 bg-main-blue text-white rounded-full font-semibold hover:bg-blue-900 mx-auto block"
            disabled={loading}
          >
            {loading ? "Signing up..." : "Sign up"} {/* Display "Signing up..." while loading */}
          </button>
        </form>
        <p className="mt-4 text-center text-main-blue">
          Already have an account?{" "}
          <a href="/login" className="font-semibold text-blue-900">
            Log in
          </a>
        </p>
      </div>
    </div>
  );
}
