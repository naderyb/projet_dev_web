import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        terracotta: {
          50: "#fef7f0",
          100: "#feeee0",
          200: "#fcd9bf",
          300: "#f9bc94",
          400: "#f59562",
          500: "#f2743e",
          600: "#e35a26",
          700: "#bc441c",
          800: "#96371d",
          900: "#792f1b",
        },
        sand: {
          50: "#fefcf0",
          100: "#fef7d9",
          200: "#fdedb3",
          300: "#fbdc82",
          400: "#f8c64f",
          500: "#f5b22a",
          600: "#e0931f",
          700: "#bb721c",
          800: "#97591e",
          900: "#7c4a1d",
        },
        mint: {
          50: "#f0fdf6",
          100: "#dcfce8",
          200: "#bbf7d1",
          300: "#86efab",
          400: "#4ade7c",
          500: "#22c55e",
          600: "#16a34a",
          700: "#15803d",
          800: "#166534",
          900: "#14532d",
        },
      },
      fontFamily: {
        sans: ["Poppins", "Cairo", "sans-serif"],
        arabic: ["Cairo", "Amiri", "serif"],
      },
      backgroundImage: {
        "zellige-pattern": "url('/patterns/zellige.svg')",
      },
      animation: {
        "slide-up": "slideUp 0.5s ease-out",
        "fade-in": "fadeIn 0.3s ease-in",
        glow: "glow 2s ease-in-out infinite alternate",
      },
      keyframes: {
        slideUp: {
          "0%": { transform: "translateY(20px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        glow: {
          "0%": { boxShadow: "0 0 5px rgba(242, 116, 62, 0.5)" },
          "100%": { boxShadow: "0 0 20px rgba(242, 116, 62, 0.8)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
