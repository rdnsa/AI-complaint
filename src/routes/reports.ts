import { Hono } from 'hono';
import { z } from 'zod';
import { jalankanAnalisis } from '../lib/analisis';
import { wajibPetugas } from '../lib/auth';
import { rentangHariWIB } from '../lib/waktu';
import { PRIORITAS, STATUS, toDTO, type AppEnv, type ReportRow } from '../types';

const KOLOM = `r.*, t.nama AS toilet_nama, t.gedung_kode, t.gedung_nama, t.lantai, t.jenis`;

const BuatLaporanSchema = z.object({
  toilet_id: z.string().min(1).max(50),
  teks: z.string().trim().min(5, 'Keluhan terlalu pendek').max(1000),
  foto_key: z.string().max(200).nullish(),
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

  const id = crypto.randomUUID();
  await c.env.DB.prepare(
    `INSERT INTO reports (id, toilet_id, teks, foto_key) VALUES (?, ?, ?, ?)`,
  )
    .bind(id, toilet_id, teks, foto_key ?? null)
    .run();

  // Analisis LLM berjalan setelah respons terkirim: mahasiswa dapat konfirmasi instan.
  c.executionCtx.waitUntil(jalankanAnalisis(c.env, id));

  return c.json({ id, toilet: toilet.nama, duplikat: false }, 201);
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

const UbahStatusSchema = z.object({ status: z.enum(STATUS) });

/** Petugas: menandai laporan sedang dikerjakan / selesai. */
app.patch('/:id', wajibPetugas, async (c) => {
  const parsed = UbahStatusSchema.safeParse(await c.req.json().catch(() => ({})));
  if (!parsed.success) return c.json({ error: 'Status tidak valid' }, 400);

  const { status } = parsed.data;
  const hasil = await c.env.DB.prepare(
    `UPDATE reports
        SET status = ?,
            petugas = ?,
            selesai_at = CASE WHEN ? = 'selesai' THEN datetime('now') ELSE NULL END,
            updated_at = datetime('now')
      WHERE id = ?`,
  )
    .bind(status, c.get('petugas'), status, c.req.param('id'))
    .run();

  if (!hasil.meta.changes) return c.json({ error: 'Laporan tidak ditemukan' }, 404);
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

export default app;
