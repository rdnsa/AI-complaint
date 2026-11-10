/**
 * Fills the database with made-up complaints and cleaning reports for the last
 * 30 days, so the supervisor dashboard has something to draw.
 *
 *   npm run db:seed:mock                       local: replace the mock data with a fresh set
 *   npm run db:seed:mock -- --clear            local: only remove the mock data
 *   npm run db:seed:mock -- --remote           PRODUCTION: same, on the live database
 *   npm run db:seed:mock -- --remote --clear   PRODUCTION: the rollback, removes only the mock data
 *
 * Every row it writes has an id starting with "mock-", which is how a rerun
 * (or --clear) finds and removes them; real rows are left alone. The work is
 * spread over the active staff already in the database, as the supervisor
 * chose. The numbers come from a fixed seed.
 * Photos are keys only: nothing is uploaded, so the photo previews stay empty.
 */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const DAYS = 30;
const clearOnly = process.argv.includes('--clear');
const where = process.argv.includes('--remote') ? '--remote' : '--local';

// --- a small seeded random, so the mock data is the same on every run ---
let state = 20261109;
const rand = () => {
  state = (state * 1664525 + 1013904223) % 4294967296;
  return state / 4294967296;
};
const int = (min, max) => min + Math.floor(rand() * (max - min + 1));
const pick = (list) => list[Math.floor(rand() * list.length)];
const weighted = (pairs) => {
  let r = rand() * pairs.reduce((s, [, w]) => s + w, 0);
  for (const [v, w] of pairs) if ((r -= w) <= 0) return v;
  return pairs[0][0];
};

const wrangler = (args) =>
  execFileSync('npx', ['wrangler', 'd1', 'execute', 'kato', where, ...args], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'inherit'],
  });
const query = (sql) => JSON.parse(wrangler(['--json', '--command', sql]))[0].results;
const q = (v) => (v === null || v === undefined ? 'NULL' : typeof v === 'number' ? String(v) : `'${String(v).replace(/'/g, "''")}'`);
/** UTC, the way the app stores times: 'YYYY-MM-DD HH:MM:SS'. */
const stamp = (d) => d.toISOString().slice(0, 19).replace('T', ' ');

const CLEAR = [
  "DELETE FROM cleaning_report_tasks WHERE report_id LIKE 'mock-%';",
  "DELETE FROM cleaning_reports WHERE id LIKE 'mock-%';",
  "DELETE FROM activity_log WHERE report_id LIKE 'mock-%';",
  "DELETE FROM reports WHERE id LIKE 'mock-%';",
  // Accounts an earlier version made up for the mock work; none are made now.
  "DELETE FROM users WHERE id LIKE 'mock-%';",
];

let sql = [...CLEAR];

