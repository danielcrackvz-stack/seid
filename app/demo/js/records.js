/* Reglas de negocio: registros inmutables, notas en bitácora, cierre con firmas
 * y recordatorios de mantenimiento a los 6 meses. */
import * as store from './store.js';
import { servicio, generaRecordatorio } from './catalog.js';

export function todayISO(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function addMonthsISO(iso, months) {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(y, m - 1 + months, 1);
  const last = new Date(dt.getFullYear(), dt.getMonth() + 1, 0).getDate();
  dt.setDate(Math.min(d, last));
  return todayISO(dt);
}

export function daysUntil(iso) {
  if (!iso) return Infinity;
  const [y, m, d] = iso.split('-').map(Number);
  const t = new Date(y, m - 1, d);
  const n = new Date(); n.setHours(0, 0, 0, 0);
  return Math.round((t - n) / 86400000);
}

export function digits(s) { return String(s || '').replace(/\D/g, ''); }

/** Normaliza teléfono boliviano a 591XXXXXXXX. */
export function normPhone(s) {
  let d = digits(s);
  if (d.length === 8) d = '591' + d;
  return d;
}

const D = () => store.data();
const vivo = (x) => x && !x.deletedAt;

/* Forma de los documentos (contrato con la API, docs/app-sync-contract.md):
 * registro = { id, tipo, servicio, clienteId, createdAt, updatedAt,           ← fijos (salvo updatedAt)
 *              core: { numero, servicioLabel, cliente, ubicacion, fechaInicio, tiempoEstimado,
 *                      precio, precioDetalle, descripcion, equipo, checklist, seguimientoDe, modalidad },
 *              firmaTecnico, firmaCliente,                                     ← fijos una vez firmados
 *              estado, fecha, proximoMantenimiento, recordatorio, cierre, bloqueado, deletedAt }
 * Para la interfaz se usa la versión "plana" (core + campos de arriba). */

function firmaDoc(id) { return id ? D().firmas.find((f) => f.id === id) || null : null; }

function plano(r) {
  const c = r.core || {};
  const out = { ...c, ...r, fechaInicio: r.fecha || c.fechaInicio };
  delete out.core;
  if (r.cierre) {
    const ft = r.firmaTecnico || {};
    const fc = r.firmaCliente || {};
    out.cierre = {
      ...r.cierre,
      firmaTecnico: { ...ft, png: firmaDoc(ft.firmaId)?.imagen || '' },
      firmaCliente: { ...fc, png: firmaDoc(fc.firmaId)?.imagen || '' }
    };
  }
  return out;
}

export function clientes() { return D().clientes.filter(vivo); }
export function cliente(id) { const c = D().clientes.find((x) => x.id === id); return vivo(c) ? c : null; }
export function registros() { return D().registros.filter(vivo).map(plano); }
export function registro(id) { const r = D().registros.find((x) => x.id === id); return vivo(r) ? plano(r) : null; }
function crudo(id) { const r = D().registros.find((x) => x.id === id); return vivo(r) ? r : null; }

export function fotoSrc(fotoId) {
  const f = D().fotos.find((x) => x.id === fotoId);
  return vivo(f) ? f.dataUrl || f._dataUrl || '' : '';
}

/** Bitácora del registro con foto y monto ya resueltos para la interfaz. */
export function eventosDe(id) {
  return D().eventos
    .filter((e) => e.registroId === id && vivo(e))
    .map((e) => ({ ...e, ajuste: Number(e.monto) || null, foto: e.fotoId ? fotoSrc(e.fotoId) : '' }))
    .sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)));
}

export function ajustesTotal(id) {
  return eventosDe(id).reduce((s, e) => s + (Number(e.ajuste) || 0), 0);
}

export function totalRegistro(r) {
  if (r.precio == null && !eventosDe(r.id).some((e) => e.ajuste)) return null;
  return (Number(r.precio) || 0) + ajustesTotal(r.id);
}

