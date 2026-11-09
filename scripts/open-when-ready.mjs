/**
 * Runs beside `npm run dev`: waits until both the app (Vite, 5173) and the API
 * (Wrangler, 8787) answer, then prints the one address to open, last and
 * clearly, and opens it in the browser.
 *
 * Wrangler prints its own "Ready on http://localhost:8787" after Vite's
 * address, which makes 8787 look like the app. It is not: it serves the last
 * production build in dist/, so edits never show there.
 *
 * Set NO_OPEN=1 to only print the address.
 */
import { spawn } from 'node:child_process';

const APP = 'http://localhost:5173';
const API = 'http://127.0.0.1:8787';
const TIMEOUT_MS = 120_000;

const answers = async (url) => {
  try {
    await fetch(url, { signal: AbortSignal.timeout(2000) });
    return true;
  } catch {
    return false;
  }
};

const started = Date.now();
while (!((await answers(APP)) && (await answers(API)))) {
  if (Date.now() - started > TIMEOUT_MS) {
    console.log(`App or API did not start within ${TIMEOUT_MS / 1000} s; check the [web] and [api] logs above.`);
    process.exit(0);
  }
  await new Promise((r) => setTimeout(r, 500));
}

const line = '─'.repeat(52);
console.log(`\n${line}`);
console.log(`  Open the app at:  \x1b[1;32m${APP}\x1b[0m`);
console.log(`  (8787 is the API and the last build, not your edits)`);
console.log(`${line}\n`);

if (!process.env.NO_OPEN) {
  const [cmd, args] =
    process.platform === 'darwin'
      ? ['open', [APP]]
      : process.platform === 'win32'
        ? ['cmd', ['/c', 'start', '', APP]]
        : ['xdg-open', [APP]];
  spawn(cmd, args, { stdio: 'ignore', detached: true }).on('error', () => {}).unref();
}
