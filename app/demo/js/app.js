/* SEID — panel de trabajo del Ing. Abel Galarza (PWA offline-first). */
import * as store from './store.js';
import * as rec from './records.js';
import * as cat from './catalog.js';
import * as fmt from './format.js';
import * as auth from './auth.js';
import * as api from './api.js';
import * as sample from './sample.js';
import { createSignaturePad, compressPhoto } from './signature.js';
import { generarPdf, shareFile, downloadBlob } from './pdf.js';
import { ICO, iconoServicio, toast, confirmDialog, alertDialog, viewPhoto, screen } from './ui.js';
import { APP_VERSION, TECNICO_NOMBRE, WHATSAPP_NUMBER } from './config.js';

const esc = fmt.esc;
const app = document.getElementById('app');
const DRAFT_KEY = 'seid-borrador';

let draft = loadDraft();
let nota = null;
let cierre = null;
let pads = {};
let installPrompt = null;
let lastHash = '';
let hf = { q: '', tipo: 'todos', servicio: '', estado: '', desde: '', hasta: '', orden: 'recientes' };
let hfOpen = false;
let histVista = 'registros';
let clienteQ = '';
let calCursor = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
let calSel = rec.todayISO();
let draftDate = '';
let pinBuffer = '';
let pinFails = 0;
let pinBlockedUntil = 0;
let welcomeErr = '';

/* ---------- utilidades ---------- */

function D() { return store.data(); }
function tecnico() { return store.meta('tecnicoNombre') || TECNICO_NOMBRE; }

