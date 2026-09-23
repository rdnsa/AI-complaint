import { Hono } from 'hono';
import { z } from 'zod';
import { wajibSpv } from '../adapters/session';
import type { AppEnv } from '../env';
import * as pekerjaan from '../services/pekerjaan-service';
import * as akun from '../services/user-service';

/**
 * HTTP layer for staff work reports.
 *
 * Staff do not sign in: they pick their name from the dropdown and the chosen
 * `petugas_id` is checked against the list of active staff. What keeps the
 * record honest is the photo, which the vision model must judge clean.
 */

const app = new Hono<AppEnv>();

const angka = (nilai: string | undefined, bawaan: number, maks: number) =>
  Math.min(Number(nilai ?? bawaan) || bawaan, maks);

const KirimSchema = z.object({
  petugas_id: z.string({ required_error: 'Pilih namamu dulu' }).min(1, 'Pilih namamu dulu').max(64),
  toilet_id: z.string().min(1).max(50),
  teks: z.string().trim().min(5, 'Tulis sedikit lebih jelas apa yang dikerjakan').max(1000),
  foto_key: z
    .string({ required_error: 'Foto hasil pekerjaan wajib dilampirkan' })
    .min(1, 'Foto hasil pekerjaan wajib dilampirkan')
    .max(200),
});

/** Public: a staff member records that a toilet has been cleaned. */
app.post('/', async (c) => {
  const parsed = KirimSchema.safeParse(await c.req.json().catch(() => ({})));
  if (!parsed.success) {
    return c.json({ error: parsed.error.issues[0]?.message ?? 'Data tidak valid' }, 400);
  }

  const { petugas_id, ...data } = parsed.data;
  const petugas = await akun.cariPetugasAktif(c.env, petugas_id);
  if (!petugas) return c.json({ error: 'Nama petugas tidak dikenal. Pilih ulang namamu.' }, 400);

  const hasil = await pekerjaan.kirimPekerjaan(c.env, data, petugas);

  switch (hasil.jenis) {
    case 'lokasi-tidak-dikenal':
      return c.json({ error: 'Kode WC tidak dikenal. Periksa QR yang kamu scan.' }, 404);
    case 'foto-tidak-ditemukan':
      return c.json({ error: 'Foto tidak ditemukan. Ambil foto ulang.' }, 400);
    case 'bukti-ditolak':
      return c.json(
        {
          error:
            hasil.hasil === 'bukan_toilet'
              ? 'Foto tidak menunjukkan toilet. Ambil foto kondisi toilet yang sudah dibersihkan.'
              : 'Toilet pada foto masih terlihat kotor. Bersihkan lagi, lalu foto ulang.',
          hasil: hasil.hasil,
          alasan: hasil.alasan,
        },
        422,
      );
    case 'verifikasi-gagal':
      return c.json({ error: 'Pemeriksaan foto gagal. Coba lagi sebentar.' }, 502);
    default:
      return c.json(
        { id: hasil.id, toilet: hasil.toilet, duplikat: hasil.duplikat, verifikasi: hasil.verifikasi },
        hasil.duplikat ? 200 : 201,
      );
  }
});

/** Supervisor: the work log of every staff member, optionally one of them. */
app.get('/', wajibSpv, async (c) => {
  const { petugas_id, toilet_id, gedung, tanggal } = c.req.query();
  return c.json({
    data: await pekerjaan.daftarPekerjaan(c.env, {
      petugas_id,
      toilet_id,
      gedung,
      tanggal,
      limit: angka(c.req.query('limit'), 100, 200),
    }),
  });
});

export default app;
