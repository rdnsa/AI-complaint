# Kato Report

**LLM-based classification and prioritisation of campus cleanliness and facility complaints.**
(The repository, the npm package and the Worker are still named `ai-complaint`.)
Built for Universitas Pendidikan Indonesia, Tasikmalaya Campus (Jln. Dadaha No. 18).

A reporter scans the QR code at a location — a floor of a building, a
building's yard, a whole building, or a place outside the buildings such as a
court — or picks the building and floor/yard on the page, and writes the
problem in their own words. A pretrained LLM turns that free text into a structured work ticket —
category, priority, a neutral summary, and a recommended course of action — and
pushes it to the cleaning staff's dashboard.

```
QR or picked location  →  describe the problem  →  LLM analysis
                                                                      ↓
                                     staff board  +  17:00 WIB cron → daily summary
                                           ↓
                       staff claim it, then upload proof photo  →  vision LLM: clean?  →  resolved
```

Live: <https://ai-complaint.yvrtz.workers.dev>

Two longer documents live in [`docs/`](docs/), each as HTML and PDF
(`npm run docs` re-renders the PDFs with headless Chrome):

- [`dokumentasi-teknis`](docs/dokumentasi-teknis.pdf) — the full technical
  reference (Indonesian): schema per column, every endpoint with request and
  response shapes, both LLM flows, caching and performance, operations,
  troubleshooting, known limits.
- [`panduan-umum`](docs/panduan-umum.pdf) — the plain-language guide for
  reporters, cleaning staff, supervisors, and management: step-by-step use, FAQ,
  privacy, what to do when something goes wrong.

One QR code represents one **location** (a cleaning area, `cleaning_areas`): a
floor of a building, a building's yard, a whole building, or a place like
Lapang Voli. The same locations appear on every page, so a complaint, a daily
task and a sticker always name a place the same way. The system is no longer
toilet-only: any location's cleanliness can be reported. The `toilets` table
and its `work_logs` survive only as legacy data that older reports still point
at; queries read both through the `location_info` view.

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
5. **Proof-photo verification** — a vision model judges the staff photo before a
   report can be closed: does it show the reported location, and is it clean?
