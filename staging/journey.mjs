/**
 * Writes the checkpoint hub (/checkpoint) that the staging router serves: one
 * card per checkpoint reported so far, with what it adds and buttons into that
 * checkpoint's own running app (/checkpointN/…, handled by router.mjs).
 *
 * Checkpoints not merged into the current checkout get no card, so a later
 * checkpoint is never shown before it is reported.
 *
 * It also copies the two progress documents next to it: the general guide
 * (staging/docs/panduan-umum, served as /panduan) and the technical
 * documentation (staging/docs/dokumentasi-teknis, served as /teknis), each
 * with its PDF.
 *
 * Run by scripts/staging.mjs as the router's build step:
 *   node staging/journey.mjs <outDir>
 */
import { copyFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { CHECKPOINTS, reachedCheckpoints } from './checkpoints.mjs';

const outDir = process.argv[2] ?? '.wrangler/staging-hub';
const reached = reachedCheckpoints();
const latest = reached[reached.length - 1].n;

const esc = (s) =>
  String(s).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);

/** Text fields may carry **bold**, *italic* and `code`; everything else is escaped. */
const rich = (s) =>
  esc(s)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code>$1</code>');

const CSS = `
:root {
  --ink: #1d1d1f; --ink-2: #424245; --slate: #6e6e73; --hair: #d2d2d7;
  --mist: #f5f5f7; --frost: #fafafc; --surface: #ffffff;
  --accent: #0071e3; --link: #0066cc; --accent-soft: #eef5fd; --good: #1f7a3d;
  --locked: #aeaeb2;
  color-scheme: light;
}
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    --ink: #f5f5f7; --ink-2: #d2d2d7; --slate: #a1a1a6; --hair: #3a3a3c;
    --mist: #000000; --frost: #151517; --surface: #1c1c1e;
    --accent: #0a84ff; --link: #2997ff; --accent-soft: #0d2c4a; --good: #5fd08a;
    --locked: #636366;
    color-scheme: dark;
  }
}
* { box-sizing: border-box; }
html { -webkit-text-size-adjust: 100%; }
body {
  margin: 0; background: var(--mist); color: var(--ink);
  font: 17px/1.5 "SF Pro Text", -apple-system, BlinkMacSystemFont, Inter, "Helvetica Neue", Arial, sans-serif;
  letter-spacing: -0.2px;
}
a { color: var(--link); text-decoration: none; }
a:hover { text-decoration: underline; }
a:focus-visible, summary:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; border-radius: 6px; }
code { font: 0.88em ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; background: var(--mist); padding: 1px 6px; border-radius: 6px; }
.wrap { max-width: 880px; margin: 0 auto; padding: 0 16px; }
header.top {
  position: sticky; top: 0; z-index: 5; backdrop-filter: saturate(180%) blur(20px);
  -webkit-backdrop-filter: saturate(180%) blur(20px);
  background: color-mix(in srgb, var(--mist) 80%, transparent); border-bottom: 1px solid var(--hair);
}
header.top .wrap { display: flex; align-items: center; justify-content: space-between; gap: 12px; height: 52px; }
.brand { font-weight: 600; color: var(--ink); font-size: 15px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; min-width: 0; }
.brand span { color: var(--slate); font-weight: 400; }
.top-links { font-size: 14px; white-space: nowrap; }

.hero { padding: 40px 0 28px; }
.kicker { color: var(--accent); font-weight: 600; font-size: 15px; margin: 0 0 8px; }
h1 { font-size: clamp(32px, 6vw, 48px); line-height: 1.08; letter-spacing: -0.8px; margin: 0 0 14px; font-weight: 700; }
.lead { font-size: clamp(18px, 2.4vw, 21px); line-height: 1.45; color: var(--ink-2); margin: 0; max-width: 40em; }
.hint { margin: 16px 0 0; font-size: 15px; color: var(--slate); max-width: 44em; }

.timeline { list-style: none; margin: 0 0 40px; padding: 0; position: relative; }
.timeline::before { content: ""; position: absolute; left: 19px; top: 8px; bottom: 8px; width: 2px; background: var(--hair); }
.timeline > li { position: relative; padding-left: 56px; margin-bottom: 16px; }
.dot { position: absolute; left: 0; top: 24px; width: 40px; height: 40px; border-radius: 50%; display: grid; place-items: center; font-weight: 700; font-size: 16px; background: var(--accent); color: #fff; }
.card { background: var(--surface); border-radius: 24px; padding: 24px 28px; }
.card h2 { font-size: 22px; letter-spacing: -0.3px; line-height: 1.25; margin: 0 0 6px; }
.card > p { color: var(--ink-2); margin: 0 0 16px; }
.now { display: inline-block; margin-left: 8px; font-size: 12px; font-weight: 600; color: var(--good); vertical-align: middle; letter-spacing: 0; }

details { border-top: 1px solid var(--hair); padding-top: 12px; margin-bottom: 16px; }
summary { cursor: pointer; font-weight: 600; font-size: 15px; color: var(--ink); list-style: none; }
summary::-webkit-details-marker { display: none; }
summary::before { content: "›"; display: inline-block; width: 1em; color: var(--slate); transition: transform .15s; }
details[open] summary::before { transform: rotate(90deg); }
.features { list-style: none; margin: 12px 0 0; padding: 0; display: grid; gap: 10px; }
.features li { background: var(--frost); border: 1px solid var(--hair); border-radius: 16px; padding: 14px 16px; font-size: 15px; line-height: 1.47; color: var(--ink-2); }
.features strong.t { display: block; color: var(--ink); font-size: 16px; margin-bottom: 2px; }
.who { display: inline-flex; flex-wrap: wrap; gap: 4px; margin: 0 0 6px; }
.tag { font-size: 11px; font-weight: 600; padding: 2px 9px; border-radius: 999px; background: var(--accent-soft); color: var(--link); }

.try { display: flex; flex-wrap: wrap; gap: 8px; }
.pill { display: inline-flex; align-items: center; padding: 9px 16px; border-radius: 999px; background: var(--accent); color: #fff; font-size: 15px; font-weight: 500; }
.pill:hover { text-decoration: none; filter: brightness(1.08); }
.pill.ghost { background: transparent; color: var(--link); border: 1px solid var(--hair); }
.note { font-size: 14px; color: var(--slate); margin: 12px 0 0; }

.timeline > li.locked .dot { background: var(--mist); color: var(--locked); border: 2px dashed var(--locked); }
.timeline > li.locked .card { background: transparent; border: 1px dashed var(--hair); color: var(--locked); padding: 18px 28px; }
.timeline > li.locked h2 { font-size: 17px; margin: 0; }
footer { color: var(--slate); font-size: 13px; padding: 0 0 40px; }

@media (max-width: 640px) {
  .brand span { display: none; }
  .card { padding: 20px; border-radius: 20px; }
  .timeline > li { padding-left: 44px; }
  .timeline::before { left: 15px; }
  .dot { width: 32px; height: 32px; font-size: 14px; top: 20px; }
}
`;

