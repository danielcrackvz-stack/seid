/* SEID — panel de trabajo (demo navegable, sin backend). */
import * as db from './data.js';
import {
  formatFecha,
  formatBs,
  formatPhone,
  generateMaintenancePdf,
  generateQuotePdf,
  downloadBlob,
  waLink,
  sharePdfOrWhatsApp,
  mantenimientoWhatsAppText,
  quoteWhatsAppText
} from './pdf.js';

window.SEID_CHECKLIST = db.CHECKLIST;

let state = db.loadState();
let draft = null;
let quoteDraft = null;
let calCursor = startOfMonth(new Date());
let calSelected = db.todayISO();
let toastTimer = 0;
let menuOpen = false;
let trabajoFiltro = 'todos';
let clienteQuery = '';

const ICO = {
  home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 11.5 12 5l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-8.5z"/></svg>',
  people: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M16 19v-1a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v1"/><circle cx="9.5" cy="7" r="3"/><path d="M22 19v-1a3.5 3.5 0 0 0-2.5-3.35"/><path d="M16.5 4.2a3 3 0 0 1 0 5.6"/></svg>',
  bag: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 8h16v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/></svg>',
  cal: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M8 3v4M16 3v4"/></svg>',
  quote: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 4h7l6 6v10a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z"/><path d="M14 4v6h6M8 14h8M8 18h5"/></svg>',
  plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
  back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5 8 12l7 7"/></svg>',
  more: '<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="6" cy="12" r="1.7"/><circle cx="12" cy="12" r="1.7"/><circle cx="18" cy="12" r="1.7"/></svg>',
  search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="6.5"/><path d="M16 16.5 20.5 21"/></svg>',
  wa: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2a10 10 0 0 0-8.6 15L2 22l5.2-1.4A10 10 0 1 0 12 2zm0 1.8a8.2 8.2 0 0 1 7 13.4l-.3.4.5 3.1-3.1-.8-.4.2A8.2 8.2 0 1 1 12 3.8zm-3.4 3.5c-.2 0-.5.1-.7.3-.3.3-.8.9-.8 2.1 0 1.2.9 2.4 1 2.6 1.7 2.9 4.3 4.3 6.2 4.8.5.1 1 .1 1.3-.2.4-.4 1-1.2 1.1-1.5.1-.3.1-.6 0-.7l-1.7-.9c-.2-.1-.3-.1-.5.1l-.7.8c-.1.2-.3.2-.5.1-1-.4-2.1-1.3-2.8-2.6-.1-.2 0-.3.1-.5l.4-.5c.1-.2.1-.3 0-.5L9.3 7.8c-.1-.2-.3-.5-.7-.5z"/></svg>',
  wrench: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a4.5 4.5 0 0 0-6.1 6.1L4 17l3 3 4.6-4.6a4.5 4.5 0 0 0 6.1-6.1L15.5 11 13 8.5l1.7-2.2z"/></svg>',
  user: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M20 20v-1a5 5 0 0 0-5-5H9a5 5 0 0 0-5 5v1"/><circle cx="12" cy="7" r="3.2"/></svg>',
  check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5 10 17l9-10"/></svg>',
  pdf: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M7 3h7l5 5v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z"/><path d="M14 3v6h6"/></svg>',
  chevronL: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M15 5 8 12l7 7"/></svg>',
  chevronR: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M9 5l7 7-7 7"/></svg>'
};

function wordmarkHtml(variant) {
  const isLogin = variant === 'login';
  const cls = isLogin ? 'wordmark wordmark--login' : 'wordmark wordmark--app';
  const src = isLogin ? 'img/logo.png' : 'img/logo-header.png';
  const size = isLogin ? 'width="559" height="210"' : 'width="559" height="166"';
  return `<a class="${cls}" href="#/inicio" aria-label="SEID, ir al inicio">
    <img class="wordmark__img" src="${src}" ${size} alt="SEID, Servicios de Electricidad Industrial y Domiciliaria">
  </a>`;
}

function badge() {
  return '<span class="demo-badge">DEMO · datos de ejemplo</span>';
}

function persist() { db.saveState(state); }

function toast(msg) {
  document.querySelectorAll('.toast').forEach((n) => n.remove());
  const n = document.createElement('div');
  n.className = 'toast';
  n.setAttribute('role', 'status');
  n.textContent = msg;
  document.body.appendChild(n);
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => n.remove(), 2800);
}

function startOfMonth(d) { return new Date(d.getFullYear(), d.getMonth(), 1); }

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Buenos días';
  if (h < 19) return 'Buenas tardes';
  return 'Buenas noches';
}

function firstName(full) {
  const s = (full || '').replace(/\s*\(ejemplo\)\s*/gi, ' ').trim();
  const parts = s.split(/\s+/);
  if (parts[0] === 'Ing.' && parts[1]) return `${parts[0]} ${parts[1]}`;
  return parts[0] || 'Ingeniero';
}

function daysLabel(days) {
  if (days === 0) return 'Hoy';
  if (days === 1) return 'Mañana';
  if (days === -1) return 'Ayer';
  if (days < 0) return `Hace ${Math.abs(days)} días`;
  return `En ${days} días`;
}

function pillForDays(days) {
  if (days < 0) return `<span class="pill pill--overdue">${daysLabel(days)}</span>`;
  if (days <= 15) return `<span class="pill pill--soon">${daysLabel(days)}</span>`;
  return `<span class="pill pill--ok">${daysLabel(days)}</span>`;
}

function tipoTrabajoLabel(key) {
  return (db.TIPOS_TRABAJO.find((t) => t.key === key) || { label: key }).label;
}
function estadoLabel(key) {
  return (db.ESTADOS_TRABAJO.find((t) => t.key === key) || { label: key }).label;
}

