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
      screens: {
        tablet: '768px',  // Set tablet breakpoint to 768px
        laptop: '1024px', // Set laptop breakpoint to 1024px
        mobileL: '480px', // for large mobile devices
        mobileM: '360px', // for medium mobile devices
      },
    },
  },
  plugins: [],
} satisfies Config;
