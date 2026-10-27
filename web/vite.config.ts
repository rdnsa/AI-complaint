import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const webDir = fileURLToPath(new URL('.', import.meta.url));
const rootDir = fileURLToPath(new URL('..', import.meta.url));

// Link-preview crawlers need absolute URLs, so index.html refers to the deployed
// origin as %SITE_URL%. Override with SITE_URL=… when deploying elsewhere.
const SITE_URL = (process.env.SITE_URL ?? 'https://ai-complaint.yvrtz.workers.dev').replace(/\/$/, '');

export default defineConfig({
  root: webDir,
  plugins: [
    react(),
    { name: 'site-url', transformIndexHtml: (html) => html.replaceAll('%SITE_URL%', SITE_URL) },
  ],
  // The Tailwind/PostCSS config lives at the repo root, not inside web/.
  css: { postcss: rootDir },
  build: {
    outDir: `${rootDir}dist`,
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    // A second `npm run dev` stops here instead of quietly opening on 5174
    // next to the first one: the app is always at http://localhost:5173.
    strictPort: true,
    // `npm run dev` runs Vite and Wrangler together; /api calls are
    // forwarded to the local Worker, so no CORS is needed.
    proxy: { '/api': 'http://127.0.0.1:8787' },
  },
});
