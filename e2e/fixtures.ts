import { test as base, expect, type APIRequestContext, type Page } from '@playwright/test';

/** The default supervisor from migrations/0004_pengguna.sql (finding T-04). Local databases only. */
export const ADMIN = { username: 'admin', password: 'Admin123!' };

/** Every new staff account starts with this password (migration 0016, user-service.ts). */
export const STAFF_PASSWORD = '123456';

/**
 * The signed-in session of each staff member a test created, by id. Staff act
 * through their own session, so the helpers below look it up from the id; an id
 * with no session (a made-up one) falls back to an anonymous client.
 */
const staffSessions = new Map<string, APIRequestContext>();

/** The client a staff member acts through: their own session, or anonymous for an unknown id. */
export function asStaff(staffId: string, fallback: APIRequestContext): APIRequestContext {
  return staffSessions.get(staffId) ?? fallback;
}

/** The campus centre in wrangler.jsonc, and a place far outside its 500 m radius. */
export const ON_CAMPUS = { latitude: -7.3351, longitude: 108.2217, accuracy: 10 };
export const OFF_CAMPUS = { latitude: -6.2, longitude: 106.8, accuracy: 10 };

export const MOCK_LLM_URL = `http://127.0.0.1:${process.env.E2E_MOCK_PORT ?? '8799'}`;

/** A real one-pixel JPEG. The mock model never looks at the bytes. */
const JPEG = Buffer.from(
  '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=',
  'base64',
);

let counter = 0;

/** Unique within a run: the database is shared, and identical complaints count as duplicates for two minutes. */
export const unique = (text = 'uji') =>
  `${text} ${Date.now().toString(36)}${process.pid.toString(36)}${(counter++).toString(36)}`;

/** A username that passes the 3–30 character rule. */
export const uniqueUsername = () => unique('u').replace(/\s/g, '').slice(0, 30);

/**
 * Marks the rest of a test as describing a known bug from the "Temuan Awal"
 * sheet in docs/qa/test-case-manual-kato-report.xlsx: the test states the
 * correct behaviour and is expected to fail. Once the bug is fixed the test
 * passes, Playwright reports that as a failure, and this line must be removed.
 *
 * Call it right before the assertion that shows the bug, so that a broken
 * setup above it still fails the test as usual.
 */
export function knownIssue(finding: string, note: string) {
  base.info().annotations.push({ type: 'known-issue', description: `${finding}: ${note}` });
  base.fail();
}

export interface CreatedReport {
  id: string;
  description: string;
  area: string;
  photoKey: string;
}

/** Test data through the public API, as a phone would send it. */
export class Api {
  /** Every report this client filed; the fixture deletes them when the test ends. */
  readonly created: string[] = [];

  constructor(readonly request: APIRequestContext) {}

  async upload(kind: 'report' | 'proof' | 'cleaning' = 'report'): Promise<string> {
    const res = await this.request.post(`/api/uploads?kind=${kind}`, {
      multipart: { file: { name: 'foto.jpg', mimeType: 'image/jpeg', buffer: JPEG } },
    });
    expect(res.status(), 'unggah foto').toBe(201);
    return (await res.json()).key;
  }

  async report(options: { description?: string; area?: string } = {}): Promise<CreatedReport> {
    const description = options.description ?? unique('lantai kotor');
    const area = options.area ?? 'C-2';
    const photoKey = await this.upload();
    const res = await this.request.post('/api/reports', { data: { area_id: area, description, photo_key: photoKey } });
    expect(res.status(), 'kirim laporan').toBe(201);
    const { id } = await res.json();
    this.created.push(id);
    return { id, description, area, photoKey };
  }

  async getReport(id: string) {
    const res = await this.request.get(`/api/reports/${id}`);
    expect(res.ok(), `baca laporan ${id}`).toBe(true);
    return res.json();
  }

  /** The analysis runs after the response; waits until it has settled. */
  async settled(id: string) {
    await expect
      .poll(async () => (await this.getReport(id)).ai_status, { message: 'analisis selesai', timeout: 15_000 })
      .not.toBe('pending');
    return this.getReport(id);
  }

  /** As the staff member with this id, through their own session. */
  claim(id: string, staffId: string) {
    return asStaff(staffId, this.request).patch(`/api/reports/${id}`, { data: { status: 'in_progress' } });
  }

  async resolve(id: string, staffId: string) {
    const proof = await this.upload('proof');
    return asStaff(staffId, this.request).patch(`/api/reports/${id}`, {
      data: { status: 'resolved', proof_photo_key: proof },
    });
  }

