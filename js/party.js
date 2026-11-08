// Poolparty 2027 – Party-Effekte für die Startseite.
// Alles hier ist Deko: Countdown, Wasserlicht (WebGL), Lichterketten,
// Polaroid-Tilt, Scroll-Dramaturgie und einklappbare Galerien.
// Ohne dieses Skript bleibt die Seite vollständig lesbar.

const root = document.documentElement;
const reducedQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
const motionOK = !reducedQuery.matches;
const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

root.classList.add('party-ready');

const RAINBOW = ['#FF0000', '#F5601D', '#E0E722', '#6BE607', '#51FCF8', '#D800FF', '#FF2D87'];

// ===== Countdown =====
function initCountdown() {
  const el = document.querySelector('[data-countdown]');
  if (!el) return;
  const target = Date.parse(el.dataset.countdown);
  if (Number.isNaN(target)) return;

  const units = {};
  el.querySelectorAll('[data-unit]').forEach((node) => { units[node.dataset.unit] = node; });
  const tiles = el.querySelector('.countdown-tiles');
  const label = el.querySelector('.countdown-label');
  const done = el.querySelector('.countdown-done');
  const last = {};

  if (!motionOK) el.classList.add('countdown--calm');

  function render() {
    const diff = target - Date.now();
    if (diff <= 0) {
      tiles.hidden = true;
      if (label) label.hidden = true;
      if (done) done.hidden = false;
      return false;
    }
    const s = Math.floor(diff / 1000);
    const values = {
      days: String(Math.floor(s / 86400)),
      hours: String(Math.floor((s % 86400) / 3600)).padStart(2, '0'),
      minutes: String(Math.floor((s % 3600) / 60)).padStart(2, '0'),
      seconds: String(s % 60).padStart(2, '0'),
    };
    for (const [key, text] of Object.entries(values)) {
      const node = units[key];
      if (!node || last[key] === text) continue;
      node.textContent = text;
      if (motionOK && last[key] !== undefined && node.animate) {
        node.animate(
          [{ transform: 'rotateX(80deg)', opacity: 0.2 }, { transform: 'rotateX(0deg)', opacity: 1 }],
          { duration: 320, easing: 'cubic-bezier(.2,1.3,.4,1)' },
        );
      }
      last[key] = text;
    }
    return true;
  }

  const step = motionOK ? 1000 : 60000;
  const loop = () => {
    if (!render()) return;
    setTimeout(loop, step - (Date.now() % step) + 15);
  };
  loop();
}

// ===== Lichterketten =====
const SVG_NS = 'http://www.w3.org/2000/svg';

function buildLights(host) {
  const width = Math.round(host.clientWidth);
  if (!width || host.dataset.builtFor === String(width)) return;
  host.dataset.builtFor = String(width);
  const night = host.classList.contains('string-lights--night');
  const height = host.clientHeight || 90;
  const spans = width > 1000 ? 3 : 2;
  const sag = Math.min(night ? 46 : 54, height * 0.55);
  let d = 'M-10 4';
  for (let i = 1; i <= spans; i++) {
    const x0 = i === 1 ? -10 : ((i - 1) * width) / spans;
    const x1 = i === spans ? width + 10 : (i * width) / spans;
    d += ` Q${((x0 + x1) / 2).toFixed(1)} ${(4 + sag * 2).toFixed(1)} ${x1.toFixed(1)} 4`;
  }

  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
  svg.setAttribute('preserveAspectRatio', 'none');
  svg.setAttribute('focusable', 'false');
  const wire = document.createElementNS(SVG_NS, 'path');
  wire.setAttribute('d', d);
  wire.setAttribute('fill', 'none');
  wire.setAttribute('stroke', night ? '#0a0418' : '#2d2d2d');
  wire.setAttribute('stroke-width', '2');
  svg.appendChild(wire);
  host.replaceChildren(svg);

  const length = wire.getTotalLength();
  const count = Math.max(7, Math.round(length / (width < 600 ? 46 : 64)));
  for (let i = 0; i < count; i++) {
    const p = wire.getPointAtLength(((i + 0.5) * length) / count);
    if (p.x < -4 || p.x > width + 4) continue;
    const color = RAINBOW[i % RAINBOW.length];
    const g = document.createElementNS(SVG_NS, 'g');
    g.setAttribute('class', 'bulb');
    g.setAttribute('transform', `translate(${p.x.toFixed(1)} ${p.y.toFixed(1)})`);
    g.style.animationDelay = `${(-Math.random() * 2.4).toFixed(2)}s`;
    g.innerHTML =
      `<circle class="bulb-glow" cx="0" cy="13" r="${night ? 14 : 11}" fill="${color}"/>` +
      `<rect x="-3" y="-1" width="6" height="6" rx="1" fill="#2d2d2d"/>` +
      `<ellipse cx="0" cy="13" rx="5.5" ry="7.5" fill="${color}" stroke="#2d2d2d" stroke-width="1.5"/>` +
      `<ellipse cx="-1.6" cy="10.5" rx="1.4" ry="2.4" fill="#fff" opacity=".7"/>`;
    svg.appendChild(g);
  }
}

