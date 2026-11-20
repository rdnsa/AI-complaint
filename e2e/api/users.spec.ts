import { ADMIN, expect, knownIssue, STAFF_PASSWORD, test, unique, uniqueUsername } from '../fixtures';

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
  expect(await res.json()).toMatchObject({ role: 'staff', name, active: 1, default_password: STAFF_PASSWORD });
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

test('akun petugas: nama depan @upi.edu, password awal 123456', async ({ admin, request }) => {
  const word = unique('Budi').split(' ')[1];
  const make = async () => (await (await admin.post('/api/users', { data: { role: 'staff', name: `${word} Santoso` } })).json()).username;
  // A second staff member with the same first name gets a number after it.
  expect(await make()).toBe(`${word}@upi.edu`);
  expect(await make()).toBe(`${word}2@upi.edu`);

  const login = await request.post('/api/auth/login', { data: { username: `${word}@upi.edu`, password: STAFF_PASSWORD } });
  expect(login.status()).toBe(200);
  expect((await login.json()).role).toBe('staff');
});

test('TC-AKN-020 supervisor bisa mengganti password petugas', async ({ admin, newStaff, request }) => {
  const staff = await newStaff();
  expect((await admin.patch(`/api/users/${staff.id}`, { data: { password: '654321' } })).status()).toBe(200);
  const login = (password: string) => request.post('/api/auth/login', { data: { username: staff.username, password } });
  expect((await login(STAFF_PASSWORD)).status()).toBe(401);
  expect((await login('654321')).status()).toBe(200);
});

test('password supervisor tetap minimal 8 karakter', async ({ admin }) => {
  const { id } = await (await admin.post('/api/users', {
    data: { role: 'supervisor', username: uniqueUsername(), name: 'Supervisor', password: 'password-sah' },
  })).json();
  const res = await admin.patch(`/api/users/${id}`, { data: { password: '123456' } });
  expect(res.status()).toBe(400);
});

test('petugas nonaktif tidak bisa masuk', async ({ admin, newStaff, request }) => {
  const staff = await newStaff();
  await admin.patch(`/api/users/${staff.id}`, { data: { active: false } });
  const login = await request.post('/api/auth/login', { data: { username: staff.username, password: STAFF_PASSWORD } });
  expect(login.status()).toBe(401);
});

test('sesi petugas tidak membuka dashboard supervisor', async ({ newStaff }) => {
  const staff = await newStaff();
  expect((await staff.request.get('/api/users')).status()).toBe(403);
  expect((await staff.request.get('/api/reports')).status()).toBe(403);
});

test('uraian tugas sendiri hanya untuk petugas yang login', async ({ newStaff, request }) => {
  const staff = await newStaff();
  expect((await request.get('/api/staff/me/duties')).status()).toBe(401);
  const res = await staff.request.get('/api/staff/me/duties');
  expect(res.status()).toBe(200);
  expect(await res.json()).toMatchObject({ duties: [], areas: [] });
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
