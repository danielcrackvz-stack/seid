/* Piezas de interfaz: iconos, avisos, diálogos y estructura de pantalla. */
import { esc } from './format.js';

const s = (d, extra = '') => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" ${extra}>${d}</svg>`;

export const ICO = {
  home: s('<path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-4.5v-6h-5v6H5a1 1 0 0 1-1-1z"/>'),
  list: s('<path d="M9 6h11M9 12h11M9 18h11"/><circle cx="4.5" cy="6" r="1"/><circle cx="4.5" cy="12" r="1"/><circle cx="4.5" cy="18" r="1"/>'),
  plus: s('<path d="M12 5v14M5 12h14"/>', 'stroke-width="2.2"'),
  cal: s('<rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/>'),
  gear: s('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>'),
  back: s('<path d="M15 5 8 12l7 7"/>', 'stroke-width="2.2"'),
  chev: s('<path d="m9 5 7 7-7 7"/>'),
  chevL: s('<path d="M15 5 8 12l7 7"/>'),
  search: s('<circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.5 4.5"/>'),
  filter: s('<path d="M4 6h16M7 12h10M10 18h4"/>'),
  close: s('<path d="M6 6l12 12M18 6 6 18"/>', 'stroke-width="2"'),
  check: s('<path d="M5 12.5 10 17l9-10"/>', 'stroke-width="2.4"'),
  lock: s('<rect x="5" y="11" width="14" height="9.5" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>'),
  note: s('<path d="M5 4h10l4 4v12a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1z"/><path d="M8 12h8M8 16h5"/>'),
  camera: s('<path d="M4 8.5A1.5 1.5 0 0 1 5.5 7h2.2L9 5h6l1.3 2h2.2A1.5 1.5 0 0 1 20 8.5v9a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 17.5z"/><circle cx="12" cy="13" r="3.3"/>'),
  pen: s('<path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16z"/><path d="m13.5 6.5 4 4"/>'),
  pdf: s('<path d="M7 3h7l5 5v12a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z"/><path d="M14 3v5h5M9 13h6M9 17h4"/>'),
  share: s('<path d="M12 15V4M8 8l4-4 4 4"/><path d="M5 12v7a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-7"/>'),
  download: s('<path d="M12 4v11M8 11l4 4 4-4"/><path d="M5 19h14"/>'),
  upload: s('<path d="M12 15V4M8 8l4-4 4 4"/><path d="M5 19h14"/>'),
  bell: s('<path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z"/><path d="M10 20a2 2 0 0 0 4 0"/>'),
  user: s('<circle cx="12" cy="8" r="3.6"/><path d="M5 20a7 7 0 0 1 14 0"/>'),
  users: s('<circle cx="9" cy="8.5" r="3.2"/><path d="M3 19.5a6 6 0 0 1 12 0"/><path d="M16 5.5a3 3 0 0 1 0 6M18 19.5a5.5 5.5 0 0 0-2.5-4.6"/>'),
  clock: s('<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>'),
  pin: s('<path d="M12 21s-6.5-6-6.5-11a6.5 6.5 0 0 1 13 0c0 5-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.3"/>'),
  money: s('<rect x="3" y="6.5" width="18" height="11" rx="2"/><circle cx="12" cy="12" r="2.6"/>'),
  trash: s('<path d="M4.5 7h15M9.5 7V4.5h5V7M6.5 7l.8 12.5a1 1 0 0 0 1 .9h7.4a1 1 0 0 0 1-.9L17.5 7"/>'),
  phone: s('<rect x="7" y="3" width="10" height="18" rx="2"/><path d="M11 18h2"/>'),
  cloud: s('<path d="M7 18a4.5 4.5 0 0 1-.6-9 6 6 0 0 1 11.4 1.6A3.8 3.8 0 0 1 17.5 18z"/>'),
  wa: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2a10 10 0 0 0-8.6 15L2 22l5.2-1.4A10 10 0 1 0 12 2zm0 1.8a8.2 8.2 0 0 1 7 13.4l-.3.4.5 3.1-3.1-.8-.4.2A8.2 8.2 0 1 1 12 3.8zm-3.4 3.5c-.2 0-.5.1-.7.3-.3.3-.8.9-.8 2.1 0 1.2.9 2.4 1 2.6 1.7 2.9 4.3 4.3 6.2 4.8.5.1 1 .1 1.3-.2.4-.4 1-1.2 1.1-1.5.1-.3.1-.6 0-.7l-1.7-.9c-.2-.1-.3-.1-.5.1l-.7.8c-.1.2-.3.2-.5.1-1-.4-2.1-1.3-2.8-2.6-.1-.2 0-.3.1-.5l.4-.5c.1-.2.1-.3 0-.5L9.3 7.8c-.1-.2-.3-.5-.7-.5z"/></svg>',
  // Servicios
  snow: s('<path d="M12 3v18M4.2 7.5l15.6 9M4.2 16.5l15.6-9"/><path d="m9.5 4.5 2.5 2 2.5-2M9.5 19.5l2.5-2 2.5 2"/>'),
  wrench: s('<path d="M14.7 6.3a4.5 4.5 0 0 0-6 6L4 17l3 3 4.7-4.7a4.5 4.5 0 0 0 6-6L15 12l-3-3z"/>'),
  bolt: s('<path d="M13 3 5 13.5h6L10 21l8-10.5h-6z"/>'),
  panel: s('<rect x="5" y="3.5" width="14" height="17" rx="1.5"/><path d="M9 8h6M9 12h6M9 16h3"/>'),
  transformer: s('<rect x="4" y="7" width="16" height="12" rx="1.5"/><path d="M8 7V4M16 7V4M8 11h8M8 15h8"/>'),
  blueprint: s('<path d="M4 5h11l5 5v9H4z"/><path d="M8 9v6h7"/>'),
  drop: s('<path d="M12 3.5s6 6.4 6 10.5a6 6 0 0 1-12 0c0-4.1 6-10.5 6-10.5z"/>'),
  flame: s('<path d="M12 21a6 6 0 0 0 6-6c0-4-3-6.5-4-10-2.5 2-3.2 4-3 6-1.2-.6-2-1.8-2.2-3C7 9.6 6 12 6 15a6 6 0 0 0 6 6z"/>'),
  cctv: s('<path d="M3.5 9.5 16 5l2 5-12.5 4.5z"/><path d="m8 13.5 1.2 3.2H4.5M4.5 13v7"/><path d="m18 10 2.5 1"/>'),
  fence: s('<path d="M5 21V6l2-2.5L9 6v15M15 21V6l2-2.5L19 6v15M3 10h18M3 16h18"/>'),
  tool: s('<path d="M14.5 5.5 18.5 9.5M4 20l7.5-7.5M13 4l7 7-3 3-7-7z"/>')
};