function initLights() {
  const hosts = [...document.querySelectorAll('.string-lights')];
  if (!hosts.length) return;
  const rebuild = () => hosts.forEach(buildLights);
  rebuild();
  let t;
  window.addEventListener('resize', () => {
    clearTimeout(t);
    t = setTimeout(rebuild, 150);
  });
}

// ===== Wasser (WebGL-Kaustik) =====
const WATER_PALETTES = {
  day: { top: [0.40, 0.80, 0.96], bottom: [1.0, 0.90, 0.66], light: [1.0, 1.0, 1.0], glow: 0.12 },
  night: { top: [0.20, 0.09, 0.50], bottom: [0.07, 0.03, 0.24], light: [0.55, 0.50, 1.0], glow: 0.24 },
};

const VERT = `attribute vec2 p; void main(){ gl_Position = vec4(p, 0.0, 1.0); }`;
const FRAG = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
uniform vec2 uRes;
uniform float uTime;
uniform float uUnit;
uniform vec3 uTop;
uniform vec3 uBottom;
uniform vec3 uLight;
uniform float uGlow;
uniform vec4 uRip[4];

vec2 hash2(vec2 p) {
  p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
  return fract(sin(p) * 43758.5453);
}

float edge(vec2 p, float t) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  float d1 = 8.0;
  float d2 = 8.0;
  for (int y = -1; y <= 1; y++) {
    for (int x = -1; x <= 1; x++) {
      vec2 g = vec2(float(x), float(y));
      vec2 o = hash2(i + g);
      o = 0.5 + 0.42 * sin(t + 6.2831 * o);
      vec2 r = g + o - f;
      float d = dot(r, r);
      if (d < d1) { d2 = d1; d1 = d; } else if (d < d2) { d2 = d; }
    }
  }
  return sqrt(d2) - sqrt(d1);
}

