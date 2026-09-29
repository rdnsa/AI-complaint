# AI Complaint

**LLM-based classification and prioritisation of campus toilet complaints.**
Built for Universitas Pendidikan Indonesia, Tasikmalaya Campus (Jln. Dadaha No. 18).

A student scans the QR code on a toilet door and writes the problem in their own
words. A pretrained LLM turns that free text into a structured work ticket —
category, priority, a neutral summary, and a recommended course of action — and
pushes it to the cleaning staff's dashboard.

```
QR on the floor  →  pick the toilet  →  describe the problem  →  LLM analysis
                                                                      ↓
                                     staff dashboard  +  17:00 WIB cron → daily summary
```

Live: <https://ai-complaint.yvrtz.workers.dev>

One QR code represents one **floor** of one building, not one toilet. The
reporter picks men's/women's/accessible on the form, which cuts the number of
stickers to print and maintain by two thirds.

---

## What it does

**Core (the research contribution)**

1. **Automatic classification** — `kebersihan`, `perlengkapan`, `kerusakan`,
   `bau`, `genangan`, `lainnya`; more than one may apply.
2. **Priority assignment** — `rendah` / `sedang` / `tinggi`, governed by
   safety-risk rules rather than keyword counts.
3. **Daily summary** — one paragraph over the day's reports naming the worst
   locations and the most urgent actions.
4. **Reporter leaderboard** — gamification ranked by report volume, shown
   alongside how many of those reports were actually resolved.

**Supporting features**

- Public report board readable by anyone, editable only by staff
- Mandatory condition photo from reporters, mandatory proof photo from staff
- Immutable activity log for management oversight
- Charts in the dashboard: daily series, priority spread, categories, buildings,
  mean time to resolution
- Status tracking for reporters without an account
- Building map on the landing page
- Bilingual interface (Indonesian / English), switchable from the header

---

## Roles

| Role | How the account is created | Can do |
|---|---|---|
| **Admin** | ships with the database (`admin` / `Admin123!`) | everything staff can, plus create staff accounts and change their name, password, and active status |
| **Staff** | created by an admin | change report status, upload proof, re-run analysis, delete reports |
| **Reporter** | self-registers at `/daftar` | file reports under their name and appear on the leaderboard |
| No account | — | still file reports and read the public board |

> **Change the default admin password after the first sign-in.** It is committed
> in `migrations/0004_pengguna.sql` and therefore public.

Passwords are stored as PBKDF2-SHA256 with 100,000 iterations and a per-user
salt via WebCrypto. The plaintext is never stored anywhere.

---

## Tech stack

| Layer | Choice |
|---|---|
| Language | TypeScript |
| Runtime | Cloudflare Workers |
| API framework | Hono |
| Database | Cloudflare D1 (SQLite) |
| File storage | Cloudflare R2, served through the Worker |
| Frontend | React 18 + Vite + Tailwind CSS |
| i18n | hand-rolled dictionary in `web/src/lib/i18n.tsx`, no library |
| LLM | DeepSeek `deepseek-chat` in JSON mode — no training, no dataset |

The frontend and the API live in the same Worker on the same origin, so there is
no CORS configuration and only one thing to deploy.

---

## Running locally

```bash
npm install
cp .dev.vars.example .dev.vars   # fill in LLM_API_KEY and AUTH_SECRET

npm run db:local                 # apply migrations to the local D1
npm run db:seed                  # load the toilet list

npm run build                    # the frontend must be built once before wrangler dev
npm run dev                      # Vite (5173) + Worker (8787) side by side
```

| Page | URL |
|---|---|
| Landing / manual location picker | `http://localhost:5173/` |
| Report form (QR target) | `http://localhost:5173/lapor/A-1` |
| Public report board | `http://localhost:5173/laporan` |
| Leaderboard | `http://localhost:5173/peringkat` |
| Staff dashboard | `http://localhost:5173/petugas` |

---

## Deploying

```bash
npx wrangler secret put LLM_API_KEY
npx wrangler secret put AUTH_SECRET   # a long random string

npm run db:remote                     # migrations against production D1
npm run db:seed:remote
npm run deploy
```

The R2 bucket does **not** need public access — photos are served back by the
Worker at `GET /api/uploads/<key>`.

### Automatic deploys (Cloudflare Workers Builds)

Set the deploy command to `npx wrangler deploy` and leave the build command
empty. The frontend builds itself through `build.command` in `wrangler.jsonc`,
which also installs dependencies when `node_modules` is missing from a clean
checkout.

