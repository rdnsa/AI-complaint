/** @type {import('tailwindcss').Config} */
export default {
  content: ['./web/index.html', './web/src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Palet diambil dari poster "Peta Lokasi Gedung" UPI Kampus Tasikmalaya:
        // maroon tua untuk teks dan header, oranye bata untuk aksi, krem sebagai latar.
        maroon: {
          50: '#FBF4F2',
          100: '#F5E4DF',
          200: '#E4C0B7',
          600: '#7A3628',
          700: '#5D2A20',
          800: '#4A1D16',
          900: '#3E1712',
        },
        bata: {
          50: '#FEF6F1',
          100: '#FCE8DC',
          200: '#F7CBB0',
          300: '#F0A87F',
          400: '#EA8149',
          500: '#E2571F',
          600: '#C74513',
          700: '#A03610',
        },
        krem: {
          50: '#FDFAF6',
          100: '#F9F2E8',
          200: '#F0E4D3',
          300: '#E2D0B8',
        },
        toska: {
          400: '#3CBFB9',
          500: '#1FA8A3',
          600: '#178C88',
        },
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
      },
      boxShadow: {
        kartu: '0 1px 2px rgba(62,23,18,.04), 0 4px 16px -6px rgba(62,23,18,.10)',
        naik: '0 8px 28px -10px rgba(62,23,18,.28)',
      },
      backgroundImage: {
        'maroon-lembut': 'linear-gradient(135deg, #4A1D16 0%, #6B2A1E 55%, #8A3A22 100%)',
      },
    },
  },
  plugins: [],
};
