import { Hono } from 'hono';
import { z } from 'zod';
import { FOLDER } from '../adapters/storage';
import { currentSession, requireSupervisor } from '../adapters/session';
import { STATUSES } from '../domain/types';
import type { AppEnv } from '../env';
import { readTimeFilter } from '../repositories/time-filter';
import * as reports from '../services/report-service';
import * as accounts from '../services/user-service';

/**
 * HTTP layer for reports: parse, validate, delegate, format.
 *
 * No SQL and no business rules here — those belong to the repository and
 * service layers, so this file stays readable as a list of endpoints.
 */

const app = new Hono<AppEnv>();

const clampNumber = (value: string | undefined, fallback: number, max: number) =>
  Math.min(Number(value ?? fallback) || fallback, max);

const SubmitSchema = z.object({
  toilet_id: z.string().min(1).max(50),
  description: z.string().trim().min(5, 'Keluhan terlalu pendek').max(1000),
  // A photo is required: a complaint without one is hard for staff to verify,
  // and its presence makes the public board far more trustworthy.
  photo_key: z
    .string({ required_error: 'Foto keadaan wajib dilampirkan' })
    .min(1, 'Foto keadaan wajib dilampirkan')
    .max(200)
    // Only a photo uploaded as a condition photo counts: a staff proof photo or
    // an arbitrary string must not be passed off as the student's evidence.
    .refine((key) => key.startsWith(`${FOLDER.report}/`), 'Foto keadaan tidak valid. Ambil foto ulang.'),
});

/** Public: a student files a complaint after scanning the QR code. */
app.post('/', async (c) => {
  const parsed = SubmitSchema.safeParse(await c.req.json().catch(() => ({})));
  if (!parsed.success) {
    return c.json({ error: parsed.error.issues[0]?.message ?? 'Data tidak valid' }, 400);
  }

  // Reports may stay anonymous; when the reporter is signed in, the report
  // attaches to their account and counts towards the leaderboard.
  const session = await currentSession(c);
  const reporter = session?.role === 'reporter' ? { id: session.id, name: session.name } : null;

  const result = await reports.submitReport(c.env, parsed.data, reporter);
  if (result.kind === 'unknown-location') {
    return c.json({ error: 'Kode WC tidak dikenal. Periksa QR yang kamu scan.' }, 404);
  }

  // The LLM runs after the response is sent, so the student is confirmed instantly.
  if (!result.duplicate) c.executionCtx.waitUntil(reports.runAnalysis(c.env, result.id));

  return c.json(
    { id: result.id, toilet: result.toilet, duplicate: result.duplicate },
    result.duplicate ? 200 : 201,
  );
});

/** Public: every report and how far it has been handled, open to anyone. */
app.get('/public', async (c) => {
  const { status, priority } = c.req.query();
  return c.json(
    await reports.publicBoard(c.env, {
      status,
      priority,
      limit: clampNumber(c.req.query('limit'), 100, 200),
    }),
  );
});

/**
 * Public: the reports staff still have to handle, optionally for one floor
 * (`?building=A&floor=1`). Staff do not sign in, so this cannot require a session.
 */
app.get('/open', async (c) => {
  const { building, floor } = c.req.query();
  const floorNumber = floor !== undefined && /^\d{1,2}$/.test(floor) ? Number(floor) : undefined;
  return c.json({
    data: await reports.openReports(c.env, {
      building: building && /^[A-Za-z]$/.test(building) ? building : undefined,
      floor: floorNumber,
      limit: clampNumber(c.req.query('limit'), 100, 200),
    }),
  });
});

/** Reporter: the reports filed under their own account. */
app.get('/mine', async (c) => {
  const session = await currentSession(c);
  if (session?.role !== 'reporter') return c.json({ data: [] });
  return c.json({ data: await reports.reporterReports(c.env, session.id) });
});

/** Public: a student checks their own report through the confirmation link. */
app.get('/:id', async (c) => {
  const dto = await reports.getReport(c.env, c.req.param('id'));
  return dto ? c.json(dto) : c.json({ error: 'Laporan tidak ditemukan' }, 404);
});

/**
 * Supervisor: the dashboard list, with filters. Time: `from`/`to` (WIB
 * dates, inclusive) and `hour_from`/`hour_to` (WIB hours 0–23, inclusive).
 */
app.get('/', requireSupervisor, async (c) => {
  const q = c.req.query();
  return c.json({
    data: await reports.dashboardReports(c.env, {
      status: q.status,
      priority: q.priority,
      toilet_id: q.toilet_id,
      building: q.building,
      ...readTimeFilter(q),
      limit: clampNumber(q.limit, 100, 200),
    }),
  });
});

const StatusChangeSchema = z.object({
  status: z.enum(STATUSES),
  proof_photo_key: z.string().max(200).nullish(),
  staff_id: z.string().max(64).nullish(),
});

/**
 * Staff: mark a report as being worked on, or as resolved.
 *
 * Staff do not sign in; they send the `staff_id` picked on the dropdown,
 * which must belong to an active staff member. A signed-in supervisor may act
 * under their own name instead. Closing needs a proof photo, and the photo is
 * judged by the vision model before the status changes — a photo of a dirty
 * toilet is refused.
 */
app.patch('/:id', async (c) => {
  const parsed = StatusChangeSchema.safeParse(await c.req.json().catch(() => ({})));
  if (!parsed.success) return c.json({ error: 'Status tidak valid' }, 400);

  const session = await currentSession(c);
  let actor: string;
  if (parsed.data.staff_id) {
    const staff = await accounts.findActiveStaff(c.env, parsed.data.staff_id);
    if (!staff) return c.json({ error: 'Nama petugas tidak dikenal. Pilih ulang namamu.' }, 400);
    actor = staff.name;
  } else if (session?.role === 'supervisor') {
    actor = session.name;
  } else {
    return c.json({ error: 'Pilih namamu dulu' }, 400);
  }

  const result = await reports.changeStatus(
    c.env,
    c.req.param('id'),
    parsed.data.status,
    actor,
    parsed.data.proof_photo_key ?? null,
  );

  switch (result.kind) {
    case 'not-found':
      return c.json({ error: 'Laporan tidak ditemukan' }, 404);
    case 'photo-not-found':
      return c.json({ error: 'Foto bukti tidak ditemukan. Unggah ulang.' }, 400);
    case 'proof-missing':
      return c.json({ error: 'Foto bukti penyelesaian wajib diunggah lebih dulu.' }, 400);
    // 422: the request was well-formed, the photo simply did not pass.
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
      return c.json({ ok: true, status: result.status, verification: result.verification });
  }
});

/** Staff: retry the analysis of a report the LLM failed on. */
app.post('/:id/reanalyze', requireSupervisor, async (c) => {
  const id = c.req.param('id');
  if (!(await reports.requestReanalysis(c.env, id))) {
    return c.json({ error: 'Laporan tidak ditemukan' }, 404);
  }
  c.executionCtx.waitUntil(reports.runAnalysis(c.env, id));
  return c.json({ ok: true });
});

/** Staff: delete a report permanently, keeping a copy in the activity log. */
app.delete('/:id', requireSupervisor, async (c) => {
  const deleted = await reports.deleteReport(c.env, c.req.param('id'), c.get('session').name);
  return deleted ? c.json({ ok: true }) : c.json({ error: 'Laporan tidak ditemukan' }, 404);
});

export default app;
