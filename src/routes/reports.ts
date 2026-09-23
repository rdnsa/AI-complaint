import { Hono } from 'hono';
import { z } from 'zod';
import { sesiSaatIni, wajibSpv } from '../adapters/session';
import { STATUS } from '../domain/types';
import type { AppEnv } from '../env';
import * as laporan from '../services/report-service';
import * as akun from '../services/user-service';

/**
 * HTTP layer for reports: parse, validate, delegate, format.
 *
 * No SQL and no business rules here — those belong to the repository and
 * service layers, so this file stays readable as a list of endpoints.
 */

const app = new Hono<AppEnv>();

const angka = (nilai: string | undefined, bawaan: number, maks: number) =>
  Math.min(Number(nilai ?? bawaan) || bawaan, maks);

const KirimSchema = z.object({
  toilet_id: z.string().min(1).max(50),
  teks: z.string().trim().min(5, 'Keluhan terlalu pendek').max(1000),
  // A photo is required: a complaint without one is hard for staff to verify,
  // and its presence makes the public board far more trustworthy.
  foto_key: z
    .string({ required_error: 'Foto keadaan wajib dilampirkan' })
    .min(1, 'Foto keadaan wajib dilampirkan')
    .max(200),
});

/** Public: a student files a complaint after scanning the QR code. */
app.post('/', async (c) => {
  const parsed = KirimSchema.safeParse(await c.req.json().catch(() => ({})));
  if (!parsed.success) {
    return c.json({ error: parsed.error.issues[0]?.message ?? 'Data tidak valid' }, 400);
  }

  // Reports may stay anonymous; when the reporter is signed in, the report
  // attaches to their account and counts towards the leaderboard.
  const sesi = await sesiSaatIni(c);
  const pelapor = sesi?.peran === 'pelapor' ? { id: sesi.id, nama: sesi.nama } : null;

  const hasil = await laporan.kirimLaporan(c.env, parsed.data, pelapor);
  if (hasil.jenis === 'lokasi-tidak-dikenal') {
    return c.json({ error: 'Kode WC tidak dikenal. Periksa QR yang kamu scan.' }, 404);
  }

  // The LLM runs after the response is sent, so the student is confirmed instantly.
  if (!hasil.duplikat) c.executionCtx.waitUntil(laporan.jalankanAnalisis(c.env, hasil.id));

  return c.json(
    { id: hasil.id, toilet: hasil.toilet, duplikat: hasil.duplikat },
    hasil.duplikat ? 200 : 201,
  );
});

/** Public: every report and how far it has been handled, open to anyone. */
app.get('/publik', async (c) => {
  const { status, prioritas } = c.req.query();
  return c.json(
    await laporan.papanPublik(c.env, {
      status,
      prioritas,
      limit: angka(c.req.query('limit'), 100, 200),
    }),
  );
});

/**
 * Public: the reports staff still have to handle, optionally for one floor
 * (`?gedung=A&lantai=1`). Staff do not sign in, so this cannot require a session.
 */
app.get('/terbuka', async (c) => {
  const { gedung, lantai } = c.req.query();
  const nomorLantai = lantai !== undefined && /^\d{1,2}$/.test(lantai) ? Number(lantai) : undefined;
  return c.json({
    data: await laporan.laporanTerbuka(c.env, {
      gedung: gedung && /^[A-Za-z]$/.test(gedung) ? gedung : undefined,
      lantai: nomorLantai,
      limit: angka(c.req.query('limit'), 100, 200),
    }),
  });
});

/** Reporter: the reports filed under their own account. */
app.get('/saya', async (c) => {
  const sesi = await sesiSaatIni(c);
  if (sesi?.peran !== 'pelapor') return c.json({ data: [] });
  return c.json({ data: await laporan.laporanMilikPelapor(c.env, sesi.id) });
});

/** Public: a student checks their own report through the confirmation link. */
app.get('/:id', async (c) => {
  const dto = await laporan.satuLaporan(c.env, c.req.param('id'));
  return dto ? c.json(dto) : c.json({ error: 'Laporan tidak ditemukan' }, 404);
});

/** Staff: the dashboard list, with filters. */
app.get('/', wajibSpv, async (c) => {
  const { status, prioritas, toilet_id, gedung, tanggal } = c.req.query();
  return c.json({
    data: await laporan.laporanDashboard(c.env, {
      status,
      prioritas,
      toilet_id,
      gedung,
      tanggal,
      limit: angka(c.req.query('limit'), 100, 200),
    }),
  });
});

const UbahStatusSchema = z.object({
  status: z.enum(STATUS),
  foto_selesai_key: z.string().max(200).nullish(),
  petugas_id: z.string().max(64).nullish(),
});

/**
 * Staff: mark a report as being worked on, or as resolved.
 *
 * Staff do not sign in; they send the `petugas_id` picked on the dropdown,
 * which must belong to an active staff member. A signed-in supervisor may act
 * under their own name instead. Closing needs a proof photo, and the photo is
 * judged by the vision model before the status changes — a photo of a dirty
 * toilet is refused.
 */
app.patch('/:id', async (c) => {
  const parsed = UbahStatusSchema.safeParse(await c.req.json().catch(() => ({})));
  if (!parsed.success) return c.json({ error: 'Status tidak valid' }, 400);

  const sesi = await sesiSaatIni(c);
  let pelaku: string;
  if (parsed.data.petugas_id) {
    const petugas = await akun.cariPetugasAktif(c.env, parsed.data.petugas_id);
    if (!petugas) return c.json({ error: 'Nama petugas tidak dikenal. Pilih ulang namamu.' }, 400);
    pelaku = petugas.nama;
  } else if (sesi?.peran === 'spv') {
    pelaku = sesi.nama;
  } else {
    return c.json({ error: 'Pilih namamu dulu' }, 400);
  }

  const hasil = await laporan.ubahStatus(
    c.env,
    c.req.param('id'),
    parsed.data.status,
    pelaku,
    parsed.data.foto_selesai_key ?? null,
  );

  switch (hasil.jenis) {
    case 'tidak-ditemukan':
      return c.json({ error: 'Laporan tidak ditemukan' }, 404);
    case 'foto-tidak-ditemukan':
      return c.json({ error: 'Foto bukti tidak ditemukan. Unggah ulang.' }, 400);
    case 'bukti-kurang':
      return c.json({ error: 'Foto bukti penyelesaian wajib diunggah lebih dulu.' }, 400);
    // 422: the request was well-formed, the photo simply did not pass.
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
      return c.json({ ok: true, status: hasil.status, verifikasi: hasil.verifikasi });
  }
});

/** Staff: retry the analysis of a report the LLM failed on. */
app.post('/:id/analisa-ulang', wajibSpv, async (c) => {
  const id = c.req.param('id');
  if (!(await laporan.mintaAnalisisUlang(c.env, id))) {
    return c.json({ error: 'Laporan tidak ditemukan' }, 404);
  }
  c.executionCtx.waitUntil(laporan.jalankanAnalisis(c.env, id));
  return c.json({ ok: true });
});

/** Staff: delete a report permanently, keeping a copy in the activity log. */
app.delete('/:id', wajibSpv, async (c) => {
  const terhapus = await laporan.hapusLaporan(c.env, c.req.param('id'), c.get('sesi').nama);
  return terhapus ? c.json({ ok: true }) : c.json({ error: 'Laporan tidak ditemukan' }, 404);
});

export default app;
