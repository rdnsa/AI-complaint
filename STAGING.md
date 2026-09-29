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
| `checkpoint-6` | `defb699` | Kamera langsung, panel kerja staff, filter waktu, beranda per peran (mahasiswa, staff, supervisor), peta kampus interaktif, rebrand Kato Report, PRD dan diagram, failover API key. Sama dengan sistem final |

Saat ini `staging` berada di **checkpoint 1**.

## Persiapan (sekali saja)

```bash
npx wrangler d1 create kato-staging     # salin database_id ke staging.config.json
npx wrangler r2 bucket create kato-staging
```

Isi `domain` di `staging.config.json` (misalnya `progress.domainanda.com`). Domain itu harus
berupa zone di akun Cloudflare yang sama. Kalau dibiarkan kosong, staging hanya bisa diakses
lewat `ai-complaint-staging.<akun>.workers.dev`.

Staging memakai secret yang **sama** dengan `main`. Secret di Cloudflare tidak bisa dibaca
kembali, jadi nilainya diambil dari `.dev.vars` lokal (file ini tidak di-commit). Salin
`.dev.vars.example` menjadi `.dev.vars`, lalu isi dengan nilai yang sama seperti secret `main`:

```
LLM_API_KEY="..."
VISION_API_KEY="key1,key2,key3,key4"   # boleh beberapa key, dipisah koma
AUTH_SECRET="..."
PETUGAS_PASSWORD="..."   # hanya dipakai di checkpoint 1–2 (login petugas dengan sandi bersama)
```

Deploy dulu sekali (lihat di bawah) agar Worker staging ada, lalu kirim semua secret sekaligus:

```bash
node scripts/staging.mjs secrets
```

Setiap deploy (`node scripts/staging.mjs` atau `... seed`) juga otomatis mengirim ulang secret.
Mulai checkpoint 6, kalau satu key kena limit, key berikutnya dipakai otomatis. Sebelum checkpoint 6
kodenya hanya mengenal satu key, jadi skrip otomatis hanya mengirim key pertama.

Jalankan `node scripts/staging.mjs secrets` lagi setiap kali secret di `main` berganti.

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

## Halaman perjalanan (`/checkpoint`)

Setiap deploy staging juga membuat halaman penjelasan untuk teman yang tidak ikut development:

- `/checkpoint`: garis waktu semua checkpoint
- `/checkpoint1`, `/checkpoint2`, … `/checkpoint6`: apa yang berubah, untuk siapa, dan kenapa

Halaman hanya dibuat untuk checkpoint yang sudah di-merge ke `staging`, jadi checkpoint berikutnya
tidak terlihat sebelum dilaporkan. Isinya ada di `staging/checkpoints.mjs`, dan tampilannya
dibuat oleh `staging/journey.mjs`. Keduanya hanya ada di branch `staging`.
