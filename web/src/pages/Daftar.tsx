import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Kop from '../components/Kop';
import { api } from '../lib/api';
import { useBahasa } from '../lib/i18n';
import { useSesi } from '../lib/sesi';

/** Self-registration is for reporters only; staff accounts are created by an admin. */
export default function Daftar() {
  const { t } = useBahasa();
  const { pasang } = useSesi();
  const navigate = useNavigate();

  const [username, setUsername] = useState('');
  const [nama, setNama] = useState('');
  const [password, setPassword] = useState('');
  const [galat, setGalat] = useState<string | null>(null);
  const [proses, setProses] = useState(false);

  async function kirim(e: React.FormEvent) {
    e.preventDefault();
    setProses(true);
    setGalat(null);
    try {
      pasang(await api.daftar(username, nama, password));
      navigate('/', { replace: true });
    } catch (err) {
      setGalat(err instanceof Error ? err.message : t('login.galat'));
      setProses(false);
    }
  }

  return (
    <div className="min-h-screen">
      <Kop judul={t('daftar.judul')} keterangan={t('daftar.keterangan')} ramping />
      <main className="mx-auto max-w-sm px-4">
        <form onSubmit={kirim} className="kartu mt-8 space-y-4 p-5">
          <div>
            <label htmlFor="u" className="label">
              {t('login.username')}
            </label>
            <input
              id="u"
              className="input"
              autoCapitalize="none"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
            <p className="mt-1 text-xs text-maroon-600">{t('daftar.syarat_username')}</p>
          </div>
          <div>
            <label htmlFor="n" className="label">
              {t('login.nama')}
            </label>
            <input
              id="n"
              className="input"
              autoComplete="name"
              value={nama}
              onChange={(e) => setNama(e.target.value)}
              required
            />
          </div>
          <div>
            <label htmlFor="p" className="label">
              {t('login.password')}
            </label>
            <input
              id="p"
              type="password"
              className="input"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <p className="mt-1 text-xs text-maroon-600">{t('daftar.syarat_sandi')}</p>
          </div>
          {galat && <p className="text-sm font-medium text-red-700">{galat}</p>}
          <button type="submit" disabled={proses} className="tombol-utama w-full py-3">
            {proses ? t('daftar.memproses') : t('daftar.tombol')}
          </button>
        </form>

        <Link
          to="/masuk"
          className="mx-auto mt-6 block w-fit text-sm font-semibold text-maroon-600 underline decoration-krem-300 underline-offset-4 hover:text-bata-600"
        >
          {t('daftar.sudah_punya')}
        </Link>
      </main>
    </div>
  );
}
