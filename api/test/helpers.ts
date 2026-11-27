import { env, exports } from 'cloudflare:workers';
import { hashPassword } from '../src/password';
import { b64urlDecode, b64urlEncode, concat, utf8 } from '../src/b64';
import type { Env } from '../src/env';

export const testEnv = env as unknown as Env;
export const ORIGIN = 'https://danielcrackvz-stack.github.io';

export async function call(path: string, init: RequestInit & { token?: string; json?: unknown } = {}) {
  const headers = new Headers(init.headers);
  if (init.token) headers.set('Authorization', `Bearer ${init.token}`);
  let body = init.body;
  if (init.json !== undefined) { headers.set('Content-Type', 'application/json'); body = JSON.stringify(init.json); }
  if (!headers.has('CF-Connecting-IP')) headers.set('CF-Connecting-IP', '203.0.113.7');
  return (exports as unknown as { default: Fetcher }).default.fetch(`https://api.test${path}`, { ...init, headers, body });
}

let userCounter = 0;
export async function createUser(opts: { email?: string; password?: string; name?: string } = {}) {
  const email = opts.email ?? `abel${++userCounter}-${crypto.randomUUID().slice(0, 6)}@seid.test`;
  const password = opts.password ?? 'clave-segura-123';
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  await testEnv.DB.prepare('INSERT INTO users (id, email, name, role, password_hash, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .bind(id, email, opts.name ?? 'Ing. Abel Galarza', 'admin', await hashPassword(password, 10_000), now, now).run();
  return { id, email, password };
}

export async function login(email: string, password: string, extra: Record<string, unknown> = {}, ip = '203.0.113.7') {
  return call('/auth/login', { method: 'POST', json: { email, password, ...extra }, headers: { 'CF-Connecting-IP': ip } });
}

export async function loggedIn(deviceId = crypto.randomUUID()) {
  const u = await createUser();
  const res = await login(u.email, u.password, { deviceId }, `198.51.100.${Math.floor(Math.random() * 250)}`);
  const body = (await res.json()) as { token: string };
  return { ...u, token: body.token, deviceId };
}

export function uuid() { return crypto.randomUUID(); }

// ---------- Suscripción push de prueba (lado del navegador) ----------

export async function makeTestSubscription(endpoint = 'https://push.example.test/send/abc123') {
  const kp = (await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits'])) as CryptoKeyPair;
  const pub = new Uint8Array((await crypto.subtle.exportKey('raw', kp.publicKey)) as ArrayBuffer);
  const auth = crypto.getRandomValues(new Uint8Array(16));
  return { endpoint, keys: { p256dh: b64urlEncode(pub), auth: b64urlEncode(auth) }, privateKey: kp.privateKey };
}

async function hmac(key: Uint8Array, data: Uint8Array) {
  const k = await crypto.subtle.importKey('raw', key, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return new Uint8Array(await crypto.subtle.sign('HMAC', k, data));
}
async function hkdf(salt: Uint8Array, ikm: Uint8Array, info: Uint8Array, len: number) {
  const prk = await hmac(salt, ikm);
  return (await hmac(prk, concat(info, new Uint8Array([1])))).slice(0, len);
}

/** Descifrado aes128gcm como lo haría el navegador (RFC 8291), escrito aparte del código de producción. */
export async function decryptPush(body: Uint8Array, sub: Awaited<ReturnType<typeof makeTestSubscription>>) {
  const salt = body.slice(0, 16);
  const rs = new DataView(body.buffer, body.byteOffset).getUint32(16);
  const idlen = body[20];
  const asPublic = body.slice(21, 21 + idlen);
  const ciphertext = body.slice(21 + idlen);
  const uaPublic = b64urlDecode(sub.keys.p256dh);
  const authSecret = b64urlDecode(sub.keys.auth);
  const asKey = await crypto.subtle.importKey('raw', asPublic, { name: 'ECDH', namedCurve: 'P-256' }, false, []);
  const shared = new Uint8Array(await crypto.subtle.deriveBits({ name: 'ECDH', public: asKey } as SubtleCryptoDeriveKeyAlgorithm, sub.privateKey, 256));
  const ikm = await hkdf(authSecret, shared, concat(utf8('WebPush: info\0'), uaPublic, asPublic), 32);
  const cek = await hkdf(salt, ikm, utf8('Content-Encoding: aes128gcm\0'), 16);
  const nonce = await hkdf(salt, ikm, utf8('Content-Encoding: nonce\0'), 12);
  const key = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['decrypt']);
  const plain = new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: nonce }, key, ciphertext));
  let end = plain.length - 1;
  while (end >= 0 && plain[end] === 0) end--;
  if (plain[end] !== 2) throw new Error('falta delimitador de último registro');
  return { rs, idlen, text: new TextDecoder().decode(plain.slice(0, end)) };
}
