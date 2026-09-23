/**
 * Renders the documents in docs/ to PDF using headless Chrome.
 *
 * Chrome is used rather than a PDF library because the documents are authored
 * as HTML with print stylesheets: one source produces both a page that can be
 * read in a browser and a file that can be handed to someone on paper.
 */
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const CANDIDATES = [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  join(process.env.LOCALAPPDATA ?? '', 'Google/Chrome/Application/chrome.exe'),
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
];

const chrome = CANDIDATES.find((p) => existsSync(p));
if (!chrome) {
  console.error('Chrome atau Chromium tidak ditemukan; PDF tidak dapat dibuat.');
  process.exit(1);
}

for (const name of ['panduan-umum', 'dokumentasi-teknis']) {
  const html = resolve(`docs/${name}.html`);
  const pdf = resolve(`docs/${name}.pdf`);
  execFileSync(chrome, [
    '--headless=new',
    '--disable-gpu',
    '--no-pdf-header-footer',
    `--print-to-pdf=${pdf}`,
    // A proper file URL: 'file://' + 'C:\\…' is not one on Windows.
    pathToFileURL(html).href,
  ]);
  console.log(`docs/${name}.pdf`);
}