function saveDraft() {
  try {
    if (draft) localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    else localStorage.removeItem(DRAFT_KEY);
  } catch { /* */ }
}
function loadDraft() {
  try { return JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null'); } catch { return null; }
}

function parseRoute() {
  const raw = (location.hash || '#/inicio').replace(/^#\/?/, '');
  const [path, qs] = raw.split('?');
  const parts = path.split('/').filter(Boolean);
  return { name: parts[0] || 'inicio', id: decodeURIComponent(parts[1] || ''), sub: parts[2] || '', q: Object.fromEntries(new URLSearchParams(qs || '')) };
}

function go(hash) {
  if (location.hash === hash) render();
  else location.hash = hash;
}

function saludo() {
  const h = new Date().getHours();
  return h < 12 ? 'Buenos días' : h < 19 ? 'Buenas tardes' : 'Buenas noches';
}

function nombreCorto(n) {
  const p = String(n || '').trim().split(/\s+/);
  if (/^ing\.?$/i.test(p[0]) && p[1]) return `${p[0]} ${p[1]}`;
  return p[0] || '';
}

function estadoPill(r) {
  if (r.bloqueado) return `<span class="pill pill--done">${ICO.lock}Firmado</span>`;
  return `<span class="pill pill--${r.estado}">${esc(cat.estadoLabel(r.estado))}</span>`;
}

function registroCard(r, { showClient = true } = {}) {
  const total = rec.totalRegistro(r);
  const notas = rec.eventosDe(r.id).filter((e) => e.tipo === 'nota').length;
  return `<a class="rcard" href="#/registro/${r.id}">
    <span class="rcard__icon">${iconoServicio(r.servicio)}</span>
    <span class="rcard__body">
      <span class="rcard__top">
        <span class="rcard__title">${esc(showClient ? r.cliente?.nombre : r.servicioLabel)}</span>
        ${estadoPill(r)}
      </span>
      <span class="rcard__sub">${esc(showClient ? cat.servicio(r.servicio).corto : r.numero)} · ${esc(fmt.fecha(r.fechaInicio, { corta: true }))}</span>
      <span class="rcard__meta">
        <span>${esc(r.numero)}</span>
        ${notas ? `<span>${ICO.note}${notas} ${notas === 1 ? 'nota' : 'notas'}</span>` : ''}
        ${total != null ? `<span class="rcard__money">${esc(fmt.bs(total))}</span>` : ''}
      </span>
    </span>
  </a>`;
}

function emptyState(icon, title, text, action = '') {
  return `<div class="empty"><span class="empty__icon">${ICO[icon]}</span><p class="empty__title">${esc(title)}</p><p class="empty__text">${esc(text)}</p>${action}</div>`;
}

function waIcon(phone, text, label = 'WhatsApp') {
  if (!phone) return '';
  return `<a class="btn btn--wa btn--sm" href="${esc(fmt.waLink(phone, text))}" target="_blank" rel="noopener">${ICO.wa}${esc(label)}</a>`;
}

function textoRecordatorio(r) {
  const n = nombreCorto(String(r.cliente?.nombre || '').replace(/\(.*\)/, '').trim());
  return `Hola ${n}, le saluda ${tecnico()} de SEID. Le recuerdo que el mantenimiento de su aire acondicionado corresponde el ${fmt.fecha(r.proximoMantenimiento)}. ¿Coordinamos una visita?`;
}

function seg(name, value, options) {
  return `<div class="seg" role="radiogroup">
    ${options.map(([v, l]) => `<button type="button" role="radio" aria-checked="${value === v}" class="${value === v ? 'is-on' : ''}" data-seg="${name}" data-val="${esc(v)}">${esc(l)}</button>`).join('')}
  </div>`;
}

/* ---------- pantallas de acceso ---------- */

function viewBienvenida() {
  return `<div class="welcome">
    <img class="welcome__logo" src="img/logo.png" width="559" height="210" alt="SEID, Servicios de Electricidad Industrial y Domiciliaria">
    <h1>Bienvenido a su panel de trabajo</h1>
    <p class="lead">Registre trabajos y mantenimientos, agregue notas, firme con el cliente y envíe el informe en PDF por WhatsApp.</p>
    <form id="form-bienvenida" class="card stack" novalidate>
      <div class="field">
        <label for="w-nombre">Su nombre</label>
        <input type="text" id="w-nombre" name="nombre" autocomplete="name" value="${esc(tecnico())}" required>
      </div>
      <div class="field-row">
        <div class="field">
          <label for="w-pin">PIN de 4 números</label>
          <input id="w-pin" name="pin" type="password" inputmode="numeric" pattern="[0-9]*" maxlength="4" autocomplete="new-password" required>
        </div>
        <div class="field">
          <label for="w-pin2">Repita el PIN</label>
          <input id="w-pin2" name="pin2" type="password" inputmode="numeric" pattern="[0-9]*" maxlength="4" autocomplete="new-password" required>
        </div>
      </div>
      <p class="hint">El PIN protege la app si presta el teléfono. Se pide al abrirla después de 15 minutos sin uso.</p>
      ${welcomeErr ? `<p class="error" role="alert">${esc(welcomeErr)}</p>` : ''}
      <button class="btn btn--block btn--lg" type="submit" name="modo" value="vacio">Empezar a usar</button>
      <button class="btn btn--ghost btn--block" type="submit" name="modo" value="ejemplo">Ver primero con datos de ejemplo</button>
    </form>
    <p class="hint center">Sus datos se guardan en este teléfono y funcionan sin internet.</p>
  </div>`;
}

function viewBloqueo() {
  const blocked = Date.now() < pinBlockedUntil;
  return `<div class="lock">
    <img class="lock__logo" src="img/logo-header.png" width="545" height="206" alt="SEID">
    <h1>Ingrese su PIN</h1>
    <div class="pin-dots ${pinFails && !pinBuffer ? 'is-error' : ''}" role="img" aria-label="${pinBuffer.length} de 4 números">
      ${[0, 1, 2, 3].map((i) => `<i class="${i < pinBuffer.length ? 'is-on' : ''}"></i>`).join('')}
    </div>
    <p class="lock__msg" role="status">${blocked ? 'Demasiados intentos. Espere 30 segundos.' : pinFails ? 'PIN incorrecto. Intente de nuevo.' : '&nbsp;'}</p>
    <div class="keypad">
      ${[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => `<button type="button" data-key="${n}" ${blocked ? 'disabled' : ''}>${n}</button>`).join('')}
      <button type="button" data-act="pin-olvide" class="keypad__text">Olvidé</button>
      <button type="button" data-key="0" ${blocked ? 'disabled' : ''}>0</button>
      <button type="button" data-key="del" aria-label="Borrar" class="keypad__text">${ICO.chevL}</button>
    </div>
  </div>`;
}

/* "Usar sin conexión por ahora": deja trabajar en este teléfono y vuelve a pedir el ingreso la próxima vez. */
function loginLuego() { try { return sessionStorage.getItem('seid-login-luego') === '1'; } catch { return false; } }

function viewLogin() {
  return `<div class="welcome">
    <img class="welcome__logo" src="img/logo.png" width="559" height="210" alt="SEID">
    <h1>Entrar</h1>
    <p class="lead">${store.meta('setupDone') ? 'Vuelva a entrar para seguir guardando en la nube. Sus registros siguen en este teléfono.' : 'Entre con su cuenta de SEID para guardar los registros también en la nube.'}</p>
    <form id="form-login" class="card stack">
      <div class="field"><label for="l-email">Correo</label><input id="l-email" name="email" type="email" autocomplete="username" required></div>
      <div class="field"><label for="l-pass">Contraseña</label><input id="l-pass" name="password" type="password" autocomplete="current-password" required></div>
      <button class="btn btn--block btn--lg" type="submit">Entrar</button>
    </form>
    <button type="button" class="btn btn--ghost btn--block" data-act="login-luego">Usar sin conexión por ahora</button>
  </div>`;
}

/* ---------- inicio ---------- */

function viewInicio() {
  const regs = rec.registros();
  const abiertos = regs.filter((r) => !r.bloqueado && r.estado !== 'terminado').sort((a, b) => a.fechaInicio.localeCompare(b.fechaInicio));
  const porFirmar = regs.filter((r) => !r.bloqueado && r.estado === 'terminado');
  const avisos = rec.recordatorios({ dentroDeDias: 15 });
  const mes = rec.todayISO().slice(0, 7);
  const delMes = regs.filter((r) => r.fechaInicio.slice(0, 7) === mes);
  const terminadoMes = delMes.filter((r) => r.estado === 'terminado').reduce((s, r) => s + (rec.totalRegistro(r) || 0), 0);
  const demo = sample.hayEjemplo();
  const lastBackup = store.meta('lastBackupAt');
  const needBackup = regs.some((r) => !r.demo) && (!lastBackup || Date.now() - new Date(lastBackup) > 7 * 86400000);

  const avisosHtml = avisos.length ? `<section class="section">
      <h2 class="section__title">Mantenimientos por hacer <span class="count">${avisos.length}</span></h2>
      <div class="stack-sm">${avisos.map(avisoCard).join('')}</div>
    </section>` : '';

  const abiertosHtml = `<section class="section">
      <h2 class="section__title">Trabajos abiertos ${abiertos.length ? `<span class="count">${abiertos.length}</span>` : ''}</h2>
      ${abiertos.length ? `<div class="stack-sm">${abiertos.slice(0, 6).map((r) => registroCard(r)).join('')}</div>
        ${abiertos.length > 6 ? '<a class="link-more" href="#/historial">Ver todos en el historial</a>' : ''}`
        : emptyState('check', 'No hay trabajos abiertos', 'Cuando registre un trabajo nuevo, aparecerá aquí hasta que lo cierre con las firmas.')}
    </section>`;

  const firmarHtml = porFirmar.length ? `<section class="section">
      <h2 class="section__title">Terminados, falta firmar <span class="count">${porFirmar.length}</span></h2>
      <div class="stack-sm">${porFirmar.map((r) => registroCard(r)).join('')}</div>
    </section>` : '';

  return screen(`
    ${demo ? `<div class="banner">
        <p><strong>Está viendo datos de ejemplo.</strong> Cuando quiera empezar con sus propios clientes, bórrelos.</p>
        <button class="btn btn--sm" type="button" data-act="empezar">Empezar a usar</button>
      </div>` : ''}
    ${needBackup ? `<div class="banner banner--quiet">
        <p><strong>Haga una copia de respaldo.</strong> ${lastBackup ? `La última fue el ${esc(fmt.fecha(lastBackup.slice(0, 10)))}.` : 'Todavía no tiene ninguna.'} Así no pierde nada si cambia de teléfono.</p>
        <button class="btn btn--ghost btn--sm" type="button" data-act="backup">Respaldar ahora</button>
      </div>` : ''}
    <p class="kicker">${saludo()}</p>
    <h1 class="title">${esc(nombreCorto(tecnico()))}</h1>
    <div class="quick">
      <a class="quick__main" href="#/nuevo">${ICO.plus}<span><strong>Nuevo trabajo</strong><small>Instalación, electricidad, cámaras…</small></span></a>
      <a class="quick__alt" href="#/nuevo/mantenimiento-aire">${ICO.wrench}<span><strong>Mantenimiento de aire</strong><small>Con lista de verificación</small></span></a>
    </div>
    ${installCard()}
    ${avisosHtml}
    ${firmarHtml}
    ${abiertosHtml}
    <section class="section">
      <h2 class="section__title">Este mes</h2>
      <div class="stats">
        <div class="stat"><span class="stat__num">${delMes.length}</span><span class="stat__lbl">Registros</span></div>
        <div class="stat"><span class="stat__num">${esc(fmt.bs(terminadoMes))}</span><span class="stat__lbl">En trabajos terminados</span></div>
      </div>
    </section>
  `, { tab: 'inicio', brand: true, headerRight: syncBadge() });
}

function syncBadge() {
  if (!api.enabled()) return '';
  return `<span class="sync ${navigator.onLine ? '' : 'is-off'}" title="Sincronización">${ICO.cloud}</span>`;
}

function avisoCard({ registro: r, dias }) {
  const cls = dias < 0 ? 'aviso aviso--late' : 'aviso';
  return `<article class="${cls}">
    <a class="aviso__main" href="#/registro/${r.id}">
      <span class="aviso__when">${esc(fmt.diasTexto(dias))}</span>
      <span class="aviso__title">${esc(r.cliente?.nombre)}</span>
      <span class="aviso__sub">${esc(r.equipo?.ubicacion ? `${r.equipo.tipo || 'Aire'} · ${r.equipo.ubicacion}` : cat.servicio(r.servicio).corto)} · ${esc(fmt.fecha(r.proximoMantenimiento, { corta: true }))}</span>
    </a>
    <div class="aviso__actions">
      ${waIcon(r.cliente?.telefono, textoRecordatorio(r), 'Avisar')}
      <a class="btn btn--ghost btn--sm" href="#/nuevo/mantenimiento-aire?seguimiento=${r.id}">Registrar</a>
      <button class="icon-btn icon-btn--sm" type="button" data-descartar="${r.id}" aria-label="Descartar recordatorio de ${esc(r.cliente?.nombre)}">${ICO.close}</button>
    </div>
  </article>`;
}

function installCard() {
  if (window.matchMedia('(display-mode: standalone)').matches || navigator.standalone) return '';
  if (store.meta('installHidden')) return '';
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
  if (!installPrompt && !ios) return '';
  return `<div class="banner banner--quiet">
    <p><strong>Instale la app en su teléfono.</strong> ${ios ? 'Toque Compartir y luego «Agregar a inicio».' : 'Queda como un ícono y funciona sin internet.'}</p>
    <div class="row-gap">
      ${installPrompt ? '<button class="btn btn--sm" type="button" data-act="install">Instalar</button>' : ''}
      <button class="btn btn--ghost btn--sm" type="button" data-act="install-hide">Ahora no</button>
    </div>
  </div>`;
}

/* ---------- nuevo: elegir servicio ---------- */

function viewNuevo(q = {}) {
  const grupos = [...new Set(cat.SERVICIOS.map((s) => s.grupo))];
  const qs = q.cliente ? `?cliente=${encodeURIComponent(q.cliente)}` : '';
  const c = q.cliente ? rec.cliente(q.cliente) : null;
  return screen(`
    <h1 class="title">¿Qué va a registrar?</h1>
    <p class="lead">${c ? `Para ${esc(c.nombre)}. ` : ''}Elija el servicio. Después podrá agregar notas e imprevistos.</p>
    ${draft && draft.servicio && !c ? `<a class="banner banner--quiet banner--link" href="#/nuevo/${esc(draft.servicio)}">
        <p><strong>Tiene un registro sin guardar</strong> de ${esc(cat.servicio(draft.servicio).corto)}${draft.nombre ? ` para ${esc(draft.nombre)}` : ''}. Toque para seguir.</p>${ICO.chev}</a>` : ''}
    ${grupos.map((g) => `<section class="section">
      <h2 class="section__title">${esc(g)}</h2>
      <div class="svc-grid">
        ${cat.SERVICIOS.filter((s) => s.grupo === g).map((s) => `<a class="svc" href="#/nuevo/${s.key}${qs}">
          <span class="svc__icon">${iconoServicio(s.key)}</span><span class="svc__label">${esc(s.label)}</span>
        </a>`).join('')}
      </div>
    </section>`).join('')}
  `, { tab: 'nuevo', title: 'Nuevo registro' });
}

/* ---------- nuevo: formulario ---------- */

function newDraft(servicio, q = {}) {
  const prev = q.seguimiento ? rec.registro(q.seguimiento) : null;
  const c = q.cliente ? rec.cliente(q.cliente) : prev ? rec.cliente(prev.clienteId) : null;
  const s = cat.servicio(servicio);
  const d = {
    servicio,
    clienteId: c?.id || '',
    nombre: c?.nombre || '',
    telefono: c?.telefono ? c.telefono.replace(/^591/, '') : '',
    ubicacion: prev?.ubicacion || '',
    fechaInicio: draftDate || rec.todayISO(),
    teValor: s.aire === 'mantenimiento' ? '2' : '',
    teUnidad: 'horas',
    precio: '',
    precioManual: false,
    descripcion: '',
    estado: s.aire === 'mantenimiento' ? 'en-curso' : 'pendiente',
    equipo: prev?.equipo ? { ...prev.equipo } : { tipo: '', capacidad: '', marca: '', modelo: '', ubicacion: '' },
    tier: '',
    extras: {},
    checklist: {},
    seguimientoDe: prev?.id || ''
  };
  draftDate = '';
  if (prev?.equipo?.capacidad && s.aire) {
    const t = tiersFor(d).find((x) => x.label === prev.equipo.capacidad);
    if (t) d.tier = t.key;
  }
  applyPrice(d);
  return d;
}

function tiersFor(d) {
  const s = cat.servicio(d.servicio);
  if (s.aire === 'mantenimiento') return cat.PRECIOS_MANTENIMIENTO;
  if (s.aire === 'instalacion') return cat.PRECIOS_INSTALACION;
  return [];
}

function priceLines(d) {
  const s = cat.servicio(d.servicio);
  const lines = [];
  const t = tiersFor(d).find((x) => x.key === d.tier);
  if (t) lines.push({ label: `${s.aire === 'mantenimiento' ? 'Mantenimiento' : 'Instalación'} ${t.label}`, monto: t.monto });
  if (s.aire) {
    for (const ex of cat.EXTRAS_AIRE) {
      const qty = Number(d.extras[ex.key] || 0);
      if (!qty) continue;
      lines.push({ label: ex.porMetro ? `${ex.label} (${qty} m)` : ex.label, monto: ex.monto * (ex.porMetro ? qty : 1) });
    }
  }
  return lines;
}

function applyPrice(d) {
  if (d.precioManual) return;
  const lines = priceLines(d);
  if (lines.length) d.precio = String(lines.reduce((a, l) => a + l.monto, 0));
  else if (cat.servicio(d.servicio).aire) d.precio = '';
}

function sugerencias(d) {
  const q = (d.nombre || '').trim().toLowerCase();
  if (d.clienteId) {
    const c = rec.cliente(d.clienteId);
    return c ? `<p class="suggest__chosen">${ICO.check}<span>Cliente guardado${c.telefono ? ` · ${esc(fmt.telefono(c.telefono))}` : ''}</span><button type="button" class="link" data-act="cliente-otro">Cambiar</button></p>` : '';
  }
  if (q.length < 2) return '';
  const qd = q.replace(/\D/g, '');
  const matches = rec.clientes().filter((c) => c.nombre.toLowerCase().includes(q) || (qd.length >= 3 && (c.telefono || '').includes(qd))).slice(0, 4);
  if (!matches.length) return '<p class="suggest__new">Cliente nuevo: se guardará al registrar.</p>';
  return `<p class="suggest__label">¿Es alguno de estos?</p>${matches.map((c) => `<button type="button" class="suggest__item" data-pick-cliente="${c.id}">${ICO.user}<span>${esc(c.nombre)}<small>${esc(fmt.telefono(c.telefono))}</small></span></button>`).join('')}`;
}

function clienteFields(d) {
  return `<section class="fsec">
    <h2 class="fsec__title"><span>1</span>Cliente</h2>
    <div class="field">
      <label for="f-nombre">Nombre del cliente</label>
      <input type="text" id="f-nombre" data-d="nombre" value="${esc(d.nombre)}" autocomplete="off" placeholder="Nombre y apellido o empresa" required>
      <div id="sugerencias" class="suggest" aria-live="polite">${sugerencias(d)}</div>
    </div>
    <div class="field">
      <label for="f-tel">WhatsApp del cliente <span class="opt">opcional</span></label>
      <div class="input-prefix"><span>+591</span><input id="f-tel" data-d="telefono" value="${esc(d.telefono)}" type="tel" inputmode="tel" autocomplete="off" placeholder="7xxxxxxx"></div>
    </div>
    <div class="field">
      <label for="f-ubi">Ubicación o referencia <span class="opt">opcional</span></label>
      <input type="text" id="f-ubi" data-d="ubicacion" value="${esc(d.ubicacion)}" placeholder="Barrio, calle, casa de color…">
    </div>
  </section>`;
}

function aireFields(d) {
  const s = cat.servicio(d.servicio);
  if (!s.aire) return '';
  const tiers = tiersFor(d);
  return `<section class="fsec">
    <h2 class="fsec__title"><span>2</span>Equipo y precio</h2>
    <p class="label">Tipo de equipo</p>
    <div class="chips">
      ${cat.TIPOS_EQUIPO.map((t) => `<button type="button" class="chip ${d.equipo.tipo === t ? 'is-on' : ''}" aria-pressed="${d.equipo.tipo === t}" data-eqtipo="${esc(t)}">${esc(t)}</button>`).join('')}
    </div>
    <p class="label">Capacidad y precio 2026</p>
    <div class="tiers">
      ${tiers.map((t) => `<button type="button" class="tier ${d.tier === t.key ? 'is-on' : ''}" aria-pressed="${d.tier === t.key}" data-tier="${t.key}">
        <span>${esc(t.label)}</span><strong>${esc(fmt.bs(t.monto))}</strong></button>`).join('')}
    </div>
    <div class="field-row">
      <div class="field"><label for="f-marca">Marca <span class="opt">opcional</span></label><input type="text" id="f-marca" data-d="equipo.marca" value="${esc(d.equipo.marca)}"></div>
      <div class="field"><label for="f-equbi">Ambiente <span class="opt">opcional</span></label><input type="text" id="f-equbi" data-d="equipo.ubicacion" value="${esc(d.equipo.ubicacion)}" placeholder="Sala, dormitorio…"></div>
    </div>
    <details class="extras" ${Object.values(d.extras).some(Boolean) ? 'open' : ''}>
      <summary>Agregar extras <span class="opt">fuga, tubería, drenaje…</span></summary>
      ${cat.EXTRAS_AIRE.map((ex) => {
        const qty = Number(d.extras[ex.key] || 0);
        if (ex.porMetro) {
          return `<div class="extra ${qty ? 'is-on' : ''}">
            <span class="extra__label">${esc(ex.label)}<small>${esc(fmt.bs(ex.monto))} por metro</small></span>
            <span class="stepper">
              <button type="button" data-metro="-1" aria-label="Quitar un metro">−</button>
              <output aria-live="polite">${qty} m</output>
              <button type="button" data-metro="1" aria-label="Agregar un metro">+</button>
            </span>
          </div>`;
        }
        return `<button type="button" class="extra ${qty ? 'is-on' : ''}" aria-pressed="${!!qty}" data-extra="${ex.key}">
          <span class="extra__label">${esc(ex.label)}<small>${esc(fmt.bs(ex.monto))}</small></span>
          <span class="tick">${ICO.check}</span>
        </button>`;
      }).join('')}
    </details>
  </section>`;
}

function checklistFields(d) {
  if (cat.servicio(d.servicio).aire !== 'mantenimiento') return '';
  const all = cat.CHECKLIST_AIRE.every((i) => d.checklist[i.key]);
  return `<section class="fsec">
    <h2 class="fsec__title"><span>3</span>Servicio realizado</h2>
    <div class="checks">
      ${cat.CHECKLIST_AIRE.map((i) => `<button type="button" class="check ${d.checklist[i.key] ? 'is-on' : ''}" aria-pressed="${!!d.checklist[i.key]}" data-check="${i.key}">
        <span class="tick">${ICO.check}</span><span>${esc(i.label)}</span></button>`).join('')}
    </div>
    <button type="button" class="btn btn--ghost btn--block btn--sm" data-act="check-all">${all ? 'Desmarcar todo' : 'Marcar todo como hecho'}</button>
  </section>`;
}

function viewForm(servicio, q) {
  if (!cat.SERVICIOS.some((s) => s.key === servicio)) return viewNoEncontrado();
  const needNew = !draft || draft.servicio !== servicio
    || (q.seguimiento && draft.seguimientoDe !== q.seguimiento)
    || (q.cliente && draft.clienteId !== q.cliente);
  if (needNew) { draft = newDraft(servicio, q); saveDraft(); }
  const d = draft;
  const s = cat.servicio(servicio);
  const esMant = s.aire === 'mantenimiento';
  let n = s.aire ? (esMant ? 4 : 3) : 2;
  const prev = d.seguimientoDe ? rec.registro(d.seguimientoDe) : null;
  const lines = priceLines(d);
  return screen(`
    <div class="form-head">
      <span class="form-head__icon">${iconoServicio(servicio)}</span>
      <div><p class="kicker">${esMant ? 'Mantenimiento' : 'Nuevo trabajo'}</p><h1 class="title title--sm">${esc(s.label)}</h1></div>
    </div>
    ${prev ? `<p class="note">Seguimiento del registro ${esc(prev.numero)} del ${esc(fmt.fecha(prev.fechaInicio))}.</p>` : ''}
    <div id="form-registro">
      ${clienteFields(d)}
      ${aireFields(d)}
      ${checklistFields(d)}
      <section class="fsec">
        <h2 class="fsec__title"><span>${n++}</span>Fecha y tiempo</h2>
        <div class="field-row">
          <div class="field"><label for="f-fecha">Fecha de inicio</label><input id="f-fecha" type="date" data-d="fechaInicio" value="${esc(d.fechaInicio)}" required></div>
          <div class="field"><label for="f-te">Tiempo estimado</label><input type="text" id="f-te" data-d="teValor" value="${esc(d.teValor)}" inputmode="decimal" placeholder="Ej. 3"></div>
        </div>
        ${seg('teUnidad', d.teUnidad, [['horas', 'Horas'], ['dias', 'Días']])}
      </section>
      <section class="fsec">
        <h2 class="fsec__title"><span>${n++}</span>Precio y detalle</h2>
        ${lines.length ? `<ul class="price-lines">${lines.map((l) => `<li><span>${esc(l.label)}</span><span>${esc(fmt.bs(l.monto))}</span></li>`).join('')}</ul>` : ''}
        <div class="field">
          <label for="f-precio">Precio acordado <span class="opt">${s.aire ? 'puede cambiarlo' : 'opcional'}</span></label>
          <div class="input-prefix"><span>Bs</span><input type="text" id="f-precio" data-d="precio" value="${esc(d.precio)}" inputmode="decimal" placeholder="0"></div>
          ${d.precioManual && lines.length ? '<button type="button" class="link small" data-act="precio-auto">Volver al precio de la lista</button>' : ''}
        </div>
        <div class="field">
          <label for="f-desc">${esMant ? 'Observaciones' : 'Descripción del trabajo'}</label>
          <textarea id="f-desc" data-d="descripcion" rows="4" placeholder="${esMant ? 'Estado del equipo, recomendaciones…' : 'Qué se va a hacer, materiales, acuerdos…'}">${esc(d.descripcion)}</textarea>
        </div>
        <p class="label">Estado</p>
        ${seg('estado', d.estado, cat.ESTADOS.map((e) => [e.key, e.label]))}
      </section>
    </div>
  `, {
    title: esMant ? 'Mantenimiento' : 'Nuevo trabajo',
    back: '#/nuevo',
    bar: '<button type="button" class="btn btn--ghost" data-act="draft-cancel">Descartar</button><button type="button" class="btn btn--lg" data-act="draft-save">Guardar</button>'
  });
}

function showErrors(errors) {
  document.querySelectorAll('.field-error').forEach((n) => n.remove());
  document.querySelectorAll('[aria-invalid]').forEach((n) => { n.removeAttribute('aria-invalid'); n.removeAttribute('aria-describedby'); });
  for (const [id, msg] of errors) {
    const input = document.getElementById(id);
    if (!input) continue;
    input.setAttribute('aria-invalid', 'true');
    const p = document.createElement('p');
    p.className = 'field-error';
    p.id = `${id}-err`;
    p.textContent = msg;
    input.setAttribute('aria-describedby', p.id);
    input.closest('.field').appendChild(p);
  }
  if (errors.length) {
    const first = document.getElementById(errors[0][0]);
    first?.focus({ preventScroll: true });
    first?.scrollIntoView({ block: 'center' });
  }
}

function num(s) {
  const v = String(s ?? '').trim().replace(/\s/g, '');
  if (!v) return '';
  // 1.060 o 1.060,50 → 1060 / 1060.5 ; 3,5 → 3.5
  const norm = /^\d{1,3}(\.\d{3})+(,\d+)?$/.test(v) ? v.replace(/\./g, '').replace(',', '.') : v.replace(',', '.');
  return norm;
}

async function saveRegistro() {
  const d = draft;
  const s = cat.servicio(d.servicio);
  const errors = [];
  if (!d.nombre.trim()) errors.push(['f-nombre', 'Escriba el nombre del cliente.']);
  const tel = rec.digits(d.telefono);
  if (tel && !(tel.length === 8 || (tel.length === 11 && tel.startsWith('591')))) errors.push(['f-tel', 'El WhatsApp debe tener 8 números, por ejemplo 71234567.']);
  if (!d.fechaInicio) errors.push(['f-fecha', 'Elija la fecha de inicio.']);
  const te = num(d.teValor);
  if (te && (Number.isNaN(Number(te)) || Number(te) <= 0)) errors.push(['f-te', 'Escriba solo el número, por ejemplo 3.']);
  const precio = num(d.precio);
  if (precio && (Number.isNaN(Number(precio)) || Number(precio) < 0)) errors.push(['f-precio', 'Escriba solo el número, por ejemplo 840.']);
  showErrors(errors);
  if (errors.length) return;
  const tier = tiersFor(d).find((t) => t.key === d.tier);
  const resumen = `<dl class="summary">
    <dt>Cliente</dt><dd>${esc(d.nombre)}${tel ? ` · ${esc(fmt.telefono(rec.normPhone(tel)))}` : ''}</dd>
    <dt>Servicio</dt><dd>${esc(s.label)}${tier ? ` · ${esc(tier.label)}` : ''}</dd>
    <dt>Inicio</dt><dd>${esc(fmt.fecha(d.fechaInicio))}${te ? ` · ${esc(fmt.tiempo({ valor: te, unidad: d.teUnidad }))}` : ''}</dd>
    <dt>Precio</dt><dd>${precio ? esc(fmt.bs(Number(precio))) : 'Sin precio'}</dd>
    <dt>Estado</dt><dd>${esc(cat.estadoLabel(d.estado))}</dd>
  </dl>
  <p class="hint">Después de guardar, estos datos ya no se cambian. Si algo cambia, agregue una nota.</p>`;
  const ok = await confirmDialog({ title: 'Revise antes de guardar', html: resumen, ok: 'Guardar', cancel: 'Corregir' });
  if (!ok) return;
  try {
    const r = await rec.crearRegistro({
      servicio: d.servicio,
      cliente: { id: d.clienteId, nombre: d.nombre.trim(), telefono: tel },
      ubicacion: d.ubicacion.trim(),
      fechaInicio: d.fechaInicio,
      tiempoEstimado: te ? { valor: Number(te), unidad: d.teUnidad } : null,
      precio: precio ? Number(precio) : null,
      precioDetalle: priceLines(d),
      descripcion: d.descripcion.trim(),
      estado: d.estado,
      equipo: s.aire ? { ...d.equipo, capacidad: tier ? tier.label : d.equipo.capacidad } : null,
      checklist: s.aire === 'mantenimiento' ? { ...d.checklist } : null,
      seguimientoDe: d.seguimientoDe || null
    });
    draft = null;
    saveDraft();
    store.requestPersist().then((p) => store.setMeta('persisted', p));
    go(`#/registro/${r.id}`);
    toast(`Guardado como ${r.numero}`);
    syncSoon();
  } catch (err) {
    alertDialog('No se pudo guardar', err.message || String(err));
  }
}

/* ---------- detalle ---------- */

function timelineHtml(evs) {
  return evs.filter((e) => e.tipo !== 'recordatorio-descartado').slice().reverse().map((e) => {
    let body = '';
    if (e.tipo === 'creado') body = '<p class="tl__text">Registro creado</p>';
    else if (e.tipo === 'estado') body = `<p class="tl__text">Estado: ${esc(cat.estadoLabel(e.estadoDe))} → <strong>${esc(cat.estadoLabel(e.estadoA))}</strong></p>`;
    else if (e.tipo === 'cierre') body = `<p class="tl__text"><strong>Firmado y cerrado.</strong> ${esc(e.texto.replace(/^Firmado por /, 'Firmaron '))}</p>`;
    else {
      body = `${e.texto ? `<p class="tl__text">${esc(e.texto)}</p>` : ''}
        ${e.ajuste ? `<p class="tl__money">${e.ajuste > 0 ? 'Suma al costo' : 'Descuento'}: <strong>${esc(fmt.bs(e.ajuste))}</strong></p>` : ''}
        ${e.foto ? `<button type="button" class="tl__photo" data-foto="${e.id}" aria-label="Ver foto en grande"><img src="${esc(e.foto)}" alt="Foto de la nota del ${esc(fmt.fechaHora(e.createdAt))}" loading="lazy"></button>` : ''}`;
    }
    return `<li class="tl__item tl__item--${e.tipo}"><span class="tl__dot" aria-hidden="true"></span><p class="tl__when">${esc(fmt.fechaHora(e.createdAt))}</p>${body}</li>`;
  }).join('');
}

function viewRegistro(id) {
  const r = rec.registro(id);
  if (!r) return viewNoEncontrado();
  const evs = rec.eventosDe(id);
  const total = rec.totalRegistro(r);
  const ajustes = rec.ajustesTotal(id);
  const s = cat.servicio(r.servicio);
  const kv = (k, v) => (v ? `<div class="kv__row"><dt>${esc(k)}</dt><dd>${v}</dd></div>` : '');
  const detalle = r.precioDetalle || [];
  const sumaDetalle = detalle.reduce((a, l) => a + Number(l.monto || 0), 0);
  const checklist = r.checklist ? `<section class="section">
      <h2 class="section__title">Servicio realizado</h2>
      <ul class="checklist-view card">${cat.CHECKLIST_AIRE.map((i) => `<li class="${r.checklist[i.key] ? 'is-on' : ''}"><span class="tick">${r.checklist[i.key] ? ICO.check : ''}</span><span>${esc(i.label)}${r.checklist[i.key] ? '' : ' <em>no realizado</em>'}</span></li>`).join('')}</ul>
    </section>` : '';
  const firmas = r.cierre ? `<section class="section">
      <h2 class="section__title">Firmas</h2>
      <div class="sigs">
        ${[['Técnico', r.cierre.firmaTecnico], ['Cliente', r.cierre.firmaCliente]].map(([rol, f]) => `<figure class="sig">
          <img src="${esc(f.png)}" alt="Firma de ${esc(f.nombre)}">
          <figcaption><strong>${esc(f.nombre)}</strong>${esc(rol)}${f.ci ? ` · CI ${esc(f.ci)}` : ''}<br>${esc(fmt.fechaHora(f.fecha))}</figcaption>
        </figure>`).join('')}
      </div>
    </section>` : '';

  const bar = r.bloqueado
    ? `<button type="button" class="btn btn--ghost" data-pdf="${r.id}" data-mode="download">${ICO.download}Descargar</button><button type="button" class="btn btn--lg" data-pdf="${r.id}" data-mode="share">${ICO.share}Enviar PDF</button>`
    : `<a class="btn btn--ghost" href="#/registro/${r.id}/nota">${ICO.note}Nota</a><a class="btn btn--lg" href="#/registro/${r.id}/cerrar">${ICO.pen}Terminar y firmar</a>`;

  return screen(`
    <div class="detail-head">
      <span class="form-head__icon">${iconoServicio(r.servicio)}</span>
      <div class="detail-head__text">
        <p class="kicker">${esc(r.numero)}</p>
        <h1 class="title title--sm">${esc(s.label)}</h1>
        <p class="detail-head__client"><a href="#/cliente/${r.clienteId}">${esc(r.cliente?.nombre)}</a></p>
      </div>
      ${estadoPill(r)}
    </div>
    ${r.demo ? '<p class="note">Registro de ejemplo.</p>' : ''}
    <div class="row-gap">
      ${waIcon(r.cliente?.telefono, `Hola, le escribe ${tecnico()} de SEID.`, 'WhatsApp')}
      ${!r.bloqueado ? `<button type="button" class="btn btn--ghost btn--sm" data-pdf="${r.id}" data-mode="share">${ICO.pdf}Ver PDF</button>` : ''}
    </div>
    ${!r.bloqueado ? `<section class="section">
        <h2 class="section__title">Estado</h2>
        ${seg('estado-reg', r.estado, cat.ESTADOS.map((e) => [e.key, e.label]))}
      </section>` : `<p class="locked">${ICO.lock}<span>Firmado y cerrado el ${esc(fmt.fechaHora(r.cierre?.cerradoAt))}. Ya no se puede modificar.</span></p>`}
    <section class="section">
      <h2 class="section__title">Datos del registro</h2>
      <dl class="kv card">
        ${kv('Cliente', `${esc(r.cliente?.nombre)}${r.cliente?.telefono ? `<br><span class="muted">${esc(fmt.telefono(r.cliente.telefono))}</span>` : ''}`)}
        ${kv('Ubicación', esc(r.ubicacion))}
        ${kv('Inicio', esc(fmt.fecha(r.fechaInicio, { dia: true })))}
        ${kv('Tiempo estimado', r.tiempoEstimado ? esc(fmt.tiempo(r.tiempoEstimado)) : '')}
        ${r.cierre ? kv('Cierre', esc(fmt.fecha(r.cierre.fechaFin, { dia: true }))) : ''}
        ${r.cierre ? kv('Tiempo real', esc(fmt.tiempo(r.cierre.tiempoReal))) : ''}
        ${r.equipo ? kv('Equipo', esc([r.equipo.tipo, r.equipo.capacidad, r.equipo.marca, r.equipo.ubicacion].filter(Boolean).join(' · ') || '—')) : ''}
        ${kv(r.tipo === 'mantenimiento' ? 'Observaciones' : 'Descripción', esc(r.descripcion))}
        ${r.proximoMantenimiento ? kv('Próximo mantenimiento', esc(fmt.fecha(r.proximoMantenimiento))) : ''}
      </dl>
      ${!r.bloqueado ? '<p class="hint">Los datos originales no se cambian. Si hay un imprevisto, agregue una nota.</p>' : ''}
    </section>
    ${checklist}
    ${total != null ? `<section class="section">
        <h2 class="section__title">Precio</h2>
        <div class="card money">
          ${detalle.map((l) => `<div><span>${esc(l.label)}</span><span>${esc(fmt.bs(l.monto))}</span></div>`).join('')}
          ${r.precio != null && !detalle.length ? `<div><span>Precio acordado</span><span>${esc(fmt.bs(r.precio))}</span></div>` : ''}
          ${r.precio != null && detalle.length && Math.round(sumaDetalle) !== Math.round(r.precio) ? `<div><span>Ajuste al precio acordado</span><span>${esc(fmt.bs(r.precio - sumaDetalle))}</span></div>` : ''}
          ${ajustes ? `<div><span>Cambios en notas</span><span>${esc(fmt.bs(ajustes))}</span></div>` : ''}
          <div class="money__total"><span>Total</span><span>${esc(fmt.bs(total))}</span></div>
        </div>
      </section>` : ''}
    <section class="section">
      <h2 class="section__title">Notas e historial</h2>
      ${!r.bloqueado ? `<a class="add-note" href="#/registro/${r.id}/nota">${ICO.plus}<span>Agregar nota o imprevisto</span></a>` : ''}
      <ol class="timeline">${timelineHtml(evs)}</ol>
    </section>
    ${firmas}
  `, { title: r.numero, back: '#/historial', bar });
}

/* ---------- nota ---------- */

function viewNota(id) {
  const r = rec.registro(id);
  if (!r) return viewNoEncontrado();
  if (r.bloqueado) return viewRegistro(id);
  if (!nota || nota.id !== id) nota = { id, texto: '', foto: null, signo: '+', monto: '' };
  return screen(`
    <p class="kicker">${esc(r.numero)} · ${esc(r.cliente?.nombre)}</p>
    <h1 class="title title--sm">Nueva nota</h1>
    <p class="lead">Anote lo que pasó: un imprevisto, un material extra, un cambio de fecha.</p>
    <div class="field">
      <label for="n-texto">¿Qué pasó?</label>
      <textarea id="n-texto" data-n="texto" rows="5" placeholder="Ej. Se encontró una fuga en la tubería; se cambió 1 m.">${esc(nota.texto)}</textarea>
    </div>
    <div class="field">
      <p class="label">Foto <span class="opt">opcional</span></p>
      ${nota.foto ? `<div class="photo-prev"><img src="${esc(nota.foto)}" alt="Foto seleccionada"><button type="button" class="btn btn--ghost btn--sm" data-act="nota-foto-quitar">${ICO.trash}Quitar foto</button></div>`
        : `<label class="photo-btn" for="n-foto">${ICO.camera}<span>Tomar o elegir foto</span></label>`}
      <input id="n-foto" class="visually-hidden" type="file" accept="image/*" capture="environment" data-act="nota-foto">
    </div>
    <div class="field">
      <p class="label">Cambio en el costo <span class="opt">opcional</span></p>
      ${seg('signo', nota.signo, [['+', 'Suma al costo'], ['-', 'Descuento']])}
      <label class="visually-hidden" for="n-monto">Monto en bolivianos</label>
      <div class="input-prefix gap-top"><span>Bs</span><input type="text" id="n-monto" data-n="monto" inputmode="decimal" value="${esc(nota.monto)}" placeholder="0"></div>
    </div>
    <p class="hint">La nota queda con fecha y hora, y no se puede borrar.</p>
  `, {
    title: 'Nota',
    back: `#/registro/${id}`,
    bar: `<a class="btn btn--ghost" href="#/registro/${id}">Cancelar</a><button type="button" class="btn btn--lg" data-act="nota-save">Guardar nota</button>`
  });
}

async function saveNota() {
  const monto = num(nota.monto);
  if (monto && (Number.isNaN(Number(monto)) || Number(monto) <= 0)) {
    alertDialog('Revise el monto', 'Escriba el monto en bolivianos, solo números.');
    return;
  }
  const ajuste = monto ? Number(monto) * (nota.signo === '-' ? -1 : 1) : null;
  if (!nota.texto.trim() && !nota.foto && !ajuste) {
    alertDialog('Nota vacía', 'Escriba qué pasó, agregue una foto o un cambio en el costo.');
    return;
  }
  try {
    await rec.agregarNota(nota.id, { texto: nota.texto.trim(), foto: nota.foto, ajuste });
    const id = nota.id;
    nota = null;
    go(`#/registro/${id}`);
    toast('Nota guardada');
    syncSoon();
  } catch (err) {
    alertDialog('No se pudo guardar', err.message);
  }
}

/* ---------- cerrar con firmas ---------- */

function padHtml(key, label) {
  return `<div class="pad" data-pad-wrap="${key}">
    <canvas class="pad__canvas" data-pad="${key}" role="img" aria-label="${esc(label)}: firme con el dedo dentro del recuadro"></canvas>
    <span class="pad__line" aria-hidden="true"></span>
    <span class="pad__hint" aria-hidden="true">Firme aquí con el dedo</span>
    <button type="button" class="pad__clear" data-pad-clear="${key}">Borrar</button>
  </div>`;
}

function viewCerrar(id) {
  const r = rec.registro(id);
  if (!r) return viewNoEncontrado();
  if (r.bloqueado) return viewRegistro(id);
  if (!cierre || cierre.id !== id) {
    cierre = { id, fechaFin: rec.todayISO(), trValor: '', trUnidad: r.tiempoEstimado?.unidad || 'horas', tecNombre: tecnico(), cliNombre: (r.cliente?.nombre || '').replace(/\s*\(ejemplo\)/, ''), cliCI: '' };
  }
  const c = cierre;
  return screen(`
    <p class="kicker">${esc(r.numero)} · ${esc(cat.servicio(r.servicio).corto)}</p>
    <h1 class="title title--sm">Terminar y firmar</h1>
    <div class="field-row">
      <div class="field"><label for="c-fecha">Fecha de cierre</label><input id="c-fecha" type="date" data-c="fechaFin" value="${esc(c.fechaFin)}"></div>
      <div class="field"><label for="c-tr">Tiempo real</label><input type="text" id="c-tr" data-c="trValor" inputmode="decimal" value="${esc(c.trValor)}" placeholder="${r.tiempoEstimado ? `Estimado ${esc(String(r.tiempoEstimado.valor))}` : 'Ej. 4'}"></div>
    </div>
    ${seg('trUnidad', c.trUnidad, [['horas', 'Horas'], ['dias', 'Días']])}
    <section class="fsec">
      <h2 class="fsec__title"><span>1</span>Firma del técnico</h2>
      <div class="field"><label for="c-tec">Nombre</label><input type="text" id="c-tec" data-c="tecNombre" value="${esc(c.tecNombre)}"></div>
      ${padHtml('tec', 'Firma del técnico')}
    </section>
    <section class="fsec">
      <h2 class="fsec__title"><span>2</span>Firma del cliente</h2>
      <div class="field-row">
        <div class="field"><label for="c-cli">Nombre de quien firma</label><input type="text" id="c-cli" data-c="cliNombre" value="${esc(c.cliNombre)}"></div>
        <div class="field field--sm"><label for="c-ci">CI <span class="opt">opcional</span></label><input type="text" id="c-ci" data-c="cliCI" value="${esc(c.cliCI)}" inputmode="numeric"></div>
      </div>
      ${padHtml('cli', 'Firma del cliente')}
    </section>
    <p class="note note--icon">${ICO.lock}<span>Al firmar, el registro queda cerrado y ya no se puede modificar.</span></p>
  `, {
    title: 'Firmas',
    back: `#/registro/${id}`,
    bar: `<a class="btn btn--ghost" href="#/registro/${id}">Cancelar</a><button type="button" class="btn btn--lg" data-act="cerrar-save">Firmar y cerrar</button>`
  });
}

function mountPads() {
  for (const p of Object.values(pads)) p.destroy();
  pads = {};
  document.querySelectorAll('[data-pad]').forEach((canvas) => {
    const key = canvas.getAttribute('data-pad');
    const wrap = canvas.closest('.pad');
    pads[key] = createSignaturePad(canvas, { onChange: (n) => wrap.classList.toggle('is-signed', n > 0) });
  });
}

async function saveCierre() {
  const c = cierre;
  const r = rec.registro(c.id);
  const problems = [];
  if (!c.tecNombre.trim()) problems.push('el nombre del técnico');
  if (!pads.tec || pads.tec.isEmpty()) problems.push('la firma del técnico');
  if (!c.cliNombre.trim()) problems.push('el nombre del cliente');
  if (!pads.cli || pads.cli.isEmpty()) problems.push('la firma del cliente');
  const tr = num(c.trValor);
  if (tr && (Number.isNaN(Number(tr)) || Number(tr) <= 0)) problems.push('un tiempo real válido (solo el número)');
  if (problems.length) {
    alertDialog('Falta completar', `Falta ${problems.join(', ')}.`);
    return;
  }
  const ok = await confirmDialog({
    title: '¿Cerrar el registro?',
    body: `Se guardarán las dos firmas y ${r.numero} quedará cerrado. Después ya no se podrán agregar notas ni cambiar el estado.`,
    ok: 'Firmar y cerrar',
    cancel: 'Revisar'
  });
  if (!ok) return;
  try {
    await rec.cerrarRegistro(c.id, {
      fechaFin: c.fechaFin,
      tiempoReal: tr ? { valor: Number(tr), unidad: c.trUnidad } : null,
      firmaTecnico: { nombre: c.tecNombre.trim(), png: pads.tec.toPNG() },
      firmaCliente: { nombre: c.cliNombre.trim(), ci: c.cliCI.trim(), png: pads.cli.toPNG() }
    });
    const id = c.id;
    cierre = null;
    go(`#/registro/${id}`);
    toast('Registro firmado y cerrado', { action: 'Enviar PDF', onAction: () => doPdf(id, 'share') });
    syncSoon();
  } catch (err) {
    alertDialog('No se pudo cerrar', err.message);
  }
}

/* ---------- PDF ---------- */

async function doPdf(id, mode) {
  const r = rec.registro(id);
  if (!r) return;
  toast('Preparando el PDF…');
  try {
    const out = await generarPdf(r, rec.eventosDe(id), { total: rec.totalRegistro(r) });
    if (mode === 'download') { downloadBlob(out.blob, out.filename); toast('PDF descargado'); return; }
    const res = await shareFile(out.blob, out.filename, {
      title: `${r.numero} · SEID`,
      text: `Informe ${r.numero} de ${r.servicioLabel} · SEID, ${tecnico()}`,
      type: 'application/pdf'
    });
    if (res === 'downloaded') toast('PDF descargado. Puede adjuntarlo en WhatsApp.');
    else if (res === 'shared') toast('PDF listo');
  } catch (err) {
    alertDialog('No se pudo crear el PDF', err.message || String(err));
  }
}

/* ---------- historial ---------- */

function filtrar() {
  const q = hf.q.trim().toLowerCase();
  const list = rec.registros().filter((r) => {
    if (hf.tipo === 'mantenimiento' && r.tipo !== 'mantenimiento') return false;
    if (hf.tipo === 'trabajo' && r.tipo !== 'trabajo') return false;
    if (hf.servicio && r.servicio !== hf.servicio) return false;
    if (hf.estado === 'firmado' && !r.bloqueado) return false;
    if (hf.estado && hf.estado !== 'firmado' && (r.estado !== hf.estado || r.bloqueado)) return false;
    if (hf.desde && r.fechaInicio < hf.desde) return false;
    if (hf.hasta && r.fechaInicio > hf.hasta) return false;
    if (q) {
      const blob = `${r.cliente?.nombre} ${r.cliente?.telefono} ${r.servicioLabel} ${r.numero} ${r.ubicacion} ${r.descripcion}`.toLowerCase();
      if (!blob.includes(q)) return false;
    }
    return true;
  });
  const by = {
    recientes: (a, b) => b.fechaInicio.localeCompare(a.fechaInicio) || String(b.createdAt).localeCompare(String(a.createdAt)),
    antiguos: (a, b) => a.fechaInicio.localeCompare(b.fechaInicio) || String(a.createdAt).localeCompare(String(b.createdAt)),
    cliente: (a, b) => (a.cliente?.nombre || '').localeCompare(b.cliente?.nombre || '', 'es'),
    precio: (a, b) => (rec.totalRegistro(b) || 0) - (rec.totalRegistro(a) || 0)
  };
  return list.sort(by[hf.orden] || by.recientes);
}

function filtrosActivos() {
  return ['servicio', 'estado', 'desde', 'hasta'].filter((k) => hf[k]).length + (hf.orden !== 'recientes' ? 1 : 0);
}

function resultadosHtml() {
  if (!rec.registros().length) {
    return emptyState('list', 'Todavía no hay registros', 'Aquí verá todos sus trabajos y mantenimientos, con su historial completo.', '<a class="btn" href="#/nuevo">Registrar el primero</a>');
  }
  const list = filtrar();
  if (!list.length) return emptyState('search', 'Sin resultados', 'Pruebe con otra palabra o quite los filtros.', '<button class="btn btn--ghost" type="button" data-act="hf-clear">Quitar filtros</button>');
  let out = `<p class="results-count" role="status">${list.length} ${list.length === 1 ? 'registro' : 'registros'}</p>`;
  if (hf.orden === 'recientes' || hf.orden === 'antiguos') {
    let mes = '';
    for (const r of list) {
      const m = r.fechaInicio.slice(0, 7);
      if (m !== mes) {
        if (mes) out += '</div>';
        mes = m;
        const [y, mm] = m.split('-').map(Number);
        out += `<h3 class="month">${esc(fmt.mesAnio(new Date(y, mm - 1, 1)))}</h3><div class="stack-sm">`;
      }
      out += registroCard(r);
    }
    out += '</div>';
  } else {
    out += `<div class="stack-sm">${list.map((r) => registroCard(r)).join('')}</div>`;
  }
  return out;
}

function clientesHtml() {
  const q = clienteQ.trim().toLowerCase();
  if (!rec.clientes().length) return emptyState('users', 'Todavía no hay clientes', 'Los clientes se guardan solos cuando registra un trabajo.');
  const rows = rec.clientes().map((c) => {
    const regs = rec.registros().filter((r) => r.clienteId === c.id);
    const last = regs.map((r) => r.fechaInicio).sort().pop() || '';
    const abiertos = regs.filter((r) => !r.bloqueado && r.estado !== 'terminado').length;
    return { c, n: regs.length, last, abiertos };
  }).filter(({ c }) => !q || `${c.nombre} ${c.telefono}`.toLowerCase().includes(q))
    .sort((a, b) => b.last.localeCompare(a.last));
  if (!rows.length) return emptyState('search', 'Sin resultados', 'No hay clientes con ese nombre o número.');
  return `<p class="results-count" role="status">${rows.length} ${rows.length === 1 ? 'cliente' : 'clientes'}</p><div class="stack-sm">${rows.map(({ c, n, last, abiertos }) => `<a class="ccard" href="#/cliente/${c.id}">
      <span class="avatar" aria-hidden="true">${esc((c.nombre || '?').trim().charAt(0).toUpperCase())}</span>
      <span class="ccard__body"><span class="ccard__name">${esc(c.nombre)}</span>
      <span class="ccard__sub">${n} ${n === 1 ? 'registro' : 'registros'}${abiertos ? ` · ${abiertos} abierto${abiertos === 1 ? '' : 's'}` : ''}${last ? ` · último ${esc(fmt.fecha(last, { corta: true }))}` : ''}</span></span>
      ${ICO.chev}
    </a>`).join('')}</div>`;
}

function viewHistorial(q) {
  if (q.vista) histVista = q.vista === 'clientes' ? 'clientes' : 'registros';
  const nf = filtrosActivos();
  const body = histVista === 'clientes'
    ? `<div class="search">${ICO.search}<label class="visually-hidden" for="cq">Buscar cliente</label><input id="cq" type="search" data-search="clientes" value="${esc(clienteQ)}" placeholder="Buscar cliente o número"></div>
       <div id="results">${clientesHtml()}</div>`
    : `<div class="search">${ICO.search}<label class="visually-hidden" for="hq">Buscar</label><input id="hq" type="search" data-search="registros" value="${esc(hf.q)}" placeholder="Buscar cliente, servicio o número"></div>
      <div class="filter-row">
        ${seg('hf-tipo', hf.tipo, [['todos', 'Todos'], ['trabajo', 'Trabajos'], ['mantenimiento', 'Manten.']])}
        <button type="button" class="btn btn--ghost btn--sm filter-btn" data-act="hf-toggle" aria-expanded="${hfOpen}" aria-controls="filtros">${ICO.filter}Filtros${nf ? ` <span class="count">${nf}</span>` : ''}</button>
      </div>
      <div id="filtros" class="filters card" ${hfOpen ? '' : 'hidden'}>
        <div class="field">
          <label for="hf-serv">Servicio</label>
          <select id="hf-serv" data-hf="servicio">
            <option value="">Todos los servicios</option>
            ${cat.SERVICIOS.map((s) => `<option value="${s.key}" ${hf.servicio === s.key ? 'selected' : ''}>${esc(s.label)}</option>`).join('')}
          </select>
        </div>
        <div class="field">
          <label for="hf-estado">Estado</label>
          <select id="hf-estado" data-hf="estado">
            <option value="">Todos</option>
            ${cat.ESTADOS.map((e) => `<option value="${e.key}" ${hf.estado === e.key ? 'selected' : ''}>${esc(e.label)}${e.key === 'terminado' ? ' (sin firmar)' : ''}</option>`).join('')}
            <option value="firmado" ${hf.estado === 'firmado' ? 'selected' : ''}>Firmado y cerrado</option>
          </select>
        </div>
        <div class="field-row">
          <div class="field"><label for="hf-desde">Desde</label><input id="hf-desde" type="date" data-hf="desde" value="${esc(hf.desde)}"></div>
          <div class="field"><label for="hf-hasta">Hasta</label><input id="hf-hasta" type="date" data-hf="hasta" value="${esc(hf.hasta)}"></div>
        </div>
        <div class="field">
          <label for="hf-orden">Ordenar por</label>
          <select id="hf-orden" data-hf="orden">
            <option value="recientes" ${hf.orden === 'recientes' ? 'selected' : ''}>Más recientes primero</option>
            <option value="antiguos" ${hf.orden === 'antiguos' ? 'selected' : ''}>Más antiguos primero</option>
            <option value="cliente" ${hf.orden === 'cliente' ? 'selected' : ''}>Cliente (A a Z)</option>
            <option value="precio" ${hf.orden === 'precio' ? 'selected' : ''}>Precio (mayor a menor)</option>
          </select>
        </div>
        <button type="button" class="btn btn--ghost btn--block btn--sm" data-act="hf-clear">Quitar filtros</button>
      </div>
      <div id="results">${resultadosHtml()}</div>`;
  return screen(`
    <h1 class="title">Historial</h1>
    ${seg('hist-vista', histVista, [['registros', 'Registros'], ['clientes', 'Por cliente']])}
    <div class="gap"></div>
    ${body}
  `, { tab: 'historial' });
}

function viewCliente(id) {
  const c = rec.cliente(id);
  if (!c) return viewNoEncontrado();
  const regs = rec.registros().filter((r) => r.clienteId === id).sort((a, b) => b.fechaInicio.localeCompare(a.fechaInicio));
  const avisos = rec.recordatorios().filter((a) => a.registro.clienteId === id);
  const total = regs.filter((r) => r.estado === 'terminado').reduce((s, r) => s + (rec.totalRegistro(r) || 0), 0);
  return screen(`
    <div class="client-head">
      <span class="avatar avatar--lg" aria-hidden="true">${esc((c.nombre || '?').charAt(0).toUpperCase())}</span>
      <div><h1 class="title title--sm">${esc(c.nombre)}</h1><p class="muted">${esc(fmt.telefono(c.telefono))}</p></div>
    </div>
    <div class="row-gap">
      ${waIcon(c.telefono, `Hola, le escribe ${tecnico()} de SEID.`, 'WhatsApp')}
      <a class="btn btn--ghost btn--sm" href="#/nuevo?cliente=${c.id}">${ICO.plus}Nuevo registro</a>
    </div>
    <div class="stats">
      <div class="stat"><span class="stat__num">${regs.length}</span><span class="stat__lbl">Registros</span></div>
      <div class="stat"><span class="stat__num">${esc(fmt.bs(total))}</span><span class="stat__lbl">En trabajos terminados</span></div>
    </div>
    ${avisos.length ? `<section class="section"><h2 class="section__title">Próximo mantenimiento</h2><div class="stack-sm">${avisos.map(avisoCard).join('')}</div></section>` : ''}
    <section class="section">
      <h2 class="section__title">Historial del cliente</h2>
      ${regs.length ? `<div class="stack-sm">${regs.map((r) => registroCard(r, { showClient: false })).join('')}</div>` : emptyState('list', 'Sin registros', 'Este cliente todavía no tiene trabajos.')}
    </section>
  `, { title: 'Cliente', back: '#/historial?vista=clientes', tab: 'historial' });
}

/* ---------- calendario ---------- */

function viewCalendario() {
  const y = calCursor.getFullYear();
  const m = calCursor.getMonth();
  const offset = (new Date(y, m, 1).getDay() + 6) % 7;
  const days = new Date(y, m + 1, 0).getDate();
  const today = rec.todayISO();
  const regsByDay = {};
  for (const r of rec.registros()) (regsByDay[r.fechaInicio] ||= []).push(r);
  const avisosByDay = {};
  for (const a of rec.recordatorios()) (avisosByDay[a.fecha] ||= []).push(a);
  const cells = [];
  for (let i = 0; i < offset; i++) cells.push('<span class="cal__cell is-blank"></span>');
  for (let d = 1; d <= days; d++) {
    const iso = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const has = regsByDay[iso]?.length || 0;
    const av = avisosByDay[iso]?.length || 0;
    const label = `${fmt.fecha(iso, { dia: true })}${has ? `, ${has} ${has === 1 ? 'registro' : 'registros'}` : ''}${av ? `, ${av} por hacer` : ''}`;
    cells.push(`<button type="button" class="cal__cell ${iso === today ? 'is-today' : ''} ${iso === calSel ? 'is-sel' : ''}" data-day="${iso}" aria-pressed="${iso === calSel}" aria-label="${esc(label)}">
      <span>${d}</span><span class="cal__marks">${has ? '<i class="mk"></i>' : ''}${av ? '<i class="mk mk--ring"></i>' : ''}</span></button>`);
  }
  const selRegs = regsByDay[calSel] || [];
  const selAv = avisosByDay[calSel] || [];
  const proximos = rec.recordatorios({ dentroDeDias: 60 }).filter((a) => a.dias >= 0);
  return screen(`
    <h1 class="title">Calendario</h1>
    <div class="cal card">
      <div class="cal__head">
        <button type="button" class="icon-btn" data-cal="-1" aria-label="Mes anterior">${ICO.chevL}</button>
        <p class="cal__month" aria-live="polite">${esc(fmt.mesAnio(calCursor))}</p>
        <button type="button" class="icon-btn" data-cal="1" aria-label="Mes siguiente">${ICO.chev}</button>
      </div>
      <div class="cal__grid cal__grid--dow" aria-hidden="true">${['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((x) => `<span>${x}</span>`).join('')}</div>
      <div class="cal__grid">${cells.join('')}</div>
      <p class="cal__legend"><span><i class="mk"></i>Registro</span><span><i class="mk mk--ring"></i>Mantenimiento por hacer</span></p>
    </div>
    <section class="section">
      <h2 class="section__title">${esc(fmt.fecha(calSel, { dia: true }))}</h2>
      <div class="stack-sm">
        ${selAv.map((a) => avisoCard(a)).join('')}
        ${selRegs.map((r) => registroCard(r)).join('')}
      </div>
      ${!selRegs.length && !selAv.length ? '<p class="muted">Nada registrado este día.</p>' : ''}
      <button type="button" class="btn btn--ghost btn--block btn--sm gap-top" data-act="nuevo-en-dia">${ICO.plus}Registrar para este día</button>
    </section>
    <section class="section">
      <h2 class="section__title">Mantenimientos de los próximos 60 días</h2>
      ${proximos.length ? `<div class="stack-sm">${proximos.map(avisoCard).join('')}</div>` : '<p class="muted">No hay mantenimientos programados.</p>'}
    </section>
  `, { tab: 'calendario' });
}

/* ---------- ajustes ---------- */

function viewAjustes() {
  const lastBackup = store.meta('lastBackupAt');
  const notif = 'Notification' in window ? Notification.permission : 'unsupported';
  const nReg = rec.registros().filter((r) => !r.demo).length;
  return screen(`
    <h1 class="title">Ajustes</h1>
    <section class="section">
      <h2 class="section__title">Respaldo de datos</h2>
      <div class="card stack">
        <p>${api.enabled() ? 'Sus datos se guardan en este teléfono y se copian al servidor de SEID cuando hay internet. Igual puede guardar una copia propia.' : 'Sus datos están guardados <strong>solo en este teléfono</strong>.'} Guarde una copia cada semana (en WhatsApp, Drive o correo) para no perder nada si cambia o pierde el teléfono.</p>
        <p class="muted small">${lastBackup ? `Último respaldo: ${esc(fmt.fechaHora(lastBackup))}` : 'Todavía no hizo ningún respaldo.'} · ${nReg} ${nReg === 1 ? 'registro' : 'registros'} propios</p>
        <button type="button" class="btn btn--block" data-act="backup">${ICO.share}Guardar respaldo</button>
        <label class="btn btn--ghost btn--block" for="restore-file">${ICO.upload}Restaurar desde un respaldo</label>
        <input id="restore-file" class="visually-hidden" type="file" accept="application/json,.json" data-act="restore">
        <p class="hint" id="storage-info"></p>
      </div>
    </section>
    <section class="section">
      <h2 class="section__title">Avisos de mantenimiento</h2>
      <div class="card stack">
        <p>Después de cada instalación o mantenimiento de aire, la app programa el siguiente a los 6 meses y le avisa 15 días antes.</p>
        ${notif === 'granted' ? `<p class="ok">${ICO.check}<span>Avisos activados en este teléfono.</span></p><button type="button" class="btn btn--ghost btn--block btn--sm" data-act="notif-test">Probar un aviso</button>`
          : notif === 'denied' ? '<p class="muted">Los avisos están bloqueados. Actívelos en los ajustes del navegador para este sitio.</p>'
          : notif === 'unsupported' ? '<p class="muted">En iPhone, los avisos funcionan después de instalar la app en la pantalla de inicio.</p>'
          : `<button type="button" class="btn btn--block" data-act="notif">${ICO.bell}Activar avisos</button>`}
      </div>
    </section>
    <section class="section">
      <h2 class="section__title">Mi cuenta</h2>
      <div class="card stack">
        <div class="field"><label for="a-nombre">Nombre del técnico (sale en el PDF)</label><input type="text" id="a-nombre" value="${esc(tecnico())}" data-act="tecnico" autocomplete="name"></div>
        <button type="button" class="btn btn--ghost btn--block" data-act="pin-cambiar">${ICO.lock}${auth.hasPin() ? 'Cambiar PIN' : 'Crear PIN'}</button>
        ${auth.hasPin() ? '<button type="button" class="btn btn--ghost btn--block" data-act="bloquear">Bloquear ahora</button>' : ''}
        ${api.enabled() ? '<button type="button" class="btn btn--ghost btn--block" data-act="logout">Cerrar sesión</button>' : ''}
      </div>
    </section>
    <section class="section">
      <h2 class="section__title">Instalar en el teléfono</h2>
      <div class="card stack">
        ${installPrompt ? `<button type="button" class="btn btn--block" data-act="install">${ICO.phone}Instalar la app</button>` : ''}
        <p><strong>Android (Chrome):</strong> menú ⋮ y luego «Instalar aplicación» o «Agregar a la pantalla principal».</p>
        <p><strong>iPhone (Safari):</strong> botón Compartir y luego «Agregar a inicio».</p>
      </div>
    </section>
    <section class="section">
      <h2 class="section__title">Sincronización</h2>
      <div class="card stack">
        <p>${api.enabled() ? 'Conectado al servidor de SEID.' : 'Por ahora todo queda en este teléfono. La copia en la nube llega en la próxima versión, sin perder lo que registre desde hoy.'}</p>
        <p class="muted small" id="pending-info"></p>
        ${api.enabled() ? '<button type="button" class="btn btn--ghost btn--block" data-act="sync">Sincronizar ahora</button>' : ''}
      </div>
    </section>
    <section class="section">
      <h2 class="section__title">Datos de ejemplo</h2>
      <div class="card stack">
        ${sample.hayEjemplo()
          ? '<p>Hay datos de ejemplo cargados. Al borrarlos, sus registros reales se mantienen.</p><button type="button" class="btn btn--block" data-act="empezar">Borrar ejemplos y empezar</button>'
          : '<p>Puede cargar unos registros ficticios para mostrar la app. Después se borran con un toque, sin tocar sus datos.</p><button type="button" class="btn btn--ghost btn--block" data-act="cargar-ejemplo">Cargar datos de ejemplo</button>'}
      </div>
    </section>
    <section class="section">
      <h2 class="section__title">Zona de cuidado</h2>
      <div class="card stack">
        <p>Borra todos los clientes, trabajos y mantenimientos de este teléfono. Haga un respaldo antes.</p>
        <button type="button" class="btn btn--danger-ghost btn--block" data-act="borrar-todo">${ICO.trash}Borrar todos los datos</button>
      </div>
    </section>
    <p class="version">SEID · Panel de trabajo · versión ${esc(APP_VERSION)}</p>
  `, { tab: 'ajustes' });
}

function viewNoEncontrado() {
  return screen(emptyState('search', 'No se encontró', 'Puede que el registro se haya borrado o el enlace esté incompleto.', '<a class="btn" href="#/inicio">Ir al inicio</a>'), { back: '#/inicio' });
}

/* ---------- render ---------- */

function render() {
  const route = parseRoute();
  const hash = location.hash;
  const sameView = hash === lastHash;
  const scroll = sameView ? window.scrollY : 0;
  let html;
  let plain = false;
  if (!api.loggedIn() && !loginLuego()) { html = viewLogin(); plain = true; }
  else if (!store.meta('setupDone')) { html = viewBienvenida(); plain = true; }
  else if (auth.isLocked()) { html = viewBloqueo(); plain = true; }
  else {
    switch (route.name) {
      case 'inicio': html = viewInicio(); break;
      case 'nuevo': html = route.id ? viewForm(route.id, route.q) : viewNuevo(route.q); break;
      case 'registro':
        html = route.sub === 'nota' ? viewNota(route.id) : route.sub === 'cerrar' ? viewCerrar(route.id) : viewRegistro(route.id);
        break;
      case 'historial': html = viewHistorial(route.q); break;
      case 'cliente': html = viewCliente(route.id); break;
      case 'calendario': html = viewCalendario(); break;
      case 'ajustes': html = viewAjustes(); break;
      default: html = viewNoEncontrado();
    }
  }
  const lockedView = plain ? 'plain' : 'app';
  const wasPlain = app.dataset.view;
  app.dataset.view = lockedView;
  app.innerHTML = html;
  const changed = !sameView || wasPlain !== lockedView;
  lastHash = hash;
  window.scrollTo(0, changed ? 0 : scroll);
  if (changed) {
    const h = app.querySelector('h1');
    if (h) { h.setAttribute('tabindex', '-1'); h.focus({ preventScroll: true }); }
  }
  if (app.querySelector('[data-pad]')) mountPads();
  if (!plain && route.name === 'ajustes') fillAjustesInfo();
  const t = app.querySelector('.topbar__title')?.textContent || app.querySelector('h1')?.textContent || '';
  document.title = t ? `${t.trim()} · SEID` : 'SEID · Panel de trabajo';
}

async function fillAjustesInfo() {
  const el = document.getElementById('pending-info');
  if (el) {
    const n = await store.pendingCount();
    el.textContent = api.enabled()
      ? (n ? `${n} cambios esperando para subir.` : 'Todo está al día.')
      : `${n} cambios guardados en este teléfono, listos para subir a la nube cuando esté activa.`;
  }
  try {
    const info = document.getElementById('storage-info');
    if (info && navigator.storage && navigator.storage.estimate) {
      const est = await navigator.storage.estimate();
      const persisted = navigator.storage.persisted ? await navigator.storage.persisted() : false;
      info.textContent = `${persisted ? 'El teléfono protege estos datos contra borrado automático. ' : ''}Espacio usado: ${(est.usage / 1048576).toFixed(1).replace('.', ',')} MB.`;
    }
  } catch { /* */ }
}

/* ---------- respaldo ---------- */

async function doBackup() {
  const snap = store.snapshot();
  snap.clientes = snap.clientes.filter((c) => !c.demo);
  snap.registros = snap.registros.filter((r) => !r.demo);
  const ids = new Set(snap.registros.map((r) => r.id));
  snap.eventos = snap.eventos.filter((e) => !e.demo && ids.has(e.registroId));
  snap.firmas = (snap.firmas || []).filter((f) => ids.has(f.registroId));
  snap.fotos = (snap.fotos || []).filter((f) => ids.has(f.registroId));
  const blob = new Blob([JSON.stringify(snap)], { type: 'application/json' });
  const name = `SEID-respaldo-${rec.todayISO()}.json`;
  const res = await shareFile(blob, name, { title: 'Respaldo SEID', text: `Respaldo de SEID del ${fmt.fecha(rec.todayISO())}`, type: 'application/json' });
  if (res === 'aborted') return;
  await store.setMeta('lastBackupAt', new Date().toISOString());
  toast(res === 'shared' ? 'Respaldo guardado' : 'Respaldo descargado en el teléfono');
  render();
}

async function doRestore(file) {
  let data;
  try { data = JSON.parse(await file.text()); } catch { alertDialog('Archivo no válido', 'No se pudo leer el archivo. Elija un respaldo de SEID (.json).'); return; }
  if (!data || data.app !== 'SEID' || !Array.isArray(data.registros)) { alertDialog('Archivo no válido', 'Este archivo no es un respaldo de SEID.'); return; }
  const n = data.registros.length;
  const hay = rec.registros().some((r) => !r.demo);
  const ok = await confirmDialog({
    title: 'Restaurar respaldo',
    body: `El respaldo del ${fmt.fechaHora(data.exportadoEl)} tiene ${n} ${n === 1 ? 'registro' : 'registros'}.${hay ? ' Se combinará con lo que ya tiene; si un registro está en los dos, se queda la versión más reciente.' : ''}`,
    ok: 'Restaurar'
  });
  if (!ok) return;
  try {
    await store.restore(data, 'merge');
    toast('Respaldo restaurado');
    render();
  } catch (err) {
    alertDialog('No se pudo restaurar', err.message);
  }
}

/* ---------- avisos (notificaciones locales) ---------- */

async function checkAvisos() {
  if (!('Notification' in window) || Notification.permission !== 'granted' || !navigator.serviceWorker) return;
  // Con servidor y Web Push activo, los avisos los manda el servidor (evita duplicados).
  if (api.enabled() && store.meta('pushSub')) return;
  const reg = await navigator.serviceWorker.ready.catch(() => null);
  if (!reg) return;
  const hoy = rec.todayISO();
  const avisados = new Set(store.meta('avisados', []));
  let changed = false;
  for (const a of rec.recordatorios({ dentroDeDias: 15 })) {
    const key = `${a.registro.id}:${a.fecha}`;
    if (avisados.has(key) || rec.fechaAviso(a.fecha) > hoy || a.registro.demo) continue;
    await reg.showNotification(`Mantenimiento: ${fmt.diasTexto(a.dias).toLowerCase()}`, {
      body: `${a.registro.cliente?.nombre} · ${fmt.fecha(a.fecha)}. Toque para ver el registro.`,
      tag: `mant-${a.registro.id}`,
      icon: 'icons/icon-192.png',
      badge: 'icons/icon-192.png',
      data: { url: `#/registro/${a.registro.id}` }
    });
    avisados.add(key);
    changed = true;
  }
  if (changed) await store.setMeta('avisados', [...avisados]);
}

async function enableNotifications() {
  const p = await Notification.requestPermission();
  if (p === 'granted') {
    toast('Avisos activados');
    try { await api.ensurePush(); } catch { /* se reintenta al abrir la app */ }
    await registerPeriodic();
    checkAvisos();
  } else toast('No se activaron los avisos');
  render();
}

async function registerPeriodic() {
  try {
    const reg = await navigator.serviceWorker.ready;
    if ('periodicSync' in reg) await reg.periodicSync.register('seid-avisos', { minInterval: 12 * 60 * 60 * 1000 });
  } catch { /* no disponible: se revisa al abrir la app */ }
}

/* ---------- sincronización ---------- */

let syncTimer = 0;
function syncSoon(delay = 1500) {
  if (!api.enabled()) return;
  clearTimeout(syncTimer);
  syncTimer = setTimeout(async () => {
    try {
      const out = await api.sync();
      if (out && out.rejected) toast(`El servidor no aceptó ${out.rejected} cambio(s). Se mantuvo su versión.`);
      if (out && !out.skipped && ['inicio', 'historial', 'calendario'].includes(parseRoute().name) && !document.querySelector('.dialog, input:focus, textarea:focus')) render();
    } catch { /* sin red: se reintenta después */ }
  }, delay);
}

/* ---------- eventos ---------- */

function setPath(obj, path, value) {
  const keys = path.split('.');
  let o = obj;
  for (const k of keys.slice(0, -1)) o = o[k] ||= {};
  o[keys[keys.length - 1]] = value;
}

function redraw() { saveDraft(); render(); }

async function onClick(e) {
  const t = e.target;
  if (!(t instanceof Element)) return;
  if (!auth.isLocked()) auth.markActive();

  const key = t.closest('[data-key]');
  if (key) { await pinKey(key.getAttribute('data-key')); return; }

  const segBtn = t.closest('[data-seg]');
  if (segBtn) { await onSeg(segBtn.getAttribute('data-seg'), segBtn.getAttribute('data-val'), segBtn); return; }

  if (draft) {
    const pick = t.closest('[data-pick-cliente]');
    if (pick) {
      const c = rec.cliente(pick.getAttribute('data-pick-cliente'));
      if (c) { draft.clienteId = c.id; draft.nombre = c.nombre; draft.telefono = (c.telefono || '').replace(/^591/, ''); redraw(); }
      return;
    }
    const eqt = t.closest('[data-eqtipo]');
    if (eqt) { const v = eqt.getAttribute('data-eqtipo'); draft.equipo.tipo = draft.equipo.tipo === v ? '' : v; redraw(); return; }
    const tier = t.closest('[data-tier]');
    if (tier) { const v = tier.getAttribute('data-tier'); draft.tier = draft.tier === v ? '' : v; applyPrice(draft); redraw(); return; }
    const ex = t.closest('[data-extra]');
    if (ex) { const k = ex.getAttribute('data-extra'); draft.extras[k] = draft.extras[k] ? 0 : 1; applyPrice(draft); redraw(); return; }
    const metro = t.closest('[data-metro]');
    if (metro) { draft.extras.tuberia = Math.max(0, Math.min(99, Number(draft.extras.tuberia || 0) + Number(metro.getAttribute('data-metro')))); applyPrice(draft); redraw(); return; }
    const chk = t.closest('[data-check]');
    if (chk) { const k = chk.getAttribute('data-check'); draft.checklist[k] = !draft.checklist[k]; redraw(); return; }
  }

  const day = t.closest('[data-day]');
  if (day) { calSel = day.getAttribute('data-day'); render(); return; }
  const calNav = t.closest('[data-cal]');
  if (calNav) { calCursor = new Date(calCursor.getFullYear(), calCursor.getMonth() + Number(calNav.getAttribute('data-cal')), 1); render(); return; }

  const desc = t.closest('[data-descartar]');
  if (desc) {
    const ok = await confirmDialog({ title: 'Descartar recordatorio', body: 'Ya no se mostrará este mantenimiento pendiente. ¿Continuar?', ok: 'Descartar' });
    if (ok) { await rec.descartarRecordatorio(desc.getAttribute('data-descartar')); toast('Recordatorio descartado'); render(); }
    return;
  }
  const foto = t.closest('[data-foto]');
  if (foto) { const ev = D().eventos.find((x) => x.id === foto.getAttribute('data-foto')); if (ev?.fotoId) viewPhoto(rec.fotoSrc(ev.fotoId)); return; }
  const pdf = t.closest('[data-pdf]');
  if (pdf) { doPdf(pdf.getAttribute('data-pdf'), pdf.getAttribute('data-mode')); return; }
  const padClear = t.closest('[data-pad-clear]');
  if (padClear) { pads[padClear.getAttribute('data-pad-clear')]?.clear(); return; }

  const act = t.closest('[data-act]');
  if (!act || act.tagName === 'INPUT') return;
  switch (act.getAttribute('data-act')) {
    case 'draft-save': await saveRegistro(); break;
    case 'draft-cancel': {
      const ok = await confirmDialog({ title: 'Descartar registro', body: 'Se borrará lo que escribió en este formulario.', ok: 'Descartar', danger: true });
      if (ok) { draft = null; saveDraft(); go('#/nuevo'); }
      break;
    }
    case 'cliente-otro': draft.clienteId = ''; draft.nombre = ''; draft.telefono = ''; redraw(); document.getElementById('f-nombre')?.focus(); break;
    case 'precio-auto': draft.precioManual = false; applyPrice(draft); redraw(); break;
    case 'check-all': {
      const all = cat.CHECKLIST_AIRE.every((i) => draft.checklist[i.key]);
      for (const i of cat.CHECKLIST_AIRE) draft.checklist[i.key] = !all;
      redraw();
      break;
    }
    case 'nota-save': await saveNota(); break;
    case 'nota-foto-quitar': nota.foto = null; render(); break;
    case 'cerrar-save': await saveCierre(); break;
    case 'hf-toggle': hfOpen = !hfOpen; render(); break;
    case 'hf-clear': hf = { q: '', tipo: 'todos', servicio: '', estado: '', desde: '', hasta: '', orden: 'recientes' }; render(); break;
    case 'nuevo-en-dia':
      draftDate = calSel;
      if (draft && !draft.nombre) draft = null;
      go('#/nuevo');
      break;
    case 'empezar': {
      const ok = await confirmDialog({ title: 'Empezar a usar', body: 'Se borrarán los datos de ejemplo. Sus registros reales (si tiene) se mantienen.', ok: 'Borrar ejemplos' });
      if (ok) { await sample.borrarEjemplo(); toast('Listo. Ya puede registrar sus trabajos.'); go('#/inicio'); }
      break;
    }
    case 'backup': await doBackup(); break;
    case 'notif': await enableNotifications(); break;
    case 'notif-test': {
      if (api.enabled() && store.meta('pushSub')) {
        try { await api.testPush(); toast('Aviso de prueba enviado'); } catch (err) { toast(err.message); }
        break;
      }
      const reg = await navigator.serviceWorker.ready;
      const r = rec.registros()[0];
      await reg.showNotification('Aviso de prueba', { body: 'Así le avisaremos de los mantenimientos. Toque para abrir.', icon: 'icons/icon-192.png', tag: 'prueba', data: { url: r ? `#/registro/${r.id}` : '#/inicio' } });
      break;
    }
    case 'install':
      if (installPrompt) {
        installPrompt.prompt();
        const ch = await installPrompt.userChoice;
        installPrompt = null;
        if (ch.outcome === 'accepted') toast('App instalada');
        render();
      }
      break;
    case 'install-hide': await store.setMeta('installHidden', true); render(); break;
    case 'cargar-ejemplo': await sample.cargarEjemplo(); toast('Datos de ejemplo cargados'); go('#/inicio'); break;
    case 'borrar-todo': {
      const ok = await confirmDialog({ title: '¿Borrar todos los datos?', body: 'Se borrarán todos los clientes, trabajos, mantenimientos, notas y firmas de este teléfono. No se puede deshacer.', ok: 'Borrar todo', danger: true });
      if (!ok) break;
      const ok2 = await confirmDialog({ title: 'Confirme otra vez', body: '¿Seguro? Si no tiene respaldo, se pierde todo.', ok: 'Sí, borrar todo', danger: true });
      if (ok2) { await store.clearData(); draft = null; saveDraft(); toast('Datos borrados'); go('#/inicio'); }
      break;
    }
    case 'pin-cambiar': await cambiarPin(); break;
    case 'bloquear': auth.lock(); pinBuffer = ''; pinFails = 0; render(); break;
    case 'pin-olvide': await olvidePin(); break;
    case 'logout': {
      const pend = await store.pendingCount();
      const ok = await confirmDialog({
        title: 'Cerrar sesión',
        body: pend ? `Hay ${pend} cambio(s) sin subir. Se quedan en el teléfono y se suben cuando vuelva a entrar.` : 'Los registros se quedan en este teléfono.',
        ok: 'Cerrar sesión'
      });
      if (!ok) break;
      await api.logout();
      try { sessionStorage.removeItem('seid-login-luego'); } catch { /* */ }
      render();
      break;
    }
    case 'login-luego': try { sessionStorage.setItem('seid-login-luego', '1'); } catch { /* */ } render(); break;
    case 'sync':
      try { await api.sync(); toast('Sincronizado'); } catch (err) { toast(err.message); }
      render();
      break;
    default: break;
  }
}

async function onSeg(name, val, btn) {
  const group = btn.closest('.seg');
  const selectOnly = () => group.querySelectorAll('button').forEach((b) => {
    const on = b === btn;
    b.classList.toggle('is-on', on);
    b.setAttribute('aria-checked', String(on));
  });
  if (name === 'teUnidad' || name === 'estado') { if (draft) { draft[name] = val; saveDraft(); } selectOnly(); return; }
  if (name === 'trUnidad') { if (cierre) cierre.trUnidad = val; selectOnly(); return; }
  if (name === 'signo') { if (nota) nota.signo = val; selectOnly(); return; }
  if (name === 'hf-tipo') { hf.tipo = val; selectOnly(); updateResults(); return; }
  if (name === 'hist-vista') { histVista = val; history.replaceState(null, '', `#/historial${val === 'clientes' ? '?vista=clientes' : ''}`); lastHash = location.hash; render(); return; }
  if (name === 'estado-reg') {
    const id = parseRoute().id;
    const r = rec.registro(id);
    if (!r || r.estado === val) return;
    try {
      if (val === 'terminado') {
        const firmar = await confirmDialog({ title: '¿Trabajo terminado?', body: 'Puede cerrarlo ahora con las firmas, o solo marcarlo como terminado y firmar después.', ok: 'Firmar ahora', cancel: 'Solo marcar' });
        await rec.cambiarEstado(id, val);
        syncSoon();
        if (firmar) { go(`#/registro/${id}/cerrar`); return; }
      } else {
        await rec.cambiarEstado(id, val);
        syncSoon();
      }
      toast(`Estado: ${cat.estadoLabel(val)}`);
      render();
    } catch (err) {
      alertDialog('No se pudo cambiar', err.message);
    }
  }
}

function updateResults() {
  const box = document.getElementById('results');
  if (!box) return;
  box.innerHTML = histVista === 'clientes' ? clientesHtml() : resultadosHtml();
  const btn = document.querySelector('[data-act="hf-toggle"]');
  if (btn) {
    const nf = filtrosActivos();
    btn.innerHTML = `${ICO.filter}Filtros${nf ? ` <span class="count">${nf}</span>` : ''}`;
  }
}

function clearFieldError(t) {
  if (t.getAttribute('aria-invalid')) {
    t.removeAttribute('aria-invalid');
    t.removeAttribute('aria-describedby');
    t.closest('.field')?.querySelector('.field-error')?.remove();
  }
}

function onInput(e) {
  const t = e.target;
  if (!auth.isLocked()) auth.markActive();
  if (t.matches('[data-d]') && draft) {
    const path = t.getAttribute('data-d');
    setPath(draft, path, t.value);
    if (path === 'precio') draft.precioManual = t.value.trim() !== '';
    if (path === 'nombre') {
      if (draft.clienteId) { const c = rec.cliente(draft.clienteId); if (!c || c.nombre !== t.value) draft.clienteId = ''; }
      const box = document.getElementById('sugerencias');
      if (box) box.innerHTML = sugerencias(draft);
    }
    clearFieldError(t);
    saveDraft();
    return;
  }
  if (t.matches('[data-n]') && nota) { nota[t.getAttribute('data-n')] = t.value; return; }
  if (t.matches('[data-c]') && cierre) { cierre[t.getAttribute('data-c')] = t.value; return; }
  if (t.matches('[data-search="registros"]')) { hf.q = t.value; updateResults(); return; }
  if (t.matches('[data-search="clientes"]')) { clienteQ = t.value; updateResults(); }
}

async function onChange(e) {
  const t = e.target;
  if (t.matches('[data-hf]')) { hf[t.getAttribute('data-hf')] = t.value; updateResults(); return; }
  if (t.matches('[data-act="tecnico"]')) { await store.setMeta('tecnicoNombre', t.value.trim() || TECNICO_NOMBRE); toast('Nombre guardado'); return; }
  if (t.matches('[data-act="nota-foto"]') && t.files && t.files[0]) {
    try { nota.foto = await compressPhoto(t.files[0]); render(); } catch (err) { alertDialog('Foto', err.message); }
    return;
  }
  if (t.matches('[data-act="restore"]') && t.files && t.files[0]) { await doRestore(t.files[0]); t.value = ''; }
}

async function onSubmit(e) {
  const f = e.target;
  e.preventDefault();
  if (f.id === 'form-bienvenida') {
    const modo = e.submitter?.value || 'vacio';
    const nombre = f.nombre.value.trim();
    const pin = f.pin.value.trim();
    if (!nombre) welcomeErr = 'Escriba su nombre.';
    else if (!/^\d{4}$/.test(pin)) welcomeErr = 'El PIN debe tener exactamente 4 números.';
    else if (pin !== f.pin2.value.trim()) welcomeErr = 'Los dos PIN no coinciden.';
    else welcomeErr = '';
    if (welcomeErr) {
      render();
      const el = document.getElementById(welcomeErr.includes('nombre') ? 'w-nombre' : 'w-pin');
      if (el) { el.value = welcomeErr.includes('nombre') ? '' : ''; el.focus(); }
      document.getElementById('w-nombre').value = nombre;
      return;
    }
    await store.setMeta('tecnicoNombre', nombre);
    await auth.setPin(pin);
    if (modo === 'ejemplo') await sample.cargarEjemplo();
    await store.setMeta('setupDone', true);
    store.requestPersist().then((p) => store.setMeta('persisted', p));
    go('#/inicio');
    return;
  }
  if (f.id === 'form-login') {
    const btn = f.querySelector('button[type="submit"]');
    btn.disabled = true;
    try {
      await api.login({ email: f.email.value.trim(), password: f.password.value });
      lastHash = '';
      render();
      syncSoon(0);
      if ('Notification' in window && Notification.permission === 'granted') api.ensurePush().catch(() => {});
    } catch (err) {
      btn.disabled = false;
      alertDialog('No se pudo entrar', err.status === 401 ? 'El correo o la contraseña no son correctos.' : err.code?.startsWith('retry:') || err.status === 429 ? 'Demasiados intentos. Espere 15 minutos.' : err.message);
    }
  }
}

async function pinKey(k) {
  if (Date.now() < pinBlockedUntil) return;
  if (k === 'del') { pinBuffer = pinBuffer.slice(0, -1); render(); return; }
  if (pinBuffer.length >= 4) return;
  pinBuffer += k;
  render();
  if (pinBuffer.length === 4) {
    const ok = await auth.checkPin(pinBuffer);
    pinBuffer = '';
    if (ok) { pinFails = 0; lastHash = ''; render(); checkAvisos(); return; }
    pinFails += 1;
    if (pinFails >= 5) {
      pinBlockedUntil = Date.now() + 30000;
      pinFails = 0;
      setTimeout(render, 30500);
    }
    render();
    if (navigator.vibrate) navigator.vibrate(120);
  }
}

async function cambiarPin() {
  const html = `<div class="stack"><div class="field"><label for="np1">PIN nuevo (4 números)</label><input id="np1" type="password" inputmode="numeric" pattern="[0-9]*" maxlength="4" autocomplete="new-password"></div>
    <div class="field"><label for="np2">Repita el PIN</label><input id="np2" type="password" inputmode="numeric" pattern="[0-9]*" maxlength="4" autocomplete="new-password"></div></div>`;
  const vals = await confirmDialog({
    title: 'Nuevo PIN', html, ok: 'Guardar PIN',
    collect: (w) => ({ a: w.querySelector('#np1').value.trim(), b: w.querySelector('#np2').value.trim() })
  });
  if (!vals) return false;
  if (!/^\d{4}$/.test(vals.a)) { await alertDialog('PIN no válido', 'El PIN debe tener exactamente 4 números.'); return false; }
  if (vals.a !== vals.b) { await alertDialog('No coinciden', 'Los dos PIN no son iguales.'); return false; }
  await auth.setPin(vals.a);
  toast('PIN guardado');
  render();
  return true;
}

async function olvidePin() {
  const ok = await confirmDialog({
    title: '¿Olvidó su PIN?',
    body: 'Puede crear un PIN nuevo. Sus datos se conservan. Hágalo solo si este teléfono es suyo.',
    ok: 'Crear PIN nuevo'
  });
  if (!ok) return;
  await auth.removePin();
  if (!auth.isLocked()) auth.markActive();
  lastHash = '';
  render();
  await cambiarPin();
}

/* ---------- arranque ---------- */

function registerSW() {
  if (!('serviceWorker' in navigator)) return;
  navigator.serviceWorker.register('sw.js').then((reg) => {
    reg.addEventListener('updatefound', () => {
      const nw = reg.installing;
      if (!nw) return;
      nw.addEventListener('statechange', () => {
        if (nw.state === 'installed' && navigator.serviceWorker.controller) {
          toast('Hay una versión nueva de la app.', { action: 'Actualizar', onAction: () => location.reload() });
        }
      });
    });
  }).catch(() => {});
  navigator.serviceWorker.addEventListener('message', (e) => {
    if (e.data && e.data.type === 'open' && e.data.url) location.hash = e.data.url.replace(/^[^#]*/, '');
  });
}

async function boot() {
  try {
    await store.open();
  } catch (err) {
    app.innerHTML = `<div class="welcome"><h1>No se pudo abrir la app</h1><p class="lead">${esc(err.message || err)}</p><p>Si está en modo incógnito, ábrala en una ventana normal del navegador.</p></div>`;
    return;
  }
  try { localStorage.removeItem('seid-demo-v1'); localStorage.removeItem('seid-demo-session'); } catch { /* */ }
  if (!location.hash) history.replaceState(null, '', '#/inicio');
  document.addEventListener('click', onClick);
  document.addEventListener('input', onInput);
  document.addEventListener('change', onChange);
  document.addEventListener('submit', onSubmit);
  window.addEventListener('hashchange', render);
  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); installPrompt = e; if (['inicio', 'ajustes'].includes(parseRoute().name)) render(); });
  window.addEventListener('appinstalled', () => { installPrompt = null; });
  window.addEventListener('online', syncSoon);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      if (auth.isLocked() && !document.querySelector('.lock')) render();
      checkAvisos();
      syncSoon();
    }
  });
  api.setAuthLostHandler(() => render());
  render();
  registerSW();
  checkAvisos();
  syncSoon(300);
  setInterval(() => { if (document.visibilityState === 'visible') syncSoon(0); }, 5 * 60 * 1000);
  if (api.enabled() && 'Notification' in window && Notification.permission === 'granted') api.ensurePush().catch(() => {});
}

boot();
