/** @type {import('tailwindcss').Config} */
export default {
  content: ['./web/index.html', './web/src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        merek: {
          50: '#eef6ff',
          100: '#d9ebff',
          500: '#2b7fff',
          600: '#1765e6',
          700: '#124fb4',
        },
      },
    },
  },
  plugins: [],
};
