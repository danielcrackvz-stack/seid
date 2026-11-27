/* Limpieza de registros de muestra de versiones anteriores (marcados con demo: true).
 * Nunca se suben al servidor ni se incluyen en los respaldos. */
import * as store from './store.js';

export function hayEjemplo() {
  const d = store.data();
  return ['registros', 'clientes', 'eventos'].some((k) => d[k].some((x) => x.demo));
}

export async function borrarEjemplo() {
  const d = store.data();
  for (const k of ['fotos', 'firmas', 'eventos', 'registros', 'clientes']) {
    const ids = d[k].filter((x) => x.demo).map((x) => x.id);
    if (ids.length) await store.removeLocal(k, ids);
  }
}
