/**
 * The staging site's front door: one domain for every checkpoint.
 *
 *   /checkpoint          the hub (a static page built by journey.mjs)
 *   /panduan[.pdf]       the general guide (staging/docs/panduan-umum)
 *   /teknis[.pdf]        the technical documentation (staging/docs/dokumentasi-teknis)
 *   /checkpointN[/path]  choose checkpoint N, then continue at /path (default /)
 *   anything else        forwarded to the chosen checkpoint's Worker, or to
 *                        the latest one when nothing has been chosen yet
 *
 * The apps use absolute paths everywhere (/api/…, /lapor/…), so they cannot
 * live under a path prefix. The choice is kept in a cookie instead, and each
 * request travels to the checkpoint's Worker over a service binding — the
 * address bar never leaves this domain.
 *
 * Every checkpoint has its own database, so its cookies are kept apart: they
 * are stored here as "cpN_<name>" and handed to the app under their own name
 * only while checkpoint N is active. A session from one checkpoint is
 * therefore never read by another, where the same user id could be someone
 * else.
 *
 * Bindings: ASSETS (the hub), CP1…CPn (service bindings), CHECKPOINTS ("1,2,…"),
 * TOTAL (the number of checkpoints planned).
 */
const CHOICE = 'kato_checkpoint';
const STATIC_PAGES = new Set(['/checkpoint', '/panduan', '/panduan.pdf', '/teknis', '/teknis.pdf']);

function readCookies(header) {
  const cookies = new Map();
  for (const part of (header ?? '').split(';')) {
    const i = part.indexOf('=');
    if (i > 0) cookies.set(part.slice(0, i).trim(), part.slice(i + 1).trim());
  }
  return cookies;
}

/** The badge that tells the tester which checkpoint they are in. */
function badge(n, total) {
  return `<a href="/checkpoint" data-staging-badge style="position:fixed;left:12px;bottom:12px;z-index:2147483647;display:inline-flex;align-items:center;gap:6px;padding:7px 12px;border-radius:999px;background:rgba(29,29,31,.88);color:#fff;font:600 12px/1.2 -apple-system,BlinkMacSystemFont,Inter,Arial,sans-serif;text-decoration:none;box-shadow:0 2px 10px rgba(0,0,0,.2);-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px)">Checkpoint ${n}/${total}<span style="opacity:.7;font-weight:500">· ganti</span></a>`;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const reached = env.CHECKPOINTS.split(',').map(Number);
    const latest = reached[reached.length - 1];

    const page = url.pathname.replace(/\/$/, '');
    if (STATIC_PAGES.has(page)) return env.ASSETS.fetch(new Request(new URL(page, url), request));
    // The progress report used to be one document at /dokumentasi.
    if (page === '/dokumentasi' || page === '/dokumentasi.pdf') {
      return Response.redirect(new URL(page.replace('/dokumentasi', '/panduan'), url).toString(), 301);
    }

    const pick = url.pathname.match(/^\/checkpoint(\d+)(\/.*)?$/);
    if (pick) {
      const n = Number(pick[1]);
      if (!reached.includes(n)) return Response.redirect(new URL('/checkpoint', url).toString(), 302);
      const headers = new Headers({ location: (pick[2] || '/') + url.search, 'cache-control': 'no-store' });
      headers.append('set-cookie', `${CHOICE}=${n}; Path=/; Max-Age=2592000; SameSite=Lax; Secure`);
      return new Response(null, { status: 302, headers });
    }

    const cookies = readCookies(request.headers.get('cookie'));
    const chosen = Number(cookies.get(CHOICE));
    const n = reached.includes(chosen) ? chosen : latest;
    const prefix = `cp${n}_`;

    // Hand the app only its own cookies, under their original names.
    const own = [...cookies].filter(([k]) => k.startsWith(prefix)).map(([k, v]) => `${k.slice(prefix.length)}=${v}`);
    const headers = new Headers(request.headers);
    if (own.length) headers.set('cookie', own.join('; '));
    else headers.delete('cookie');

    const upstream = await env[`CP${n}`].fetch(new Request(request, { headers }));

    // Store whatever the app sets under this checkpoint's prefix.
    const response = new Response(upstream.body, upstream);
    const setCookies = upstream.headers.getSetCookie();
    if (setCookies.length) {
      response.headers.delete('set-cookie');
      for (const c of setCookies) response.headers.append('set-cookie', prefix + c.trimStart());
    }

    if ((response.headers.get('content-type') ?? '').includes('text/html')) {
      return new HTMLRewriter()
        .on('body', { element: (el) => el.append(badge(n, env.TOTAL), { html: true }) })
        .transform(response);
    }
    return response;
  },
};
