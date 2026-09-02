/**
 * Membangun frontend React ke ./dist sebelum Worker dideploy.
 *
 * Dipanggil otomatis oleh wrangler lewat `build.command` di wrangler.jsonc,
 * sehingga `npx wrangler deploy` cukup berdiri sendiri — termasuk di Cloudflare
 * Workers Builds, yang menjalankan perintah deploy pada repo hasil clone yang
 * belum tentu punya node_modules.
 */
import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';

const jalankan = (perintah) => execSync(perintah, { stdio: 'inherit' });

// Di mesin lokal dependensi biasanya sudah ada, jadi langkah ini dilewati.
if (!existsSync('node_modules/vite')) {
  console.log('node_modules belum ada — memasang dependensi terlebih dahulu…');
  jalankan('npm ci --include=dev --no-audit --no-fund');
}

jalankan('npx vite build --config web/vite.config.ts');
