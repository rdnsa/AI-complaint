import { useCallback, useEffect, useRef, useState } from 'react';
import Kop from '../components/Kop';
import PanelAktivitas from '../components/PanelAktivitas';
import PanelGrafik from '../components/PanelGrafik';
import PanelPengguna from '../components/PanelPengguna';
import { LencanaKategori, LencanaPrioritas, LencanaStatus } from '../components/Lencana';
import { useNavigate } from 'react-router-dom';
import {
  api,
  type Laporan,
  type Ringkasan,
  type Sesi,
  type Statistik,
  type StatusLaporan,
} from '../lib/api';
import { useBahasa, useWaktuRelatif } from '../lib/i18n';
import { useSesi } from '../lib/sesi';

export default function Dashboard() {
  const { t } = useBahasa();
  const { sesi, memuat } = useSesi();
  const navigate = useNavigate();

  const bolehMasuk = sesi && sesi.peran !== 'pelapor';

  useEffect(() => {
    // Reporters have no business here; the sign-in page decides where they go.
    if (!memuat && !bolehMasuk) navigate('/masuk', { replace: true });
  }, [memuat, bolehMasuk, navigate]);

  if (!bolehMasuk) {
    return (
      <div className="min-h-screen">
        <Kop judul={t('dash.judul')} ramping />
        <p className="p-10 text-center text-maroon-600">{t('umum.memuat')}</p>
      </div>
    );
  }

  return <Papan sesi={sesi} />;
}

