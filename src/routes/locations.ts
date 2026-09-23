import { Hono } from 'hono';
import type { AppEnv } from '../env';
import * as locations from '../repositories/locations';

const app = new Hono<AppEnv>();

/** Public: the buildings, and which of their floors have a registered toilet. */
app.get('/', async (c) => {
  const rows = await locations.allLocations(c.env);

  // Grouped per building so the frontend does not have to assemble it itself.
  const buildings = new Map<string, { code: string; name: string; floors: number[] }>();
  for (const r of rows) {
    const b = buildings.get(r.building_code) ?? {
      code: r.building_code,
      name: r.building_name,
      floors: [],
    };
    b.floors.push(r.floor);
    buildings.set(r.building_code, b);
  }

  return c.json({ data: [...buildings.values()] });
});

/**
 * Public: one floor of one building — this is what a QR code points at.
 *
 * `id` is formatted '<building>-<floor>', for example 'A-1'. The toilet type is
 * not part of the QR code because the reporter picks it on the form.
 */
app.get('/:id', async (c) => {
  const match = /^([A-Za-z])-(\d{1,2})$/.exec(c.req.param('id'));
  if (!match) return c.json({ error: 'Kode lokasi tidak dikenal' }, 404);

  const toilets = await locations.toiletsOnFloor(c.env, match[1].toUpperCase(), Number(match[2]));
  if (!toilets.length) return c.json({ error: 'Kode lokasi tidak dikenal' }, 404);

  return c.json({
    building_code: toilets[0].building_code,
    building_name: toilets[0].building_name,
    floor: toilets[0].floor,
    toilets: toilets.map(({ id, type }) => ({ id, type })),
  });
});

export default app;
