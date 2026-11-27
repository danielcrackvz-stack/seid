/* Panel de firma con el dedo (canvas + pointer events), sin librerías externas. */
export function createSignaturePad(canvas, { onChange } = {}) {
  const ctx = canvas.getContext('2d');
  let drawing = false;
  let last = null;
  let strokes = 0;

  function resize() {
    const ratio = Math.max(window.devicePixelRatio || 1, 1);
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    if (canvas.width === Math.round(rect.width * ratio) && canvas.height === Math.round(rect.height * ratio)) return;
    const prev = strokes ? canvas.toDataURL() : null;
    canvas.width = Math.round(rect.width * ratio);
    canvas.height = Math.round(rect.height * ratio);
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#0d1b2e';
    if (prev) {
      const img = new Image();
      img.onload = () => ctx.drawImage(img, 0, 0, rect.width, rect.height);
      img.src = prev;
    }
  }

  function pos(e) {
    const r = canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top, p: e.pressure || 0.5 };
  }

  function down(e) {
    e.preventDefault();
    canvas.setPointerCapture?.(e.pointerId);
    drawing = true;
    last = pos(e);
    ctx.beginPath();
    ctx.arc(last.x, last.y, 1.2, 0, Math.PI * 2);
    ctx.fillStyle = '#0d1b2e';
    ctx.fill();
  }

  function move(e) {
    if (!drawing) return;
    e.preventDefault();
    const pts = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
    for (const pe of pts) {
      const p = pos(pe);
      const dist = Math.hypot(p.x - last.x, p.y - last.y);
      ctx.lineWidth = Math.max(1.6, Math.min(3.2, 3.4 - dist * 0.08));
      ctx.beginPath();
      ctx.moveTo(last.x, last.y);
      const mx = (last.x + p.x) / 2;
      const my = (last.y + p.y) / 2;
      ctx.quadraticCurveTo(last.x, last.y, mx, my);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
      last = p;
    }
  }

  function up() {
    if (!drawing) return;
    drawing = false;
    strokes += 1;
    onChange && onChange(strokes);
  }

  canvas.addEventListener('pointerdown', down);
  canvas.addEventListener('pointermove', move);
  canvas.addEventListener('pointerup', up);
  canvas.addEventListener('pointercancel', up);
  canvas.addEventListener('pointerleave', up);
  canvas.style.touchAction = 'none';
  resize();
  const ro = new ResizeObserver(() => resize());
  ro.observe(canvas);

  return {
    isEmpty: () => strokes === 0,
    clear() {
      const r = canvas.getBoundingClientRect();
      ctx.clearRect(0, 0, r.width, r.height);
      strokes = 0;
      onChange && onChange(0);
    },
    /** PNG transparente recortado al trazo, para incrustar en el PDF. */
    toPNG() {
      if (!strokes) return '';
      const w = canvas.width; const h = canvas.height;
      const px = ctx.getImageData(0, 0, w, h).data;
      let x0 = w, y0 = h, x1 = 0, y1 = 0;
      for (let y = 0; y < h; y += 2) {
        for (let x = 0; x < w; x += 2) {
          if (px[(y * w + x) * 4 + 3] > 10) {
            if (x < x0) x0 = x; if (x > x1) x1 = x;
            if (y < y0) y0 = y; if (y > y1) y1 = y;
          }
        }
      }
      const pad = 12;
      x0 = Math.max(0, x0 - pad); y0 = Math.max(0, y0 - pad);
      x1 = Math.min(w, x1 + pad); y1 = Math.min(h, y1 + pad);
      const out = document.createElement('canvas');
      const scale = Math.min(1, 600 / (x1 - x0));
      out.width = Math.max(1, Math.round((x1 - x0) * scale));
      out.height = Math.max(1, Math.round((y1 - y0) * scale));
      out.getContext('2d').drawImage(canvas, x0, y0, x1 - x0, y1 - y0, 0, 0, out.width, out.height);
      return out.toDataURL('image/png');
    },
    destroy() { ro.disconnect(); }
  };
}

/** Comprime una foto de la cámara a JPEG (lado mayor 1280 px). */
export async function compressPhoto(file, max = 1280, quality = 0.72) {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error('No se pudo leer la foto.'));
      i.src = url;
    });
    const s = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
    const c = document.createElement('canvas');
    c.width = Math.round(img.naturalWidth * s);
    c.height = Math.round(img.naturalHeight * s);
    const g = c.getContext('2d');
    g.fillStyle = '#fff';
    g.fillRect(0, 0, c.width, c.height);
    g.drawImage(img, 0, 0, c.width, c.height);
    return c.toDataURL('image/jpeg', quality);
  } finally {
    URL.revokeObjectURL(url);
  }
}