function parseRoute() {
  const raw = (location.hash || '#/login').replace(/^#/, '');
  const [path, qs] = raw.split('?');
  const parts = path.split('/').filter(Boolean);
  const q = Object.fromEntries(new URLSearchParams(qs || ''));
  return { parts, q, name: parts[0] || 'login', id: parts[1] || '', sub: parts[2] || '' };
}

function go(hash) {
  if (!hash.startsWith('#')) hash = '#' + hash;
  if (location.hash === hash) render();
  else location.hash = hash;
}

function sessionOrLogin(route) {
  const session = db.getSession();
  if (!session && route.name !== 'login') {
    go('#/login');
    return null;
  }
  return session;
}

function headerBar({ title, back, showMenu = true } = {}) {
  const left = back
    ? `<button class="icon-btn" type="button" data-act="back" aria-label="Volver">${ICO.back}</button>`
    : wordmarkHtml();
  const mid = title ? `<h1 class="screen-title">${esc(title)}</h1>` : badge();
  const right = showMenu
    ? `<button class="icon-btn" type="button" data-act="menu" aria-label="Más opciones">${ICO.more}</button>`
    : '<span style="width:2.75rem"></span>';
  return `<header class="app-header">
    <div class="header-side">${left}</div>
    ${mid}
    <div class="header-side">${right}</div>
  </header>`;
}

function tabbar(active) {
  const items = [
    ['inicio', ICO.home, 'Inicio'],
    ['clientes', ICO.people, 'Clientes'],
    ['trabajos', ICO.bag, 'Trabajos'],
    ['agenda', ICO.cal, 'Agenda'],
    ['cotizar', ICO.quote, 'Cotizar']
  ];
  return `<nav class="tabbar" aria-label="Principal">
    ${items.map(([id, icon, label]) => `
      <a href="#/${id}" class="${active === id ? 'is-active' : ''}" ${active === id ? 'aria-current="page"' : ''}>
        ${icon}<span>${label}</span>
      </a>`).join('')}
  </nav>`;
}

function shell(content, { title, back, tab, flush = false } = {}) {
  return `${headerBar({ title, back })}
    <main class="app-main${flush ? ' app-main--flush' : ''}">${content}</main>
    ${tabbar(tab)}`;
}

function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function iconWrap(svg) {
  return `<span class="action-btn__icon" aria-hidden="true">${svg}</span>`;
}

function viewLogin() {
  const remembered = db.getSession()?.nombre || 'Ing. Abel Galarza';
  return `<div class="login">
    <div class="login-brand">${wordmarkHtml('login')}</div>
    <p class="kicker">Panel de trabajo</p>
    <div class="demo-wrap">${badge()}</div>
    <div class="login-panel">
      <h1>Entrar al panel</h1>
      <p class="muted" style="margin-top:0">Para el Ing. Abel Galarza.</p>
      <p class="note">Esta es una <strong>demostración</strong>. El inicio de sesión está simulado: puede entrar con cualquier nombre y cualquier contraseña. En la versión real sí se verificará su acceso.</p>
      <form id="login-form">
        <div class="field">
          <label for="login-nombre">Su nombre</label>
          <input id="login-nombre" name="nombre" autocomplete="name" value="${esc(remembered)}" required>
        </div>
        <div class="field">
          <label for="login-clave">Contraseña</label>
          <input id="login-clave" name="clave" type="password" autocomplete="current-password" placeholder="Cualquier texto, en la demo">
        </div>
        <button class="btn btn--block" type="submit">Entrar al panel</button>
      </form>
    </div>
  </div>`;
}

function viewInicio(session) {
  const name = firstName(session?.nombre || 'Ing. Abel Galarza');
  const upcoming = db.upcomingMaintenance(state, 15);
  const month = db.currentMonthKey();
  const trabajosMes = state.trabajos.filter((t) => db.monthKey(t.fecha) === month);
  const ingresos = trabajosMes.filter((t) => t.estado === 'cobrado').reduce((s, t) => s + Number(t.monto || 0), 0);
  const recientes = [...state.mantenimientos].sort((a, b) => b.fecha.localeCompare(a.fecha)).slice(0, 3);
  const upcomingHtml = upcoming.length
    ? `<div class="list">${upcoming.map((m) => upcomingCard(m)).join('')}</div>`
    : '<p class="empty">No hay mantenimientos en los próximos 15 días.</p>';

  return shell(`
    <p class="page-kicker">${greeting()}</p>
    <h1 class="page-title">${esc(name)}</h1>
    <div class="action-grid">
      <a class="action-btn" href="#/mantenimiento">${iconWrap(ICO.wrench)} Nuevo mantenimiento</a>
      <a class="action-btn action-btn--alt" href="#/trabajos/nuevo">${iconWrap(ICO.bag)} Nuevo trabajo</a>
      <a class="action-btn action-btn--amber" href="#/clientes/nuevo">${iconWrap(ICO.user)} Nuevo cliente</a>
    </div>
    <div class="section-label"><span>Próximos mantenimientos</span><a href="#/agenda">Ver agenda</a></div>
    ${upcomingHtml}
    <div class="section-label"><span>Este mes</span></div>
    <div class="stats">
      <div class="stat"><div class="num">${trabajosMes.length}</div><div class="lbl">Trabajos registrados</div></div>
      <div class="stat"><div class="num">${formatBs(ingresos)}</div><div class="lbl">Ingresos cobrados</div></div>
    </div>
    <div class="section-label"><span>Últimos mantenimientos</span></div>
    <div class="list">
      ${recientes.map((m) => {
        const c = db.getClient(state, m.clienteId);
        return `<a class="list-card" href="#/mantenimiento/${m.id}">
          <div class="list-card__top">
            <h3>${esc(c ? c.nombre : 'Cliente')}</h3>
            <span class="pill">${m.tipo === 'correctivo' ? 'Correctivo' : 'Preventivo'}</span>
          </div>
          <p>${esc(formatFecha(m.fecha))} · ${esc(m.ot)} · ${esc(m.equipo?.tipo || '')}</p>
        </a>`;
      }).join('')}
    </div>
  `, { tab: 'inicio' });
}

function upcomingCard(m) {
  const c = m.client;
  const cls = m.days < 0 ? 'card--danger' : 'card--warn';
  const eq = m.equipo || {};
  const phone = c?.telefono || '';
  const text = `Hola, le escribe SEID. Le recuerdo el mantenimiento de su aire programado para el ${formatFecha(m.proximoMantenimiento)}. (Mensaje de demostración)`;
  return `<article class="card ${cls}">
    <div class="list-card__top">
      <h3>${esc(c ? c.nombre : 'Cliente')}</h3>
      ${pillForDays(m.days)}
    </div>
    <p>${esc(eq.tipo || 'Equipo')} ${eq.capacidadBTU ? esc(eq.capacidadBTU) + ' BTU' : ''} · ${esc(eq.ubicacion || '')}</p>
    <p>${esc(c?.zona || m.ubicacion || '')}</p>
    <p class="small muted">Programado para el ${esc(formatFecha(m.proximoMantenimiento, true))}</p>
    ${phone ? `<a class="wa-mini" href="${waLink(phone, text)}" target="_blank" rel="noopener">${ICO.wa} WhatsApp al cliente</a>` : ''}
  </article>`;
}

function viewClientes(q = '') {
  const query = q.trim().toLowerCase();
  const list = state.clientes.filter((c) => {
    const blob = `${c.nombre} ${c.zona} ${c.direccion} ${c.telefono}`.toLowerCase();
    return !query || blob.includes(query);
  });
  return shell(`
    <h1 class="page-title">Clientes</h1>
    <div class="search">
      ${ICO.search}
      <label class="visually-hidden" for="q-clientes">Buscar cliente</label>
      <input id="q-clientes" type="search" placeholder="Buscar por nombre, zona o teléfono" value="${esc(q)}" data-act="search-clientes">
    </div>
    <a class="btn btn--block" href="#/clientes/nuevo" style="margin-bottom:1rem">${ICO.plus} Nuevo cliente</a>
    <div class="list">
      ${list.length ? list.map((c) => `
        <a class="list-card" href="#/clientes/${c.id}">
          <div class="list-card__top">
            <h3>${esc(c.nombre)}</h3>
            <span class="pill">${c.equipos.length} ${c.equipos.length === 1 ? 'equipo' : 'equipos'}</span>
          </div>
          <p>${esc(c.zona)}</p>
          <p class="small muted">${esc(formatPhone(c.telefono))}</p>
        </a>`).join('') : '<p class="empty">No se encontró ningún cliente.</p>'}
    </div>
  `, { tab: 'clientes' });
}

function viewClienteNuevo() {
  return shell(`
    <h1 class="page-title">Nuevo cliente</h1>
    <form id="form-cliente">
      <div class="field"><label for="c-nombre">Nombre</label><input id="c-nombre" name="nombre" required placeholder="Nombre y apellido"></div>
      <div class="field"><label for="c-tel">WhatsApp o teléfono</label><input id="c-tel" name="telefono" inputmode="tel" placeholder="5917…"></div>
      <div class="field"><label for="c-zona">Zona</label><input id="c-zona" name="zona" placeholder="Ej. Equipetrol, Santa Cruz"></div>
      <div class="field"><label for="c-dir">Dirección</label><input id="c-dir" name="direccion" placeholder="Calle, número o referencia"></div>
      <div class="field"><label for="c-notas">Notas (opcional)</label><textarea id="c-notas" name="notas"></textarea></div>
      <button class="btn btn--block" type="submit">Guardar cliente</button>
    </form>
  `, { title: 'Nuevo cliente', back: true, tab: 'clientes' });
}

function viewClienteDetalle(id) {
  const c = db.getClient(state, id);
  if (!c) return shell('<p class="empty">No se encontró ese cliente.</p>', { back: true, tab: 'clientes' });
  const hist = state.mantenimientos.filter((m) => m.clienteId === id).sort((a, b) => b.fecha.localeCompare(a.fecha));
  const jobs = state.trabajos.filter((t) => t.clienteId === id).sort((a, b) => b.fecha.localeCompare(a.fecha));
  const text = `Hola, le escribe SEID (Ing. Abel Galarza). (Mensaje de demostración)`;
  return shell(`
    <h1 class="page-title">${esc(c.nombre)}</h1>
    <div class="card">
      <dl class="kv">
        <dt>Teléfono</dt><dd>${esc(formatPhone(c.telefono))}</dd>
        <dt>Zona</dt><dd>${esc(c.zona || '—')}</dd>
        <dt>Dirección</dt><dd>${esc(c.direccion || '—')}</dd>
        ${c.notas ? `<dt>Notas</dt><dd>${esc(c.notas)}</dd>` : ''}
      </dl>
      ${c.telefono ? `<a class="wa-mini" href="${waLink(c.telefono, text)}" target="_blank" rel="noopener">${ICO.wa} WhatsApp</a>` : ''}
    </div>
    <div class="section-label"><span>Equipos</span></div>
    <div class="list">
      ${c.equipos.map((e) => `
        <div class="list-card">
          <div class="list-card__top">
            <h3>${esc(e.tipo)} · ${esc(e.ubicacion || 'Sin ubicación')}</h3>
            <span class="pill">${esc(e.capacidadBTU || '')} BTU</span>
          </div>
          <p>${esc(e.marca)} ${esc(e.modelo)}</p>
          <p class="small muted">Serie ${esc(e.serie || '—')} · ${esc(e.refrigerante || '')}</p>
        </div>`).join('') || '<p class="empty">Todavía no hay equipos registrados.</p>'}
    </div>
    <a class="btn btn--ghost btn--block" href="#/mantenimiento?cliente=${c.id}" style="margin-top:.7rem">${ICO.plus} Nuevo mantenimiento</a>
    <div class="section-label"><span>Historial de mantenimientos</span></div>
    <div class="list">
      ${hist.length ? hist.map((m) => `
        <a class="list-card" href="#/mantenimiento/${m.id}">
          <div class="list-card__top">
            <h3>${esc(formatFecha(m.fecha))}</h3>
            <span class="pill">${m.tipo === 'correctivo' ? 'Correctivo' : 'Preventivo'}</span>
          </div>
          <p>${esc(m.ot)} · ${esc(m.equipo?.tipo || '')} · Próximo: ${esc(formatFecha(m.proximoMantenimiento))}</p>
        </a>`).join('') : '<p class="empty">Aún no hay mantenimientos.</p>'}
    </div>
    <div class="section-label"><span>Otros trabajos</span></div>
    <div class="list">
      ${jobs.length ? jobs.map((t) => `
        <a class="list-card" href="#/trabajos/${t.id}">
          <div class="list-card__top">
            <h3>${esc(tipoTrabajoLabel(t.tipo))}</h3>
            <span class="pill pill--${t.estado}">${esc(estadoLabel(t.estado))}</span>
          </div>
          <p>${esc(formatFecha(t.fecha))} · ${esc(formatBs(t.monto))}</p>
        </a>`).join('') : '<p class="muted small">No hay otros trabajos registrados.</p>'}
    </div>
  `, { title: 'Cliente', back: true, tab: 'clientes' });
}

function emptyDraft(prefill = {}) {
  const clienteId = prefill.clienteId || '';
  const c = clienteId ? db.getClient(state, clienteId) : null;
  const d = {
    step: 1,
    fecha: db.todayISO(),
    tipo: 'preventivo',
    ot: db.nextOT(state),
    clienteId,
    ubicacion: c ? `${c.direccion}${c.zona ? ' — ' + c.zona : ''}` : '',
    tecnico: db.getSession()?.nombre || 'Ing. Abel Galarza',
    auxiliar: '',
    equipoId: c && c.equipos.length === 1 ? c.equipos[0].id : '',
    equipo: { tipo: '', marca: '', modelo: '', serie: '', capacidadBTU: '', refrigerante: '', ubicacion: '' },
    checklist: {},
    paramsAntes: { presionBaja: '', presionAlta: '', amperaje: '', voltaje: '' },
    paramsDespues: { presionBaja: '', presionAlta: '', amperaje: '', voltaje: '' },
    observaciones: '',
    diagnostico: [''],
    trabajosCorrectivos: {},
    repuestos: [{ nombre: '', cantidad: '' }],
    fotos: [],
    firmaCliente: '',
    firmaTecnico: ''
  };
  if (d.equipoId && c) applyEquipo(d, c.equipos.find((e) => e.id === d.equipoId));
  return d;
}

function applyEquipo(d, e) {
  if (!e) return;
  d.equipo = {
    tipo: e.tipo, marca: e.marca, modelo: e.modelo, serie: e.serie,
    capacidadBTU: e.capacidadBTU, refrigerante: e.refrigerante, ubicacion: e.ubicacion
  };
}

function viewMantenimientoNuevo() {
  if (!draft) draft = emptyDraft();
  const step = draft.step || 1;
  const total = 6;
  const titles = ['Datos generales', 'Equipo', 'Lista de verificación', 'Parámetros', 'Observaciones', 'Fotos y firmas'];
  return shell(`
    <div class="wizard-progress">
      <div class="step-meta">Paso ${step} de ${total}</div>
      <div class="dots" aria-hidden="true">${Array.from({ length: total }, (_, i) => `<i class="${i + 1 < step ? 'is-done' : i + 1 === step ? 'is-on' : ''}"></i>`).join('')}</div>
    </div>
    <h1 class="page-title">${titles[step - 1]}</h1>
    ${wizardStep(step)}
    <div class="wizard-nav">
      ${step > 1 ? '<button class="btn btn--ghost" type="button" data-wiz="prev">Atrás</button>' : '<a class="btn btn--ghost" href="#/inicio">Cancelar</a>'}
      ${step < total
        ? '<button class="btn" type="button" data-wiz="next">Siguiente</button>'
        : '<button class="btn btn--amber" type="button" data-wiz="save">Guardar</button>'}
    </div>
  `, { title: 'Mantenimiento', back: true, tab: 'inicio' });
}

function wizardStep(step) {
  if (step === 1) return stepGeneral();
  if (step === 2) return stepEquipo();
  if (step === 3) return stepChecklist();
  if (step === 4) return stepParams();
  if (step === 5) return stepObs();
  return stepFirmas();
}

function stepGeneral() {
  const options = state.clientes.map((c) => `<option value="${c.id}" ${draft.clienteId === c.id ? 'selected' : ''}>${esc(c.nombre)}</option>`).join('');
  return `<div class="field">
      <label for="m-fecha">Fecha</label>
      <input id="m-fecha" type="date" value="${esc(draft.fecha)}" data-f="fecha">
    </div>
    <p class="label" style="font-weight:650;margin:0 0 .4rem">Tipo de mantenimiento</p>
    <div class="choice-grid" style="margin-bottom:0.9rem">
      <button type="button" class="choice ${draft.tipo === 'preventivo' ? 'is-on' : ''}" data-tipo="preventivo">Preventivo</button>
      <button type="button" class="choice ${draft.tipo === 'correctivo' ? 'is-on' : ''}" data-tipo="correctivo">Correctivo</button>
    </div>
    <div class="field"><label for="m-ot">Orden de trabajo (OT)</label><input id="m-ot" value="${esc(draft.ot)}" data-f="ot"></div>
    <div class="field">
      <label for="m-cliente">Cliente</label>
      <select id="m-cliente" data-f="clienteId">
        <option value="">Elegir cliente…</option>
        ${options}
      </select>
      <p class="small muted" style="margin:.4rem 0 0"><a href="#/clientes/nuevo">+ Registrar un cliente nuevo</a></p>
    </div>
    <div class="field"><label for="m-ubi">Ubicación del trabajo</label><input id="m-ubi" value="${esc(draft.ubicacion)}" data-f="ubicacion" placeholder="Dirección o zona"></div>
    <div class="field"><label for="m-tec">Técnico</label><input id="m-tec" value="${esc(draft.tecnico)}" data-f="tecnico"></div>
    <div class="field"><label for="m-aux">Auxiliar (opcional)</label><input id="m-aux" value="${esc(draft.auxiliar)}" data-f="auxiliar"></div>`;
}

function stepEquipo() {
  const c = db.getClient(state, draft.clienteId);
  const picks = c && c.equipos.length
    ? `<p class="label" style="font-weight:650;margin:0 0 .4rem">Equipos de este cliente</p>
       <div class="equip-pick">
         ${c.equipos.map((e) => `<button type="button" class="${draft.equipoId === e.id ? 'is-on' : ''}" data-equipo="${e.id}">
           ${esc(e.tipo)} · ${esc(e.ubicacion || 'Sin ubicación')}<br>
           <span class="small muted">${esc(e.marca)} ${esc(e.modelo)} · ${esc(e.capacidadBTU)} BTU</span>
         </button>`).join('')}
         <button type="button" class="${!draft.equipoId ? 'is-on' : ''}" data-equipo="">Otro equipo / escribir datos</button>
       </div>`
    : '<p class="note">Si elige un cliente con equipos, podrá cargarlos aquí de un toque. También puede escribir los datos a mano.</p>';
  const eq = draft.equipo;
  return `${picks}
    <p class="label" style="font-weight:650;margin:.2rem 0 .4rem">Tipo de equipo</p>
    <div class="chip-row">
      ${db.TIPOS_EQUIPO.map((t) => `<button type="button" class="chip ${eq.tipo === t ? 'is-on' : ''}" data-eqtipo="${esc(t)}">${esc(t)}</button>`).join('')}
    </div>
    <div class="field-row">
      <div class="field"><label for="eq-marca">Marca</label><input id="eq-marca" value="${esc(eq.marca)}" data-eq="marca"></div>
      <div class="field"><label for="eq-modelo">Modelo</label><input id="eq-modelo" value="${esc(eq.modelo)}" data-eq="modelo"></div>
    </div>
    <div class="field"><label for="eq-serie">Número de serie</label><input id="eq-serie" value="${esc(eq.serie)}" data-eq="serie"></div>
    <div class="field-row">
      <div class="field"><label for="eq-btu">Capacidad (BTU)</label><input id="eq-btu" value="${esc(eq.capacidadBTU)}" data-eq="capacidadBTU" placeholder="18.000"></div>
      <div class="field"><label for="eq-ref">Refrigerante</label><input id="eq-ref" value="${esc(eq.refrigerante)}" data-eq="refrigerante" placeholder="R-410A"></div>
    </div>
    <div class="field"><label for="eq-ubi">Ubicación del equipo</label><input id="eq-ubi" value="${esc(eq.ubicacion)}" data-eq="ubicacion" placeholder="Sala, oficina, dormitorio…"></div>`;
}

function stepChecklist() {
  return `<p class="muted" style="margin-top:-.4rem">Marque lo que ya realizó. Toque la fila para sí o no.</p>
    ${db.CHECKLIST.map((item) => {
      const on = !!draft.checklist[item.key];
      return `<button type="button" class="toggle-row ${on ? 'is-on' : ''}" data-check="${item.key}" aria-pressed="${on}">
        <span>${esc(item.label)}</span><span class="switch" aria-hidden="true"></span>
      </button>`;
    }).join('')}
    <button class="btn btn--ghost btn--block" type="button" data-act="check-all" style="margin-top:.6rem">Marcar todo como hecho</button>`;
}

function stepParams() {
  const row = (key, label, unit) => `
    <div class="field">
      <span class="label">${label} (${unit})</span>
      <div class="field-row">
        <div class="field" style="margin:0">
          <label class="visually-hidden" for="a-${key}">${label} antes</label>
          <input id="a-${key}" value="${esc(draft.paramsAntes[key] || '')}" data-pa="${key}" placeholder="Antes">
        </div>
        <div class="field" style="margin:0">
          <label class="visually-hidden" for="d-${key}">${label} después</label>
          <input id="d-${key}" value="${esc(draft.paramsDespues[key] || '')}" data-pd="${key}" placeholder="Después">
        </div>
      </div>
    </div>`;
  return `<p class="muted" style="margin-top:-.4rem">Izquierda: <strong>antes</strong>. Derecha: <strong>después</strong>.</p>
    ${row('presionBaja', 'Presión baja', 'PSI')}
    ${row('presionAlta', 'Presión alta', 'PSI')}
    ${row('amperaje', 'Amperaje del compresor', 'A')}
    ${row('voltaje', 'Voltaje', 'V')}`;
}

function stepObs() {
  return `<div class="field">
      <label for="m-obs">Observaciones</label>
      <textarea id="m-obs" data-f="observaciones" placeholder="Lo que observó en la visita">${esc(draft.observaciones)}</textarea>
    </div>
    <p class="label" style="font-weight:650;margin:0 0 .4rem">Diagnóstico y recomendaciones para la próxima visita</p>
    ${(draft.diagnostico.length ? draft.diagnostico : ['']).map((t, i) => `
      <div class="field"><label class="visually-hidden" for="diag-${i}">Recomendación ${i + 1}</label>
      <input id="diag-${i}" value="${esc(t)}" data-diag="${i}" placeholder="Ej. Revisar drenaje"></div>`).join('')}
    <button class="btn btn--ghost btn--sm" type="button" data-act="add-diag" style="margin-bottom:1rem">${ICO.plus} Agregar otra</button>
    <p class="label" style="font-weight:650;margin:0 0 .4rem">Trabajos correctivos</p>
    ${db.CORRECTIVOS.map((item) => {
      const on = !!draft.trabajosCorrectivos[item.key];
      return `<button type="button" class="toggle-row ${on ? 'is-on' : ''}" data-corr="${item.key}" aria-pressed="${on}">
        <span>${esc(item.label)}</span><span class="switch" aria-hidden="true"></span>
      </button>`;
    }).join('')}
    <p class="label" style="font-weight:650;margin:1rem 0 .4rem">Repuestos utilizados</p>
    ${draft.repuestos.map((r, i) => `
      <div class="field-row">
        <div class="field"><label class="visually-hidden" for="rep-n-${i}">Repuesto</label>
          <input id="rep-n-${i}" value="${esc(r.nombre)}" data-rep="nombre" data-repi="${i}" placeholder="Repuesto"></div>
        <div class="field"><label class="visually-hidden" for="rep-c-${i}">Cantidad</label>
          <input id="rep-c-${i}" value="${esc(r.cantidad)}" data-rep="cantidad" data-repi="${i}" placeholder="Cant."></div>
      </div>`).join('')}
    <button class="btn btn--ghost btn--sm" type="button" data-act="add-rep">${ICO.plus} Agregar repuesto</button>`;
}

function stepFirmas() {
  const thumbs = draft.fotos.length
    ? `<div class="thumbs">${draft.fotos.map((src, i) => `<img src="${src}" alt="Foto ${i + 1}">`).join('')}</div>`
    : '';
  return `<div class="field">
      <label for="m-fotos">Fotos (opcional, hasta 3)</label>
      <input id="m-fotos" type="file" accept="image/*" capture="environment" multiple>
      ${thumbs}
    </div>
    <div class="field">
      <span class="label">Firma del cliente</span>
      <div class="sig-box">
        <canvas id="sig-cliente" width="640" height="280"></canvas>
        <div class="sig-actions"><span>Firme con el dedo</span><button type="button" class="btn btn--ghost btn--sm" data-sigclear="cliente">Borrar</button></div>
      </div>
    </div>
    <div class="field">
      <span class="label">Firma del técnico</span>
      <div class="sig-box">
        <canvas id="sig-tecnico" width="640" height="280"></canvas>
        <div class="sig-actions"><span>Firme con el dedo</span><button type="button" class="btn btn--ghost btn--sm" data-sigclear="tecnico">Borrar</button></div>
      </div>
    </div>
    <p class="note">Al guardar se programará automáticamente el próximo mantenimiento a los <strong>6 meses</strong>.</p>`;
}

function collectWizardFields(root) {
  root.querySelectorAll('[data-f]').forEach((n) => { draft[n.getAttribute('data-f')] = n.value; });
  root.querySelectorAll('[data-eq]').forEach((n) => { draft.equipo[n.getAttribute('data-eq')] = n.value; });
  root.querySelectorAll('[data-pa]').forEach((n) => { draft.paramsAntes[n.getAttribute('data-pa')] = n.value; });
  root.querySelectorAll('[data-pd]').forEach((n) => { draft.paramsDespues[n.getAttribute('data-pd')] = n.value; });
  root.querySelectorAll('[data-diag]').forEach((n) => { draft.diagnostico[Number(n.getAttribute('data-diag'))] = n.value; });
  root.querySelectorAll('[data-rep]').forEach((n) => {
    const i = Number(n.getAttribute('data-repi'));
    if (!draft.repuestos[i]) draft.repuestos[i] = { nombre: '', cantidad: '' };
    draft.repuestos[i][n.getAttribute('data-rep')] = n.value;
  });
  captureSignatures(root);
}

function captureSignatures(root) {
  const c1 = root.querySelector('#sig-cliente');
  const c2 = root.querySelector('#sig-tecnico');
  if (c1 && c1.dataset.dirty === '1') draft.firmaCliente = c1.toDataURL('image/png');
  if (c2 && c2.dataset.dirty === '1') draft.firmaTecnico = c2.toDataURL('image/png');
}

function saveMantenimiento() {
  const proximo = db.addMonthsISO(draft.fecha, 6);
  const rec = {
    id: db.uid('m'),
    fecha: draft.fecha,
    tipo: draft.tipo,
    ot: draft.ot,
    clienteId: draft.clienteId,
    ubicacion: draft.ubicacion,
    tecnico: draft.tecnico,
    auxiliar: draft.auxiliar,
    equipoId: draft.equipoId,
    equipo: { ...draft.equipo },
    checklist: { ...draft.checklist },
    paramsAntes: { ...draft.paramsAntes },
    paramsDespues: { ...draft.paramsDespues },
    observaciones: draft.observaciones,
    diagnostico: (draft.diagnostico || []).map((s) => s.trim()).filter(Boolean),
    trabajosCorrectivos: { ...draft.trabajosCorrectivos },
    repuestos: (draft.repuestos || []).filter((r) => r.nombre && r.nombre.trim()),
    fotos: draft.fotos.slice(0, 3),
    firmaCliente: draft.firmaCliente,
    firmaTecnico: draft.firmaTecnico,
    proximoMantenimiento: proximo
  };
  state.mantenimientos.push(rec);
  persist();
  draft = null;
  go('#/mantenimiento/' + rec.id + '?ok=1');
}

function viewMantenimientoDetalle(id, q = {}) {
  const m = state.mantenimientos.find((x) => x.id === id);
  if (!m) return shell('<p class="empty">No se encontró ese mantenimiento.</p>', { back: true, tab: 'inicio' });
  const c = db.getClient(state, m.clienteId);
  const days = db.daysUntil(m.proximoMantenimiento);
  const ok = q.ok === '1';
  const eq = m.equipo || {};
  const hechas = db.CHECKLIST.filter((i) => m.checklist && m.checklist[i.key]).length;
  return shell(`
    ${ok ? `<div class="success-hero">
      <div class="check">${ICO.check}</div>
      <h1 class="page-title">Mantenimiento guardado</h1>
      <p class="muted">Ya quedó registrado en este dispositivo (demostración).</p>
    </div>` : `<h1 class="page-title">${esc(m.ot)}</h1>`}
    <div class="card card--ok" style="margin-bottom:1rem">
      <p style="margin:0;font-weight:750">Próximo mantenimiento</p>
      <p style="margin:.25rem 0 0;font-size:1.15rem">${esc(formatFecha(m.proximoMantenimiento, true))}</p>
      <p class="small muted" style="margin:.25rem 0 0">${esc(daysLabel(days))} · se programó automáticamente a los 6 meses</p>
    </div>
    <div class="card">
      <dl class="kv">
        <dt>Fecha</dt><dd>${esc(formatFecha(m.fecha))}</dd>
        <dt>Tipo</dt><dd>${m.tipo === 'correctivo' ? 'Correctivo' : 'Preventivo'}</dd>
        <dt>Cliente</dt><dd>${esc(c ? c.nombre : '—')}</dd>
        <dt>Ubicación</dt><dd>${esc(m.ubicacion || '—')}</dd>
        <dt>Técnico</dt><dd>${esc(m.tecnico || '—')}</dd>
        <dt>Equipo</dt><dd>${esc(eq.tipo || '')} ${esc(eq.marca || '')} ${esc(eq.capacidadBTU || '')} ${eq.capacidadBTU ? 'BTU' : ''}</dd>
        <dt>Verificación</dt><dd>${hechas} de ${db.CHECKLIST.length} puntos</dd>
      </dl>
    </div>
    <div class="btn-row btn-row--stack" style="margin-top:1rem">
      <button class="btn" type="button" data-pdf="${m.id}">${ICO.pdf} Generar PDF</button>
      <button class="btn btn--wa" type="button" data-share="${m.id}">${ICO.wa} Compartir por WhatsApp</button>
    </div>
    <p class="small muted" style="margin-top:.7rem">Si el teléfono lo permite, al compartir se adjuntará el PDF. Si no, se descarga el archivo y se abre WhatsApp con un resumen escrito.</p>
  `, { title: ok ? 'Listo' : 'Mantenimiento', back: true, tab: 'inicio' });
}

function viewTrabajos(filtro = 'todos') {
  const list = state.trabajos
    .filter((t) => filtro === 'todos' || t.estado === filtro)
    .sort((a, b) => b.fecha.localeCompare(a.fecha));
  const chips = ['todos', ...db.ESTADOS_TRABAJO.map((e) => e.key)];
  return shell(`
    <h1 class="page-title">Trabajos y ventas</h1>
    <div class="chip-row">
      ${chips.map((k) => `<button type="button" class="chip ${filtro === k ? 'is-on' : ''}" data-filtro="${k}">${k === 'todos' ? 'Todos' : esc(estadoLabel(k))}</button>`).join('')}
    </div>
    <a class="btn btn--block" href="#/trabajos/nuevo" style="margin-bottom:1rem">${ICO.plus} Nuevo trabajo</a>
    <div class="list">
      ${list.length ? list.map((t) => {
        const c = db.getClient(state, t.clienteId);
        return `<a class="list-card" href="#/trabajos/${t.id}">
          <div class="list-card__top">
            <h3>${esc(tipoTrabajoLabel(t.tipo))}</h3>
            <span class="pill pill--${t.estado}">${esc(estadoLabel(t.estado))}</span>
          </div>
          <p>${esc(c ? c.nombre : 'Sin cliente')} · ${esc(formatFecha(t.fecha))}</p>
          <p style="font-weight:750;margin-top:.25rem">${esc(formatBs(t.monto))}</p>
        </a>`;
      }).join('') : '<p class="empty">No hay trabajos con ese filtro.</p>'}
    </div>
  `, { tab: 'trabajos' });
}

function viewTrabajoNuevo() {
  const options = state.clientes.map((c) => `<option value="${c.id}">${esc(c.nombre)}</option>`).join('');
  return shell(`
    <h1 class="page-title">Nuevo trabajo</h1>
    <form id="form-trabajo">
      <div class="field">
        <label for="t-tipo">Tipo</label>
        <select id="t-tipo" name="tipo" required>
          ${db.TIPOS_TRABAJO.map((t) => `<option value="${t.key}">${esc(t.label)}</option>`).join('')}
        </select>
      </div>
      <div class="field">
        <label for="t-cliente">Cliente</label>
        <select id="t-cliente" name="clienteId">
          <option value="">Elegir cliente…</option>
          ${options}
        </select>
      </div>
      <div class="field-row">
        <div class="field"><label for="t-fecha">Fecha</label><input id="t-fecha" name="fecha" type="date" value="${db.todayISO()}" required></div>
        <div class="field"><label for="t-monto">Monto (Bs)</label><input id="t-monto" name="monto" inputmode="decimal" placeholder="0" required></div>
      </div>
      <p class="label" style="font-weight:650;margin:0 0 .4rem">Estado</p>
      <div class="chip-row" id="t-estado-row">
        ${db.ESTADOS_TRABAJO.map((e, i) => `<button type="button" class="chip ${i === 0 ? 'is-on' : ''}" data-estado="${e.key}">${esc(e.label)}</button>`).join('')}
      </div>
      <input type="hidden" name="estado" id="t-estado" value="pendiente">
      <div class="field"><label for="t-desc">Descripción</label><textarea id="t-desc" name="descripcion" placeholder="Qué se hizo o se va a hacer"></textarea></div>
      <button class="btn btn--block" type="submit">Guardar trabajo</button>
    </form>
  `, { title: 'Nuevo trabajo', back: true, tab: 'trabajos' });
}

function viewTrabajoDetalle(id) {
  const t = state.trabajos.find((x) => x.id === id);
  if (!t) return shell('<p class="empty">No se encontró ese trabajo.</p>', { back: true, tab: 'trabajos' });
  const c = db.getClient(state, t.clienteId);
  return shell(`
    <h1 class="page-title">${esc(tipoTrabajoLabel(t.tipo))}</h1>
    <div class="card">
      <div class="list-card__top" style="margin-bottom:.6rem">
        <strong>${esc(formatBs(t.monto))}</strong>
        <span class="pill pill--${t.estado}">${esc(estadoLabel(t.estado))}</span>
      </div>
      <dl class="kv">
        <dt>Fecha</dt><dd>${esc(formatFecha(t.fecha))}</dd>
        <dt>Cliente</dt><dd>${esc(c ? c.nombre : '—')}</dd>
        <dt>Zona</dt><dd>${esc(c ? c.zona : '—')}</dd>
        <dt>Detalle</dt><dd>${esc(t.descripcion || '—')}</dd>
      </dl>
    </div>
    <p class="label" style="font-weight:650;margin:1rem 0 .4rem">Cambiar estado</p>
    <div class="chip-row">
      ${db.ESTADOS_TRABAJO.map((e) => `<button type="button" class="chip ${t.estado === e.key ? 'is-on' : ''}" data-setestado="${e.key}" data-tid="${t.id}">${esc(e.label)}</button>`).join('')}
    </div>
  `, { title: 'Trabajo', back: true, tab: 'trabajos' });
}

function isoFrom(year, month, day) {
  const dt = new Date(year, month, day);
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, '0');
  const d = String(dt.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function agendaItem(m) {
  const c = db.getClient(state, m.clienteId);
  const days = db.daysUntil(m.proximoMantenimiento);
  return `<a class="list-card" href="#/mantenimiento/${m.id}">
    <div class="list-card__top">
      <h3>${esc(c ? c.nombre : 'Cliente')}</h3>
      ${pillForDays(days)}
    </div>
    <p>${esc(formatFecha(m.proximoMantenimiento))} · ${esc(m.equipo?.tipo || '')} · ${esc(m.equipo?.ubicacion || '')}</p>
  </a>`;
}

function viewAgenda() {
  const year = calCursor.getFullYear();
  const month = calCursor.getMonth();
  const first = new Date(year, month, 1);
  const startIndex = (first.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const prevDays = new Date(year, month, 0).getDate();
  const cells = [];
  for (let i = 0; i < startIndex; i++) {
    cells.push({ day: prevDays - startIndex + 1 + i, muted: true, iso: isoFrom(year, month - 1, prevDays - startIndex + 1 + i) });
  }
  for (let d = 1; d <= daysInMonth; d++) cells.push({ day: d, muted: false, iso: isoFrom(year, month, d) });
  while (cells.length % 7) {
    const d = cells.length - (startIndex + daysInMonth) + 1;
    cells.push({ day: d, muted: true, iso: isoFrom(year, month + 1, d) });
  }
  const byDay = {};
  for (const m of state.mantenimientos) {
    const iso = m.proximoMantenimiento;
    if (!iso) continue;
    (byDay[iso] ||= []).push(m);
  }
  const MESES_CAL = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
  const monthName = MESES_CAL[month][0].toUpperCase() + MESES_CAL[month].slice(1) + ' de ' + year;
  const selectedList = byDay[calSelected] || [];
  const monthPrefix = `${year}-${String(month + 1).padStart(2, '0')}`;
  const monthList = state.mantenimientos
    .filter((m) => m.proximoMantenimiento && m.proximoMantenimiento.startsWith(monthPrefix))
    .sort((a, b) => a.proximoMantenimiento.localeCompare(b.proximoMantenimiento));

  return shell(`
    <h1 class="page-title">Agenda</h1>
    <div class="info-callout">En la versión real, usted recibirá un aviso en el teléfono y un mensaje de WhatsApp <strong>15 días antes</strong> de cada mantenimiento programado. En esta demostración puede verlos aquí en el calendario.</div>
    <div class="cal-nav">
      <button class="icon-btn icon-btn--ink" type="button" data-cal="prev" aria-label="Mes anterior">${ICO.chevronL}</button>
      <h2>${esc(monthName)}</h2>
      <button class="icon-btn icon-btn--ink" type="button" data-cal="next" aria-label="Mes siguiente">${ICO.chevronR}</button>
    </div>
    <div class="cal-grid" aria-label="Calendario">
      ${['L','M','M','J','V','S','D'].map((d) => `<div class="dow">${d}</div>`).join('')}
      ${cells.map((c) => {
        const items = byDay[c.iso] || [];
        const dots = items.slice(0, 3).map((m) => {
          const days = db.daysUntil(m.proximoMantenimiento);
          const cls = days < 0 ? 'overdue' : days <= 15 ? 'soon' : '';
          return `<i class="${cls}"></i>`;
        }).join('');
        const cls = [
          c.muted ? 'is-muted' : '',
          c.iso === db.todayISO() ? 'is-today' : '',
          c.iso === calSelected ? 'is-selected' : ''
        ].filter(Boolean).join(' ');
        return `<button type="button" class="cal-day ${cls}" data-day="${c.iso}" aria-label="${c.iso}">
          <span>${c.day}</span>
          <span class="cal-dots">${dots}</span>
        </button>`;
      }).join('')}
    </div>
    <div class="section-label"><span>${calSelected === db.todayISO() ? 'Hoy' : formatFecha(calSelected, true)}</span></div>
    <div class="list">
      ${selectedList.length ? selectedList.map((m) => agendaItem(m)).join('') : `<p class="muted small">No hay mantenimientos este día. ${monthList.length ? 'Abajo está el resto del mes.' : ''}</p>`}
    </div>
    <div class="section-label"><span>Este mes</span></div>
    <div class="list">
      ${monthList.length ? monthList.map((m) => agendaItem(m)).join('') : '<p class="empty">No hay mantenimientos programados este mes.</p>'}
    </div>
  `, { tab: 'agenda' });
}

function emptyQuote() {
  return { clienteId: '', items: [], margen: 20, clienteNombre: '' };
}

function quoteMath(q) {
  const subtotal = q.items.reduce((s, it) => s + Number(it.precio || 0), 0);
  const margenMonto = Math.round(subtotal * (Number(q.margen) || 0) / 100);
  const total = subtotal + margenMonto;
  return { subtotal, margenMonto, total };
}

function viewCotizar() {
  if (!quoteDraft) quoteDraft = emptyQuote();
  const q = quoteDraft;
  const math = quoteMath(q);
  const groups = [
    ['equipo', 'Equipos (lista de proveedor, ejemplo)'],
    ['instalacion', 'Instalación'],
    ['extra', 'Extras']
  ];
  return shell(`
    <h1 class="page-title">Cotización de aires</h1>
    <p class="note">Vista previa de la fase 3. Los precios son <strong>ficticios</strong>, para mostrar cómo se armaría una cotización con la lista del proveedor y un margen.</p>
    <div class="field">
      <label for="q-cliente">Cliente (opcional)</label>
      <select id="q-cliente">
        <option value="">Sin cliente / escribir después</option>
        ${state.clientes.map((c) => `<option value="${c.id}" ${q.clienteId === c.id ? 'selected' : ''}>${esc(c.nombre)}</option>`).join('')}
      </select>
    </div>
    ${groups.map(([tipo, label]) => `
      <div class="section-label"><span>${label}</span></div>
      ${db.CATALOGO.filter((i) => i.tipo === tipo).map((item) => {
        const on = q.items.some((x) => x.id === item.id);
        return `<button type="button" class="toggle-row ${on ? 'is-on' : ''}" data-cat="${item.id}" aria-pressed="${on}">
          <span>${esc(item.nombre)}<br><span class="small muted">${esc(item.detalle || '')}</span></span>
          <strong style="white-space:nowrap">${formatBs(item.precio)}</strong>
        </button>`;
      }).join('')}
    `).join('')}
    <div class="field" style="margin-top:1rem">
      <label for="q-margen">Margen de ganancia: <strong>${q.margen} %</strong></label>
      <input id="q-margen" type="range" min="0" max="50" step="1" value="${q.margen}">
    </div>
    <div class="quote-total">
      <div class="num">${formatBs(math.total)}</div>
      <p>Subtotal ${formatBs(math.subtotal)} · Margen ${formatBs(math.margenMonto)}</p>
    </div>
    <div class="btn-row">
      <button class="btn" type="button" data-act="quote-pdf" ${q.items.length ? '' : 'disabled'}>${ICO.pdf} Generar PDF</button>
      <button class="btn btn--wa" type="button" data-act="quote-wa" ${q.items.length ? '' : 'disabled'}>${ICO.wa} Enviar por WhatsApp</button>
    </div>
  `, { tab: 'cotizar' });
}

function buildQuoteRecord() {
  const q = quoteDraft;
  const math = quoteMath(q);
  const n = (state.cotizaciones?.length || 0) + 1;
  const client = db.getClient(state, q.clienteId);
  return {
    id: db.uid('q'),
    numero: 'COT-2026-' + String(n).padStart(3, '0'),
    fecha: db.todayISO(),
    clienteId: q.clienteId,
    clienteNombre: client ? client.nombre : q.clienteNombre,
    items: q.items.map((i) => ({ ...i })),
    margen: Number(q.margen) || 0,
    ...math
  };
}

function viewMenuSheet() {
  return `<div class="menu-sheet" data-act="close-sheet" role="dialog" aria-label="Opciones">
    <div class="menu-sheet__panel" data-stop="1">
      <h2>Opciones</h2>
      ${badge()}
      <button type="button" class="menu-item" data-act="reset">${ICO.wrench} Restablecer demo</button>
      <button type="button" class="menu-item" data-act="logout">${ICO.user} Cerrar sesión</button>
      <button type="button" class="menu-item" data-act="close-sheet">Cerrar</button>
      <p class="small muted" style="margin:.8rem 0 0">Al restablecer se vuelven a cargar los datos de ejemplo y se pierden los cambios de esta demostración.</p>
    </div>
  </div>`;
}

function bindSignature(canvas, existing) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const ratio = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = Math.max(320, Math.floor(rect.width * ratio));
  canvas.height = Math.max(140, Math.floor(rect.height * ratio));
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  ctx.lineWidth = 2.4;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = '#12202e';
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, rect.width, rect.height);
  if (existing) {
    const img = new Image();
    img.onload = () => ctx.drawImage(img, 0, 0, rect.width, rect.height);
    img.src = existing;
    canvas.dataset.dirty = '1';
  }
  let drawing = false;
  const pos = (ev) => {
    const r = canvas.getBoundingClientRect();
    const t = ev.touches ? ev.touches[0] : ev;
    return { x: t.clientX - r.left, y: t.clientY - r.top };
  };
  const start = (ev) => {
    ev.preventDefault();
    drawing = true;
    const p = pos(ev);
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    canvas.dataset.dirty = '1';
  };
  const move = (ev) => {
    if (!drawing) return;
    ev.preventDefault();
    const p = pos(ev);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
  };
  const end = () => { drawing = false; };
  canvas.addEventListener('mousedown', start);
  canvas.addEventListener('mousemove', move);
  window.addEventListener('mouseup', end);
  canvas.addEventListener('touchstart', start, { passive: false });
  canvas.addEventListener('touchmove', move, { passive: false });
  canvas.addEventListener('touchend', end);
}

async function compressImage(file) {
  const img = await new Promise((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = reject;
    i.src = URL.createObjectURL(file);
  });
  const max = 1280;
  let w = img.width;
  let h = img.height;
  if (Math.max(w, h) > max) {
    const s = max / Math.max(w, h);
    w = Math.round(w * s);
    h = Math.round(h * s);
  }
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  c.getContext('2d').drawImage(img, 0, 0, w, h);
  URL.revokeObjectURL(img.src);
  return c.toDataURL('image/jpeg', 0.72);
}

async function withPdfReady() {
  if (window.jspdf && window.jspdf.jsPDF) return;
  await new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/jspdf@2.5.2/dist/jspdf.umd.min.js';
    s.onload = resolve;
    s.onerror = () => reject(new Error('No se pudo cargar jsPDF'));
    document.head.appendChild(s);
  });
}