void main() {
  vec2 frag = gl_FragCoord.xy;
  vec2 uv = frag / uUnit;
  float ring = 0.0;
  for (int k = 0; k < 4; k++) {
    vec4 r = uRip[k];
    if (r.w > 0.0) {
      float age = uTime - r.z;
      if (age > 0.0 && age < 2.2) {
        vec2 d = (frag - r.xy) / uUnit;
        float dist = length(d);
        float x = dist - age * 2.4;
        float env = exp(-x * x * 5.0) * (1.0 - age / 2.2) * r.w;
        uv += (d / (dist + 0.001)) * sin(x * 9.0) * env * 0.11;
        ring += env * 0.35 * max(0.0, sin(x * 9.0));
      }
    }
  }
  float t = uTime * 0.55;
  vec2 w = uv + 0.12 * vec2(sin(uv.y * 1.3 + t * 0.8), cos(uv.x * 1.1 - t * 0.7));
  float c1 = edge(w, t);
  float c2 = edge(w * 1.7 + vec2(3.1, 1.7), t * 1.25);
  float l = pow(1.0 - smoothstep(0.0, 0.22, c1), 3.0) * 0.65
          + pow(1.0 - smoothstep(0.0, 0.18, c2), 3.0) * 0.4;
  vec3 col = mix(uBottom, uTop, frag.y / uRes.y);
  col += uLight * (l * uGlow + ring);
  gl_FragColor = vec4(col, 1.0);
}`;

const waters = new Map();

function compile(gl, type, src) {
  const sh = gl.createShader(type);
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    gl.deleteShader(sh);
    return null;
  }
  return sh;
}

function initWater(canvas) {
  let gl;
  try {
    gl = canvas.getContext('webgl', { antialias: false, alpha: false, depth: false, stencil: false, powerPreference: 'low-power' });
  } catch {
    gl = null;
  }
  if (!gl) {
    canvas.remove();
    return;
  }

  const vs = compile(gl, gl.VERTEX_SHADER, VERT);
  const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG);
  if (!vs || !fs) {
    canvas.remove();
    return;
  }
  const prog = gl.createProgram();
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    canvas.remove();
    return;
  }
  gl.useProgram(prog);

  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, 'p');
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

  const u = {};
  for (const name of ['uRes', 'uTime', 'uUnit', 'uTop', 'uBottom', 'uLight', 'uGlow', 'uRip']) {
    u[name] = gl.getUniformLocation(prog, name);
  }
  const pal = WATER_PALETTES[canvas.dataset.water] || WATER_PALETTES.day;
  gl.uniform3fv(u.uTop, pal.top);
  gl.uniform3fv(u.uBottom, pal.bottom);
  gl.uniform3fv(u.uLight, pal.light);
  gl.uniform1f(u.uGlow, pal.glow);

  const state = {
    canvas,
    scale: 0.5,
    ripples: new Float32Array(16),
    rippleIndex: 0,
    start: performance.now(),
    visible: false,
    raf: 0,
    lastDraw: 0,
    staticTime: 7.3,
  };

  const now = () => (performance.now() - state.start) / 1000;

  function draw(time) {
    gl.uniform1f(u.uTime, time);
    gl.uniform4fv(u.uRip, state.ripples);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  function resize() {
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    state.scale = Math.min(0.6, 760 / rect.width);
    const w = Math.max(2, Math.round(rect.width * state.scale));
    const h = Math.max(2, Math.round(rect.height * state.scale));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
      gl.viewport(0, 0, w, h);
    }
    gl.uniform2f(u.uRes, w, h);
    gl.uniform1f(u.uUnit, 120 * state.scale);
    if (!state.raf) draw(motionOK ? now() : state.staticTime);
  }

  function frame(ts) {
    state.raf = requestAnimationFrame(frame);
    if (ts - state.lastDraw < 32) return; // ~30 fps reicht für Wasser
    state.lastDraw = ts;
    draw(now());
  }

  function start() {
    if (!motionOK || state.raf || !state.visible || document.hidden) return;
    state.raf = requestAnimationFrame(frame);
  }

  function stop() {
    if (state.raf) cancelAnimationFrame(state.raf);
    state.raf = 0;
  }

  state.ripple = (clientX, clientY, strength = 1) => {
    if (!motionOK) return;
    const rect = canvas.getBoundingClientRect();
    const x = (clientX - rect.left) * (canvas.width / rect.width);
    const y = (rect.bottom - clientY) * (canvas.height / rect.height);
    const i = state.rippleIndex % 4;
    state.ripples.set([x, y, now(), strength], i * 4);
    state.rippleIndex++;
    start();
  };

  canvas.addEventListener('webglcontextlost', (e) => {
    e.preventDefault();
    stop();
    canvas.remove();
    waters.delete(canvas);
  });

  resize();
  requestAnimationFrame(() => canvas.classList.add('is-ready'));

  new ResizeObserver(resize).observe(canvas);
  new IntersectionObserver((entries) => {
    state.visible = entries[0].isIntersecting;
    if (state.visible) start();
    else stop();
  }).observe(canvas);
  document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));

  waters.set(canvas, state);
}

function initWaters() {
  document.querySelectorAll('.water-canvas').forEach(initWater);
}

// ===== Klick ins Wasserlicht: dezente Welle, keine Partikel =====
function initInteractions() {
  if (!motionOK) return;
  document.addEventListener('click', (e) => {
    if (e.defaultPrevented || e.button !== 0) return;
    const t = e.target instanceof Element ? e.target : null;
    if (!t || t.closest('a, button, input, select, textarea, label, object, nav, .modal, .poster, .polaroid, .footer-tag')) return;
    const zone = t.closest('[data-water-zone]');
    if (!zone) return;
    waters.get(zone.querySelector('.water-canvas'))?.ripple(e.clientX, e.clientY, 0.8);
  });
}

// ===== Polaroid-Tilt =====
function initTilt() {
  if (!motionOK || !finePointer) return;
  document.querySelectorAll('.polaroid, .year-tile, .aftermovie-card').forEach((el) => {
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5;
      const py = (e.clientY - r.top) / r.height - 0.5;
      el.style.setProperty('--tx', `${(px * 16).toFixed(2)}deg`);
      el.style.setProperty('--ty', `${(-py * 16).toFixed(2)}deg`);
    });
    el.addEventListener('pointerleave', () => {
      el.style.removeProperty('--tx');
      el.style.removeProperty('--ty');
    });
  });
}

// ===== Einblenden beim Scrollen =====
function initReveal() {
  const items = document.querySelectorAll('.reveal');
  const neon = document.querySelector('.section-title--neon');
  if (!motionOK || !('IntersectionObserver' in window)) {
    items.forEach((el) => el.classList.add('is-in', 'settled'));
    return;
  }
  let group = 0;
  let lastParent = null;
  items.forEach((el) => {
    if (el.parentElement !== lastParent) {
      group = 0;
      lastParent = el.parentElement;
    }
    el.style.setProperty('--i', String(group++ % 5));
  });
  const io = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      const el = entry.target;
      el.classList.add('is-in');
      if (el === neon) {
        el.classList.add('is-lit');
      } else {
        setTimeout(() => el.classList.add('settled'), 1300);
      }
      io.unobserve(el);
    }
  }, { rootMargin: '0px 0px -6% 0px', threshold: 0.12 });
  items.forEach((el) => io.observe(el));
  if (neon) io.observe(neon);
}

// ===== Scroll-Dramaturgie: Parallax-Polaroids und sinkende Sonne =====
function initScrollScene() {
  if (!motionOK) return;
  const shots = [...document.querySelectorAll('.hero-shot')];
  const hero = document.querySelector('.hero');
  const sun = document.querySelector('.horizon-sun');
  const sunset = document.querySelector('.scene--sunset');
  let ticking = false;

  const update = () => {
    ticking = false;
    const vh = window.innerHeight;
    if (hero) {
      const r = hero.getBoundingClientRect();
      if (r.bottom > 0) {
        const y = Math.max(0, -r.top);
        shots.forEach((s, i) => s.style.setProperty('--py', `${(-y * (0.08 + (i % 3) * 0.05)).toFixed(1)}px`));
      }
    }
    if (sun && sunset) {
      const r = sunset.getBoundingClientRect();
      if (r.top < vh && r.bottom > 0) {
        const p = Math.min(1, Math.max(0, (vh - r.top) / (r.height + vh)));
        sun.style.setProperty('--sun-shift', `${(-10 + p * 55).toFixed(1)}%`);
      }
    }
  };

  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(update);
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  update();
}

// ===== Galerien einklappen =====
function initGalleries() {
  document.querySelectorAll('.year .photos').forEach((gallery) => {
    const count = gallery.children.length;
    if (count < 5) return;
    const year = gallery.id.replace('photos', '');
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'gallery-toggle';
    btn.setAttribute('aria-controls', gallery.id);
    let open = false;
    const label = () => {
      btn.textContent = open ? 'Weniger zeigen' : `Alle ${count} Fotos von ${year} zeigen`;
      btn.setAttribute('aria-expanded', String(open));
    };
    gallery.classList.add('is-collapsed');
    label();
    gallery.after(btn);

    btn.addEventListener('click', () => {
      open = !open;
      gallery.classList.toggle('is-collapsed', !open);
      label();
      if (!open) {
        const yearEl = gallery.closest('.year');
        if (yearEl && yearEl.getBoundingClientRect().top < 0) {
          yearEl.scrollIntoView({ behavior: motionOK ? 'smooth' : 'auto', block: 'start' });
        }
      }
    });

    // Kurze Galerien brauchen keinen Knopf.
    const check = () => {
      if (open) return;
      const limit = parseFloat(getComputedStyle(gallery).getPropertyValue('--collapsed-h')) || 560;
      const full = parseFloat(gallery.style.height) || 0;
      const fits = full > 0 && full <= limit + 30;
      btn.hidden = fits;
      gallery.classList.toggle('is-collapsed', !fits);
    };
    if ('MutationObserver' in window) {
      new MutationObserver(check).observe(gallery, { attributes: true, attributeFilter: ['style'] });
    }
    window.addEventListener('resize', check);
  });
}

initCountdown();
initLights();
// Shader-Kompilierung blockiert kurz; erst nach dem ersten Rendern starten.
const idle = window.requestIdleCallback || ((fn) => setTimeout(fn, 200));
idle(initWaters, { timeout: 1500 });
initInteractions();
initTilt();
initReveal();
initScrollScene();
initGalleries();
