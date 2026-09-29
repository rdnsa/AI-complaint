import { useEffect, useState } from 'react';
import Batang from './grafik/Batang';
import Garis from './grafik/Garis';
import { PRIORITAS_WARNA } from './grafik/warna';
import { api, type DataGrafik } from '../lib/api';
import { useBahasa } from '../lib/i18n';

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

  if (memuat) return <p className="mt-6 text-maroon-600">{t('umum.memuat')}</p>;
  if (!data) return <p className="kartu mt-6 p-10 text-center text-maroon-600">{t('grafik.belum')}</p>;

  const menit = data.penyelesaian.menit;
  const durasi =
    menit === null
      ? '—'
      : menit >= 60
        ? `${t('grafik.jam', { n: Math.floor(menit / 60) })} ${t('grafik.menit', { n: Math.round(menit % 60) })}`
        : t('grafik.menit', { n: Math.round(menit) });

  return (
    <div className="mt-6 space-y-4">
      {/* Satu angka tunggal tidak butuh grafik — cukup ditulis besar. */}
      <div className="kartu p-5">
        <p className="judul-bagian">{t('grafik.rata')}</p>
        <p className="mt-1 text-4xl font-extrabold tracking-tight text-maroon-900">{durasi}</p>
        <p className="mt-1 text-sm text-maroon-600">
          {t('grafik.rata_dari', { n: data.penyelesaian.jumlah })}
        </p>
      </div>

      <section className="kartu p-5">
        <h3 className="judul-bagian mb-3">{t('grafik.harian')}</h3>
        <Garis data={data.harian} labelMasuk={t('grafik.masuk')} labelSelesai={t('grafik.selesai')} />
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="kartu p-5">
          <h3 className="judul-bagian mb-3">{t('grafik.prioritas')}</h3>
          {data.prioritas.length ? (
            <Batang
              data={data.prioritas.map((p) => ({
                label: t(`pilih.${p.prioritas}` as 'pilih.tinggi'),
                nilai: p.jumlah,
                warna: PRIORITAS_WARNA[p.prioritas],
              }))}
            />
          ) : (
            <p className="text-sm text-maroon-600">{t('grafik.belum')}</p>
          )}
        </section>

        <section className="kartu p-5">
          <h3 className="judul-bagian mb-3">{t('grafik.kategori')}</h3>
          {data.kategori.length ? (
            <Batang
              data={data.kategori.map((k) => ({
                label: t(`kategori.${k.kategori}` as 'kategori.lainnya').startsWith('kategori.')
                  ? k.kategori
                  : t(`kategori.${k.kategori}` as 'kategori.lainnya'),
                nilai: k.jumlah,
              }))}
            />
          ) : (
            <p className="text-sm text-maroon-600">{t('grafik.belum')}</p>
          )}
        </section>
      </div>

      <section className="kartu p-5">
        <h3 className="judul-bagian mb-3">{t('grafik.gedung')}</h3>
        {data.gedung.length ? (
          <Batang
            data={data.gedung.map((g) => ({
              label: `${g.gedung_kode} · ${g.gedung_nama}`,
              nilai: g.jumlah,
            }))}
          />
        ) : (
          <p className="text-sm text-maroon-600">{t('grafik.belum')}</p>
        )}
      </section>
    </div>
  );
}
