/* Formatos de fecha, dinero y teléfono para Bolivia. */
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const MESES_C = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

export function fecha(iso, { dia = false, corta = false } = {}) {
  if (!iso) return '—';
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  if (corta) return `${d} ${MESES_C[m - 1]} ${y}`;
  const base = `${d} de ${MESES[m - 1]} de ${y}`;
  return dia ? `${DIAS[dt.getDay()]} ${base}` : base;
}

export function fechaHora(isoTs) {
  if (!isoTs) return '—';
  const d = new Date(isoTs);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${d.getDate()} ${MESES_C[d.getMonth()]} ${d.getFullYear()}, ${hh}:${mm}`;
}

export function mesAnio(d) { return `${MESES[d.getMonth()]} ${d.getFullYear()}`; }

export function bs(n) {
  if (n == null || n === '' || Number.isNaN(Number(n))) return '—';
  const num = Number(n);
  const neg = num < 0;
  const [i, dec] = Math.abs(num).toFixed(2).split('.');
  const int = i.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${neg ? '−' : ''}Bs ${int}${dec === '00' ? '' : ',' + dec}`;
}

export function telefono(num) {
  const d = String(num || '').replace(/\D/g, '');
  if (d.startsWith('591') && d.length === 11) return `+591 ${d.slice(3, 7)} ${d.slice(7)}`;
  return num || '—';
}

export function tiempo(t) {
  if (!t || !t.valor) return '—';
  const v = Number(t.valor);
  const u = t.unidad === 'dias' ? (v === 1 ? 'día' : 'días') : (v === 1 ? 'hora' : 'horas');
  return `${String(t.valor).replace('.', ',')} ${u}`;
}

export function diasTexto(days) {
  if (days === 0) return 'Hoy';
  if (days === 1) return 'Mañana';
  if (days === -1) return 'Ayer';
  if (days < 0) return `Vencido hace ${Math.abs(days)} días`;
  return `En ${days} días`;
}

export function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function waLink(phone, text) {
  const d = String(phone || '').replace(/\D/g, '');
  return `https://wa.me/${d}${text ? `?text=${encodeURIComponent(text)}` : ''}`;
}
