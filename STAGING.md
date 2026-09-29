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

## Setiap checkpoint bisa dicoba, dalam satu domain (`/checkpoint`)

Setiap checkpoint yang sudah dilaporkan tetap online, persis seperti saat checkpoint itu selesai.
Semuanya dibuka lewat satu domain staging:

| Alamat | Isi |
|---|---|
| `/checkpoint` | hub: daftar checkpoint, fitur baru masing-masing, dan tombol untuk mencobanya |
| `/checkpoint2` | pindah ke checkpoint 2, lalu buka berandanya |
| `/checkpoint2/lapor/A-1` | pindah ke checkpoint 2, lalu buka halaman `/lapor/A-1` |
| alamat lain | aplikasi checkpoint yang sedang dipilih (bawaan: checkpoint terbaru) |

Cara kerjanya:

- **Router.** Worker `ai-complaint-staging` adalah router (`staging/router.mjs`). Pilihan checkpoint
  disimpan di cookie, dan setiap permintaan diteruskan lewat *service binding* ke Worker
  `ai-complaint-staging-cpN`. Worker checkpoint sendiri tidak punya alamat publik.
- **Satu browser, satu checkpoint.** Aplikasi memakai alamat absolut seperti `/api/…` dan `/lapor/…`,
  jadi satu browser hanya membuka satu checkpoint dalam satu waktu. Checkpoint yang aktif ditandai
  di pojok kiri bawah layar. Untuk membandingkan dua checkpoint berdampingan, pakai jendela
  penyamaran atau browser lain.
- **Login terpisah.** Cookie login disimpan terpisah per checkpoint (`cp1_…`, `cp2_…`), jadi sesi dari
  satu checkpoint tidak pernah terbaca oleh checkpoint lain.
- **Database.** Setiap checkpoint punya database D1 sendiri, karena struktur tabelnya berubah antar
  checkpoint. Checkpoint 1 memakai `kato-staging`, dan checkpoint 2–6 memakai `kato-staging-cp2` sampai
  `kato-staging-cp6`. Database dibuat dan diisi data toilet otomatis saat checkpoint itu pertama kali
  di-deploy. Totalnya 6 database untuk staging, jadi perhatikan batas 10 database D1 di paket gratis.
- **Foto.** Semua checkpoint berbagi bucket R2 `kato-staging`.
- **Cron.** Ringkasan harian otomatis hanya berjalan di checkpoint terbaru, karena paket gratis
  membatasi 5 cron. Cron checkpoint sebelumnya dilepas otomatis. Di checkpoint lama, ringkasan tetap
  bisa dibuat manual dari dashboard.

Setiap `node scripts/staging.mjs` men-deploy Worker checkpoint terbaru, lalu router. Checkpoint
sebelumnya tidak disentuh, jadi tetap berjalan dengan kode lamanya. Teks hub ada di
`staging/checkpoints.mjs`, dan halamannya dibuat oleh `staging/journey.mjs`.

## Dokumentasi laporan progress (`/dokumentasi`)

Laporan progress lengkap, yang menjelaskan staging dan keenam checkpoint dari sisi umum maupun
teknis, ada di `staging/docs/laporan-progress.html`. Situs staging menyajikannya di `/dokumentasi`,
dan PDF-nya di `/dokumentasi.pdf`. Setelah mengubah HTML-nya, buat ulang PDF-nya dengan Chrome, lalu
deploy lagi:

```bash
"C:/Program Files/Google/Chrome/Application/chrome.exe" --headless=new --no-pdf-header-footer \
  --print-to-pdf=staging/docs/laporan-progress.pdf staging/docs/laporan-progress.html
node scripts/staging.mjs
```
