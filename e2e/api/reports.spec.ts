import { expect, knownIssue, test, unique } from '../fixtures';

test.describe('Mengirim laporan', () => {
  test('TC-LAP-001 laporan anonim tersimpan dan dianalisis', async ({ api }) => {
    const report = await api.report({ description: unique('lantai banjir') });
    const stored = await api.settled(report.id);
    expect(stored).toMatchObject({
      status: 'new',
      ai_status: 'ok',
      priority: 'high',
      categories: ['flooding'],
      summary: 'Ringkasan tiruan dari LLM.',
      recommendation: 'Rekomendasi tiruan dari LLM.',
      reporter_id: null,
      description: report.description,
    });
  });

  test('TC-LAP-003 laporan pelapor login tercatat di akunnya', async ({ reporter }) => {
    const report = await reporter.api.report();
    expect((await reporter.api.getReport(report.id)).reporter_id).toBe(reporter.id);
    const mine = await (await reporter.api.request.get('/api/reports/mine')).json();
    expect(mine.data.map((r: { id: string }) => r.id)).toContain(report.id);
  });

  test('TC-LOK-006 kode lokasi huruf kecil diterima', async ({ api }) => {
    const report = await api.report({ area: 'c-2' });
    expect((await api.getReport(report.id)).area_id).toBe('C-2');
  });

  test('TC-LAP-007 dan TC-LAP-008 halaman gedung dan tempat di luar gedung', async ({ api }) => {
    for (const [area, location] of [
      ['C-HALAMAN', 'Halaman Gedung Dewi Sartika'],
      ['LAPANG-VOLI', 'Lapang Voli'],
    ]) {
      const report = await api.report({ area });
      expect((await api.getReport(report.id)).location_name).toBe(location);
    }
  });

  test('TC-LAP-009 keluhan 5 karakter diterima, 4 ditolak (TC-LAP-025)', async ({ api, request }) => {
    const photo = await api.upload();
    const short = await request.post('/api/reports', { data: { area_id: 'D-1', description: 'abcd', photo_key: photo } });
    expect(short.status()).toBe(400);
    expect((await short.json()).error).toBe('Keluhan terlalu pendek');

    const description = Math.random().toString(36).slice(2, 7).padEnd(5, 'x');
    const ok = await request.post('/api/reports', { data: { area_id: 'D-1', description, photo_key: photo } });
    expect(ok.status()).toBe(201);
  });

  test('TC-LAP-010 keluhan 1.000 karakter diterima, 1.001 ditolak (TC-LAP-026)', async ({ api, request }) => {
    const photo = await api.upload();
    const text = `${unique('kata').padEnd(999, ' kata')}a`;
    const ok = await request.post('/api/reports', { data: { area_id: 'D-1', description: text, photo_key: photo } });
    expect(ok.status()).toBe(201);
    const tooLong = await request.post('/api/reports', {
      data: { area_id: 'D-1', description: `${text}x`, photo_key: photo },
    });
    expect(tooLong.status()).toBe(400);
  });

  test('TC-LAP-018 keluhan berisi spasi saja ditolak', async ({ api, request }) => {
    const photo = await api.upload();
    const res = await request.post('/api/reports', { data: { area_id: 'C-2', description: '        ', photo_key: photo } });
    expect(res.status()).toBe(400);
  });

  test('TC-LAP-021 laporan kembar mengembalikan laporan yang sama', async ({ api, request }) => {
    const report = await api.report();
    const photo = await api.upload();
    const res = await request.post('/api/reports', {
      data: { area_id: report.area, description: report.description, photo_key: photo },
    });
    expect(res.status()).toBe(200);
    expect(await res.json()).toMatchObject({ id: report.id, duplicate: true });
  });

  test('TC-LAP-022 teks sama di lokasi lain adalah laporan baru', async ({ api, request }) => {
    const report = await api.report({ area: 'C-3' });
    const photo = await api.upload();
    const res = await request.post('/api/reports', {
      data: { area_id: 'C-4', description: report.description, photo_key: photo },
    });
    expect(res.status()).toBe(201);
    expect((await res.json()).id).not.toBe(report.id);
  });

  test('TC-LAP-027 tanpa foto ditolak', async ({ request }) => {
    const res = await request.post('/api/reports', { data: { area_id: 'C-2', description: unique('tanpa foto') } });
    expect(res.status()).toBe(400);
    expect((await res.json()).error).toBe('Foto keadaan wajib dilampirkan');
  });

  test('TC-LAP-028 foto bukti tidak bisa dipakai sebagai foto laporan', async ({ api, request }) => {
    const proof = await api.upload('proof');
    const res = await request.post('/api/reports', {
      data: { area_id: 'C-2', description: unique('foto salah'), photo_key: proof },
    });
    expect(res.status()).toBe(400);
  });

  test('TC-LAP-029 foto fiktif ditolak', async ({ request }) => {
    const res = await request.post('/api/reports', {
      data: { area_id: 'C-2', description: unique('foto fiktif'), photo_key: 'report/2026-01-01/tidak-pernah-diunggah.jpg' },
    });
    knownIssue('T-07', 'photo_key hanya dicek awalannya');
    expect(res.status()).toBe(400);
  });

  test('TC-LAP-030 foto milik laporan lain ditolak', async ({ api, request }) => {
    const first = await api.report();
    const res = await request.post('/api/reports', {
      data: { area_id: 'C-2', description: unique('foto orang lain'), photo_key: first.photoKey },
    });
    knownIssue('T-07', 'satu key foto bisa dipakai dua laporan');
    expect(res.status()).toBe(400);
  });

  test('TC-LAP-032 lokasi tidak dikenal ditolak', async ({ api, request }) => {
    const photo = await api.upload();
    const res = await request.post('/api/reports', {
      data: { area_id: 'TIDAK-ADA', description: unique('lokasi salah'), photo_key: photo },
    });
    expect(res.status()).toBe(404);
  });

  test('TC-LAP-036 dan TC-LAP-037 XSS dan injeksi SQL tersimpan sebagai teks biasa', async ({ api, request }) => {
    const description = `${unique('<script>alert(1)</script>')} '; DROP TABLE reports;--`;
    const report = await api.report({ description });
    expect((await api.getReport(report.id)).description).toBe(description);
    expect((await request.get('/api/reports/public')).status()).toBe(200);
  });
});

