/**
 * Builds the React frontend into ./dist before the Worker is deployed.
 *
 * Invoked automatically by wrangler through `build.command` in wrangler.jsonc,
 * so that `npx wrangler deploy` stands on its own — including on Cloudflare
 * Workers Builds, which runs the deploy command against a fresh clone that does
 * not necessarily have node_modules.
 */
import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';

const jalankan = (perintah) => execSync(perintah, { stdio: 'inherit' });

// On a local machine the dependencies are usually present, so this step is skipped.
if (!existsSync('node_modules/vite')) {
  console.log('node_modules belum ada — memasang dependensi terlebih dahulu…');
  jalankan('npm ci --include=dev --no-audit --no-fund');
}

jalankan('npx vite build --config web/vite.config.ts');
