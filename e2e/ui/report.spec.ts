import { expect, pick, takePhoto, test, unique } from '../fixtures';

const sendButton = (page: import('@playwright/test').Page) => page.getByRole('button', { name: 'Kirim laporan' });

async function photographAndDescribe(page: import('@playwright/test').Page, description: string) {
  await page.getByLabel('Apa yang bermasalah?').fill(description);
  await page.getByRole('button', { name: 'Buka kamera' }).click();
  await takePhoto(page);
}

test.describe('Pelapor mengirim laporan', () => {
  test('TC-LAP-001 pilih lokasi, foto, kirim, lalu lihat hasil analisis @mobile', async ({ page }) => {
    const description = unique('selokan meluap ke lorong');
    await page.goto('/student');

    await pick(page, 'place', 'Gedung C · Dewi Sartika');
    await pick(page, 'part', 'Lantai 2');
    await photographAndDescribe(page, description);
    await sendButton(page).click();

    await expect(page).toHaveURL(/\/reports\/[0-9a-f-]{36}$/);
    await expect(page.getByText('Laporan kamu sudah masuk')).toBeVisible();
    await expect(page.getByText(description)).toBeVisible();
    await expect(page.getByText('Gedung Dewi Sartika (Perkuliahan) - Lantai 2')).toBeVisible();

    // The result appears by itself once the analysis finishes.
    await expect(page.getByText('Ringkasan tiruan dari LLM.')).toBeVisible();
    await expect(page.getByText('Rekomendasi tiruan dari LLM.')).toBeVisible();
    await expect(page.getByText('Prioritas tinggi')).toBeVisible();
    await expect(page.getByText('genangan')).toBeVisible();
  });

  test('TC-LAP-002 dari QR lokasi sudah terpilih @mobile', async ({ page }) => {
    await page.goto('/report/C-2');
    await expect(page.locator('#place')).toHaveText(/Gedung C/);
    await expect(page.locator('#part')).toHaveText('Lantai 2');

    await photographAndDescribe(page, unique('sampah menumpuk di koridor'));
    await sendButton(page).click();
    await expect(page.getByText('Laporan kamu sudah masuk')).toBeVisible();
    await expect(page.getByText('Gedung Dewi Sartika (Perkuliahan) - Lantai 2')).toBeVisible();
  });

  test('TC-LOK-007 dan TC-LOK-008 QR halaman dan tempat di luar gedung', async ({ page }) => {
    await page.goto('/report/C-HALAMAN');
    await expect(page.locator('#part')).toHaveText('Halaman');
    await page.goto('/report/LAPANG-VOLI');
    await expect(page.locator('#place')).toHaveText('Lapang Voli');
  });

  test('TC-LOK-013 QR tidak dikenal meminta pilih lokasi', async ({ page }) => {
    await page.goto('/report/TIDAK-ADA');
    await expect(page.getByText('QR tidak dikenal. Pilih lokasi di atas.')).toBeVisible();
    await expect(page.locator('#part')).toBeDisabled();
  });

  test('TC-LOK-004 mengganti gedung mengosongkan bagian', async ({ page }) => {
    await page.goto('/report/C-2');
    await expect(page.locator('#part')).toHaveText('Lantai 2');
    await pick(page, 'place', 'Gedung D · KH. Ahmad Dahlan');
    await expect(page.locator('#part')).toHaveText('— Pilih —');
  });

  test('TC-LAP-015 tombol kirim nonaktif tanpa lokasi atau foto @mobile', async ({ page }) => {
    await page.goto('/student');
    await page.getByLabel('Apa yang bermasalah?').fill(unique('lantai kotor'));
    await expect(sendButton(page)).toBeDisabled();

    await pick(page, 'place', 'Gedung C · Dewi Sartika');
    await pick(page, 'part', 'Lantai 2');
    await expect(sendButton(page)).toBeDisabled();

    await page.getByRole('button', { name: 'Buka kamera' }).click();
    await takePhoto(page);
    await expect(sendButton(page)).toBeEnabled();
  });

  test('TC-LAP-017 keluhan terlalu pendek ditolak sebelum dikirim', async ({ page }) => {
    let submitted = false;
    page.on('request', (r) => {
      if (r.method() === 'POST' && r.url().endsWith('/api/reports')) submitted = true;
    });
    await page.goto('/report/C-2');
    await photographAndDescribe(page, 'abc');
    await sendButton(page).click();

    await expect(page.getByRole('alert')).toHaveText('Tolong tulis keluhannya sedikit lebih jelas.');
    expect(submitted).toBe(false);
  });

  test('TC-LAP-013 foto bisa dihapus dan diulang', async ({ page }) => {
    await page.goto('/report/C-2');
    await photographAndDescribe(page, unique('lantai kotor'));
    await expect(sendButton(page)).toBeEnabled();

    await page.getByRole('button', { name: 'Hapus' }).click();
    await expect(sendButton(page)).toBeDisabled();

    await page.getByRole('button', { name: 'Buka kamera' }).click();
    await takePhoto(page);
    await expect(sendButton(page)).toBeEnabled();
  });

  test('TC-LAP-020 koneksi putus: pesan tampil dan isian tidak hilang', async ({ page }) => {
    const description = unique('lantai kotor');
    await page.goto('/report/C-2');
    await photographAndDescribe(page, description);

    await page.route('**/api/uploads**', (route) => route.abort());
    await sendButton(page).click();

    await expect(page.getByRole('alert')).toBeVisible();
    await expect(page.getByLabel('Apa yang bermasalah?')).toHaveValue(description);
    await expect(sendButton(page)).toBeEnabled();
  });

  test('TC-LAP-036 XSS pada keluhan tampil sebagai teks', async ({ page }) => {
    const description = unique('<img src=x onerror="window.__xss=1"> kotor');
    await page.goto('/report/C-2');
    await photographAndDescribe(page, description);
    await sendButton(page).click();

    await expect(page.getByText(description)).toBeVisible();
    expect(await page.evaluate(() => (window as unknown as { __xss?: number }).__xss)).toBeUndefined();
  });

  test('TC-LAP-003 pelapor login: laporan masuk ke Laporan saya', async ({ page, reporter }) => {
    const description = unique('tisu habis di lantai dua');
    await page.goto('/login');
    await page.getByLabel('Username').fill(reporter.username);
    await page.locator('#p').fill(reporter.password);
    await page.getByRole('button', { name: 'Masuk', exact: true }).click();
    await expect(page).toHaveURL('/');

    await page.goto('/report/C-2');
    await expect(page.getByText(`Melapor sebagai ${reporter.name}`)).toBeVisible();
    await photographAndDescribe(page, description);
    await sendButton(page).click();
    await expect(page.getByText('Tersimpan di “Laporan saya”.')).toBeVisible();

    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Laporan saya' })).toBeVisible();
    await expect(page.locator('#history').getByText('Gedung Dewi Sartika (Perkuliahan) - Lantai 2').first()).toBeVisible();
  });
});