test.describe('Analisis AI', () => {
  test('keluaran model yang mengarang dipaksa ke nilai yang sah', async ({ api }) => {
    const report = await api.report({ description: unique('[llm:odd] keluhan') });
    expect(await api.settled(report.id)).toMatchObject({ ai_status: 'ok', categories: ['other'], priority: 'medium' });
  });

  test('TC-AIA-019 layanan LLM gagal: laporan tetap ada', async ({ api }) => {
    const report = await api.report({ description: unique('[llm:error] keluhan') });
    const stored = await api.settled(report.id);
    expect(stored.ai_status).toBe('failed');
    expect(stored.status).toBe('new');
    expect(stored.summary).toBeNull();
  });

  test('TC-AIA-019 balasan bukan JSON ditandai gagal', async ({ api }) => {
    const report = await api.report({ description: unique('[llm:not-json] keluhan') });
    expect((await api.settled(report.id)).ai_status).toBe('failed');
  });

  test('TC-AIA-020 analisis ulang memulihkan laporan yang gagal', async ({ api, admin }) => {
    const report = await api.report({ description: unique('[llm:fail-once] keluhan') });
    expect((await api.settled(report.id)).ai_status).toBe('failed');

    const res = await admin.post(`/api/reports/${report.id}/reanalyze`);
    expect(res.status()).toBe(200);
    await expect.poll(async () => (await api.getReport(report.id)).ai_status).toBe('ok');
  });

  test('TC-AIA-022 laporan dijawab tanpa menunggu model yang lambat', async ({ api }) => {
    const started = Date.now();
    const report = await api.report({ description: unique('[llm:slow] keluhan') });
    expect(Date.now() - started).toBeLessThan(2500);
    expect((await api.getReport(report.id)).ai_status).toBe('pending');
  });
});

