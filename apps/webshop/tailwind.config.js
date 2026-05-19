/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: {
          50: "#eef9f6",
          100: "#d7f1e8",
          200: "#afe2d0",
          300: "#84cfb5",
          400: "#58b893",
          500: "#339d76",
          600: "#20795b",
          700: "#185c47",
          800: "#164a3a",
          900: "#153d31",
        },
      },
      boxShadow: {
        panel: "0 24px 80px rgba(14, 25, 23, 0.10)",
        float: "0 18px 40px rgba(32, 121, 91, 0.18)",
      },
    },
  },
  plugins: [],
};