if (!clearOnly) {
  const areas = query('SELECT id, building_code, floor, tasks FROM cleaning_areas WHERE active = 1 ORDER BY sort_order');
  const staff = query("SELECT id, name FROM users WHERE role = 'staff' AND active = 1 AND id NOT LIKE 'mock-%' ORDER BY name");
  if (!areas.length || !staff.length) {
    console.error('No cleaning areas or active staff in the database. Run the migrations and `npm run db:seed:cleaning` first.');
    process.exit(1);
  }
  console.log(`Staff: ${staff.map((s) => s.name).join(', ')}`);

  // A moment on a given day back, at a WIB hour (WIB is UTC+7).
  const now = new Date();
  const at = (daysBack, wibHour, minute) => {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), wibHour - 7, minute, int(0, 59)));
    d.setUTCDate(d.getUTCDate() - daysBack);
    return d;
  };
  const weekday = (daysBack) => at(daysBack, 12, 0).getUTCDay(); // 0 is Sunday
  const workHour = () => weighted([[7, 2], [8, 4], [9, 6], [10, 7], [11, 6], [12, 4], [13, 8], [14, 6], [15, 4], [16, 3], [17, 1], [19, 1], [21, 1]]);

  // --- complaints ---
  const COMPLAINTS = [
    { cats: ['cleanliness'], pri: 'medium', text: 'Lantai toilet kotor dan banyak tisu berserakan.', sum: 'Toilet kotor, tisu berserakan.', rec: 'Bersihkan lantai dan kosongkan tempat sampah.' },
    { cats: ['supplies'], pri: 'low', text: 'Sabun cuci tangan di wastafel habis sejak pagi.', sum: 'Sabun cuci tangan habis.', rec: 'Isi ulang sabun di semua wastafel.' },
    { cats: ['supplies'], pri: 'low', text: 'Tisu toilet habis di semua bilik.', sum: 'Tisu toilet habis.', rec: 'Isi ulang tisu di setiap bilik.' },
    { cats: ['damage'], pri: 'high', text: 'Kran wastafel patah, air terus mengalir.', sum: 'Kran patah, air terus mengalir.', rec: 'Tutup katup utama dan ganti kran.' },
    { cats: ['damage', 'flooding'], pri: 'high', text: 'Pipa di bawah wastafel bocor, air menggenang sampai lorong.', sum: 'Pipa bocor, air menggenang.', rec: 'Perbaiki pipa dan keringkan lantai segera.' },
    { cats: ['odor'], pri: 'medium', text: 'Bau tidak sedap dari saluran pembuangan.', sum: 'Bau dari saluran pembuangan.', rec: 'Siram saluran dan beri pembersih saluran.' },
    { cats: ['flooding'], pri: 'high', text: 'Lantai tergenang air setelah hujan, licin.', sum: 'Lantai tergenang dan licin.', rec: 'Keringkan lantai dan pasang tanda licin.' },
    { cats: ['damage'], pri: 'medium', text: 'Pintu bilik tidak bisa dikunci.', sum: 'Kunci pintu bilik rusak.', rec: 'Ganti kunci pintu bilik.' },
    { cats: ['cleanliness', 'odor'], pri: 'medium', text: 'Tempat sampah penuh dan berbau.', sum: 'Tempat sampah penuh dan berbau.', rec: 'Kosongkan tempat sampah dan cuci wadahnya.' },
    { cats: ['other'], pri: 'low', text: 'Lampu di lorong toilet berkedip.', sum: 'Lampu lorong berkedip.', rec: 'Laporkan ke teknisi untuk ganti lampu.' },
    { cats: ['cleanliness'], pri: 'low', text: 'Cermin wastafel kotor dan berdebu.', sum: 'Cermin kotor.', rec: 'Lap cermin dengan pembersih kaca.' },
  ];
  // Some buildings get more complaints than others, so the treemap has a shape.
  const complaintAreas = areas.flatMap((a) => Array(a.building_code === 'C' ? 4 : a.building_code === 'A' || a.building_code === 'H' ? 2 : 1).fill(a));
  const minutesFor = { high: [30, 180], medium: [120, 1440], low: [240, 3600] };

  let n = 0;
  for (let back = DAYS - 1; back >= 0; back--) {
    const day = weekday(back);
    const count = day === 0 || day === 6 ? int(0, 2) : int(2, 6);
    for (let i = 0; i < count; i++) {
      const c = pick(COMPLAINTS);
      const area = pick(complaintAreas);
      const created = at(back, workHour(), int(0, 59));
      if (created > now) continue;
      // Older reports are mostly done; the last few days still have open ones.
      const status =
        back > 5
          ? weighted([['resolved', 9], ['in_progress', 1]])
          : weighted([['resolved', 3], ['in_progress', 2], ['new', 3]]);
      const done = status === 'resolved' ? new Date(created.getTime() + int(...minutesFor[c.pri]) * 60_000) : null;
      // A report cannot be finished in the future: one that would be is finished now.
      const resolved = done && (done > now ? now : done);
      const id = `mock-r${String(++n).padStart(4, '0')}`;
      const staffName = status === 'new' ? null : pick(staff).name;
      sql.push(
        `INSERT INTO reports (id, area_id, description, status, staff_name, resolved_at, ai_status, categories, priority, summary, recommendation, ai_model, ai_ms, created_at, updated_at) VALUES (${[
          id, area.id, c.text, status, staffName, resolved && stamp(resolved),
          'ok', JSON.stringify(c.cats), c.pri, c.sum, c.rec, 'mock', int(800, 2500), stamp(created), stamp(resolved ?? created),
        ].map(q).join(', ')});`,
      );
    }
  }
  const complaintCount = n;

  // --- cleaning reports ---
  // Each person works their own areas (staff_areas, from the placement letter), at a
  // pace of their own: some meet or pass their target, most come close, a few fall
  // short, so the "tasks done / tasks owed" bubbles read like a real month. Now and
  // then someone helps in an area that is not theirs, which counts too.
  const LAT = -7.3351;
  const LNG = 108.2217;
  const areaById = new Map(areas.map((a) => [a.id, { ...a, tasks: JSON.parse(a.tasks) }]));
  const owned = query("SELECT staff_id, area_id FROM staff_areas WHERE staff_id NOT LIKE 'mock-%'");
  const areasOf = new Map();
  for (const o of owned) {
    if (!areaById.has(o.area_id)) continue;
    areasOf.set(o.staff_id, [...(areasOf.get(o.staff_id) ?? []), areaById.get(o.area_id)]);
  }
  if (!owned.length) console.warn('No responsible areas yet (run npm run db:seed:duties): staff work random areas.');
  // How much of their target each person reaches: most at or near 100%, a couple
  // past it, two clearly short, so the bubbles show what to act on without the whole
  // month looking neglected.
  const PACE = [1.1, 1.04, 1, 0.97, 0.95, 0.93, 0.9, 0.88, 0.85, 0.72, 0.62];
  const pace = new Map(staff.map((s, i) => [s.id, PACE[i % PACE.length]]));
  const otherAreas = [...areaById.values()];
  const yards = otherAreas.filter((a) => a.floor === 0 || a.floor === null);
  const ownedIds = new Set(owned.map((o) => o.area_id));
  const unowned = otherAreas.filter((a) => !ownedIds.has(a.id));

  n = 0;
  const report = (s, area, created, tasks) => {
    const loc = weighted([['ok', 30], ['far', 1], ['unknown', 1]]);
    const meters = loc === 'ok' ? int(10, 300) : loc === 'far' ? int(900, 4000) : null;
    const id = `mock-c${String(++n).padStart(5, '0')}`;
    sql.push(
      `INSERT INTO cleaning_reports (id, area_id, staff_id, staff_name, note, latitude, longitude, accuracy_m, distance_m, location_status, created_at) VALUES (${[
        id, area.id, s.id, s.name, rand() < 0.1 ? 'Sudah dibersihkan, mohon dicek.' : null,
        meters === null ? null : LAT + meters / 111_000, meters === null ? null : LNG, meters === null ? null : int(5, 30),
        meters, loc, stamp(created),
      ].map(q).join(', ')});`,
    );
    for (const task of tasks) {
      sql.push(
        `INSERT INTO cleaning_report_tasks (report_id, task, photo_key, photo_at) VALUES (${[
          id, task, `mock/${id}/${task}.jpg`, stamp(created),
        ].map(q).join(', ')});`,
      );
    }
  };

  // Work in an area that is not the person's own: most of its tasks, after the morning round.
  const helpOut = (s, back, choices) => {
    if (!choices.length) return;
    const area = pick(choices);
    const created = at(back, int(10, 15), int(0, 59));
    const done = area.tasks.filter(() => rand() < 0.75);
    if (created <= now) report(s, area, created, done.length ? done : [area.tasks[0]]);
  };

  for (let back = DAYS - 1; back >= 0; back--) {
    if (weekday(back) === 0) continue; // Sunday is off
    for (const s of staff) {
      const p = pace.get(s.id);
      // A day off now and then, more often for the slower ones.
      if (rand() > Math.min(0.98, 0.7 + p * 0.28)) continue;
      // Without areas of their own (the campus-wide technician): a round of two yards.
      const mine = areasOf.get(s.id) ?? [pick(yards), pick(yards)];
      let hour = weighted([[6, 3], [7, 5], [8, 3]]);
      for (const area of mine) {
        // The share of this area's tasks done today, around the person's pace.
        const share = Math.max(0, Math.min(1, p + (rand() - 0.5) * 0.3));
        const done = area.tasks.filter(() => rand() < share);
        if (!done.length) continue;
        const created = at(back, Math.min(hour, 16), int(0, 59));
        hour += rand() < 0.5 ? 1 : 0;
        if (created > now) continue;
        report(s, area, created, done);
      }
      // The quick ones help out elsewhere, which takes them past 100%.
      if (p >= 1 && rand() < 0.35) helpOut(s, back, otherAreas.filter((a) => !mine.includes(a)));
    }
    // Areas nobody is assigned to (a yard, a ground floor, a whole building) still get
    // looked after most days by whoever has time, so the area map covers the campus.
    for (const area of unowned) {
      if (rand() < 0.7) helpOut(pick(staff), back, [area]);
    }
  }
  console.log(`Mock data: ${complaintCount} complaints and ${n} cleaning reports over the last ${DAYS} days.`);
} else {
  console.log('Removing the mock data.');
}

const dir = mkdtempSync(join(tmpdir(), 'kato-mock-'));
const file = join(dir, 'mock.sql');
writeFileSync(file, sql.join('\n'));
try {
  wrangler([`--file=${file}`]);
} finally {
  rmSync(dir, { recursive: true, force: true });
}
console.log(`Done (${where === '--remote' ? 'PRODUCTION' : 'local'}). Reload the dashboard (the charts cache for up to a minute).`);
