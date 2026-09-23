import { z } from 'zod';
import {
  CATEGORIES,
  PRIORITIES,
  type Category,
  type Priority,
  type ProofVerdict,
} from '../domain/types';
import type { Env } from '../env';

/**
 * The contract for the model's output. The LLM occasionally invents a category
 * outside the list, or returns a string where an array was asked for, so every
 * field is scrubbed again in `coerceAnalysis()` before it reaches the database.
 */
const AnalysisSchema = z.object({
  categories: z.array(z.string()).min(1),
  priority: z.string(),
  summary: z.string().min(1),
  recommendation: z.string().min(1),
});

export interface Analysis {
  categories: Category[];
  priority: Priority;
  summary: string;
  recommendation: string;
}

const SYSTEM_PROMPT = `Kamu adalah asisten petugas kebersihan (OB) kampus.
Tugasmu membaca keluhan mahasiswa tentang toilet/WC kampus yang ditulis dengan bahasa sehari-hari,
termasuk bahasa gaul dan singkatan, lalu mengubahnya menjadi tiket kerja yang terstruktur.

KATEGORI yang boleh dipakai (pilih semua yang relevan, minimal satu). Tulis kodenya persis
dalam bahasa Inggris, salah satu dari: cleanliness, supplies, damage, odor, flooding, other.
- "cleanliness" : kotor, jorok, noda, sampah berserakan, lantai dekil, coretan
- "supplies"    : sabun/tisu/pengharum habis, tidak ada gayung, tempat sampah tidak tersedia
- "damage"      : kloset mampet, keran/flush rusak, pintu/kunci/lampu rusak, kaca pecah
- "odor"        : bau tidak sedap, pesing, bau menyengat
- "flooding"    : lantai becek, air tergenang, air meluap, bocor
- "other"       : selain di atas

ATURAN PRIORITAS (patuhi ketat). Tulis kodenya persis salah satu dari: high, medium, low.
- "high"   : ada risiko keselamatan atau toilet praktis tidak bisa dipakai.
             Contoh: air meluap, kloset mampet, lantai licin/becek parah, listrik/lampu mati total,
             pintu tidak bisa dikunci, bau sangat menyengat, ada pecahan kaca, banyak masalah sekaligus.
- "medium" : mengganggu kenyamanan tetapi toilet masih bisa dipakai.
             Contoh: bau biasa, lantai kotor, sabun habis, tempat sampah penuh.
- "low"    : keluhan kecil atau bersifat antisipasi.
             Contoh: tisu hampir habis, sedikit noda, cermin buram, saran perbaikan.

ATURAN PENULISAN:
- "summary": ringkasan, satu kalimat netral berbahasa Indonesia maksimal 15 kata, tanpa kata kasar,
  memakai istilah baku.
- "recommendation": rekomendasi berupa instruksi kerja untuk petugas, berbahasa Indonesia. Jika ada
  beberapa masalah, urutkan dari yang paling berisiko membuat orang celaka lebih dulu, lalu sisanya.
  Maksimal 2 kalimat.
- Jangan mengarang masalah yang tidak disebut pelapor.
- Jika teks tidak jelas atau bukan keluhan toilet, pakai categories ["other"], priority "low",
  dan tulis apa adanya pada summary.

Jawab HANYA dengan objek JSON valid, tanpa penjelasan tambahan, dengan kunci bahasa Inggris persis seperti ini:
{"categories":["cleanliness"],"priority":"medium","summary":"...","recommendation":"..."}`;

