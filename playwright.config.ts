import { defineConfig, devices } from '@playwright/test';

const PORT = process.env.E2E_PORT ?? '8788';
const CI = Boolean(process.env.CI);

/**
 * End-to-end tests. See docs/dokumentasi-testing.html for the full guide.
 *
 * `npm run test:e2e` starts its own Worker, database and mock LLM (see
 * e2e/support/start-stack.mjs), so it needs neither `npm run dev` nor any API key.
 */
export default defineConfig({
  testDir: './e2e',
  // Tests share one database and stay apart by creating their own uniquely named data.
  fullyParallel: true,
  workers: CI ? 2 : 4,
  retries: CI ? 1 : 0,
  forbidOnly: CI,
  timeout: 45_000,
  expect: { timeout: 10_000 },
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['json', { outputFile: 'test-results/results.json' }],
  ],
  use: {
    // 127.0.0.1 is a secure context, which the camera and GPS APIs insist on.
    baseURL: `http://127.0.0.1:${PORT}`,
    // The interface follows the browser language; the tests read Indonesian.
    locale: 'id-ID',
    timezoneId: 'Asia/Jakarta',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    contextOptions: { reducedMotion: 'reduce' },
    launchOptions: {
      // A synthetic camera, since photos can only come from the live in-page camera.
      args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'],
    },
  },
  projects: [
    { name: 'api', testDir: './e2e/api' },
    { name: 'setup', testDir: './e2e/ui', testMatch: /auth\.setup\.ts/ },
    {
      name: 'desktop',
      testDir: './e2e/ui',
      dependencies: ['setup'],
      use: { ...devices['Desktop Chrome'] },
    },
    {
      // The app is used on phones first: reporter and staff journeys run here too.
      name: 'mobile',
      testDir: './e2e/ui',
      dependencies: ['setup'],
      grep: /@mobile/,
      use: { ...devices['Pixel 7'] },
    },
  ],
  webServer: {
    command: 'node e2e/support/start-stack.mjs',
    url: `http://127.0.0.1:${PORT}/api/health`,
    timeout: 180_000,
    // A fresh database on every run, unless E2E_REUSE=1 keeps a stack started by hand.
    reuseExistingServer: Boolean(process.env.E2E_REUSE),
    stdout: 'pipe',
    stderr: 'ignore',
  },
});