Secrets and database migrations are not automated — run `wrangler secret put`
and `npm run db:remote` once, by hand.

---

## Printing QR codes

```bash
BASE_URL=https://<your-worker>.workers.dev npm run qr
```

Produces `qr-codes/<building>-<floor>.png` plus `qr-codes/cetak.html`, an A4
print sheet with bilingual stickers. The folder is emptied on every run so that
codes from an older location list can never be printed by accident.

### Changing the toilet list

Edit `seed/toilets.sql`, re-run the seed, then regenerate the QR codes — in that
order, because the codes are generated from whatever is active in the database.

The seed file is safe to run repeatedly, including once reports exist. It
deactivates every toilet and then reactivates the ones listed, rather than
deleting rows. A toilet removed from the list simply stops appearing in the app;
old reports pointing at it keep their location and history intact.

---

## API surface

**Public**

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/api/auth/masuk`, `/api/auth/daftar`, `/api/auth/keluar` | sign in, register, sign out |
| `GET` | `/api/auth/saya` | current session |
| `GET` | `/api/lokasi`, `/api/lokasi/:id` | buildings and floors; one floor (QR target) |
| `POST` | `/api/reports` | file a report |
| `GET` | `/api/reports/publik` | public report board |
| `GET` | `/api/reports/saya` | the signed-in reporter's own reports |
| `GET` | `/api/reports/:id` | one report |
| `POST` | `/api/uploads?jenis=laporan\|bukti` | upload a photo |
| `GET` | `/api/uploads/:key` | serve a photo from R2 |
| `GET` | `/api/peringkat` | leaderboard |

**Staff and admin**

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/reports` | dashboard list, with filters |
| `PATCH` | `/api/reports/:id` | change status (proof photo required to close) |
| `POST` | `/api/reports/:id/analisa-ulang` | re-run a failed analysis |
| `DELETE` | `/api/reports/:id` | delete permanently, logged with a full copy |
| `GET` | `/api/summary`, `/api/summary/stats`, `/api/summary/grafik` | daily summary, counters, chart data |
| `POST` | `/api/summary/generate` | write the daily summary now |
| `GET` | `/api/aktivitas` | activity log |

**Admin only**

| Method | Path | Purpose |
|---|---|---|
| `GET` `POST` | `/api/pengguna` | list and create staff accounts |
| `PATCH` | `/api/pengguna/:id` | change name, password, or active status |

---

## Architecture

The backend is layered, and dependencies only ever point inwards:

```
routes/  →  services/  →  repositories/  →  D1
                ↓
           adapters/            domain/
```

| Layer | Responsibility | Rule it obeys |
|---|---|---|
| `domain/` | vocabulary and rules of the problem | imports nothing — no Hono, no D1, no R2 |
| `repositories/` | every SQL statement, one file per aggregate | knows the database, never HTTP |
| `services/` | use cases and business rules | knows repositories and adapters, never Hono |
| `adapters/` | LLM, R2 storage, password hashing, sessions, clock | wraps the outside world behind small interfaces |
| `routes/` | parse, validate, delegate, format | contains no SQL and no business rules |
| `index.ts` | composition root | the only file that sees every layer |

All 38 SQL statements live under `repositories/`, so moving off D1 would mean
rewriting that one directory. The rule that a report can only be closed with
evidence lives in `domain/types.ts`, so it holds no matter which entry point
asks — an HTTP request today, a cron job or an admin tool tomorrow.

## Project structure

```
src/
  index.ts               composition root: routes, SPA fallback, cron handler
  env.ts                 infrastructure bindings and configuration
  domain/types.ts        entities, enums, DTO mapping, closing rule
  adapters/
    llm.ts               prompt, few-shot examples, output validation
    storage.ts           R2 photo storage, prefixes and limits
    session.ts           JWT cookie sessions and role guards
    password.ts          PBKDF2 hashing
    clock.ts             UTC ↔ WIB day conversion
  repositories/          reports, locations, users, activity, summaries
  services/
    report-service.ts    filing, closing, deleting a report
    analysis-service.ts  per-report analysis, run after the response is sent
    summary-service.ts   daily summary, statistics, charts, leaderboard
    user-service.ts      registration, sign-in, account management
    activity-service.ts  writing and reading the audit trail
  routes/                auth, locations, reports, uploads, summary, activity,
                         users, leaderboard

web/src/
  lib/i18n.tsx           dictionary and language switcher
  lib/sesi.tsx           session context
  lib/api.ts             typed API client
  components/Kop.tsx     page header, back button, floating pill bar
  components/Lacak.tsx   three-step status timeline
  components/grafik/     validated chart palette, line chart, bar chart
  components/Panel*.tsx  dashboard tabs: charts, activity, staff accounts
  pages/                 Beranda, Lapor, StatusLaporan, LaporanPublik,
                         Masuk, Daftar, Peringkat, Dashboard
  ../public/peta-lokasi-gedung.jpg    campus building map

migrations/              D1 schema, applied in order
seed/toilets.sql         the toilet list
scripts/generate-qr.mjs  QR codes and the A4 print sheet
scripts/build-frontend.mjs   builds the frontend before wrangler deploy
```

