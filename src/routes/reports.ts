import { Hono } from 'hono';
import { z } from 'zod';
import { catat, PELAPOR } from '../lib/aktivitas';
import { sesiSaatIni } from '../lib/auth';
import { jalankanAnalisis } from '../lib/analisis';
import { wajibPetugas } from '../lib/auth';
import { rentangHariWIB } from '../lib/waktu';
import { PRIORITAS, STATUS, toDTO, type AppEnv, type ReportRow } from '../types';

const KOLOM = `r.*, t.nama AS toilet_nama, t.gedung_kode, t.gedung_nama, t.lantai, t.jenis`;

const BuatLaporanSchema = z.object({
  toilet_id: z.string().min(1).max(50),
  teks: z.string().trim().min(5, 'Keluhan terlalu pendek').max(1000),
  // Foto wajib: keluhan tanpa gambar sulit diverifikasi petugas, dan
  // keberadaannya membuat papan laporan terbuka jauh lebih dapat dipercaya.
  foto_key: z
    .string({ required_error: 'Foto keadaan wajib dilampirkan' })
    .min(1, 'Foto keadaan wajib dilampirkan')
    .max(200),
});

const app = new Hono<AppEnv>();

/** Publik: mahasiswa mengirim keluhan setelah scan QR. */
app.post('/', async (c) => {
  const parsed = BuatLaporanSchema.safeParse(await c.req.json().catch(() => ({})));
  if (!parsed.success) {
    return c.json({ error: parsed.error.issues[0]?.message ?? 'Data tidak valid' }, 400);
  }
  const { toilet_id, teks, foto_key } = parsed.data;

  const toilet = await c.env.DB.prepare(`SELECT nama FROM toilet_info WHERE id = ? AND aktif = 1`)
    .bind(toilet_id)
    .first<{ nama: string }>();
  if (!toilet) return c.json({ error: 'Kode WC tidak dikenal. Periksa QR yang kamu scan.' }, 404);

  // Anti-spam ringan: keluhan identik untuk WC yang sama dalam 2 menit terakhir
  // hampir pasti tombol kirim yang tertekan dua kali, bukan dua orang berbeda.
  const kembar = await c.env.DB.prepare(
    `SELECT id FROM reports
      WHERE toilet_id = ? AND teks = ? AND created_at > datetime('now', '-2 minutes')
      LIMIT 1`,
  )
    .bind(toilet_id, teks)
    .first<{ id: string }>();
  if (kembar) return c.json({ id: kembar.id, duplikat: true }, 200);

  // Laporan tetap boleh anonim; bila pelapornya sedang masuk, laporan itu
  // menempel ke akunnya dan ikut dihitung di papan peringkat.
  const sesi = await sesiSaatIni(c);
  const pelapor_id = sesi?.peran === 'pelapor' ? sesi.id : null;

  const id = crypto.randomUUID();
  await c.env.DB.prepare(
    `INSERT INTO reports (id, toilet_id, teks, foto_key, pelapor_id) VALUES (?, ?, ?, ?, ?)`,
  )
    .bind(id, toilet_id, teks, foto_key, pelapor_id)
    .run();

  await catat(c.env, {
    aksi: 'lapor',
    report_id: id,
    pelaku: sesi?.peran === 'pelapor' ? sesi.nama : PELAPOR,
    ringkas: `Laporan baru di ${toilet.nama}`,
    rincian: { toilet_id, teks },
  });

  // Analisis LLM berjalan setelah respons terkirim: mahasiswa dapat konfirmasi instan.
  c.executionCtx.waitUntil(jalankanAnalisis(c.env, id));

  return c.json({ id, toilet: toilet.nama, duplikat: false }, 201);
});

/**
 * Publik: seluruh laporan beserta status penanganannya, terbuka untuk siapa saja.
 *
 * Sengaja tidak menyertakan teks asli, foto, dan nama petugas. Yang ditampilkan
 * adalah ringkasan hasil analisis — kalimatnya sudah netral dan bebas kata kasar —
 * sehingga papan terbuka ini tidak menjadi jalan keluar bagi isi laporan mentah
 * atau wajah orang yang tidak sengaja terfoto.
 */