const FAVICON =
  'data:image/svg+xml,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="8" fill="#0071e3"/><path d="M9 17l5 5 9-11" stroke="#fff" stroke-width="3.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  );

function card(c) {
  const features = c.features
    .map(
      (f) => `<li><span class="who">${f.who.map((w) => `<span class="tag">${esc(w)}</span>`).join('')}</span>
<strong class="t">${rich(f.title)}</strong>${rich(f.text)}</li>`,
    )
    .join('');
  const buttons = [
    `<a class="pill" href="/checkpoint${c.n}">Buka aplikasi checkpoint ${c.n} →</a>`,
    ...c.tryIt.filter((t) => t.href !== '/').map((t) => `<a class="pill ghost" href="/checkpoint${c.n}${esc(t.href)}">${esc(t.label)}</a>`),
  ].join('');

  return `<li id="cp${c.n}"><span class="dot">${c.n}</span><article class="card">
  <h2>${esc(c.title)}${c.n === latest ? '<span class="now">● terbaru</span>' : ''}</h2>
  <p>${rich(c.lead)}</p>
  <details${c.n === latest ? ' open' : ''}><summary>Yang baru di checkpoint ini (${c.features.length})</summary><ul class="features">${features}</ul></details>
  <div class="try">${buttons}</div>
  ${c.tryNote ? `<p class="note">${rich(c.tryNote)}</p>` : ''}
</article></li>`;
}

