import { useCallback, useEffect, useState } from 'react';
import { LencanaKategori, LencanaPrioritas, LencanaStatus } from '../components/Lencana';
import {
  api,
  waktuRelatif,
  type Laporan,
  type Ringkasan,
  type Statistik,
  type StatusLaporan,
} from '../lib/api';

export default function Dashboard() {
  const [petugas, setPetugas] = useState<string | null>(null);
  const [memeriksaSesi, setMemeriksaSesi] = useState(true);

  useEffect(() => {
    api
      .saya()
      .then((r) => setPetugas(r.nama))
      .catch(() => setPetugas(null))
      .finally(() => setMemeriksaSesi(false));
  }, []);

  if (memeriksaSesi) return <p className="p-8 text-center text-slate-500">Memuat…</p>;
  if (!petugas) return <FormLogin onSukses={setPetugas} />;
  return <Papan petugas={petugas} onLogout={() => setPetugas(null)} />;
}

function FormLogin({ onSukses }: { onSukses: (nama: string) => void }) {
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
      setGalat(err instanceof Error ? err.message : 'Gagal masuk');
      setProses(false);
    }
  }

  return (
    <div className="mx-auto max-w-sm px-4 py-16">
      <h1 className="text-xl font-bold">Masuk Petugas</h1>
      <p className="mt-1 text-sm text-slate-600">Nama dipakai untuk mencatat siapa yang menangani laporan.</p>
      <form onSubmit={masuk} className="mt-6 space-y-4">
        <div>
          <label htmlFor="nama" className="label">Nama petugas</label>
          <input id="nama" className="input" value={nama} onChange={(e) => setNama(e.target.value)} required />
        </div>
        <div>
          <label htmlFor="pw" className="label">Password</label>
          <input
            id="pw"
            type="password"
            className="input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        {galat && <p className="text-sm text-red-700">{galat}</p>}
        <button type="submit" disabled={proses} className="tombol-utama w-full">
          {proses ? 'Memeriksa…' : 'Masuk'}
        </button>
      </form>
    </div>
  );
}

