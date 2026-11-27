/* SEID — interacciones de la landing (menú, cabecera, WhatsApp, formulario, visor) */

(function () {
  'use strict';

  var PLACEHOLDER_NUMBER = '591XXXXXXXX';

  function getWhatsAppNumber() {
    return String(typeof WHATSAPP_NUMBER !== 'undefined' ? WHATSAPP_NUMBER : PLACEHOLDER_NUMBER)
      .replace(/\D/g, '');
  }

  function whatsappUrl(text) {
    var base = 'https://wa.me/' + getWhatsAppNumber();
    if (text) {
      return base + '?text=' + encodeURIComponent(text);
    }
    return base;
  }

  var MESSAGES = {
    general:
      'Hola, quisiera consultar por un servicio de SEID.',
    aires:
      'Hola, quisiera consultar por instalación o mantenimiento de aires acondicionados.',
    'aires-instalacion':
      'Hola, quisiera consultar por instalación de aire acondicionado.',
    'aires-mantenimiento':
      'Hola, quisiera consultar por mantenimiento de aires acondicionados.',
    inverter:
      'Hola, quisiera consultar por instalación de inverter.',
    'electricidad-industrial':
      'Hola, quisiera consultar por un trabajo de electricidad industrial.',
    'electricidad-domiciliaria':
      'Hola, quisiera consultar por un trabajo de electricidad domiciliaria.',
    'panel-trifasico':
      'Hola, quisiera consultar por colocación de panel trifásico.',
    transformadores:
      'Hola, quisiera consultar por transformadores.',
    'proyectos-electricos':
      'Hola, quisiera consultar por un proyecto eléctrico.',
    plomeria:
      'Hola, quisiera consultar por un trabajo de plomería (agua potable, sanitaria o pluvial).',
    gas:
      'Hola, quisiera consultar por instalación de gas.',
    camaras:
      'Hola, quisiera consultar por instalación de cámaras de seguridad.',
    cerco:
      'Hola, quisiera consultar por instalación de cerco eléctrico.',
  };

  function bindWhatsAppLinks() {
    var links = document.querySelectorAll('[data-wa]');
    for (var i = 0; i < links.length; i++) {
      var key = links[i].getAttribute('data-wa') || 'general';
      var custom = links[i].getAttribute('data-wa-text');
      var message = custom || MESSAGES[key] || MESSAGES.general;
      links[i].setAttribute('href', whatsappUrl(message));
      links[i].setAttribute('target', '_blank');
      links[i].setAttribute('rel', 'noopener noreferrer');
    }
    var catalog = typeof WHATSAPP_CATALOG !== 'undefined'
      ? WHATSAPP_CATALOG
      : 'https://wa.me/c/' + getWhatsAppNumber();
    var catLinks = document.querySelectorAll('[data-catalog]');
    for (var j = 0; j < catLinks.length; j++) {
      catLinks[j].setAttribute('href', catalog);
      catLinks[j].setAttribute('target', '_blank');
      catLinks[j].setAttribute('rel', 'noopener noreferrer');
    }
  }

  function setupMenu() {
    var toggle = document.getElementById('menu-toggle');
    var nav = document.getElementById('menu-principal');
    if (!toggle || !nav) return;

    function setOpen(open) {
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      nav.classList.toggle('is-open', open);
      document.body.classList.toggle('nav-open', open);
    }

    toggle.addEventListener('click', function () {
      setOpen(toggle.getAttribute('aria-expanded') !== 'true');
    });

    nav.addEventListener('click', function (event) {
      if (event.target.closest('a')) setOpen(false);
    });

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') setOpen(false);
    });
  }

  function setupQuoteForm() {
    var form = document.getElementById('form-cotizacion');
    if (!form) return;

    var fields = {
      nombre: form.querySelector('#nombre'),
      servicio: form.querySelector('#servicio'),
      zona: form.querySelector('#zona'),
      detalle: form.querySelector('#detalle'),
    };

    function setError(input, message) {
      var errorId = input.id + '-error';
      var node = document.getElementById(errorId);
      input.setAttribute('aria-invalid', message ? 'true' : 'false');
      if (node) node.textContent = message || '';
    }

    function validate() {
      var ok = true;
      var firstInvalid = null;

      var nombre = fields.nombre.value.trim();
      if (nombre.length < 2) {
        setError(fields.nombre, 'Escriba su nombre.');
        ok = false;
        firstInvalid = firstInvalid || fields.nombre;
      } else {
        setError(fields.nombre, '');
      }

      var servicio = fields.servicio.value;
      if (!servicio) {
        setError(fields.servicio, 'Seleccione un servicio.');
        ok = false;
        firstInvalid = firstInvalid || fields.servicio;
      } else {
        setError(fields.servicio, '');
      }

      var zona = fields.zona.value.trim();
      if (zona.length < 2) {
        setError(fields.zona, 'Indique su zona o barrio en Santa Cruz.');
        ok = false;
        firstInvalid = firstInvalid || fields.zona;
      } else {
        setError(fields.zona, '');
      }

      setError(fields.detalle, '');
      return { ok: ok, firstInvalid: firstInvalid };
    }

    function buildMessage() {
      var servicioLabel = fields.servicio.options[fields.servicio.selectedIndex].text;
      var detalle = fields.detalle.value.trim();
      var lines = [
        'Hola, soy ' + fields.nombre.value.trim() + '.',
        'Quisiera solicitar una cotización de ' + servicioLabel + ' en ' + fields.zona.value.trim() + '.',
      ];
      if (detalle) {
        lines.push('');
        lines.push(detalle);
      }
      return lines.join('\n');
    }

    ['nombre', 'servicio', 'zona'].forEach(function (key) {
      fields[key].addEventListener('input', function () {
        if (fields[key].getAttribute('aria-invalid') === 'true') validate();
      });
      fields[key].addEventListener('change', function () {
        if (fields[key].getAttribute('aria-invalid') === 'true') validate();
      });
    });

    form.addEventListener('submit', function (event) {
      event.preventDefault();
      var result = validate();
      if (!result.ok) {
        if (result.firstInvalid) result.firstInvalid.focus();
        return;
      }
      window.location.href = whatsappUrl(buildMessage());
    });
  }

  function isPlaceholderNumber() {
    var raw = String(typeof WHATSAPP_NUMBER !== 'undefined' ? WHATSAPP_NUMBER : PLACEHOLDER_NUMBER);
    return /x/i.test(raw) || getWhatsAppNumber().length < 11;
  }

  function revealPlaceholders() {
    var nodes = document.querySelectorAll('.js-wa-placeholder');
    var show = isPlaceholderNumber();
    for (var i = 0; i < nodes.length; i++) {
      nodes[i].hidden = !show;
    }
    var live = document.querySelectorAll('.js-wa-number-live');
    for (var j = 0; j < live.length; j++) {
      live[j].hidden = show;
      if (!show) {
        var n = getWhatsAppNumber();
        var pretty = n.indexOf('591') === 0 ? '+591 ' + n.slice(3, 6) + ' ' + n.slice(6) : '+' + n;
        live[j].textContent = pretty;
      }
    }
  }


  function setupHeader() {
    var header = document.getElementById('site-header');
    if (!header || !document.body.classList.contains('has-hero')) return;

    function update() {
      var solid = window.scrollY > 24;
      document.body.classList.toggle('header-solid', solid);
    }

    update();
    window.addEventListener('scroll', update, { passive: true });
  }

  function setupLightbox() {
    var dialog = document.getElementById('lightbox');
    if (!dialog || typeof dialog.showModal !== 'function') return;

    var img = document.getElementById('lightbox-image');
    var webp = document.getElementById('lightbox-webp');
    var caption = document.getElementById('lightbox-caption');
    var count = document.getElementById('lightbox-count');
    var prev = dialog.querySelector('[data-lightbox-prev]');
    var next = dialog.querySelector('[data-lightbox-next]');
    var closeBtn = dialog.querySelector('[data-lightbox-close]');
    var stage = dialog.querySelector('.lightbox__stage');
    var state = { items: [], index: 0, title: '' };
    var startX = 0;
    var tracking = false;

    function render() {
      var item = state.items[state.index];
      if (!item) return;
      if (webp) {
        if (item.webp) webp.setAttribute('srcset', item.webp);
        else webp.removeAttribute('srcset');
      }
      img.src = item.jpg || item.webp || '';
      img.alt = item.alt || '';
      if (item.w) img.width = item.w;
      if (item.h) img.height = item.h;
      if (caption) caption.textContent = state.title || '';
      if (count) {
        if (state.items.length > 1) {
          count.hidden = false;
          count.textContent = (state.index + 1) + ' de ' + state.items.length;
        } else {
          count.hidden = true;
          count.textContent = '';
        }
      }
      var many = state.items.length > 1;
      dialog.classList.toggle('is-single', !many);
      if (prev) prev.hidden = !many;
      if (next) next.hidden = !many;
    }

    function openFrom(node) {
      var host = node.closest('[data-lightbox]');
      if (!host) return;
      var raw = host.getAttribute('data-lightbox');
      if (!raw) return;
      var data;
      try { data = JSON.parse(raw); } catch (err) { return; }
      state.title = data.title || '';
      state.items = data.images || [];
      state.index = 0;
      render();
      if (!dialog.open) dialog.showModal();
      if (closeBtn) closeBtn.focus();
    }

    function step(delta) {
      if (state.items.length < 2) return;
      state.index = (state.index + delta + state.items.length) % state.items.length;
      render();
    }

    document.addEventListener('click', function (event) {
      var btn = event.target.closest('[data-lightbox-open]');
      if (!btn) return;
      event.preventDefault();
      openFrom(btn);
    });

    if (prev) prev.addEventListener('click', function () { step(-1); });
    if (next) next.addEventListener('click', function () { step(1); });

    dialog.addEventListener('click', function (event) {
      if (event.target === dialog || event.target.hasAttribute('data-lightbox-close')) {
        dialog.close();
      }
    });

    document.addEventListener('keydown', function (event) {
      if (!dialog.open) return;
      if (event.key === 'ArrowLeft') step(-1);
      if (event.key === 'ArrowRight') step(1);
      if (event.key === 'Escape') dialog.close();
    });

    function onTouchStart(event) {
      if (!event.changedTouches || !event.changedTouches.length) return;
      tracking = true;
      startX = event.changedTouches[0].clientX;
    }
    function onTouchEnd(event) {
      if (!tracking || !event.changedTouches || !event.changedTouches.length) return;
      tracking = false;
      var dx = event.changedTouches[0].clientX - startX;
      if (Math.abs(dx) > 40) step(dx > 0 ? -1 : 1);
    }
    var swipeTarget = stage || dialog;
    swipeTarget.addEventListener('touchstart', onTouchStart, { passive: true });
    swipeTarget.addEventListener('touchend', onTouchEnd, { passive: true });
  }

  document.addEventListener('DOMContentLoaded', function () {
    bindWhatsAppLinks();
    setupMenu();
    setupHeader();
    setupQuoteForm();
    setupLightbox();
    revealPlaceholders();
  });

})();
