import { useCallback, useEffect, useState } from 'react';
import { api, type AkunPengelola } from '../lib/api';
import { useBahasa } from '../lib/i18n';
import { useSesi } from '../lib/sesi';

/** Staff account management — visible and usable by admins only. */
export default function PanelPengguna() {
  const { t } = useBahasa();
  const { sesi } = useSesi();
  const [daftar, setDaftar] = useState<AkunPengelola[]>([]);
  const [memuat, setMemuat] = useState(true);
  const [galat, setGalat] = useState<string | null>(null);
  const [sedangUbah, setSedangUbah] = useState<string | null>(null);

  const muat = useCallback(async () => {
    try {
      setDaftar((await api.daftarPengguna()).data);
    } finally {
      setMemuat(false);
    }
  }, []);

  useEffect(() => {
    muat();
  }, [muat]);

  return (
    <div className="mt-6 space-y-4">
      <FormTambah
        onSelesai={muat}
        onGalat={setGalat}
      />

      {galat && (
        <p className="rounded-xl bg-red-50 px-3.5 py-2.5 text-sm font-medium text-red-800">{galat}</p>
      )}

      {memuat && <p className="text-maroon-600">{t('umum.memuat')}</p>}

      <ul className="space-y-2">
        {daftar.map((u) => (
          <li key={u.id} className="kartu p-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-bold text-maroon-900">{u.nama}</span>
              <code className="rounded bg-krem-100 px-1.5 py-0.5 text-xs text-maroon-700">
                {u.username}
              </code>
              <span className="rounded-full bg-krem-100 px-2 py-0.5 text-xs font-bold uppercase tracking-wide text-maroon-600">
                {u.peran}
              </span>
              {!u.aktif && (
                <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-bold text-red-700 ring-1 ring-red-200">
                  {t('akun.nonaktif')}
                </span>
              )}
              <div className="ml-auto flex gap-2">
                <button
                  onClick={() => setSedangUbah(sedangUbah === u.id ? null : u.id)}
                  className="tombol-netral !py-1.5 text-xs"
                >
                  {sedangUbah === u.id ? t('akun.batal') : t('akun.ubah')}
                </button>
                {/* Admin yang sedang masuk tidak boleh mengunci dirinya sendiri. */}
                {u.id !== sesi?.id && (
                  <button
                    onClick={async () => {
                      await api.ubahPengguna(u.id, { aktif: !u.aktif }).catch(() => {});
                      muat();
                    }}
                    className="tombol-netral !py-1.5 text-xs"
                  >
                    {u.aktif ? t('akun.nonaktifkan') : t('akun.aktifkan')}
                  </button>
                )}
              </div>
            </div>

            {sedangUbah === u.id && (
              <FormUbah
                akun={u}
                onSelesai={() => {
                  setSedangUbah(null);
                  muat();
                }}
                onGalat={setGalat}
              />
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

function FormTambah({
  onSelesai,
  onGalat,
}: {
  onSelesai: () => void;
  onGalat: (p: string | null) => void;
}) {
  const { t } = useBahasa();
  const [username, setUsername] = useState('');
  const [nama, setNama] = useState('');
  const [password, setPassword] = useState('');
  const [proses, setProses] = useState(false);

  async function kirim(e: React.FormEvent) {
    e.preventDefault();
    setProses(true);
    onGalat(null);
    try {
      await api.buatPengguna({ username, nama, password });
      setUsername('');
      setNama('');
      setPassword('');
      onSelesai();
    } catch (err) {
      onGalat(err instanceof Error ? err.message : 'Gagal menambah akun');
    } finally {
      setProses(false);
    }
  }

  return (
    <form onSubmit={kirim} className="kartu p-4">
      <h3 className="judul-bagian mb-3">{t('akun.tambah')}</h3>
      <div className="grid gap-3 sm:grid-cols-3">
        <input
          className="input"
          placeholder={t('akun.username')}
          autoCapitalize="none"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
        />
        <input
          className="input"
          placeholder={t('akun.nama')}
          value={nama}
          onChange={(e) => setNama(e.target.value)}
          required
        />
        <input
          className="input"
          type="password"
          placeholder={t('login.password')}
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </div>
      <button type="submit" disabled={proses} className="tombol-utama mt-3 !py-2 text-sm">
        {t('akun.tambah')}
      </button>
    </form>
  );
}

function FormUbah({
  akun,
  onSelesai,
  onGalat,
}: {
  akun: AkunPengelola;
  onSelesai: () => void;
  onGalat: (p: string | null) => void;
}) {
  const { t } = useBahasa();
  const [nama, setNama] = useState(akun.nama);
  const [password, setPassword] = useState('');
  const [proses, setProses] = useState(false);

  async function kirim(e: React.FormEvent) {
    e.preventDefault();
    setProses(true);
    onGalat(null);
    try {
      await api.ubahPengguna(akun.id, {
        nama: nama !== akun.nama ? nama : undefined,
        // An empty password field means the existing password is kept.
        password: password ? password : undefined,
      });
      onSelesai();
    } catch (err) {
      onGalat(err instanceof Error ? err.message : 'Gagal menyimpan');
    } finally {
      setProses(false);
    }
  }

  return (
    <form onSubmit={kirim} className="mt-3 border-t border-krem-200 pt-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="label">{t('akun.nama')}</label>
          <input className="input" value={nama} onChange={(e) => setNama(e.target.value)} required />
        </div>
        <div>
          <label className="label">{t('akun.password_baru')}</label>
          <input
            className="input"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <p className="mt-1 text-xs text-maroon-600">{t('akun.kosongkan_sandi')}</p>
        </div>
      </div>
      <button type="submit" disabled={proses} className="tombol-utama mt-3 !py-2 text-sm">
        {t('akun.simpan')}
      </button>
    </form>
  );
}
