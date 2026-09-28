import { useEffect, useState } from 'react';
import Header from '../components/Header';
import { api, type LeaderboardRow } from '../lib/api';
import { useLanguage } from '../lib/i18n';
import { useSession } from '../lib/session';
import { PodiumMark, RankMark } from '../components/Marks';
import { Reveal } from '../lib/motion';

export default function Leaderboard() {
  const { t } = useLanguage();
  const { session } = useSession();
  const [data, setData] = useState<LeaderboardRow[]>([]);
  const [me, setMe] = useState<{ rank: number; reports: number } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .leaderboard()
      .then((r) => {
        setData(r.data);
        setMe(r.me);
      })
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen pb-16">
      <Header
        title={t('leaderboard.title')}
        description={t('leaderboard.description')}
        mark={<PodiumMark size="h-12 w-12 rounded-[14px]" />}
      />

      <main className="mx-auto max-w-2xl px-4">
        {session?.role === 'reporter' && me && (
          <p className="mt-6 rounded-nav bg-accent-50 px-5 py-4 text-body-sm font-semibold text-accent-700">
            {me.reports
              ? t('leaderboard.my_position', { rank: me.rank, reports: me.reports })
              : t('leaderboard.no_reports_yet')}
          </p>
        )}

        {loading && <p className="mt-6 text-ink-600">{t('common.loading')}</p>}
        {!loading && !data.length && (
          <p className="card mt-6 p-10 text-center text-ink-600">{t('leaderboard.empty')}</p>
        )}

        <Reveal as="ol" stagger className="mt-4 space-y-2">
          {data.map((u, i) => {
            const isMe = session?.id === u.id;
            return (
              <li
                key={u.id}
                className={`card flex items-center gap-3 p-3.5 ${
                  isMe ? 'ring-2 ring-accent-400' : ''
                }`}
              >
                <RankMark rank={i + 1} />
                <span className="sr-only">#{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold text-ink-900">{u.name}</p>
                  <p className="text-xs text-ink-600">
                    {t('leaderboard.resolved', { n: u.resolved ?? 0 })}
                  </p>
                </div>
                <span className="shrink-0 text-sm font-bold text-accent-600">
                  {t('leaderboard.reports', { n: u.reports })}
                </span>
              </li>
            );
          })}
        </Reveal>
      </main>
    </div>
  );
}
