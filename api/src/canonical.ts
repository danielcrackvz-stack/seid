/** JSON canónico (claves ordenadas) para comparar documentos sin importar el orden. */
export function canonical(v: unknown): string {
  if (v === null || typeof v !== 'object') return JSON.stringify(v === undefined ? null : v);
  if (Array.isArray(v)) return `[${v.map(canonical).join(',')}]`;
  const o = v as Record<string, unknown>;
  return `{${Object.keys(o).filter((k) => o[k] !== undefined).sort().map((k) => `${JSON.stringify(k)}:${canonical(o[k])}`).join(',')}}`;
}

export function isEmpty(v: unknown): boolean {
  return v === undefined || v === null || v === '' || (typeof v === 'object' && !Array.isArray(v) && Object.keys(v as object).length === 0);
}
