/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        red: {
          DEFAULT: '#910000',
          bright: '#ff0000',
        },
        dark: {
          DEFAULT: '#0d0d0d',
          50: '#161616',
          100: '#111111',
          200: '#1a1a1a',
          300: '#1e1e1e',
          400: '#2a2a2a',
        },
        gray: {
          100: '#cccccc',
          200: '#888888',
          300: '#555555',
          400: '#333333',
        },
      },
      fontFamily: {
        sans: ['Montserrat', 'sans-serif'],
      },
    },
  },
  plugins: [],
}