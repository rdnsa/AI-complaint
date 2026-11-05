import { ADMIN, expect, ON_CAMPUS, takePhoto, test, unique } from '../fixtures';

/**
 * The whole product in one story: a complaint from a phone, closed with a proof
 * photo on another phone, visible to the public, and traceable by the supervisor.
 * Tagged @smoke: this is the one to run when there is time for only one.
 */
test.describe('Perjalanan penuh @smoke', () => {
  test.use({ geolocation: ON_CAMPUS, permissions: ['geolocation'] });

  test('dari keluhan sampai jejak di dashboard @mobile', async ({ browser, baseURL, newStaff }) => {
    const description = unique('selokan meluap di lorong lantai dua');
    const staff = await newStaff();
    const phone = { baseURL, locale: 'id-ID', permissions: ['geolocation'], geolocation: ON_CAMPUS };

    // 1. The reporter files the complaint by scanning the QR code at the location.
    const reporterContext = await browser.newContext(phone);
    const reporter = await reporterContext.newPage();
    await reporter.goto('/report/C-2');
    await reporter.getByLabel('Apa yang bermasalah?').fill(description);
    await reporter.getByRole('button', { name: 'Buka kamera' }).click();
    await takePhoto(reporter);
    await reporter.getByRole('button', { name: 'Kirim laporan' }).click();
    await expect(reporter.getByText('Ringkasan tiruan dari LLM.')).toBeVisible();
    await expect(reporter.getByText('Prioritas tinggi')).toBeVisible();

    // 2. A cleaner claims it and closes it with a proof photo.
    const staffContext = await browser.newContext(phone);
    const cleaner = await staffContext.newPage();
    await cleaner.goto('/staff/C-2');
    const card = cleaner.locator('article').filter({ hasText: description });
    await card.getByRole('button', { name: 'Saya kerjakan sekarang' }).click();
    await card.getByRole('combobox').click();
    await cleaner.getByRole('option', { name: staff.name, exact: true }).click();
    await card.getByRole('button', { name: 'Ya, saya yang kerjakan' }).click();
    await expect(card.getByText('Kamu yang mengerjakan ini')).toBeVisible();

    await card.getByRole('button', { name: /Sudah selesai/ }).click();
    await card.getByRole('button', { name: 'Lanjut foto bukti' }).click();
    await takePhoto(cleaner);
    await expect(cleaner.getByText('Laporan selesai. Terima kasih!')).toBeVisible();

    // 3. The reporter sees it finished on the page they kept open.
    await reporter.reload();
    await expect(reporter.getByText('Selesai ditangani')).toBeVisible();

    // 4. The supervisor can trace all of it.
    const supervisorContext = await browser.newContext({ baseURL, locale: 'id-ID' });
    const login = await supervisorContext.request.post('/api/auth/login', { data: ADMIN });
    expect(login.ok()).toBe(true);
    const supervisor = await supervisorContext.newPage();
    await supervisor.goto('/supervisor');
    await supervisor.getByRole('button', { name: /^Laporan\s*\d*$/ }).click();
    await supervisor.getByRole('button', { name: 'Keluhan', exact: true }).click();
    const row = supervisor.locator('article').filter({ hasText: description });
    await expect(row.getByText(`Ditangani: ${staff.name}`)).toBeVisible();
    await expect(row.getByText('Bukti penyelesaian')).toBeVisible();
    await expect(row.getByText(/Diverifikasi AI/)).toHaveCount(0);

    await supervisor.getByRole('button', { name: 'Log aktivitas' }).click();
    await expect(supervisor.getByText(/Status in_progress → resolved/).first()).toBeVisible();

    await Promise.all([reporterContext.close(), staffContext.close(), supervisorContext.close()]);
  });
});
