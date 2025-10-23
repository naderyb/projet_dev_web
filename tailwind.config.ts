import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class", ".dark"],
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
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
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      animation: {
        "slide-up": "slideUp 0.5s ease-out",
        "fade-in": "fadeIn 0.3s ease-in",
        glow: "glow 2s ease-in-out infinite alternate",
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
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
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
