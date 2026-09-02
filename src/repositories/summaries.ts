import { rentangHariWIB } from '../adapters/clock';
import type { Env } from '../env';

export interface BarisRingkasan {
  tanggal: string;
  total_laporan: number;
  ringkasan: string;
  sorotan: string | null;
}

export async function cari(env: Env, tanggal: string): Promise<BarisRingkasan | null> {
  return env.DB.prepare(`SELECT * FROM daily_summaries WHERE tanggal = ?`)
    .bind(tanggal)
    .first<BarisRingkasan>();
}

export async function simpan(
  env: Env,
  data: { tanggal: string; total: number; ringkasan: string; sorotan: string[] },
): Promise<void> {
  await env.DB.prepare(
    `INSERT INTO daily_summaries (tanggal, total_laporan, ringkasan, sorotan)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(tanggal) DO UPDATE SET
       total_laporan = excluded.total_laporan,
       ringkasan     = excluded.ringkasan,
       sorotan       = excluded.sorotan,
       created_at    = datetime('now')`,
  )
    .bind(data.tanggal, data.total, data.ringkasan, JSON.stringify(data.sorotan))
    .run();
}

/** The counters behind the dashboard summary cards. */
export async function angkaHarian(env: Env, tanggal: string) {
  const { mulai, selesai } = rentangHariWIB(tanggal);

  const [hariIni, belumSelesai, perLokasi] = await env.DB.batch<Record<string, unknown>>([
    env.DB.prepare(
      `SELECT COUNT(*) AS total,
              SUM(prioritas = 'tinggi') AS tinggi,
              SUM(prioritas = 'sedang') AS sedang,
              SUM(prioritas = 'rendah') AS rendah,
              SUM(ai_status = 'gagal')  AS ai_gagal
         FROM reports WHERE created_at >= ? AND created_at < ?`,
    ).bind(mulai, selesai),
    env.DB.prepare(`SELECT COUNT(*) AS n FROM reports WHERE status <> 'selesai'`),
    env.DB.prepare(
      `SELECT t.nama AS lokasi, COUNT(*) AS jumlah
         FROM reports r JOIN toilet_info t ON t.id = r.toilet_id
        WHERE r.created_at >= ? AND r.created_at < ?
        GROUP BY r.toilet_id ORDER BY jumlah DESC LIMIT 5`,
    ).bind(mulai, selesai),
  ]);

  return {
    hari_ini: hariIni.results[0] ?? {},
    belum_selesai: (belumSelesai.results[0] as { n: number } | undefined)?.n ?? 0,
    lokasi_teratas: perLokasi.results,
  };
}

/** Everything the charts need, computed in one batch. */
export async function angkaGrafik(env: Env, hari: number) {
  const [harian, kategori, prioritas, gedung, penyelesaian] = await env.DB.batch<
    Record<string, unknown>
  >([
    env.DB.prepare(
      // '+7 hours' groups by WIB day rather than UTC.
      `SELECT date(created_at, '+7 hours') AS tanggal,
              COUNT(*) AS total,
              SUM(status = 'selesai') AS selesai
         FROM reports
        WHERE created_at >= datetime('now', ?)
        GROUP BY tanggal ORDER BY tanggal`,
    ).bind(`-${hari} days`),
    env.DB.prepare(
      `SELECT je.value AS kategori, COUNT(*) AS jumlah
         FROM reports r, json_each(r.kategori) je
        WHERE r.kategori IS NOT NULL
        GROUP BY je.value ORDER BY jumlah DESC`,
    ),
    env.DB.prepare(
      `SELECT prioritas, COUNT(*) AS jumlah FROM reports
        WHERE prioritas IS NOT NULL GROUP BY prioritas`,
    ),
    env.DB.prepare(
      `SELECT t.gedung_kode, t.gedung_nama, COUNT(*) AS jumlah
         FROM reports r JOIN toilet_info t ON t.id = r.toilet_id
        GROUP BY t.gedung_kode ORDER BY jumlah DESC LIMIT 10`,
    ),
    env.DB.prepare(
      `SELECT COUNT(*) AS jumlah,
              AVG((julianday(selesai_at) - julianday(created_at)) * 1440) AS menit
         FROM reports WHERE selesai_at IS NOT NULL`,
    ),
  ]);

  return {
    harian: harian.results as Array<{ tanggal: string; total: number; selesai: number }>,
    kategori: kategori.results,
    prioritas: prioritas.results,
    gedung: gedung.results,
    penyelesaian: penyelesaian.results[0] ?? { jumlah: 0, menit: null },
  };
}

/** Reporter leaderboard, ranked by report count. */
export async function peringkatPelapor(env: Env) {
  const rows = await env.DB.prepare(
    `SELECT u.id, u.nama, COUNT(*) AS laporan,
            SUM(r.status = 'selesai') AS selesai
       FROM reports r JOIN pengguna u ON u.id = r.pelapor_id
      WHERE u.peran = 'pelapor'
      GROUP BY u.id
      ORDER BY laporan DESC, selesai DESC, u.nama
      LIMIT 20`,
  ).all<{ id: string; nama: string; laporan: number; selesai: number }>();
  return rows.results;
}

export async function posisiPelapor(
  env: Env,
  pelaporId: string,
): Promise<{ peringkat: number; laporan: number }> {
  const milik = await env.DB.prepare(`SELECT COUNT(*) AS laporan FROM reports WHERE pelapor_id = ?`)
    .bind(pelaporId)
    .first<{ laporan: number }>();

  if (!milik?.laporan) return { peringkat: 0, laporan: 0 };

  const atas = await env.DB.prepare(
    `SELECT COUNT(*) AS n FROM (
       SELECT pelapor_id FROM reports WHERE pelapor_id IS NOT NULL
        GROUP BY pelapor_id HAVING COUNT(*) > ?
     )`,
  )
    .bind(milik.laporan)
    .first<{ n: number }>();

  return { peringkat: (atas?.n ?? 0) + 1, laporan: milik.laporan };
}
