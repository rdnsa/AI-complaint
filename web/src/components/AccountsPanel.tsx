import { useCallback, useEffect, useState } from 'react';
import { api, type CleaningArea, type ManagedAccount } from '../lib/api';
import PasswordInput from './PasswordInput';
import { useLanguage } from '../lib/i18n';
import { useSession } from '../lib/session';
import Select from './Select';

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
  // Whose placement letter (duties) is open; one at a time.
  const [duties, setDuties] = useState<string | null>(null);

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
        <p className="rounded-nav bg-red-50 px-4 py-3 text-body-sm font-medium text-red-800">{error}</p>
      )}

      {loading && <p className="text-ink-600">{t('common.loading')}</p>}

      <ul className="space-y-2">
        {accounts.map((u) => (
          <li key={u.id} className="card p-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-bold text-ink-900">{u.name}</span>
              {u.username && (
                <code className="rounded bg-mist-100 px-1.5 py-0.5 text-xs text-ink-700">
                  {u.username}
                </code>
              )}
              <span className="rounded-full bg-mist-100 px-2 py-0.5 text-nav font-semibold text-ink-600">
                {u.role === 'supervisor' ? t('account.role_supervisor') : t('account.role_staff')}
              </span>
              {!u.active && (
                <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-bold text-red-700 ring-1 ring-red-200">
                  {t('account.inactive')}
                </span>
              )}
              {u.role === 'staff' && (
                <span
                  className={`rounded-full px-2 py-0.5 text-nav font-semibold ${
                    u.area_count ? 'bg-accent-50 text-accent-700' : 'bg-amber-50 text-amber-800'
                  }`}
                >
                  {u.area_count ? t('duties.count', { areas: u.area_count, n: u.daily_target }) : t('duties.none')}
                </span>
              )}
              <div className="ml-auto flex flex-wrap gap-2">
                {u.role === 'staff' && (
                  <button
                    onClick={() => setDuties(duties === u.id ? null : u.id)}
                    aria-expanded={duties === u.id}
                    className="btn-neutral !py-1.5 text-xs"
                  >
                    {duties === u.id ? t('account.cancel') : t('duties.open')}
                  </button>
                )}
                <button
                  onClick={() => setEditing(editing === u.id ? null : u.id)}
                  className="btn-neutral !py-1.5 text-xs"
                >
                  {editing === u.id ? t('account.cancel') : t('account.edit')}
                </button>
                {/* The signed-in supervisor can neither deactivate nor delete their own account. */}
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
                {u.id !== session?.id && (
                  <button
                    onClick={async () => {
                      if (!confirm(t('account.delete_confirm', { name: u.name }))) return;
                      setError(null);
                      try {
                        await api.deleteUser(u.id);
                      } catch (err) {
                        // An account with history is refused; the message says to deactivate it.
                        setError(err instanceof Error ? err.message : 'Gagal menghapus');
                      }
                      load();
                    }}
                    className="btn !py-1.5 text-xs text-red-700 hover:bg-red-50"
                  >
                    {t('account.delete')}
                  </button>
                )}
              </div>
            </div>
            {u.role === 'staff' && u.assignment && (
              <p className="mt-1 text-xs text-ink-600">
                {u.job_title ? `${u.job_title} · ` : ''}
                {u.assignment}
              </p>
            )}

            {duties === u.id && (
              <DutiesForm
                account={u}
                onDone={() => {
                  setDuties(null);
                  load();
                }}
                onError={setError}
              />
            )}

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

/**
 * The placement letter of one staff member: title, area and the numbered duties,
 * one per line. The number of lines is the person's daily task target on the
 * dashboard (tasks reported against duties × working days).
 */
function DutiesForm({
  account,
  onDone,
  onError,
}: {
  account: ManagedAccount;
  onDone: () => void;
  onError: (p: string | null) => void;
}) {
  const { t } = useLanguage();
  const [jobTitle, setJobTitle] = useState('');
  const [assignment, setAssignment] = useState('');
  const [text, setText] = useState('');
  const [mine, setMine] = useState<Set<string>>(new Set());
  const [allAreas, setAllAreas] = useState<CleaningArea[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    Promise.all([api.staffDuties(account.id), api.cleaningAreas()])
      .then(([d, a]) => {
        setJobTitle(d.job_title ?? '');
        setAssignment(d.assignment ?? '');
        setText(d.duties.join('\n'));
        setMine(new Set(d.areas));
        setAllAreas(a.data);
      })
      .catch((err) => onError(err instanceof Error ? err.message : 'Gagal memuat uraian tugas'))
      .finally(() => setLoaded(true));
  }, [account.id, onError]);

  // The QR areas grouped by building, so a person's floors are ticked side by side.
  const groups = new Map<string, CleaningArea[]>();
  for (const a of allAreas) {
    const key = a.building_name ?? a.name;
    groups.set(key, [...(groups.get(key) ?? []), a]);
  }
  const toggle = (id: string) =>
    setMine((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  // A short label for an area within its building: the yard, a floor, or the place itself.
  const short = (a: CleaningArea) =>
    a.floor === 0 ? t('duties.area_yard') : a.floor ? t('duties.area_floor', { n: a.floor }) : a.name;

  // A pasted list keeps working with or without its numbers ("1. Menyapu ...").
  const lines = text
    .split('\n')
    .map((l) => l.replace(/^\s*\d+[.)]\s*/, '').trim())
    .filter(Boolean);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    onError(null);
    try {
      await api.saveStaffDuties(account.id, { job_title: jobTitle, assignment, duties: lines, areas: [...mine] });
      onDone();
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Gagal menyimpan uraian tugas');
    } finally {
      setBusy(false);
    }
  }

  if (!loaded) return <p className="mt-3 text-sm text-ink-600">{t('common.loading')}</p>;

  return (
    <form onSubmit={submit} className="mt-3 space-y-3 border-t border-mist-200 pt-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-xs font-semibold text-ink-700">
          {t('duties.job_title')}
          <input className="input mt-1" value={jobTitle} maxLength={200} onChange={(e) => setJobTitle(e.target.value)} />
        </label>
        <label className="text-xs font-semibold text-ink-700">
          {t('duties.assignment')}
          <input className="input mt-1" value={assignment} maxLength={200} onChange={(e) => setAssignment(e.target.value)} />
        </label>
      </div>
      {/* Which QR areas are theirs: shown to them on the round as a hint. */}
      <fieldset>
        <legend className="text-xs font-semibold text-ink-700">{t('duties.areas', { n: mine.size })}</legend>
        <p className="mb-2 text-xs text-ink-600">{t('duties.areas_hint')}</p>
        <div className="space-y-1.5">
          {[...groups].map(([building, list]) => (
            <div key={building} className="flex flex-wrap items-center gap-1.5">
              <span className="w-full text-xs font-semibold text-ink-600 sm:w-44">{building}</span>
              {list.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => toggle(a.id)}
                  aria-pressed={mine.has(a.id)}
                  className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 transition ${
                    mine.has(a.id) ? 'bg-accent-500 text-white ring-accent-500' : 'text-ink-700 ring-mist-300 hover:bg-mist-100'
                  }`}
                >
                  {short(a)}
                </button>
              ))}
            </div>
          ))}
        </div>
      </fieldset>

      <label className="block text-xs font-semibold text-ink-700">
        {t('duties.list')}
        <textarea
          className="input mt-1 min-h-56 font-normal leading-relaxed"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={t('duties.placeholder')}
        />
      </label>
      <div className="flex flex-wrap items-center gap-3">
        {/* The target is counted from the areas, as the dashboard counts it; the letter above is a reference. */}
        <p className="text-xs text-ink-600">
          {t('duties.target_hint', {
            areas: mine.size,
            n: allAreas.filter((a) => mine.has(a.id)).reduce((sum, a) => sum + a.tasks.length, 0),
          })}
        </p>
        <button disabled={busy} className="btn-primary ml-auto !py-1.5 text-sm">
          {busy ? t('duties.saving') : t('duties.save')}
        </button>
      </div>
    </form>
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
        <Select
          className="input ml-auto !w-auto !py-1.5 text-sm"
          value={role}
          onChange={(v) => setRole(v as 'staff' | 'supervisor')}
        >
          <option value="staff">{t('account.role_staff')}</option>
          <option value="supervisor">{t('account.role_supervisor')}</option>
        </Select>
      </div>
      {role === 'staff' && <p className="mb-3 text-xs text-ink-600">{t('account.staff_no_login')}</p>}
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
    <form onSubmit={submit} className="mt-3 border-t border-mist-200 pt-3">
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
          <p className="mt-1 text-xs text-ink-600">{t('account.password_blank_hint')}</p>
        </div>
        )}
      </div>
      <button type="submit" disabled={busy} className="btn-primary mt-3 !py-2 text-sm">
        {t('account.save')}
      </button>
    </form>
  );
}
