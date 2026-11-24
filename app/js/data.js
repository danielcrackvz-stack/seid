/* SEID demo — almacenamiento local y datos de ejemplo (ficticios). */

const STORAGE_KEY = 'seid-demo-v1';
const SESSION_KEY = 'seid-demo-session';

export const CHECKLIST = [
  { key: 'lavadoCondensador', label: 'Lavado de panel condensador' },
  { key: 'limpiezaControl', label: 'Limpieza de control eléctrico' },
  { key: 'inspeccionTransmision', label: 'Inspección de transmisión' },
  { key: 'limpiezaBandeja', label: 'Limpieza de bandeja de drenaje' },
  { key: 'lubricacionRodamientos', label: 'Lubricación de rodamientos' },
  { key: 'inspeccionBomba', label: 'Inspección de bomba' },
  { key: 'limpiezaRejillas', label: 'Limpieza de rejillas' },
  { key: 'lavadoFiltros', label: 'Lavado de filtros' },
  { key: 'inspeccionCarga', label: 'Inspección de carga de refrigerante' },
  { key: 'lavadoEvaporacion', label: 'Lavado de panel de evaporación' },
  { key: 'limpiezaBlower', label: 'Limpieza de blower' },
  { key: 'ajusteContactos', label: 'Ajuste de contactos' },
  { key: 'verificacionTermostato', label: 'Verificación de termostato' }
];

export const CORRECTIVOS = [
  { key: 'recuperacionRefrigerante', label: 'Recuperación de refrigerante' },
  { key: 'correccionFuga', label: 'Corrección de fuga' },
  { key: 'cambioFiltro', label: 'Cambio de filtro' },
  { key: 'cargaRefrigerante', label: 'Carga de refrigerante' },
  { key: 'reguladorVoltaje', label: 'Regulador de voltaje' },
  { key: 'repuestos', label: 'Repuestos' },
  { key: 'tuberiaEMT', label: 'Tubería EMT' },
  { key: 'rubatex', label: 'Rubatex' },
  { key: 'cintaVinilo', label: 'Cinta de vinilo' },
  { key: 'cableado', label: 'Cableado' }
];

export const TIPOS_EQUIPO = [
  'Ventana',
  'Minisplit',
  'Piso techo',
  'Central',
  'Cassette',
  'Central desnudo'
];

export const TIPOS_TRABAJO = [
  { key: 'electricidad', label: 'Electricidad' },
  { key: 'plomeria', label: 'Plomería' },
  { key: 'gas', label: 'Instalación de gas' },
  { key: 'instalacion-aire', label: 'Instalación de aire' },
  { key: 'venta-equipo', label: 'Venta de equipo' },
  { key: 'mantenimiento', label: 'Mantenimiento' }
];

export const ESTADOS_TRABAJO = [
  { key: 'pendiente', label: 'Pendiente' },
  { key: 'en-curso', label: 'En curso' },
  { key: 'terminado', label: 'Terminado' },
  { key: 'cobrado', label: 'Cobrado' }
];

/** Lista de precios de proveedor (ficticia, solo para la demo). Montos en bolivianos. */
export const CATALOGO = [
  { id: 'eq-ms12', tipo: 'equipo', nombre: 'Minisplit 12.000 BTU', detalle: 'Marca ejemplo FrostAir, R-410A', precio: 2850 },
  { id: 'eq-ms18', tipo: 'equipo', nombre: 'Minisplit 18.000 BTU', detalle: 'Marca ejemplo FrostAir, R-410A', precio: 3650 },
  { id: 'eq-ms24', tipo: 'equipo', nombre: 'Minisplit 24.000 BTU', detalle: 'Marca ejemplo FrostAir, R-410A', precio: 4980 },
  { id: 'eq-ven12', tipo: 'equipo', nombre: 'Aire de ventana 12.000 BTU', detalle: 'Marca ejemplo CoolVent', precio: 1980 },
  { id: 'eq-cas36', tipo: 'equipo', nombre: 'Cassette 36.000 BTU', detalle: 'Marca ejemplo ClimaPro, 4 vías', precio: 8450 },
  { id: 'eq-pt36', tipo: 'equipo', nombre: 'Piso techo 36.000 BTU', detalle: 'Marca ejemplo ClimaPro', precio: 7890 },
  { id: 'in-res-12', tipo: 'instalacion', nombre: 'Instalación residencial 12–18.000 BTU', detalle: 'Hasta 4 m de tubería, vaciado y puesta en marcha', precio: 850 },
  { id: 'in-res-24', tipo: 'instalacion', nombre: 'Instalación residencial 24.000 BTU', detalle: 'Hasta 5 m de tubería, vaciado y puesta en marcha', precio: 1150 },
  { id: 'in-cas', tipo: 'instalacion', nombre: 'Instalación cassette / piso techo', detalle: 'Incluye soportes y puesta en marcha', precio: 2450 },
  { id: 'ex-tubo', tipo: 'extra', nombre: 'Metro adicional de tubería de cobre', detalle: 'Con aislamiento rubatex', precio: 95 },
  { id: 'ex-reg', tipo: 'extra', nombre: 'Regulador de voltaje 12–18.000 BTU', detalle: '', precio: 420 },
  { id: 'ex-soporte', tipo: 'extra', nombre: 'Soporte de condensador reforzado', detalle: '', precio: 180 }
];

