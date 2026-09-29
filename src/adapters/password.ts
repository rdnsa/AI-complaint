/**
 * Password storage: PBKDF2-SHA256 via WebCrypto.
 *
 * bcrypt and argon2 are unavailable in the Workers runtime without extra
 * WebAssembly, whereas PBKDF2 ships with WebCrypto and is strong enough as long
 * as the iteration count is high. Each user gets their own salt, so two people
 * with the same password still end up with different hashes.
 */
const ITERASI = 100_000;
const PANJANG_BIT = 256;

function keHex(data: Uint8Array): string {
  return [...data].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function dariHex(hex: string): ArrayBuffer {
  const buffer = new ArrayBuffer(hex.length / 2);
  const out = new Uint8Array(buffer);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return buffer;
}

export function buatSalt(): string {
  return keHex(crypto.getRandomValues(new Uint8Array(16)));
}

export async function hitungHash(sandi: string, saltHex: string): Promise<string> {
  const kunci = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(sandi),
    'PBKDF2',
    false,
    ['deriveBits'],
  );
  const bit = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: dariHex(saltHex), iterations: ITERASI, hash: 'SHA-256' },
    kunci,
    PANJANG_BIT,
  );
  return keHex(new Uint8Array(bit));
}

/** Constant-time comparison, so response time cannot leak the stored hash. */
export async function cocok(sandi: string, saltHex: string, hashHex: string): Promise<boolean> {
  const hitung = await hitungHash(sandi, saltHex);
  if (hitung.length !== hashHex.length) return false;
  let beda = 0;
  for (let i = 0; i < hitung.length; i++) beda |= hitung.charCodeAt(i) ^ hashHex.charCodeAt(i);
  return beda === 0;
}
