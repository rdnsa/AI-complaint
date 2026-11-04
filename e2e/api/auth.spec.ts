import { ADMIN, expect, knownIssue, test, unique, uniqueUsername } from '../fixtures';

const valid = () => ({ username: uniqueUsername(), name: 'Nama Pelapor', password: 'password-sah' });

test.describe('Registrasi', () => {
  test('TC-AUT-001 akun pelapor baru langsung masuk', async ({ request }) => {
    const res = await request.post('/api/auth/register', { data: valid() });
    expect(res.status()).toBe(201);
    expect((await res.json()).role).toBe('reporter');
    expect((await request.get('/api/auth/me')).status()).toBe(200);
  });

  test('TC-AUT-002 batas bawah diterima', async ({ request }) => {
    const data = { username: `a${Math.random().toString(36).slice(2, 4)}`, name: 'Ab', password: '12345678' };
    expect((await request.post('/api/auth/register', { data })).status()).toBe(201);
  });

  for (const [id, field, value, message] of [
    ['TC-AUT-006', 'username', 'ab', 'Username minimal 3 karakter'],
    ['TC-AUT-007', 'username', 'nama spasi!', 'Username hanya boleh huruf, angka, titik, garis bawah, dan strip'],
    ['TC-AUT-009', 'name', 'A', 'Nama minimal 2 karakter'],
    ['TC-AUT-010', 'name', '   ', 'Nama minimal 2 karakter'],
    ['TC-AUT-012', 'password', '1234567', 'Password minimal 8 karakter'],
  ] as const) {
    test(`${id} ${field} tidak sah ditolak`, async ({ request }) => {
      const res = await request.post('/api/auth/register', { data: { ...valid(), [field]: value } });
      expect(res.status()).toBe(400);
      expect((await res.json()).error).toBe(message);
    });
  }

  test('TC-AUT-014 dan TC-AUT-015 username terpakai, juga beda huruf besar', async ({ request }) => {
    const data = valid();
    expect((await request.post('/api/auth/register', { data })).status()).toBe(201);
    for (const username of [data.username, data.username.toUpperCase()]) {
      const res = await request.post('/api/auth/register', { data: { ...data, username } });
      expect(res.status()).toBe(409);
    }
  });

  test('TC-AUT-018 menyisipkan peran tetap menghasilkan pelapor', async ({ request }) => {
    const res = await request.post('/api/auth/register', { data: { ...valid(), role: 'supervisor' } });
    expect(res.status()).toBe(201);
    expect((await res.json()).role).toBe('reporter');
    expect((await request.get('/api/users')).status()).toBe(403);
  });
});

test.describe('Login', () => {
  test('TC-AUT-020 supervisor bawaan masuk', async ({ request }) => {
    const res = await request.post('/api/auth/login', { data: ADMIN });
    expect(res.status()).toBe(200);
    expect((await res.json()).role).toBe('supervisor');
  });

  test('TC-AUT-021 pelapor masuk dengan akunnya', async ({ reporter, playwright, baseURL }) => {
    const fresh = await playwright.request.newContext({ baseURL });
    const res = await fresh.post('/api/auth/login', { data: { username: reporter.username, password: reporter.password } });
    expect(res.status()).toBe(200);
    expect((await res.json()).id).toBe(reporter.id);
    await fresh.dispose();
  });

  test('TC-AUT-022 username tidak peka huruf besar', async ({ request }) => {
    const res = await request.post('/api/auth/login', { data: { ...ADMIN, username: 'ADMIN' } });
    expect(res.status()).toBe(200);
  });

  for (const [id, title, data] of [
    ['TC-AUT-025', 'password salah', { username: 'admin', password: 'password-salah' }],
    ['TC-AUT-026', 'akun tidak ada', { username: 'tidak-ada-akun', password: 'password-salah' }],
    ['TC-AUT-027', 'password beda huruf besar', { username: 'admin', password: 'admin123!' }],
    ['TC-AUT-032', 'injeksi SQL', { username: "admin' OR '1'='1", password: "' OR '1'='1" }],
  ] as const) {
    test(`${id} ${title} ditolak dengan pesan yang sama`, async ({ request }) => {
      const res = await request.post('/api/auth/login', { data });
      expect(res.status()).toBe(401);
      expect((await res.json()).error).toBe('Username atau password salah');
    });
  }

  test('TC-AUT-028 kolom kosong ditolak', async ({ request }) => {
    const res = await request.post('/api/auth/login', { data: { username: '', password: '' } });
    expect(res.status()).toBe(400);
  });

  test('TC-AUT-030 akun nonaktif tidak bisa masuk', async ({ admin, request }) => {
    const username = uniqueUsername();
    const created = await admin.post('/api/users', {
      data: { role: 'supervisor', username, name: 'Supervisor Uji', password: 'password-sah' },
    });
    const { id } = await created.json();
    await admin.patch(`/api/users/${id}`, { data: { active: false } });

    const res = await request.post('/api/auth/login', { data: { username, password: 'password-sah' } });
    expect(res.status()).toBe(401);
  });

  test('TC-AUT-033 percobaan login berulang dibatasi', async ({ request, reporter }) => {
    const statuses: number[] = [];
    for (let i = 0; i < 25; i++) {
      const res = await request.post('/api/auth/login', { data: { username: reporter.username, password: `salah-${i}` } });
      statuses.push(res.status());
    }
    knownIssue('T-09', 'percobaan login tidak dibatasi');
    expect(statuses).toContain(429);
  });
});

