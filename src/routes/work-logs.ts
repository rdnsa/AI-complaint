import { Hono } from 'hono';
import { z } from 'zod';
import { requireSupervisor } from '../adapters/session';
import type { AppEnv } from '../env';
import { readTimeFilter } from '../repositories/time-filter';
import * as workLogs from '../services/work-log-service';
import * as accounts from '../services/user-service';

/**
 * HTTP layer for staff work logs.
 *
 * Staff do not sign in: they pick their name from the dropdown and the chosen
 * `staff_id` is checked against the list of active staff. What keeps the
 * record honest is the photo, which the vision model must judge clean.
 */

const app = new Hono<AppEnv>();

const clampNumber = (value: string | undefined, fallback: number, max: number) =>
  Math.min(Number(value ?? fallback) || fallback, max);

const SubmitSchema = z.object({
  staff_id: z.string({ required_error: 'Pilih namamu dulu' }).min(1, 'Pilih namamu dulu').max(64),
  toilet_id: z.string().min(1).max(50),
  description: z.string().trim().min(5, 'Tulis sedikit lebih jelas apa yang dikerjakan').max(1000),
  photo_key: z
    .string({ required_error: 'Foto hasil pekerjaan wajib dilampirkan' })
    .min(1, 'Foto hasil pekerjaan wajib dilampirkan')
    .max(200),
});

/** Public: a staff member records that a toilet has been cleaned. */
app.post('/', async (c) => {
  const parsed = SubmitSchema.safeParse(await c.req.json().catch(() => ({})));
  if (!parsed.success) {
    return c.json({ error: parsed.error.issues[0]?.message ?? 'Data tidak valid' }, 400);
  }

  const { staff_id, ...data } = parsed.data;
  const staff = await accounts.findActiveStaff(c.env, staff_id);
  if (!staff) return c.json({ error: 'Nama petugas tidak dikenal. Pilih ulang namamu.' }, 400);

  const result = await workLogs.submitWorkLog(c.env, data, staff);

  switch (result.kind) {
    case 'unknown-location':
      return c.json({ error: 'Kode WC tidak dikenal. Periksa QR yang kamu scan.' }, 404);
    case 'photo-not-found':
      return c.json({ error: 'Foto tidak ditemukan. Ambil foto ulang.' }, 400);
    case 'proof-rejected':
      return c.json(
        {
          error:
            result.verdict === 'not_toilet'
              ? 'Foto tidak menunjukkan toilet. Ambil foto kondisi toilet yang sudah dibersihkan.'
              : 'Toilet pada foto masih terlihat kotor. Bersihkan lagi, lalu foto ulang.',
          verdict: result.verdict,
          reason: result.reason,
        },
        422,
      );
    case 'verification-failed':
      return c.json({ error: 'Pemeriksaan foto gagal. Coba lagi sebentar.' }, 502);
    default:
      return c.json(
        {
          id: result.id,
          toilet: result.toilet,
          duplicate: result.duplicate,
          verification: result.verification,
        },
        result.duplicate ? 200 : 201,
      );
  }
});

/**
 * Supervisor: the work log of every staff member, optionally one of them,
 * with the same time filter as the report list.
 */
app.get('/', requireSupervisor, async (c) => {
  const q = c.req.query();
  return c.json({
    data: await workLogs.listWorkLogs(c.env, {
      staff_id: q.staff_id,
      toilet_id: q.toilet_id,
      building: q.building,
      ...readTimeFilter(q),
      limit: clampNumber(q.limit, 100, 200),
    }),
  });
});

export default app;
