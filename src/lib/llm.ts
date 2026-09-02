import { z } from 'zod';
import { KATEGORI, PRIORITAS, type Env, type Kategori, type Prioritas } from '../types';

/**
 * The contract for the model's output. The LLM occasionally invents a category
 * outside the list, or returns a string where an array was asked for, so every
 * field is scrubbed again in `coerceAnalisis()` before it reaches the database.
 */
const AnalisisSchema = z.object({
  kategori: z.array(z.string()).min(1),
  prioritas: z.string(),
  ringkasan: z.string().min(1),
  rekomendasi: z.string().min(1),
});

export interface Analisis {
  kategori: Kategori[];
  prioritas: Prioritas;
  ringkasan: string;
  rekomendasi: string;
}

const SYSTEM_PROMPT = `Kamu adalah asisten petugas kebersihan (OB) kampus.
Tugasmu membaca keluhan mahasiswa tentang toilet/WC kampus yang ditulis dengan bahasa sehari-hari,
termasuk bahasa gaul dan singkatan, lalu mengubahnya menjadi tiket kerja yang terstruktur.

KATEGORI yang boleh dipakai (pilih semua yang relevan, minimal satu):
- "kebersihan"   : kotor, jorok, noda, sampah berserakan, lantai dekil, coretan
- "perlengkapan" : sabun/tisu/pengharum habis, tidak ada gayung, tempat sampah tidak tersedia
- "kerusakan"    : kloset mampet, keran/flush rusak, pintu/kunci/lampu rusak, kaca pecah
- "bau"          : bau tidak sedap, pesing, bau menyengat
- "genangan"     : lantai becek, air tergenang, air meluap, bocor
- "lainnya"      : selain di atas

ATURAN PRIORITAS (patuhi ketat):
- "tinggi" : ada risiko keselamatan atau toilet praktis tidak bisa dipakai.
             Contoh: air meluap, kloset mampet, lantai licin/becek parah, listrik/lampu mati total,
             pintu tidak bisa dikunci, bau sangat menyengat, ada pecahan kaca, banyak masalah sekaligus.
- "sedang" : mengganggu kenyamanan tetapi toilet masih bisa dipakai.
             Contoh: bau biasa, lantai kotor, sabun habis, tempat sampah penuh.
- "rendah" : keluhan kecil atau bersifat antisipasi.
             Contoh: tisu hampir habis, sedikit noda, cermin buram, saran perbaikan.

ATURAN PENULISAN:
- "ringkasan": satu kalimat netral maksimal 15 kata, tanpa kata kasar, memakai istilah baku.
- "rekomendasi": instruksi kerja untuk petugas. Jika ada beberapa masalah, urutkan dari yang
  paling berisiko membuat orang celaka lebih dulu, lalu sisanya. Maksimal 2 kalimat.
- Jangan mengarang masalah yang tidak disebut pelapor.
- Jika teks tidak jelas atau bukan keluhan toilet, pakai kategori ["lainnya"], prioritas "rendah",
  dan tulis apa adanya pada ringkasan.

Jawab HANYA dengan objek JSON valid, tanpa penjelasan tambahan, dengan bentuk persis:
{"kategori":["kebersihan"],"prioritas":"sedang","ringkasan":"...","rekomendasi":"..."}`;

/** Few-shot examples: they pin down the tone and how the priority rules are applied. */
const FEW_SHOT: Array<{ user: string; assistant: Analisis }> = [
  {
    user: 'WC lantai 2 bau banget, lantainya becek, sama sabunnya habis.',
    assistant: {
      kategori: ['bau', 'genangan', 'perlengkapan'],
      prioritas: 'tinggi',
      ringkasan: 'Toilet berbau menyengat, lantai tergenang air, dan sabun habis.',
      rekomendasi:
        'Keringkan lantai lebih dulu karena berisiko membuat pengguna terpeleset. Setelah itu bersihkan sumber bau dan isi ulang sabun.',
    },
  },
  {
    user: 'tisunya tinggal dikit kayaknya besok abis',
    assistant: {
      kategori: ['perlengkapan'],
      prioritas: 'rendah',
      ringkasan: 'Persediaan tisu menipis dan diperkirakan habis besok.',
      rekomendasi: 'Siapkan stok tisu dan isi ulang pada jadwal pengecekan berikutnya.',
    },
  },
  {
    user: 'Airnya nggenang parah, hampir ke luar toilet. kloset yg pojok mampet',
    assistant: {
      kategori: ['genangan', 'kerusakan'],
      prioritas: 'tinggi',
      ringkasan: 'Kloset pojok mampet sehingga air tergenang hampir keluar dari toilet.',
      rekomendasi:
        'Hentikan aliran air dan tangani kloset mampet segera sebelum air meluap ke koridor, lalu keringkan lantai.',
    },
  },
];

