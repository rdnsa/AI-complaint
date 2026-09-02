import { useCallback, useEffect, useState } from 'react';
import Kop from '../components/Kop';
import { LencanaKategori, LencanaPrioritas, LencanaStatus } from '../components/Lencana';
import { api, type Laporan, type Ringkasan, type Statistik, type StatusLaporan } from '../lib/api';
import { useBahasa, useWaktuRelatif } from '../lib/i18n';

export default function Dashboard() {
  const { t } = useBahasa();
  const [petugas, setPetugas] = useState<string | null>(null);
  const [memeriksaSesi, setMemeriksaSesi] = useState(true);

  useEffect(() => {
    api
      .saya()
      .then((r) => setPetugas(r.nama))
      .catch(() => setPetugas(null))
      .finally(() => setMemeriksaSesi(false));
  }, []);

  if (memeriksaSesi) {
    return (
      <div className="min-h-screen">
        <Kop judul={t('dash.judul')} ramping />
        <p className="p-10 text-center text-maroon-600">{t('umum.memuat')}</p>
      </div>
    );
  }
  if (!petugas) return <FormLogin onSukses={setPetugas} />;
  return <Papan petugas={petugas} onLogout={() => setPetugas(null)} />;
}

function FormLogin({ onSukses }: { onSukses: (nama: string) => void }) {
  const { t } = useBahasa();
  const [nama, setNama] = useState('');
  const [password, setPassword] = useState('');
  const [galat, setGalat] = useState<string | null>(null);
  const [proses, setProses] = useState(false);

  async function masuk(e: React.FormEvent) {
    e.preventDefault();
    setProses(true);
    setGalat(null);
    try {
      onSukses((await api.login(nama, password)).nama);
    } catch (err) {
      setGalat(err instanceof Error ? err.message : t('login.galat'));
      setProses(false);
    }
  }

  return (
    <div className="min-h-screen">
      <Kop judul={t('login.judul')} keterangan={t('login.keterangan')} ramping />
      <main className="mx-auto max-w-sm px-4">
        <form onSubmit={masuk} className="kartu mt-8 space-y-4 p-5">
          <div>
            <label htmlFor="nama" className="label">
              {t('login.nama')}
            </label>
            <input id="nama" className="input" value={nama} onChange={(e) => setNama(e.target.value)} required />
          </div>
          <div>
            <label htmlFor="pw" className="label">
              {t('login.password')}
            </label>
            <input
              id="pw"
              type="password"
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          {galat && <p className="text-sm font-medium text-red-700">{galat}</p>}
          <button type="submit" disabled={proses} className="tombol-utama w-full py-3">
            {proses ? t('login.memeriksa') : t('login.masuk')}
          </button>
        </form>
      </main>
    </div>
  );
}

