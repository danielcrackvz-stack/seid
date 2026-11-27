/* Informe PDF de trabajos y mantenimientos (jsPDF local, sin CDN). */
import { WHATSAPP_NUMBER, TECNICO_NOMBRE } from './config.js';
import { CHECKLIST_AIRE, estadoLabel } from './catalog.js';
import * as fmt from './format.js';

const BLUE = [1, 67, 151];
const INK = [20, 24, 31];
const MUTED = [98, 106, 118];
const LINE = [222, 224, 228];
const SOFT = [248, 247, 244];
const M = 16; // margen
const W = 210;
const H = 297;

let logoCache = null;

async function dataUrlOf(path) {
  const res = await fetch(new URL(path, import.meta.url));
  if (!res.ok) return null;
  const blob = await res.blob();
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = reject;
    r.readAsDataURL(blob);
  });
}

function imgSize(src) {
  return new Promise((resolve) => {
    const i = new Image();
    i.onload = () => resolve({ w: i.naturalWidth, h: i.naturalHeight });
    i.onerror = () => resolve({ w: 4, h: 3 });
    i.src = src;
  });
}

/** Helvetica de jsPDF solo tiene WinAnsi: se reemplazan caracteres que no existen. */
function t(s) {
  return String(s ?? '')
    .replace(/[−‒]/g, '-')
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/…/g, '...')
    .replace(/[^\u0000-\u00FF–—•€]/g, '');
}

function JsPDF() {
  const J = window.jspdf && window.jspdf.jsPDF;
  if (!J) throw new Error('No se pudo cargar el generador de PDF. Vuelva a abrir la app.');
  return J;
}

class Doc {
  constructor(titulo, numero) {
    const J = JsPDF();
    this.doc = new J({ unit: 'mm', format: 'a4', compress: true });
    this.titulo = titulo;
    this.numero = numero;
    this.y = 0;
    this.header(true);
  }

  header(first) {
    const d = this.doc;
    if (logoCache) {
      const lh = first ? 15 : 10;
      try { d.addImage(logoCache.src, 'PNG', M, 10, lh * logoCache.ratio, lh); } catch { /* */ }
    }
    d.setFont('helvetica', 'bold');
    d.setFontSize(first ? 12.5 : 10);
    d.setTextColor(...INK);
    d.text(t(this.titulo), W - M, 15, { align: 'right' });
    d.setFont('helvetica', 'normal');
    d.setFontSize(9);
    d.setTextColor(...BLUE);
    d.text(t(`N.º ${this.numero}`), W - M, 20.5, { align: 'right' });
    d.setTextColor(...MUTED);
    d.setFontSize(8);
    d.text(t(`${TECNICO_NOMBRE} · Santa Cruz, Bolivia`), W - M, 25, { align: 'right' });
    d.setDrawColor(...LINE);
    d.setLineWidth(0.3);
    d.line(M, 30, W - M, 30);
    this.y = 38;
  }

  ensure(need) {
    if (this.y + need > H - 22) {
      this.doc.addPage();
      this.header(false);
    }
  }

  section(label) {
    this.ensure(16);
    const d = this.doc;
    d.setFont('helvetica', 'bold');
    d.setFontSize(8.2);
    d.setTextColor(...BLUE);
    d.setCharSpace(0.35);
    d.text(t(label.toUpperCase()), M, this.y);
    d.setCharSpace(0);
    this.y += 5.5;
  }

  /** Pares etiqueta/valor en dos columnas. */
  grid(pairs) {
    const d = this.doc;
    const colW = (W - 2 * M) / 2;
    const rows = [];
    for (let i = 0; i < pairs.length; i += 2) rows.push([pairs[i], pairs[i + 1]]);
    for (const row of rows) {
      const heights = row.map((p) => (p ? d.splitTextToSize(t(p[1] ?? '—'), colW - 6).length : 0));
      const h = 5 + Math.max(...heights, 1) * 4.6;
      this.ensure(h);
      row.forEach((p, idx) => {
        if (!p) return;
        const x = M + idx * colW;
        d.setFont('helvetica', 'normal');
        d.setFontSize(7.8);
        d.setTextColor(...MUTED);
        d.text(t(p[0]), x, this.y);
        d.setFont('helvetica', 'bold');
        d.setFontSize(9.6);
        d.setTextColor(...INK);
        d.text(d.splitTextToSize(t(p[1] ?? '—'), colW - 6), x, this.y + 4.6);
      });
      this.y += h + 1.5;
    }
    this.y += 2;
  }

