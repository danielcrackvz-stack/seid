import { describe, expect, it } from 'vitest';
import { buildPushRequest, encryptPayload, vapidJwt } from '../src/push/webpush';
import { b64urlDecode, b64urlEncode, utf8 } from '../src/b64';
import { decryptPush, makeTestSubscription } from './helpers';

async function vapid() {
  const kp = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']) as CryptoKeyPair;
  const pub = new Uint8Array(await crypto.subtle.exportKey('raw', kp.publicKey) as ArrayBuffer);
  const jwk = await crypto.subtle.exportKey('jwk', kp.privateKey) as JsonWebKey;
  return { keys: { publicKey: b64urlEncode(pub), privateKey: jwk.d!, subject: 'mailto:prueba@seid.test' }, pub: kp.publicKey };
}

describe('cifrado aes128gcm (RFC 8291)', () => {
  it('ida y vuelta con un par de claves de suscripción de prueba', async () => {
    const sub = await makeTestSubscription();
    const msg = JSON.stringify({ title: 'Mantenimiento en 15 días', body: 'Ñandú · 12000 BTU', url: '/seid/app/#/registro/1' });
    const body = await encryptPayload(utf8(msg), sub.keys.p256dh, sub.keys.auth);
    expect(body.length).toBe(16 + 4 + 1 + 65 + utf8(msg).length + 1 + 16);
    const dec = await decryptPush(body, sub);
    expect(dec.text).toBe(msg);
  });

  it('cada envío usa sal y clave efímera nuevas', async () => {
    const sub = await makeTestSubscription();
    const a = await encryptPayload(utf8('hola'), sub.keys.p256dh, sub.keys.auth);
    const b = await encryptPayload(utf8('hola'), sub.keys.p256dh, sub.keys.auth);
    expect(b64urlEncode(a.slice(0, 16))).not.toBe(b64urlEncode(b.slice(0, 16)));
    expect(b64urlEncode(a.slice(21, 86))).not.toBe(b64urlEncode(b.slice(21, 86)));
  });

  it('no se puede descifrar con otra suscripción', async () => {
    const sub = await makeTestSubscription();
    const other = await makeTestSubscription();
    const body = await encryptPayload(utf8('secreto'), sub.keys.p256dh, sub.keys.auth);
    await expect(decryptPush(body, { ...other, keys: sub.keys })).rejects.toThrow();
  });

  it('rechaza claves inválidas y contenidos demasiado grandes', async () => {
    const sub = await makeTestSubscription();
    await expect(encryptPayload(utf8('x'), b64urlEncode(new Uint8Array(10)), sub.keys.auth)).rejects.toThrow();
    await expect(encryptPayload(new Uint8Array(4000), sub.keys.p256dh, sub.keys.auth)).rejects.toThrow();
  });
});

describe('VAPID (RFC 8292)', () => {
  it('JWT ES256 verificable con la clave pública', async () => {
    const v = await vapid();
    const now = Math.floor(Date.now() / 1000);
    const jwt = await vapidJwt('https://fcm.googleapis.com', v.keys, now);
    const [h, p, s] = jwt.split('.');
    expect(JSON.parse(new TextDecoder().decode(b64urlDecode(h)))).toEqual({ typ: 'JWT', alg: 'ES256' });
    const claims = JSON.parse(new TextDecoder().decode(b64urlDecode(p)));
    expect(claims).toEqual({ aud: 'https://fcm.googleapis.com', exp: now + 43200, sub: 'mailto:prueba@seid.test' });
    expect(b64urlDecode(s).length).toBe(64);
    expect(await crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, v.pub, b64urlDecode(s), utf8(`${h}.${p}`))).toBe(true);
  });

  it('arma la petición con las cabeceras correctas', async () => {
    const v = await vapid();
    const sub = await makeTestSubscription('https://updates.push.services.mozilla.com/wpush/v2/abc');
    const req = await buildPushRequest({ endpoint: sub.endpoint, ...sub.keys }, { title: 't', body: 'b', url: '/u' }, v.keys, { topic: 'recordatorio-123!' });
    expect(req.url).toBe(sub.endpoint);
    expect(req.init.headers['Content-Encoding']).toBe('aes128gcm');
    expect(req.init.headers.Authorization).toMatch(/^vapid t=[\w-]+\.[\w-]+\.[\w-]+, k=[\w-]+$/);
    expect(req.init.headers.Topic).toBe('recordatorio-123');
    expect(JSON.parse((await decryptPush(req.init.body, sub)).text)).toEqual({ title: 't', body: 'b', url: '/u' });
    await expect(buildPushRequest({ endpoint: 'http://x.test', ...sub.keys }, {}, v.keys)).rejects.toThrow();
  });
});
