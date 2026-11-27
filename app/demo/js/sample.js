/* Datos de ejemplo (ficticios) para mostrar la app. Se marcan con demo: true
 * y se pueden borrar desde Ajustes sin tocar los datos reales. */
import * as store from './store.js';
import { addMonthsISO, todayISO, armarRegistro } from './records.js';

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return todayISO(d);
}
function ts(iso, hh = 9, mm = 0) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d, hh, mm).toISOString();
}

export async function cargarEjemplo() {
  const year = new Date().getFullYear();
  const clientes = [
    { id: store.uuid(), nombre: 'Rosa Méndez (ejemplo)', telefono: '59170000001' },
    { id: store.uuid(), nombre: 'Carlos Rojas (ejemplo)', telefono: '59170000002' },
    { id: store.uuid(), nombre: 'Consultorio Norte (ejemplo)', telefono: '59170000004' },
    { id: store.uuid(), nombre: 'Andina S.R.L. (ejemplo)', telefono: '59170000006' }
  ].map((c) => ({ ...c, demo: true }));
  await store.save('clientes', clientes);
  const [rosa, carlos, consul, andina] = clientes;
  let n = 0;
  const regs = [];
  const evs = [];
  function reg(c, key, fechaInicio, extra = {}) {
    n += 1;
    const { estado, ...core } = extra;
    const r = armarRegistro({ servicio: key, fechaInicio, estado: estado || 'pendiente', demo: true, ...core },
      c, `EJ-${year}-${String(n).padStart(3, '0')}`);
    r.createdAt = ts(fechaInicio, 8, 30);
    regs.push(r);
    evs.push({ id: store.uuid(), registroId: r.id, tipo: 'creado', texto: 'Registro creado', estadoA: 'pendiente', createdAt: r.createdAt, demo: true });
    return r;
  }
  function ev(r, fecha, hh, data) {
    evs.push({ id: store.uuid(), registroId: r.id, createdAt: ts(fecha, hh, 15), demo: true, texto: '', ...data });
  }

  const m1 = reg(rosa, 'mantenimiento-aire', addMonthsISO(daysAgo(-6), -6), {
    ubicacion: 'Equipetrol, calle 4 (ejemplo)',
    equipo: { tipo: 'Split / minisplit', capacidad: '9.000 a 18.000 BTU', marca: 'Ejemplo', modelo: '', ubicacion: 'Sala' },
    checklist: { evapClean: true, flashFlush: true, evaporador: true, filtros: true, compresor: true, olores: true, gas: true, voltaje: true },
    precio: 665, precioDetalle: [{ label: 'Mantenimiento 9.000 a 18.000 BTU', monto: 665 }],
    tiempoEstimado: { valor: 2, unidad: 'horas' }, estado: 'terminado',
    descripcion: 'Equipo en buen estado. Filtros con polvo acumulado.'
  });
  ev(m1, m1.fecha, 11, { tipo: 'estado', estadoDe: 'pendiente', estadoA: 'terminado' });

  const m2 = reg(consul, 'mantenimiento-aire', addMonthsISO(daysAgo(3), -6), {
    ubicacion: 'Av. Cristo Redentor, 3er anillo (ejemplo)',
    equipo: { tipo: 'Piso techo', capacidad: '24.000 a 30.000 BTU', marca: 'Ejemplo', modelo: '', ubicacion: 'Sala de espera' },
    checklist: { evapClean: true, flashFlush: true, evaporador: true, filtros: true, compresor: true, olores: true, gas: true, voltaje: true },
    precio: 840, precioDetalle: [{ label: 'Mantenimiento 24.000 a 30.000 BTU', monto: 840 }], estado: 'terminado'
  });
  ev(m2, m2.fecha, 12, { tipo: 'estado', estadoDe: 'pendiente', estadoA: 'terminado' });

  const t1 = reg(carlos, 'camaras', daysAgo(2), {
    ubicacion: 'Plan 3000, local comercial (ejemplo)',
    tiempoEstimado: { valor: 2, unidad: 'dias' }, precio: 3200, estado: 'en-curso',
    descripcion: 'Instalación de 4 cámaras con grabador y acceso desde el celular.'
  });
  ev(t1, daysAgo(2), 10, { tipo: 'estado', estadoDe: 'pendiente', estadoA: 'en-curso' });
  ev(t1, daysAgo(1), 16, { tipo: 'nota', texto: 'Faltó cable UTP para la cámara del patio. Se compran 30 m más.', monto: 180 });

  const t2 = reg(andina, 'panel-trifasico', daysAgo(9), {
    ubicacion: 'Parque industrial, Warnes (ejemplo)',
    tiempoEstimado: { valor: 3, unidad: 'dias' }, precio: 7800, estado: 'terminado',
    descripcion: 'Colocación de panel trifásico para sala de máquinas.'
  });
  ev(t2, daysAgo(8), 9, { tipo: 'estado', estadoDe: 'pendiente', estadoA: 'en-curso' });
  ev(t2, daysAgo(6), 18, { tipo: 'estado', estadoDe: 'en-curso', estadoA: 'terminado' });

  reg(rosa, 'cerco-electrico', daysAgo(-3), {
    ubicacion: 'Equipetrol, calle 4 (ejemplo)', tiempoEstimado: { valor: 1, unidad: 'dias' },
    descripcion: 'Cerco eléctrico de 40 m en el muro perimetral. Cotizar por WhatsApp.'
  });

  await store.save('registros', regs);
  await store.save('eventos', evs);
}

export function hayEjemplo() {
  const d = store.data();
  return d.registros.some((r) => r.demo) || d.clientes.some((c) => c.demo);
}

export async function borrarEjemplo() {
  const d = store.data();
  for (const k of ['fotos', 'firmas', 'eventos', 'registros', 'clientes']) {
    const ids = d[k].filter((x) => x.demo).map((x) => x.id);
    if (ids.length) await store.removeLocal(k, ids);
  }
}
