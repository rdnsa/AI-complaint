import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import PasswordInput from '../components/PasswordInput';
import Header from '../components/Header';
import { api } from '../lib/api';
import { useLanguage } from '../lib/i18n';
import { useSession } from '../lib/session';

export default function Login() {
  const { t } = useLanguage();
  const { setSession } = useSession();
  const navigate = useNavigate();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const session = await api.login(username, password);
      setSession(session);
      // The supervisor goes straight to the dashboard; reporters return to the landing page.
      navigate(session.role === 'supervisor' ? '/supervisor' : '/', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : t('login.error'));
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen">
      <Header title={t('login.title')} description={t('login.description')} compact />
      <main className="mx-auto max-w-sm px-4">
        <form onSubmit={submit} className="card mt-8 space-y-4 p-5">
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
          </div>
          <div>
            <label htmlFor="p" className="label">
              {t('login.password')}
            </label>
            <PasswordInput
              id="p"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          {error && <p className="text-sm font-medium text-red-700">{error}</p>}
          <button type="submit" disabled={busy} className="btn-primary w-full py-3">
            {busy ? t('login.checking') : t('login.submit')}
          </button>
        </form>

        <Link
          to="/register"
          className="mx-auto mt-6 block w-fit text-sm font-semibold text-maroon-600 underline decoration-krem-300 underline-offset-4 hover:text-bata-600"
        >
          {t('login.no_account')}
        </Link>
      </main>
    </div>
  );
}
