/**
 * Deploys the staging site for progress reports.
 *
 * Every reported checkpoint stays online as its own frozen app, so a reader
 * can try exactly what existed at that point:
 *
 *   <staging>/                 the latest checkpoint's app
 *   <staging>/checkpoint       the hub listing every checkpoint reported so far
 *   <staging>/checkpointN      redirects to checkpoint N's own Worker
 *                              (<name>-cpN.<workers_subdomain>.workers.dev)
 *
 * Each checkpoint Worker has its own D1 database, because the schema changes
 * between checkpoints; the root Worker shares the latest checkpoint's database.
 * All of them share one R2 bucket (object keys are random, so they never clash).
 *
 * The staging branch only ever merges checkpoint commits from main, so its
 * wrangler.jsonc is always main's. Instead of editing it (which would conflict
 * on every merge), this script derives temporary configs from it, swapping in
 * the values from staging.config.json. Production data is never touched.
 *
 *   node scripts/staging.mjs           deploy the latest checkpoint's Worker, then the root site
 *   node scripts/staging.mjs seed      also run seed/toilets.sql on the latest checkpoint's database
 *   node scripts/staging.mjs config    only write wrangler.staging.jsonc (the root site's config)
 *   node scripts/staging.mjs secrets   upload the secrets in .dev.vars to both Workers
 *
 * Cloudflare secrets are write-only, so production's values cannot be copied
 * across; the secrets are read from the (uncommitted) .dev.vars.
 */
import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { reachedCheckpoints } from '../staging/checkpoints.mjs';

const OUT = 'wrangler.staging.jsonc';
const mode = process.argv[2] ?? 'deploy';
const staging = JSON.parse(readFileSync('staging.config.json', 'utf8'));
const run = (command) => execSync(command, { stdio: 'inherit' });

/** Drops // and /* *\/ comments outside strings, so JSON.parse can read JSONC. */
function stripJsonComments(src) {
  let out = '';
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (ch === '"') {
      let j = i + 1;
      while (j < src.length && src[j] !== '"') j += src[j] === '\\' ? 2 : 1;
      out += src.slice(i, j + 1);
      i = j;
    } else if (ch === '/' && src[i + 1] === '/') {
      while (i < src.length && src[i] !== '\n') i++;
      out += '\n';
    } else if (ch === '/' && src[i + 1] === '*') {
      i = src.indexOf('*/', i + 2) + 1;
    } else {
      out += ch;
    }
  }
  return out.replace(/,(\s*[}\]])/g, '$1');
}

const reached = reachedCheckpoints();
const latest = reached[reached.length - 1].n;

/** Checkpoint 1 keeps the database the staging site started with. */
const databaseName = (n) => (n === 1 ? staging.database_name : `${staging.database_name}-cp${n}`);
const workerName = (n) => `${staging.name}-cp${n}`;

/** Writes a Worker config derived from main's wrangler.jsonc. */
function writeConfig({ name, database, root }) {
  const config = JSON.parse(stripJsonComments(readFileSync('wrangler.jsonc', 'utf8')));
  config.name = name;
  for (const db of config.d1_databases ?? []) {
    db.database_name = database.name;
    db.database_id = database.id;
  }
  for (const bucket of config.r2_buckets ?? []) bucket.bucket_name = staging.bucket_name;
  delete config.$schema;
  delete config.routes;

  if (root) {
    if (staging.domain) config.routes = [{ pattern: staging.domain, custom_domain: true }];
    // After the app's own build, add the hub page and the /checkpointN redirects.
    config.build = {
      ...config.build,
      command: `${config.build?.command ?? 'npm run build'} && node staging/journey.mjs ${config.assets?.directory ?? 'dist'}`,
    };
  } else {
    // Only the root site runs the daily summary; frozen checkpoints can still
    // generate it by hand from their dashboard. (The free plan allows 5 crons.)
    delete config.triggers;
  }
  writeFileSync(OUT, JSON.stringify(config, null, 2) + '\n');
}

