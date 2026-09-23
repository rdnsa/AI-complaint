import { useCallback, useEffect, useState } from 'react';
import { api, type ManagedAccount } from '../lib/api';
import PasswordInput from './PasswordInput';
import { useLanguage } from '../lib/i18n';
import { useSession } from '../lib/session';

/**
 * The supervisor maintains two lists here: the staff names that appear on the
 * floor-page dropdown (a name is all a cleaner needs), and the supervisor
 * accounts that sign in to this dashboard.
 */
export default function AccountsPanel() {
  const { t } = useLanguage();
  const { session } = useSession();
  const [accounts, setAccounts] = useState<ManagedAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setAccounts((await api.users()).data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="mt-6 space-y-4">
      <AddForm
        onDone={load}
        onError={setError}
      />

      {error && (
        <p className="rounded-xl bg-red-50 px-3.5 py-2.5 text-sm font-medium text-red-800">{error}</p>
      )}

      {loading && <p className="text-maroon-600">{t('common.loading')}</p>}

      <ul className="space-y-2">
        {accounts.map((u) => (
          <li key={u.id} className="card p-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-bold text-maroon-900">{u.name}</span>
              {u.username && (
                <code className="rounded bg-krem-100 px-1.5 py-0.5 text-xs text-maroon-700">
                  {u.username}
                </code>
              )}
              <span className="rounded-full bg-krem-100 px-2 py-0.5 text-xs font-bold uppercase tracking-wide text-maroon-600">
                {u.role === 'supervisor' ? 'SPV' : t('account.role_staff')}
              </span>
              {!u.active && (
                <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-bold text-red-700 ring-1 ring-red-200">
                  {t('account.inactive')}
                </span>
              )}
              <div className="ml-auto flex gap-2">
                <button
                  onClick={() => setEditing(editing === u.id ? null : u.id)}
                  className="btn-neutral !py-1.5 text-xs"
                >
                  {editing === u.id ? t('account.cancel') : t('account.edit')}
                </button>
                {/* The signed-in supervisor must not be able to lock themselves out. */}
                {u.id !== session?.id && (
                  <button
                    onClick={async () => {
                      await api.updateUser(u.id, { active: !u.active }).catch(() => {});
                      load();
                    }}
                    className="btn-neutral !py-1.5 text-xs"
                  >
                    {u.active ? t('account.deactivate') : t('account.activate')}
                  </button>
                )}
              </div>
            </div>

            {editing === u.id && (
              <EditForm
                account={u}
                onDone={() => {
                  setEditing(null);
                  load();
                }}
                onError={setError}
              />
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

function AddForm({
  onDone,
  onError,
}: {
  onDone: () => void;
  onError: (p: string | null) => void;
}) {
  const { t } = useLanguage();
  const [role, setRole] = useState<'staff' | 'supervisor'>('staff');
  const [username, setUsername] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    onError(null);
    try {
      await api.createUser(
        role === 'staff' ? { role, name } : { role, username, name, password },
      );
      setUsername('');
      setName('');
      setPassword('');
      onDone();
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Gagal menambah akun');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="card p-4">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <h3 className="section-title">{role === 'staff' ? t('account.add_staff') : t('account.add_supervisor')}</h3>
        <select
          className="input ml-auto !w-auto !py-1.5 text-sm"
          value={role}
          onChange={(e) => setRole(e.target.value as 'staff' | 'supervisor')}
        >
          <option value="staff">{t('account.role_staff')}</option>
          <option value="supervisor">SPV</option>
        </select>
      </div>
      {role === 'staff' && <p className="mb-3 text-xs text-maroon-600">{t('account.staff_no_login')}</p>}
      <div className={`grid gap-3 ${role === 'supervisor' ? 'sm:grid-cols-3' : ''}`}>
        {role === 'supervisor' && (
          <input
            className="input"
            placeholder={t('account.username')}
            autoCapitalize="none"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
        )}
        <input
          className="input"
          placeholder={t('account.name')}
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        {role === 'supervisor' && (
          <PasswordInput
            placeholder={t('login.password')}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        )}
      </div>
      <button type="submit" disabled={busy} className="btn-primary mt-3 !py-2 text-sm">
        {role === 'staff' ? t('account.add_staff') : t('account.add_supervisor')}
      </button>
    </form>
  );
}

function EditForm({
  account,
  onDone,
  onError,
}: {
  account: ManagedAccount;
  onDone: () => void;
  onError: (p: string | null) => void;
}) {
  const { t } = useLanguage();
  const [name, setName] = useState(account.name);
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    onError(null);
    try {
      await api.updateUser(account.id, {
        name: name !== account.name ? name : undefined,
        // An empty password field means the existing password is kept.
        password: password ? password : undefined,
      });
      onDone();
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Gagal menyimpan');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-3 border-t border-krem-200 pt-3">
      <div className={`grid gap-3 ${account.role === 'supervisor' ? 'sm:grid-cols-2' : ''}`}>
        <div>
          <label className="label">{t('account.name')}</label>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        {/* Cleaning staff have no password to change. */}
        {account.role === 'supervisor' && (
        <div>
          <label className="label">{t('account.new_password')}</label>
          <PasswordInput
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <p className="mt-1 text-xs text-maroon-600">{t('account.password_blank_hint')}</p>
        </div>
        )}
      </div>
      <button type="submit" disabled={busy} className="btn-primary mt-3 !py-2 text-sm">
        {t('account.save')}
      </button>
    </form>
  );
}
