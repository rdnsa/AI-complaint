import { expect, knownIssue, test } from '../fixtures';

const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0x10]);
const upload = (mimeType: string, buffer = JPEG, name = 'foto.jpg') => ({
  multipart: { file: { name, mimeType, buffer } },
});

for (const [type, extension] of [['image/jpeg', 'jpg'], ['image/png', 'png'], ['image/webp', 'webp']]) {
  test(`TC-UPL-001 ${type} diterima`, async ({ request }) => {
    const res = await request.post('/api/uploads', upload(type));
    expect(res.status()).toBe(201);
    const { key, url } = await res.json();
    expect(key).toMatch(new RegExp(`^report/\\d{4}-\\d{2}-\\d{2}/[0-9a-f-]+\\.${extension}$`));
    expect(url).toBe(`/api/uploads/${key}`);
  });
}

test('TC-UPL-002 tepat 5 MB diterima, TC-UPL-010 lebih dari itu ditolak', async ({ request }) => {
  const limit = 5 * 1024 * 1024;
  expect((await request.post('/api/uploads', upload('image/jpeg', Buffer.alloc(limit)))).status()).toBe(201);
  const res = await request.post('/api/uploads', upload('image/jpeg', Buffer.alloc(limit + 1)));
  expect(res.status()).toBe(413);
});

test('TC-UPL-003 folder mengikuti jenis, jenis lain jadi report', async ({ request }) => {
  for (const [kind, folder] of [['proof', 'proof'], ['cleaning', 'cleaning'], ['report', 'report'], ['work', 'report'], ['../rahasia', 'report']]) {
    const res = await request.post(`/api/uploads?kind=${encodeURIComponent(kind)}`, upload('image/jpeg'));
    expect((await res.json()).key.startsWith(`${folder}/`), kind).toBe(true);
  }
});

test('TC-UPL-005 foto disajikan dengan cache panjang dan 304 saat sama', async ({ request }) => {
  const { url } = await (await request.post('/api/uploads', upload('image/jpeg'))).json();
  const res = await request.get(url);
  expect(res.status()).toBe(200);
  expect(res.headers()['content-type']).toBe('image/jpeg');
  expect(res.headers()['cache-control']).toBe('public, max-age=31536000, immutable');
  expect(await res.body()).toEqual(JPEG);

  const again = await request.get(url, { headers: { 'if-none-match': res.headers().etag } });
  expect(again.status()).toBe(304);
});

test('TC-UPL-008 tanpa berkas ditolak', async ({ request }) => {
  const res = await request.post('/api/uploads', { multipart: { bukan_file: 'teks' } });
  expect(res.status()).toBe(400);
  expect((await res.json()).error).toBe('File tidak ditemukan');
});

test('TC-UPL-009 format lain ditolak', async ({ request }) => {
  for (const type of ['application/pdf', 'image/svg+xml', 'image/gif', 'text/html']) {
    const res = await request.post('/api/uploads', upload(type));
    expect(res.status(), type).toBe(415);
  }
});

test('TC-UPL-011 isi berkas diperiksa, bukan hanya labelnya', async ({ request }) => {
  const res = await request.post('/api/uploads', upload('image/jpeg', Buffer.from('<?php echo "bukan foto"; ?>')));
  knownIssue('T-10', 'berkas teks berlabel image/jpeg diterima');
  expect(res.status()).toBe(415);
});

test('TC-UPL-012 dan TC-UPL-013 folder terlarang dan path traversal', async ({ request }) => {
  for (const path of ['rahasia/berkas.jpg', '..%2F..%2Fwrangler.jsonc', 'report/..%2F..%2F.dev.vars']) {
    expect((await request.get(`/api/uploads/${path}`)).status(), path).toBe(404);
  }
});

test('TC-UPL-014 foto yang tidak ada', async ({ request }) => {
  const res = await request.get('/api/uploads/report/2026-01-01/tidak-ada.jpg');
  expect(res.status()).toBe(404);
  expect((await res.json()).error).toBe('Berkas tidak ditemukan');
});
