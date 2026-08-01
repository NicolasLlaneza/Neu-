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
          100: '#f5f5f5',   // texto principal (blanco suave, cómodo en OLED)
          200: '#b8b8b8',   // texto secundario, labels
          300: '#7a7a7a',   // placeholders, hints, texto terciario
          400: '#3a3a3a',   // bordes y separadores
        },
      },
      fontFamily: {
        sans: ['Montserrat', 'sans-serif'],
      },
    },
  },
  plugins: [],
}