---

## Design notes

Each of these is a decision that cost something elsewhere, so the reasoning is
recorded rather than the mechanics.

**Analysis runs after the response is sent** (`ctx.waitUntil`). The reporter gets
an instant confirmation while the LLM call continues in the background; the
confirmation page polls until the result lands. A synchronous call would have put
a three-second wait between the student and the send button.

**A failed LLM call never loses a report.** The row is marked
`ai_status = 'gagal'` with the error text, still appears on the dashboard without
AI labels, and can be re-analysed from a button. If the DeepSeek API is down, the
system degrades into an ordinary reporting tool instead of failing.

**LLM output is never trusted as-is.** Every response is validated with Zod and
then forced into the enums the database knows: unknown categories are dropped and
an unrecognised priority falls back to `sedang`.

**Per-call latency is recorded** in `ai_ms` — useful as quantitative evidence in
the results chapter.

**Reporting does not require an account, but an account is rewarded.** The core
path — scan, type, send — stays open to anyone, because a registration wall at
the door kills adoption. Reports filed while signed in attach to that account and
count towards the leaderboard; anonymous reports are still accepted and still
handled, they just do not rank.

**Closing a report demands evidence, not a claim.** Reporters must attach a photo
of the condition, and staff must upload a proof photo before a report can be
marked resolved. Both are enforced on the server, not merely hidden in the UI.
The proof photo is shown on the public board so that "already handled" can be checked
by anyone.

**The activity log cannot be erased from the app.** Every report, analysis result,
status change, deletion, staff sign-in, account change, and generated summary is
written to the `aktivitas` table. That table deliberately has no foreign key to
`reports`: a deleted report is exactly the one that most needs to stay traceable,
so its full contents are copied into the log before the row disappears.
Management can still see what was removed, by whom, and when.

**Chart colours are computed, not eyeballed.** The series palette and the priority
palette both pass checks for lightness band, chroma floor, colour-vision
separation (deutan/protan/tritan), and contrast against the surface. The values
live in `web/src/components/grafik/warna.ts` — do not change them without
re-running the validator.

**The public board is readable by anyone but writable only by staff.** `/laporan`
shows every report and its handling status without a login. Only the analysis
summary is exposed — raw text, reporter photos, and staff names are withheld, so
the board cannot become an outlet for unfiltered complaint text or for a face
caught in the background of a photo.

**Reports belong to the account, not to the device.** A signed-in reporter sees
"My reports" on the landing page wherever they sign in — phone, laptop, a
borrowed browser. An earlier version kept the ids in `localStorage`, which tied
the list to one device and lost it when site data was cleared. Anonymous reports
are still accepted; their reporter tracks them through the confirmation link,
which carries a three-step timeline and refreshes itself while open.

**The interface is bilingual; the analysis stays Indonesian.** Labels follow the
reader's choice, but LLM summaries and recommendations are always written in
Indonesian because the people acting on them are the cleaning staff. English
complaints are understood and still summarised in Indonesian.

**The palette comes from official campus material.** The maroon, brick orange,
and cream are lifted from the "Peta Lokasi Gedung" poster for UPI Tasikmalaya, so
the app reads as part of the campus rather than as a generic tool.

**Photos never leave the app's own domain.** `GET /api/uploads/<key>` reads the
object straight from the R2 binding, restricts access to the `laporan/` and
`bukti/` prefixes, and honours ETags so a browser downloads each photo once. This
also sidesteps `pub-*.r2.dev`, whose DNS is hijacked by several Indonesian ISPs —
images silently fail to load on campus networks.