async function nextNumero() {
  // El correlativo sigue al mayor número conocido del año (también los bajados de otro teléfono).
  const year = new Date().getFullYear();
  const re = new RegExp(`^SEID-${year}-(\\d+)$`);
  const max = D().registros.reduce((m, r) => { const x = re.exec(r.core?.numero || ''); return x ? Math.max(m, Number(x[1])) : m; }, 0);
  const prev = store.meta('secuenciaAnio', year) === year ? store.meta('secuencia', 0) || 0 : 0;
  const seq = Math.max(prev, max) + 1;
  await store.setMeta('secuencia', seq);
  await store.setMeta('secuenciaAnio', year);
  return `SEID-${new Date().getFullYear()}-${String(seq).padStart(4, '0')}`;
}

/** Busca o crea el cliente por teléfono (o por nombre si no hay teléfono). */
export async function upsertCliente({ id, nombre, telefono }) {
  const tel = normPhone(telefono);
  const lista = clientes();
  let c = id ? cliente(id) : null;
  if (!c && tel) c = lista.find((x) => x.telefono === tel) || null;
  if (!c && !tel) c = lista.find((x) => !x.telefono && x.nombre.trim().toLowerCase() === nombre.trim().toLowerCase()) || null;
  if (c) {
    const changed = (nombre && nombre !== c.nombre) || (tel && tel !== c.telefono);
    if (changed) {
      c = { ...c, nombre: nombre || c.nombre, telefono: tel || c.telefono };
      await store.save('clientes', c);
    }
    return c;
  }
  c = { id: store.uuid(), nombre: nombre.trim(), telefono: tel };
  await store.save('clientes', c);
  return c;
}

/** Arma el documento de registro en la forma del contrato. */
export function armarRegistro(input, c, numero) {
  const s = servicio(input.servicio);
  const fecha = input.fechaInicio || todayISO();
  const remind = generaRecordatorio(s.key);
  return {
    id: input.id || store.uuid(),
    tipo: s.key === 'mantenimiento-aire' ? 'mantenimiento' : 'trabajo',
    servicio: s.key,
    clienteId: c.id,
    core: {
      numero,
      servicioLabel: s.label,
      cliente: { nombre: c.nombre, telefono: c.telefono || '' },
      ubicacion: input.ubicacion || '',
      fechaInicio: fecha,
      tiempoEstimado: input.tiempoEstimado && input.tiempoEstimado.valor ? input.tiempoEstimado : null,
      precio: input.precio === '' || input.precio == null || Number.isNaN(Number(input.precio)) ? null : Number(input.precio),
      precioDetalle: input.precioDetalle || [],
      descripcion: input.descripcion || '',
      equipo: input.equipo || null,
      checklist: input.checklist || null,
      seguimientoDe: input.seguimientoDe || null,
      modalidad: input.modalidad || (s.key === 'mantenimiento-aire' ? 'preventivo' : null)
    },
    firmaTecnico: null,
    firmaCliente: null,
    estado: input.estado || 'pendiente',
    fecha,
    proximoMantenimiento: remind ? addMonthsISO(fecha, 6) : null,
    recordatorio: remind,
    cierre: null,
    bloqueado: false,
    ...(input.demo ? { demo: true } : {})
  };
}

/**
 * Crea un registro (trabajo o mantenimiento). Después de guardarlo, sus datos
 * originales (core) ya no se editan: los cambios se agregan como eventos.
 */
export async function crearRegistro(input) {
  const c = await upsertCliente(input.cliente);
  const r = armarRegistro(input, c, await nextNumero());
  await store.save('registros', r);
  await store.save('eventos', { id: store.uuid(), registroId: r.id, tipo: 'creado', texto: 'Registro creado', estadoA: r.estado });
  // El mantenimiento nuevo atiende el recordatorio del registro anterior.
  if (r.core.seguimientoDe) {
    const prev = crudo(r.core.seguimientoDe);
    if (prev && prev.recordatorio !== false) await store.save('registros', { ...prev, recordatorio: false });
  }
  return plano(r);
}

function assertAbierto(r) {
  if (!r) throw new Error('No se encontró el registro.');
  if (r.bloqueado) throw new Error('Este registro ya está firmado y cerrado.');
}