function Papan({ petugas, onLogout }: { petugas: string; onLogout: () => void }) {
  const { t } = useBahasa();
  const [laporan, setLaporan] = useState<Laporan[]>([]);
  const [statistik, setStatistik] = useState<Statistik | null>(null);
  const [ringkasan, setRingkasan] = useState<Ringkasan | null>(null);
  const [filter, setFilter] = useState({ status: '', prioritas: '' });
  const [memuat, setMemuat] = useState(true);
  const [menyusun, setMenyusun] = useState(false);

  const muat = useCallback(async () => {
    const [l, s, r] = await Promise.all([
      api.daftarLaporan(filter),
      api.statistik().catch(() => null),
      api.ringkasan().catch(() => null),
    ]);
    setLaporan(l.data);
    setStatistik(s);
    setRingkasan(r);
    setMemuat(false);
  }, [filter]);

  useEffect(() => {
    muat();
    // Dashboard menempel di dinding ruang petugas, jadi ia menyegarkan diri sendiri.
    const timer = setInterval(muat, 30_000);
    return () => clearInterval(timer);
  }, [muat]);

  async function ubahStatus(id: string, status: StatusLaporan) {
    // Perbarui tampilan lebih dulu supaya tombol terasa responsif, lalu sinkronkan.
    setLaporan((prev) => prev.map((l) => (l.id === id ? { ...l, status, petugas } : l)));
    await api.ubahStatus(id, status).catch(() => {});
    muat();
  }

  return (
    <div className="min-h-screen pb-16">
      <Kop
        judul={t('dash.judul')}
        keterangan={t('dash.sebagai', { nama: petugas })}
        ramping
        kanan={
          <button
            onClick={async () => {
              await api.logout().catch(() => {});
              onLogout();
            }}
            className="rounded-lg bg-white/15 px-3 py-1.5 text-xs font-bold text-white ring-1 ring-white/25 transition hover:bg-white/25"
          >
            {t('dash.keluar')}
          </button>
        }
      />

      <main className="mx-auto max-w-5xl px-4">
        {statistik && (
          <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Kartu label={t('dash.stat_total')} nilai={statistik.hari_ini.total ?? 0} />
            <Kartu label={t('dash.stat_tinggi')} nilai={statistik.hari_ini.tinggi ?? 0} nada="merah" />
            <Kartu label={t('dash.stat_belum')} nilai={statistik.belum_selesai} nada="kuning" />
            <Kartu label={t('dash.stat_gagal')} nilai={statistik.hari_ini.ai_gagal ?? 0} />
          </div>
        )}

        <section className="kartu mt-4 overflow-hidden">
          <div className="flex items-center justify-between gap-3 border-b border-krem-200 bg-krem-50 px-4 py-3">
            <h2 className="judul-bagian">{t('dash.ringkasan')}</h2>
            <button
              className="tombol-netral !px-3 !py-1.5 text-xs"
              disabled={menyusun}
              onClick={async () => {
                setMenyusun(true);
                try {
                  setRingkasan(await api.buatRingkasan());
                } catch {
                  /* biarkan ringkasan lama tetap tampil */
                } finally {
                  setMenyusun(false);
                }
              }}
            >
              {menyusun ? t('dash.menyusun') : t('dash.buat_ulang')}
            </button>
          </div>

          <div className="p-4">
            {ringkasan?.ada ? (
              <>
                <p className="leading-relaxed text-maroon-900">{ringkasan.ringkasan}</p>
                {!!ringkasan.sorotan?.length && (
                  <ul className="mt-3 space-y-1.5">
                    {ringkasan.sorotan.map((s) => (
                      <li key={s} className="flex gap-2 text-sm text-maroon-700">
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-bata-500" />
                        {s}
                      </li>
                    ))}
                  </ul>
                )}
              </>
            ) : (
              <p className="text-sm text-maroon-600">{t('dash.ringkasan_kosong')}</p>
            )}

            {!!statistik?.lokasi_teratas.length && (
              <div className="mt-4 border-t border-krem-200 pt-3">
                <p className="judul-bagian">{t('dash.lokasi_teratas')}</p>
                <ul className="mt-2 space-y-1 text-sm">
                  {statistik.lokasi_teratas.map((l) => (
                    <li key={l.lokasi} className="flex justify-between gap-3">
                      <span className="truncate text-maroon-700">{l.lokasi}</span>
                      <span className="font-bold text-maroon-900">{l.jumlah}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </section>

        <div className="mt-6 flex flex-wrap gap-2">
          <select
            className="input !w-auto !py-2"
            value={filter.status}
            onChange={(e) => setFilter((f) => ({ ...f, status: e.target.value }))}
          >
            <option value="">{t('dash.semua_status')}</option>
            <option value="baru">{t('status.baru')}</option>
            <option value="diproses">{t('status.diproses')}</option>
            <option value="selesai">{t('status.selesai')}</option>
          </select>
          <select
            className="input !w-auto !py-2"
            value={filter.prioritas}
            onChange={(e) => setFilter((f) => ({ ...f, prioritas: e.target.value }))}
          >
            <option value="">{t('dash.semua_prioritas')}</option>
            <option value="tinggi">{t('pilih.tinggi')}</option>
            <option value="sedang">{t('pilih.sedang')}</option>
            <option value="rendah">{t('pilih.rendah')}</option>
          </select>
        </div>

        <div className="mt-4 space-y-3">
          {memuat && <p className="text-maroon-600">{t('dash.memuat_laporan')}</p>}
          {!memuat && !laporan.length && (
            <p className="kartu p-10 text-center text-maroon-600">{t('dash.kosong')}</p>
          )}
          {laporan.map((l) => (
            <BarisLaporan key={l.id} laporan={l} onUbahStatus={ubahStatus} onSegarkan={muat} />
          ))}
        </div>
      </main>
    </div>
  );
}

function Kartu({ label, nilai, nada }: { label: string; nilai: number; nada?: 'merah' | 'kuning' }) {
  const warna =
    nada === 'merah' && nilai > 0
      ? 'text-red-700'
      : nada === 'kuning' && nilai > 0
        ? 'text-amber-700'
        : 'text-maroon-900';
  return (
    <div className="kartu p-4">
      <p className="text-[11px] font-bold uppercase tracking-wider text-maroon-600">{label}</p>
      <p className={`mt-1 text-3xl font-extrabold tracking-tight ${warna}`}>{nilai}</p>
    </div>
  );
}

function BarisLaporan({
  laporan: l,
  onUbahStatus,
  onSegarkan,
}: {
  laporan: Laporan;
  onUbahStatus: (id: string, status: StatusLaporan) => void;
  onSegarkan: () => void;
}) {
  const { t } = useBahasa();
  const waktuRelatif = useWaktuRelatif();

  // Garis tepi kiri memberi tanda prioritas yang terbaca dari kejauhan.
  const tepi =
    l.prioritas === 'tinggi'
      ? 'border-l-4 border-l-red-500'
      : l.prioritas === 'sedang'
        ? 'border-l-4 border-l-amber-400'
        : 'border-l-4 border-l-emerald-400';

  return (
    <article className={`kartu p-4 ${tepi}`}>
      <div className="flex flex-wrap items-center gap-2">
        <LencanaPrioritas nilai={l.prioritas} />
        <LencanaStatus nilai={l.status} />
        {l.kategori.map((k) => (
          <LencanaKategori key={k} nilai={k} />
        ))}
        <span className="ml-auto text-xs text-maroon-600">{waktuRelatif(l.created_at)}</span>
      </div>

      <p className="mt-2.5 font-bold text-maroon-900">{l.toilet_nama}</p>
      <p className="mt-1 text-maroon-800">{l.ringkasan ?? l.teks}</p>

      {l.ringkasan && (
        <p className="mt-1 text-sm italic text-maroon-600">
          {t('dash.laporan_asli')}: “{l.teks}”
        </p>
      )}

      {l.rekomendasi && (
        <p className="mt-2.5 rounded-xl border-l-4 border-bata-400 bg-krem-50 p-3 text-sm text-maroon-700">
          <span className="font-bold">{t('dash.tindakan')} </span>
          {l.rekomendasi}
        </p>
      )}

      {l.foto_url && (
        <a href={l.foto_url} target="_blank" rel="noreferrer">
          <img src={l.foto_url} alt="" className="mt-3 max-h-64 rounded-xl" />
        </a>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {l.status === 'baru' && (
          <button onClick={() => onUbahStatus(l.id, 'diproses')} className="tombol-netral !py-1.5 text-xs">
            {t('dash.kerjakan')}
          </button>
        )}
        {l.status !== 'selesai' && (
          <button onClick={() => onUbahStatus(l.id, 'selesai')} className="tombol-utama !py-1.5 text-xs">
            {t('dash.selesaikan')}
          </button>
        )}
        {l.ai_status === 'gagal' && (
          <button
            onClick={async () => {
              await api.analisaUlang(l.id).catch(() => {});
              setTimeout(onSegarkan, 3000);
            }}
            className="tombol-netral !py-1.5 text-xs"
          >
            {t('dash.analisa_ulang')}
          </button>
        )}
        {l.petugas && (
          <span className="text-xs text-maroon-600">{t('dash.ditangani', { nama: l.petugas })}</span>
        )}
      </div>
    </article>
  );
}
