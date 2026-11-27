import { b64urlDecode, b64urlEncode, utf8 } from './b64';

export type Claims = { sub: string; did?: string | null; tv: number; iat: number; exp: number };

async function hmacKey(secret: string) {
  return crypto.subtle.importKey('raw', utf8(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}

export async function signJwt(claims: Claims, secret: string): Promise<string> {
  const header = b64urlEncode(utf8(JSON.stringify({ alg: 'HS256', typ: 'JWT' })));
  const body = b64urlEncode(utf8(JSON.stringify(claims)));
  const data = `${header}.${body}`;
  const sig = await crypto.subtle.sign('HMAC', await hmacKey(secret), utf8(data));
  return `${data}.${b64urlEncode(sig)}`;
}

/** Devuelve los claims si la firma es válida y no venció; si no, null. */
export async function verifyJwt(token: string, secret: string, nowSec = Math.floor(Date.now() / 1000)): Promise<Claims | null> {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  try {
    const header = JSON.parse(new TextDecoder().decode(b64urlDecode(parts[0])));
    if (header.alg !== 'HS256') return null;
    const ok = await crypto.subtle.verify('HMAC', await hmacKey(secret), b64urlDecode(parts[2]), utf8(`${parts[0]}.${parts[1]}`));
    if (!ok) return null;
    const claims = JSON.parse(new TextDecoder().decode(b64urlDecode(parts[1]))) as Claims;
    if (typeof claims.exp !== 'number' || claims.exp <= nowSec) return null;
    if (typeof claims.sub !== 'string') return null;
    return claims;
  } catch {
    return null;
  }
}