function listDatabases() {
  const json = execSync(`npx wrangler d1 list --json -c ${OUT}`, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] });
  return JSON.parse(json.slice(json.indexOf('[')));
}

/** Finds the checkpoint's database, creating it on first use. */
function ensureDatabase(n) {
  const name = databaseName(n);
  if (n === 1) return { name, id: staging.database_id, created: false };
  let found = listDatabases().find((d) => d.name === name);
  if (found) return { name, id: found.uuid, created: false };
  console.log(`Membuat database ${name}…`);
  run(`npx wrangler d1 create ${name} --update-config=false -c ${OUT}`);
  found = listDatabases().find((d) => d.name === name);
  if (!found) throw new Error(`Database ${name} tidak ditemukan setelah dibuat`);
  return { name, id: found.uuid, created: true };
}

/**
 * Uploads the secrets in .dev.vars to the Worker in OUT. Checkpoints older than
 * the key-failover commit would treat a comma-separated list as one (invalid)
 * key, so for them only the first key of each list is sent.
 */
function uploadSecrets(name) {
  if (!existsSync('.dev.vars')) {
    console.warn('.dev.vars tidak ditemukan, secret tidak dikirim. Salin .dev.vars.example lalu isi.');
    return false;
  }
  const secrets = {};
  for (const line of readFileSync('.dev.vars', 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m) secrets[m[1]] = m[2].replace(/^(["'])(.*)\1$/, '$2');
  }
  const multiKey = ['src/adapters/llm.ts', 'src/lib/llm.ts'].some(
    (p) => existsSync(p) && readFileSync(p, 'utf8').includes('splitKeys'),
  );
  if (!multiKey) {
    for (const key of Object.keys(secrets)) {
      if (key.endsWith('_API_KEY')) secrets[key] = secrets[key].split(',')[0].trim();
    }
  }
  const file = '.wrangler/staging-secrets.json';
  mkdirSync('.wrangler', { recursive: true });
  writeFileSync(file, JSON.stringify(secrets));
  try {
    run(`npx wrangler secret bulk ${file} -c ${OUT}`);
    console.log(
      `Secret terkirim ke ${name}: ${Object.keys(secrets).join(', ')}` +
        (multiKey ? '' : ' (checkpoint ini hanya mendukung satu key per secret; key pertama yang dipakai)'),
    );
  } finally {
    rmSync(file, { force: true });
  }
  return true;
}

try {
  // Any config will do for account-level calls such as `d1 list`.
  writeConfig({ name: staging.name, database: { name: staging.database_name, id: staging.database_id }, root: true });
  const database = ensureDatabase(latest);
  const cp = { name: workerName(latest), database, root: false };
  const root = { name: staging.name, database, root: true };

  if (mode === 'config') {
    writeConfig(root);
    console.log(`${OUT} ditulis (situs utama, database ${database.name}).`);
  } else if (mode === 'secrets') {
    for (const target of [cp, root]) {
      writeConfig(target);
      uploadSecrets(target.name);
    }
  } else {
    console.log(`\n=== Checkpoint ${latest}: ${cp.name} (database ${database.name}) ===`);
    writeConfig(cp);
    run(`npx wrangler d1 migrations apply ${database.name} --remote -c ${OUT}`);
    if (mode === 'seed' || database.created) {
      run(`npx wrangler d1 execute ${database.name} --remote --file=./seed/toilets.sql -c ${OUT}`);
    }
    run(`npx wrangler deploy -c ${OUT}`);
    uploadSecrets(cp.name);

    console.log(`\n=== Situs utama: ${root.name} (hub /checkpoint, checkpoint 1–${latest}) ===`);
    writeConfig(root);
    run(`npx wrangler deploy -c ${OUT}`);
    uploadSecrets(root.name);
  }
} finally {
  if (mode !== 'config') rmSync(OUT, { force: true });
}