test.describe('Sesi', () => {
  test('TC-AUT-035 cookie HttpOnly dan SameSite=Lax', async ({ request }) => {
    const res = await request.post('/api/auth/login', { data: ADMIN });
    const cookie = res.headers()['set-cookie'];
    expect(cookie).toContain('session=');
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('SameSite=Lax');
    expect(cookie).toContain('Max-Age=43200');
  });

  test('TC-AUT-036 hash password tidak pernah keluar lewat API', async ({ admin }) => {
    const body = await (await admin.get('/api/users')).text();
    expect(body).not.toMatch(/password_hash|password_salt|sandi_hash|sandi_salt/);
  });

  test('TC-AUT-038 cookie palsu tidak diterima', async ({ playwright, baseURL }) => {
    const context = await playwright.request.newContext({
      baseURL,
      extraHTTPHeaders: { cookie: 'session=bukan.token.sah' },
    });
    expect((await context.get('/api/auth/me')).status()).toBe(401);
    expect((await context.get('/api/users')).status()).toBe(401);
    await context.dispose();
  });

  test('TC-AUT-039 isi token yang diubah tidak diterima', async ({ request, playwright, baseURL }) => {
    const res = await request.post('/api/auth/register', { data: valid() });
    const token = /session=([^;]+)/.exec(res.headers()['set-cookie'])![1];
    const [head, payload, signature] = token.split('.');
    const claims = JSON.parse(Buffer.from(payload, 'base64url').toString());
    const forged = Buffer.from(JSON.stringify({ ...claims, role: 'supervisor' })).toString('base64url');

    const context = await playwright.request.newContext({
      baseURL,
      extraHTTPHeaders: { cookie: `session=${head}.${forged}.${signature}` },
    });
    expect((await context.get('/api/users')).status()).toBe(401);
    await context.dispose();
  });

  test('TC-AUT-040 tanpa login: /me membalas 401', async ({ request }) => {
    expect((await request.get('/api/auth/me')).status()).toBe(401);
  });

  test('TC-AUT-041 keluar menghapus cookie', async ({ playwright, baseURL }) => {
    const context = await playwright.request.newContext({ baseURL });
    await context.post('/api/auth/login', { data: ADMIN });
    expect((await context.get('/api/auth/me')).status()).toBe(200);
    await context.post('/api/auth/logout');
    expect((await context.get('/api/auth/me')).status()).toBe(401);
    await context.dispose();
  });

  test('TC-AUT-043 sesi lama berhenti setelah akun dinonaktifkan', async ({ admin, playwright, baseURL }) => {
    const username = uniqueUsername();
    const password = 'password-sah';
    const created = await admin.post('/api/users', {
      data: { role: 'supervisor', username, name: unique('Supervisor'), password },
    });
    const { id } = await created.json();

    const other = await playwright.request.newContext({ baseURL });
    await other.post('/api/auth/login', { data: { username, password } });
    expect((await other.get('/api/users')).status()).toBe(200);

    await admin.patch(`/api/users/${id}`, { data: { active: false } });
    const after = await other.get('/api/users');
    await other.dispose();

    knownIssue('T-03', 'cookie tetap berlaku sampai 12 jam setelah akun dinonaktifkan');
    expect(after.status()).toBe(401);
  });
});
