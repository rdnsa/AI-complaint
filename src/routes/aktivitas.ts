import { Hono } from 'hono';
import { wajibPetugas } from '../lib/auth';
import type { AppEnv } from '../types';

const app = new Hono<AppEnv>();

const AKSI = ['lapor', 'analisis', 'analisis_gagal', 'status', 'hapus', 'masuk', 'ringkasan', 'pengguna'];

/**
 * Catatan aktivitas untuk manajemen.
 *
 * Baris di sini tidak pernah diubah atau dihapus lewat aplikasi — termasuk oleh
 * petugas yang menghapus laporan — sehingga jejaknya tetap utuh.
 */
app.get('/', wajibPetugas, async (c) => {
  const { aksi, report_id } = c.req.query();
  const limit = Math.min(Number(c.req.query('limit') ?? 100) || 100, 300);

  const where: string[] = [];
  const params: unknown[] = [];
  if (aksi && AKSI.includes(aksi)) {
    where.push('aksi = ?');
    params.push(aksi);
  }
  if (report_id) {
    where.push('report_id = ?');
    params.push(report_id);
  }

  const rows = await c.env.DB.prepare(
    `SELECT id, waktu, aksi, report_id, pelaku, ringkas, rincian
       FROM aktivitas
       ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
      ORDER BY waktu DESC, id DESC
      LIMIT ?`,
  )
    .bind(...params, limit)
    .all<{ rincian: string | null }>();

  return c.json({
    data: rows.results.map((r) => ({ ...r, rincian: r.rincian ? JSON.parse(r.rincian) : null })),
  });
});

export default app;
