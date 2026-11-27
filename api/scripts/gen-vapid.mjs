#!/usr/bin/env node
/**
 * Genera el par de claves VAPID (P-256) para Web Push.
 *   npm run gen-vapid            -> muestra las claves
 *   npm run gen-vapid -- --json  -> {"publicKey":"...","privateKey":"..."}
 * publicKey  = punto sin comprimir (65 bytes) en base64url  -> VAPID_PUBLIC_KEY
 * privateKey = escalar "d" (32 bytes) en base64url          -> VAPID_PRIVATE_KEY (secreto)
 */
import { webcrypto } from 'node:crypto';

const subtle = (globalThis.crypto ?? webcrypto).subtle;
const kp = await subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
const raw = Buffer.from(await subtle.exportKey('raw', kp.publicKey));
const jwk = await subtle.exportKey('jwk', kp.privateKey);
const keys = { publicKey: raw.toString('base64url'), privateKey: jwk.d };

if (process.argv.includes('--json')) {
  process.stdout.write(JSON.stringify(keys));
} else {
  console.log(`VAPID_PUBLIC_KEY=${keys.publicKey}`);
  console.log(`VAPID_PRIVATE_KEY=${keys.privateKey}`);
  console.log('\nCárguelas con: npx wrangler secret put VAPID_PUBLIC_KEY  y  npx wrangler secret put VAPID_PRIVATE_KEY');
}