test.describe('Status oleh petugas', () => {
  test('TC-KLH-001 keluhan terbuka tampil di daftar petugas', async ({ api, request, newStaff }) => {
    const report = await api.report();
    const open = async () => (await (await request.get('/api/reports/open?limit=200')).json()).data.map((r: { id: string }) => r.id);
    expect(await open()).toContain(report.id);

    const staff = await newStaff();
    await api.resolve(report.id, staff.id);
    expect(await open()).not.toContain(report.id);
  });

  test('TC-KLH-008 klaim mencatat nama petugas', async ({ api, newStaff }) => {
    const { id } = await api.report();
    const staff = await newStaff();
    expect((await api.claim(id, staff.id)).status()).toBe(200);
    expect(await api.getReport(id)).toMatchObject({ status: 'in_progress', staff_name: staff.name });
  });

  test('TC-KLH-011 ambil alih dicatat di log', async ({ api, admin, newStaff }) => {
    const { id } = await api.report();
    const [first, second] = [await newStaff('Pertama'), await newStaff('Kedua')];
    await api.claim(id, first.id);
    expect((await api.claim(id, second.id)).status()).toBe(200);
    expect((await api.getReport(id)).staff_name).toBe(second.name);

    const log = await (await admin.get(`/api/activity?report_id=${id}`)).json();
    expect(log.data.map((e: { summary: string }) => e.summary).join('\n')).toContain(
      `${second.name} mengambil alih laporan`,
    );
  });

  test('TC-KLH-013 selesai dengan foto bukti yang bersih', async ({ api, newStaff }) => {
    const { id } = await api.report();
    const staff = await newStaff();
    await api.claim(id, staff.id);
    const res = await api.resolve(id, staff.id);
    expect(res.status()).toBe(200);
    expect(await res.json()).toEqual({ ok: true, status: 'resolved' });
    const stored = await api.getReport(id);
    expect(stored.status).toBe('resolved');
    expect(stored.resolved_at).toBeTruthy();
    expect(stored.proof_photo_url).toContain('/api/uploads/proof/');
  });

  test('TC-KLH-014 selesai langsung dari status baru', async ({ api, newStaff }) => {
    const { id } = await api.report();
    expect((await api.resolve(id, (await newStaff()).id)).status()).toBe(200);
  });

  test('TC-KLH-047 foto bukti diterima tanpa penilaian model yang menentukan', async ({ api, request, newStaff }) => {
    const { id } = await api.report();
    const proof = await api.upload('proof');
    const res = await request.patch(`/api/reports/${id}`, {
      data: { status: 'resolved', staff_id: (await newStaff()).id, proof_photo_key: proof },
    });
    expect(res.status()).toBe(200);
    const stored = await api.getReport(id);
    expect(stored.status).toBe('resolved');
    expect(stored.proof_verdict).toBeNull();
    expect((await request.get(`/api/uploads/${proof}`)).status()).toBe(200);
  });

  test('TC-KLH-034 tanpa nama petugas ditolak', async ({ api, request }) => {
    const { id } = await api.report();
    const res = await request.patch(`/api/reports/${id}`, { data: { status: 'in_progress' } });
    expect(res.status()).toBe(400);
    expect((await res.json()).error).toBe('Pilih namamu dulu');
  });

  test('TC-KLH-035 sesi pelapor tidak bisa mengubah status', async ({ api, reporter }) => {
    const { id } = await api.report();
    const res = await reporter.api.request.patch(`/api/reports/${id}`, { data: { status: 'in_progress' } });
    expect(res.status()).toBe(400);
  });

  test('TC-KLH-036 petugas palsu ditolak', async ({ api }) => {
    const { id } = await api.report();
    const res = await api.claim(id, 'bukan-petugas');
    expect(res.status()).toBe(400);
    expect((await res.json()).error).toBe('Nama petugas tidak dikenal. Pilih ulang namamu.');
  });

  test('TC-KLH-032 petugas nonaktif ditolak', async ({ api, admin, newStaff }) => {
    const { id } = await api.report();
    const staff = await newStaff();
    await admin.patch(`/api/users/${staff.id}`, { data: { active: false } });
    expect((await api.claim(id, staff.id)).status()).toBe(400);
  });

  test('TC-KLH-038 status tidak valid ditolak', async ({ api, request, newStaff }) => {
    const { id } = await api.report();
    const res = await request.patch(`/api/reports/${id}`, { data: { status: 'dibatalkan', staff_id: (await newStaff()).id } });
    expect(res.status()).toBe(400);
  });

  test('TC-KLH-039 laporan tidak ada', async ({ api, newStaff }) => {
    expect((await api.claim('tidak-ada', (await newStaff()).id)).status()).toBe(404);
  });

  test('TC-KLH-040 selesai tanpa foto bukti ditolak', async ({ api, request, newStaff }) => {
    const { id } = await api.report();
    const res = await request.patch(`/api/reports/${id}`, { data: { status: 'resolved', staff_id: (await newStaff()).id } });
    expect(res.status()).toBe(400);
    expect((await api.getReport(id)).status).toBe('new');
  });

  test('TC-KLH-041 foto pelapor tidak bisa jadi bukti', async ({ api, request, newStaff }) => {
    const { id, photoKey } = await api.report();
    const res = await request.patch(`/api/reports/${id}`, {
      data: { status: 'resolved', staff_id: (await newStaff()).id, proof_photo_key: photoKey },
    });
    expect(res.status()).toBe(400);
    expect((await request.get(`/api/uploads/${photoKey}`)).status()).toBe(200);
  });

  test('TC-KLH-042 foto bukti yang tidak ada ditolak', async ({ api, request, newStaff }) => {
    const { id } = await api.report();
    const res = await request.patch(`/api/reports/${id}`, {
      data: { status: 'resolved', staff_id: (await newStaff()).id, proof_photo_key: 'proof/2026-01-01/tidak-ada.jpg' },
    });
    expect(res.status()).toBe(400);
  });

  test('TC-KLH-043 laporan selesai tidak bisa dibuka kembali', async ({ api, newStaff }) => {
    const { id } = await api.report();
    const staff = await newStaff();
    await api.resolve(id, staff.id);
    const res = await api.claim(id, staff.id);
    expect(res.status()).toBe(409);
    expect((await res.json()).error).toBe('Laporan ini sudah selesai.');
  });

  test('TC-KLH-031 laporan selesai tidak bisa ditimpa, dengan atau tanpa foto', async ({ api, request, newStaff }) => {
    const { id } = await api.report();
    const [first, second] = [await newStaff('Pertama'), await newStaff('Kedua')];
    await api.resolve(id, first.id);
    const before = await api.getReport(id);

    const bare = await request.patch(`/api/reports/${id}`, { data: { status: 'resolved', staff_id: second.id } });
    expect(bare.status()).toBe(409);
    expect((await bare.json()).error).toBe('Laporan ini sudah selesai.');
    expect((await api.resolve(id, second.id)).status()).toBe(409);

    expect(await api.getReport(id)).toMatchObject({
      staff_name: first.name,
      resolved_at: before.resolved_at,
      proof_photo_url: before.proof_photo_url,
    });
  });

  test('TC-KLH-044 status tidak bisa mundur ke baru', async ({ api, request, newStaff }) => {
    const { id } = await api.report();
    const staff = await newStaff();
    await api.claim(id, staff.id);
    const res = await request.patch(`/api/reports/${id}`, { data: { status: 'new', staff_id: staff.id } });
    knownIssue('T-08', 'status bisa mundur lewat API');
    expect(res.status()).not.toBe(200);
  });

  test('TC-KLH-045 bukti laporan lain tidak bisa dipakai ulang', async ({ api, request, newStaff }) => {
    const staff = await newStaff();
    const [first, second] = [await api.report(), await api.report()];
    await api.resolve(first.id, staff.id);
    const proof = (await api.getReport(first.id)).proof_photo_url.replace('/api/uploads/', '');
    const res = await request.patch(`/api/reports/${second.id}`, {
      data: { status: 'resolved', staff_id: staff.id, proof_photo_key: proof },
    });
    knownIssue('T-02', 'satu foto bukti bisa menutup dua laporan');
    expect(res.status()).toBe(400);
  });

});

