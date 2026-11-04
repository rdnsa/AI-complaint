import { ADMIN, expect, knownIssue, test, unique, uniqueUsername } from '../fixtures';

const sessionId = async (context: { get: (url: string) => Promise<{ json: () => Promise<{ id: string }> }> }) =>
  (await (await context.get('/api/auth/me')).json()).id;

test('TC-AKN-001 daftar berisi petugas dan supervisor, tanpa pelapor', async ({ admin, reporter }) => {
  const { data } = await (await admin.get('/api/users')).json();
  const roles = new Set(data.map((u: { role: string }) => u.role));
  expect(roles).toEqual(new Set(['staff', 'supervisor']));
  expect(data.map((u: { id: string }) => u.id)).not.toContain(reporter.id);
});

test('TC-AKN-003 petugas baru langsung ada di daftar publik', async ({ admin, request }) => {
  const name = unique('Petugas Baru');
  const res = await admin.post('/api/users', { data: { role: 'staff', name } });
  expect(res.status()).toBe(201);
  expect(await res.json()).toMatchObject({ role: 'staff', name, username: null, active: 1 });
  const staff = await (await request.get('/api/staff')).json();
  expect(staff.data.map((p: { name: string }) => p.name)).toContain(name);
});

test('TC-AKN-004 supervisor baru bisa masuk', async ({ admin, request }) => {
  const username = uniqueUsername();
  const res = await admin.post('/api/users', {
    data: { role: 'supervisor', username, name: 'Supervisor Baru', password: 'password-sah' },
  });
  expect(res.status()).toBe(201);
  const login = await request.post('/api/auth/login', { data: { username, password: 'password-sah' } });
  expect((await login.json()).role).toBe('supervisor');
});

for (const [tc, title, data, status] of [
  ['TC-AKN-005', 'nama petugas pendek', { role: 'staff', name: 'A' }, 400],
  ['TC-AKN-008', 'username supervisor pendek', { role: 'supervisor', username: 'ab', name: 'Nama', password: 'password-sah' }, 400],
  ['TC-AKN-010', 'username supervisor terpakai', { role: 'supervisor', username: 'admin', name: 'Nama', password: 'password-sah' }, 409],
  ['TC-AKN-011', 'password supervisor pendek', { role: 'supervisor', username: 'calon-spv', name: 'Nama', password: '1234567' }, 400],
  ['TC-AKN-012', 'peran tidak sah', { role: 'reporter', name: 'Nama' }, 400],
] as const) {
  test(`${tc} ${title} ditolak`, async ({ admin }) => {
    expect((await admin.post('/api/users', { data })).status()).toBe(status);
  });
}

test('TC-AKN-013 ubah nama petugas', async ({ admin, newStaff, request }) => {
  const staff = await newStaff();
  const name = unique('Nama Baru');
  expect((await admin.patch(`/api/users/${staff.id}`, { data: { name } })).status()).toBe(200);
  const list = await (await request.get('/api/staff')).json();
  expect(list.data.map((p: { name: string }) => p.name)).toContain(name);
});

test('TC-AKN-014 ganti password supervisor', async ({ admin, request }) => {
  const username = uniqueUsername();
  const { id } = await (await admin.post('/api/users', {
    data: { role: 'supervisor', username, name: 'Supervisor', password: 'password-lama' },
  })).json();

  expect((await admin.patch(`/api/users/${id}`, { data: { password: 'password-baru' } })).status()).toBe(200);
  expect((await request.post('/api/auth/login', { data: { username, password: 'password-lama' } })).status()).toBe(401);
  expect((await request.post('/api/auth/login', { data: { username, password: 'password-baru' } })).status()).toBe(200);
});

test('TC-AKN-017 dan TC-AKN-018 tanpa perubahan dan nama pendek ditolak', async ({ admin, newStaff }) => {
  const staff = await newStaff();
  expect((await admin.patch(`/api/users/${staff.id}`, { data: {} })).status()).toBe(400);
  expect((await admin.patch(`/api/users/${staff.id}`, { data: { name: 'A' } })).status()).toBe(400);
});

test('TC-AKN-020 petugas tidak punya password', async ({ admin, newStaff }) => {
  const staff = await newStaff();
  const res = await admin.patch(`/api/users/${staff.id}`, { data: { password: 'password-sah' } });
  expect(res.status()).toBe(400);
  expect((await res.json()).error).toBe('Petugas tidak memakai password.');
});

test('TC-AKN-021 nonaktifkan dan aktifkan petugas', async ({ admin, newStaff, request }) => {
  const staff = await newStaff();
  const names = async () => (await (await request.get('/api/staff')).json()).data.map((p: { name: string }) => p.name);

  await admin.patch(`/api/users/${staff.id}`, { data: { active: false } });
  expect(await names()).not.toContain(staff.name);
  await admin.patch(`/api/users/${staff.id}`, { data: { active: true } });
  expect(await names()).toContain(staff.name);
});

test('TC-AKN-023 dan TC-AKN-024 akun sendiri tidak bisa dinonaktifkan atau dihapus', async ({ admin }) => {
  const id = await sessionId(admin);
  const off = await admin.patch(`/api/users/${id}`, { data: { active: false } });
  expect(off.status()).toBe(400);
  const gone = await admin.delete(`/api/users/${id}`);
  expect(gone.status()).toBe(400);
  expect((await admin.post('/api/auth/login', { data: ADMIN })).status()).toBe(200);
});

test('TC-AKN-026 petugas tanpa riwayat bisa dihapus', async ({ admin, newStaff }) => {
  const staff = await newStaff();
  expect((await admin.delete(`/api/users/${staff.id}`)).status()).toBe(200);
  expect((await admin.delete(`/api/users/${staff.id}`)).status()).toBe(404);
});

test('TC-AKN-028 petugas berriwayat tidak bisa dihapus', async ({ admin, api, newStaff }) => {
  const staff = await newStaff();
  expect((await api.cleaning(staff.id)).status()).toBe(201);
  const res = await admin.delete(`/api/users/${staff.id}`);
  expect(res.status()).toBe(409);
  expect((await res.json()).error).toContain('Nonaktifkan saja');
});

test('TC-AKN-029 akun pelapor tidak dikelola di sini', async ({ admin, reporter }) => {
  expect((await admin.delete(`/api/users/${reporter.id}`)).status()).toBe(404);
  const res = await admin.patch(`/api/users/${reporter.id}`, { data: { password: 'password-baru' } });
  knownIssue('T-17', 'PATCH bisa mengganti password akun pelapor');
  expect(res.status()).toBe(404);
});