export function uid(prefix = 'id') {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export function todayISO() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function addMonthsISO(iso, months) {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(y, m - 1 + months, d);
  const yy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, '0');
  const dd = String(dt.getDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}

function allOn(keys) {
  const o = {};
  for (const { key } of keys) o[key] = true;
  return o;
}

function seedClients() {
  return [
    {
      id: 'c-rosa',
      nombre: 'Rosa Méndez (ejemplo)',
      telefono: '59170000001',
      direccion: 'Av. San Martín, casi 4to anillo',
      zona: 'Equipetrol, Santa Cruz',
      notas: 'Cliente de ejemplo. Prefiere visitas por la mañana.',
      equipos: [
        {
          id: 'e-rosa-1',
          marca: 'FrostAir (ejemplo)',
          modelo: 'FA-18INV',
          serie: 'DEMO-FA18-001',
          tipo: 'Minisplit',
          capacidadBTU: '18.000',
          refrigerante: 'R-410A',
          ubicacion: 'Sala'
        }
      ]
    },
    {
      id: 'c-carlos',
      nombre: 'Carlos Rojas (ejemplo)',
      telefono: '59170000002',
      direccion: 'Calle Los Tajibos, oficina 3',
      zona: 'Plan 3000, Santa Cruz',
      notas: 'Local comercial de demostración.',
      equipos: [
        {
          id: 'e-carlos-1',
          marca: 'ClimaPro (ejemplo)',
          modelo: 'CP-CAS36',
          serie: 'DEMO-CPC36-014',
          tipo: 'Cassette',
          capacidadBTU: '36.000',
          refrigerante: 'R-410A',
          ubicacion: 'Oficina principal'
        }
      ]
    },
    {
      id: 'c-lucia',
      nombre: 'Lucía Fernández (ejemplo)',
      telefono: '59170000003',
      direccion: 'UV 12, manzano 8',
      zona: 'Villa 1.º de Mayo, Santa Cruz',
      notas: '',
      equipos: [
        {
          id: 'e-lucia-1',
          marca: 'CoolVent (ejemplo)',
          modelo: 'CV-W12',
          serie: 'DEMO-CVW12-077',
          tipo: 'Ventana',
          capacidadBTU: '12.000',
          refrigerante: 'R-32',
          ubicacion: 'Dormitorio'
        }
      ]
    },
    {
      id: 'c-clinica',
      nombre: 'Consultorio Demo Norte',
      telefono: '59170000004',
      direccion: 'Av. Cristo Redentor, 3er anillo interno',
      zona: 'Norte, Santa Cruz',
      notas: 'Empresa de ejemplo. Coordinar con recepción.',
      equipos: [
        {
          id: 'e-clinica-1',
          marca: 'ClimaPro (ejemplo)',
          modelo: 'CP-PT24',
          serie: 'DEMO-PT24-220',
          tipo: 'Piso techo',
          capacidadBTU: '24.000',
          refrigerante: 'R-410A',
          ubicacion: 'Sala de espera'
        },
        {
          id: 'e-clinica-2',
          marca: 'FrostAir (ejemplo)',
          modelo: 'FA-12INV',
          serie: 'DEMO-FA12-221',
          tipo: 'Minisplit',
          capacidadBTU: '12.000',
          refrigerante: 'R-410A',
          ubicacion: 'Consultorio 1'
        }
      ]
    },
    {
      id: 'c-pedro',
      nombre: 'Pedro Vargas (ejemplo)',
      telefono: '59170000005',
      direccion: 'Condominio Las Palmas, casa 12',
      zona: 'Urubó, Santa Cruz',
      notas: '',
      equipos: [
        {
          id: 'e-pedro-1',
          marca: 'FrostAir (ejemplo)',
          modelo: 'FA-24INV',
          serie: 'DEMO-FA24-309',
          tipo: 'Minisplit',
          capacidadBTU: '24.000',
          refrigerante: 'R-410A',
          ubicacion: 'Estar'
        }
      ]
    },
    {
      id: 'c-andina',
      nombre: 'Andina Demo S.R.L.',
      telefono: '59170000006',
      direccion: 'Parque industrial, galpón 4',
      zona: 'Warnes, Santa Cruz',
      notas: 'Trabajo industrial de ejemplo.',
      equipos: [
        {
          id: 'e-andina-1',
          marca: 'ClimaPro (ejemplo)',
          modelo: 'CP-CTR60',
          serie: 'DEMO-CTR60-018',
          tipo: 'Central',
          capacidadBTU: '60.000',
          refrigerante: 'R-410A',
          ubicacion: 'Sala de máquinas'
        }
      ]
    }
  ];
}

function seedMantenimientos() {
  const done = allOn(CHECKLIST);
  return [
    {
      id: 'm-rosa-1',
      fecha: '2026-05-28',
      tipo: 'preventivo',
      ot: 'OT-2026-008',
      clienteId: 'c-rosa',
      ubicacion: 'Av. San Martín, Equipetrol — Sala',
      tecnico: 'Ing. Abel Galarza',
      auxiliar: 'Luis Pérez (ejemplo)',
      equipoId: 'e-rosa-1',
      equipo: {
        tipo: 'Minisplit',
        marca: 'FrostAir (ejemplo)',
        modelo: 'FA-18INV',
        serie: 'DEMO-FA18-001',
        capacidadBTU: '18.000',
        refrigerante: 'R-410A',
        ubicacion: 'Sala'
      },
      checklist: done,
      paramsAntes: { presionBaja: '118', presionAlta: '320', amperaje: '6,8', voltaje: '218' },
      paramsDespues: { presionBaja: '125', presionAlta: '335', amperaje: '6,4', voltaje: '220' },
      observaciones: 'Equipo de ejemplo en buen estado. Filtros con polvo acumulado; se lavaron.',
      diagnostico: ['Revisar drenaje en la próxima visita', 'Recordar limpieza de filtros cada 30 días'],
      trabajosCorrectivos: { cambioFiltro: true },
      repuestos: [{ nombre: 'Filtro de aire (ejemplo)', cantidad: '1' }],
      fotos: [],
      firmaCliente: '',
      firmaTecnico: '',
      proximoMantenimiento: '2026-11-28'
    },
    {
      id: 'm-carlos-1',
      fecha: '2026-06-02',
      tipo: 'preventivo',
      ot: 'OT-2026-011',
      clienteId: 'c-carlos',
      ubicacion: 'Calle Los Tajibos, Plan 3000 — Oficina principal',
      tecnico: 'Ing. Abel Galarza',
      auxiliar: '',
      equipoId: 'e-carlos-1',
      equipo: {
        tipo: 'Cassette',
        marca: 'ClimaPro (ejemplo)',
        modelo: 'CP-CAS36',
        serie: 'DEMO-CPC36-014',
        capacidadBTU: '36.000',
        refrigerante: 'R-410A',
        ubicacion: 'Oficina principal'
      },
      checklist: done,
      paramsAntes: { presionBaja: '110', presionAlta: '310', amperaje: '12,1', voltaje: '380' },
      paramsDespues: { presionBaja: '122', presionAlta: '328', amperaje: '11,4', voltaje: '382' },
      observaciones: 'Unidad cassette de demostración. Se limpió bandeja y se verificó drenaje.',
      diagnostico: ['Programar lavado profundo del ducto en 12 meses'],
      trabajosCorrectivos: {},
      repuestos: [],
      fotos: [],
      firmaCliente: '',
      firmaTecnico: '',
      proximoMantenimiento: '2026-12-02'
    },
    {
      id: 'm-lucia-1',
      fecha: '2026-06-06',
      tipo: 'correctivo',
      ot: 'OT-2026-014',
      clienteId: 'c-lucia',
      ubicacion: 'Villa 1.º de Mayo — Dormitorio',
      tecnico: 'Ing. Abel Galarza',
      auxiliar: '',
      equipoId: 'e-lucia-1',
      equipo: {
        tipo: 'Ventana',
        marca: 'CoolVent (ejemplo)',
        modelo: 'CV-W12',
        serie: 'DEMO-CVW12-077',
        capacidadBTU: '12.000',
        refrigerante: 'R-32',
        ubicacion: 'Dormitorio'
      },
      checklist: { ...done, inspeccionBomba: false, inspeccionTransmision: false },
      paramsAntes: { presionBaja: '90', presionAlta: '280', amperaje: '7,9', voltaje: '205' },
      paramsDespues: { presionBaja: '120', presionAlta: '325', amperaje: '5,9', voltaje: '220' },
      observaciones: 'Equipo de ejemplo con bajo voltaje en el barrio. Se recomendó regulador.',
      diagnostico: ['Instalar regulador de voltaje', 'Volver a medir amperaje en la próxima visita'],
      trabajosCorrectivos: { cargaRefrigerante: true, reguladorVoltaje: true },
      repuestos: [{ nombre: 'Regulador de voltaje 12.000 BTU (ejemplo)', cantidad: '1' }],
      fotos: [],
      firmaCliente: '',
      firmaTecnico: '',
      proximoMantenimiento: '2026-12-06'
    },
    {
      id: 'm-clinica-1',
      fecha: '2026-05-18',
      tipo: 'preventivo',
      ot: 'OT-2026-006',
      clienteId: 'c-clinica',
      ubicacion: 'Av. Cristo Redentor — Sala de espera',
      tecnico: 'Ing. Abel Galarza',
      auxiliar: 'Luis Pérez (ejemplo)',
      equipoId: 'e-clinica-1',
      equipo: {
        tipo: 'Piso techo',
        marca: 'ClimaPro (ejemplo)',
        modelo: 'CP-PT24',
        serie: 'DEMO-PT24-220',
        capacidadBTU: '24.000',
        refrigerante: 'R-410A',
        ubicacion: 'Sala de espera'
      },
      checklist: done,
      paramsAntes: { presionBaja: '121', presionAlta: '330', amperaje: '9,2', voltaje: '221' },
      paramsDespues: { presionBaja: '124', presionAlta: '336', amperaje: '8,8', voltaje: '222' },
      observaciones: 'Mantenimiento de ejemplo ya vencido, para mostrar el aviso de recordatorio.',
      diagnostico: ['No se observaron fallas'],
      trabajosCorrectivos: {},
      repuestos: [],
      fotos: [],
      firmaCliente: '',
      firmaTecnico: '',
      proximoMantenimiento: '2026-11-18'
    },
    {
      id: 'm-pedro-1',
      fecha: '2026-11-10',
      tipo: 'preventivo',
      ot: 'OT-2026-027',
      clienteId: 'c-pedro',
      ubicacion: 'Urubó, condominio Las Palmas — Estar',
      tecnico: 'Ing. Abel Galarza',
      auxiliar: '',
      equipoId: 'e-pedro-1',
      equipo: {
        tipo: 'Minisplit',
        marca: 'FrostAir (ejemplo)',
        modelo: 'FA-24INV',
        serie: 'DEMO-FA24-309',
        capacidadBTU: '24.000',
        refrigerante: 'R-410A',
        ubicacion: 'Estar'
      },
      checklist: done,
      paramsAntes: { presionBaja: '124', presionAlta: '332', amperaje: '8,1', voltaje: '223' },
      paramsDespues: { presionBaja: '126', presionAlta: '338', amperaje: '7,8', voltaje: '224' },
      observaciones: 'Instalación reciente de ejemplo. Equipo operando dentro de parámetros.',
      diagnostico: ['Próximo preventivo en seis meses'],
      trabajosCorrectivos: {},
      repuestos: [],
      fotos: [],
      firmaCliente: '',
      firmaTecnico: '',
      proximoMantenimiento: '2027-05-10'
    },
    {
      id: 'm-andina-1',
      fecha: '2026-11-15',
      tipo: 'preventivo',
      ot: 'OT-2026-029',
      clienteId: 'c-andina',
      ubicacion: 'Warnes, parque industrial — Sala de máquinas',
      tecnico: 'Ing. Abel Galarza',
      auxiliar: 'Mario Soto (ejemplo)',
      equipoId: 'e-andina-1',
      equipo: {
        tipo: 'Central',
        marca: 'ClimaPro (ejemplo)',
        modelo: 'CP-CTR60',
        serie: 'DEMO-CTR60-018',
        capacidadBTU: '60.000',
        refrigerante: 'R-410A',
        ubicacion: 'Sala de máquinas'
      },
      checklist: done,
      paramsAntes: { presionBaja: '115', presionAlta: '340', amperaje: '18,4', voltaje: '381' },
      paramsDespues: { presionBaja: '123', presionAlta: '348', amperaje: '17,6', voltaje: '383' },
      observaciones: 'Unidad central de demostración. Se lubricaron rodamientos y se lavó condensador.',
      diagnostico: ['Revisar correas en la próxima visita'],
      trabajosCorrectivos: { lubricacionRodamientos: false },
      repuestos: [{ nombre: 'Correa de ejemplo (ajuste)', cantidad: '—' }],
      fotos: [],
      firmaCliente: '',
      firmaTecnico: '',
      proximoMantenimiento: '2027-05-15'
    }
  ];
}

function seedTrabajos() {
  return [
    { id: 't-1', tipo: 'electricidad', clienteId: 'c-rosa', fecha: '2026-11-05', monto: 850, estado: 'cobrado', descripcion: 'Tablero monofásico y tomacorrientes en sala (trabajo de ejemplo).' },
    { id: 't-2', tipo: 'instalacion-aire', clienteId: 'c-pedro', fecha: '2026-11-10', monto: 5800, estado: 'cobrado', descripcion: 'Venta e instalación de minisplit 24.000 BTU (ejemplo).' },
    { id: 't-3', tipo: 'plomeria', clienteId: 'c-lucia', fecha: '2026-11-12', monto: 620, estado: 'terminado', descripcion: 'Reparación de fuga en desagüe pluvial (ejemplo).' },
    { id: 't-4', tipo: 'gas', clienteId: 'c-carlos', fecha: '2026-11-20', monto: 980, estado: 'en-curso', descripcion: 'Instalación de línea de gas para cocina industrial de ejemplo.' },
    { id: 't-5', tipo: 'electricidad', clienteId: 'c-andina', fecha: '2026-11-22', monto: 2450, estado: 'pendiente', descripcion: 'Revisión trifásica en sala de máquinas (ejemplo).' },
    { id: 't-6', tipo: 'venta-equipo', clienteId: 'c-clinica', fecha: '2026-10-28', monto: 3650, estado: 'cobrado', descripcion: 'Venta de minisplit 18.000 BTU (mes anterior, ejemplo).' }
  ];
}

export function seedState() {
  return {
    version: 1,
    clientes: seedClients(),
    mantenimientos: seedMantenimientos(),
    trabajos: seedTrabajos(),
    cotizaciones: []
  };
}

export function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return seedState();
    const data = JSON.parse(raw);
    if (!data || !Array.isArray(data.clientes)) return seedState();
    return data;
  } catch {
    return seedState();
  }
}