/** Few-shot examples: they pin down the tone and how the priority rules are applied. */
const FEW_SHOT: Array<{ user: string; assistant: Analysis }> = [
  {
    user: 'WC lantai 2 bau banget, lantainya becek, sama sabunnya habis.',
    assistant: {
      categories: ['odor', 'flooding', 'supplies'],
      priority: 'high',
      summary: 'Toilet berbau menyengat, lantai tergenang air, dan sabun habis.',
      recommendation:
        'Keringkan lantai lebih dulu karena berisiko membuat pengguna terpeleset. Setelah itu bersihkan sumber bau dan isi ulang sabun.',
    },
  },
  {
    user: 'tisunya tinggal dikit kayaknya besok abis',
    assistant: {
      categories: ['supplies'],
      priority: 'low',
      summary: 'Persediaan tisu menipis dan diperkirakan habis besok.',
      recommendation: 'Siapkan stok tisu dan isi ulang pada jadwal pengecekan berikutnya.',
    },
  },
  {
    user: 'Airnya nggenang parah, hampir ke luar toilet. kloset yg pojok mampet',
    assistant: {
      categories: ['flooding', 'damage'],
      priority: 'high',
      summary: 'Kloset pojok mampet sehingga air tergenang hampir keluar dari toilet.',
      recommendation:
        'Hentikan aliran air dan tangani kloset mampet segera sebelum air meluap ke koridor, lalu keringkan lantai.',
    },
  },
];

/** Forces the model output into the enums the database recognises. */
function coerceAnalysis(raw: z.infer<typeof AnalysisSchema>): Analysis {
  const categories = [
    ...new Set(
      raw.categories
        .map((k) => k.toLowerCase().trim())
        .filter((k): k is Category => (CATEGORIES as readonly string[]).includes(k)),
    ),
  ];
  const p = raw.priority.toLowerCase().trim();
  const priority = ((PRIORITIES as readonly string[]).includes(p) ? p : 'medium') as Priority;

  return {
    categories: categories.length ? categories : ['other'],
    priority,
    summary: raw.summary.trim().slice(0, 300),
    recommendation: raw.recommendation.trim().slice(0, 500),
  };
}

/** OpenAI-style content parts, so a message can carry an image next to text. */
type MessagePart =
  | { type: 'text'; text: string }
  | { type: 'image_url'; image_url: { url: string; detail?: 'low' | 'high' | 'auto' } };

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string | MessagePart[];
}

/** One tool the model may call, in the OpenAI/DeepSeek function-calling shape. */
export interface ToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

interface ToolCall {
  id: string;
  type: 'function';
  function: { name: string; arguments: string };
}

/** A message in a tool-calling exchange: the two extra shapes the chat loop needs. */
type ToolMessage =
  | ChatMessage
  | { role: 'assistant'; content: string | null; tool_calls?: ToolCall[] }
  | { role: 'tool'; tool_call_id: string; content: string };

/** Which model answers: the text model for complaints, the vision model for photos. */
interface Target {
  baseUrl: string;
  apiKey: string;
  model: string;
}

const textModel = (env: Env): Target => ({
  baseUrl: env.LLM_BASE_URL,
  apiKey: env.LLM_API_KEY,
  model: env.LLM_MODEL,
});

const visionModel = (env: Env): Target => ({
  baseUrl: env.VISION_BASE_URL,
  apiKey: env.VISION_API_KEY || env.LLM_API_KEY,
  model: env.VISION_MODEL,
});