async function handlePdf(id, share = false) {
  const m = state.mantenimientos.find((x) => x.id === id);
  if (!m) return;
  const client = db.getClient(state, m.clienteId);
  try {
    await withPdfReady();
    const { blob, filename } = await generateMaintenancePdf(m, client);
    if (share) {
      const result = await sharePdfOrWhatsApp({
        blob,
        filename,
        title: 'SEID ' + m.ot,
        text: mantenimientoWhatsAppText(m, client),
        phone: client?.telefono
      });
      if (result === 'whatsapp') toast('Se descargó el PDF y se abrió WhatsApp con el resumen.');
    } else {
      downloadBlob(blob, filename);
      toast('PDF descargado.');
    }
  } catch (err) {
    console.error(err);
    toast('No se pudo generar el PDF. Revise la conexión e intente de nuevo.');
  }
}

async function handleQuote(share = false) {
  if (!quoteDraft || !quoteDraft.items.length) return;
  const rec = buildQuoteRecord();
  const client = db.getClient(state, rec.clienteId);
  try {
    await withPdfReady();
    const { blob, filename } = await generateQuotePdf(rec, client);
    state.cotizaciones = state.cotizaciones || [];
    state.cotizaciones.push(rec);
    persist();
    if (share) {
      const result = await sharePdfOrWhatsApp({
        blob,
        filename,
        title: rec.numero,
        text: quoteWhatsAppText(rec, client),
        phone: client?.telefono
      });
      if (result === 'whatsapp') toast('Se descargó el PDF y se abrió WhatsApp con el resumen.');
    } else {
      downloadBlob(blob, filename);
      toast('Cotización en PDF descargada.');
    }
  } catch (err) {
    console.error(err);
    toast('No se pudo generar el PDF.');
  }
}

