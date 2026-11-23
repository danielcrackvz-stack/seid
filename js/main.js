/* SEID — interacciones de la landing (menú, WhatsApp, formulario) */

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
    electricidad:
      'Hola, quisiera consultar por un trabajo de electricidad (domiciliaria o industrial).',
    plomeria:
      'Hola, quisiera consultar por un trabajo de plomería (agua potable, sanitaria o pluvial).',
    gas:
      'Hola, quisiera consultar por instalación de gas.',
  };

  function bindWhatsAppLinks() {
    var links = document.querySelectorAll('[data-wa]');
    for (var i = 0; i < links.length; i++) {
      var key = links[i].getAttribute('data-wa') || 'general';
      var message = MESSAGES[key] || MESSAGES.general;
      links[i].setAttribute('href', whatsappUrl(message));
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
      if (!show) live[j].textContent = getWhatsAppNumber();
    }
  }

  document.addEventListener('DOMContentLoaded', function () {
    bindWhatsAppLinks();
    setupMenu();
    setupQuoteForm();
    revealPlaceholders();
  });
})();