function Papan({ petugas, onLogout }: { petugas: string; onLogout: () => void }) {
  const [laporan, setLaporan] = useState<Laporan[]>([]);
  const [statistik, setStatistik] = useState<Statistik | null>(null);
  const [ringkasan, setRingkasan] = useState<Ringkasan | null>(null);
  const [filter, setFilter] = useState({ status: '', prioritas: '' });
  const [memuat, setMemuat] = useState(true);
  const [buatRingkasanProses, setBuatRingkasanProses] = useState(false);

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
    // Dashboard menempel di dinding ruang OB, jadi ia menyegarkan diri sendiri.
    const t = setInterval(muat, 30_000);
    return () => clearInterval(t);
  }, [muat]);

  async function ubahStatus(id: string, status: StatusLaporan) {
    // Perbarui tampilan lebih dulu supaya tombol terasa responsif, lalu sinkronkan.
    setLaporan((prev) => prev.map((l) => (l.id === id ? { ...l, status, petugas } : l)));
    await api.ubahStatus(id, status).catch(() => {});
    muat();
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Dashboard Petugas</h1>
          <p className="text-sm text-slate-600">Masuk sebagai {petugas}</p>
        </div>
        <button
          onClick={async () => {
            await api.logout().catch(() => {});
            onLogout();
          }}
          className="tombol-netral"
        >
          Keluar
        </button>
      </header>

      {statistik && (
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Kartu label="Laporan hari ini" nilai={statistik.hari_ini.total ?? 0} />
          <Kartu label="Prioritas tinggi" nilai={statistik.hari_ini.tinggi ?? 0} nada="merah" />
          <Kartu label="Belum selesai" nilai={statistik.belum_selesai} nada="kuning" />
          <Kartu label="Analisis gagal" nilai={statistik.hari_ini.ai_gagal ?? 0} />
        </div>
      )}

      <section className="kartu mt-4 p-4">
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Ringkasan hari ini
          </h2>
          <button
            className="tombol-netral !px-3 !py-1.5 text-xs"
            disabled={buatRingkasanProses}
            onClick={async () => {
              setBuatRingkasanProses(true);
              try {
                setRingkasan(await api.buatRingkasan());
              } catch {
                /* biarkan ringkasan lama tampil */
              } finally {
                setBuatRingkasanProses(false);
              }
            }}
          >
            {buatRingkasanProses ? 'Menyusun…' : 'Buat ulang'}
          </button>
        </div>

        {ringkasan?.ada ? (
          <>
            <p className="mt-3 text-slate-800">{ringkasan.ringkasan}</p>
            {!!ringkasan.sorotan?.length && (
              <ul className="mt-3 list-inside list-disc space-y-1 text-sm text-slate-700">
                {ringkasan.sorotan.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
            )}
          </>
        ) : (
          <p className="mt-3 text-sm text-slate-500">
            Belum ada ringkasan. Dibuat otomatis tiap pukul 17.00 WIB, atau tekan “Buat ulang”.
          </p>
        )}

        {!!statistik?.lokasi_teratas.length && (
          <div className="mt-4 border-t border-slate-100 pt-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Lokasi terbanyak hari ini
            </p>
            <ul className="mt-2 space-y-1 text-sm">
              {statistik.lokasi_teratas.map((l) => (
                <li key={l.lokasi} className="flex justify-between">
                  <span className="text-slate-700">{l.lokasi}</span>
                  <span className="font-semibold">{l.jumlah}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <div className="mt-6 flex flex-wrap gap-2">
        <select
          className="input !w-auto"
          value={filter.status}
          onChange={(e) => setFilter((f) => ({ ...f, status: e.target.value }))}
        >
          <option value="">Semua status</option>
          <option value="baru">Baru</option>
          <option value="diproses">Diproses</option>
          <option value="selesai">Selesai</option>
        </select>
        <select
          className="input !w-auto"
          value={filter.prioritas}
          onChange={(e) => setFilter((f) => ({ ...f, prioritas: e.target.value }))}
        >
          <option value="">Semua prioritas</option>
          <option value="tinggi">Tinggi</option>
          <option value="sedang">Sedang</option>
          <option value="rendah">Rendah</option>
        </select>
      </div>

      <div className="mt-4 space-y-3">
        {memuat && <p className="text-slate-500">Memuat laporan…</p>}
        {!memuat && !laporan.length && (
          <p className="kartu p-8 text-center text-slate-500">Tidak ada laporan untuk filter ini.</p>
        )}
        {laporan.map((l) => (
          <BarisLaporan key={l.id} laporan={l} onUbahStatus={ubahStatus} onAnalisaUlang={muat} />
        ))}
      </div>
    </div>
  );
}

function Kartu({ label, nilai, nada }: { label: string; nilai: number; nada?: 'merah' | 'kuning' }) {
  const warna =
    nada === 'merah' && nilai > 0
      ? 'text-red-700'
      : nada === 'kuning' && nilai > 0
        ? 'text-amber-700'
        : 'text-slate-900';
  return (
    <div className="kartu p-4">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${warna}`}>{nilai}</p>
    </div>
  );
}

function BarisLaporan({
  laporan: l,
  onUbahStatus,
  onAnalisaUlang,
}: {
  laporan: Laporan;
  onUbahStatus: (id: string, status: StatusLaporan) => void;
  onAnalisaUlang: () => void;
}) {
  return (
    <article className="kartu p-4">
      <div className="flex flex-wrap items-center gap-2">
        <LencanaPrioritas nilai={l.prioritas} />
        <LencanaStatus nilai={l.status} />
        {l.kategori.map((k) => (
          <LencanaKategori key={k} nilai={k} />
        ))}
        <span className="ml-auto text-xs text-slate-500">{waktuRelatif(l.created_at)}</span>
      </div>

      <p className="mt-2 font-semibold">{l.toilet_nama}</p>
      <p className="mt-1 text-slate-800">{l.ringkasan ?? l.teks}</p>

      {l.ringkasan && (
        <p className="mt-1 text-sm italic text-slate-500">Laporan asli: “{l.teks}”</p>
      )}

      {l.rekomendasi && (
        <p className="mt-2 rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
          <span className="font-semibold">Tindakan: </span>
          {l.rekomendasi}
        </p>
      )}

      {l.foto_url && (
        <a href={l.foto_url} target="_blank" rel="noreferrer">
          <img src={l.foto_url} alt="Foto laporan" className="mt-3 max-h-64 rounded-lg" />
        </a>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {l.status !== 'diproses' && l.status !== 'selesai' && (
          <button onClick={() => onUbahStatus(l.id, 'diproses')} className="tombol-netral !py-1.5 text-xs">
            Kerjakan
          </button>
        )}
        {l.status !== 'selesai' && (
          <button onClick={() => onUbahStatus(l.id, 'selesai')} className="tombol-utama !py-1.5 text-xs">
            Tandai selesai
          </button>
        )}
        {l.ai_status === 'gagal' && (
          <button
            onClick={async () => {
              await api.analisaUlang(l.id).catch(() => {});
              setTimeout(onAnalisaUlang, 3000);
            }}
            className="tombol-netral !py-1.5 text-xs"
          >
            Analisis ulang
          </button>
        )}
        {l.petugas && <span className="text-xs text-slate-500">Ditangani: {l.petugas}</span>}
      </div>
    </article>
  );
}
