/**
 * Password storage: PBKDF2-SHA256 via WebCrypto.
 *
 * bcrypt and argon2 are unavailable in the Workers runtime without extra
 * WebAssembly, whereas PBKDF2 ships with WebCrypto and is strong enough as long
 * as the iteration count is high. Each user gets their own salt, so two people
 * with the same password still end up with different hashes.
 */
const ITERATIONS = 100_000;
const KEY_BITS = 256;

function toHex(data: Uint8Array): string {
  return [...data].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function fromHex(hex: string): ArrayBuffer {
  const buffer = new ArrayBuffer(hex.length / 2);
  const out = new Uint8Array(buffer);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return buffer;
}

export function createSalt(): string {
  return toHex(crypto.getRandomValues(new Uint8Array(16)));
}

export async function hashPassword(password: string, saltHex: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: fromHex(saltHex), iterations: ITERATIONS, hash: 'SHA-256' },
    key,
    KEY_BITS,
  );
  return toHex(new Uint8Array(bits));
}

/** Constant-time comparison, so response time cannot leak the stored hash. */
export async function verifyPassword(
  password: string,
  saltHex: string,
  hashHex: string,
): Promise<boolean> {
  const computed = await hashPassword(password, saltHex);
  if (computed.length !== hashHex.length) return false;
  let diff = 0;
  for (let i = 0; i < computed.length; i++) diff |= computed.charCodeAt(i) ^ hashHex.charCodeAt(i);
  return diff === 0;
}
