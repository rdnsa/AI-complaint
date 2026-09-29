# Branch `staging`: laporan progress bertahap

`main` berisi sistem final. `staging` dipakai untuk melaporkan progress secara bertahap,
checkpoint demi checkpoint. Staging di-deploy ke Worker, database D1, bucket R2, dan domain
yang terpisah dari `main`, jadi data produksi tidak pernah tersentuh.

## 6 checkpoint

| Tag | Commit di `main` | Isi yang dilaporkan |
|---|---|---|
| `checkpoint-1` | `dd9c91a` | Inti sistem: form keluhan toilet, klasifikasi dan prioritas otomatis dengan LLM, dashboard petugas, ringkasan harian (cron), foto lewat R2 |
| `checkpoint-2` | `feb7e49` | Identitas UPI Tasikmalaya, QR per lantai, dwibahasa, lokasi sesuai gedung asli, pelapor bisa melacak status, daftar laporan publik |
| `checkpoint-3` | `2e18c48` | Bukti foto wajib saat laporan diselesaikan, log aktivitas, grafik, akun berperan (menggantikan sandi bersama), papan peringkat |
| `checkpoint-4` | `d2e7d72` | Backend berlapis (routes, services, repositories), skema berbahasa Inggris, dashboard analitis, dokumentasi teknis dan panduan umum |
| `checkpoint-5` | `e44958b` | Verifikasi foto bukti dengan vision AI (Gemini), tanya-jawab AI atas data laporan |
| `checkpoint-6` | `8aa3c08` | Kamera langsung, panel kerja staff, filter waktu, beranda per peran (mahasiswa, staff, supervisor), peta kampus interaktif. Sama dengan sistem final |

Saat ini `staging` berada di **checkpoint 1**.

## Persiapan (sekali saja)

```bash
npx wrangler d1 create kato-staging     # salin database_id ke staging.config.json
npx wrangler r2 bucket create kato-staging
```

Isi `domain` di `staging.config.json` (misalnya `progress.domainanda.com`). Domain itu harus
berupa zone di akun Cloudflare yang sama. Kalau dibiarkan kosong, staging hanya bisa diakses
lewat `ai-complaint-staging.<akun>.workers.dev`.

Secret disimpan per Worker, jadi harus diisi lagi untuk Worker staging. Pertama, deploy dulu
(lihat di bawah) agar Worker-nya ada. Setelah itu:

```bash
node scripts/staging.mjs config
npx wrangler secret put LLM_API_KEY      -c wrangler.staging.jsonc
npx wrangler secret put AUTH_SECRET      -c wrangler.staging.jsonc
npx wrangler secret put PETUGAS_PASSWORD -c wrangler.staging.jsonc   # checkpoint 1–2 saja
npx wrangler secret put VISION_API_KEY   -c wrangler.staging.jsonc   # mulai checkpoint 5 (opsional)
```

## Deploy checkpoint pertama

```bash
git switch staging
node scripts/staging.mjs seed     # migrasi D1 + isi data toilet + deploy
```

## Naik ke checkpoint berikutnya

```bash
git switch staging
git merge --no-ff checkpoint-2 -m "Checkpoint 2"
node scripts/staging.mjs seed     # pakai `seed` bila daftar toilet berubah, kalau tidak cukup tanpa argumen
git push origin staging --tags
```

Ulangi langkah yang sama untuk `checkpoint-3` sampai `checkpoint-6`. Migrasi D1 berjalan
berurutan, sehingga database staging selalu cocok dengan kode di checkpoint tersebut.

Jangan pernah merge `staging` ke `main`. Arahnya selalu satu: `main` → `staging`.
