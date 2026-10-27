/**
 * Keeps the local D1 database in step while `npm run dev` runs, so the dev
 * server never has to be restarted for a database change:
 *
 *   - migrations/*.sql: pending migrations are applied at start, and again
 *     whenever a file in migrations/ is added or changed;
 *   - seed/*.sql: a seed file is re-run whenever it is saved. Every seed in
 *     this repo is safe to run repeatedly (see the header of each file).
 *
 * Only the local database is touched (--local); production stays with
 * `npm run db:remote` and `npm run db:seed:cleaning:remote`.
 */
import { spawn } from 'node:child_process';
import { watch } from 'node:fs';

const WRANGLER = new URL('../node_modules/.bin/wrangler', import.meta.url).pathname;
const DB = 'kato';

/** One wrangler call at a time: D1 is a single SQLite file. */
let queue = Promise.resolve();
function wrangler(args, label) {
  queue = queue.then(
    () =>
      new Promise((resolve) => {
        const child = spawn(WRANGLER, args, { stdio: ['ignore', 'pipe', 'pipe'] });
        let out = '';
        child.stdout.on('data', (d) => (out += d));
        child.stderr.on('data', (d) => (out += d));
        child.on('close', (code) => {
          const applied = [...out.matchAll(/│ (\S+\.sql)\s+│ ✅/g)].map((m) => m[1]);
          if (code !== 0) console.error(`✗ ${label} gagal:\n${out.trim()}`);
          else if (/No migrations to apply/.test(out)) console.log(`✓ ${label}: tidak ada migrasi baru`);
          else if (applied.length) console.log(`✓ ${label}: ${applied.join(', ')}`);
          else console.log(`✓ ${label}`);
          resolve();
        });
      }),
  );
}

const migrate = () => wrangler(['d1', 'migrations', 'apply', DB, '--local'], 'migrasi lokal');
const seed = (file) => wrangler(['d1', 'execute', DB, '--local', `--file=seed/${file}`], `seed ${file}`);

/** Editors save in bursts (write, rename, touch); act once per burst. */
function debounced(fn, ms = 400) {
  const timers = new Map();
  return (key) => {
    clearTimeout(timers.get(key));
    timers.set(key, setTimeout(() => fn(key), ms));
  };
}

migrate();

const onMigration = debounced(() => migrate());
watch('migrations', (_event, file) => file?.endsWith('.sql') && onMigration('all'));

const onSeed = debounced((file) => seed(file));
watch('seed', (_event, file) => file?.endsWith('.sql') && onSeed(file));

console.log('Mengawasi migrations/ dan seed/ (database lokal).');
