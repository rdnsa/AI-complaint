/**
 * Membuat berkas QR untuk setiap lantai, plus satu halaman HTML siap cetak.
 *
 *   node scripts/generate-qr.mjs                          # ambil dari Worker lokal
 *   BASE_URL=https://ai-complaint.workers.dev npm run qr
 *
 * Satu QR mewakili satu lantai pada satu gedung dan mengarah ke
 * <BASE_URL>/lapor/<kode gedung>-<lantai>. Jenis WC (pria/wanita/disabilitas)
 * dipilih pelapor di formulir, sehingga satu stiker cukup untuk satu lantai.
 */
import { mkdir, rm, writeFile } from 'node:fs/promises';
import QRCode from 'qrcode';

const BASE_URL = (process.env.BASE_URL ?? 'http://127.0.0.1:8787').replace(/\/$/, '');
const OUT = 'qr-codes';

const res = await fetch(`${BASE_URL}/api/lokasi`);
if (!res.ok) {
  console.error(`Gagal mengambil daftar lokasi dari ${BASE_URL}/api/lokasi (HTTP ${res.status}).`);
  console.error('Pastikan `npm run dev:api` berjalan, atau set BASE_URL ke Worker yang sudah dideploy.');
  process.exit(1);
}
const { data: gedung } = await res.json();

// Folder dikosongkan lebih dulu: QR dari daftar lokasi versi lama harus ikut
// terhapus, karena kode yang sudah tidak terdaftar akan ditolak sistem bila
// terlanjur tercetak dan ditempel.
await rm(OUT, { recursive: true, force: true });
await mkdir(OUT, { recursive: true });

const kartu = [];
let jumlah = 0;

for (const g of gedung) {
  for (const lantai of g.lantai) {
    const id = `${g.kode}-${lantai}`;
    const url = `${BASE_URL}/lapor/${id}`;

    await QRCode.toFile(`${OUT}/${id}.png`, url, { width: 900, margin: 1 });
    const dataUrl = await QRCode.toDataURL(url, { width: 460, margin: 1 });
    jumlah++;

    kartu.push(`
      <div class="kartu">
        <div class="kop">
          <span class="lingkaran">${g.kode}</span>
          <span class="kampus">Universitas Pendidikan Indonesia<br><b>Kampus Tasikmalaya</b></span>
        </div>
        <p class="ajak">Ada masalah di toilet ini?<span>Something wrong with this toilet?</span></p>
        <img src="${dataUrl}" alt="QR ${id}" />
        <p class="lokasi">Gedung ${g.kode} &middot; Lantai ${lantai}</p>
        <p class="nama">${g.nama}</p>
        <p class="petunjuk">Pindai, tulis keluhanmu, selesai. Tanpa login.<span>Scan, describe the problem, done. No sign-in.</span></p>
      </div>`);
  }
}

await writeFile(
  `${OUT}/cetak.html`,
  `<!doctype html><html lang="id"><head><meta charset="utf-8">
<title>Cetak QR Toilet - UPI Kampus Tasikmalaya</title>
<style>
  @page { size: A4; margin: 10mm; }
  * { box-sizing: border-box; }
  body { font-family: "Plus Jakarta Sans", system-ui, sans-serif; margin: 0;
         display: grid; grid-template-columns: 1fr 1fr; gap: 8mm; color: #3E1712; }
  .kartu { border: 2px solid #E2D0B8; border-radius: 10px; padding: 7mm 6mm 6mm;
           text-align: center; break-inside: avoid; background: #FDFAF6; }
  .kop { display: flex; align-items: center; justify-content: center; gap: 3mm; margin-bottom: 4mm; }
  .lingkaran { width: 11mm; height: 11mm; border-radius: 50%; background: #E2571F; color: #fff;
               border: 1.5mm solid #4A1D16; font-size: 16pt; font-weight: 800;
               display: grid; place-items: center; }
  .kampus { font-size: 7pt; line-height: 1.35; text-transform: uppercase;
            letter-spacing: .04em; text-align: left; color: #5D2A20; }
  .ajak { font-size: 13pt; font-weight: 800; margin: 0 0 4mm; line-height: 1.25; }
  .ajak span { display: block; font-size: 8.5pt; font-weight: 500; color: #7A3628; font-style: italic; }
  img { width: 55mm; height: 55mm; }
  .lokasi { font-size: 13pt; font-weight: 800; margin: 4mm 0 0; }
  .nama { font-size: 9.5pt; color: #7A3628; margin: 1mm 0 0; }
  .petunjuk { font-size: 8pt; color: #5D2A20; margin: 4mm 0 0; line-height: 1.4;
              border-top: 1px dashed #E2D0B8; padding-top: 3mm; }
  .petunjuk span { display: block; font-style: italic; color: #7A3628; }
</style></head><body>${kartu.join('')}</body></html>`,
);

console.log(`Selesai: ${jumlah} QR di ./${OUT}/ (buka ${OUT}/cetak.html lalu Ctrl+P).`);
