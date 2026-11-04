import { expect, test } from '../fixtures';

/**
 * TC-SEC-001: the access matrix. Everything a supervisor alone may do, tried by
 * a visitor without a session (401) and by a signed-in reporter (403).
 */
const SUPERVISOR_ONLY: Array<[method: 'get' | 'post' | 'patch' | 'delete', path: string, tc: string]> = [
  ['get', '/api/reports', 'daftar keluhan'],
  ['delete', '/api/reports/tidak-ada', 'TC-SPL-024'],
  ['post', '/api/reports/tidak-ada/reanalyze', 'TC-SPL-026'],
  ['get', '/api/cleaning/reports', 'TC-SPK-022'],
  ['get', '/api/cleaning/recap', 'TC-SPK-022'],
  ['get', '/api/summary', 'TC-SPR-009'],
  ['get', '/api/summary/stats', 'TC-SPR-009'],
  ['get', '/api/summary/charts?from=2026-01-01&to=2026-01-02', 'TC-SPR-009'],
  ['get', '/api/summary/cleaning-charts?from=2026-01-01&to=2026-01-02', 'TC-SPR-009'],
  ['get', '/api/summary/export?from=2026-01-01&to=2026-01-02', 'TC-SPR-009'],
  ['post', '/api/summary/generate', 'TC-SPR-009'],
  ['get', '/api/activity', 'TC-LOG-011'],
  ['get', '/api/users', 'TC-AKN-032'],
  ['post', '/api/users', 'TC-AKN-032'],
  ['patch', '/api/users/tidak-ada', 'TC-AKN-032'],
  ['delete', '/api/users/tidak-ada', 'TC-AKN-032'],
];

for (const [method, path, tc] of SUPERVISOR_ONLY) {
  test(`TC-SEC-001 ${tc} ${method.toUpperCase()} ${path} hanya untuk supervisor`, async ({ request, reporter }) => {
    expect((await request[method](path)).status(), 'tamu').toBe(401);
    expect((await reporter.api.request[method](path)).status(), 'pelapor').toBe(403);
  });
}

const PUBLIC: string[] = [
  '/api/health',
  '/api/reports/public',
  '/api/reports/open',
  '/api/cleaning/areas',
  '/api/cleaning/areas/C-2',
  '/api/cleaning/reports/public',
  '/api/staff',
  '/api/leaderboard',
  '/api/ask',
];

for (const path of PUBLIC) {
  test(`TC-SEC-001 GET ${path} terbuka tanpa login`, async ({ request }) => {
    expect((await request.get(path)).status()).toBe(200);
  });
}

test('TC-SEC-004 injeksi SQL pada filter tidak merusak apa pun', async ({ admin, request }) => {
  const attack = encodeURIComponent("x' OR '1'='1'; DROP TABLE reports;--");
  const res = await admin.get(`/api/reports?status=${attack}&priority=${attack}&building=${attack}`);
  expect(res.status()).toBe(200);
  expect((await res.json()).data).toEqual([]);
  expect((await request.get('/api/reports/public')).status()).toBe(200);
});

test('TC-SEC-007 endpoint tidak dikenal membalas JSON 404, bukan halaman', async ({ request }) => {
  const res = await request.get('/api/tidak-ada');
  expect(res.status()).toBe(404);
  expect((await res.json()).error).toBe('Endpoint tidak ditemukan');
});

test('TC-SEC-009 rahasia tidak ikut ke frontend', async ({ request }) => {
  const html = await (await request.get('/')).text();
  const scripts = [...html.matchAll(/src="(\/assets\/[^"]+\.js)"/g)].map((m) => m[1]);
  expect(scripts.length).toBeGreaterThan(0);
  for (const src of scripts) {
    const code = await (await request.get(src)).text();
    expect(code).not.toMatch(/LLM_API_KEY|VISION_API_KEY|AUTH_SECRET|e2e-text-key|e2e-auth-secret/);
  }
});
