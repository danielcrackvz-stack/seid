// Mismo formato que src/password.ts: pbkdf2_sha256$<iter>$<sal b64>$<hash b64>
import { webcrypto } from 'node:crypto';

const subtle = (globalThis.crypto ?? webcrypto).subtle;
const getRandomValues = (a) => (globalThis.crypto ?? webcrypto).getRandomValues(a);

export async function hashPassword(password, iterations = 40_000) {
  const it = Math.min(Math.max(Math.floor(iterations), 10_000), 100_000);
  const salt = getRandomValues(new Uint8Array(16));
  const key = await subtle.importKey('raw', new TextEncoder().encode(password.normalize('NFC')), 'PBKDF2', false, ['deriveBits']);
  const bits = await subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: it }, key, 256);
  return `pbkdf2_sha256$${it}$${Buffer.from(salt).toString('base64')}$${Buffer.from(bits).toString('base64')}`;
}

/** Contraseña aleatoria legible (sin caracteres confusos), ~95 bits. */
export function generatePassword(length = 16) {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  const out = [];
  const buf = getRandomValues(new Uint8Array(length * 2));
  for (const b of buf) {
    if (b < 256 - (256 % alphabet.length)) out.push(alphabet[b % alphabet.length]);
    if (out.length === length) break;
  }
  return `${out.slice(0, 4).join('')}-${out.slice(4, 8).join('')}-${out.slice(8, 12).join('')}-${out.slice(12, 16).join('')}`;
}