async function chatJSON(target: Target, messages: ChatMessage[], maxTokens = 500): Promise<unknown> {
  const res = await fetch(`${target.baseUrl.replace(/\/$/, '')}/chat/completions`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${target.apiKey}`,
    },
    body: JSON.stringify({
      model: target.model,
      messages,
      // Low temperature: identical wording must yield an identical classification.
      temperature: 0.1,
      max_tokens: maxTokens,
      response_format: { type: 'json_object' },
    }),
    signal: AbortSignal.timeout(30_000),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`LLM HTTP ${res.status}: ${body.slice(0, 300)}`);
  }

  const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error('LLM mengembalikan respons kosong');

  try {
    return JSON.parse(content);
  } catch {
    // Last resort: some models wrap the JSON in ```json ... ```
    const match = content.match(/\{[\s\S]*\}/);
    if (!match) throw new Error(`Respons LLM bukan JSON: ${content.slice(0, 200)}`);
    return JSON.parse(match[0]);
  }
}

export interface TokenUsage {
  prompt: number;
  completion: number;
  /** Prompt tokens served from DeepSeek's cache — billed at a fraction of the price. */
  cache_hit: number;
}

export interface ToolTrace {
  name: string;
  arguments: Record<string, unknown>;
}

export interface ToolAnswer {
  text: string;
  tools: ToolTrace[];
  tokens: TokenUsage;
}

interface ToolResponse {
  choices?: Array<{
    message?: { content?: string | null; tool_calls?: ToolCall[] };
    finish_reason?: string;
  }>;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    prompt_cache_hit_tokens?: number;
  };
}

/**
 * Feature #6: answer a free-form question by letting the model call tools.
 *
 * The model never sees the database. It sees only the tool definitions, and
 * each tool returns a small aggregate that `run` computes on our side —
 * that is what keeps a question at a few thousand tokens regardless of how
 * many reports exist. The loop is capped: after `maxRounds` rounds the model
 * is forced to answer with whatever it has.
 */
export async function chatWithTools(
  env: Env,
  input: {
    system: string;
    history: Array<{ role: 'user' | 'assistant'; content: string }>;
    question: string;
    tools: ToolDefinition[];
    run: (name: string, args: Record<string, unknown>) => Promise<unknown>;
    maxRounds?: number;
    maxTokens?: number;
  },
): Promise<ToolAnswer> {
  const target = textModel(env);
  const maxRounds = input.maxRounds ?? 4;
  const messages: ToolMessage[] = [
    { role: 'system', content: input.system },
    ...input.history,
    { role: 'user', content: input.question },
  ];
  const trace: ToolTrace[] = [];
  const tokens: TokenUsage = { prompt: 0, completion: 0, cache_hit: 0 };

  for (let round = 0; ; round++) {
    const last = round >= maxRounds;
    const res = await fetch(`${target.baseUrl.replace(/\/$/, '')}/chat/completions`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${target.apiKey}`,
      },
      body: JSON.stringify({
        model: target.model,
        messages,
        tools: input.tools.map((t) => ({ type: 'function', function: t })),
        // On the final round the model may no longer ask for data; it must answer.
        tool_choice: last ? 'none' : 'auto',
        temperature: 0.2,
        max_tokens: input.maxTokens ?? 600,
      }),
      signal: AbortSignal.timeout(30_000),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`LLM HTTP ${res.status}: ${body.slice(0, 300)}`);
    }

    const data = (await res.json()) as ToolResponse;
    tokens.prompt += data.usage?.prompt_tokens ?? 0;
    tokens.completion += data.usage?.completion_tokens ?? 0;
    tokens.cache_hit += data.usage?.prompt_cache_hit_tokens ?? 0;

    const message = data.choices?.[0]?.message;
    if (!message) throw new Error('LLM mengembalikan respons kosong');

    const calls = message.tool_calls ?? [];
    if (!calls.length || last) {
      const text = (message.content ?? '').trim();
      if (!text) throw new Error('LLM tidak memberikan jawaban');
      return { text, tools: trace, tokens };
    }

    messages.push({ role: 'assistant', content: message.content ?? null, tool_calls: calls });
    for (const call of calls) {
      let args: Record<string, unknown> = {};
      try {
        args = JSON.parse(call.function.arguments || '{}') as Record<string, unknown>;
      } catch {
        /* the model produced malformed arguments; run the tool with none */
      }
      trace.push({ name: call.function.name, arguments: args });

      // A failing tool is reported back to the model rather than aborting the
      // question: it can rephrase the call or answer from what it already has.
      let result: unknown;
      try {
        result = await input.run(call.function.name, args);
      } catch (err) {
        result = { error: err instanceof Error ? err.message : String(err) };
      }
      messages.push({ role: 'tool', tool_call_id: call.id, content: JSON.stringify(result) });
    }
  }
}

