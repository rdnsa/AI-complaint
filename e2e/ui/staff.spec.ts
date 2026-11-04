import type { Locator, Page } from '@playwright/test';
import { expect, knownIssue, OFF_CAMPUS, ON_CAMPUS, pick, takePhoto, test, unique } from '../fixtures';

/** The card of one complaint on the staff page, found by its original text. */
const cardOf = (page: Page, description: string) => page.locator('article').filter({ hasText: description });

/** Answers "who is doing this?" inside a card. */
async function answerWho(page: Page, card: Locator, name: string) {
  await card.getByRole('combobox').click();
  await page.getByRole('option', { name, exact: true }).click();
}

test.describe('Keluhan', () => {
  test('TC-KLH-008 klaim lalu TC-KLH-016 selesai dengan foto bukti @mobile', async ({ api, newStaff, page }) => {
    const report = await api.report();
    await api.settled(report.id);
    const staff = await newStaff();

    await page.goto('/staff');
    const card = cardOf(page, report.description);
    await expect(card.getByText('Prioritas sedang')).toBeVisible();
    await expect(card.getByText('Rekomendasi tiruan dari LLM.')).toBeVisible();

    await card.getByRole('button', { name: 'Saya kerjakan sekarang' }).click();
    await answerWho(page, card, staff.name);
    await card.getByRole('button', { name: 'Ya, saya yang kerjakan' }).click();
    await expect(card.getByText('Kamu yang mengerjakan ini')).toBeVisible();
    expect((await api.getReport(report.id)).staff_name).toBe(staff.name);

    await card.getByRole('button', { name: /Sudah beres/ }).click();
    await card.getByRole('button', { name: 'Lanjut foto bukti' }).click();
    await takePhoto(page);

    await expect(page.getByText('Laporan selesai. Terima kasih!')).toBeVisible();
    expect((await api.getReport(report.id)).status).toBe('resolved');
    // The card leaves the list by itself shortly after.
    await expect(cardOf(page, report.description)).toHaveCount(0);
  });

  test('TC-KLH-009 tanpa nama tombol lanjut nonaktif', async ({ api, page }) => {
    const report = await api.report();
    await page.goto('/staff');
    const card = cardOf(page, report.description);
    await card.getByRole('button', { name: 'Saya kerjakan sekarang' }).click();
    await expect(card.getByRole('button', { name: 'Ya, saya yang kerjakan' })).toBeDisabled();
  });

  test('TC-KLH-010 batal klaim tidak mengubah apa pun', async ({ api, newStaff, page }) => {
    const report = await api.report();
    const staff = await newStaff();
    await page.goto('/staff');
    const card = cardOf(page, report.description);
    await card.getByRole('button', { name: 'Saya kerjakan sekarang' }).click();
    await answerWho(page, card, staff.name);
    await card.getByRole('button', { name: 'Batal' }).click();

    await expect(card.getByRole('button', { name: 'Saya kerjakan sekarang' })).toBeVisible();
    expect((await api.getReport(report.id)).status).toBe('new');
  });

  test('TC-KLH-011 mengambil alih klaim petugas lain', async ({ api, newStaff, page }) => {
    const report = await api.report();
    const [holder, next] = [await newStaff('Pemegang'), await newStaff('Pengganti')];
    await api.claim(report.id, holder.id);

    await page.goto('/staff');
    const card = cardOf(page, report.description);
    await expect(card.getByText(`Sedang dikerjakan ${holder.name}`)).toBeVisible();

    await card.getByRole('button', { name: 'Ambil alih' }).click();
    await answerWho(page, card, next.name);
    await card.getByRole('button', { name: 'Ya, saya ambil alih' }).click();

    await expect(card.getByText('Kamu yang mengerjakan ini')).toBeVisible();
    expect((await api.getReport(report.id)).staff_name).toBe(next.name);
  });

  test('TC-KLH-018 foto kotor ditolak dan bisa difoto ulang', async ({ api, newStaff, page }) => {
    const report = await api.report({ description: unique('[vision:dirty] lantai kotor') });
    const staff = await newStaff();
    await page.goto('/staff');
    const card = cardOf(page, report.description);

    await card.getByRole('button', { name: /Sudah beres/ }).click();
    await answerWho(page, card, staff.name);
    await card.getByRole('button', { name: 'Lanjut foto bukti' }).click();
    await takePhoto(page);

    const rejected = card.getByRole('alert');
    await expect(rejected).toContainText('Foto ditolak');
    await expect(rejected).toContainText('Masih terlihat kotor');
    await expect(rejected).toContainText('Sampah masih terlihat di lantai.');
    expect((await api.getReport(report.id)).status).toBe('new');

    // The way out of a rejection stays open.
    await expect(card.getByRole('button', { name: /Sudah beres/ })).toBeEnabled();
  });

  test('TC-KLH-019 foto bukan lokasi ditolak', async ({ api, newStaff, page }) => {
    const report = await api.report({ description: unique('[vision:wrong_place] lantai kotor') });
    const staff = await newStaff();
    await page.goto('/staff');
    const card = cardOf(page, report.description);

    await card.getByRole('button', { name: /Sudah beres/ }).click();
    await answerWho(page, card, staff.name);
    await card.getByRole('button', { name: 'Lanjut foto bukti' }).click();
    await takePhoto(page);

    await expect(card.getByRole('alert')).toContainText('Foto bukan lokasi yang dilaporkan.');
  });

  test('TC-KLH-026 pemeriksa foto gagal meminta coba lagi', async ({ api, newStaff, page }) => {
    const report = await api.report({ description: unique('[vision:error] lantai kotor') });
    const staff = await newStaff();
    await page.goto('/staff');
    const card = cardOf(page, report.description);

    await card.getByRole('button', { name: /Sudah beres/ }).click();
    await answerWho(page, card, staff.name);
    await card.getByRole('button', { name: 'Lanjut foto bukti' }).click();
    await takePhoto(page);

    await expect(card.getByRole('alert')).toContainText('Pemeriksaan foto gagal. Coba lagi sebentar.');
  });

  test('TC-KLH-029 kartu basi yang sudah selesai dibalas 409 dan pesannya tampil', async ({ api, newStaff, page }) => {
    const report = await api.report();
    const [first, second] = [await newStaff('Pertama'), await newStaff('Kedua')];
    await page.goto('/staff');
    const card = cardOf(page, report.description);
    await expect(card).toBeVisible();

    // Someone else closes the report while this page is still open.
    await api.resolve(report.id, first.id);

    await card.getByRole('button', { name: 'Saya kerjakan sekarang' }).click();
    await answerWho(page, card, second.name);
    await card.getByRole('button', { name: 'Ya, saya yang kerjakan' }).click();
    await expect(card.getByRole('alert')).toHaveText('Laporan ini sudah selesai.');
  });

  test('TC-KLH-005 filter lokasi menyaring keluhan', async ({ api, page }) => {
    const here = await api.report({ area: 'E-1' });
    const elsewhere = await api.report({ area: 'F-1' });
    await page.goto('/staff');
    await expect(cardOf(page, here.description)).toBeVisible();
    await expect(cardOf(page, elsewhere.description)).toBeVisible();

    await pick(page, 'place', 'Gedung E · Dr. Wahidin Sudirohusodo');
    await expect(cardOf(page, here.description)).toBeVisible();
    await expect(cardOf(page, elsewhere.description)).toHaveCount(0);
  });

  test('TC-LOK-023 tab awal mengikuti keluhan di lokasi QR', async ({ api, page }) => {
    // No other test files a complaint at this location.
    await page.goto('/staff/F-HALAMAN');
    await expect(page.getByRole('button', { name: 'Tugas harian' })).toHaveAttribute('aria-pressed', 'true');

    await api.report({ area: 'I-1' });
    await page.goto('/staff/I-1');
    await expect(page.getByRole('button', { name: /^Keluhan/ })).toHaveAttribute('aria-pressed', 'true');
  });

  test('TC-UIX-009 kata panjang tanpa spasi tidak melebarkan halaman @mobile', async ({ api, page }) => {
    const report = await api.report();
    // The API accepts 1,000 characters of any kind (TC-LAP-010). Only this page sees the long
    // word: a real one would widen the page for every parallel test on the staff page too.
    await page.route('**/api/reports/open**', async (route) => {
      const { data } = await (await route.fetch()).json();
      const mine = data.find((r: { id: string }) => r.id === report.id);
      await route.fulfill({ json: { data: [{ ...mine, description: 'x'.repeat(1000), summary: null }] } });
    });
    await page.goto('/staff');
    await expect(page.getByRole('button', { name: 'Saya kerjakan sekarang' })).toBeVisible();

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    knownIssue('T-25', 'teks panjang tanpa spasi tidak dipotong, halaman melebar dan tombol tertimpa');
    expect(overflow).toBeLessThanOrEqual(0);
  });

  test('TC-LOK-019 sakelar peran di halaman QR', async ({ page }) => {
    await page.goto('/report/C-2');
    await page.getByRole('link', { name: 'Saya petugas' }).click();
    await expect(page).toHaveURL('/staff/C-2');
    await page.getByRole('link', { name: 'Saya pelapor' }).click();
    await expect(page).toHaveURL('/report/C-2?as=student');
  });
});

