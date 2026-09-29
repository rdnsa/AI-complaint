/**
 * Renders the documents in docs/ to PDF using headless Chrome.
 *
 * Chrome is used rather than a PDF library because the documents are authored
 * as HTML with print stylesheets: one source produces both a page that can be
 * read in a browser and a file that can be handed to someone on paper.
 */
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

const KANDIDAT = [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
];

const chrome = KANDIDAT.find((p) => existsSync(p));
if (!chrome) {
  console.error('Chrome atau Chromium tidak ditemukan; PDF tidak dapat dibuat.');
  process.exit(1);
}

for (const nama of ['panduan-umum', 'dokumentasi-teknis']) {
  const html = resolve(`docs/${nama}.html`);
  const pdf = resolve(`docs/${nama}.pdf`);
  execFileSync(chrome, [
    '--headless=new',
    '--disable-gpu',
    '--no-pdf-header-footer',
    `--print-to-pdf=${pdf}`,
    `file://${html}`,
  ]);
  console.log(`docs/${nama}.pdf`);
}
