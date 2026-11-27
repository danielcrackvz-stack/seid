/**
 * Web Push sin dependencias de Node:
 *  - Cifrado del contenido "aes128gcm" (RFC 8188 + RFC 8291).
 *  - Autenticación VAPID con JWT ES256 (RFC 8292).
 * Solo usa WebCrypto, disponible en Workers.
 */
import { b64urlDecode, b64urlEncode, concat, utf8 } from '../b64';

export type PushSubscriptionKeys = { endpoint: string; p256dh: string; auth: string };
export type VapidKeys = { publicKey: string; privateKey: string; subject: string };

const RECORD_SIZE = 4096;

async function hmac(key: Uint8Array, data: Uint8Array): Promise<Uint8Array> {
  const k = await crypto.subtle.importKey('raw', key, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return new Uint8Array(await crypto.subtle.sign('HMAC', k, data));
}

/** HKDF de un solo bloque (longitudes <= 32), como en RFC 8291. */
async function hkdf(salt: Uint8Array, ikm: Uint8Array, info: Uint8Array, length: number): Promise<Uint8Array> {
  const prk = await hmac(salt, ikm);
  const okm = await hmac(prk, concat(info, new Uint8Array([1])));
  return okm.slice(0, length);
}

export type EncryptOptions = {
  /** Solo para pruebas: claves efímeras y sal fijas. */
  asKeyPair?: CryptoKeyPair;
  salt?: Uint8Array;
};

/** Cifra `plaintext` para una suscripción. Devuelve el cuerpo listo para enviar. */
export async function encryptPayload(
  plaintext: Uint8Array,
  uaPublicB64: string,
  authSecretB64: string,
  opts: EncryptOptions = {},
): Promise<Uint8Array> {
  const uaPublic = b64urlDecode(uaPublicB64);
  const authSecret = b64urlDecode(authSecretB64);
  if (uaPublic.length !== 65 || uaPublic[0] !== 4) throw new Error('p256dh inválido');
  if (authSecret.length < 16) throw new Error('auth inválido');
  if (plaintext.length > RECORD_SIZE - 17 - 86) throw new Error('Contenido demasiado grande');

  const asKeys = opts.asKeyPair ??
    ((await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits'])) as CryptoKeyPair);
  const asPublic = new Uint8Array((await crypto.subtle.exportKey('raw', asKeys.publicKey)) as ArrayBuffer);
  const uaKey = await crypto.subtle.importKey('raw', uaPublic, { name: 'ECDH', namedCurve: 'P-256' }, false, []);
  const ecdhSecret = new Uint8Array(
    await crypto.subtle.deriveBits({ name: 'ECDH', public: uaKey } as SubtleCryptoDeriveKeyAlgorithm, asKeys.privateKey, 256),
  );

  // RFC 8291 §3.4
  const keyInfo = concat(utf8('WebPush: info\0'), uaPublic, asPublic);
  const ikm = await hkdf(authSecret, ecdhSecret, keyInfo, 32);
  const salt = opts.salt ?? crypto.getRandomValues(new Uint8Array(16));
  const cek = await hkdf(salt, ikm, utf8('Content-Encoding: aes128gcm\0'), 16);
  const nonce = await hkdf(salt, ikm, utf8('Content-Encoding: nonce\0'), 12);

  // Un solo registro: contenido + delimitador 0x02 (último registro), sin relleno.
  const record = concat(plaintext, new Uint8Array([2]));
  const aesKey = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['encrypt']);
  const ciphertext = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, aesKey, record));

  // Cabecera RFC 8188: salt(16) | rs(4) | idlen(1) | keyid(65)
  const header = new Uint8Array(16 + 4 + 1 + asPublic.length);
  header.set(salt, 0);
  new DataView(header.buffer).setUint32(16, RECORD_SIZE);
  header[20] = asPublic.length;
  header.set(asPublic, 21);
  return concat(header, ciphertext);
}

/** Importa el par VAPID (público sin comprimir + "d") como clave de firma ES256. */
async function importVapidPrivate(publicKey: string, privateKey: string): Promise<CryptoKey> {
  const pub = b64urlDecode(publicKey);
  if (pub.length !== 65 || pub[0] !== 4) throw new Error('VAPID_PUBLIC_KEY inválida');
  const jwk: JsonWebKey = {
    kty: 'EC',
    crv: 'P-256',
    x: b64urlEncode(pub.slice(1, 33)),
    y: b64urlEncode(pub.slice(33, 65)),
    d: privateKey,
    ext: true,
  };
  return crypto.subtle.importKey('jwk', jwk, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
}

/** JWT VAPID (ES256). WebCrypto ya devuelve la firma en formato r||s que pide JWS. */
export async function vapidJwt(audience: string, vapid: VapidKeys, nowSec = Math.floor(Date.now() / 1000)): Promise<string> {
  const header = b64urlEncode(utf8(JSON.stringify({ typ: 'JWT', alg: 'ES256' })));
  const body = b64urlEncode(utf8(JSON.stringify({ aud: audience, exp: nowSec + 12 * 3600, sub: vapid.subject })));
  const key = await importVapidPrivate(vapid.publicKey, vapid.privateKey);
  const sig = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, utf8(`${header}.${body}`));
  return `${header}.${body}.${b64urlEncode(sig)}`;
}

export type PushRequest = { url: string; init: RequestInit & { headers: Record<string, string>; body: Uint8Array } };

/** Arma la petición HTTP (sin enviarla). */
export async function buildPushRequest(
  sub: PushSubscriptionKeys,
  payload: unknown,
  vapid: VapidKeys,
  opts: { ttl?: number; urgency?: 'very-low' | 'low' | 'normal' | 'high'; topic?: string } = {},
): Promise<PushRequest> {
  const endpoint = new URL(sub.endpoint);
  if (endpoint.protocol !== 'https:') throw new Error('El endpoint debe ser https');
  const body = await encryptPayload(utf8(JSON.stringify(payload)), sub.p256dh, sub.auth);
  const jwt = await vapidJwt(endpoint.origin, vapid);
  const headers: Record<string, string> = {
    'Content-Encoding': 'aes128gcm',
    'Content-Type': 'application/octet-stream',
    TTL: String(opts.ttl ?? 86_400),
    Urgency: opts.urgency ?? 'normal',
    Authorization: `vapid t=${jwt}, k=${vapid.publicKey}`,
  };
  if (opts.topic) headers.Topic = opts.topic.replace(/[^A-Za-z0-9_-]/g, '').slice(0, 32);
  return { url: sub.endpoint, init: { method: 'POST', headers, body } };
}

export type PushResult = { ok: boolean; status: number; gone: boolean };

export async function sendPush(sub: PushSubscriptionKeys, payload: unknown, vapid: VapidKeys, opts = {}): Promise<PushResult> {
  const req = await buildPushRequest(sub, payload, vapid, opts);
  const res = await fetch(req.url, req.init);
  // Drenar el cuerpo para liberar la conexión.
  try { await res.arrayBuffer(); } catch { /* */ }
  return { ok: res.status >= 200 && res.status < 300, status: res.status, gone: res.status === 404 || res.status === 410 };
}