function render() {
  const root = document.getElementById('app');
  const route = parseRoute();
  const session = sessionOrLogin(route);
  if (!session && route.name !== 'login') return;

  menuOpen = false;
  let html = '';
  if (route.name === 'login') html = viewLogin();
  else if (route.name === 'inicio' || route.parts.length === 0) html = viewInicio(session);
  else if (route.name === 'clientes' && route.id === 'nuevo') html = viewClienteNuevo();
  else if (route.name === 'clientes' && route.id) html = viewClienteDetalle(route.id);
  else if (route.name === 'clientes') html = viewClientes(clienteQuery);
  else if (route.name === 'mantenimiento' && route.id) html = viewMantenimientoDetalle(route.id, route.q);
  else if (route.name === 'mantenimiento') {
    if (!draft) draft = emptyDraft({ clienteId: route.q.cliente });
    else if (route.q.cliente && draft.clienteId !== route.q.cliente) draft = emptyDraft({ clienteId: route.q.cliente });
    html = viewMantenimientoNuevo();
  } else if (route.name === 'trabajos' && route.id === 'nuevo') html = viewTrabajoNuevo();
  else if (route.name === 'trabajos' && route.id) html = viewTrabajoDetalle(route.id);
  else if (route.name === 'trabajos') html = viewTrabajos(trabajoFiltro);
  else if (route.name === 'agenda' || route.name === 'recordatorios') html = viewAgenda();
  else if (route.name === 'cotizar' || route.name === 'cotizaciones') html = viewCotizar();
  else html = viewInicio(session);

  root.innerHTML = html;
  bindAfterRender(route);
}

