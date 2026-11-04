/**
 * Starts everything the end-to-end tests run against, from a clean slate:
 *
 *   1. wipes the test database and photos (.wrangler/e2e-state, never .wrangler/state),
 *   2. applies the migrations and the seeds to it,
 *   3. starts the mock LLM,
 *   4. starts the Worker on its own port, which also builds the frontend.
 *
 * Playwright runs this as its `webServer` and stops it after the run. Nothing here
 * touches the database of `npm run dev`, and nothing reaches Cloudflare or a real
 * LLM provider: `--var` overrides the base URLs and the keys from .dev.vars.
 */
import { spawn, spawnSync } from 'node:child_process';
import { rmSync } from 'node:fs';
import { REFUSED_KEY, startMockLlm } from './mock-llm.mjs';

const STATE_DIR = '.wrangler/e2e-state';
const WORKER_PORT = process.env.E2E_PORT ?? '8788';
const MOCK_PORT = process.env.E2E_MOCK_PORT ?? '8799';

const wrangler = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const env = { ...process.env, WRANGLER_SEND_METRICS: 'false', CI: 'true' };

function prepare(...args) {
  const done = spawnSync(wrangler, ['wrangler', ...args, '--local', '--persist-to', STATE_DIR], { env, encoding: 'utf8' });
  if (done.status !== 0) {
    console.error(done.stdout, done.stderr);
    process.exit(1);
  }
}

rmSync(STATE_DIR, { recursive: true, force: true });
prepare('d1', 'migrations', 'apply', 'kato');
prepare('d1', 'execute', 'kato', '--file=./seed/toilets.sql');
prepare('d1', 'execute', 'kato', '--file=./seed/cleaning-areas.sql');
console.log('[e2e] database siap');

await startMockLlm(Number(MOCK_PORT));
console.log(`[e2e] mock LLM di port ${MOCK_PORT}`);

const mockUrl = `http://127.0.0.1:${MOCK_PORT}`;
const vars = {
  LLM_BASE_URL: mockUrl,
  VISION_BASE_URL: mockUrl,
  LLM_MODEL: 'mock-text',
  VISION_MODEL: 'mock-vision',
  // Fake, and safe to commit. The refused key comes first, so failover is exercised too.
  LLM_API_KEY: `${REFUSED_KEY},e2e-text-key`,
  VISION_API_KEY: 'e2e-vision-key',
  AUTH_SECRET: 'e2e-auth-secret-not-used-anywhere-else',
};

const worker = spawn(
  wrangler,
  [
    'wrangler', 'dev',
    '--ip', '127.0.0.1',
    '--port', WORKER_PORT,
    '--inspector-port', String(Number(WORKER_PORT) + 1000),
    '--persist-to', STATE_DIR,
    '--show-interactive-dev-session=false',
    '--log-level', 'warn',
    ...Object.entries(vars).flatMap(([key, value]) => ['--var', `${key}:${value}`]),
  ],
  { env, stdio: 'inherit' },
);

const stop = () => {
  worker.kill();
  process.exit(0);
};
process.on('SIGTERM', stop);
process.on('SIGINT', stop);
worker.on('exit', (code) => process.exit(code ?? 1));
