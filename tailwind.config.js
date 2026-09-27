/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#10B981", // verde estilo imagin
          dark: "#059669",
        },
        dark: {
          bg: "#0F172A",
          card: "#1E293B",
        },
      },
    },
  },
  darkMode: "class", // necesario para el modo claro/oscuro de la ventana de menú
  plugins: [],
};