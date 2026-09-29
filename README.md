# AI Complaint — Sistem Klasifikasi & Prioritas Keluhan Toilet Kampus

Dibuat untuk **UPI Kampus Tasikmalaya**, Jln. Dadaha No. 18. Mahasiswa memindai
QR di pintu toilet, menulis keluhan dengan bahasa sehari-hari, lalu LLM
mengubahnya menjadi tiket kerja terstruktur untuk petugas kebersihan.

```
QR di lantai WC  →  pilih toilet  →  tulis keluhan  →  LLM (kategori + prioritas + rekomendasi)
                                                             ↓
                                          dashboard petugas + cron 17.00 WIB → ringkasan harian
```

Satu QR mewakili satu **lantai** pada satu gedung, bukan satu WC. Jenis toilet
(pria/wanita/disabilitas) dipilih pelapor di formulir, sehingga jumlah stiker
yang perlu dicetak dan dirawat jauh lebih sedikit.

## Fitur

1. **Klasifikasi otomatis** — `kebersihan`, `perlengkapan`, `kerusakan`, `bau`, `genangan`, `lainnya` (boleh lebih dari satu).
2. **Penentuan prioritas** — `rendah` / `sedang` / `tinggi`, dengan aturan berbasis risiko keselamatan.
3. **Ringkasan harian** — merangkum seluruh laporan sehari, menyebut lokasi paling bermasalah dan tindakan mendesak.

Pelengkapnya: papan laporan terbuka untuk siapa saja, foto lampiran (R2),
pelacakan status oleh pelapor tanpa login,
alur status `baru → diproses → selesai`,
statistik harian untuk dashboard, peta lokasi gedung di halaman depan, serta
antarmuka **dwibahasa Indonesia–Inggris** yang bisa diganti dari header.

## Teknologi

| Bagian | Teknologi |
|---|---|
| Bahasa | TypeScript |
| Runtime | Cloudflare Workers |
| Framework API | Hono |
| Database | Cloudflare D1 (SQLite) |
| Penyimpanan foto | Cloudflare R2 (disajikan lewat Worker) |
| Frontend | React 18 + Vite + Tailwind CSS |
| Dwibahasa | kamus sendiri di `web/src/lib/i18n.tsx`, tanpa library |
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

Buka `http://localhost:5173/lapor/A-1` untuk halaman mahasiswa dan
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

Bucket R2 tidak perlu dibuka untuk akses publik: foto disajikan kembali oleh
Worker lewat `GET /api/uploads/<key>`. Selain menghilangkan satu langkah
konfigurasi, ini juga menghindari domain `pub-*.r2.dev` yang DNS-nya dibajak
sebagian ISP di Indonesia sehingga gambar gagal dimuat di jaringan kampus.

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

Menghasilkan `qr-codes/<kode gedung>-<lantai>.png` dan `qr-codes/cetak.html`
(halaman A4 siap cetak, stikernya dwibahasa). Folder dikosongkan tiap kali
dijalankan supaya QR dari daftar lokasi versi lama tidak ikut tercetak.

Sebelum mencetak, sesuaikan daftar WC di `seed/toilets.sql` dengan kondisi
kampus lalu jalankan ulang seed. Berkas seed aman dijalankan berkali-kali:
seluruh WC dinonaktifkan lebih dulu, lalu yang ada di daftar dihidupkan lagi.
WC yang dihapus dari daftar tidak ikut terhapus dari database — ia hanya
berhenti muncul di aplikasi, sehingga laporan lama yang menunjuk ke sana tetap
utuh beserta riwayatnya.

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
  routes/              reports, lokasi, uploads, summary, auth
web/src/
  lib/i18n.tsx         kamus dan pengalih bahasa Indonesia/Inggris
  components/Kop.tsx   kepala halaman + pengalih bahasa
  pages/Beranda.tsx    peta gedung + pilih lokasi manual
  pages/Lapor.tsx      form mahasiswa (tujuan QR)
  pages/StatusLaporan.tsx  konfirmasi + hasil analisis
  pages/Dashboard.tsx  dashboard petugas
  ../public/peta-lokasi-gedung.jpg   peta gedung UPI Kampus Tasikmalaya
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

**Laporan terbuka dibaca siapa saja, tetapi hanya petugas yang mengubahnya.**
Halaman `/laporan` menampilkan seluruh laporan beserta status penanganannya
tanpa perlu login. Yang ditampilkan hanya ringkasan hasil analisis — teks asli,
foto, dan nama petugas sengaja tidak ikut, sehingga papan terbuka ini tidak
menjadi jalan keluar bagi isi laporan mentah atau wajah orang yang tidak sengaja
terfoto. Mengubah status, menganalisis ulang, dan menghapus tetap memerlukan
sesi petugas.

**Pelapor bisa melacak laporannya tanpa akun.** Id laporan disimpan di
`localStorage` perangkat pelapor, lalu halaman depan menampilkan daftar
"Laporan saya" beserta status terkininya. Halaman konfirmasi memuat garis waktu
tiga langkah — diterima, dikerjakan, selesai — dan menyegarkan dirinya sendiri
selama dibuka. Pendekatan ini menjaga sistem tetap anonim: tidak ada login,
tidak ada nomor telepon, dan tidak ada data pelapor yang disimpan di server.

**Antarmuka dwibahasa, analisis tetap Bahasa Indonesia.** Label dan pesan
mengikuti pilihan bahasa pembaca, tetapi ringkasan dan rekomendasi dari LLM
selalu ditulis dalam Bahasa Indonesia karena yang mengerjakannya adalah petugas
kebersihan. Keluhan berbahasa Inggris tetap dipahami dan tetap diringkas ke
Bahasa Indonesia.

**Warna diambil dari poster resmi kampus.** Maroon, oranye bata, dan krem pada
antarmuka berasal dari poster "Peta Lokasi Gedung" UPI Kampus Tasikmalaya, agar
tampilannya terbaca sebagai bagian dari kampus dan bukan aplikasi generik.

**Foto tidak melewati domain pihak ketiga.** Endpoint `GET /api/uploads/<key>`
membaca objek langsung dari binding R2, membatasi akses hanya ke prefix
`laporan/`, dan mendukung ETag sehingga browser cukup mengunduh satu kali.
