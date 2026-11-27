/* PIN local de 4 dígitos (se guarda solo su hash PBKDF2) y bloqueo por inactividad.
 * Cuando exista el servidor, api.login() reemplaza o complementa este PIN. */
import * as store from './store.js';

const UNLOCK_KEY = 'seid-desbloqueo';
const IDLE_MS = 15 * 60 * 1000;

function toHex(buf) { return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join(''); }

async function derive(pin, saltHex) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', enc.encode(pin), 'PBKDF2', false, ['deriveBits']);
  const salt = new Uint8Array(saltHex.match(/../g).map((h) => parseInt(h, 16)));
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: 150000 }, key, 256);
  return toHex(bits);
}

export function hasPin() { return !!store.meta('pin'); }

export async function setPin(pin) {
  if (!/^\d{4}$/.test(pin)) throw new Error('El PIN debe tener 4 números.');
  const salt = toHex(crypto.getRandomValues(new Uint8Array(16)));
  await store.setMeta('pin', { salt, hash: await derive(pin, salt), v: 1 });
  markActive();
}

export async function checkPin(pin) {
  const p = store.meta('pin');
  if (!p) return true;
  const ok = (await derive(pin, p.salt)) === p.hash;
  if (ok) markActive();
  return ok;
}

export async function removePin() { await store.setMeta('pin', null); }

export function markActive() {
  try { localStorage.setItem(UNLOCK_KEY, String(Date.now())); } catch { /* */ }
}

export function lock() {
  try { localStorage.removeItem(UNLOCK_KEY); } catch { /* */ }
}

export function isLocked() {
  if (!hasPin()) return false;
  const last = Number(localStorage.getItem(UNLOCK_KEY) || 0);
  return !last || Date.now() - last > IDLE_MS;
}
