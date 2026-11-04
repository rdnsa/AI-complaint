import { expect, knownIssue, OFF_CAMPUS, ON_CAMPUS, test, unique } from '../fixtures';

const wibToday = () => new Date(Date.now() + 7 * 3600 * 1000).toISOString().slice(0, 10);

test('TC-LOK-024 dan TC-LOK-026 daftar area dan batas kampus', async ({ request }) => {
  const list = await (await request.get('/api/cleaning/areas')).json();
  expect(list.data.map((a: { id: string }) => a.id)).toEqual(expect.arrayContaining(['C-2', 'C-HALAMAN', 'LAPANG-VOLI', 'ADM-2']));
  expect(list.campus).toEqual({ lat: -7.3351, lng: 108.2217, radius_m: 500 });
  expect((await request.get('/api/cleaning/areas/TIDAK-ADA')).status()).toBe(404);
});

test('TC-THR-019 laporan dari kampus tersimpan tanpa tanda', async ({ api, newStaff }) => {
  const res = await api.cleaning((await newStaff()).id, { position: ON_CAMPUS });
  expect(res.status()).toBe(201);
  expect(await res.json()).toMatchObject({ location_status: 'ok', distance_m: 0, duplicate: false });
});

test('TC-THR-026 laporan dari luar kampus diterima dan ditandai', async ({ api, admin, newStaff }) => {
  const staff = await newStaff();
  const res = await api.cleaning(staff.id, { position: OFF_CAMPUS });
  expect(res.status()).toBe(201);
  const body = await res.json();
  expect(body.location_status).toBe('far');
  expect(body.distance_m).toBeGreaterThan(100_000);

  const today = wibToday();
  const flagged = await (await admin.get(`/api/cleaning/reports?from=${today}&to=${today}&alerts=1&staff_id=${staff.id}`)).json();
  expect(flagged.data.map((r: { id: string }) => r.id)).toContain(body.id);
});

test('TC-THR-055 tanpa posisi diterima dan ditandai', async ({ api, newStaff }) => {
  const res = await api.cleaning((await newStaff()).id, { position: null });
  expect(res.status()).toBe(201);
  expect(await res.json()).toMatchObject({ location_status: 'unknown', distance_m: null });
});

test('TC-THR-021 keenam tugas bisa dikirim', async ({ api, newStaff }) => {
  const staff = await newStaff();
  for (const task of ['sweep_mop', 'glass', 'toilet', 'trash', 'gallon', 'tidy']) {
    expect((await api.cleaning(staff.id, { task })).status(), task).toBe(201);
  }
});

test('TC-THR-037 tanpa petugas ditolak', async ({ api, request }) => {
  const photo = await api.upload('cleaning');
  const res = await request.post('/api/cleaning/reports', {
    data: { area_id: 'C-2', tasks: [{ task: 'trash', photo_key: photo }] },
  });
  expect(res.status()).toBe(400);
  expect((await res.json()).error).toBe('Pilih namamu dulu');
});

test('TC-THR-038 petugas palsu ditolak', async ({ api }) => {
  const res = await api.cleaning('bukan-petugas');
  expect(res.status()).toBe(400);
  expect((await res.json()).error).toBe('Nama petugas tidak dikenal. Pilih ulang namamu.');
});

test('TC-THR-039 petugas nonaktif ditolak', async ({ api, admin, newStaff }) => {
  const staff = await newStaff();
  await admin.patch(`/api/users/${staff.id}`, { data: { active: false } });
  expect((await api.cleaning(staff.id)).status()).toBe(400);
});

test('TC-THR-040 tanpa tugas ditolak', async ({ request, newStaff }) => {
  const res = await request.post('/api/cleaning/reports', {
    data: { staff_id: (await newStaff()).id, area_id: 'C-2', tasks: [] },
  });
  expect(res.status()).toBe(400);
  expect((await res.json()).error).toBe('Centang minimal satu pekerjaan');
});

test('TC-THR-042 satu foto untuk dua tugas ditolak', async ({ api, request, newStaff }) => {
  const photo = await api.upload('cleaning');
  const res = await request.post('/api/cleaning/reports', {
    data: {
      staff_id: (await newStaff()).id,
      area_id: 'C-2',
      tasks: [{ task: 'trash', photo_key: photo }, { task: 'tidy', photo_key: photo }],
    },
  });
  expect(res.status()).toBe(400);
  expect((await res.json()).error).toBe('Satu foto dipakai untuk dua pekerjaan');
});