test.describe('Tugas harian', () => {
  test.use({ geolocation: ON_CAMPUS, permissions: ['geolocation'] });

  test('TC-THR-006 enam tugas, TC-THR-019 kirim dari kampus @mobile', async ({ newStaff, page }) => {
    const staff = await newStaff();
    await page.goto('/clean/C-2');
    await expect(page).toHaveURL('/clean/C-2');

    // Nothing to do until a name is picked.
    await expect(page.getByRole('button', { name: 'Membuang sampah' })).toHaveCount(0);
    await pick(page, 'staff-picker', staff.name);

    await expect(page.getByText('Kamu berada di area kampus')).toBeVisible();
    for (const task of ['Menyapu & mengepel', 'Mengelap kaca jendela', 'Membersihkan toilet', 'Membuang sampah', 'Mengisi ulang galon', 'Merapikan ruangan']) {
      await expect(page.getByRole('button', { name: task })).toBeVisible();
    }

    await page.getByRole('button', { name: 'Membuang sampah' }).click();
    const task = page.locator('article').filter({ hasText: 'Membuang sampah' });
    // TC-THR-013: the send button stays off until there is a photo.
    await expect(task.getByRole('button', { name: 'Kirim', exact: true })).toBeDisabled();

    await task.getByRole('button', { name: 'Foto', exact: true }).click();
    await takePhoto(page);
    await expect(task.getByText('Foto tersimpan')).toBeVisible();

    await task.getByRole('button', { name: 'Kirim', exact: true }).click();
    await expect(task.getByText(/^Terkirim /)).toBeVisible();
  });

  test('TC-THR-002 nama diingat, TC-LOK-021 QR membuka halaman petugas', async ({ newStaff, page }) => {
    const staff = await newStaff();
    await page.goto('/clean/C-2');
    await pick(page, 'staff-picker', staff.name);

    await page.reload();
    await expect(page.locator('#staff-picker')).toHaveText(staff.name);

    await page.goto('/report/C-2');
    await expect(page).toHaveURL('/staff/C-2');

    // TC-LOK-022: the switch opts out, so a cleaner can still report as anyone else.
    await page.goto('/report/C-2?as=student');
    await expect(page).toHaveURL('/report/C-2?as=student');
  });

  test('TC-THR-005 lokasi belum dipilih', async ({ newStaff, page }) => {
    const staff = await newStaff();
    await page.goto('/staff');
    await page.getByRole('button', { name: 'Tugas harian' }).click();
    await pick(page, 'staff-picker', staff.name);
    await expect(page.getByText('Pilih lokasi dulu.')).toBeVisible();
  });

  test.describe('di luar kampus', () => {
    test.use({ geolocation: OFF_CAMPUS, permissions: ['geolocation'] });

    test('TC-THR-009, TC-THR-025 dan TC-THR-026 peringatan, batal, lalu tetap kirim', async ({ newStaff, page }) => {
      const staff = await newStaff();
      await page.goto('/clean/C-2');
      await pick(page, 'staff-picker', staff.name);
      await expect(page.getByText(/dari kampus$/).first()).toBeVisible();

      await page.getByRole('button', { name: 'Merapikan ruangan' }).click();
      const task = page.locator('article').filter({ hasText: 'Merapikan ruangan' });
      await task.getByRole('button', { name: 'Foto', exact: true }).click();
      await takePhoto(page);
      await expect(task.getByText('Foto tersimpan')).toBeVisible();

      await task.getByRole('button', { name: 'Kirim', exact: true }).click();
      await expect(task.getByText('Kamu terlalu jauh dari kampus')).toBeVisible();

      // Cancelling sends nothing.
      await task.getByRole('button', { name: 'Batal, saya cek lokasi dulu' }).click();
      await expect(task.getByText(/^Terkirim /)).toHaveCount(0);

      await task.getByRole('button', { name: 'Kirim', exact: true }).click();
      await task.getByRole('button', { name: /Tetap kirim/ }).click();
      await expect(task.getByText(/^Terkirim /)).toBeVisible();
      await expect(task.getByText(/di luar kampus; ditandai/)).toBeVisible();
    });
  });

  test.describe('izin lokasi ditolak', () => {
    test.use({ geolocation: undefined, permissions: [] });

    test('TC-THR-010 dan TC-THR-027 tetap bisa kirim, ditandai tanpa GPS', async ({ newStaff, page }) => {
      await page.addInitScript(() => {
        navigator.geolocation.getCurrentPosition = (_ok, fail) =>
          fail?.({ code: 1, PERMISSION_DENIED: 1, POSITION_UNAVAILABLE: 2, TIMEOUT: 3, message: 'ditolak' } as GeolocationPositionError);
      });
      const staff = await newStaff();
      await page.goto('/clean/C-2');
      await pick(page, 'staff-picker', staff.name);
      await expect(page.getByText('Lokasi tidak terbaca')).toBeVisible();

      await page.getByRole('button', { name: 'Mengisi ulang galon' }).click();
      const task = page.locator('article').filter({ hasText: 'Mengisi ulang galon' });
      await task.getByRole('button', { name: 'Foto', exact: true }).click();
      await takePhoto(page);
      await expect(task.getByText('Foto tersimpan')).toBeVisible();

      await task.getByRole('button', { name: 'Kirim', exact: true }).click();
      await expect(task.getByText('Lokasi kamu tidak terbaca')).toBeVisible();
      await task.getByRole('button', { name: /Tetap kirim/ }).click();
      await expect(task.getByText(/^Terkirim /)).toBeVisible();
    });
  });
});
