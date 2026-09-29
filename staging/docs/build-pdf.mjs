/**
 * Renders the two progress documents in staging/docs/ to PDF with headless
 * Chrome, the same way scripts/build-docs.mjs does for docs/ on main: the
 * documents are HTML with print stylesheets, so one source yields both.
 *
 *   node staging/docs/build-pdf.mjs
 */
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const chrome = [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  join(process.env.LOCALAPPDATA ?? '', 'Google/Chrome/Application/chrome.exe'),
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
].find((p) => existsSync(p));
if (!chrome) {
  console.error('Chrome atau Chromium tidak ditemukan; PDF tidak dapat dibuat.');
  process.exit(1);
}

for (const name of ['panduan-umum', 'dokumentasi-teknis']) {
  const html = resolve('staging/docs', `${name}.html`);
  const pdf = resolve('staging/docs', `${name}.pdf`);
  execFileSync(chrome, [
    '--headless=new',
    '--disable-gpu',
    '--no-pdf-header-footer',
    '--blink-settings=preferredColorScheme=1',
    '--virtual-time-budget=5000',
    `--print-to-pdf=${pdf}`,
    pathToFileURL(html).href,
  ], { stdio: 'ignore' });
  console.log(`${name}.pdf ditulis`);
}
