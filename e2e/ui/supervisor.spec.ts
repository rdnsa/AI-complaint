import type { Page } from '@playwright/test';
import { ADMIN, expect, test, unique } from '../fixtures';

test.use({ storageState: 'e2e/.auth/supervisor.json' });

/** The tab's name carries a red count once a cleaning report has been flagged today. */
const reportsTab = (page: Page) => page.getByRole('button', { name: /^Laporan\s*\d*$/ });

async function openComplaints(page: Page) {
  await page.goto('/supervisor');
  await reportsTab(page).click();
  await page.getByRole('button', { name: 'Keluhan', exact: true }).click();
}

test.describe('Dashboard supervisor', () => {
  test('TC-SPL-001 lima tab bisa dibuka tanpa error', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));

    await page.goto('/supervisor');
    await expect(page.getByText(/Masuk sebagai .* Supervisor/)).toBeVisible();
    for (const tab of ['Log aktivitas', 'Petugas & Supervisor', 'QR lokasi', 'Ringkasan']) {
      await reportsTab(page).click();
      await expect(reportsTab(page)).toHaveAttribute('aria-pressed', 'true');
      const button = page.getByRole('button', { name: tab, exact: true });
      await button.click();
      await expect(button).toHaveAttribute('aria-pressed', 'true');
    }
    expect(errors).toEqual([]);
  });

  test('TC-SPL-002 baris keluhan memuat teks asli dan analisis', async ({ api, page }) => {
    const report = await api.report();
    await api.settled(report.id);
    await openComplaints(page);

    const row = page.locator('article').filter({ hasText: report.description });
    await expect(row.getByText('Ringkasan tiruan dari LLM.')).toBeVisible();
    await expect(row.getByText('Rekomendasi tiruan dari LLM.')).toBeVisible();
    await expect(row.getByText('Prioritas sedang')).toBeVisible();
    // TC-SPL-021: the supervisor watches and moderates, closing is the cleaners' job.
    await expect(row.getByRole('button', { name: /Sudah beres|Saya kerjakan/ })).toHaveCount(0);
  });

  test('TC-SPL-004 filter status', async ({ api, newStaff, page }) => {
    const open = await api.report();
    const done = await api.report();
    await api.resolve(done.id, (await newStaff()).id);
    await openComplaints(page);
    await expect(page.locator('article').filter({ hasText: open.description })).toBeVisible();

    await page.getByRole('combobox').filter({ hasText: 'Semua status' }).click();
    await page.getByRole('option', { name: 'selesai' }).click();

    await expect(page.locator('article').filter({ hasText: done.description })).toBeVisible();
    await expect(page.locator('article').filter({ hasText: open.description })).toHaveCount(0);
  });

  test('TC-SPL-018 analisis ulang dari dashboard', async ({ api, page }) => {
    const report = await api.report({ description: unique('[llm:fail-once] lantai kotor') });
    await api.settled(report.id);
    await openComplaints(page);

    const row = page.locator('article').filter({ hasText: report.description });
    await row.getByRole('button', { name: 'Analisis ulang' }).click();
    await expect(row.getByText('Ringkasan tiruan dari LLM.')).toBeVisible();
    await expect(row.getByRole('button', { name: 'Analisis ulang' })).toHaveCount(0);
  });

  test('buka kembali laporan selesai, dengan konfirmasi', async ({ api, newStaff, page }) => {
    const report = await api.report();
    const staff = await newStaff();
    const unresolved = await api.report();
    await api.resolve(report.id, staff.id);
    await openComplaints(page);

    await expect(
      page.locator('article').filter({ hasText: unresolved.description }).getByRole('button', { name: 'Buka kembali' }),
    ).toHaveCount(0);

    const row = page.locator('article').filter({ hasText: report.description });
    page.once('dialog', (dialog) => dialog.dismiss());
    await row.getByRole('button', { name: 'Buka kembali' }).click();
    expect((await api.getReport(report.id)).status).toBe('resolved');

    page.once('dialog', (dialog) => dialog.accept());
    await row.getByRole('button', { name: 'Buka kembali' }).click();
    await expect(row.getByRole('button', { name: 'Buka kembali' })).toHaveCount(0);
    expect(await api.getReport(report.id)).toMatchObject({ status: 'new', staff_name: null });
    await expect(row.getByText(`Ditangani: ${staff.name}`)).toHaveCount(0);
  });

  test('TC-SPL-020 batal hapus membiarkan laporan', async ({ api, page }) => {
    const report = await api.report();
    await openComplaints(page);
    const row = page.locator('article').filter({ hasText: report.description });

    page.once('dialog', (dialog) => dialog.dismiss());
    await row.getByRole('button', { name: 'Hapus' }).click();
    await expect(row).toBeVisible();
    expect((await api.getReport(report.id)).id).toBe(report.id);
  });

  test('TC-SPL-019 hapus laporan setelah konfirmasi', async ({ api, page, acceptDialogs, request }) => {
    const report = await api.report();
    await openComplaints(page);
    const row = page.locator('article').filter({ hasText: report.description });

    await row.getByRole('button', { name: 'Hapus' }).click();
    await expect(row).toHaveCount(0);
    await expect.poll(async () => (await request.get(`/api/reports/${report.id}`)).status()).toBe(404);
  });
});