test.describe('Kamera', () => {
  test('TC-CAM-007 tidak ada jalan pintas ke galeri foto @mobile', async ({ page }) => {
    await page.goto('/report/C-2');
    await expect(page.locator('input[type=file]')).toHaveCount(0);
    await page.getByRole('button', { name: 'Buka kamera' }).click();
    await expect(page.getByRole('dialog', { name: 'Kamera' })).toBeVisible();
    await expect(page.locator('input[type=file]')).toHaveCount(0);
  });

  test('TC-CAM-008 izin kamera ditolak menampilkan penjelasan', async ({ page }) => {
    await page.addInitScript(() => {
      navigator.mediaDevices.getUserMedia = () => Promise.reject(new DOMException('ditolak', 'NotAllowedError'));
    });
    await page.goto('/report/C-2');
    await page.getByRole('button', { name: 'Buka kamera' }).click();

    const camera = page.getByRole('dialog', { name: 'Kamera' });
    await expect(camera.getByText('Kamera tidak bisa dibuka')).toBeVisible();
    await expect(camera.getByRole('button', { name: 'Ambil foto' })).toBeDisabled();
  });

  test('TC-CAM-004 batal menutup kamera tanpa foto', async ({ page }) => {
    await page.goto('/report/C-2');
    await page.getByRole('button', { name: 'Buka kamera' }).click();
    const camera = page.getByRole('dialog', { name: 'Kamera' });
    await camera.getByRole('button', { name: 'Batal' }).click();
    await expect(camera).toBeHidden();
    await expect(page.getByRole('button', { name: 'Buka kamera' })).toBeVisible();
  });
});

test.describe('Halaman status', () => {
  test('TC-STS-002 analisis berjalan lalu hasilnya muncul sendiri', async ({ api, page }) => {
    const { id } = await api.report({ description: unique('[llm:slow] lantai kotor') });
    await page.goto(`/reports/${id}`);
    await expect(page.getByText('Ringkasan tiruan dari LLM.')).toBeVisible({ timeout: 15_000 });
  });

  test('TC-STS-012 analisis gagal: laporan tetap tercatat', async ({ api, page }) => {
    const { id, description } = await api.report({ description: unique('[llm:error] lantai kotor') });
    await api.settled(id);
    await page.goto(`/reports/${id}`);
    await expect(page.getByText(description)).toBeVisible();
    await expect(page.getByText('Analisis otomatis gagal; laporan tetap tercatat.')).toBeVisible();
  });

  test('TC-STS-010 ID tidak ada menampilkan pesan', async ({ page }) => {
    await page.goto('/reports/tidak-ada');
    await expect(page.getByText('Laporan kamu sudah masuk')).toBeHidden();
    await expect(page.locator('main p.text-red-700')).toBeVisible();
  });
});
