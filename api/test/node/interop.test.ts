// Pruebas cruzadas en Node contra implementaciones de referencia:
//  - http_ece (descifrado aes128gcm de Mozilla) para nuestro cifrado Web Push.
//  - web-push (librería estándar) para el JWT VAPID.
//  - scripts/lib/password.mjs (create-user) contra src/password.ts (Worker).
import { describe, expect, it } from 'vitest';
import { createECDH, createPublicKey, verify as nodeVerify } from 'node:crypto';
// @ts-expect-error sin tipos
import ece from 'http_ece';
// @ts-expect-error sin tipos
import webpush from 'web-push';
import { encryptPayload, vapidJwt } from '../../src/push/webpush';
import { verifyPassword } from '../../src/password';
import { hashPassword as nodeHash, generatePassword } from '../../scripts/lib/password.mjs';

describe('interoperabilidad', () => {
  it('http_ece descifra lo que cifra el Worker', async () => {
    const ua = createECDH('prime256v1');
    ua.generateKeys();
    const auth = Buffer.from(crypto.getRandomValues(new Uint8Array(16)));
    const msg = JSON.stringify({ title: 'Mantenimiento en 15 días', body: 'Cliente · 12000 BTU', url: '/seid/app/#/registro/xyz' });
    const body = await encryptPayload(new TextEncoder().encode(msg), ua.getPublicKey().toString('base64url'), auth.toString('base64url'));
    const out = ece.decrypt(Buffer.from(body), { version: 'aes128gcm', privateKey: ua, authSecret: auth });
    expect(out.toString('utf8')).toBe(msg);
  });

  it('el JWT VAPID del Worker verifica con la clave pública generada por web-push', async () => {
    const keys = webpush.generateVAPIDKeys();
    const jwt = await vapidJwt('https://fcm.googleapis.com', { publicKey: keys.publicKey, privateKey: keys.privateKey, subject: 'mailto:a@b.co' });
    const [h, p, s] = jwt.split('.');
    const pub = Buffer.from(keys.publicKey, 'base64url');
    const key = createPublicKey({ key: { kty: 'EC', crv: 'P-256', x: pub.subarray(1, 33).toString('base64url'), y: pub.subarray(33).toString('base64url') }, format: 'jwk' });
    const ok = nodeVerify('sha256', Buffer.from(`${h}.${p}`), { key, dsaEncoding: 'ieee-p1363' }, Buffer.from(s, 'base64url'));
    expect(ok).toBe(true);
  });

  it('el hash de create-user lo acepta el Worker', async () => {
    const pw = generatePassword();
    expect(pw).toMatch(/^[A-Za-z0-9]{4}-[A-Za-z0-9]{4}-[A-Za-z0-9]{4}-[A-Za-z0-9]{4}$/);
    const h = await nodeHash(pw);
    expect(h).toMatch(/^pbkdf2_sha256\$40000\$/);
    expect(await verifyPassword(pw, h)).toBe(true);
    expect(await verifyPassword(pw + 'x', h)).toBe(false);
  });
});
