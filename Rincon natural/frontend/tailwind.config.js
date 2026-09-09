/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'verde': '#2D5016',
        'madera': '#8B6914',
        'madera-light': '#A0826D',
        'blanco': '#FFFFFF',
      },
      spacing: {
        '128': '32rem',
      }
    },
  },
  plugins: [],
}
