/**
 * A stand-in for the LLM provider, speaking the OpenAI chat-completions format.
 *
 * The Worker under test is pointed here through LLM_BASE_URL,
 * so a test run costs nothing, never reaches a real provider, and gets the same
 * answer every time. Which answer is steered by a marker in the complaint text:
 *
 *   [llm:error]      the text model answers HTTP 500
 *   [llm:fail-once]  HTTP 500 the first time, a normal answer afterwards
 *   [llm:not-json]   the text model answers with prose instead of JSON
 *   [llm:odd]        an invented category and priority, which the Worker must coerce
 *   [llm:slow]       the analysis takes three seconds
 *   [ask:error]      (in a question) the text model answers HTTP 500
 *   per petugas      (in a question) the model asks to group by staff member
 *
 * GET /__stats reports what the Worker sent, which is how the suite proves it
 * only ever talks to this mock, with the fake keys.
 */
import { createServer } from 'node:http';

/** The first key in the Worker's list; refused, so every call also exercises key failover. */
export const REFUSED_KEY = 'e2e-refused-key';

const stats = { total: 0, analysis: 0, summary: 0, ask: 0, refused: 0, keys: [] };
const failedOnce = new Set();

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const completion = (message, extra = {}) => ({
  id: 'mock',
  object: 'chat.completion',
  choices: [{ index: 0, finish_reason: 'stop', message: { role: 'assistant', ...message } }],
  usage: { prompt_tokens: 10, completion_tokens: 10 },
  ...extra,
});

const json = (value) => completion({ content: JSON.stringify(value) });

function analysis(text) {
  if (text.includes('[llm:not-json]')) return completion({ content: 'Maaf, saya tidak bisa menjawab.' });
  if (text.includes('[llm:odd]')) {
    return json({ categories: ['bukan-kategori'], priority: 'darurat', summary: 'Ringkasan tiruan aneh.', recommendation: 'Saran tiruan.' });
  }
  // A coarse keyword rule, enough to tell the priorities apart in the tests.
  const flooded = /banjir|becek|meluap|mampet/i.test(text);
  const smelly = /\bbau\b/i.test(text);
  return json({
    categories: [flooded && 'flooding', smelly && 'odor'].filter(Boolean).concat(flooded || smelly ? [] : ['cleanliness']),
    priority: flooded ? 'high' : /sedikit|debu/i.test(text) ? 'low' : 'medium',
    summary: 'Ringkasan tiruan dari LLM.',
    recommendation: 'Rekomendasi tiruan dari LLM.',
  });
}

function ask(body) {
  const results = body.messages.filter((m) => m.role === 'tool');
  const question = [...body.messages].reverse().find((m) => m.role === 'user')?.content ?? '';
  if (!results.length) {
    const args = /per petugas/i.test(question) ? { group_by: 'staff' } : { group_by: 'building' };
    return completion({
      content: null,
      tool_calls: [{ id: 'call_1', type: 'function', function: { name: 'count_reports', arguments: JSON.stringify(args) } }],
    });
  }
  // Echoes what the Worker offered and returned, so a test can check both.
  const groupings = body.tools[0].function.parameters.properties.group_by.enum.join(',');
  return completion({ content: `Jawaban tiruan. grouping=${groupings}. hasil=${results[0].content.slice(0, 500)}` });
}

async function answer(body) {
  const first = body.messages[0];
  const last = body.messages[body.messages.length - 1];
  const lastText = String(last.content ?? '');

  if (body.tools) {
    stats.ask++;
    const question = [...body.messages].reverse().find((m) => m.role === 'user')?.content ?? '';
    return String(question).includes('[ask:error]') ? null : ask(body);
  }
  if (String(first.content).includes('laporan harian')) {
    stats.summary++;
    return json({ summary: 'Ringkasan harian tiruan dari LLM.', highlights: ['Sorotan tiruan pertama', 'Sorotan tiruan kedua'] });
  }

  stats.analysis++;
  if (lastText.includes('[llm:error]')) return null;
  if (lastText.includes('[llm:fail-once]') && !failedOnce.has(lastText)) {
    failedOnce.add(lastText);
    return null;
  }
  if (lastText.includes('[llm:slow]')) await sleep(3000);
  return analysis(lastText);
}

export function startMockLlm(port) {
  const server = createServer(async (req, res) => {
    const send = (status, value) => {
      res.writeHead(status, { 'content-type': 'application/json' });
      res.end(JSON.stringify(value));
    };

    if (req.method === 'GET' && req.url === '/__stats') return send(200, stats);
    if (req.method !== 'POST' || !req.url.endsWith('/chat/completions')) {
      return send(404, { error: { message: `Mock LLM: ${req.method} ${req.url} tidak dikenal` } });
    }

    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);

    stats.total++;
    const key = (req.headers.authorization ?? '').replace(/^Bearer /, '');
    if (!stats.keys.includes(key)) stats.keys.push(key);
    if (key === REFUSED_KEY) {
      stats.refused++;
      return send(429, { error: { message: 'Mock LLM: kunci ini sengaja dibatasi' } });
    }

    const reply = await answer(JSON.parse(Buffer.concat(chunks).toString()));
    return reply ? send(200, reply) : send(500, { error: { message: 'Mock LLM: kegagalan yang disengaja' } });
  });

  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, '127.0.0.1', () => resolve(server));
  });
}