export function saveState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  return state;
}

export function resetDemo() {
  localStorage.removeItem(STORAGE_KEY);
  const state = seedState();
  saveState(state);
  return state;
}

export function getSession() {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY) || localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setSession(session) {
  const payload = JSON.stringify(session);
  sessionStorage.setItem(SESSION_KEY, payload);
  localStorage.setItem(SESSION_KEY, payload);
}

export function clearSession() {
  sessionStorage.removeItem(SESSION_KEY);
  localStorage.removeItem(SESSION_KEY);
}

export function getClient(state, id) {
  return state.clientes.find((c) => c.id === id) || null;
}

export function nextOT(state) {
  const year = new Date().getFullYear();
  let max = 0;
  for (const m of state.mantenimientos) {
    const match = String(m.ot || '').match(/OT-(\d+)-(\d+)/);
    if (match && Number(match[1]) === year) max = Math.max(max, Number(match[2]));
  }
  return `OT-${year}-${String(max + 1).padStart(3, '0')}`;
}

export function upcomingMaintenance(state, withinDays = 15) {
  const list = state.mantenimientos
    .map((m) => {
      const client = getClient(state, m.clienteId);
      const days = daysUntil(m.proximoMantenimiento);
      return { ...m, client, days };
    })
    .filter((m) => m.proximoMantenimiento && m.days <= withinDays)
    .sort((a, b) => a.days - b.days);
  return list;
}

export function daysUntil(iso) {
  if (!iso) return Infinity;
  const [y, m, d] = iso.split('-').map(Number);
  const target = new Date(y, m - 1, d);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  return Math.round((target - today) / 86400000);
}

export function monthKey(iso) {
  return iso ? iso.slice(0, 7) : '';
}

export function currentMonthKey() {
  return todayISO().slice(0, 7);
}
