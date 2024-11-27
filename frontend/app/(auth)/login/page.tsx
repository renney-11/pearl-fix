"use client";
import React from "react";

export default function Login() {
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
        <form className="space-y-4">
          <div className="flex justify-between items-center gap-4">
            <input
              id="email"
              type="email"
              name="email"
              placeholder="email"
              className="w-full px-4 py-2 rounded border border-main-blue bg-transparent placeholder-main-blue text-main-blue focus:outline-none focus:ring-2 focus:ring-main-blue"
            />
          </div>
          <div className="flex justify-between items-center gap-4">
            <input
              id="password"
              type="password"
              name="password"
              placeholder="password"
              className="w-full px-4 py-2 rounded border border-main-blue bg-transparent placeholder-main-blue text-main-blue focus:outline-none focus:ring-2 focus:ring-main-blue"
            />
          </div>
          <button
            type="submit"
            className="py-2 px-8 mt-4 bg-main-blue text-white rounded-full font-semibold hover:bg-blue-900 mx-auto block"
          >
            login
          </button>
        </form>
        <p className="mt-4 text-center text-main-blue">
          new to tooth beacon?{" "}
          <a href="/register" className="font-semibold text-main-blue">
            create an account
          </a>
        </p>
      </div>
    </div>
  );
}
