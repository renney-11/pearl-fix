import type { Config } from "tailwindcss";

export default {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        'main-blue': '#1E3582',
        'transparent-blue': 'rgba(108,123,171,0.4)',
        'transparent-input': 'rgba(0,0,0,0.25)',
        'popup-blue': '#6C7BAB',
        'almost-black': '#0E1D4F',
        'white-blue': '#EDF7FB',
      },
      fontFamily: {
        sans: ['Figtree', 'sans-serif'], 
      },
    },
  },
  plugins: [],
} satisfies Config;
