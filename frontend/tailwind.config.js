/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        // Teal brand palette (from mockup sidebar/buttons)
        brand: {
          50:  '#e6f7f7',
          100: '#b3e6e6',
          200: '#80d5d5',
          300: '#4dc4c4',
          400: '#26b3b3',
          500: '#0d7377',  // primary teal
          600: '#0b6266',
          700: '#094f52',
          800: '#073d3f',
          900: '#052a2c',
          950: '#031c1d',
        },
        // Surface colors (light theme)
        surface: {
          DEFAULT: '#f0f4f8',
          50:  '#ffffff',
          100: '#f8fafb',
          200: '#f0f4f8',
          300: '#e2e8f0',
          400: '#cbd5e1',
        },
        // Sidebar dark teal
        sidebar: {
          DEFAULT: '#073d3f',
          light:   '#094f52',
          hover:   '#0b6266',
          active:  '#0d7377',
        },
      },
    },
  },
  plugins: [],
}
