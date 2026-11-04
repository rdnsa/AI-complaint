import { expect, pick, test, unique } from '../fixtures';

test.describe('Papan laporan publik', () => {
  test('TC-PUB-002 dan TC-PUB-003 kartu memuat ringkasan, bukan teks asli @mobile', async ({ api, newStaff, page }) => {
    const report = await api.report({ area: 'H-1', description: unique('selokan meluap di dekat tangga') });
    await api.settled(report.id);
    const staff = await newStaff();
    await api.claim(report.id, staff.id);

    await page.goto('/reports');
    const main = page.locator('main');
    await expect(main.getByText('Gedung Mohamad Yamin - Lantai 1').first()).toBeVisible();
    await expect(main.getByText('Ringkasan tiruan dari LLM.').first()).toBeVisible();
    await expect(main.getByText(report.description)).toHaveCount(0);
    await expect(main.getByText(staff.name)).toHaveCount(0);
  });

  test('TC-PUB-020 papan hanya baca', async ({ api, page }) => {
    await api.report();
    await page.goto('/reports');
    await expect(page.locator('main article').first()).toBeVisible();
    for (const name of ['Hapus', 'Saya kerjakan sekarang', 'Analisis ulang']) {
      await expect(page.locator('main').getByRole('button', { name })).toHaveCount(0);
    }
  });

  test('TC-PUB-005 laporan selesai menampilkan foto bukti', async ({ api, newStaff, page }) => {
    const report = await api.report({ area: 'H-2' });
    await api.settled(report.id);
    await api.resolve(report.id, (await newStaff()).id);

    await page.goto('/reports');
    await page.getByRole('combobox').filter({ hasText: 'Semua status' }).click();
    await page.getByRole('option', { name: 'selesai' }).click();

    const card = page.locator('main article').filter({ hasText: 'Gedung Mohamad Yamin - Lantai 2' }).first();
    await expect(card.getByText('selesai', { exact: true })).toBeVisible();
    await expect(card.getByText(/^Selesai ditangani ·/)).toBeVisible();
    await expect(card.locator('img')).toBeVisible();
  });

  test('TC-PUB-010 filter gedung', async ({ api, page }) => {
    await api.settled((await api.report({ area: 'G-1' })).id);
    await api.settled((await api.report({ area: 'F-2' })).id);

    await page.goto('/reports');
    const main = page.locator('main');
    await expect(main.getByText('Gedung RA. Kartini').first()).toBeVisible();

    await pick(page, 'place', 'Gedung F · Daoed Joesoef');
    await expect(main.getByText('Gedung Daoed Joesoef - Lantai 2').first()).toBeVisible();
    await expect(main.getByText('Gedung RA. Kartini')).toHaveCount(0);
  });

  test('TC-PUB-016 tab Dari petugas tanpa identitas', async ({ api, newStaff, page }) => {
    const staff = await newStaff();
    const note = unique('koridor sudah disapu');
    await api.cleaning(staff.id, { note });

    await page.goto('/reports');
    await page.getByRole('button', { name: 'Dari petugas' }).click();

    const card = page.locator('main article').filter({ hasText: note });
    await expect(card).toBeVisible();
    await expect(card.getByText('Petugas kebersihan')).toBeVisible();
    await expect(page.locator('main').getByText(staff.name)).toHaveCount(0);
  });
});

test.describe('Papan peringkat', () => {
  test('TC-RNK-001 pelapor tampil dengan jumlah laporannya @mobile', async ({ reporter, page }) => {
    await reporter.api.report();
    await reporter.api.report();

    await page.goto('/leaderboard');
    const row = page.locator('main li').filter({ hasText: reporter.name });
    await expect(row).toContainText('2');
  });

  test('TC-RNK-009 tamu tidak melihat posisi sendiri', async ({ page }) => {
    await page.goto('/leaderboard');
    await expect(page.getByRole('heading', { level: 1, name: 'Papan Peringkat Pelapor' })).toBeVisible();
    await expect(page.getByText(/^Posisimu:/)).toHaveCount(0);
  });
});

test.describe('Kato Bot', () => {
  test('TC-BOT-001 dan TC-BOT-002 buka, bertanya, tutup @mobile', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Buka Kato Bot' }).click();
    const chat = page.getByRole('dialog', { name: 'Kato Bot' });
    await expect(chat).toBeVisible();

    await chat.getByPlaceholder(/Tanya, contoh/).fill('gedung mana paling banyak laporan?');
    await chat.getByRole('button', { name: 'Tanya' }).click();
    await expect(chat.getByText(/Jawaban tiruan/)).toBeVisible();
    await expect(chat.getByText(/Sisa \d+ pertanyaan hari ini/)).toBeVisible();

    // TC-BOT-015: closing does not lose the thread.
    await page.keyboard.press('Escape');
    await expect(chat).toBeHidden();
    await page.getByRole('button', { name: 'Buka Kato Bot' }).click();
    await expect(chat.getByText(/Jawaban tiruan/)).toBeVisible();
  });

  test('TC-BOT-031 model gagal: pesan tampil dan pertanyaan dikembalikan', async ({ page }) => {
    const question = unique('[ask:error] berapa laporan');
    await page.goto('/');
    await page.getByRole('button', { name: 'Buka Kato Bot' }).click();
    const chat = page.getByRole('dialog', { name: 'Kato Bot' });

    await chat.getByPlaceholder(/Tanya, contoh/).fill(question);
    await chat.getByRole('button', { name: 'Tanya' }).click();

    await expect(chat.getByRole('alert')).toHaveText('Model tidak dapat menjawab saat ini. Coba lagi sebentar.');
    await expect(chat.getByPlaceholder(/Tanya, contoh/)).toHaveValue(question);
  });
});
