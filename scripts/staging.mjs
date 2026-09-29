/**
 * Deploys the current checkout as the *staging* Worker (progress reports).
 *
 * The staging branch only ever merges checkpoint commits from main, so its
 * wrangler.jsonc is always main's. Instead of editing that file (which would
 * conflict on every merge), this script derives a temporary
 * wrangler.staging.jsonc from it, swapping in the values from
 * staging.config.json: its own Worker name, D1 database, R2 bucket and domain.
 * Production data is never touched.
 *
 *   node scripts/staging.mjs           apply D1 migrations, deploy, then upload secrets
 *   node scripts/staging.mjs seed      also run seed/toilets.sql before deploying
 *   node scripts/staging.mjs config    only write wrangler.staging.jsonc
 *   node scripts/staging.mjs secrets   upload the secrets in .dev.vars to the staging Worker
 *
 * Cloudflare secrets are write-only, so production's values cannot be copied
 * across; `secrets` reads the same values from the (uncommitted) .dev.vars.
 */
import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';

const OUT = 'wrangler.staging.jsonc';
const mode = process.argv[2] ?? 'deploy';
const staging = JSON.parse(readFileSync('staging.config.json', 'utf8'));

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

const config = JSON.parse(stripJsonComments(readFileSync('wrangler.jsonc', 'utf8')));
config.name = staging.name;
for (const db of config.d1_databases ?? []) {
  db.database_name = staging.database_name;
  db.database_id = staging.database_id;
}
for (const bucket of config.r2_buckets ?? []) bucket.bucket_name = staging.bucket_name;
if (staging.domain) config.routes = [{ pattern: staging.domain, custom_domain: true }];
delete config.$schema;

writeFileSync(OUT, JSON.stringify(config, null, 2) + '\n');
if (mode === 'config') {
  console.log(`${OUT} ditulis.`);
  process.exit(0);
}

const run = (command) => execSync(command, { stdio: 'inherit' });

/**
 * Uploads the secrets in .dev.vars. Checkpoints older than the key-failover
 * commit would treat a comma-separated list as one (invalid) key, so for them
 * only the first key of each list is sent.
 */
function uploadSecrets() {
  const secrets = {};
  for (const line of readFileSync('.dev.vars', 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m) secrets[m[1]] = m[2].replace(/^(["'])(.*)\1$/, '$2');
  }
  const multiKey = ['src/adapters/llm.ts', 'src/lib/llm.ts'].some(
    (p) => existsSync(p) && readFileSync(p, 'utf8').includes('splitKeys'),
  );
  if (!multiKey) {
    for (const name of Object.keys(secrets)) {
      if (name.endsWith('_API_KEY')) secrets[name] = secrets[name].split(',')[0].trim();
    }
  }
  const file = '.wrangler/staging-secrets.json';
  mkdirSync('.wrangler', { recursive: true });
  writeFileSync(file, JSON.stringify(secrets));
  try {
    run(`npx wrangler secret bulk ${file} -c ${OUT}`);
    console.log(
      `Secret terkirim ke ${staging.name}: ${Object.keys(secrets).join(', ')}` +
        (multiKey ? '' : ' (checkpoint ini hanya mendukung satu key per secret; key pertama yang dipakai)'),
    );
  } finally {
    rmSync(file, { force: true });
  }
}

try {
  if (mode === 'secrets') {
    if (!existsSync('.dev.vars')) {
      console.error('.dev.vars tidak ditemukan. Salin .dev.vars.example lalu isi dengan secret milik main.');
      process.exitCode = 1;
    } else {
      uploadSecrets();
    }
  } else {
    run(`npx wrangler d1 migrations apply ${staging.database_name} --remote -c ${OUT}`);
    if (mode === 'seed') {
      run(`npx wrangler d1 execute ${staging.database_name} --remote --file=./seed/toilets.sql -c ${OUT}`);
    }
    run(`npx wrangler deploy -c ${OUT}`);
    // Keep the secrets in step with the checkpoint just deployed (one key vs several).
    if (existsSync('.dev.vars')) uploadSecrets();
  }
} finally {
  rmSync(OUT, { force: true });
}
