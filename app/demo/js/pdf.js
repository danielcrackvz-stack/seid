/* Generación de PDF (jsPDF por CDN) y compartido por WhatsApp / Web Share. */
import { WHATSAPP_NUMBER } from './config.js';

const MESES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];

export function formatFecha(iso, withWeekday = false) {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  const base = `${d} de ${MESES[m - 1]} de ${y}`;
  if (!withWeekday) return base;
  const dias = ['domingo','lunes','martes','miércoles','jueves','viernes','sábado'];
  return `${dias[dt.getDay()]}, ${base}`;
}

export function formatBs(n) {
  const num = Number(n) || 0;
  const parts = num.toFixed(2).split('.');
  const int = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  if (parts[1] === '00') return `Bs ${int}`;
  return `Bs ${int},${parts[1]}`;
}

export function formatPhone(num) {
  const d = String(num || '').replace(/\D/g, '');
  if (d.startsWith('591') && d.length >= 11) return `+591 ${d.slice(3, 4)} ${d.slice(4, 7)} ${d.slice(7)}`;
  return num || '—';
}

function mustJsPdf() {
  const JSPDF = window.jspdf && window.jspdf.jsPDF;
  if (!JSPDF) throw new Error('No se pudo cargar la librería para generar PDF.');
  return JSPDF;
}

let logoDataUrl = null;
let currentLogo = null;

async function getLogoDataUrl() {
  if (logoDataUrl) return logoDataUrl;
  const res = await fetch(new URL('../img/logo.png', import.meta.url));
  if (!res.ok) return null;
  const blob = await res.blob();
  logoDataUrl = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
  return logoDataUrl;
}

function header(doc, title, subtitle) {
  const w = doc.internal.pageSize.getWidth();
  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, w, 26, 'F');
  if (currentLogo) {
    try {
      const lh = 17;
      const lw = lh * (559 / 210);
      doc.addImage(currentLogo, 'PNG', 14, 5, lw, lh);
    } catch {
      /* if the image cannot be embedded, the title still identifies the company */
    }
  }
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(1, 67, 151);
  doc.text(title, w - 14, 11.5, { align: 'right' });
  if (subtitle) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(90, 98, 110);
    doc.text(subtitle, w - 14, 16.8, { align: 'right' });
  }
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(90, 98, 110);
  doc.text('Ing. Abel Galarza  ·  Santa Cruz, Bolivia', w - 14, 21.8, { align: 'right' });
  doc.setFillColor(216, 220, 226);
  doc.rect(0, 26, w, 0.4, 'F');
}

function footer(doc) {
  const w = doc.internal.pageSize.getWidth();
  const h = doc.internal.pageSize.getHeight();
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFillColor(247, 248, 250);
    doc.rect(0, h - 14, w, 14, 'F');
    doc.setFillColor(1, 67, 151);
    doc.rect(0, h - 14, w, 0.4, 'F');
    doc.setFontSize(7.2);
    doc.setTextColor(90, 98, 110);
    doc.setFont('helvetica', 'normal');
    doc.text(`WhatsApp ${formatPhone(WHATSAPP_NUMBER)}  ·  DEMO · datos de ejemplo`, 14, h - 6);
    doc.text(`Página ${i} de ${pages}`, w - 14, h - 6, { align: 'right' });
  }
}

function ensureSpace(doc, y, need = 24) {
  const h = doc.internal.pageSize.getHeight();
  if (y + need > h - 20) {
    doc.addPage();
    header(doc, 'Informe de mantenimiento', 'Continuación');
    return 34;
  }
  return y;
}

function sectionTitle(doc, y, text) {
  y = ensureSpace(doc, y, 14);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(1, 67, 151);
  doc.text(text.toUpperCase(), 14, y);
  doc.setDrawColor(1, 67, 151);
  doc.setLineWidth(0.4);
  doc.line(14, y + 1.6, 80, y + 1.6);
  return y + 8;
}

function kv(doc, y, pairs) {
  const w = doc.internal.pageSize.getWidth();
  const col = (w - 28) / 2;
  doc.setFontSize(9);
  for (let i = 0; i < pairs.length; i += 2) {
    y = ensureSpace(doc, y, 10);
    const left = pairs[i];
    const right = pairs[i + 1];
    if (left) {
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(91, 110, 126);
      doc.text(left[0], 14, y);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(18, 32, 46);
      doc.text(String(left[1] ?? '—'), 14, y + 4.4);
    }
    if (right) {
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(91, 110, 126);
      doc.text(right[0], 14 + col, y);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(18, 32, 46);
      doc.text(String(right[1] ?? '—'), 14 + col, y + 4.4);
    }
    y += 11;
  }
  return y;
}

