import { b64Encode, timingSafeEqual, utf8 } from './b64';

/**
 * Hash de contraseña con PBKDF2-SHA256 (WebCrypto).
 * Formato: pbkdf2_sha256$<iteraciones>$<sal base64>$<hash base64>
 * El mismo formato lo genera scripts/lib/password.mjs (create-user).
 * workerd admite como máximo 100000 iteraciones.
 *
 * Por defecto 40000: en el plan gratis cada petición tiene ~10 ms de CPU y 100000
 * iteraciones toman ~14 ms. La contraseña la genera create-user (16 caracteres
 * aleatorios, ~90 bits) y el login tiene límite de intentos, así que 40000 es suficiente.
 * Cada hash guarda sus iteraciones: con Workers Paid se puede subir (PBKDF2_ITERATIONS
 * o create-user --iterations) y volver a poner la contraseña.
 */
export const DEFAULT_ITERATIONS = 40_000;

async function derive(password: string, salt: Uint8Array, iterations: number): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey('raw', utf8(password.normalize('NFC')), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations }, key, 256);
  return new Uint8Array(bits);
}

function b64d(s: string): Uint8Array {
  const bin = atob(s);
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

export async function hashPassword(password: string, iterations = DEFAULT_ITERATIONS): Promise<string> {
  const it = Math.min(Math.max(Math.floor(iterations), 10_000), 100_000);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await derive(password, salt, it);
  return `pbkdf2_sha256$${it}$${b64Encode(salt)}$${b64Encode(hash)}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split('$');
  if (parts.length !== 4 || parts[0] !== 'pbkdf2_sha256') return false;
  const it = Number(parts[1]);
  if (!Number.isInteger(it) || it < 1 || it > 100_000) return false;
  const expected = b64d(parts[3]);
  const got = await derive(password, b64d(parts[2]), it);
  return timingSafeEqual(got, expected);
}

/** Hash ficticio para gastar el mismo tiempo cuando el correo no existe. */
export const DUMMY_HASH = 'pbkdf2_sha256$40000$AAAAAAAAAAAAAAAAAAAAAA==$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=';
