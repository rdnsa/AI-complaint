import { expect, knownIssue, MOCK_LLM_URL, test, unique } from '../fixtures';

const wibToday = () => new Date(Date.now() + 7 * 3600 * 1000).toISOString().slice(0, 10);

test.describe('Isolasi', () => {
  test('Worker hanya memakai mock LLM dan kunci palsu', async ({ api, request }) => {
    const { id } = await api.report();
    await api.settled(id);
    const stats = await (await request.get(`${MOCK_LLM_URL}/__stats`)).json();
    expect(stats.analysis).toBeGreaterThan(0);
    for (const key of stats.keys) expect(key).toMatch(/^e2e-/);
    expect((await api.getReport(id)).ai_model).toBe('mock-text');
  });

  test('TC-AIA-021 kunci yang dibatasi diganti kunci berikutnya', async ({ api, request }) => {
    const { id } = await api.report();
    expect((await api.settled(id)).ai_status).toBe('ok');
    const stats = await (await request.get(`${MOCK_LLM_URL}/__stats`)).json();
    expect(stats.refused).toBeGreaterThan(0);
    expect(stats.keys).toEqual(expect.arrayContaining(['e2e-refused-key', 'e2e-text-key']));
  });
});

test.describe('Ringkasan dan grafik', () => {
  test('TC-SPR-003 ringkasan harian dibuat dan tersimpan', async ({ api, admin }) => {
    await api.settled((await api.report()).id);
    const made = await admin.post('/api/summary/generate');
    expect(made.status()).toBe(200);
    expect(await made.json()).toMatchObject({ exists: true, summary: 'Ringkasan harian tiruan dari LLM.' });

    const stored = await (await admin.get('/api/summary')).json();
    expect(stored.highlights).toEqual(['Sorotan tiruan pertama', 'Sorotan tiruan kedua']);
    expect(stored.report_count).toBeGreaterThan(0);
  });

  test('TC-SPR-007 format tanggal salah ditolak', async ({ admin }) => {
    expect((await admin.get('/api/summary?date=kemarin')).status()).toBe(400);
    expect((await admin.get('/api/summary/stats?date=2026-1-1')).status()).toBe(400);
  });

  test('TC-SPR-008 tanggal mustahil ditolak, bukan error server', async ({ admin }) => {
    const res = await admin.get('/api/summary/stats?date=2026-13-45');
    knownIssue('T-15', 'date=2026-13-45 lolos pola dan membalas 500');
    expect(res.status()).toBe(400);
  });

  test('TC-SPR-010 statistik menghitung laporan hari ini', async ({ api, admin }) => {
    const stats = async () => (await (await admin.get(`/api/summary/stats?date=${wibToday()}`)).json());
    const before = await stats();
    await api.report();
    await expect.poll(async () => (await stats()).today.total).toBeGreaterThan(before.today.total);
  });

  for (const [path, tc] of [['charts', 'TC-SPR-012'], ['cleaning-charts', 'TC-SPR-018'], ['export', 'TC-SPR-012']]) {
    test(`${tc} /api/summary/${path}: rentang sah dan tidak sah`, async ({ admin }) => {
      const today = wibToday();
      expect((await admin.get(`/api/summary/${path}?from=${today}&to=${today}`)).status()).toBe(200);
      expect((await admin.get(`/api/summary/${path}`)).status(), 'tanpa rentang').toBe(400);
      expect((await admin.get(`/api/summary/${path}?from=2026-02-01&to=2026-01-01`)).status(), 'terbalik').toBe(400);
      expect((await admin.get(`/api/summary/${path}?from=2024-01-01&to=2026-01-01`)).status(), 'lebih dari 366 hari').toBe(400);
    });
  }

  test('TC-SPL-006 filter tanggal daftar supervisor', async ({ api, admin }) => {
    const { id } = await api.report();
    const ids = async (query: string) =>
      (await (await admin.get(`/api/reports?limit=200&${query}`)).json()).data.map((r: { id: string }) => r.id);
    expect(await ids(`from=${wibToday()}&to=${wibToday()}`)).toContain(id);
    expect(await ids('from=2020-01-01&to=2020-01-02')).not.toContain(id);
  });
});

test.describe('Kato Bot', () => {
  test('TC-BOT-011 jawaban berasal dari alat data', async ({ request }) => {
    const res = await request.post('/api/ask', { data: { question: 'gedung mana paling banyak laporan?' } });
    expect(res.status()).toBe(200);
    const answer = await res.json();
    expect(answer.text).toContain('Jawaban tiruan');
    expect(answer.tools[0]).toMatchObject({ name: 'count_reports', arguments: { group_by: 'building' } });
    expect(answer.remaining_today).toBeLessThan(50);
  });

  test('TC-BOT-017 supervisor boleh mengelompokkan per petugas', async ({ admin }) => {
    const res = await admin.post('/api/ask', { data: { question: 'berapa laporan per petugas?' } });
    expect(res.status()).toBe(200);
    expect((await res.json()).text).toMatch(/grouping=[a-z_,]*staff/);
  });

  test('TC-BOT-019 publik tidak bisa mengelompokkan per petugas', async ({ api, request, newStaff }) => {
    const staff = await newStaff();
    const { id } = await api.report();
    await api.resolve(id, staff.id);

    const res = await request.post('/api/ask', { data: { question: 'berapa laporan per petugas?' } });
    expect(res.status()).toBe(200);
    const { text } = await res.json();
    expect(text).not.toMatch(/grouping=[a-z_,]*staff/);
    expect(text).not.toContain(staff.name);
  });

  test('TC-BOT-029 pertanyaan terlalu pendek ditolak', async ({ request }) => {
    const res = await request.post('/api/ask', { data: { question: 'hm' } });
    expect(res.status()).toBe(400);
    expect((await res.json()).error).toBe('Pertanyaan terlalu pendek');
  });

  test('TC-BOT-031 model gagal: 502 dengan pesan ramah', async ({ request }) => {
    const res = await request.post('/api/ask', { data: { question: unique('[ask:error] berapa laporan') } });
    expect(res.status()).toBe(502);
    expect((await res.json()).error).toBe('Model tidak dapat menjawab saat ini. Coba lagi sebentar.');
  });

  test('TC-BOT-018 pertanyaan tercatat di log', async ({ admin, request }) => {
    const question = unique('log pertanyaan ini');
    await request.post('/api/ask', { data: { question } });
    const log = await (await admin.get('/api/activity?action=question&limit=100')).text();
    expect(log).toContain(question);
  });
});
