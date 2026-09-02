import { Hono } from 'hono';
import { sesiSaatIni } from '../lib/auth';
import type { AppEnv } from '../types';

const app = new Hono<AppEnv>();

/**
 * Reporter leaderboard.
 *
 * The ranking is by report count, but the number of reports that were actually
 * resolved is shown alongside it, so what earns recognition is not volume alone
 * but reports that led to a real fix.
 */
app.get('/', async (c) => {
  const rows = await c.env.DB.prepare(
    `SELECT u.id, u.nama, COUNT(*) AS laporan,
            SUM(r.status = 'selesai') AS selesai
       FROM reports r JOIN pengguna u ON u.id = r.pelapor_id
      WHERE u.peran = 'pelapor'
      GROUP BY u.id
      ORDER BY laporan DESC, selesai DESC, u.nama
      LIMIT 20`,
  ).all<{ id: string; nama: string; laporan: number; selesai: number }>();

  // A signed-in reporter is told their own position, including when they sit
  // outside the top twenty.
  const sesi = await sesiSaatIni(c);
  let saya: { peringkat: number; laporan: number } | null = null;

  if (sesi?.peran === 'pelapor') {
    const baris = await c.env.DB.prepare(
      `SELECT COUNT(*) AS laporan FROM reports WHERE pelapor_id = ?`,
    )
      .bind(sesi.id)
      .first<{ laporan: number }>();

    if (baris?.laporan) {
      const atas = await c.env.DB.prepare(
        `SELECT COUNT(*) AS n FROM (
           SELECT pelapor_id FROM reports WHERE pelapor_id IS NOT NULL
            GROUP BY pelapor_id HAVING COUNT(*) > ?
         )`,
      )
        .bind(baris.laporan)
        .first<{ n: number }>();
      saya = { peringkat: (atas?.n ?? 0) + 1, laporan: baris.laporan };
    } else {
      saya = { peringkat: 0, laporan: 0 };
    }
  }

  return c.json({ data: rows.results, saya });
});

export default app;