function wrapped(doc, text, x, y, maxW, lineH = 4.4) {
  const lines = doc.splitTextToSize(String(text || '—'), maxW);
  doc.text(lines, x, y);
  return y + lines.length * lineH;
}

export async function generateMaintenancePdf(mant, client) {
  currentLogo = await getLogoDataUrl();
  const JsPDF = mustJsPdf();
  const doc = new JsPDF({ unit: 'mm', format: 'a4' });
  const tipo = mant.tipo === 'correctivo' ? 'Correctivo' : 'Preventivo';
  header(doc, 'Informe de mantenimiento', `${mant.ot || ''}  ·  ${tipo}`);

  let y = 34;
  doc.setFillColor(232, 238, 248);
  doc.roundedRect(14, y - 4, 182, 8, 1.5, 1.5, 'F');
  doc.setFontSize(8);
  doc.setTextColor(1, 67, 151);
  doc.setFont('helvetica', 'bold');
  doc.text('DEMO · DATOS DE EJEMPLO', 18, y + 1.2);
  y += 12;

  y = sectionTitle(doc, y, 'Datos generales');
  y = kv(doc, y, [
    ['Fecha', formatFecha(mant.fecha, true)],
    ['Orden de trabajo', mant.ot || '—'],
    ['Tipo', tipo],
    ['Próximo mantenimiento', formatFecha(mant.proximoMantenimiento, true)],
    ['Técnico', mant.tecnico || '—'],
    ['Auxiliar', mant.auxiliar || '—']
  ]);

  y = sectionTitle(doc, y, 'Cliente y ubicación');
  y = kv(doc, y, [
    ['Cliente', client ? client.nombre : '—'],
    ['Teléfono', client ? formatPhone(client.telefono) : '—'],
    ['Zona', client ? client.zona : '—'],
    ['Ubicación del trabajo', mant.ubicacion || (client && client.direccion) || '—']
  ]);

  const eq = mant.equipo || {};
  y = sectionTitle(doc, y, 'Equipo');
  y = kv(doc, y, [
    ['Tipo', eq.tipo || '—'],
    ['Marca', eq.marca || '—'],
    ['Modelo', eq.modelo || '—'],
    ['Serie', eq.serie || '—'],
    ['Capacidad', eq.capacidadBTU ? `${eq.capacidadBTU} BTU` : '—'],
    ['Refrigerante', eq.refrigerante || '—']
  ]);
  if (eq.ubicacion) {
    y = kv(doc, y, [['Ubicación del equipo', eq.ubicacion], null]);
  }

  y = sectionTitle(doc, y, 'Lista de verificación');
  const items = (window.SEID_CHECKLIST || []).length
    ? window.SEID_CHECKLIST
    : (await import('./data.js')).CHECKLIST;
  doc.setFontSize(9);
  for (const item of items) {
    y = ensureSpace(doc, y, 7);
    const on = !!(mant.checklist && mant.checklist[item.key]);
    doc.setDrawColor(12, 31, 51);
    doc.setLineWidth(0.3);
    doc.rect(14, y - 3.2, 3.6, 3.6);
    if (on) {
      doc.setFillColor(1, 67, 151);
      doc.rect(14, y - 3.2, 3.6, 3.6, 'F');
      doc.setDrawColor(255, 255, 255);
      doc.setLineWidth(0.55);
      doc.line(14.7, y - 1.3, 15.5, y - 0.2);
      doc.line(15.5, y - 0.2, 17.2, y - 2.6);
    }
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(18, 32, 46);
    doc.text(item.label, 20, y);
    doc.setTextColor(on ? 1 : 90, on ? 67 : 98, on ? 151 : 110);
    doc.setFont('helvetica', 'bold');
    doc.text(on ? 'Hecho' : 'No', 186, y, { align: 'right' });
    y += 6.2;
  }

  y = sectionTitle(doc, y + 2, 'Parámetros');
  const antes = mant.paramsAntes || {};
  const despues = mant.paramsDespues || {};
  y = kv(doc, y, [
    ['Presión baja (antes)', antes.presionBaja ? `${antes.presionBaja} PSI` : '—'],
    ['Presión baja (después)', despues.presionBaja ? `${despues.presionBaja} PSI` : '—'],
    ['Presión alta (antes)', antes.presionAlta ? `${antes.presionAlta} PSI` : '—'],
    ['Presión alta (después)', despues.presionAlta ? `${despues.presionAlta} PSI` : '—'],
    ['Amperaje compresor (antes)', antes.amperaje ? `${antes.amperaje} A` : '—'],
    ['Amperaje compresor (después)', despues.amperaje ? `${despues.amperaje} A` : '—'],
    ['Voltaje (antes)', antes.voltaje ? `${antes.voltaje} V` : '—'],
    ['Voltaje (después)', despues.voltaje ? `${despues.voltaje} V` : '—']
  ]);

  y = sectionTitle(doc, y, 'Observaciones');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(18, 32, 46);
  y = wrapped(doc, mant.observaciones || 'Sin observaciones.', 14, y, 182);
  y += 4;

  if (mant.diagnostico && mant.diagnostico.length) {
    y = sectionTitle(doc, y, 'Diagnóstico y recomendaciones para la próxima visita');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(18, 32, 46);
    for (const rec of mant.diagnostico.filter(Boolean)) {
      y = ensureSpace(doc, y, 8);
      y = wrapped(doc, `•  ${rec}`, 14, y, 182);
      y += 1.5;
    }
    y += 2;
  }

  const correctivos = (await import('./data.js')).CORRECTIVOS;
  const doneCorr = correctivos.filter((c) => mant.trabajosCorrectivos && mant.trabajosCorrectivos[c.key]);
  y = sectionTitle(doc, y, 'Trabajos correctivos');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(18, 32, 46);
  if (doneCorr.length) {
    y = wrapped(doc, doneCorr.map((c) => c.label).join(', '), 14, y, 182);
  } else {
    y = wrapped(doc, 'Ninguno registrado.', 14, y, 182);
  }
  y += 4;

  y = sectionTitle(doc, y, 'Repuestos utilizados');
  if (mant.repuestos && mant.repuestos.length) {
    for (const r of mant.repuestos) {
      y = ensureSpace(doc, y, 7);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(18, 32, 46);
      doc.text(`${r.nombre || '—'}   ·   cant. ${r.cantidad || '—'}`, 14, y);
      y += 6;
    }
  } else {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text('Ninguno registrado.', 14, y);
    y += 8;
  }

  y = ensureSpace(doc, y, 50);
  y = sectionTitle(doc, y, 'Firmas');
  const sigW = 80;
  const sigH = 28;
  if (mant.firmaCliente) {
    try { doc.addImage(mant.firmaCliente, 'PNG', 14, y, sigW, sigH); } catch { /* ignore */ }
  } else {
    doc.setDrawColor(200, 210, 218);
    doc.rect(14, y, sigW, sigH);
  }
  if (mant.firmaTecnico) {
    try { doc.addImage(mant.firmaTecnico, 'PNG', 112, y, sigW, sigH); } catch { /* ignore */ }
  } else {
    doc.setDrawColor(200, 210, 218);
    doc.rect(112, y, sigW, sigH);
  }
  y += sigH + 5;
  doc.setFontSize(8);
  doc.setTextColor(91, 110, 126);
  doc.text('Firma del cliente', 14, y);
  doc.text('Firma del técnico', 112, y);

  footer(doc);
  const filename = `${(mant.ot || 'mantenimiento').replace(/\s+/g, '_')}_SEID_demo.pdf`;
  return { doc, blob: doc.output('blob'), filename };
}