function bindAfterRender(route) {
  const root = document.getElementById('app');

  root.querySelector('#login-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const nombre = String(fd.get('nombre') || 'Ing. Abel Galarza').trim();
    db.setSession({ nombre, at: Date.now(), demo: true });
    go('#/inicio');
  });

  root.querySelector('#form-cliente')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const rec = {
      id: db.uid('c'),
      nombre: String(fd.get('nombre') || '').trim(),
      telefono: String(fd.get('telefono') || '').replace(/\D/g, ''),
      direccion: String(fd.get('direccion') || '').trim(),
      zona: String(fd.get('zona') || '').trim(),
      notas: String(fd.get('notas') || '').trim(),
      equipos: []
    };
    if (!rec.nombre) return toast('Escriba el nombre del cliente.');
    state.clientes.unshift(rec);
    persist();
    toast('Cliente guardado.');
    go('#/clientes/' + rec.id);
  });

  root.querySelector('#form-trabajo')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const rec = {
      id: db.uid('t'),
      tipo: String(fd.get('tipo')),
      clienteId: String(fd.get('clienteId') || ''),
      fecha: String(fd.get('fecha')),
      monto: Number(String(fd.get('monto') || '0').replace(',', '.')) || 0,
      estado: String(fd.get('estado') || 'pendiente'),
      descripcion: String(fd.get('descripcion') || '').trim()
    };
    state.trabajos.unshift(rec);
    persist();
    toast('Trabajo guardado.');
    go('#/trabajos/' + rec.id);
  });

  const search = root.querySelector('#q-clientes');
  if (search) {
    search.addEventListener('input', (e) => {
      clienteQuery = e.target.value;
      const keep = search.selectionStart;
      render();
      const again = document.getElementById('q-clientes');
      if (again) {
        again.focus();
        try { again.setSelectionRange(keep, keep); } catch { /* ignore */ }
      }
    });
  }

  if (route.name === 'mantenimiento' && !route.id) {
    bindSignature(root.querySelector('#sig-cliente'), draft.firmaCliente);
    bindSignature(root.querySelector('#sig-tecnico'), draft.firmaTecnico);
    root.querySelector('#m-fotos')?.addEventListener('change', async (e) => {
      const files = [...(e.target.files || [])].slice(0, 3 - draft.fotos.length);
      for (const f of files) {
        try { draft.fotos.push(await compressImage(f)); }
        catch { toast('No se pudo leer una foto.'); }
      }
      render();
    });
  }
}

