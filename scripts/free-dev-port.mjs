/**
 * Runs before `npm run dev` (the "predev" script): frees port 8787 when a
 * Worker from an earlier `npm run dev` of this project still holds it, as
 * happens when a terminal is closed without Ctrl+C. A process from anywhere
 * else is left alone; it is only reported.
 *
 * Uses lsof and ps, so it does nothing on systems without them.
 */
import { execFileSync } from 'node:child_process';

const PORT = 8787;
const ROOT = process.cwd();

const run = (cmd, args) => {
  try {
    return execFileSync(cmd, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
  } catch {
    return '';
  }
};

const pids = run('lsof', ['-nP', `-iTCP:${PORT}`, '-sTCP:LISTEN', '-t']).split('\n').filter(Boolean);

for (const pid of pids) {
  const command = run('ps', ['-o', 'command=', '-p', pid]).trim();
  const cwd = run('lsof', ['-a', '-p', pid, '-d', 'cwd', '-Fn'])
    .split('\n')
    .find((line) => line.startsWith('n'))
    ?.slice(1);

  if (cwd === ROOT && /workerd|wrangler/.test(command)) {
    process.kill(Number(pid));
    console.log(`Port ${PORT}: Worker lama dari proyek ini dihentikan (pid ${pid}).`);
  } else {
    console.log(`Port ${PORT} dipakai proses lain (pid ${pid}): ${command}. Hentikan dulu, lalu jalankan ulang.`);
  }
}
