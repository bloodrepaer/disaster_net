/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          600: '#0284c7',
          700: '#0369a1',
        },
        success: {
          50: '#f0fdf4',
          600: '#16a34a',
          700: '#15803d',
        },
        danger: {
          50: '#fef2f2',
          600: '#dc2626',
          700: '#b91c1c',
        },
        warning: {
          50: '#fffbeb',
          600: '#d97706',
          700: '#b45309',
        },
      },
      animation: {
        spin: 'spin 1s linear infinite',
      },
    },
  },
  plugins: [],
}