function onInput(e) {
  const margen = e.target.closest('#q-margen');
  if (margen && quoteDraft) {
    quoteDraft.margen = Number(margen.value);
    const label = document.querySelector('label[for="q-margen"]');
    if (label) label.innerHTML = 'Margen de ganancia: <strong>' + quoteDraft.margen + ' %</strong>';
    const math = quoteMath(quoteDraft);
    const box = document.querySelector('.quote-total');
    if (box) {
      box.innerHTML = '<div class="num">' + formatBs(math.total) + '</div><p>Subtotal ' + formatBs(math.subtotal) + ' · Margen ' + formatBs(math.margenMonto) + '</p>';
    }
  }
}

function onChange(e) {
  const t = e.target;
  if (t.id === 'q-cliente' && quoteDraft) quoteDraft.clienteId = t.value;
  if (t.matches && t.matches('[data-f="clienteId"]') && draft) {
    draft.clienteId = t.value;
    const c = db.getClient(state, t.value);
    if (c) {
      draft.ubicacion = c.direccion + (c.zona ? ' — ' + c.zona : '');
      const ubi = document.getElementById('m-ubi');
      if (ubi) ubi.value = draft.ubicacion;
      if (c.equipos.length === 1) {
        draft.equipoId = c.equipos[0].id;
        applyEquipo(draft, c.equipos[0]);
      } else {
        draft.equipoId = '';
      }
    }
  }
}

