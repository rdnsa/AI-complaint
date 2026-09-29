import { useEffect, useMemo, useState } from 'react';
import Batang from './grafik/Batang';
import BatangBertumpuk from './grafik/BatangBertumpuk';
import Garis from './grafik/Garis';
import KartuKPI from './grafik/KartuKPI';
import PetaPanas, { type SelPanas } from './grafik/PetaPanas';
import { PRIORITAS_WARNA, SERI, TUNGGAL } from './grafik/warna';
import { api, type DataGrafik } from '../lib/api';
import { useBahasa, type Terjemah } from '../lib/i18n';

/** Hours are bucketed into threes: 24 columns would be unreadable on a phone. */
const EMBER_JAM = [0, 3, 6, 9, 12, 15, 18, 21];

const KATEGORI_URUT = ['kebersihan', 'perlengkapan', 'kerusakan', 'bau', 'genangan', 'lainnya'];

function durasi(menit: number | null, t: Terjemah): string {
  if (menit === null) return '—';
  return menit >= 60
    ? `${t('grafik.jam', { n: Math.floor(menit / 60) })} ${t('grafik.menit', { n: Math.round(menit % 60) })}`
    : t('grafik.menit', { n: Math.round(menit) });
}

export default function PanelGrafik() {
  const { t } = useBahasa();
  const [data, setData] = useState<DataGrafik | null>(null);
  const [memuat, setMemuat] = useState(true);

  useEffect(() => {
    api
      .grafik()
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setMemuat(false));
  }, []);

  const panas = useMemo<SelPanas[]>(() => {
    if (!data) return [];
    const peta = new Map<string, number>();
    for (const { hari, jam, jumlah } of data.jamHari) {
      const ember = EMBER_JAM[Math.floor(jam / 3)];
      const kunci = `${hari}|${ember}`;
      peta.set(kunci, (peta.get(kunci) ?? 0) + Number(jumlah));
    }
    return [...peta].map(([kunci, nilai]) => {
      const [hari, jam] = kunci.split('|');
      return { baris: t(`hari.${hari}` as 'hari.0'), kolom: `${jam.padStart(2, '0')}.00`, nilai };
    });
  }, [data, t]);

  if (memuat) return <p className="mt-6 text-maroon-600">{t('umum.memuat')}</p>;
  if (!data) return <p className="kartu mt-6 p-10 text-center text-maroon-600">{t('grafik.belum')}</p>;

  const { tren } = data;
  const tuntas = tren.laporan ? Math.round((tren.selesai / tren.laporan) * 100) : 0;
  const deretTotal = data.harian.map((h) => h.total);
  const deretSelesai = data.harian.map((h) => h.selesai);
  const deretTinggi = data.harianPrioritas.map((h) => h.tinggi);

  const gedungAda = [...new Set(data.matriks.map((m) => m.gedung_kode))].sort();
  const kategoriAda = KATEGORI_URUT.filter((k) => data.matriks.some((m) => m.kategori === k));

  const labelPrioritas = {
    tinggi: t('pilih.tinggi'),
    sedang: t('pilih.sedang'),
    rendah: t('pilih.rendah'),
  };

  return (
    <div className="mt-6 space-y-4">
      {/* Headline numbers first: the answer before the evidence. */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KartuKPI
          label={t('grafik.kpi_laporan')}
          nilai={tren.laporan}
          deret={deretTotal}
          warna={SERI.masuk}
          perubahan={tren.perubahan}
          keterangan={t('grafik.vs_lalu', { n: tren.hari })}
        />
        <KartuKPI
          label={t('grafik.kpi_tinggi')}
          nilai={tren.tinggi}
          deret={deretTinggi}
          warna={PRIORITAS_WARNA.tinggi}
          keterangan={t('grafik.periode', { n: tren.hari })}
        />
        <KartuKPI
          label={t('grafik.kpi_tuntas')}
          nilai={tuntas}
          satuan="%"
          deret={deretSelesai}
          warna={SERI.selesai}
          arahBaik="naik"
          keterangan={t('grafik.periode', { n: tren.hari })}
        />
        <KartuKPI
          label={t('grafik.rata')}
          nilai={durasi(data.penyelesaian.menit, t)}
          warna={TUNGGAL}
          keterangan={t('grafik.rata_dari', { n: data.penyelesaian.jumlah })}
        />
      </div>

      <section className="kartu p-5">
        <h3 className="judul-bagian mb-3">{t('grafik.harian')}</h3>
        <Garis data={data.harian} labelMasuk={t('grafik.masuk')} labelSelesai={t('grafik.selesai')} />
      </section>

      <section className="kartu p-5">
        <h3 className="judul-bagian">{t('grafik.komposisi')}</h3>
        <p className="mb-3 mt-1 text-xs text-maroon-600">{t('grafik.komposisi_ket')}</p>
        <BatangBertumpuk data={data.harianPrioritas} label={labelPrioritas} />
      </section>

      <section className="kartu p-5">
        <h3 className="judul-bagian">{t('grafik.pola')}</h3>
        <p className="mb-3 mt-1 text-xs text-maroon-600">{t('grafik.pola_ket')}</p>
        <PetaPanas
          data={panas}
          baris={[0, 1, 2, 3, 4, 5, 6].map((h) => t(`hari.${h}` as 'hari.0'))}
          kolom={EMBER_JAM.map((j) => `${String(j).padStart(2, '0')}.00`)}
          labelSedikit={t('grafik.sedikit')}
          labelBanyak={t('grafik.banyak')}
        />
      </section>

      <section className="kartu p-5">
        <h3 className="judul-bagian">{t('grafik.matriks')}</h3>
        <p className="mb-3 mt-1 text-xs text-maroon-600">{t('grafik.matriks_ket')}</p>
        {gedungAda.length ? (
          <PetaPanas
            data={data.matriks.map((m) => ({
              baris: m.gedung_kode,
              kolom: m.kategori,
              nilai: Number(m.jumlah),
            }))}
            baris={gedungAda}
            kolom={kategoriAda}
            labelKolom={(k) => {
              const label = t(`kategori.${k}` as 'kategori.lainnya');
              return label.startsWith('kategori.') ? k : label;
            }}
            labelSedikit={t('grafik.sedikit')}
            labelBanyak={t('grafik.banyak')}
          />
        ) : (
          <p className="text-sm text-maroon-600">{t('grafik.belum')}</p>
        )}
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="kartu p-5">
          <h3 className="judul-bagian">{t('grafik.efektivitas')}</h3>
          <p className="mb-3 mt-1 text-xs text-maroon-600">{t('grafik.efektivitas_ket')}</p>
          {data.waktuPrioritas.length ? (
            <Batang
              data={(['tinggi', 'sedang', 'rendah'] as const).map((p) => {
                const baris = data.waktuPrioritas.find((w) => w.prioritas === p);
                return {
                  label: labelPrioritas[p],
                  nilai: Math.round(baris?.menit ?? 0),
                  tampil: baris ? durasi(baris.menit, t) : t('grafik.belum_selesai'),
                  warna: PRIORITAS_WARNA[p],
                };
              })}
            />
          ) : (
            <p className="text-sm text-maroon-600">{t('grafik.belum')}</p>
          )}
        </section>

        <section className="kartu p-5">
          <h3 className="judul-bagian mb-3">{t('grafik.gedung')}</h3>
          {data.gedung.length ? (
            <Batang
              data={data.gedung.map((g) => ({
                label: `${g.gedung_kode} · ${g.gedung_nama}`,
                nilai: Number(g.jumlah),
              }))}
            />
          ) : (
            <p className="text-sm text-maroon-600">{t('grafik.belum')}</p>
          )}
        </section>
      </div>
    </div>
  );
}