function hub() {
  const items = CHECKPOINTS.map((c) =>
    c.n <= latest
      ? card(c)
      : `<li class="locked"><span class="dot">${c.n}</span><div class="card"><h2>Checkpoint ${c.n} · belum dilaporkan</h2></div></li>`,
  ).join('\n');

  return `<!doctype html>
<html lang="id">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Checkpoint Kato Report</title>
<meta name="description" content="Coba Kato Report persis seperti di setiap checkpoint pengembangannya.">
<meta name="robots" content="noindex">
<link rel="icon" href="${FAVICON}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap">
<style>${CSS}</style>
</head>
<body>
<header class="top"><div class="wrap">
  <a class="brand" href="/checkpoint">Checkpoint <span>· Kato Report</span></a>
  <nav class="top-links"><a href="/panduan">Panduan</a> &nbsp;·&nbsp; <a href="/teknis">Teknis</a> &nbsp;·&nbsp; <a href="/checkpoint${latest}">Versi terbaru →</a></nav>
</div></header>
<main class="wrap">
<div class="hero">
  <p class="kicker">Laporan progress bertahap · ${latest} dari ${CHECKPOINTS.length} checkpoint</p>
  <h1>Coba setiap tahap pengembangannya</h1>
  <p class="lead">Setiap checkpoint berjalan sebagai aplikasi sendiri, persis seperti saat checkpoint itu selesai. Buka checkpoint 1 untuk melihat bentuk paling awal, lalu naik satu per satu untuk merasakan apa yang bertambah.</p>
  <p class="hint">Buka <code>/checkpoint1</code>, <code>/checkpoint2</code>, dan seterusnya untuk berpindah checkpoint. Satu browser membuka satu checkpoint dalam satu waktu; pilihan itu berlaku sampai Anda membuka checkpoint lain dari halaman ini. Data dan login di setiap checkpoint terpisah, jadi laporan yang dikirim di checkpoint 2 tidak muncul di checkpoint 3. Silakan kirim laporan percobaan sebanyak yang diperlukan.</p>
  <p class="hint">Penjelasan lengkap setiap checkpoint ada di dua dokumen: <a href="/panduan">panduan umum</a> (<a href="/panduan.pdf">PDF</a>) untuk fitur dan cara mencobanya, dan <a href="/teknis">dokumentasi teknis</a> (<a href="/teknis.pdf">PDF</a>) untuk arsitektur dan perubahan kodenya.</p>
</div>
<ol class="timeline">
${items}
</ol>
</main>
<footer class="wrap">Situs staging untuk laporan progress. Tanpa memilih, situs ini membuka checkpoint ${latest}.</footer>
</body>
</html>
`;
}

mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, 'checkpoint.html'), hub());
for (const [source, target] of [['panduan-umum', 'panduan'], ['dokumentasi-teknis', 'teknis']]) {
  for (const ext of ['html', 'pdf']) {
    const file = `staging/docs/${source}.${ext}`;
    if (existsSync(file)) copyFileSync(file, join(outDir, `${target}.${ext}`));
  }
}
console.log(`journey: hub /checkpoint (checkpoint 1${latest > 1 ? `–${latest}` : ''}) ditulis ke ${outDir}/`);