  paragraph(text, { size = 9.6, color = INK, gap = 4 } = {}) {
    const d = this.doc;
    d.setFont('helvetica', 'normal');
    d.setFontSize(size);
    d.setTextColor(...color);
    const lines = d.splitTextToSize(t(text || '—'), W - 2 * M);
    for (const line of lines) {
      this.ensure(5);
      d.text(line, M, this.y);
      this.y += 4.7;
    }
    this.y += gap;
  }

  rule() {
    this.doc.setDrawColor(...LINE);
    this.doc.setLineWidth(0.25);
    this.doc.line(M, this.y, W - M, this.y);
  }

  footer() {
    const d = this.doc;
    const n = d.getNumberOfPages();
    for (let i = 1; i <= n; i++) {
      d.setPage(i);
      d.setDrawColor(...LINE);
      d.setLineWidth(0.3);
      d.line(M, H - 15, W - M, H - 15);
      d.setFont('helvetica', 'normal');
      d.setFontSize(7.8);
      d.setTextColor(...MUTED);
      d.text(t(`SEID · Servicios de Electricidad Industrial y Domiciliaria · WhatsApp ${fmt.telefono(WHATSAPP_NUMBER)}`), M, H - 9.5);
      d.text(`Página ${i} de ${n}`, W - M, H - 9.5, { align: 'right' });
    }
  }
}

/**
 * Genera el PDF de un registro.
 * @param {object} r registro
 * @param {object[]} eventos bitácora del registro
 * @param {{total:number|null, ajustes:number}} tot
 */