function onClick(e) {
  const back = e.target.closest('[data-act="back"]');
  if (back) {
    e.preventDefault();
    if (history.length > 1) history.back();
    else go('#/inicio');
    return;
  }
  if (e.target.closest('[data-act="menu"]')) {
    e.preventDefault();
    if (!document.querySelector('.menu-sheet')) {
      document.getElementById('app').insertAdjacentHTML('beforeend', viewMenuSheet());
    }
    return;
  }
  const closeSheet = e.target.closest('[data-act="close-sheet"]');
  if (closeSheet) {
    if (closeSheet.classList.contains('menu-sheet') || closeSheet.classList.contains('menu-item')) {
      document.querySelector('.menu-sheet')?.remove();
    }
    return;
  }
  if (e.target.closest('[data-act="reset"]')) {
    e.preventDefault();
    if (confirm('Se volverán a cargar los datos de ejemplo. Se perderán los cambios que haya hecho en esta demostración. ¿Continuar?')) {
      state = db.resetDemo();
      draft = null;
      quoteDraft = null;
      document.querySelector('.menu-sheet')?.remove();
      toast('Demo restablecida.');
      go('#/inicio');
    }
    return;
  }
  if (e.target.closest('[data-act="logout"]')) {
    db.clearSession();
    document.querySelector('.menu-sheet')?.remove();
    go('#/login');
    return;
  }

  const tipoBtn = e.target.closest('[data-tipo]');
  if (tipoBtn && draft) {
    draft.tipo = tipoBtn.getAttribute('data-tipo');
    collectWizardFields(document.getElementById('app'));
    render();
    return;
  }
  const eqPick = e.target.closest('[data-equipo]');
  if (eqPick && draft) {
    collectWizardFields(document.getElementById('app'));
    draft.equipoId = eqPick.getAttribute('data-equipo');
    const c = db.getClient(state, draft.clienteId);
    const eq = c?.equipos.find((x) => x.id === draft.equipoId);
    if (eq) applyEquipo(draft, eq);
    render();
    return;
  }
  const eqTipo = e.target.closest('[data-eqtipo]');
  if (eqTipo && draft) {
    collectWizardFields(document.getElementById('app'));
    draft.equipo.tipo = eqTipo.getAttribute('data-eqtipo');
    render();
    return;
  }
  const check = e.target.closest('[data-check]');
  if (check && draft) {
    const k = check.getAttribute('data-check');
    draft.checklist[k] = !draft.checklist[k];
    render();
    return;
  }
  if (e.target.closest('[data-act="check-all"]') && draft) {
    for (const i of db.CHECKLIST) draft.checklist[i.key] = true;
    render();
    return;
  }
  const corr = e.target.closest('[data-corr]');
  if (corr && draft) {
    collectWizardFields(document.getElementById('app'));
    const k = corr.getAttribute('data-corr');
    draft.trabajosCorrectivos[k] = !draft.trabajosCorrectivos[k];
    render();
    return;
  }
  if (e.target.closest('[data-act="add-diag"]') && draft) {
    collectWizardFields(document.getElementById('app'));
    draft.diagnostico.push('');
    render();
    return;
  }
  if (e.target.closest('[data-act="add-rep"]') && draft) {
    collectWizardFields(document.getElementById('app'));
    draft.repuestos.push({ nombre: '', cantidad: '' });
    render();
    return;
  }
  const sigclear = e.target.closest('[data-sigclear]');
  if (sigclear && draft) {
    const who = sigclear.getAttribute('data-sigclear');
    if (who === 'cliente') draft.firmaCliente = '';
    else draft.firmaTecnico = '';
    const canvas = document.getElementById(who === 'cliente' ? 'sig-cliente' : 'sig-tecnico');
    if (canvas) {
      canvas.dataset.dirty = '';
      bindSignature(canvas, '');
    }
    return;
  }

  const wiz = e.target.closest('[data-wiz]');
  if (wiz && draft) {
    collectWizardFields(document.getElementById('app'));
    const act = wiz.getAttribute('data-wiz');
    if (act === 'next') {
      if (draft.step === 1 && !draft.clienteId) {
        toast('Elija un cliente para continuar.');
        return;
      }
      draft.step = Math.min(6, (draft.step || 1) + 1);
      window.scrollTo(0, 0);
      render();
    } else if (act === 'prev') {
      draft.step = Math.max(1, (draft.step || 1) - 1);
      window.scrollTo(0, 0);
      render();
    } else if (act === 'save') {
      saveMantenimiento();
    }
    return;
  }

  const filtro = e.target.closest('[data-filtro]');
  if (filtro) {
    trabajoFiltro = filtro.getAttribute('data-filtro');
    render();
    return;
  }
  const estChip = e.target.closest('#t-estado-row [data-estado]');
  if (estChip) {
    document.querySelectorAll('#t-estado-row .chip').forEach((n) => n.classList.remove('is-on'));
    estChip.classList.add('is-on');
    const hidden = document.getElementById('t-estado');
    if (hidden) hidden.value = estChip.getAttribute('data-estado');
    return;
  }
  const setEst = e.target.closest('[data-setestado]');
  if (setEst) {
    const t = state.trabajos.find((x) => x.id === setEst.getAttribute('data-tid'));
    if (t) {
      t.estado = setEst.getAttribute('data-setestado');
      persist();
      render();
      toast('Estado actualizado.');
    }
    return;
  }

  const calBtn = e.target.closest('[data-cal]');
  if (calBtn) {
    const dir = calBtn.getAttribute('data-cal') === 'prev' ? -1 : 1;
    calCursor = new Date(calCursor.getFullYear(), calCursor.getMonth() + dir, 1);
    render();
    return;
  }
  const dayBtn = e.target.closest('[data-day]');
  if (dayBtn) {
    calSelected = dayBtn.getAttribute('data-day');
    render();
    return;
  }

  const cat = e.target.closest('[data-cat]');
  if (cat && quoteDraft) {
    const id = cat.getAttribute('data-cat');
    const item = db.CATALOGO.find((x) => x.id === id);
    const exists = quoteDraft.items.findIndex((x) => x.id === id);
    if (exists >= 0) quoteDraft.items.splice(exists, 1);
    else if (item) quoteDraft.items.push({ id: item.id, nombre: item.nombre, precio: item.precio });
    render();
    return;
  }
  if (e.target.closest('[data-act="quote-pdf"]')) { handleQuote(false); return; }
  if (e.target.closest('[data-act="quote-wa"]')) { handleQuote(true); return; }

  const pdf = e.target.closest('[data-pdf]');
  if (pdf) { handlePdf(pdf.getAttribute('data-pdf'), false); return; }
  const share = e.target.closest('[data-share]');
  if (share) { handlePdf(share.getAttribute('data-share'), true); return; }
}

function registerSW() {
  if (!('serviceWorker' in navigator)) return;
  navigator.serviceWorker.register(new URL('../sw.js', import.meta.url)).catch(() => {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  });
}

document.addEventListener('click', onClick);
document.addEventListener('change', onChange);
document.addEventListener('input', onInput);

window.addEventListener('hashchange', render);
window.addEventListener('DOMContentLoaded', () => {
  if (!location.hash) {
    location.replace(db.getSession() ? '#/inicio' : '#/login');
  }
  render();
  registerSW();
});
