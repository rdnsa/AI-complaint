import { Hono } from 'hono';
import { currentSession } from '../adapters/session';
import type { AppEnv } from '../env';
import {
  DAILY_LIMIT,
  LimitReached,
  type Asker,
  AskRequest,
  ask,
} from '../services/ask-service';

const app = new Hono<AppEnv>();

/**
 * Question-answering over the report data. Open to everyone, like the public
 * report board; what the model may see depends on who is asking, and the
 * service enforces a daily budget because each call costs real money.
 */

/** The visitor's address, reduced to a short hash: enough to rate-limit, not to identify. */
async function addressFingerprint(c: {
  req: { header: (n: string) => string | undefined };
}): Promise<string> {
  const ip =
    c.req.header('cf-connecting-ip') ?? c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ?? 'local';
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(ip));
  return [...new Uint8Array(digest).slice(0, 8)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

app.get('/', (c) => c.json({ daily_limit: DAILY_LIMIT }));

app.post('/', async (c) => {
  const body = AskRequest.safeParse(await c.req.json().catch(() => ({})));
  if (!body.success) {
    return c.json({ error: body.error.issues[0]?.message ?? 'Permintaan tidak valid' }, 400);
  }

  const session = await currentSession(c);
  const asker: Asker =
    session && session.role !== 'reporter'
      ? { kind: 'supervisor', name: session.name }
      : session
        ? { kind: 'reporter', name: session.name, ip: await addressFingerprint(c) }
        : { kind: 'visitor', ip: await addressFingerprint(c) };

  try {
    return c.json(await ask(c.env, asker, body.data));
  } catch (err) {
    if (err instanceof LimitReached) return c.json({ error: err.message }, 429);
    const message = err instanceof Error ? err.message : String(err);
    console.error(`Ask failed: ${message}`);
    return c.json({ error: 'Model tidak dapat menjawab saat ini. Coba lagi sebentar.' }, 502);
  }
});

export default app;