app.get('/publik', async (c) => {
  const { status, prioritas } = c.req.query();
  const limit = Math.min(Number(c.req.query('limit') ?? 100) || 100, 200);

  const where: string[] = [];
  const params: unknown[] = [];
  if (status && (STATUS as readonly string[]).includes(status)) {
    where.push('r.status = ?');
    params.push(status);
  }
  if (prioritas && (PRIORITAS as readonly string[]).includes(prioritas)) {
    where.push('r.prioritas = ?');
    params.push(prioritas);
  }

  const [daftar, jumlah] = await c.env.DB.batch<Record<string, unknown>>([
    c.env.DB.prepare(
      `SELECT r.id, r.status, r.prioritas, r.kategori, r.ringkasan, r.ai_status,
              r.created_at, r.selesai_at, r.foto_selesai_key,
              t.nama AS toilet_nama, t.gedung_kode, t.lantai
         FROM reports r JOIN toilet_info t ON t.id = r.toilet_id
         ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
        ORDER BY
          CASE r.status WHEN 'baru' THEN 0 WHEN 'diproses' THEN 1 ELSE 2 END,
          r.created_at DESC
        LIMIT ?`,
    ).bind(...params, limit),
    c.env.DB.prepare(
      `SELECT COUNT(*) AS total, SUM(status = 'selesai') AS selesai FROM reports`,
    ),
  ]);

  return c.json({
    data: daftar.results.map(({ foto_selesai_key, ...row }) => ({
      ...row,
      kategori: row.kategori ? JSON.parse(row.kategori as string) : [],
      // Foto bukti penyelesaian ikut terbuka: justru inilah yang membuat klaim
      // "sudah ditangani" bisa diperiksa siapa saja. Foto dari pelapor tetap
      // tidak ditampilkan karena berpeluang memuat orang lain.
      foto_selesai_url: foto_selesai_key ? `/api/uploads/${foto_selesai_key}` : null,
    })),
    jumlah: jumlah.results[0] ?? { total: 0, selesai: 0 },
  });
});

/**
 * Publik: status ringkas beberapa laporan sekaligus.
 *
 * Dipakai daftar "Laporan saya" di beranda. Id laporan berupa UUID acak yang
 * hanya dipegang pelapornya, jadi endpoint ini tidak membocorkan apa pun yang
 * tidak sudah bisa dilihat lewat halaman konfirmasi.
 */
app.get('/ringkas', async (c) => {
  const ids = (c.req.query('ids') ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 30);
  if (!ids.length) return c.json({ data: [] });

  const rows = await c.env.DB.prepare(
    `SELECT r.id, r.status, r.prioritas, r.ai_status, r.ringkasan, r.teks, r.created_at,
            t.nama AS toilet_nama
       FROM reports r JOIN toilet_info t ON t.id = r.toilet_id
      WHERE r.id IN (${ids.map(() => '?').join(',')})
      ORDER BY r.created_at DESC`,
  )
    .bind(...ids)
    .all();

  return c.json({ data: rows.results });
});

/** Publik: mahasiswa melihat status laporannya sendiri lewat link konfirmasi. */
app.get('/:id', async (c) => {
  const row = await c.env.DB.prepare(
    `SELECT ${KOLOM} FROM reports r JOIN toilet_info t ON t.id = r.toilet_id WHERE r.id = ?`,
  )
    .bind(c.req.param('id'))
    .first<ReportRow>();
  if (!row) return c.json({ error: 'Laporan tidak ditemukan' }, 404);
  return c.json(toDTO(row));
});

/** Petugas: daftar laporan untuk dashboard, dengan filter. */
app.get('/', wajibPetugas, async (c) => {
  const { status, prioritas, toilet_id, gedung, tanggal } = c.req.query();
  const limit = Math.min(Number(c.req.query('limit') ?? 100) || 100, 200);

  const where: string[] = [];
  const params: unknown[] = [];

  if (status && (STATUS as readonly string[]).includes(status)) {
    where.push('r.status = ?');
    params.push(status);
  }
  if (prioritas && (PRIORITAS as readonly string[]).includes(prioritas)) {
    where.push('r.prioritas = ?');
    params.push(prioritas);
  }
  if (toilet_id) {
    where.push('r.toilet_id = ?');
    params.push(toilet_id);
  }
  if (gedung) {
    where.push('t.gedung_kode = ?');
    params.push(gedung.toUpperCase());
  }
  if (tanggal) {
    const { mulai, selesai } = rentangHariWIB(tanggal);
    where.push('r.created_at >= ? AND r.created_at < ?');
    params.push(mulai, selesai);
  }

  const rows = await c.env.DB.prepare(
    `SELECT ${KOLOM}
       FROM reports r JOIN toilet_info t ON t.id = r.toilet_id
       ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
      ORDER BY
        CASE r.status WHEN 'baru' THEN 0 WHEN 'diproses' THEN 1 ELSE 2 END,
        CASE r.prioritas WHEN 'tinggi' THEN 0 WHEN 'sedang' THEN 1 WHEN 'rendah' THEN 2 ELSE 3 END,
        r.created_at DESC
      LIMIT ?`,
  )
    .bind(...params, limit)
    .all<ReportRow>();

  return c.json({ data: rows.results.map(toDTO) });
});

