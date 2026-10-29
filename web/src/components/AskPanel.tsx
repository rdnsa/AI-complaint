import { useEffect, useRef, useState, type FormEvent } from 'react';
import { api, ApiError, type AskMessage } from '../lib/api';
import { useLanguage } from '../lib/i18n';
import { ChatGlyph } from './Marks';
import { useSession } from '../lib/session';

type Bubble = AskMessage;

/** Staff may ask about individual staff members; the public gets a question about totals instead. */
const STAFF_EXAMPLES = ['ask.example1', 'ask.example2', 'ask.example3', 'ask.example4'] as const;
const PUBLIC_EXAMPLES = ['ask.example1', 'ask.example2', 'ask.example3', 'ask.example4_public'] as const;

/** How many recent turns go back to the server with each question. */
const HISTORY_SENT = 6;

/**
 * Ask questions about the report data in plain language. Open to everyone on
 * the landing page, inside the floating chat window (FloatingChat); the server
 * decides how much detail the asker may see. It fills whatever box it is given.
 */
export default function AskPanel() {
  const { t } = useLanguage();
  const { session } = useSession();
  const examples = session && session.role !== 'reporter' ? STAFF_EXAMPLES : PUBLIC_EXAMPLES;
  const [conversation, setConversation] = useState<Bubble[]>([]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [remaining, setRemaining] = useState<number | null>(null);
  const end = useRef<HTMLDivElement>(null);

  useEffect(() => {
    end.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [conversation, busy]);

  async function send(question: string) {
    const clean = question.trim();
    if (!clean || busy) return;

    setError(null);
    setText('');
    setBusy(true);
    const history: AskMessage[] = conversation
      .slice(-HISTORY_SENT)
      .map(({ role, text }) => ({ role, text }));
    setConversation((c) => [...c, { role: 'user', text: clean }]);

    try {
      const answer = await api.ask(clean, history);
      setConversation((c) => [...c, { role: 'assistant', text: answer.text }]);
      setRemaining(answer.remaining_today);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('ask.error'));
      // Put the question back so it can be sent again after the error.
      setConversation((c) => c.slice(0, -1));
      setText(clean);
    } finally {
      setBusy(false);
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    send(text);
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
        {!conversation.length && !busy && (
          <div>
            <p className="text-sm leading-relaxed text-ink-700">{t('ask.description')}</p>
            <p className="section-title mt-4">{t('ask.try')}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {examples.map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => send(t(k))}
                  disabled={busy}
                  className="rounded-full border border-ink-600/40 bg-glass px-3.5 py-2 text-left text-nav text-ink-900 transition hover:border-accent-500 hover:bg-accent-50 hover:text-accent-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {t(k)}
                </button>
              ))}
            </div>
          </div>
        )}

        {conversation.map((b, i) =>
          b.role === 'user' ? (
            <div key={i} className="flex justify-end">
              <p className="max-w-[85%] rounded-2xl rounded-br-md bg-accent-500 px-4 py-2.5 text-sm text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.25)]">
                {b.text}
              </p>
            </div>
          ) : (
            <div key={i} className="flex justify-start">
              <div className="max-w-[85%] rounded-2xl rounded-bl-md bg-glass px-4 py-2.5 text-sm text-ink-900 shadow-[inset_0_1px_0_rgb(255_255_255/0.5)] ring-1 ring-white/50 dark:shadow-[inset_0_1px_0_rgb(255_255_255/0.08)] dark:ring-white/10">
                <p className="mb-1 flex items-center gap-1.5 text-nav font-semibold text-ink-600">
                  <ChatGlyph className="h-3.5 w-3.5" />
                  {t('ask.ai_label')}
                </p>
                <p className="whitespace-pre-line leading-relaxed">{b.text}</p>
              </div>
            </div>
          ),
        )}

        {busy && (
          <div className="flex justify-start">
            <p className="rounded-2xl rounded-bl-md bg-glass px-4 py-2.5 text-sm italic text-ink-600 ring-1 ring-white/50 dark:ring-white/10">
              {t('ask.thinking')}
            </p>
          </div>
        )}

        {error && (
          <p role="alert" className="rounded-nav bg-red-50 px-4 py-3 text-body-sm font-medium text-red-800">
            {error}
          </p>
        )}
        <div ref={end} />
      </div>

      <div className="border-t border-white/40 dark:border-white/10">
        <form onSubmit={onSubmit} className="flex gap-2 p-3">
          <input
            className="input min-w-0 flex-1"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={t('ask.placeholder')}
            maxLength={500}
            disabled={busy}
          />
          <button type="submit" disabled={busy || !text.trim()} className="btn-primary">
            {t('ask.submit')}
          </button>
        </form>
        <div className="flex min-h-5 flex-wrap items-center justify-between gap-2 px-4 pb-2.5 text-xs text-ink-600">
          {remaining !== null ? <span>{t('ask.remaining', { n: remaining })}</span> : <span />}
          {!!conversation.length && (
            <button
              type="button"
              onClick={() => {
                setConversation([]);
                setError(null);
              }}
              className="underline-offset-2 hover:underline"
            >
              {t('ask.clear')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
