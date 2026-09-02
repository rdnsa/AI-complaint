# AI Complaint — Sistem Klasifikasi & Prioritas Keluhan Toilet Kampus

Mahasiswa memindai QR di pintu toilet, menulis keluhan dengan bahasa sehari-hari,
lalu LLM mengubahnya menjadi tiket kerja terstruktur untuk petugas kebersihan.

```
QR di pintu WC  →  form keluhan  →  LLM (kategori + prioritas + rekomendasi)  →  dashboard petugas
                                          ↓
                                cron 17.00 WIB → ringkasan harian
```

## Fitur

1. **Klasifikasi otomatis** — `kebersihan`, `perlengkapan`, `kerusakan`, `bau`, `genangan`, `lainnya` (boleh lebih dari satu).
2. **Penentuan prioritas** — `rendah` / `sedang` / `tinggi`, dengan aturan berbasis risiko keselamatan.
3. **Ringkasan harian** — merangkum seluruh laporan sehari, menyebut lokasi paling bermasalah dan tindakan mendesak.

Pelengkapnya: foto lampiran (R2), alur status `baru → diproses → selesai`, dan
statistik harian untuk dashboard.

## Teknologi

| Bagian | Teknologi |
|---|---|
| Bahasa | TypeScript |
| Runtime | Cloudflare Workers |
| Framework API | Hono |
| Database | Cloudflare D1 (SQLite) |
| Penyimpanan foto | Cloudflare R2 |
| Frontend | React 18 + Vite + Tailwind CSS |
| LLM | DeepSeek `deepseek-chat` (JSON mode), tanpa training |

Frontend dan API berada pada satu Worker dan satu domain, sehingga tidak ada
konfigurasi CORS dan hanya perlu satu kali deploy.

## Menjalankan secara lokal

```bash
npm install
cp .dev.vars.example .dev.vars     # lalu isi LLM_API_KEY, AUTH_SECRET, PETUGAS_PASSWORD

npm run db:local                   # jalankan migrasi ke D1 lokal
npm run db:seed                    # isi daftar WC contoh

npm run build                      # frontend perlu di-build sekali sebelum wrangler dev
npm run dev                        # Vite (5173) + Worker (8787) berjalan bersamaan
```

Buka `http://localhost:5173/lapor/A-2-PRIA` untuk halaman mahasiswa dan
`http://localhost:5173/petugas` untuk dashboard.

## Deploy

```bash
npx wrangler secret put LLM_API_KEY
npx wrangler secret put AUTH_SECRET          # string acak panjang
npx wrangler secret put PETUGAS_PASSWORD

npm run db:remote                            # migrasi ke D1 produksi
npm run db:seed:remote
npm run deploy
```

Agar foto bisa dilihat di dashboard, aktifkan **Public Development URL** pada
bucket R2 `kato`, lalu samakan nilainya dengan `R2_PUBLIC_URL` di `wrangler.jsonc`.

### Deploy otomatis (Cloudflare Workers Builds)

Cukup setel **deploy command** ke `npx wrangler deploy`; kolom build command
boleh dibiarkan kosong. Frontend dibangun sendiri lewat `build.command` di
`wrangler.jsonc`, yang juga memasang dependensi bila `node_modules` belum ada
pada checkout yang bersih.

Secret dan migrasi database tidak ikut otomatis — jalankan `wrangler secret put`
dan `npm run db:remote` sekali di awal.

## Mencetak QR

```bash
BASE_URL=https://<worker-kamu>.workers.dev npm run qr
```

Menghasilkan `qr-codes/<ID-WC>.png` dan `qr-codes/cetak.html` (halaman A4 siap cetak).
Sebelum mencetak, sesuaikan daftar WC di `seed/toilets.sql` dengan denah kampus.

## Struktur

```
src/
  index.ts             entry Worker: routing API, SPA fallback, handler cron
  types.ts             tipe bersama + konversi baris D1 → DTO
  lib/llm.ts           prompt, few-shot, dan validasi keluaran LLM
  lib/analisis.ts      analisis satu laporan (dijalankan setelah respons terkirim)
  lib/ringkasan.ts     ringkasan harian (dipakai cron dan tombol manual)
  lib/auth.ts          sesi petugas berbasis cookie JWT
  lib/waktu.ts         konversi hari UTC ↔ WIB
  routes/              reports, toilets, uploads, summary, auth
web/src/
  pages/Lapor.tsx      form mahasiswa (tujuan QR)
  pages/StatusLaporan.tsx  konfirmasi + hasil analisis
  pages/Dashboard.tsx  dashboard petugas
migrations/            skema D1
seed/toilets.sql       daftar WC
scripts/generate-qr.mjs
```

## Catatan desain

**Analisis LLM berjalan setelah respons dikirim** (`ctx.waitUntil`). Mahasiswa
mendapat konfirmasi seketika, sedangkan hasil analisis menyusul dan halaman
konfirmasi melakukan polling sampai siap.

**Kegagalan LLM tidak pernah menghilangkan laporan.** Baris yang gagal ditandai
`ai_status = 'gagal'` beserta pesan errornya, tetap tampil di dashboard tanpa
label AI, dan bisa dianalisis ulang lewat tombol.

**Keluaran LLM tidak dipercaya mentah-mentah.** Setiap respons divalidasi Zod
lalu dipaksa masuk enum yang dikenal database; kategori asing dibuang dan
prioritas tak dikenal jatuh ke `sedang`.

**Latensi tiap panggilan dicatat** di kolom `ai_ms`, berguna sebagai data
kuantitatif pada bab hasil dan pembahasan.
