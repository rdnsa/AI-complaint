import { Hono } from 'hono';
import { z } from 'zod';
import { isValidDate } from '../adapters/clock';
import { requireSupervisor } from '../adapters/session';
import { HTTP_CACHE } from '../adapters/memo';
import { CLEANING_TASKS, type CleaningTask } from '../domain/types';
import type { AppEnv } from '../env';
import { readTimeFilter } from '../repositories/time-filter';
import * as cleaning from '../services/cleaning-service';
import * as accounts from '../services/user-service';

/**
 * HTTP layer for cleaning reports per area.
 *
 * Like the work log, staff do not sign in: they pick their name, and the id is
 * checked against the active staff. The proof is the photos and the position.
 */

const app = new Hono<AppEnv>();

const AREA_ID = /^[A-Za-z0-9-]{1,30}$/;

/** Public: every area, for the staff page's location picker and the QR sheet, plus the campus boundary. */
app.get('/areas', async (c) => {
  c.header('Cache-Control', HTTP_CACHE.locations);
  return c.json({ data: await cleaning.listAreas(c.env), campus: cleaning.campus(c.env) });
});

/** Public: one area — what a cleaning QR points at — plus the campus boundary for the GPS check. */
app.get('/areas/:id', async (c) => {
  const id = c.req.param('id');
  const area = AREA_ID.test(id) ? await cleaning.getArea(c.env, id.toUpperCase()) : null;
  if (!area) return c.json({ error: 'Kode area tidak dikenal' }, 404);
  return c.json({ ...area, campus: cleaning.campus(c.env) });
});

const SubmitSchema = z.object({
  staff_id: z.string({ required_error: 'Pilih namamu dulu' }).min(1, 'Pilih namamu dulu').max(64),
  area_id: z.string().regex(AREA_ID),
  tasks: z
    .array(z.object({ task: z.enum(CLEANING_TASKS), photo_key: z.string().min(1).max(200) }))
    .min(1, 'Centang minimal satu pekerjaan')
    .max(CLEANING_TASKS.length)
    .refine((list) => new Set(list.map((t) => t.task)).size === list.length, 'Pekerjaan tercantum dua kali')
    .refine((list) => new Set(list.map((t) => t.photo_key)).size === list.length, 'Satu foto dipakai untuk dua pekerjaan'),
  note: z.string().trim().max(500).optional().nullable(),
  position: z
    .object({
      latitude: z.number().min(-90).max(90),
      longitude: z.number().min(-180).max(180),
      accuracy: z.number().min(0).nullable().optional(),
    })
    .nullable()
    .optional(),
});

const TASK_NAME: Record<CleaningTask, string> = {
  sweep_mop: 'Menyapu & mengepel',
  glass: 'Mengelap kaca jendela',
  toilet: 'Membersihkan toilet',
  trash: 'Membuang sampah',
  gallon: 'Mengisi ulang galon',
  tidy: 'Merapikan ruangan',
  sweep: 'Menyapu',
  mop: 'Mengepel',
};

/** Public: a staff member files a cleaning report for an area. */
app.post('/reports', async (c) => {
  const parsed = SubmitSchema.safeParse(await c.req.json().catch(() => ({})));
  if (!parsed.success) {
    return c.json({ error: parsed.error.issues[0]?.message ?? 'Data tidak valid' }, 400);
  }

  const { staff_id, note, position, ...data } = parsed.data;
  const staff = await accounts.findActiveStaff(c.env, staff_id);
  if (!staff) return c.json({ error: 'Nama petugas tidak dikenal. Pilih ulang namamu.' }, 400);

  const result = await cleaning.submitReport(
    c.env,
    {
      ...data,
      area_id: data.area_id.toUpperCase(),
      note: note || null,
      position: position ? { ...position, accuracy: position.accuracy ?? null } : null,
    },
    staff,
  );

  switch (result.kind) {
    case 'unknown-area':
      return c.json({ error: 'Kode area tidak dikenal. Periksa QR yang kamu scan.' }, 404);
    case 'task-not-here':
      return c.json({ error: `${TASK_NAME[result.task]} tidak termasuk tugas di area ini.` }, 400);
    case 'photo-not-found':
      return c.json({ error: `Foto ${TASK_NAME[result.task].toLowerCase()} tidak ditemukan. Ambil foto ulang.`, task: result.task }, 400);
    case 'photo-too-old':
      return c.json(
        { error: `Foto ${TASK_NAME[result.task].toLowerCase()} sudah terlalu lama. Ambil foto baru.`, task: result.task },
        422,
      );
    case 'photo-reused':
      return c.json(
        { error: `Foto ${TASK_NAME[result.task].toLowerCase()} sudah pernah dipakai. Ambil foto baru.`, task: result.task },
        422,
      );
    default:
      return c.json(
        {
          id: result.id,
          area: result.area,
          duplicate: result.duplicate,
          location_status: result.location_status,
          distance_m: result.distance_m,
        },
        result.duplicate ? 200 : 201,
      );
  }
});

/** Public: the latest staff reports, for the public board next to the complaints. */
app.get('/reports/public', async (c) => {
  c.header('Cache-Control', HTTP_CACHE.board);
  return c.json({ data: await cleaning.publicReports(c.env, Math.min(Number(c.req.query('limit')) || 60, 200)) });
});

/** Supervisor: the reports, with the same time filter as the other lists. */
app.get('/reports', requireSupervisor, async (c) => {
  const q = c.req.query();
  return c.json({
    data: await cleaning.listReports(c.env, {
      staff_id: q.staff_id,
      area_id: q.area_id,
      alerts_only: q.alerts === '1',
      ...readTimeFilter(q),
      limit: Math.min(Number(q.limit) || 200, 500),
    }),
  });
});

/** Supervisor: one WIB day per staff member — assigned tasks done, and the gaps. */
app.get('/recap', requireSupervisor, async (c) => {
  const date = c.req.query('date');
  return c.json(await cleaning.dailyRecap(c.env, isValidDate(date) ? date : undefined));
});

export default app;