test.describe('Kelola akun', () => {
  test('TC-AKN-003 dan TC-AKN-021 tambah, nonaktifkan, aktifkan petugas', async ({ page }) => {
    const name = unique('Petugas Dashboard');
    await page.goto('/supervisor');
    await page.getByRole('button', { name: 'Petugas & Supervisor' }).click();

    await page.getByPlaceholder('Nama').fill(name);
    await page.getByRole('button', { name: 'Tambah petugas' }).click();

    const row = page.locator('li').filter({ hasText: name });
    await expect(row).toBeVisible();

    await row.getByRole('button', { name: 'Nonaktifkan' }).click();
    await expect(row.getByText('nonaktif', { exact: true })).toBeVisible();

    await row.getByRole('button', { name: 'Aktifkan' }).click();
    await expect(row.getByText('nonaktif', { exact: true })).toHaveCount(0);
  });

  test('TC-AKN-013 ubah nama petugas', async ({ newStaff, page }) => {
    const staff = await newStaff();
    const renamed = unique('Nama Baru');
    await page.goto('/supervisor');
    await page.getByRole('button', { name: 'Petugas & Supervisor' }).click();

    const row = page.locator('li').filter({ hasText: staff.name });
    await row.getByRole('button', { name: 'Ubah' }).click();
    await row.locator('form input').first().fill(renamed);
    await row.getByRole('button', { name: 'Simpan' }).click();

    await expect(page.locator('li').filter({ hasText: renamed })).toBeVisible();
  });

  test('TC-AKN-026 hapus petugas tanpa riwayat', async ({ newStaff, page, acceptDialogs }) => {
    const staff = await newStaff();
    await page.goto('/supervisor');
    await page.getByRole('button', { name: 'Petugas & Supervisor' }).click();

    const row = page.locator('li').filter({ hasText: staff.name });
    await row.getByRole('button', { name: 'Hapus' }).click();
    await expect(row).toHaveCount(0);
  });

  test('TC-AKN-028 hapus petugas berriwayat menampilkan alasan', async ({ api, newStaff, page, acceptDialogs }) => {
    const staff = await newStaff();
    await api.cleaning(staff.id);
    await page.goto('/supervisor');
    await page.getByRole('button', { name: 'Petugas & Supervisor' }).click();

    const row = page.locator('li').filter({ hasText: staff.name });
    await row.getByRole('button', { name: 'Hapus' }).click();
    await expect(page.getByText(/Nonaktifkan saja/)).toBeVisible();
    await expect(row).toBeVisible();
  });

  test('TC-AKN-002 akun sendiri tanpa tombol nonaktifkan dan hapus', async ({ page }) => {
    await page.goto('/supervisor');
    await page.getByRole('button', { name: 'Petugas & Supervisor' }).click();
    const row = page.locator('li').filter({ has: page.locator('code', { hasText: /^admin$/ }) });
    await expect(row.getByRole('button', { name: 'Ubah' })).toBeVisible();
    await expect(row.getByRole('button', { name: 'Nonaktifkan' })).toHaveCount(0);
    await expect(row.getByRole('button', { name: 'Hapus' })).toHaveCount(0);
  });
});

