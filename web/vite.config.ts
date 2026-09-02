import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const webDir = fileURLToPath(new URL('.', import.meta.url));
const rootDir = fileURLToPath(new URL('..', import.meta.url));

export default defineConfig({
  root: webDir,
  plugins: [react()],
  // Konfigurasi Tailwind/PostCSS tinggal di root repo, bukan di dalam web/.
  css: { postcss: rootDir },
  build: {
    outDir: `${rootDir}dist`,
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    // `npm run dev` menjalankan Vite dan Wrangler bersamaan; panggilan /api
    // diteruskan ke Worker lokal sehingga tidak perlu CORS.
    proxy: { '/api': 'http://127.0.0.1:8787' },
  },
});
