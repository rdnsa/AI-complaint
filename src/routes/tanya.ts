import { Hono } from 'hono';
import { sesiSaatIni } from '../adapters/session';
import type { AppEnv } from '../env';
import {
  BATAS_HARIAN,
  BatasTercapai,
  type Penanya,
  PermintaanTanya,
  tanya,
} from '../services/tanya-service';

const app = new Hono<AppEnv>();

/**
 * Question-answering over the report data. Open to everyone, like the public
 * report board; what the model may see depends on who is asking, and the
 * service enforces a daily budget because each call costs real money.
 */

/** The visitor's address, reduced to a short hash: enough to rate-limit, not to identify. */
async function sidikAlamat(c: { req: { header: (n: string) => string | undefined } }): Promise<string> {
  const ip =
    c.req.header('cf-connecting-ip') ?? c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ?? 'lokal';
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(ip));
  return [...new Uint8Array(digest).slice(0, 8)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

app.get('/', (c) => c.json({ batas_harian: BATAS_HARIAN }));

app.post('/', async (c) => {
  const body = PermintaanTanya.safeParse(await c.req.json().catch(() => ({})));
  if (!body.success) {
    return c.json({ error: body.error.issues[0]?.message ?? 'Permintaan tidak valid' }, 400);
  }

  const sesi = await sesiSaatIni(c);
  const penanya: Penanya =
    sesi && sesi.peran !== 'pelapor'
      ? { jenis: 'staf', nama: sesi.nama }
      : sesi
        ? { jenis: 'pelapor', nama: sesi.nama, ip: await sidikAlamat(c) }
        : { jenis: 'pengunjung', ip: await sidikAlamat(c) };

  try {
    return c.json(await tanya(c.env, penanya, body.data));
  } catch (err) {
    if (err instanceof BatasTercapai) return c.json({ error: err.message }, 429);
    const pesan = err instanceof Error ? err.message : String(err);
    console.error(`Tanya data gagal: ${pesan}`);
    return c.json({ error: 'Model tidak dapat menjawab saat ini. Coba lagi sebentar.' }, 502);
  }
});

export default app;
