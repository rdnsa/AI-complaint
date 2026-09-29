/**
 * Writes the "journey" pages of the staging site into the build output:
 *
 *   /checkpoint           the timeline, one card per checkpoint reached so far
 *   /checkpoint1 … 6      what changed at that checkpoint, for readers who were
 *                         not part of the development
 *
 * Only checkpoints already merged into the current checkout get a page, so a
 * later checkpoint is never shown before it is reported. The pages are plain
 * static files; the asset server finds /checkpoint2 as checkpoint2.html before
 * the single-page-app fallback ever sees it, so the app's own routes are
 * untouched.
 *
 * Run by scripts/staging.mjs after the frontend build:
 *   node staging/journey.mjs [outDir=dist]
 */
import { execSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { CHECKPOINTS } from './checkpoints.mjs';

const outDir = process.argv[2] ?? 'dist';

function isReached(commit) {
  try {
    execSync(`git merge-base --is-ancestor ${commit} HEAD`, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

let reached;
try {
  execSync('git rev-parse HEAD', { stdio: 'ignore' });
  reached = CHECKPOINTS.filter((c) => isReached(c.commit));
} catch {
  console.warn('journey: git tidak tersedia, hanya checkpoint 1 yang ditampilkan');
  reached = CHECKPOINTS.slice(0, 1);
}
if (!reached.length) reached = CHECKPOINTS.slice(0, 1);
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
  --accent: #0071e3; --link: #0066cc; --accent-soft: #eef5fd;
  --good: #1f7a3d; --good-soft: #eaf6ee; --bad: #b3261e; --bad-soft: #fdeceb;
  --locked: #aeaeb2;
  color-scheme: light;
}
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    --ink: #f5f5f7; --ink-2: #d2d2d7; --slate: #a1a1a6; --hair: #3a3a3c;
    --mist: #000000; --frost: #0b0b0c; --surface: #1c1c1e;
    --accent: #0a84ff; --link: #2997ff; --accent-soft: #0d2c4a;
    --good: #5fd08a; --good-soft: #10291a; --bad: #ff8a80; --bad-soft: #33130f;
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
a:focus-visible, button:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; border-radius: 6px; }
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
.top-links { display: flex; gap: 16px; font-size: 14px; white-space: nowrap; }

.stepper { display: flex; gap: 6px; list-style: none; margin: 28px 0 0; padding: 0; }
.stepper li { flex: 1; min-width: 0; }
.stepper > li > a, .stepper > li > span {
  display: block; text-align: center; padding: 8px 4px 6px; border-radius: 12px; font-size: 13px;
  color: var(--slate); border-top: 3px solid var(--hair); border-top-left-radius: 0; border-top-right-radius: 0;
}
.stepper a:hover { text-decoration: none; background: var(--surface); }
.stepper .done a { color: var(--ink-2); border-top-color: var(--accent); }
.stepper .current a { color: var(--ink); font-weight: 600; border-top-color: var(--accent); background: var(--surface); }
.stepper .locked span { color: var(--locked); border-top-style: dashed; }
.stepper b { display: block; font-size: 17px; }

.hero { padding: 40px 0 28px; }
.kicker { color: var(--accent); font-weight: 600; font-size: 15px; margin: 0 0 8px; }
h1 { font-size: clamp(32px, 6vw, 48px); line-height: 1.08; letter-spacing: -0.8px; margin: 0 0 14px; font-weight: 700; }
.lead { font-size: clamp(19px, 2.6vw, 22px); line-height: 1.4; color: var(--ink-2); margin: 0; max-width: 40em; }

section { margin: 0 0 20px; }
.card { background: var(--surface); border-radius: 24px; padding: 28px; }
.card + .card { margin-top: 16px; }
h2 { font-size: 26px; letter-spacing: -0.4px; line-height: 1.2; margin: 0 0 6px; }
.card > .sub { color: var(--slate); margin: 0 0 20px; }
h3 { font-size: 18px; margin: 0 0 4px; letter-spacing: -0.2px; }
p { margin: 0 0 12px; }
p:last-child { margin-bottom: 0; }

.features { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 12px; }
.feature { background: var(--frost); border: 1px solid var(--hair); border-radius: 18px; padding: 18px; }
.feature p { color: var(--ink-2); font-size: 15px; line-height: 1.47; }
.who { display: flex; flex-wrap: wrap; gap: 6px; margin: 0 0 10px; }
.tag { font-size: 12px; font-weight: 600; padding: 3px 10px; border-radius: 999px; background: var(--accent-soft); color: var(--link); }

.problem { border-left: 3px solid var(--accent); padding: 2px 0 2px 16px; color: var(--ink-2); }

.example { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.example .in, .example .out { border-radius: 18px; padding: 18px; }
.example .in { background: var(--mist); }
.example .out { background: var(--accent-soft); }
.example .label { font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.6px; color: var(--slate); margin: 0 0 8px; }
.example .quote { font-size: 18px; line-height: 1.4; font-style: italic; }
.example dl { margin: 0; display: grid; grid-template-columns: auto 1fr; gap: 6px 12px; font-size: 15px; }
.example dt { color: var(--slate); }
.example dd { margin: 0; }
.verdicts { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.verdict { border-radius: 18px; padding: 18px; font-size: 15px; }
.verdict.ok { background: var(--good-soft); }
.verdict.no { background: var(--bad-soft); }
.verdict strong { display: block; margin-bottom: 4px; }
.verdict.ok strong { color: var(--good); }
.verdict.no strong { color: var(--bad); }

ul.plain { margin: 0; padding-left: 20px; }
ul.plain li { margin-bottom: 8px; color: var(--ink-2); }
ul.plain li:last-child { margin-bottom: 0; }

.try { display: flex; flex-wrap: wrap; gap: 8px; }
.pill { display: inline-flex; align-items: center; gap: 6px; padding: 9px 16px; border-radius: 999px; background: var(--accent); color: #fff; font-size: 15px; font-weight: 500; }
.pill:hover { text-decoration: none; filter: brightness(1.08); }
.pill.ghost { background: transparent; color: var(--link); border: 1px solid var(--hair); }
.note { font-size: 14px; color: var(--slate); margin-top: 12px; }

.pager { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin: 28px 0 56px; }
.pager a, .pager .blank { display: block; background: var(--surface); border-radius: 18px; padding: 16px 20px; }
.pager a:hover { text-decoration: none; box-shadow: 0 0 0 1px var(--hair); }
.pager .dir { font-size: 13px; color: var(--slate); }
.pager .t { color: var(--ink); font-weight: 600; }
.pager .next { text-align: right; }
.pager .blank { background: transparent; }

.timeline { list-style: none; margin: 0 0 56px; padding: 0; position: relative; }
.timeline::before { content: ""; position: absolute; left: 19px; top: 8px; bottom: 8px; width: 2px; background: var(--hair); }
.timeline li { position: relative; padding-left: 56px; margin-bottom: 14px; }
.dot { position: absolute; left: 0; top: 22px; width: 40px; height: 40px; border-radius: 50%; display: grid; place-items: center; font-weight: 700; font-size: 16px; background: var(--accent); color: #fff; }
.timeline .locked .dot { background: var(--mist); color: var(--locked); border: 2px dashed var(--locked); }
.timeline a.card { display: block; color: inherit; }
.timeline a.card:hover { text-decoration: none; box-shadow: 0 0 0 1px var(--hair); }
.timeline .card p { color: var(--ink-2); font-size: 15px; margin: 6px 0 0; }
.timeline .locked .card { background: transparent; border: 1px dashed var(--hair); color: var(--locked); padding: 18px 28px; }
.badge-now { display: inline-block; margin-left: 8px; font-size: 12px; font-weight: 600; color: var(--good); vertical-align: middle; }
footer { color: var(--slate); font-size: 13px; padding: 0 0 40px; }

@media (max-width: 640px) {
  .card { padding: 20px; border-radius: 20px; }
  .example, .verdicts { grid-template-columns: 1fr; }
  .stepper b { font-size: 15px; }
  .stepper .lbl { display: none; }
  .top-links .hide-sm, .brand span { display: none; }
  .timeline li { padding-left: 48px; }
  .timeline::before { left: 15px; }
  .dot { width: 32px; height: 32px; font-size: 14px; top: 20px; }
}
`;

const FAVICON =
  "data:image/svg+xml," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="8" fill="#0071e3"/><path d="M9 17l5 5 9-11" stroke="#fff" stroke-width="3.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  );

function page({ title, description, body }) {
  return `<!doctype html>
<html lang="id">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<meta name="robots" content="noindex">
<link rel="icon" href="${FAVICON}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap">
<style>${CSS}</style>
</head>
<body>
<header class="top"><div class="wrap">
  <a class="brand" href="/checkpoint">Perjalanan Pengembangan <span>· Kato Report</span></a>
  <nav class="top-links"><a href="/checkpoint" class="hide-sm">Semua checkpoint</a><a href="/">Buka aplikasi →</a></nav>
</div></header>
<main class="wrap">
${body}
</main>
<footer class="wrap">Halaman ini hanya ada di situs staging, untuk laporan progress. Aplikasi yang berjalan di situs ini sedang berada di checkpoint ${latest}.</footer>
</body>
</html>
`;
}

function stepper(current) {
  const items = CHECKPOINTS.map((c) => {
    const isReached = c.n <= latest;
    const cls = c.n === current ? 'current' : isReached ? 'done' : 'locked';
    const inner = `<b>${c.n}</b><span class="lbl">${esc(c.short)}</span>`;
    return isReached
      ? `<li class="${cls}"><a href="/checkpoint${c.n}"${c.n === current ? ' aria-current="page"' : ''}>${inner}</a></li>`
      : `<li class="${cls}"><span title="Belum dilaporkan"><b>${c.n}</b><span class="lbl">Segera</span></span></li>`;
  }).join('');
  return `<nav aria-label="Checkpoint"><ol class="stepper">${items}</ol></nav>`;
}

function features(list) {
  return `<div class="features">${list
    .map(
      (f) => `<div class="feature">
  <div class="who">${f.who.map((w) => `<span class="tag">${esc(w)}</span>`).join('')}</div>
  <h3>${rich(f.title)}</h3>
  <p>${rich(f.text)}</p>
</div>`,
    )
    .join('')}</div>`;
}

function example(ex) {
  if (ex.kind === 'verdicts') {
    return `<div class="verdicts">${ex.items
      .map(
        (v) => `<div class="verdict ${v.ok ? 'ok' : 'no'}"><strong>${v.ok ? 'Diterima' : 'Ditolak'}</strong>
  <p><span style="color:var(--slate)">Foto:</span> ${rich(v.photo)}</p>
  <p><span style="color:var(--slate)">Alasan AI:</span> “${rich(v.reason)}”</p></div>`,
      )
      .join('')}</div>`;
  }
  return `<div class="example">
  <div class="in"><p class="label">${esc(ex.inLabel)}</p><p class="quote">“${rich(ex.input)}”</p></div>
  <div class="out"><p class="label">${esc(ex.outLabel)}</p><dl>${ex.output
    .map(([k, v]) => `<dt>${esc(k)}</dt><dd>${rich(v)}</dd>`)
    .join('')}</dl></div>
</div>`;
}

function checkpointPage(c) {
  const prev = CHECKPOINTS.find((x) => x.n === c.n - 1);
  const next = CHECKPOINTS.find((x) => x.n === c.n + 1 && x.n <= latest);
  const isLatest = c.n === latest;

  const sections = [];
  sections.push(`<section class="card">
  <h2>Masalah yang dijawab</h2>
  <p class="sub">Kenapa checkpoint ini dibuat.</p>
  <p class="problem">${rich(c.problem)}</p>
</section>`);
  sections.push(`<section class="card">
  <h2>Apa yang berubah</h2>
  <p class="sub">Dilihat dari sisi orang yang memakainya.</p>
  ${features(c.features)}
</section>`);
  if (c.example) {
    sections.push(`<section class="card">
  <h2>${esc(c.example.title)}</h2>
  <p class="sub">${rich(c.example.sub)}</p>
  ${example(c.example)}
</section>`);
  }
  sections.push(`<section class="card">
  <h2>Di balik layar</h2>
  <p class="sub">Untuk yang penasaran cara kerjanya, tanpa perlu membaca kode.</p>
  <ul class="plain">${c.behind.map((b) => `<li>${rich(b)}</li>`).join('')}</ul>
</section>`);
  if (c.limits?.length) {
    sections.push(`<section class="card">
  <h2>${c.n === CHECKPOINTS.length ? 'Yang masih bisa dikembangkan' : 'Yang belum ada di tahap ini'}</h2>
  <p class="sub">${c.n === CHECKPOINTS.length ? 'Catatan untuk setelah tugas ini.' : 'Dijawab di checkpoint berikutnya.'}</p>
  <ul class="plain">${c.limits.map((b) => `<li>${rich(b)}</li>`).join('')}</ul>
</section>`);
  }
  sections.push(`<section class="card">
  <h2>Coba sendiri</h2>
  ${
    isLatest
      ? `<p class="sub">Aplikasi di situs ini sedang berada tepat di checkpoint ${c.n}, jadi semua yang dijelaskan di atas bisa dicoba langsung.</p>
  <div class="try">${c.tryIt.map((t, i) => `<a class="pill${i ? ' ghost' : ''}" href="${esc(t.href)}">${esc(t.label)}</a>`).join('')}</div>
  ${c.tryNote ? `<p class="note">${rich(c.tryNote)}</p>` : ''}`
      : `<p class="sub">Aplikasi di situs ini sudah maju ke checkpoint ${latest}. Fitur checkpoint ${c.n} tetap ada di sana, tetapi tampilannya sudah berubah seperti dijelaskan di halaman-halaman berikutnya.</p>
  <div class="try"><a class="pill" href="/checkpoint${latest}">Lihat checkpoint ${latest}</a><a class="pill ghost" href="/">Buka aplikasi</a></div>`
  }
</section>`);

  const body = `${stepper(c.n)}
<div class="hero">
  <p class="kicker">Checkpoint ${c.n} dari ${CHECKPOINTS.length}${isLatest ? ' · terbaru' : ''}</p>
  <h1>${esc(c.title)}</h1>
  <p class="lead">${rich(c.lead)}</p>
</div>
${sections.join('\n')}
<nav class="pager" aria-label="Checkpoint sebelum dan sesudah">
  ${prev ? `<a href="/checkpoint${prev.n}"><div class="dir">← Sebelumnya</div><div class="t">${prev.n}. ${esc(prev.title)}</div></a>` : `<a href="/checkpoint"><div class="dir">← Kembali</div><div class="t">Semua checkpoint</div></a>`}
  ${next ? `<a class="next" href="/checkpoint${next.n}"><div class="dir">Berikutnya →</div><div class="t">${next.n}. ${esc(next.title)}</div></a>` : `<div class="blank"></div>`}
</nav>`;

  return page({ title: `Checkpoint ${c.n}: ${c.title}`, description: c.lead.replace(/\*|`/g, ''), body });
}

function indexPage() {
  const items = CHECKPOINTS.map((c) =>
    c.n <= latest
      ? `<li><span class="dot">${c.n}</span><a class="card" href="/checkpoint${c.n}">
  <h3>${esc(c.title)}${c.n === latest ? '<span class="badge-now">● sedang tayang</span>' : ''}</h3>
  <p>${rich(c.lead)}</p></a></li>`
      : `<li class="locked"><span class="dot">${c.n}</span><div class="card"><h3>Checkpoint ${c.n}</h3><p style="color:inherit">Belum dilaporkan.</p></div></li>`,
  ).join('\n');

  const body = `<div class="hero">
  <p class="kicker">Laporan progress bertahap</p>
  <h1>Dari keluhan toilet menjadi tiket kerja</h1>
  <p class="lead">Kato Report dibangun dalam ${CHECKPOINTS.length} checkpoint. Setiap halaman menjelaskan apa yang berubah, untuk siapa, dan kenapa, tanpa perlu ikut membaca kodenya. Saat ini sudah ${latest} dari ${CHECKPOINTS.length} checkpoint yang dilaporkan.</p>
</div>
<ol class="timeline">
${items}
</ol>`;
  return page({
    title: 'Perjalanan Kato Report',
    description: `Perjalanan pengembangan Kato Report, ${latest} dari ${CHECKPOINTS.length} checkpoint.`,
    body,
  });
}

mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, 'checkpoint.html'), indexPage());
for (const c of reached) writeFileSync(join(outDir, `checkpoint${c.n}.html`), checkpointPage(c));
console.log(`journey: /checkpoint dan ${latest > 1 ? `/checkpoint1–${latest}` : "/checkpoint1"} ditulis ke ${outDir}/`);