test.describe('Deskripsi foto bukti', () => {
  test('foto dideskripsikan setelah laporan selesai', async ({ api, newStaff }) => {
    const { id } = await api.report();
    expect((await api.resolve(id, (await newStaff()).id)).status()).toBe(200);
    await expect
      .poll(async () => (await api.getReport(id)).proof_reason)
      .toBe('Deskripsi foto tiruan dari model.');
    expect(await api.getReport(id)).toMatchObject({ status: 'resolved', proof_verdict: null, proof_model: 'mock-vision' });
  });

  test('petugas tidak menunggu model yang lambat', async ({ api, newStaff }) => {
    const { id } = await api.report({ description: unique('[vision:slow] keluhan') });
    const staff = await newStaff();
    const started = Date.now();
    expect((await api.resolve(id, staff.id)).status()).toBe(200);
    expect(Date.now() - started).toBeLessThan(2500);
    expect((await api.getReport(id)).status).toBe('resolved');
  });

  test('model gagal: laporan tetap selesai dan kegagalannya tercatat', async ({ api, admin, newStaff }) => {
    const { id } = await api.report({ description: unique('[vision:error] keluhan') });
    expect((await api.resolve(id, (await newStaff()).id)).status()).toBe(200);
    await expect
      .poll(async () => (await (await admin.get(`/api/activity?action=proof_description_failed&report_id=${id}`)).json()).data.length)
      .toBe(1);
    expect(await api.getReport(id)).toMatchObject({ status: 'resolved', proof_reason: null });
  });

  test('deskripsi yang datang setelah dibuka kembali tidak dipakai', async ({ api, admin, newStaff }) => {
    const { id } = await api.report({ description: unique('[vision:slow] keluhan') });
    await api.resolve(id, (await newStaff()).id);
    expect((await admin.post(`/api/reports/${id}/reopen`)).status()).toBe(200);
    await new Promise((resolve) => setTimeout(resolve, 3500));
    expect(await api.getReport(id)).toMatchObject({ status: 'new', proof_reason: null });
  });
});