export const ICONO_SERVICIO = {
  'instalacion-aire': 'snow',
  'mantenimiento-aire': 'wrench',
  'instalacion-inverter': 'snow',
  'electricidad-industrial': 'bolt',
  'electricidad-domiciliaria': 'bolt',
  'panel-trifasico': 'panel',
  transformadores: 'transformer',
  'proyectos-electricos': 'blueprint',
  plomeria: 'drop',
  gas: 'flame',
  camaras: 'cctv',
  'cerco-electrico': 'fence',
  otro: 'tool'
};

export function iconoServicio(key) { return ICO[ICONO_SERVICIO[key] || 'tool']; }

let toastTimer = 0;
export function toast(msg, { action, onAction, ms = 3200 } = {}) {
  document.querySelectorAll('.toast').forEach((n) => n.remove());
  const n = document.createElement('div');
  n.className = 'toast';
  n.setAttribute('role', 'status');
  n.setAttribute('aria-live', 'polite');
  const span = document.createElement('span');
  span.textContent = msg;
  n.appendChild(span);
  if (action) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = action;
    b.addEventListener('click', () => { n.remove(); onAction && onAction(); });
    n.appendChild(b);
  }
  document.body.appendChild(n);
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => n.remove(), action ? ms * 2 : ms);
}