export async function generateQuotePdf(quote, client) {
  currentLogo = await getLogoDataUrl();
  const JsPDF = mustJsPdf();
  const doc = new JsPDF({ unit: 'mm', format: 'a4' });
  header(doc, 'Cotización de aires', quote.numero || '');

  let y = 34;
  doc.setFillColor(232, 238, 248);
  doc.roundedRect(14, y - 4, 182, 8, 1.5, 1.5, 'F');
  doc.setFontSize(8);
  doc.setTextColor(1, 67, 151);
  doc.setFont('helvetica', 'bold');
  doc.text('DEMO · PRECIOS DE EJEMPLO  ·  No es una oferta formal', 18, y + 1.2);
  y += 12;

  y = sectionTitle(doc, y, 'Cliente');
  y = kv(doc, y, [
    ['Nombre', client ? client.nombre : quote.clienteNombre || '—'],
    ['Fecha', formatFecha(quote.fecha, true)],
    ['Zona', client ? client.zona : '—'],
    ['Teléfono', client ? formatPhone(client.telefono) : '—']
  ]);

  y = sectionTitle(doc, y, 'Detalle');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(91, 110, 126);
  doc.text('Ítem', 14, y);
  doc.text('Importe', 196, y, { align: 'right' });
  y += 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(18, 32, 46);
  for (const item of quote.items) {
    y = ensureSpace(doc, y, 10);
    const name = doc.splitTextToSize(item.nombre, 150);
    doc.text(name, 14, y);
    doc.setFont('helvetica', 'bold');
    doc.text(formatBs(item.precio), 196, y, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    y += Math.max(8, name.length * 4.4 + 2);
  }

  y = ensureSpace(doc, y, 36);
  doc.setDrawColor(232, 238, 242);
  doc.line(14, y, 196, y);
  y += 8;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`Subtotal proveedor`, 120, y);
  doc.text(formatBs(quote.subtotal), 196, y, { align: 'right' });
  y += 6;
  doc.text(`Margen (${quote.margen} %)`, 120, y);
  doc.text(formatBs(quote.margenMonto), 196, y, { align: 'right' });
  y += 9;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(1, 49, 113);
  doc.text('Total', 120, y);
  doc.text(formatBs(quote.total), 196, y, { align: 'right' });
  y += 12;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(91, 110, 126);
  y = wrapped(
    doc,
    'Precios de demostración con lista de proveedor ficticia. En la versión real se cargarán los precios que entreguen las empresas proveedoras. Vigencia ilustrativa: 15 días. No incluye impuestos no detallados.',
    14,
    y,
    182
  );

  footer(doc);
  const filename = `${(quote.numero || 'cotizacion').replace(/\s+/g, '_')}_SEID_demo.pdf`;
  return { doc, blob: doc.output('blob'), filename };
}

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

