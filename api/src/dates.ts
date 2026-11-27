/** Utilidades de fechas de calendario (YYYY-MM-DD) sin dependencias. */

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function isDate(s: unknown): boolean {
  if (typeof s !== "string") return false;
  const m = DATE_RE.exec(s);
  if (!m) return false;
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  return d.getUTCFullYear() === +m[1] && d.getUTCMonth() === +m[2] - 1 && d.getUTCDate() === +m[3];
}

/** Fecha de calendario en la zona dada para un instante. */
export function localDate(instant: Date | number, timeZone = 'America/La_Paz'): string {
  const fmt = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' });
  return fmt.format(typeof instant === 'number' ? new Date(instant) : instant);
}

/** Acepta 'YYYY-MM-DD' o un ISO con hora; devuelve la fecha local o null. */
export function toLocalDate(v: unknown, timeZone = 'America/La_Paz'): string | null {
  if (typeof v !== 'string' || !v) return null;
  if (isDate(v)) return v;
  const head = v.slice(0, 10);
  if (isDate(head) && v.length > 10) {
    const t = Date.parse(v);
    if (Number.isNaN(t)) return head;
    // Si trae zona horaria (Z u offset) se convierte; si no, se usa la fecha escrita.
    return /([zZ]|[+-]\d{2}:?\d{2})$/.test(v) ? localDate(t, timeZone) : head;
  }
  return null;
}

function parts(d: string): [number, number, number] {
  const m = DATE_RE.exec(d)!;
  return [+m[1], +m[2], +m[3]];
}

function fmt(y: number, m: number, d: number): string {
  return `${String(y).padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

/** Suma meses; si el día no existe en el mes destino se usa el último día (31-ago + 6 = 28/29-feb). */
export function addMonths(date: string, months: number): string {
  const [y, m, d] = parts(date);
  const total = y * 12 + (m - 1) + months;
  const ny = Math.floor(total / 12);
  const nm = (total % 12) + 1;
  const last = new Date(Date.UTC(ny, nm, 0)).getUTCDate();
  return fmt(ny, nm, Math.min(d, last));
}

export function addDays(date: string, days: number): string {
  const [y, m, d] = parts(date);
  const t = new Date(Date.UTC(y, m - 1, d + days));
  return fmt(t.getUTCFullYear(), t.getUTCMonth() + 1, t.getUTCDate());
}

export function daysBetween(a: string, b: string): number {
  const [y1, m1, d1] = parts(a);
  const [y2, m2, d2] = parts(b);
  return Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 86_400_000);
}

/** dd/mm/aaaa para textos en español. */
export function humanDate(date: string): string {
  const [y, m, d] = parts(date);
  return `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`;
}
