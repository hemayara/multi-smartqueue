/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        nexus: {
          bg: "#FFF9F5",          // Warm Silk Ivory Canvas (No dark/black!)
          sub: "#FFF1EB",         // Soft Warm Peach / Rose Sub-surface
          surface: "#FFFFFF",     // Crisp Pure White Card
          card: "#FFFFFF",        // Clean White Container
          border: "#FED7AA",      // Warm Coral Peach Border
          borderLight: "#FDBA74", // Hover / Active Border
          emerald: "#E11D48",     // Primary Lovable Crimson Red
          bright: "#F97316",      // Vibrant Sunset Orange Accent
          mint: "#E11D48",        // Primary Rose / Red Accent
          text: "#1E120D",        // Ultra-sharp Deep Espresso Text (Crystal Clear!)
          muted: "#785E53",       // Highly Readable Warm Cocoa
          dim: "#A88E83",         // Tertiary Muted
          warm: "#EA580C",        // Deep Orange / Amber
        },
        primary: {
          50: "#fff1f2",
          100: "#ffe4e6",
          200: "#fecdd3",
          300: "#fda4af",
          400: "#fb7185",
          500: "#f43f5e",
          600: "#e11d48",
          700: "#be123c",
          800: "#9f1239",
          900: "#881337",
          950: "#4c0519",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "sans-serif"],
        mono: ["'JetBrains Mono'", "monospace"],
      },
      animation: {
        "pulse-slow": "pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "fade-in": "fadeIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
        "float": "float 6s ease-in-out infinite",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0", transform: "translateY(6px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-6px)" },
        },
      },
      boxShadow: {
        "emerald-sm": "0 2px 10px -1px rgba(225, 29, 72, 0.12)",
        "emerald-md": "0 8px 25px -4px rgba(225, 29, 72, 0.2), 0 0 16px -2px rgba(249, 115, 22, 0.15)",
        "emerald-lg": "0 16px 40px -8px rgba(225, 29, 72, 0.25), 0 0 24px -2px rgba(249, 115, 22, 0.2)",
        "nexus-card": "0 10px 30px -8px rgba(225, 29, 72, 0.08), 0 0 0 1px #FED7AA",
      },
    },
  },
  plugins: [],
}