test.describe('Papan publik dan data pribadi', () => {
  test('TC-PUB-022 hanya kolom publik yang keluar', async ({ api, request, newStaff }) => {
    const { id, description } = await api.report();
    const staff = await newStaff();
    await api.settled(id);
    await api.resolve(id, staff.id);

    const body = await (await request.get('/api/reports/public')).json();
    const row = body.data.find((r: { id: string }) => r.id === id);
    expect(row).toBeTruthy();
    expect(row.proof_photo_url).toBeTruthy();
    expect(row.summary).toBe('Ringkasan tiruan dari LLM.');
    expect(JSON.stringify(row)).not.toContain(description);
    expect(JSON.stringify(row)).not.toContain(staff.name);
    for (const field of ['description', 'photo_url', 'photo_key', 'reporter_id', 'staff_name', 'proof_reason']) {
      expect(row).not.toHaveProperty(field);
    }
  });

  test('TC-PUB-007 dan TC-PUB-008 filter status dan prioritas', async ({ api, request }) => {
    const { id } = await api.report({ description: unique('selokan meluap') });
    await api.settled(id);
    const list = async (query: string) =>
      (await (await request.get(`/api/reports/public?${query}&limit=200`)).json()).data.map((r: { id: string }) => r.id);

    expect(await list('status=new&priority=high')).toContain(id);
    expect(await list('status=resolved')).not.toContain(id);
    expect(await list('priority=low')).not.toContain(id);
  });

  test('TC-PUB-025 detail lewat ID publik tidak membuka teks asli', async ({ api, request }) => {
    const { id, description } = await api.report();
    const detail = await (await request.get(`/api/reports/${id}`)).text();
    knownIssue('T-06', 'GET /api/reports/{id} tanpa login membuka teks asli dan foto pelapor');
    expect(detail).not.toContain(description);
  });

  test('TC-STS-010 ID tidak ada', async ({ request }) => {
    const res = await request.get('/api/reports/tidak-ada');
    expect(res.status()).toBe(404);
    expect((await res.json()).error).toBe('Laporan tidak ditemukan');
  });
});

