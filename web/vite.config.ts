import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const webDir = fileURLToPath(new URL('.', import.meta.url));
const rootDir = fileURLToPath(new URL('..', import.meta.url));

export default defineConfig({
  root: webDir,
  plugins: [react()],
  // The Tailwind/PostCSS config lives at the repo root, not inside web/.
  css: { postcss: rootDir },
  build: {
    outDir: `${rootDir}dist`,
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    // `npm run dev` runs Vite and Wrangler together; /api calls are
    // forwarded to the local Worker, so no CORS is needed.
    proxy: { '/api': 'http://127.0.0.1:8787' },
  },
});
