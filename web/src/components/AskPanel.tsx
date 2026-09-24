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
 * the landing page; the server decides how much detail the asker may see.
 */
export default function AskPanel({ compact = false }: { compact?: boolean }) {
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
    // Compact is the landing-page variant: the surrounding panel already supplies the spacing.
    <div className={compact ? '' : 'mt-6'}>
      <p className="max-w-2xl text-sm leading-relaxed text-maroon-700">{t('ask.description')}</p>

      {!conversation.length && (
        <div className="mt-5">
          <p className="section-title">{t('ask.try')}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {examples.map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => send(t(k))}
                disabled={busy}
                className="rounded-2xl border border-krem-300 bg-permukaan px-3.5 py-2 text-left text-xs font-semibold text-maroon-700 transition hover:border-bata-400 hover:bg-bata-50 hover:text-bata-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {t(k)}
              </button>
            ))}
          </div>
        </div>
      )}

      <section className="card mt-4 flex flex-col overflow-hidden">
        {(conversation.length > 0 || busy || error) && (
        <div className="max-h-[60vh] space-y-3 overflow-y-auto p-4">
          {conversation.map((b, i) =>
            b.role === 'user' ? (
              <div key={i} className="flex justify-end">
                <p className="max-w-[85%] rounded-2xl rounded-br-md bg-maroon-800 px-4 py-2.5 text-sm text-permukaan">
                  {b.text}
                </p>
              </div>
            ) : (
              <div key={i} className="flex justify-start">
                <div className="max-w-[85%] rounded-2xl rounded-bl-md bg-krem-50 px-4 py-2.5 text-sm text-maroon-900 ring-1 ring-krem-200">
                  <p className="mb-1 flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wider text-bata-600">
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
              <p className="rounded-2xl rounded-bl-md bg-krem-50 px-4 py-2.5 text-sm italic text-maroon-600 ring-1 ring-krem-200">
                {t('ask.thinking')}
              </p>
            </div>
          )}

          {error && (
            <p role="alert" className="rounded-xl bg-red-50 px-3.5 py-2.5 text-sm font-medium text-red-800">
              {error}
            </p>
          )}
          <div ref={end} />
        </div>
        )}

        <form onSubmit={onSubmit} className="flex gap-2 bg-permukaan p-3">
          <input
            className="input flex-1"
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
      </section>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-maroon-600">
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
  );
}