/** Features #1 and #2: classify the categories and set the priority of one report. */
export async function analyzeComplaint(
  env: Env,
  description: string,
  location: string,
): Promise<Analysis> {
  const messages: ChatMessage[] = [{ role: 'system', content: SYSTEM_PROMPT }];
  for (const example of FEW_SHOT) {
    messages.push({ role: 'user', content: example.user });
    messages.push({ role: 'assistant', content: JSON.stringify(example.assistant) });
  }
  messages.push({ role: 'user', content: `Lokasi: ${location}\nKeluhan: ${description}` });

  const raw = await chatJSON(textModel(env), messages);
  return coerceAnalysis(AnalysisSchema.parse(raw));
}

const DailyDigestSchema = z.object({
  summary: z.string().min(1),
  highlights: z.array(z.string()).default([]),
});

export interface DailyDigest {
  summary: string;
  highlights: string[];
}

/** Feature #3: summarise a whole day of reports for the head of facilities. */
export async function summarizeDay(
  env: Env,
  date: string,
  reports: Array<{
    location: string;
    priority: string | null;
    summary: string | null;
    description: string;
  }>,
): Promise<DailyDigest> {
  const list = reports
    .map(
      (r, i) =>
        `${i + 1}. [${r.priority ?? 'belum dianalisis'}] ${r.location} - ${r.summary ?? r.description}`,
    )
    .join('\n');

  const raw = await chatJSON(
    textModel(env),
    [
      {
        role: 'system',
        content: `Kamu menyusun laporan harian kondisi toilet kampus untuk kepala bagian sarana prasarana.
Dari daftar keluhan hari itu, tentukan lokasi yang paling bermasalah dan pola masalah yang berulang.
Prioritas pada daftar ditulis dengan kode bahasa Inggris: high = tinggi, medium = sedang, low = rendah.

Jawab HANYA dengan JSON valid dengan kunci bahasa Inggris persis seperti ini:
{"summary":"paragraf 2-4 kalimat","highlights":["poin singkat","poin singkat"]}

- "summary": ringkasan dalam bahasa Indonesia baku, sebutkan angka konkret (jumlah laporan, lokasi terbanyak).
- "highlights": sorotan, maksimal 4 poin tindakan yang paling mendesak dalam bahasa Indonesia,
  masing-masing maksimal 12 kata.
- Jangan mengarang data di luar daftar yang diberikan.`,
      },
      {
        role: 'user',
        content: `Tanggal: ${date}\nTotal laporan: ${reports.length}\n\nDaftar keluhan:\n${list}`,
      },
    ],
    700,
  );

  const parsed = DailyDigestSchema.parse(raw);
  return { summary: parsed.summary.trim(), highlights: parsed.highlights.slice(0, 4) };
}

/**
 * The model sometimes answers "true"/"ya" as a string; both must read as true,
 * while `z.coerce.boolean()` would also turn the string "false" into true.
 */
const looseBool = z.preprocess((v) => {
  if (typeof v === 'string') return ['true', 'ya', 'yes', '1'].includes(v.trim().toLowerCase());
  return v;
}, z.boolean());

const ProofCheckSchema = z.object({
  is_toilet: looseBool,
  clean: looseBool,
  confidence: z.coerce.number().min(0).max(1).optional(),
  reason: z.string().min(1),
});

export interface ProofCheck {
  verdict: ProofVerdict;
  reason: string;
  confidence: number | null;
}