export async function generarPdf(r, eventos, tot) {
  if (!logoCache) {
    const src = await dataUrlOf('../img/logo.png');
    if (src) logoCache = { src, ratio: 559 / 210 };
  }
  const esMant = r.tipo === 'mantenimiento';
  const p = new Doc(esMant ? 'Informe de mantenimiento' : 'Informe de trabajo', r.numero);
  const d = p.doc;

  // Banda principal
  d.setFillColor(...SOFT);
  d.roundedRect(M, p.y - 5, W - 2 * M, 17, 2, 2, 'F');
  d.setFont('helvetica', 'bold');
  d.setFontSize(13);
  d.setTextColor(...INK);
  d.text(t(r.servicioLabel), M + 5, p.y + 2.2);
  d.setFont('helvetica', 'normal');
  d.setFontSize(8.6);
  d.setTextColor(...MUTED);
  d.text(t(`Estado: ${estadoLabel(r.estado)}${r.bloqueado ? ' · Firmado y cerrado' : ''}`), M + 5, p.y + 7.4);
  if (tot.total != null) {
    d.setFont('helvetica', 'bold');
    d.setFontSize(13);
    d.setTextColor(...BLUE);
    d.text(t(fmt.bs(tot.total)), W - M - 5, p.y + 2.2, { align: 'right' });
    d.setFont('helvetica', 'normal');
    d.setFontSize(7.8);
    d.setTextColor(...MUTED);
    d.text('Total', W - M - 5, p.y + 7.4, { align: 'right' });
  }
  p.y += 21;

  p.section('Cliente');
  p.grid([
    ['Nombre', r.cliente?.nombre],
    ['WhatsApp', r.cliente?.telefono ? fmt.telefono(r.cliente.telefono) : '—'],
    ...(r.ubicacion ? [['Ubicación / referencia', r.ubicacion], null] : [])
  ]);

  p.section('Fechas y tiempos');
  p.grid([
    ['Fecha de inicio', fmt.fecha(r.fechaInicio)],
    ['Fecha de cierre', r.cierre ? fmt.fecha(r.cierre.fechaFin) : 'Sin cerrar'],
    ['Tiempo estimado', fmt.tiempo(r.tiempoEstimado)],
    ['Tiempo real', r.cierre ? fmt.tiempo(r.cierre.tiempoReal) : '—']
  ]);

  if (r.equipo && (r.equipo.tipo || r.equipo.capacidad || r.equipo.marca)) {
    p.section('Equipo');
    p.grid([
      ['Tipo', r.equipo.tipo || '—'],
      ['Capacidad', r.equipo.capacidad || '—'],
      ['Marca / modelo', [r.equipo.marca, r.equipo.modelo].filter(Boolean).join(' ') || '—'],
      ['Ubicación del equipo', r.equipo.ubicacion || '—']
    ]);
  }

  if (r.checklist) {
    p.section('Servicio realizado');
    const colW = (W - 2 * M) / 2;
    CHECKLIST_AIRE.forEach((item, i) => {
      if (i % 2 === 0) p.ensure(7);
      const x = M + (i % 2) * colW;
      const on = !!r.checklist[item.key];
      d.setLineWidth(0.3);
      if (on) {
        d.setFillColor(...BLUE);
        d.roundedRect(x, p.y - 3.3, 3.8, 3.8, 0.6, 0.6, 'F');
        d.setDrawColor(255, 255, 255);
        d.setLineWidth(0.5);
        d.line(x + 0.8, p.y - 1.4, x + 1.6, p.y - 0.5);
        d.line(x + 1.6, p.y - 0.5, x + 3.1, p.y - 2.5);
      } else {
        d.setDrawColor(...MUTED);
        d.roundedRect(x, p.y - 3.3, 3.8, 3.8, 0.6, 0.6, 'S');
      }
      d.setFont('helvetica', 'normal');
      d.setFontSize(9.2);
      d.setTextColor(...(on ? INK : MUTED));
      d.text(t(item.label + (on ? '' : ' (no realizado)')), x + 6, p.y);
      if (i % 2 === 1 || i === CHECKLIST_AIRE.length - 1) p.y += 6.4;
    });
    p.y += 3;
  }

  if (r.descripcion) {
    p.section(esMant ? 'Observaciones' : 'Descripción del trabajo');
    p.paragraph(r.descripcion);
  }

  // Detalle de precio
  const ajustes = eventos.filter((e) => e.ajuste);
  if (r.precio != null || r.precioDetalle?.length || ajustes.length) {
    p.section('Detalle de precio');
    const rows = [];
    if (r.precioDetalle?.length) {
      for (const it of r.precioDetalle) rows.push([it.label, it.monto]);
      const suma = r.precioDetalle.reduce((s, it) => s + Number(it.monto || 0), 0);
      if (r.precio != null && Math.round(suma) !== Math.round(r.precio)) rows.push(['Ajuste al precio acordado', r.precio - suma]);
    } else if (r.precio != null) {
      rows.push(['Precio acordado', r.precio]);
    }
    for (const e of ajustes) rows.push([`${e.ajuste > 0 ? 'Costo adicional' : 'Descuento'} (nota del ${fmt.fechaHora(e.createdAt)})`, e.ajuste]);
    for (const [label, monto] of rows) {
      const lines = d.splitTextToSize(t(label), W - 2 * M - 40);
      p.ensure(lines.length * 4.6 + 3);
      d.setFont('helvetica', 'normal');
      d.setFontSize(9.4);
      d.setTextColor(...INK);
      d.text(lines, M, p.y);
      d.text(t(fmt.bs(monto)), W - M, p.y, { align: 'right' });
      p.y += lines.length * 4.6 + 1.8;
    }
    p.ensure(10);
    p.rule();
    p.y += 5.5;
    d.setFont('helvetica', 'bold');
    d.setFontSize(10.5);
    d.text('Total', M, p.y);
    d.setTextColor(...BLUE);
    d.text(t(fmt.bs(tot.total)), W - M, p.y, { align: 'right' });
    p.y += 9;
  }

  // Bitácora
  const bitacora = eventos.filter((e) => e.tipo === 'nota' || e.tipo === 'estado');
  if (bitacora.length) {
    p.section('Notas e imprevistos');
    for (const e of bitacora) {
      const head = fmt.fechaHora(e.createdAt);
      const body = e.tipo === 'estado'
        ? `Estado: ${estadoLabel(e.estadoDe)} → ${estadoLabel(e.estadoA)}`.replace('→', '>')
        : [e.texto, e.ajuste ? `Ajuste de costo: ${fmt.bs(e.ajuste)}` : ''].filter(Boolean).join('\n');
      const lines = d.splitTextToSize(t(body), W - 2 * M - 6);
      let photoH = 0;
      let size = null;
      if (e.foto) { size = await imgSize(e.foto); photoH = Math.min(48, 64 * size.h / size.w); }
      p.ensure(8 + lines.length * 4.6 + (photoH ? photoH + 3 : 0));
      d.setFillColor(...BLUE);
      d.circle(M + 1.2, p.y - 1.2, 0.9, 'F');
      d.setFont('helvetica', 'bold');
      d.setFontSize(8.2);
      d.setTextColor(...MUTED);
      d.text(t(head), M + 5, p.y);
      p.y += 4.6;
      d.setFont('helvetica', 'normal');
      d.setFontSize(9.4);
      d.setTextColor(...INK);
      d.text(lines, M + 5, p.y);
      p.y += lines.length * 4.6;
      if (e.foto) {
        const w = photoH * size.w / size.h;
        try { d.addImage(e.foto, 'JPEG', M + 5, p.y, w, photoH); } catch { /* */ }
        p.y += photoH + 2;
      }
      p.y += 3;
    }
    p.y += 2;
  }

  if (r.proximoMantenimiento) {
    p.section('Próximo mantenimiento');
    p.paragraph(`Se recomienda el próximo mantenimiento el ${fmt.fecha(r.proximoMantenimiento, { dia: true })}. Le avisaremos por WhatsApp.`);
  }

  // Firmas
  p.ensure(58);
  p.section('Conformidad');
  const boxW = (W - 2 * M - 10) / 2;
  const sigs = [
    ['Técnico', r.cierre?.firmaTecnico],
    ['Cliente', r.cierre?.firmaCliente]
  ];
  const top = p.y;
  for (let i = 0; i < 2; i++) {
    const [rol, f] = sigs[i];
    const x = M + i * (boxW + 10);
    const boxH = 30;
    if (f?.png) {
      const s = await imgSize(f.png);
      let h = boxH - 4;
      let w = h * s.w / s.h;
      if (w > boxW - 4) { w = boxW - 4; h = w * s.h / s.w; }
      try { d.addImage(f.png, 'PNG', x + (boxW - w) / 2, top + (boxH - h) / 2, w, h); } catch { /* */ }
    }
    d.setDrawColor(...INK);
    d.setLineWidth(0.3);
    d.line(x, top + boxH + 1, x + boxW, top + boxH + 1);
    d.setFont('helvetica', 'bold');
    d.setFontSize(9.4);
    d.setTextColor(...INK);
    d.text(t(f?.nombre || (rol === 'Técnico' ? TECNICO_NOMBRE : r.cliente?.nombre || '')), x, top + boxH + 6);
    d.setFont('helvetica', 'normal');
    d.setFontSize(8);
    d.setTextColor(...MUTED);
    const extra = [rol, f?.ci ? `CI ${f.ci}` : '', f?.fecha ? fmt.fechaHora(f.fecha) : 'Sin firmar'].filter(Boolean).join(' · ');
    d.text(t(extra), x, top + boxH + 10.5);
  }
  p.y = top + 48;

  p.footer();
  const nombre = (r.cliente?.nombre || 'cliente').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '');
  const filename = `${r.numero}_${nombre}.pdf`;
  return { blob: d.output('blob'), filename };
}

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

/** Comparte un archivo con Web Share (WhatsApp, etc.); si no se puede, lo descarga. */
export async function shareFile(blob, filename, { title, text, type } = {}) {
  const file = new File([blob], filename, { type: type || blob.type || 'application/octet-stream' });
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title, text });
      return 'shared';
    } catch (err) {
      if (err && err.name === 'AbortError') return 'aborted';
    }
  }
  downloadBlob(blob, filename);
  return 'downloaded';
}