export function waLink(phone, text) {
  const digits = String(phone || '').replace(/\D/g, '');
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}

export async function sharePdfOrWhatsApp({ blob, filename, title, text, phone }) {
  const file = new File([blob], filename, { type: 'application/pdf' });
  const canFiles = navigator.canShare && navigator.canShare({ files: [file] });
  if (canFiles) {
    try {
      await navigator.share({ files: [file], title, text });
      return 'shared';
    } catch (err) {
      if (err && err.name === 'AbortError') return 'aborted';
    }
  }
  downloadBlob(blob, filename);
  window.open(waLink(phone, text), '_blank', 'noopener');
  return 'whatsapp';
}

export function mantenimientoWhatsAppText(mant, client) {
  const eq = mant.equipo || {};
  const lineas = [
    `SEID — Informe de mantenimiento (DEMO)`,
    ``,
    `Cliente: ${client ? client.nombre : '—'}`,
    `Fecha: ${formatFecha(mant.fecha)}`,
    `Tipo: ${mant.tipo === 'correctivo' ? 'Correctivo' : 'Preventivo'}`,
    `OT: ${mant.ot || '—'}`,
    `Equipo: ${eq.tipo || ''} ${eq.capacidadBTU ? eq.capacidadBTU + ' BTU' : ''} ${eq.marca || ''}`.replace(/\s+/g, ' ').trim(),
    eq.ubicacion ? `Ubicación del equipo: ${eq.ubicacion}` : '',
    `Próximo mantenimiento: ${formatFecha(mant.proximoMantenimiento)}`,
    mant.observaciones ? `Observaciones: ${mant.observaciones}` : '',
    ``,
    `Este mensaje se genera desde la demostración del panel SEID. Los datos son de ejemplo.`
  ];
  return lineas.filter((l, i, arr) => l !== '' || arr[i - 1] !== '').join('\n');
}

export function quoteWhatsAppText(quote, client) {
  const items = quote.items.map((it) => `• ${it.nombre}: ${formatBs(it.precio)}`).join('\n');
  return [
    `SEID — Cotización de aires (DEMO)`,
    ``,
    `Cliente: ${client ? client.nombre : quote.clienteNombre || '—'}`,
    `Fecha: ${formatFecha(quote.fecha)}`,
    `N.º ${quote.numero}`,
    ``,
    items,
    ``,
    `Subtotal: ${formatBs(quote.subtotal)}`,
    `Margen (${quote.margen} %): ${formatBs(quote.margenMonto)}`,
    `TOTAL: ${formatBs(quote.total)}`,
    ``,
    `Precios de demostración, no son una oferta formal.`
  ].join('\n');
}