test.describe('Moderasi supervisor', () => {
  test('TC-SPL-028 dan TC-SPL-031 laporan selesai dibuka kembali lalu bisa dikerjakan lagi', async ({ api, admin, request, newStaff }) => {
    const { id } = await api.report();
    const [first, second] = [await newStaff('Pertama'), await newStaff('Kedua')];
    await api.resolve(id, first.id);
    const proof = (await api.getReport(id)).proof_photo_url;

    expect((await admin.post(`/api/reports/${id}/reopen`)).status()).toBe(200);

    expect(await api.getReport(id)).toMatchObject({ status: 'new', staff_name: null, resolved_at: null, proof_photo_url: null });
    const open = await (await request.get('/api/reports/open?limit=200')).json();
    expect(open.data.map((r: { id: string }) => r.id)).toContain(id);
    const board = await (await request.get('/api/reports/public?limit=200')).json();
    expect(board.data.find((r: { id: string }) => r.id === id).proof_photo_url).toBeNull();

    // The photo it was closed with stays as evidence, and the log says who did what.
    expect((await request.get(proof)).status()).toBe(200);
    const log = await (await admin.get(`/api/activity?action=report_reopened&report_id=${id}`)).json();
    expect(log.data).toHaveLength(1);
    expect(log.data[0].actor).toBe('Administrator');
    expect(log.data[0].summary).toContain(first.name);

    expect((await api.resolve(id, second.id)).status()).toBe(200);
    expect((await api.getReport(id)).staff_name).toBe(second.name);
  });

  test('TC-SPL-032 laporan yang belum selesai tidak bisa dibuka kembali', async ({ api, admin, newStaff }) => {
    const { id } = await api.report();
    expect((await admin.post(`/api/reports/${id}/reopen`)).status()).toBe(409);
    await api.claim(id, (await newStaff()).id);
    expect((await admin.post(`/api/reports/${id}/reopen`)).status()).toBe(409);
    expect((await api.getReport(id)).status).toBe('in_progress');
    expect((await admin.post('/api/reports/tidak-ada/reopen')).status()).toBe(404);
  });

  test('TC-SPL-019 dan TC-LOG-008 laporan dihapus, jejaknya tetap ada', async ({ api, admin, request }) => {
    const { id, description, photoKey } = await api.report();
    expect((await admin.delete(`/api/reports/${id}`)).status()).toBe(200);

    expect((await request.get(`/api/reports/${id}`)).status()).toBe(404);
    expect((await request.get(`/api/uploads/${photoKey}`)).status()).toBe(404);

    const log = await (await admin.get(`/api/activity?report_id=${id}&limit=50`)).text();
    expect(log).toContain(description);
  });

  test('TC-LOG-002 setiap aksi laporan tercatat', async ({ api, admin, newStaff }) => {
    const { id } = await api.report();
    const staff = await newStaff();
    await api.settled(id);
    await api.claim(id, staff.id);
    await api.resolve(id, staff.id);

    const log = await (await admin.get(`/api/activity?report_id=${id}`)).json();
    const actions = log.data.map((e: { action: string }) => e.action);
    expect(actions).toEqual(expect.arrayContaining(['report_created', 'analysis', 'status_changed']));
    expect(actions.filter((a: string) => a === 'status_changed')).toHaveLength(2);
  });
});

test.describe('Papan peringkat', () => {
  test('TC-RNK-003 dan TC-RNK-006 posisi sendiri mengikuti jumlah laporan', async ({ reporter }) => {
    const board = async () => (await reporter.api.request.get('/api/leaderboard')).json();
    expect((await board()).me.reports).toBe(0);

    await reporter.api.report();
    await expect.poll(async () => (await board()).me.reports).toBe(1);
  });

  test('TC-RNK-008 laporan anonim tidak masuk peringkat', async ({ api, request }) => {
    const { id } = await api.report();
    expect((await api.getReport(id)).reporter_id).toBeNull();
    const board = await (await request.get('/api/leaderboard')).json();
    expect(board.me).toBeNull();
    for (const row of board.data) expect(row.reports).toBeGreaterThan(0);
  });
});
