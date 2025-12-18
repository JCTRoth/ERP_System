/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
          950: '#172554',
        },
        sidebar: {
          DEFAULT: '#1C2434',
          hover: '#333A48',
        },
        stroke: {
          DEFAULT: '#E2E8F0',
          dark: '#2E3A47',
        },
        bodydark: '#AEB7C0',
        bodydark1: '#DEE4EE',
        bodydark2: '#8A99AF',
      },
      fontFamily: {
        sans: ['Karla', 'sans-serif'],
      },
      boxShadow: {
        card: '0px 1px 3px rgba(0, 0, 0, 0.12)',
        'card-hover': '0px 4px 12px rgba(0, 0, 0, 0.15)',
      },
      screens: {
        '2xsm': '375px',
        xsm: '425px',
        '3xl': '2000px',
      },
    },
  },
  plugins: [],
};