/** Diálogo de confirmación accesible. Devuelve true/false. */
export function confirmDialog({ title, body = '', ok = 'Aceptar', cancel = 'Cancelar', danger = false, html = '', collect = null }) {
  return new Promise((resolve) => {
    const prev = document.activeElement;
    const wrap = document.createElement('div');
    wrap.className = 'dialog-backdrop';
    wrap.innerHTML = `<div class="dialog" role="alertdialog" aria-modal="true" aria-labelledby="dlg-t" aria-describedby="dlg-b">
      <h2 id="dlg-t">${esc(title)}</h2>
      <div id="dlg-b" class="dialog__body">${body ? `<p>${esc(body)}</p>` : ''}${html}</div>
      <div class="dialog__actions">
        ${cancel ? `<button type="button" class="btn btn--ghost" data-r="0">${esc(cancel)}</button>` : ''}
        <button type="button" class="btn ${danger ? 'btn--danger' : ''}" data-r="1">${esc(ok)}</button>
      </div>
    </div>`;
    function done(v) {
      const out = v && collect ? collect(wrap) : v;
      wrap.classList.add('is-leaving');
      setTimeout(() => wrap.remove(), 160);
      document.removeEventListener('keydown', onKey, true);
      if (prev && prev.focus && document.contains(prev)) prev.focus();
      resolve(out);
    }
    function onKey(e) {
      if (e.key === 'Escape') { e.preventDefault(); done(false); }
      if (e.key === 'Tab') {
        const f = [...wrap.querySelectorAll('button, input, select, textarea')];
        const i = f.indexOf(document.activeElement);
        if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus(); }
        else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); }
      }
    }
    wrap.addEventListener('click', (e) => {
      const b = e.target.closest('[data-r]');
      if (b) done(b.getAttribute('data-r') === '1');
      else if (e.target === wrap) done(false);
    });
    document.addEventListener('keydown', onKey, true);
    wrap.addEventListener('submit', (e) => { e.preventDefault(); done(true); });
    document.body.appendChild(wrap);
    (wrap.querySelector('input') || wrap.querySelector('[data-r="1"]')).focus();
  });
}

export function alertDialog(title, body) {
  return confirmDialog({ title, body, ok: 'Entendido', cancel: '' });
}

/** Visor de foto a pantalla completa. */
export function viewPhoto(src) {
  const wrap = document.createElement('div');
  wrap.className = 'photo-viewer';
  wrap.setAttribute('role', 'dialog');
  wrap.setAttribute('aria-label', 'Foto');
  wrap.innerHTML = `<img alt="Foto de la nota" src="${esc(src)}"><button type="button" class="photo-viewer__close" aria-label="Cerrar">${ICO.close}</button>`;
  wrap.addEventListener('click', () => wrap.remove());
  document.body.appendChild(wrap);
  wrap.querySelector('button').focus();
}

export function tabbar(active) {
  const item = (id, icon, label) => `<a href="#/${id}" class="tab ${active === id ? 'is-active' : ''}" ${active === id ? 'aria-current="page"' : ''}>${ICO[icon]}<span>${label}</span></a>`;
  return `<nav class="tabbar" aria-label="Menú principal">
    ${item('inicio', 'home', 'Inicio')}
    ${item('historial', 'list', 'Historial')}
    <a href="#/nuevo" class="tab tab--fab ${active === 'nuevo' ? 'is-active' : ''}" aria-label="Nuevo registro" ${active === 'nuevo' ? 'aria-current="page"' : ''}><span class="fab">${ICO.plus}</span><span>Nuevo</span></a>
    ${item('calendario', 'cal', 'Calendario')}
    ${item('ajustes', 'gear', 'Ajustes')}
  </nav>`;
}

export function screen(content, { title = '', back = '', tab = '', bar = '', headerRight = '', brand = false, tabs = true } = {}) {
  const left = back
    ? `<a class="icon-btn" href="${esc(back)}" data-back aria-label="Volver">${ICO.back}</a>`
    : brand ? '<img class="brand" src="img/logo-header.png" width="545" height="206" alt="SEID">' : '';
  return `<header class="topbar ${back ? 'topbar--back' : ''}">
      <div class="topbar__left">${left}</div>
      ${title ? `<p class="topbar__title">${esc(title)}</p>` : '<span></span>'}
      <div class="topbar__right">${headerRight}</div>
    </header>
    <main id="main" class="main ${bar ? 'main--bar' : ''}" tabindex="-1">${content}</main>
    ${bar ? `<div class="actionbar">${bar}</div>` : ''}
    ${tabs && !bar ? tabbar(tab) : ''}`;
}