const PROOF_PROMPT = `Kamu adalah pengawas kebersihan toilet kampus. Petugas kebersihan mengunggah foto
sebagai bukti bahwa sebuah keluhan sudah ditangani. Tugasmu menilai foto itu dengan jujur dan ketat.

Jawab dua pertanyaan:
1. "is_toilet": apakah foto ini benar-benar memperlihatkan bagian dalam toilet/kamar mandi/WC
   (kloset, urinoir, wastafel, lantai kamar mandi, bilik)? Foto koridor, orang, layar, langit-langit,
   foto gelap/blur yang tidak bisa dinilai, atau objek lain → false.
2. "clean": apakah kondisi yang terlihat sudah layak pakai dan bersih?
   TIDAK bersih bila terlihat: kotoran atau noda di kloset/lantai/dinding, sampah berserakan,
   tisu bekas di lantai, genangan air atau lantai basah merata, tempat sampah meluap, coretan,
   lumut/kerak tebal, atau bekas keluhan yang jelas belum ditangani.
   Noda permanen kecil, keramik tua, atau lantai yang lembap tipis setelah dipel masih boleh
   dianggap bersih.

Gunakan keluhan asli sebagai konteks: bila keluhannya terlihat pada foto (mis. sampah, genangan),
periksa apakah hal itu sudah tidak ada. Keluhan yang tidak bisa dilihat dari foto (bau, sabun habis)
jangan dijadikan alasan menolak. Kategori keluhan ditulis dengan kode bahasa Inggris
(cleanliness = kebersihan, supplies = perlengkapan, damage = kerusakan, odor = bau,
flooding = genangan, other = lainnya).

Jika ragu antara bersih dan kotor, pilih "clean": false. Jangan pernah mengarang detail yang tidak ada di foto.

Jawab HANYA dengan objek JSON valid dengan kunci bahasa Inggris persis seperti ini
("confidence" = tingkat keyakinan 0..1, "reason" = alasan):
{"is_toilet":true,"clean":false,"confidence":0.8,"reason":"satu kalimat bahasa Indonesia, maksimal 25 kata, sebutkan apa yang terlihat"}`;

/**
 * Base64 without Node's Buffer. `btoa` wants a binary string, and building
 * that in one `String.fromCharCode(...bytes)` call overflows the stack on a
 * multi-megabyte photo, hence the chunking.
 */
function toBase64(bytes: ArrayBuffer): string {
  const u8 = new Uint8Array(bytes);
  let binary = '';
  for (let i = 0; i < u8.length; i += 0x8000) {
    binary += String.fromCharCode(...u8.subarray(i, i + 0x8000));
  }
  return btoa(binary);
}

/**
 * Feature #5: judge whether a proof photo actually shows a clean toilet.
 *
 * The photo travels inline as a data URL. The bucket is private and the Worker
 * is the only thing that can read it, so a public URL was never an option.
 */
export async function checkProofPhoto(
  env: Env,
  photo: { bytes: ArrayBuffer; type: string },
  context: { location: string; complaint: string; categories: string[] },
): Promise<ProofCheck> {
  const dataUrl = `data:${photo.type};base64,${toBase64(photo.bytes)}`;
  const categories = context.categories.length ? context.categories.join(', ') : 'belum dianalisis';

  const raw = await chatJSON(
    visionModel(env),
    [
      { role: 'system', content: PROOF_PROMPT },
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: `Lokasi: ${context.location}\nKategori keluhan: ${categories}\nKeluhan asli: ${context.complaint}\n\nFoto bukti dari petugas:`,
          },
          { type: 'image_url', image_url: { url: dataUrl, detail: 'low' } },
        ],
      },
    ],
    // Generous: "thinking" models (Gemini 3.x) spend part of this budget on
    // reasoning before the answer, and a budget of a few hundred cut the JSON off.
    2000,
  );

  const parsed = ProofCheckSchema.parse(raw);
  const verdict: ProofVerdict = !parsed.is_toilet ? 'not_toilet' : parsed.clean ? 'clean' : 'dirty';
  return {
    verdict,
    reason: parsed.reason.trim().slice(0, 300),
    confidence: parsed.confidence ?? null,
  };
}