function Papan({ sesi }: { sesi: Sesi }) {
  const { t } = useBahasa();
  const { keluar } = useSesi();
  const navigate = useNavigate();
  const petugas = sesi.nama;
  const [laporan, setLaporan] = useState<Laporan[]>([]);
  const [statistik, setStatistik] = useState<Statistik | null>(null);
  const [ringkasan, setRingkasan] = useState<Ringkasan | null>(null);
  const [filter, setFilter] = useState({ status: '', prioritas: '' });
  const [memuat, setMemuat] = useState(true);
  const [menyusun, setMenyusun] = useState(false);
  const [tab, setTab] = useState<'laporan' | 'grafik' | 'aktivitas' | 'pengguna'>('laporan');
  // Account management appears for admins only — staff never see the tab at all,
  // and the server still refuses even if the tab is forced into view.
  const tabs =
    sesi.peran === 'admin'
      ? (['laporan', 'grafik', 'aktivitas', 'pengguna'] as const)
      : (['laporan', 'grafik', 'aktivitas'] as const);

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
    // The dashboard lives on the wall of the staff room, so it refreshes itself.
    const timer = setInterval(muat, 30_000);
    return () => clearInterval(timer);
  }, [muat]);

  async function hapus(id: string) {
    setLaporan((prev) => prev.filter((l) => l.id !== id));
    await api.hapusLaporan(id).catch(() => {});
    muat();
  }

  async function ubahStatus(id: string, status: StatusLaporan, fotoBukti?: string) {
    // Update the view first so the button feels responsive, then synchronise.
    setLaporan((prev) => prev.map((l) => (l.id === id ? { ...l, status, petugas } : l)));
    await api.ubahStatus(id, status, fotoBukti).catch(() => {});
    muat();
  }

  return (
    <div className="min-h-screen pb-16">
      <Kop
        judul={t('dash.judul')}
        keterangan={t('dash.sebagai', { nama: `${petugas} · ${sesi.peran}` })}
        ramping
        kanan={
          <button
            onClick={async () => {
              await keluar();
              navigate('/masuk', { replace: true });
            }}
            className="rounded-lg bg-white/15 px-3 py-1.5 text-xs font-bold text-white ring-1 ring-white/25 transition hover:bg-white/25"
          >
            {t('dash.keluar')}
          </button>
        }
      />

      <main className="mx-auto max-w-5xl px-4">
        <nav className="mt-5 flex gap-1 rounded-xl bg-white p-1 ring-1 ring-krem-200">
          {tabs.map((k) => (
            <button
              key={k}
              onClick={() => setTab(k)}
              aria-pressed={tab === k}
              className={`flex-1 rounded-lg px-3 py-2 text-sm font-bold transition ${
                tab === k ? 'bg-maroon-800 text-white' : 'text-maroon-700 hover:bg-krem-50'
              }`}
            >
              {t(`tab.${k}`)}
            </button>
          ))}
        </nav>

        {tab === 'grafik' && <PanelGrafik />}
        {tab === 'aktivitas' && <PanelAktivitas />}
        {tab === 'pengguna' && sesi.peran === 'admin' && <PanelPengguna />}

        {tab === 'laporan' && (
          <>
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
                  /* leave the previous summary on screen */
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
            <BarisLaporan
              key={l.id}
              laporan={l}
              onUbahStatus={ubahStatus}
              onSegarkan={muat}
              onHapus={hapus}
            />
          ))}
        </div>
          </>
        )}
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
  onHapus,
}: {
  laporan: Laporan;
  onUbahStatus: (id: string, status: StatusLaporan, fotoBukti?: string) => void;
  onSegarkan: () => void;
  onHapus: (id: string) => void;
}) {
  const { t } = useBahasa();
  const waktuRelatif = useWaktuRelatif();
  const inputBukti = useRef<HTMLInputElement>(null);
  const [mengunggah, setMengunggah] = useState(false);

  /**
   * Resolving a report always takes this path: choose a photo, upload it, and
   * only then change the status. The server also refuses 'selesai' without
   * evidence, so completion cannot be claimed by pressing a button alone.
   */
  async function selesaikan(berkas: File) {
    setMengunggah(true);
    try {
      const { key } = await api.unggahFoto(berkas, 'bukti');
      onUbahStatus(l.id, 'selesai', key);
    } catch {
      /* leave the status untouched when the upload fails */
    } finally {
      setMengunggah(false);
    }
  }

  // The left edge marks the priority, readable from across the room.
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

      <div className="mt-3 flex flex-wrap gap-3">
        {l.foto_url && (
          <a href={l.foto_url} target="_blank" rel="noreferrer">
            <img src={l.foto_url} alt="" className="max-h-44 rounded-xl" />
          </a>
        )}
        {l.foto_selesai_url && (
          <figure className="m-0">
            <a href={l.foto_selesai_url} target="_blank" rel="noreferrer">
              <img
                src={l.foto_selesai_url}
                alt=""
                className="max-h-44 rounded-xl ring-2 ring-emerald-400"
              />
            </a>
            <figcaption className="mt-1 text-xs font-bold text-emerald-700">
              ✓ {t('dash.bukti')}
            </figcaption>
          </figure>
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {l.status === 'baru' && (
          <button onClick={() => onUbahStatus(l.id, 'diproses')} className="tombol-netral !py-1.5 text-xs">
            {t('dash.kerjakan')}
          </button>
        )}
        {l.status !== 'selesai' && (
          <>
            <input
              ref={inputBukti}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              capture="environment"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) selesaikan(f);
                e.target.value = '';
              }}
            />
            <button
              onClick={() => inputBukti.current?.click()}
              disabled={mengunggah}
              title={t('dash.bukti_wajib')}
              className="tombol-utama !py-1.5 text-xs"
            >
              {mengunggah ? t('dash.mengunggah') : `📷 ${t('dash.selesaikan')}`}
            </button>
          </>
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
        {/* Daftar laporan terbuka untuk umum, jadi spam dan isi tak pantas
            harus bisa disingkirkan — dan hanya petugas yang boleh melakukannya. */}
        <button
          onClick={() => {
            if (confirm(t('dash.hapus_konfirmasi'))) onHapus(l.id);
          }}
          className="tombol !py-1.5 text-xs text-red-700 hover:bg-red-50"
        >
          {t('dash.hapus')}
        </button>
        {l.petugas && (
          <span className="text-xs text-maroon-600">{t('dash.ditangani', { nama: l.petugas })}</span>
        )}
      </div>
    </article>
  );
}
