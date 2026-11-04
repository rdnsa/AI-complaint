import { ADMIN, expect, test, uniqueUsername } from '../fixtures';

test.describe('Beranda dan navigasi', () => {
  test('TC-HOM-001 tampilan tamu @mobile', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1, name: 'Kato Report' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Daftar', exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Masuk', exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: /Saya pelapor/ })).toBeVisible();
    await expect(page.getByRole('link', { name: /Saya petugas/ })).toBeVisible();
  });

  for (const [name, path, heading] of [
    [/Saya pelapor/, '/student', 'Saya pelapor'],
    [/Saya petugas/, '/staff', 'Halaman Petugas'],
    [/Lihat semua laporan/, '/reports', 'Laporan Masuk'],
    [/peringkat/i, '/leaderboard', 'Papan Peringkat Pelapor'],
  ] as const) {
    test(`TC-HOM-002 tautan ke ${path}`, async ({ page }) => {
      await page.goto('/');
      await page.getByRole('link', { name }).first().click();
      await expect(page).toHaveURL(path);
      await expect(page.getByRole('heading', { level: 1, name: heading })).toBeVisible();
    });
  }

  test('TC-HOM-013 rute tidak dikenal kembali ke beranda', async ({ page }) => {
    await page.goto('/halaman/yang/tidak/ada');
    await expect(page).toHaveURL('/');
  });

  for (const [from, to] of [
    ['/lapor/C-2', '/report/C-2'],
    ['/mahasiswa', '/student'],
    ['/petugas', '/staff'],
    ['/laporan', '/reports'],
    ['/masuk', '/login'],
    ['/daftar', '/register'],
    ['/peringkat', '/leaderboard'],
  ]) {
    test(`TC-LOK-016 tautan lama ${from} tetap jalan`, async ({ page }) => {
      await page.goto(from);
      await expect(page).toHaveURL(to);
    });
  }

  test('TC-UIX-001 dan TC-UIX-002 bahasa bisa diganti dan diingat', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('heading', { level: 1, name: 'Masuk' })).toBeVisible();

    await page.getByRole('group', { name: 'Bahasa' }).getByRole('button', { name: 'EN' }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Sign In' })).toBeVisible();

    await page.reload();
    await expect(page.getByRole('heading', { level: 1, name: 'Sign In' })).toBeVisible();
  });

  test('TC-UIX-005 dan TC-UIX-006 tema gelap bawaan, bisa diganti dan diingat', async ({ page }) => {
    await page.goto('/login');
    const html = page.locator('html');
    await expect(html).toHaveClass(/dark/);

    await page.getByRole('switch', { name: 'Ganti ke mode terang' }).click();
    await expect(html).not.toHaveClass(/dark/);

    await page.reload();
    await expect(html).not.toHaveClass(/dark/);
  });

  for (const path of ['/', '/student', '/staff', '/reports', '/leaderboard', '/login', '/register']) {
    test(`TC-UIX-007 ${path} tidak melebar di HP dan tanpa error konsol @mobile`, async ({ page }) => {
      const errors: string[] = [];
      page.on('pageerror', (e) => errors.push(e.message));
      // A guest's /api/auth/me is a 401 by design; the browser logs every failed request.
      page.on('console', (m) => {
        if (m.type() === 'error' && !m.text().startsWith('Failed to load resource')) errors.push(m.text());
      });
      // The staff page lists real complaints, and other tests may have filed any text.
      await page.route('**/api/reports/open**', (route) => route.fulfill({ json: { data: [] } }));

      await page.goto(path, { waitUntil: 'networkidle' });
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflow).toBeLessThanOrEqual(0);
      expect(errors).toEqual([]);
    });
  }
});

test.describe('Masuk, daftar, dan keluar', () => {
  test('TC-AUT-001 daftar lalu kembali ke beranda sebagai pelapor @mobile', async ({ page }) => {
    await page.goto('/register');
    await page.getByLabel('Username').fill(uniqueUsername());
    await page.getByLabel('Nama lengkap').fill('Pelapor Layar');
    await page.locator('#p').fill('password-sah');
    await page.getByRole('button', { name: 'Daftar', exact: true }).click();

    await expect(page).toHaveURL('/');
    await expect(page.getByText('Halo, Pelapor Layar')).toBeVisible();
  });

  test('TC-AUT-012 aturan password dari server tampil di form', async ({ page }) => {
    await page.goto('/register');
    await page.getByLabel('Username').fill(uniqueUsername());
    await page.getByLabel('Nama lengkap').fill('Pelapor Layar');
    await page.locator('#p').fill('pendek');
    await page.getByRole('button', { name: 'Daftar', exact: true }).click();
    await expect(page.getByText('Password minimal 8 karakter')).toBeVisible();
    await expect(page).toHaveURL('/register');
  });

  test('TC-AUT-020 supervisor masuk ke dashboard', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Username').fill(ADMIN.username);
    await page.locator('#p').fill(ADMIN.password);
    await page.getByRole('button', { name: 'Masuk', exact: true }).click();

    await expect(page).toHaveURL('/supervisor');
    await expect(page.getByRole('heading', { level: 1, name: 'Dashboard Supervisor' })).toBeVisible();
  });

  test('TC-AUT-025 password salah menampilkan pesan dan tetap di form', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Username').fill(ADMIN.username);
    await page.locator('#p').fill('password-salah');
    await page.getByRole('button', { name: 'Masuk', exact: true }).click();

    await expect(page.getByText('Username atau password salah')).toBeVisible();
    await expect(page).toHaveURL('/login');
  });

  test('TC-AUT-048 dashboard tanpa login diarahkan ke login', async ({ page }) => {
    await page.goto('/supervisor');
    await expect(page).toHaveURL('/login');
  });

  test('TC-AUT-049 dashboard oleh pelapor diarahkan ke login', async ({ page, reporter }) => {
    await page.goto('/login');
    await page.getByLabel('Username').fill(reporter.username);
    await page.locator('#p').fill(reporter.password);
    await page.getByRole('button', { name: 'Masuk', exact: true }).click();
    await expect(page).toHaveURL('/');

    await page.goto('/supervisor');
    await expect(page).toHaveURL('/login');
  });

  test('TC-HOM-009 keluar dari beranda @mobile', async ({ page, reporter }) => {
    await page.goto('/login');
    await page.getByLabel('Username').fill(reporter.username);
    await page.locator('#p').fill(reporter.password);
    await page.getByRole('button', { name: 'Masuk', exact: true }).click();
    await expect(page.getByText(`Halo, ${reporter.name}`)).toBeVisible();

    await page.getByRole('button', { name: 'Keluar' }).click();
    await expect(page.getByRole('link', { name: 'Masuk', exact: true })).toBeVisible();

    await page.reload();
    await expect(page.getByRole('link', { name: 'Masuk', exact: true })).toBeVisible();
  });
});