/** Forces the model output into the enums the database recognises. */
function coerceAnalisis(raw: z.infer<typeof AnalisisSchema>): Analisis {
  const kategori = [
    ...new Set(
      raw.kategori
        .map((k) => k.toLowerCase().trim())
        .filter((k): k is Kategori => (KATEGORI as readonly string[]).includes(k)),
    ),
  ];
  const p = raw.prioritas.toLowerCase().trim();
  const prioritas = ((PRIORITAS as readonly string[]).includes(p) ? p : 'sedang') as Prioritas;

  return {
    kategori: kategori.length ? kategori : ['lainnya'],
    prioritas,
    ringkasan: raw.ringkasan.trim().slice(0, 300),
    rekomendasi: raw.rekomendasi.trim().slice(0, 500),
  };
}

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

async function chatJSON(env: Env, messages: ChatMessage[], maxTokens = 500): Promise<unknown> {
  const res = await fetch(`${env.LLM_BASE_URL.replace(/\/$/, '')}/chat/completions`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${env.LLM_API_KEY}`,
    },
    body: JSON.stringify({
      model: env.LLM_MODEL,
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

/** Features #1 and #2: classify the categories and set the priority of one report. */
export async function analisaKeluhan(env: Env, teks: string, lokasi: string): Promise<Analisis> {
  const messages: ChatMessage[] = [{ role: 'system', content: SYSTEM_PROMPT }];
  for (const contoh of FEW_SHOT) {
    messages.push({ role: 'user', content: contoh.user });
    messages.push({ role: 'assistant', content: JSON.stringify(contoh.assistant) });
  }
  messages.push({ role: 'user', content: `Lokasi: ${lokasi}\nKeluhan: ${teks}` });

  const raw = await chatJSON(env, messages);
  return coerceAnalisis(AnalisisSchema.parse(raw));
}

const RingkasanHarianSchema = z.object({
  ringkasan: z.string().min(1),
  sorotan: z.array(z.string()).default([]),
});

export interface RingkasanHarian {
  ringkasan: string;
  sorotan: string[];
}

/** Feature #3: summarise a whole day of reports for the head of facilities. */
export async function ringkasHarian(
  env: Env,
  tanggal: string,
  laporan: Array<{ lokasi: string; prioritas: string | null; ringkasan: string | null; teks: string }>,
): Promise<RingkasanHarian> {
  const daftar = laporan
    .map((l, i) => `${i + 1}. [${l.prioritas ?? 'belum dianalisis'}] ${l.lokasi} - ${l.ringkasan ?? l.teks}`)
    .join('\n');

  const raw = await chatJSON(
    env,
    [
      {
        role: 'system',
        content: `Kamu menyusun laporan harian kondisi toilet kampus untuk kepala bagian sarana prasarana.
Dari daftar keluhan hari itu, tentukan lokasi yang paling bermasalah dan pola masalah yang berulang.

Jawab HANYA dengan JSON valid berbentuk:
{"ringkasan":"paragraf 2-4 kalimat","sorotan":["poin singkat","poin singkat"]}

- "ringkasan": bahasa Indonesia baku, sebutkan angka konkret (jumlah laporan, lokasi terbanyak).
- "sorotan": maksimal 4 poin tindakan yang paling mendesak, masing-masing maksimal 12 kata.
- Jangan mengarang data di luar daftar yang diberikan.`,
      },
      {
        role: 'user',
        content: `Tanggal: ${tanggal}\nTotal laporan: ${laporan.length}\n\nDaftar keluhan:\n${daftar}`,
      },
    ],
    700,
  );

  const parsed = RingkasanHarianSchema.parse(raw);
  return { ringkasan: parsed.ringkasan.trim(), sorotan: parsed.sorotan.slice(0, 4) };
}
