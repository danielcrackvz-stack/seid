import type { Env } from './env';
import { num } from './env';
import { b64Encode } from './b64';

export const PHOTO_MIMES = ['image/jpeg', 'image/png', 'image/webp'];

export function photoMaxBytes(env: Env): number {
  // D1 admite filas de hasta 2 MB; dejamos margen.
  return Math.min(num(env.PHOTO_MAX_BYTES, 1_000_000), 1_900_000);
}

export function parseDataUrl(s: string): { mime: string; bytes: Uint8Array } | null {
  const m = /^data:([a-z]+\/[a-z0-9.+-]+);base64,([A-Za-z0-9+/=\s]+)$/i.exec(s);
  if (!m) return null;
  try {
    const bin = atob(m[2].replace(/\s+/g, ''));
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return { mime: m[1].toLowerCase(), bytes };
  } catch {
    return null;
  }
}

export async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const h = new Uint8Array(await crypto.subtle.digest('SHA-256', bytes));
  return [...h].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function storageKind(env: Env): 'r2' | 'd1' {
  return env.FOTOS ? 'r2' : 'd1';
}

/** Guarda el archivo. Con R2 escribe de inmediato; con D1 devuelve la sentencia para el batch. */
export async function putBlob(env: Env, id: string, mime: string, bytes: Uint8Array): Promise<D1PreparedStatement | null> {
  if (env.FOTOS) {
    await env.FOTOS.put(`fotos/${id}`, bytes, { httpMetadata: { contentType: mime } });
    return null;
  }
  return env.DB.prepare('INSERT OR REPLACE INTO photo_blobs (id, data) VALUES (?, ?)').bind(id, bytes);
}

export async function getBlob(env: Env, id: string, storage: string | null): Promise<Uint8Array | null> {
  if (storage === 'r2' && env.FOTOS) {
    const obj = await env.FOTOS.get(`fotos/${id}`);
    return obj ? new Uint8Array(await obj.arrayBuffer()) : null;
  }
  const row = await env.DB.prepare('SELECT data FROM photo_blobs WHERE id = ?').bind(id).first<{ data: ArrayBuffer | number[] }>();
  if (!row) return null;
  return row.data instanceof ArrayBuffer ? new Uint8Array(row.data) : new Uint8Array(row.data as number[]);
}

export function toDataUrl(mime: string, bytes: Uint8Array): string {
  return `data:${mime};base64,${b64Encode(bytes)}`;
}