export async function agregarNota(id, { texto, foto, ajuste }) {
  const r = crudo(id);
  assertAbierto(r);
  const monto = ajuste === '' || ajuste == null ? null : Number(ajuste);
  if (!texto && !foto && !monto) throw new Error('Escriba una nota, agregue una foto o un ajuste de costo.');
  let fotoId = null;
  if (foto) {
    fotoId = store.uuid();
    await store.save('fotos', { id: fotoId, registroId: id, descripcion: texto ? texto.slice(0, 120) : 'Foto', dataUrl: foto });
  }
  const ev = {
    id: store.uuid(), registroId: id, tipo: 'nota',
    texto: texto || '', fotoId, monto: monto && !Number.isNaN(monto) ? monto : null
  };
  await store.save('eventos', ev);
  await store.save('registros', { ...r });
  return ev;
}

export async function cambiarEstado(id, estado) {
  const r = crudo(id);
  assertAbierto(r);
  if (r.estado === estado) return plano(r);
  const next = { ...r, estado };
  await store.save('registros', next);
  await store.save('eventos', { id: store.uuid(), registroId: id, tipo: 'estado', estadoDe: r.estado, estadoA: estado, texto: '' });
  return plano(next);
}

/** Cierra con firmas (entidad "firmas", solo agregar). El registro queda bloqueado. */
export async function cerrarRegistro(id, { fechaFin, tiempoReal, firmaTecnico, firmaCliente }) {
  const r = crudo(id);
  assertAbierto(r);
  if (!firmaTecnico?.png || !firmaCliente?.png) throw new Error('Faltan las dos firmas.');
  const now = new Date().toISOString();
  const fin = fechaFin || todayISO();
  const ft = { id: store.uuid(), registroId: id, rol: 'tecnico', nombre: firmaTecnico.nombre, imagen: firmaTecnico.png };
  const fc = { id: store.uuid(), registroId: id, rol: 'cliente', nombre: firmaCliente.nombre, ci: firmaCliente.ci || '', imagen: firmaCliente.png };
  await store.save('firmas', [ft, fc]);
  const remind = generaRecordatorio(r.servicio) && r.recordatorio !== false;
  const next = {
    ...r,
    estado: 'terminado',
    bloqueado: true,
    proximoMantenimiento: remind ? addMonthsISO(fin, 6) : r.proximoMantenimiento,
    firmaTecnico: { firmaId: ft.id, nombre: ft.nombre, fecha: now },
    firmaCliente: { firmaId: fc.id, nombre: fc.nombre, ci: fc.ci, fecha: now },
    cierre: { fechaFin: fin, tiempoReal: tiempoReal && tiempoReal.valor ? tiempoReal : null, cerradoAt: now }
  };
  await store.save('registros', next);
  if (r.estado !== 'terminado') {
    await store.save('eventos', { id: store.uuid(), registroId: id, tipo: 'estado', estadoDe: r.estado, estadoA: 'terminado', texto: '' });
  }
  await store.save('eventos', { id: store.uuid(), registroId: id, tipo: 'cierre', texto: `Firmado por ${ft.nombre} y ${fc.nombre}` });
  return plano(next);
}

/** Recordatorios de mantenimiento: uno por registro con próximo mantenimiento. */
export function recordatorios({ dentroDeDias = Infinity } = {}) {
  return registros()
    .filter((r) => r.proximoMantenimiento && r.recordatorio !== false)
    .map((r) => ({ registro: r, fecha: r.proximoMantenimiento, dias: daysUntil(r.proximoMantenimiento) }))
    .filter((x) => x.dias <= dentroDeDias)
    .sort((a, b) => a.dias - b.dias);
}

export async function descartarRecordatorio(id) {
  const r = crudo(id);
  if (!r) return;
  await store.save('registros', { ...r, recordatorio: false });
  await store.save('eventos', { id: store.uuid(), registroId: id, tipo: 'recordatorio-descartado', texto: 'Recordatorio de mantenimiento descartado' });
}

/** Fecha (ISO) en que se debe avisar: 15 días antes. */
export function fechaAviso(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(y, m - 1, d - 15);
  return todayISO(dt);
}