const UbahStatusSchema = z.object({
  status: z.enum(STATUS),
  foto_selesai_key: z.string().max(200).nullish(),
});

/** Petugas: menandai laporan sedang dikerjakan / selesai. */
app.patch('/:id', wajibPetugas, async (c) => {
  const parsed = UbahStatusSchema.safeParse(await c.req.json().catch(() => ({})));
  if (!parsed.success) return c.json({ error: 'Status tidak valid' }, 400);

  const id = c.req.param('id');
  const { status, foto_selesai_key } = parsed.data;

  const sebelum = await c.env.DB.prepare(
    `SELECT r.status, r.foto_selesai_key, t.nama FROM reports r
       JOIN toilet_info t ON t.id = r.toilet_id WHERE r.id = ?`,
  )
    .bind(id)
    .first<{ status: string; foto_selesai_key: string | null; nama: string }>();
  if (!sebelum) return c.json({ error: 'Laporan tidak ditemukan' }, 404);

  // Penyelesaian menuntut bukti: tanpa foto, status 'selesai' hanya klaim.
  const bukti = foto_selesai_key ?? sebelum.foto_selesai_key;
  if (status === 'selesai' && !bukti) {
    return c.json({ error: 'Foto bukti penyelesaian wajib diunggah lebih dulu.' }, 400);
  }

  await c.env.DB.prepare(
    `UPDATE reports
        SET status = ?,
            petugas = ?,
            foto_selesai_key = ?,
            selesai_at = CASE WHEN ? = 'selesai' THEN datetime('now') ELSE NULL END,
            updated_at = datetime('now')
      WHERE id = ?`,
  )
    .bind(status, c.get('sesi').nama, bukti ?? null, status, id)
    .run();

  await catat(c.env, {
    aksi: 'status',
    report_id: id,
    pelaku: c.get('sesi').nama,
    ringkas: `Status ${sebelum.status} → ${status} di ${sebelum.nama}`,
    rincian: { dari: sebelum.status, ke: status, foto_bukti: bukti ?? null },
  });

  return c.json({ ok: true, status });
});

/** Petugas: mengulang analisis untuk laporan yang gagal diproses LLM. */
app.post('/:id/analisa-ulang', wajibPetugas, async (c) => {
  const id = c.req.param('id');
  const ada = await c.env.DB.prepare(`SELECT id FROM reports WHERE id = ?`).bind(id).first();
  if (!ada) return c.json({ error: 'Laporan tidak ditemukan' }, 404);

  await c.env.DB.prepare(
    `UPDATE reports SET ai_status = 'pending', ai_error = NULL WHERE id = ?`,
  )
    .bind(id)
    .run();
  c.executionCtx.waitUntil(jalankanAnalisis(c.env, id));
  return c.json({ ok: true });
});

/**
 * Petugas: menghapus laporan permanen.
 *
 * Diperlukan sejak daftar laporan dibuka untuk umum — spam dan isi yang tidak
 * pantas harus bisa disingkirkan. Fotonya ikut dihapus dari R2 supaya tidak ada
 * berkas yatim yang terus memakan penyimpanan.
 */
app.delete('/:id', wajibPetugas, async (c) => {
  const id = c.req.param('id');
  const row = await c.env.DB.prepare(
    `SELECT r.*, t.nama AS toilet_nama FROM reports r
       JOIN toilet_info t ON t.id = r.toilet_id WHERE r.id = ?`,
  )
    .bind(id)
    .first<ReportRow & { toilet_nama: string }>();
  if (!row) return c.json({ error: 'Laporan tidak ditemukan' }, 404);

  // Salinan utuh disimpan lebih dulu. Inilah yang memungkinkan manajemen
  // memeriksa laporan yang hilang beserta siapa yang menghapusnya.
  await catat(c.env, {
    aksi: 'hapus',
    report_id: id,
    pelaku: c.get('sesi').nama,
    ringkas: `Menghapus laporan di ${row.toilet_nama}`,
    rincian: {
      toilet_nama: row.toilet_nama,
      teks: row.teks,
      status: row.status,
      prioritas: row.prioritas,
      kategori: row.kategori,
      ringkasan: row.ringkasan,
      dibuat: row.created_at,
      ada_foto: Boolean(row.foto_key),
    },
  });

  await c.env.DB.prepare(`DELETE FROM reports WHERE id = ?`).bind(id).run();
  // Foto ikut dihapus agar tidak meninggalkan berkas yatim di R2.
  for (const key of [row.foto_key, row.foto_selesai_key]) {
    if (key) await c.env.BUCKET.delete(key).catch(() => {});
  }

  return c.json({ ok: true });
});

export default app;