test.describe('Log, rekap, ringkasan, QR', () => {
  test('TC-LOG-001 aktivitas baru tampil di log', async ({ api, page }) => {
    await api.report({ area: 'H-2' });
    await page.goto('/supervisor');
    await page.getByRole('button', { name: 'Log aktivitas' }).click();
    await expect(page.getByText('Laporan baru di Gedung Mohamad Yamin - Lantai 2').first()).toBeVisible();
  });

  test('TC-SPK-013 laporan kebersihan tampil dengan status lokasi', async ({ api, newStaff, page }) => {
    const staff = await newStaff();
    await api.cleaning(staff.id, { area: 'G-1', position: null });

    await page.goto('/supervisor');
    await reportsTab(page).click();
    await expect(page.getByRole('button', { name: /^Kebersihan/ })).toHaveAttribute('aria-pressed', 'true');

    // TC-SPK-012: a report without GPS raises the red count on the tab.
    await expect(page.getByRole('button', { name: /^Kebersihan\s*\d+$/ })).toBeVisible();
    await expect(page.locator('body')).toContainText(staff.name);
    await expect(page.getByText('Tanpa GPS').first()).toBeVisible();
  });

  test('TC-SPR-003 buat ulang ringkasan harian', async ({ api, page }) => {
    await api.settled((await api.report()).id);
    await page.goto('/supervisor');
    await page.getByRole('button', { name: 'Buat ulang' }).click();
    await expect(page.getByText('Ringkasan harian tiruan dari LLM.')).toBeVisible();
    await expect(page.getByText('Sorotan tiruan pertama')).toBeVisible();
  });

  test('TC-QRS-001 dan TC-QRS-002 stiker per lokasi mengarah ke halaman lapor', async ({ page, baseURL }) => {
    await page.goto('/supervisor');
    await page.getByRole('button', { name: 'QR lokasi' }).click();

    await expect(page.getByText(/^\d+ kode QR$/)).toBeVisible();
    const count = Number((await page.getByText(/^\d+ kode QR$/).innerText()).split(' ')[0]);
    expect(count).toBeGreaterThan(20);
    await expect(page.locator('.print-sheet article')).toHaveCount(count);
    await expect(page.locator('.print-sheet article svg').first()).toBeVisible();
    await expect(page.getByText(`${baseURL}/report/C-2`, { exact: true })).toBeVisible();
  });

  test('TC-QRS-003 filter lokasi mengurangi stiker', async ({ page }) => {
    await page.goto('/supervisor');
    await page.getByRole('button', { name: 'QR lokasi' }).click();
    await expect(page.locator('.print-sheet article').first()).toBeVisible();

    await page.getByRole('combobox').filter({ hasText: 'Semua' }).first().click();
    await page.getByRole('option', { name: 'Gedung C · Dewi Sartika' }).click();
    // Gedung C: the yard and five floors.
    await expect(page.locator('.print-sheet article')).toHaveCount(6);
  });

  test('TC-QRS-006 unduh PNG', async ({ page }) => {
    await page.goto('/supervisor');
    await page.getByRole('button', { name: 'QR lokasi' }).click();
    const sticker = page.locator('.print-sheet article').filter({ hasText: '/report/C-2' });

    const download = page.waitForEvent('download');
    await sticker.getByRole('button', { name: /PNG/ }).click();
    expect((await download).suggestedFilename()).toBe('qr-C-2.png');
  });

  test('TC-AUT-041 keluar dari dashboard', async ({ browser, baseURL }) => {
    // A session of its own: logging out must not touch the one the other tests share.
    const context = await browser.newContext({ baseURL, locale: 'id-ID' });
    const page = await context.newPage();
    const login = await context.request.post('/api/auth/login', { data: ADMIN });
    expect(login.ok()).toBe(true);

    await page.goto('/supervisor');
    await page.getByRole('button', { name: 'Keluar' }).click();
    await expect(page).toHaveURL('/login');
    await page.goto('/supervisor');
    await expect(page).toHaveURL('/login');
    await context.close();
  });
});
