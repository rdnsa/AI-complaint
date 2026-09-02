import { Hono } from 'hono';
import { sesiSaatIni } from '../lib/auth';
import type { AppEnv } from '../types';

const app = new Hono<AppEnv>();

/**
 * Papan peringkat pelapor.
 *
 * Peringkat dihitung dari jumlah laporan, tetapi laporan yang sudah selesai
 * ditangani ikut ditampilkan supaya yang dihargai bukan sekadar banyaknya
 * kiriman, melainkan laporan yang benar-benar berbuah perbaikan.
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

  // Pengguna yang sedang masuk diberi tahu posisinya sendiri, termasuk bila
  // ia berada di luar dua puluh besar.
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