  async cleaning(staffId: string, options: { area?: string; task?: string; position?: unknown; note?: string } = {}) {
    const photo = await this.upload('cleaning');
    return asStaff(staffId, this.request).post('/api/cleaning/reports', {
      data: {
        area_id: options.area ?? 'C-2',
        tasks: [{ task: options.task ?? 'trash', photo_key: photo }],
        note: options.note ?? null,
        position: options.position === undefined ? ON_CAMPUS : options.position,
      },
    });
  }
}

/** Cleaning staff created for one test, so no test sees another's claims or name. Already signed in. */
export interface Staff {
  id: string;
  name: string;
  /** Their sign-in: first name at upi.edu; the password is STAFF_PASSWORD. */
  username: string;
  /** Their own signed-in session, as an API client. */
  request: APIRequestContext;
}

interface Fixtures {
  /** Anonymous: no session, like a reporter or a cleaner on their phone. */
  api: Api;
  /** A signed-in supervisor, as an API client. */
  admin: APIRequestContext;
  newStaff: (prefix?: string) => Promise<Staff>;
  /** A new, signed-in reporter account, as an API client. */
  reporter: { api: Api; id: string; name: string; username: string; password: string };
  /** Accepts every confirm() the page raises. */
  acceptDialogs: void;
}

/** Keeps the staff page and the boards short for the tests that come after. */
async function removeReports(admin: APIRequestContext, api: Api) {
  await Promise.all(api.created.map((id) => admin.delete(`/api/reports/${id}`)));
}

export const test = base.extend<Fixtures>({
  admin: async ({ playwright, baseURL }, use) => {
    const context = await playwright.request.newContext({ baseURL });
    const res = await context.post('/api/auth/login', { data: ADMIN });
    expect(res.ok(), 'login supervisor bawaan').toBe(true);
    await use(context);
    await context.dispose();
  },

  api: async ({ playwright, baseURL, admin }, use) => {
    const context = await playwright.request.newContext({ baseURL });
    const api = new Api(context);
    await use(api);
    await removeReports(admin, api);
    await context.dispose();
  },

  newStaff: async ({ admin, playwright, baseURL }, use) => {
    const made: Staff[] = [];
    await use(async (prefix = 'Petugas') => {
      const name = unique(prefix);
      const res = await admin.post('/api/users', { data: { role: 'staff', name } });
      expect(res.status(), 'buat petugas').toBe(201);
      const { id, username } = await res.json();
      const request = await playwright.request.newContext({ baseURL });
      const login = await request.post('/api/auth/login', { data: { username, password: STAFF_PASSWORD } });
      expect(login.ok(), 'login petugas').toBe(true);
      staffSessions.set(id, request);
      const staff = { id, name, username, request };
      made.push(staff);
      return staff;
    });
    for (const staff of made) {
      staffSessions.delete(staff.id);
      await staff.request.dispose();
    }
  },

  reporter: async ({ playwright, baseURL, admin }, use) => {
    const context = await playwright.request.newContext({ baseURL });
    const username = uniqueUsername();
    const password = 'rahasia-pelapor';
    const name = unique('Pelapor');
    const res = await context.post('/api/auth/register', { data: { username, name, password } });
    expect(res.status(), 'daftar pelapor').toBe(201);
    const api = new Api(context);
    await use({ api, id: (await res.json()).id, name, username, password });
    await removeReports(admin, api);
    await context.dispose();
  },

  acceptDialogs: async ({ page }, use) => {
    page.on('dialog', (dialog) => dialog.accept());
    await use();
  },
});

export { expect };

/** Signs a browser page in as this staff member; the cookie stays, as after the sign-in form. */
export async function signIn(page: Page, staff: Staff) {
  const res = await page.request.post('/api/auth/login', { data: { username: staff.username, password: STAFF_PASSWORD } });
  expect(res.ok(), 'login petugas di peramban').toBe(true);
}

/** Chooses in the app's own dropdown (Select.tsx), which is a button and a list on <body>. */
export async function pick(page: Page, field: string, option: string) {
  await page.locator(`#${field}`).click();
  await page.getByRole('option', { name: option, exact: true }).click();
}

/** Presses the shutter of the live camera once its picture is running. */
export async function takePhoto(page: Page) {
  const camera = page.getByRole('dialog', { name: 'Kamera' });
  const shutter = camera.getByRole('button', { name: 'Ambil foto' });
  await expect(shutter).toBeEnabled();
  await shutter.click();
  await expect(camera).toBeHidden();
}
