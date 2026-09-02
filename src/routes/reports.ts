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
  // A photo is required: a complaint without one is hard for staff to verify,
  // and its presence makes the public board far more trustworthy.
  foto_key: z
    .string({ required_error: 'Foto keadaan wajib dilampirkan' })
    .min(1, 'Foto keadaan wajib dilampirkan')
    .max(200),
});

const app = new Hono<AppEnv>();

/** Public: a student files a complaint after scanning the QR code. */
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

  // Light anti-spam: an identical complaint for the same toilet within 2 minutes
  // is almost certainly a double-tapped send button, not two different people.
  const kembar = await c.env.DB.prepare(
    `SELECT id FROM reports
      WHERE toilet_id = ? AND teks = ? AND created_at > datetime('now', '-2 minutes')
      LIMIT 1`,
  )
    .bind(toilet_id, teks)
    .first<{ id: string }>();
  if (kembar) return c.json({ id: kembar.id, duplikat: true }, 200);

  // Reports may stay anonymous; when the reporter is signed in, the report
  // attaches to their account and counts towards the leaderboard.
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

  // The LLM runs after the response is sent, so the student is confirmed instantly.
  c.executionCtx.waitUntil(jalankanAnalisis(c.env, id));

  return c.json({ id, toilet: toilet.nama, duplikat: false }, 201);
});

/**
 * Public: every report and how far it has been handled, open to anyone.
 *
 * Raw text, photos, and staff names are deliberately left out. What is shown is
 * the analysis summary — already neutral and free of crude language — so this
 * board cannot become an outlet for unfiltered complaint text, or for a face
 * caught in the background of a photo.
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
      // The proof photo is public on purpose: it is what lets anyone check the
      // claim that a report was handled. The reporter's own photo stays hidden,
      // since it may contain other people.
      foto_selesai_url: foto_selesai_key ? `/api/uploads/${foto_selesai_key}` : null,
    })),
    jumlah: jumlah.results[0] ?? { total: 0, selesai: 0 },
  });
});

/**
 * Public: the status of several reports at once.
 *
 * Backs the "My reports" list on the landing page. Report ids are random UUIDs
 * held only by their reporter, so this endpoint exposes nothing that the
 * confirmation page did not already show.
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

/** Public: a student checks their own report through the confirmation link. */
app.get('/:id', async (c) => {
  const row = await c.env.DB.prepare(
    `SELECT ${KOLOM} FROM reports r JOIN toilet_info t ON t.id = r.toilet_id WHERE r.id = ?`,
  )
    .bind(c.req.param('id'))
    .first<ReportRow>();
  if (!row) return c.json({ error: 'Laporan tidak ditemukan' }, 404);
  return c.json(toDTO(row));
});

/** Staff: the dashboard list, with filters. */
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

/** Staff: mark a report as being worked on, or as resolved. */
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

  // Resolving demands evidence: without a photo, 'selesai' is only a claim.
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

/** Staff: retry the analysis of a report the LLM failed on. */
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
 * Staff: delete a report permanently.
 *
 * Needed since the report list became public — spam and unacceptable content
 * must be removable. The photos go with it so that no orphaned files keep
 * consuming storage.
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

  // The full copy is stored first. This is what lets management inspect a
  // report that disappeared, along with who removed it.
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
  // Photos are deleted too, so nothing is orphaned in R2.
  for (const key of [row.foto_key, row.foto_selesai_key]) {
    if (key) await c.env.BUCKET.delete(key).catch(() => {});
  }

  return c.json({ ok: true });
});

export default app;
