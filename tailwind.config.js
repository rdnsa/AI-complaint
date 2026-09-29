/** @type {import('tailwindcss').Config} */

/**
 * Every palette colour reads an RGB triplet from a CSS variable declared in
 * web/src/index.css, where `:root` holds the light values and `.dark` the dark
 * ones. Components keep using `bg-krem-50` or `text-maroon-900` as before; the
 * theme switch changes what those names resolve to.
 */
const v = (nama) => `rgb(var(--${nama}) / <alpha-value>)`;
const skala = (nama, langkah) =>
  Object.fromEntries(langkah.map((l) => [l, v(`${nama}-${l}`)]));

export default {
  content: ['./web/index.html', './web/src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Palet diambil dari poster "Peta Lokasi Gedung" UPI Kampus Tasikmalaya:
        // maroon tua untuk teks dan header, oranye bata untuk aksi, krem sebagai latar.
        maroon: skala('maroon', [50, 100, 200, 600, 700, 800, 900]),
        bata: skala('bata', [50, 100, 200, 300, 400, 500, 600, 700]),
        krem: skala('krem', [50, 100, 200, 300]),
        // Card and input surface: white in the light theme, deep brown in the dark one.
        permukaan: v('permukaan'),
        toska: {
          400: '#3CBFB9',
          500: '#1FA8A3',
          600: '#178C88',
        },
        // Colours that must not follow the theme: the header stays maroon in both.
        tetap: {
          maroon: '#4A1D16',
          krem: '#E4C0B7',
        },
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
      },
      boxShadow: {
        kartu: '0 1px 2px rgba(0,0,0,.04), 0 4px 16px -6px rgba(0,0,0,.12)',
        naik: '0 8px 28px -10px rgba(0,0,0,.3)',
      },
      backgroundImage: {
        'maroon-lembut': 'linear-gradient(135deg, #4A1D16 0%, #6B2A1E 55%, #8A3A22 100%)',
      },
    },
  },
  plugins: [],
};