6. **Ask the data (Kato Bot)** — a floating icon on every page opens a chat
   where anyone types a question in plain language ("which building had the most
   blockages this month?") and the text model answers it by calling a small set
   of aggregate queries; it never sees raw rows, and staff names are only
   revealed to the signed-in supervisor.

**Supporting features**

- Public report board readable by anyone, editable only by staff
- Mandatory condition photo from reporters, mandatory proof photo from staff
- Immutable activity log for management oversight
- Supervisor dashboard in five tabs: **Ringkasan** (Overview), **Laporan**
  (Complaints / Cleaning), **Log** (Activity log / Work log, the latter legacy),
  **Petugas & Supervisor** (accounts), **QR lokasi** (stickers). Overview opens
  with the AI daily summary, then a 7/14/30/90-day range (default 90) over a
  gauge, KPI cards with sparklines, area, donut, radial, treemap, aging-bar,
  heatmap and stacked-bar charts
- Status tracking for reporters without an account
- One location list for every page: the locations of the 2026 staff assignment
  letter (`seed/cleaning-areas.sql`), picked as **Gedung** then **Lantai /
  Halaman** — a floor, the building's yard, or the whole building/area
- Two kinds of staff work, as two tabs on the staff page:
  - **Keluhan** (complaints): every open complaint is listed with no location
    picked (Gedung/Lantai are only filters). Staff are asked for their name
    when they act, not before: "Saya kerjakan sekarang" claims a complaint,
    "Sudah beres" asks who finished and opens the camera. A claim is not a
    lock: until a proof photo closes the report another staff member may take
    it over, and the handover is logged ("X took over … from Y"). A resolved
    report cannot be reopened (`409`)
  - **Tugas harian** (daily tasks, `/staff` or `/clean/<area>`): pick a name
    and a location, then six tasks, the same everywhere — sweep & mop, wipe the
    windows, clean the toilet, empty the bins, refill the water gallon, tidy
    the room — each photographed and sent on its own. Photos are stamped with
    name, area, server time and GPS; a photo older than three hours or already
    used is refused; a report filed outside `CAMPUS_RADIUS_M` of the campus (or
    without GPS) is accepted but flagged to the supervisor. These photos are
    not judged by the vision model. Staff may send from any area; the
    supervisor's **Laporan → Kebersihan** view shows a printable daily recap
    per staff member (done ✓ / not done ✗). Areas and assignments live in
    `seed/cleaning-areas.sql` (`npm run db:seed:cleaning`)
- Staff work log (older, toilet-based): kept read-only under **Log → Log
  pekerjaan**; nothing writes to it any more (`POST /api/work-logs` is gone)
- Photos only from the live in-page camera, never from the gallery
- Time filters on the complaint list, work log and activity log: presets (all,
  today, yesterday, 7 days, 30 days, date range) plus a WIB time window chosen
  on a dial clock to the minute; windows crossing midnight (22:00–06:00) work;
  exact timestamps throughout
- Printable bilingual (Indonesian + English) QR stickers generated inside the
  supervisor dashboard
- Dark theme by default, light switchable in the header; every dropdown is the
  app's own `Select`, which always opens downward
- Bilingual interface (Indonesian / English), switchable from the header

---

## Which model does what

Two models, never for the same job — the split follows the input type. Daily-task photos use neither: they are checked by rules (age, reuse, GPS), not by a model.

| | DeepSeek `deepseek-chat` | Gemini `gemini-3.6-flash` |
|---|---|---|
| Input | complaint text; the day's list of summaries; admin questions | staff proof photo of a complaint, plus the original complaint as context |
| Job | features 1–3: classify, prioritise, summarise, daily summary; feature 6: answer questions via tool calls | feature 5: is this the reported location, and is it clean? |
| Called | on every new report (async, after the response), once a day by cron, and per question | every time staff close a complaint (sync — staff wait for the verdict) |
| On failure | report is kept unlabelled, can be re-analysed | the close is refused (`502`); staff retry |
| Code | `analyzeComplaint()`, `summarizeDay()`, `chatWithTools()` in `src/adapters/llm.ts` | `checkProofPhoto()` in the same file |
| Config | `LLM_BASE_URL`, `LLM_MODEL`, `LLM_API_KEY` | `VISION_BASE_URL`, `VISION_MODEL`, `VISION_API_KEY` |
| Stored in | `reports.categories/priority/summary/recommendation/ai_*`, `daily_summaries` | `reports.proof_*` (and the legacy `work_logs.proof_*`); `activity_log` rows `proof_rejected`, `verification_failed` |
| Cost | paid, very cheap | Google AI Studio free tier |

Both go through the same `chatJSON()` helper because both providers speak the
OpenAI chat-completions format; only the target (URL, model, key) and the
message content differ.

## Roles

Three parties, and only the supervisor ever signs in.

| Role | How it is created | Signs in? | Can do |
|---|---|---|---|
| **Reporter** | nobody — or self-registers at `/register` to appear on the leaderboard | no (optional) | report a dirty spot or broken facility at any location, with a live-camera photo |
| **Cleaning staff** | the supervisor adds a **name** in the dashboard | **no** — picks their name from a dropdown at the moment they act | claim and resolve complaints (proof photo checked by the vision model), take over a colleague's claim, and send the daily tasks |
| **Supervisor** (SPV) | ships with the database (`admin` / `Admin123!`); can add more | yes | monitor reports, cleaning recap, charts and the activity log; read the legacy work log; manage staff names and supervisor accounts (add, rename, change password, deactivate, delete) |

Kato Bot is open to everyone; QR stickers are made in the supervisor dashboard.

> **Change the default supervisor password after the first sign-in.** It is
> committed in `migrations/0004_pengguna.sql` and therefore public.

Staff have no password on purpose: many of them are not comfortable with
sign-ins. The phone remembers the last chosen name as the default in the "who
is doing this?" prompt. Anyone could pick any name; every action is written to
the activity log under the chosen name together with its photo, so the
supervisor can trace it.

An account can be deleted only when it has no history: with any report or
work attached the API answers `409` and the account should be deactivated
instead. The signed-in account and the last active supervisor cannot be
deleted; every deletion is logged.

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
| Frontend | React 18 + Vite + Tailwind CSS, glassmorphism design (see `design.md`) |
| i18n | hand-rolled dictionary in `web/src/lib/i18n.tsx`, no library |
| LLM (text) | DeepSeek `deepseek-chat` in JSON mode — no training, no dataset |
| LLM (vision) | any OpenAI-compatible vision model, default Gemini `gemini-3.6-flash` — judges proof photos |

The frontend and the API live in the same Worker on the same origin, so there is
no CORS configuration and only one thing to deploy. The Worker also has a daily
cron (`0 10 * * *` UTC = 17:00 WIB) that writes the daily summary.

---

## Running locally

```bash
npm install
cp .dev.vars.example .dev.vars   # fill in LLM_API_KEY, VISION_API_KEY and AUTH_SECRET (without it sign-in fails with 500)

npm run db:local                 # apply migrations to the local D1
npm run db:seed                  # legacy toilets (older reports point at them)
npm run db:seed:cleaning         # the current location list

npm run build                    # the frontend must be built once before wrangler dev
npm run dev                      # Vite (5173) + Worker (8787) + database watcher
```

`npm run dev` is the only command to keep running. Frontend changes reload
in the browser, `src/` changes reload the Worker, and `scripts/watch-db.mjs`
applies pending migrations at start and whenever a file in `migrations/` or
`seed/` is saved (local database only). In VS Code it starts by itself when the
folder is opened (`.vscode/tasks.json`; allow automatic tasks once). The app is
always at `http://localhost:5173`: a second `npm run dev` stops with "port in
use" instead of opening elsewhere, and a Worker left on port 8787 by an earlier
run of this project is stopped first (`scripts/free-dev-port.mjs`). Restart it
only after changing `package.json` dependencies.

| Page | URL |
|---|---|
| Home (choose reporter / staff / supervisor) | `http://localhost:5173/` |
| Reporter: pick building and floor (kept as `/student` so old links work) | `http://localhost:5173/student` |
| Report form (QR target) | `http://localhost:5173/report/C-2` |
| Staff: complaints and daily tasks | `http://localhost:5173/staff` |
| Staff with a location picked | `http://localhost:5173/staff/C-2`, `http://localhost:5173/clean/C-2` |
| Public report board | `http://localhost:5173/reports` |
| One report's status | `http://localhost:5173/reports/<id>` |
| Leaderboard | `http://localhost:5173/leaderboard` |
| Supervisor dashboard | `http://localhost:5173/supervisor` |

The old Indonesian URLs (`/lapor/A-1`, `/petugas`, `/spv`, `/laporan`, …)
redirect to the new ones, so QR stickers printed before the rename keep working.

---

## Deploying

```bash
npx wrangler secret put LLM_API_KEY
npx wrangler secret put VISION_API_KEY # key for the vision model; see wrangler.jsonc vars
npx wrangler secret put AUTH_SECRET   # a long random string

npm run db:remote                     # migrations against production D1
npm run db:seed:remote
npm run deploy
```

Run `db:remote` **before** `deploy`: the code reads tables and columns that
the latest migrations create (`0008` moves the whole schema to English, `0009`–`0011` add cleaning reports, daily tasks and report locations), and the
API fails until they exist. Back up production first:
`npx wrangler d1 export kato --remote --output backup.sql`.

The R2 bucket does **not** need public access — photos are served back by the
Worker at `GET /api/uploads/<key>`.

### The vision model

`deepseek-chat` cannot see images, so proof photos go to a second model. The
call uses the OpenAI chat-completions format with an `image_url` part, so any
provider that speaks it works; only configuration changes.

| Setting | Where | Value |
|---|---|---|
| `VISION_BASE_URL` | `wrangler.jsonc` → `vars` | `https://generativelanguage.googleapis.com/v1beta/openai` |
| `VISION_MODEL` | `wrangler.jsonc` → `vars` | `gemini-3.6-flash` — switch to `gemini-3.5-flash-lite` for a larger free quota |
| `VISION_API_KEY` | `wrangler secret put` / `.dev.vars` | key from <https://aistudio.google.com/apikey>; comma-separate several keys to fail over when one is rate-limited; falls back to `LLM_API_KEY` when unset |

Alternatives, each a two-line change: OpenAI (`https://api.openai.com/v1`,
`gpt-4o-mini`), OpenRouter (`https://openrouter.ai/api/v1`, any vision model),
Anthropic (`https://api.anthropic.com/v1`, `claude-haiku-4-5-20251001`).

Gemini's free tier costs nothing and needs no card, but is capped per minute
and per day; the live numbers are at <https://aistudio.google.com/rate-limits>.
One closed report is one request, so a campus stays far below the cap. Note
that on the free tier Google may use submitted photos to improve its products;
enabling billing on that project turns this off at a cost that is effectively
zero at this volume.

**Gemini model names expire.** The first deploy used `gemini-2.5-flash`, which
Google had already closed to new users; the 404 named the replacement. Errors
from the vision call are stored verbatim in the activity log, so look there first:

```bash
npx wrangler d1 execute kato --remote --command \
  "SELECT created_at, details FROM activity_log WHERE action='verification_failed' ORDER BY id DESC LIMIT 3"
```

### Checking how much the vision model is used

Every check is logged, so usage can be counted without opening Google's console:

```bash
npx wrangler d1 execute kato --remote --command "
SELECT date(created_at) AS day, action, COUNT(*) AS count
  FROM activity_log
 WHERE action IN ('proof_rejected','verification_failed','work_logged')
    OR (action='status_changed' AND (details LIKE '%\"verdict\":\"clean\"%'
                                      OR details LIKE '%\"hasil\":\"bersih\"%'))
 GROUP BY day, action ORDER BY day DESC"
```

`status_changed` rows with `verdict: clean` (and legacy `work_logged` rows) are accepted
photos, `proof_rejected` rejected ones, `verification_failed` failed calls;
together they are the day's request count. An `LLM HTTP 429` in the log means the daily quota ran out.

### Automatic deploys (Cloudflare Workers Builds)

Set the deploy command to `npx wrangler deploy` and leave the build command
empty. The frontend builds itself through `build.command` in `wrangler.jsonc`,
which also installs dependencies when `node_modules` is missing from a clean
checkout.

Secrets and database migrations are not automated — run `wrangler secret put`
and `npm run db:remote` once, by hand.

---

## Printing QR codes

**From the app:** sign in as supervisor → dashboard → **QR lokasi** tab. One
sticker per location, generated in the browser from the live location list,
bilingual (Indonesian + English) on the sticker. Filter by location, press
**Print** (only the stickers are printed, three per row on
A4), or download a single sticker as PNG. Each code points at
`<this site>/report/<location>` (e.g. `/report/C-2`, `/report/C-HALAMAN`);
reporters and staff share it (staff switch to `/staff/<location>`).
Stickers printed earlier, pointing at `/report/<building>-<floor>`, still work.

**From the command line** (batch PNGs plus a print sheet):

```bash
BASE_URL=https://ai-complaint.yvrtz.workers.dev npm run qr
```

Produces `qr-codes/<location>.png` plus `qr-codes/cetak.html`, an A4
print sheet with bilingual stickers. The folder is emptied on every run so that
codes from an older location list can never be printed by accident.

### Changing the location list

Edit `seed/cleaning-areas.sql`, re-run it (`npm run db:seed:cleaning`, or
`db:seed:cleaning:remote`), then regenerate the QR codes — in that order,
because the codes are generated from whatever is active in the database. In
that file, floor `0` is a building's yard and `NULL` the whole building or a
place outside the buildings.

The seed file is safe to run repeatedly, including once reports exist. It
deactivates every location and then reactivates the ones listed, rather than
deleting rows. A location removed from the list simply stops appearing in the
app; old reports pointing at it keep their location and history intact.
Reports filed before migration 0011 point at a legacy toilet
(`seed/toilets.sql`) and still show it.

---

## API surface

**Public** (reporters and staff use these without signing in)

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/api/auth/login`, `/api/auth/register`, `/api/auth/logout` | sign in, register, sign out |
| `GET` | `/api/auth/me` | current session |
| `GET` | `/api/cleaning/areas` | every location, and the campus boundary |
| `GET` | `/api/cleaning/areas/:id` | one location (what a QR points at) plus the campus boundary |
| `POST` | `/api/cleaning/reports` | staff: daily-task report `{staff_id, area_id, tasks[{task, photo_key}], note?, position?}`; `422` for a photo that is too old or reused |
| `GET` | `/api/cleaning/reports/public` | latest daily-task reports for the public board |
| `POST` | `/api/reports` | file a report `{area_id, description, photo_key}` |
| `GET` | `/api/reports/public` | public report board |
| `GET` | `/api/reports/mine` | the signed-in reporter's own reports |
| `GET` | `/api/reports/open?building=&floor=` | reports still waiting for staff (filters optional) |
| `GET` | `/api/reports/:id` | one report |
| `PATCH` | `/api/reports/:id` | staff: `{status, staff_id, proof_photo_key?}`; claiming (`in_progress`) is not a lock and may be taken over; closing needs a proof photo, checked by the vision model (`422` when the place still looks dirty or is the wrong place, `502` when the check fails); a resolved report answers `409` |
| `GET` | `/api/staff` | the names on the staff dropdown |
| `POST` | `/api/uploads?kind=report\|proof\|work\|cleaning` | upload a photo |
| `GET` | `/api/uploads/:key` | serve a photo from R2 |
| `GET` | `/api/leaderboard` | leaderboard |
| `GET` | `/api/ask` | the daily question budget |
| `POST` | `/api/ask` | ask a question about the report data; body `{question, history[]}`; `429` once a budget is spent |

**Supervisor only**

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/reports` | dashboard list; filters `status, priority, area_id, building, from, to, hour_from, hour_to` (WIB; hours as `H` or `HH:MM`) |
| `POST` | `/api/reports/:id/reanalyze` | re-run a failed analysis |
| `DELETE` | `/api/reports/:id` | delete permanently, logged with a full copy |
| `GET` | `/api/cleaning/reports` | daily-task reports; filters `staff_id, area_id, alerts=1, from, to, hour_from, hour_to` |
| `GET` | `/api/cleaning/recap?date=` | one WIB day per staff member: tasks done and gaps |
| `GET` | `/api/work-logs` | legacy staff work log (read-only); filters `staff_id, toilet_id, building, from, to, hour_from, hour_to` |
| `GET` | `/api/summary?date=` | the stored daily summary |
| `GET` | `/api/summary/stats?date=` | counters for the day |
| `GET` | `/api/summary/charts?days=` | chart data (max 90), including `statuses` and `aging` |
| `POST` | `/api/summary/generate` | write the daily summary now |
| `GET` | `/api/activity` | activity log (action, time filter) |
| `GET` `POST` | `/api/users` | list; add a staff name `{role:'staff', name}` or a supervisor `{role:'supervisor', username, name, password}` |
| `PATCH` | `/api/users/:id` | change name, password (supervisors only), or active status |
| `DELETE` | `/api/users/:id` | delete an account without history (`409` when it has records; `400` for yourself or the last active supervisor) |

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

Every SQL statement lives under `repositories/`, so moving off D1 would mean
rewriting that one directory. The rule that a report can only be closed with
evidence lives in `domain/types.ts`, so it holds no matter which entry point
asks — an HTTP request today, a cron job or an admin tool tomorrow.

## Project structure

```
src/
  index.ts               composition root: routes, ETag, SPA fallback, cron handler
  env.ts                 infrastructure bindings and configuration
  domain/types.ts        entities, enums, DTO mapping, closing rule
  adapters/
    llm.ts               prompts, few-shot examples, output validation, proof-photo check
    storage.ts           R2 photo storage, prefixes and limits
    session.ts           JWT cookie sessions and role guards
    password.ts          PBKDF2 hashing
    clock.ts             UTC ↔ WIB day conversion
    memo.ts              in-memory cache and the Cache-Control presets (HTTP_CACHE)
  repositories/          reports, cleaning, work-logs (legacy, read-only), users,
                         activity, summaries,
                         time-filter (the shared date/hour filter),
                         analytics (the aggregate queries the question tools run)
  services/
    report-service.ts    filing, claiming/closing (changeStatus), deleting a report
    cleaning-service.ts  daily-task reports: photo, GPS and duplicate checks, recap
    work-log-service.ts  listWorkLogs only: the legacy work log
    analysis-service.ts  per-report analysis, run after the response is sent
    summary-service.ts   daily summary, statistics, charts, leaderboard
    ask-service.ts       tool definitions, system prompt and daily budget for questions
    user-service.ts      registration, sign-in, account management and deletion
    activity-service.ts  writing and reading the audit trail
  routes/                auth, reports, cleaning, work-logs (GET only), staff, uploads,
                         summary, activity, users, leaderboard, ask

web/src/
  main.tsx               routes, legacy redirects, lazy pages, mounts FloatingChat once
  lib/i18n.tsx           dictionary and language switcher
  lib/theme.tsx          dark/light theme provider (dark by default)
  lib/session.tsx        session context
  lib/staff.ts           the staff name last used on this phone
  lib/api.ts             typed API client
  lib/polling.ts         polling that pauses while the tab is hidden
  lib/places.ts, server-clock.ts, motion.tsx   location helpers, server time, animation
  components/Header.tsx  page header, back button, floating pill bar
  components/Tracker.tsx three-step status timeline
  components/Camera.tsx  live in-page camera (no gallery uploads)
  components/Select.tsx  the app's own dropdown, always opens downward
  components/ClockPicker.tsx, TimeFilter.tsx   dial time picker and the shared time filter
  components/FloatingChat.tsx, AskPanel.tsx    Kato Bot: draggable floating icon and its chat
  components/ComplaintCard.tsx, DailyTasks.tsx, StaffPicker.tsx   staff page
  components/OverviewPanel.tsx, CleaningPanel.tsx, ActivityPanel.tsx,
             WorkLogPanel.tsx, AccountsPanel.tsx, QrCodesPanel.tsx   dashboard tabs
  components/charts/     validated palette (colors.ts) and the chart set: AreaChart, BarChart,
                         StackedBarChart, Donut, RadialGauge, RadialBars, HourClock, StaffRings,
                         Treemap, Heatmap, AgingBars, Sparkline, KpiCard, CountUp
  pages/                 Home, ReportForm, ReportStatus, PublicReports, StaffHome, Login,
                         Register, Leaderboard, SupervisorDashboard
  ../public/peta-lokasi-gedung.jpg    campus building map

migrations/              D1 schema, applied in order (0001–0011)
seed/cleaning-areas.sql  the current location list and staff assignments
seed/toilets.sql         legacy toilet list that older reports point at
scripts/generate-qr.mjs  QR codes and the A4 print sheet
scripts/build-frontend.mjs   builds the frontend before wrangler deploy
scripts/watch-db.mjs, free-dev-port.mjs   local dev helpers
scripts/build-docs.mjs   renders docs/*.html to PDF
docs/                    technical reference and general guide (HTML + PDF)
```

### Caching and performance

- **In-memory cache** (`adapters/memo.ts`), per Worker isolate: locations 5 min,
  staff names 60 s, chart data 60 s, stored summary 60 s, stats 15 s,
  leaderboard 30 s, cleaning recap 20 s. A write in the same isolate drops the
  affected entries at once. The Cloudflare Cache API is not used (it does not
  work on `workers.dev`).
- **HTTP**: `Cache-Control` presets per route (`HTTP_CACHE`), and weak ETags
  (`hono/etag`) on the GET routes of summary, activity, cleaning, reports,
  work-logs, users, staff and leaderboard, so a poll that finds nothing new
  gets an empty `304`. Photos are excluded.
- **Frontend**: polling stops while the tab is hidden, the report list polls
  only while its tab is shown, every page and dashboard tab (and Kato Bot) is a
  lazy chunk, React sits in its own vendor chunk, fonts load via
  `<link preconnect>`, and hashed assets are `immutable` (`web/public/_headers`).

---

## Design notes

Each of these is a decision that cost something elsewhere, so the reasoning is
recorded rather than the mechanics.

**Analysis runs after the response is sent** (`ctx.waitUntil`). The reporter gets
an instant confirmation while the LLM call continues in the background; the
confirmation page polls until the result lands. A synchronous call would have put
a three-second wait between the reporter and the send button.

**A failed LLM call never loses a report.** The row is marked
`ai_status = 'failed'` with the error text, still appears on the dashboard without
AI labels, and can be re-analysed from a button. If the DeepSeek API is down, the
system degrades into an ordinary reporting tool instead of failing.

**LLM output is never trusted as-is.** Every response is validated with Zod and
then forced into the enums the database knows: unknown categories are dropped and
an unrecognised priority falls back to `medium`.

**Per-call latency is recorded** in `ai_ms` — useful as quantitative evidence in
the results chapter.

**Reporting does not require an account, but an account is rewarded.** The core
path — scan, type, send — stays open to anyone, because a registration wall at
the door kills adoption. Reports filed while signed in attach to that account and
count towards the leaderboard; anonymous reports are still accepted and still
handled, they just do not rank.

**Closing a report demands evidence, not a claim.** Reporters must attach a photo
of the condition, and staff must upload a proof photo before a report can be
marked resolved. Claiming a report is deliberately *not* a lock (a colleague may
take over, and the handover is logged), but closing is final: a resolved report
cannot be reopened. Both photos are enforced on the server, not merely hidden in the UI.
The proof photo is shown on the public board so that "already handled" can be checked
by anyone.

**The proof photo is judged before it is accepted.** A photo alone only proves
that *something* was photographed. So `PATCH /api/reports/:id` hands the
uploaded photo, together with the original complaint, to a vision model and
asks two questions: does it show the reported location, and does it look clean?
Only a `clean` verdict lets the status become `resolved`; `dirty` and `wrong_place`
come back as `422` with the model's one-sentence reason, the photo is deleted
from R2, and the attempt is written to the activity log as `proof_rejected`. The
accepted verdict is stored on the report (`proof_*`) and shown under the
photo. The text model (DeepSeek) cannot see images, which is why the vision
model has its own `VISION_*` configuration; anything OpenAI-compatible works.
When the vision endpoint itself is down the close is refused with `502` rather
than waved through — the rule is "clean, verified", and an outage does not
lower that bar. This is the opposite of the text analysis, which deliberately
degrades: an unanalysed complaint is still useful, unverified proof is not.

**Questions are answered through tools, not by reading the table.** The
model receives four function definitions (`count_reports`, `resolution_time`,
`list_reports`, `daily_summary`), picks one or two, and answers from the
aggregate that comes back. Groupings and filter values are whitelisted in
`repositories/analytics.ts` and bound as parameters, so the model chooses *which*
query runs but never writes SQL. `list_reports` returns the model-written
`summary`, never the raw complaint text, which keeps a reporter's words out of
the asker's prompt. The endpoint is public, so it has two audiences: the signed-in
supervisor may group by `staff`; everyone else gets the same tools minus that
grouping, and staff names are stripped from listed reports. A question costs
roughly 3–4k tokens (about half served from DeepSeek's prompt cache), only the
last six turns travel with a follow-up, and `ask-service.ts` refuses with
`429` after `DAILY_LIMIT` (50) questions a day overall or `PER_IP_LIMIT` (20)
from one anonymous address (a hashed IP kept in the activity row). Every
question is written to the activity log with the tools it called and the tokens
it used.

**Dark mode is a palette swap, not a second stylesheet.** Every colour in
`tailwind.config.js` reads an RGB triplet from a CSS variable; `:root` in
`web/src/index.css` holds the light values and `.dark` the dark ones, so
components keep one set of classes (`text-ink-900`, `bg-surface`, `bg-glass`).
`tetap-*` colours never flip (brand marks, photo overlays). The choice lives in
`localStorage` (`theme`) and defaults to dark; a tiny inline script in
`index.html` applies it before React loads, so a visitor never sees a flash of
the wrong theme.

**The vision call gets a large token budget.** Gemini 3.x "thinks" before it
answers and the thinking counts against `max_tokens`; a budget of 300 cut the
JSON off mid-object and surfaced as "response is not JSON". The call now allows
2,000 tokens; the answer itself stays short because the reason is capped at 25
words in the prompt.

**The activity log cannot be erased from the app.** Every report, analysis result,
status change and handover, cleaning report, rejected proof photo, deletion, question, supervisor sign-in, account change, and generated summary is
written to the `activity_log` table. That table deliberately has no foreign key to
`reports`: a deleted report is exactly the one that most needs to stay traceable,
so its full contents are copied into the log before the row disappears.
Management can still see what was removed, by whom, and when.

**Chart colours are computed, not eyeballed.** The series palette and the priority
palette both pass checks for lightness band, chroma floor, colour-vision
separation (deutan/protan/tritan), and contrast against the surface. The values
live in `web/src/components/charts/colors.ts` — do not change them without
re-running the validator.

**The public board is readable by anyone but writable only by staff.** `/reports`
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

**The look follows `design.md`.** A neutral glassmorphism system with one blue
accent, dark by default. The campus map (`peta-lokasi-gedung.jpg`, the "Peta
Lokasi Gedung" poster of UPI Tasikmalaya) is shown on the report pages.

**Photos never leave the app's own domain.** `GET /api/uploads/<key>` reads the
object straight from the R2 binding, restricts access to the `report/`, `proof/`, `work/` and
`cleaning/` prefixes (plus the pre-rename `laporan/`, `bukti/`, `kerja/`), and honours ETags so a browser downloads each photo once. This
also sidesteps `pub-*.r2.dev`, whose DNS is hijacked by several Indonesian ISPs —
images silently fail to load on campus networks.