test('TC-THR-046 area tidak dikenal tidak menyentuh foto', async ({ api, request, newStaff }) => {
  // A photo of someone else's report, passed along with an area that does not exist.
  const { photoKey } = await api.report();
  const res = await request.post('/api/cleaning/reports', {
    data: { staff_id: (await newStaff()).id, area_id: 'TIDAK-ADA', tasks: [{ task: 'trash', photo_key: photoKey }] },
  });
  expect(res.status()).toBe(404);
  const photo = await request.get(`/api/uploads/${photoKey}`);
  knownIssue('T-01', 'foto apa pun bisa dihapus tanpa login');
  expect(photo.status()).toBe(200);
});

test('TC-THR-047 foto dari folder lain ditolak', async ({ api, request, newStaff }) => {
  const photo = await api.upload('report');
  const res = await request.post('/api/cleaning/reports', {
    data: { staff_id: (await newStaff()).id, area_id: 'C-2', tasks: [{ task: 'trash', photo_key: photo }] },
  });
  expect(res.status()).toBe(400);
});

test('TC-THR-048 foto yang tidak ada ditolak', async ({ request, newStaff }) => {
  const res = await request.post('/api/cleaning/reports', {
    data: {
      staff_id: (await newStaff()).id,
      area_id: 'C-2',
      tasks: [{ task: 'trash', photo_key: 'cleaning/2026-01-01/tidak-ada.jpg' }],
    },
  });
  expect(res.status()).toBe(400);
});

test('TC-THR-049 foto yang dipakai petugas lain ditolak', async ({ api, request, newStaff }) => {
  const [first, second] = [await newStaff('Pertama'), await newStaff('Kedua')];
  const photo = await api.upload('cleaning');
  const send = (staffId: string) =>
    request.post('/api/cleaning/reports', {
      data: { staff_id: staffId, area_id: 'C-2', tasks: [{ task: 'trash', photo_key: photo }] },
    });
  expect((await send(first.id)).status()).toBe(201);
  const res = await send(second.id);
  expect(res.status()).toBe(422);
  expect((await res.json()).error).toContain('sudah pernah dipakai');
});

test('TC-THR-051 foto terpakai untuk tugas lain ditolak', async ({ api, request, newStaff }) => {
  const staff = await newStaff();
  const photo = await api.upload('cleaning');
  const send = (task: string) =>
    request.post('/api/cleaning/reports', {
      data: { staff_id: staff.id, area_id: 'C-2', tasks: [{ task, photo_key: photo }] },
    });
  expect((await send('trash')).status()).toBe(201);
  const res = await send('tidy');
  knownIssue('T-20', 'dibalas 200 duplicate:true, bukan 422');
  expect(res.status()).toBe(422);
});

test('TC-THR-052 kirim ulang persis tidak membuat data baru', async ({ api, request, newStaff }) => {
  const staff = await newStaff();
  const photo = await api.upload('cleaning');
  const send = () =>
    request.post('/api/cleaning/reports', {
      data: { staff_id: staff.id, area_id: 'C-2', tasks: [{ task: 'trash', photo_key: photo }] },
    });
  const first = await send();
  const second = await send();
  expect(second.status()).toBe(200);
  expect((await second.json())).toMatchObject({ id: (await first.json()).id, duplicate: true });
});

test('TC-SPK-001 rekap harian mencatat siapa mengerjakan apa', async ({ api, admin, newStaff }) => {
  const staff = await newStaff();
  await api.cleaning(staff.id, { area: 'D-1', task: 'glass', note: unique('catatan') });

  const recap = await (await admin.get(`/api/cleaning/recap?date=${wibToday()}`)).json();
  expect(recap.date).toBe(wibToday());
  expect(recap.totals.expected).toBeGreaterThan(0);
  const area = recap.areas.find((a: { area_id: string }) => a.area_id === 'D-1');
  expect(area.tasks.glass.staff).toContain(staff.name);
  expect(area.tasks.glass.done_at).toBeTruthy();
});

test('TC-PUB-017 laporan petugas di papan publik tanpa identitas', async ({ api, request, newStaff }) => {
  const staff = await newStaff();
  const note = unique('sudah bersih');
  expect((await api.cleaning(staff.id, { note })).status()).toBe(201);

  const board = await (await request.get('/api/cleaning/reports/public?limit=200')).json();
  const row = board.data.find((r: { note: string | null }) => r.note === note);
  expect(row).toBeTruthy();
  expect(JSON.stringify(row)).not.toContain(staff.name);
  expect(row).not.toHaveProperty('staff_id');
  expect(row).not.toHaveProperty('latitude');
});
