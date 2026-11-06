import { useEffect, useRef } from 'react';

// Four ASCII fields drawn on one canvas. Each mode returns, per cell,
// a brightness (0..1) that picks the glyph, and a palette bucket that picks the colour.

const FONT_PX = 14;
const LINE = 1.25;
const FPS = 30;
const BUCKETS = 10;

const PINK = [255, 182, 213];
const WHITE = [250, 246, 250];
const ROSE = [214, 74, 128];
const DIM = [70, 40, 58];

const lerp = (a, b, t) => a + (b - a) * t;
const mix = (c1, c2, t) => c1.map((v, i) => Math.round(lerp(v, c2[i], t)));
const rgb = c => `rgb(${c[0]},${c[1]},${c[2]})`;

function ramp(stops) {
  // stops: array of colours, spread evenly; returns BUCKETS css colours
  return Array.from({ length: BUCKETS }, (_, i) => {
    const x = (i / (BUCKETS - 1)) * (stops.length - 1);
    const k = Math.min(Math.floor(x), stops.length - 2);
    return rgb(mix(stops[k], stops[k + 1], x - k));
  });
}

const PASTELS = [
  [255, 182, 213], // pink
  [205, 180, 255], // lavender
  [170, 225, 255], // sky
  [180, 245, 215], // mint
  [255, 215, 180] // peach
];

export const MODES = {
  liquid: {
    label: 'Liquid ASCII',
    chars: ' .·:-=+*%#@',
    palette: ramp([DIM, ROSE, PINK, WHITE])
  },
  current: {
    label: 'Chroma Current',
    chars: ' .-~=≈*o0O',
    palette: null // per-cell hue, handled below
  },
  rain: {
    label: 'Terminal Rain',
    chars: 'ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄ01<>/\\|=+*:',
    palette: ramp([DIM, ROSE, PINK, WHITE])
  },
  ember: {
    label: 'Glyph Ember',
    chars: ' .`\',:;^*+x%#&@',
    palette: ramp([[30, 10, 20], ROSE, PINK, [255, 240, 230]])
  }
};

const currentPalettes = PASTELS.map(c => ramp([[12, 10, 14], mix(c, [0, 0, 0], 0.55), c, WHITE]));

export default function AsciiBackground({ mode = 'liquid' }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const cfg = MODES[mode] ?? MODES.liquid;

    let cols = 0;
    let rows = 0;
    let cw = 0;
    let ch = 0;
    let dpr = 1;
    let raf = 0;
    let last = 0;
    let t = 0;
    const mouse = { x: -1e4, y: -1e4, energy: 0 };

    // per-mode state
    let heat = null; // ember
    let drops = null; // rain
    let glyphs = null; // rain glyph memory

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = window.innerWidth;
      const h = window.innerHeight;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.font = `${FONT_PX}px "Geist Mono", ui-monospace, Menlo, monospace`;
      ctx.textBaseline = 'top';
      cw = ctx.measureText('M').width;
      ch = FONT_PX * LINE;
      cols = Math.ceil(w / cw) + 1;
      rows = Math.ceil(h / ch) + 1;
      heat = new Float32Array(cols * (rows + 2));
      drops = Array.from({ length: cols }, () => ({
        y: Math.random() * rows * 1.4 - rows * 0.3,
        speed: 0.25 + Math.random() * 0.6,
        len: 6 + Math.random() * 18
      }));
      glyphs = new Uint8Array(cols * rows).map(() => (Math.random() * cfg.chars.length) | 0);
      if (mode === 'ember') for (let i = 0; i < rows * 1.5; i++) stepEmber();
      buildAtlas();
    }

    function mouseBoost(x, y) {
      if (mouse.energy <= 0.01) return 0;
      const dx = x * cw - mouse.x;
      const dy = y * ch - mouse.y;
      return mouse.energy * Math.exp(-(dx * dx + dy * dy) / 9000);
    }

    // value functions -------------------------------------------------------
    function liquid(x, y) {
      const nx = x * 0.06;
      const ny = y * 0.1;
      const wx = nx + 0.9 * Math.sin(ny * 1.3 + t * 0.35) + 0.4 * Math.sin(ny * 2.7 - t * 0.2);
      const wy = ny + 0.9 * Math.sin(nx * 1.1 - t * 0.3);
      let v = Math.sin(wx * 1.4 + t * 0.4) + Math.sin(wy * 1.7 - t * 0.25) + Math.sin((wx + wy) * 0.8 + t * 0.15);
      v = (v + 3) / 6;
      v = Math.pow(v, 2.2);
      return Math.min(1, v + mouseBoost(x, y) * 0.8);
    }

    function current(x, y) {
      const flow = x * 0.045 - y * 0.08 + 0.8 * Math.sin(x * 0.02 + t * 0.3) + 0.5 * Math.sin(y * 0.09 + t * 0.4);
      let v = 0.5 + 0.5 * Math.sin(flow * 2.2 - t * 1.1);
      v *= 0.55 + 0.45 * Math.sin(x * 0.013 - t * 0.2 + y * 0.03);
      v = Math.pow(Math.max(0, v), 1.6);
      return Math.min(1, v + mouseBoost(x, y) * 0.7);
    }

    function stepEmber() {
      // classic fire automaton, with a soft flame source on the bottom row
      const base = rows + 1;
      for (let x = 0; x < cols; x++) {
        const n = 0.5 + 0.5 * Math.sin(x * 0.11 + t * 0.9) * Math.sin(x * 0.037 - t * 0.4);
        heat[base * cols + x] = Math.random() < 0.6 ? n * (0.75 + Math.random() * 0.35) : 0;
      }
      for (let y = 0; y < base; y++) {
        for (let x = 0; x < cols; x++) {
          const drift = (Math.random() * 3) | 0;
          const src = (y + 1) * cols + Math.min(cols - 1, Math.max(0, x + drift - 1));
          const decay = 0.006 + Math.random() * 0.02;
          heat[y * cols + x] = Math.max(0, heat[src] - decay);
        }
      }
      // cursor sparks
      if (mouse.energy > 0.05) {
        const mx = Math.round(mouse.x / cw);
        const my = Math.round(mouse.y / ch);
        for (let i = 0; i < 6; i++) {
          const x = mx + ((Math.random() * 7) | 0) - 3;
          const y = my + ((Math.random() * 3) | 0) - 1;
          if (x >= 0 && x < cols && y >= 0 && y < rows) heat[y * cols + x] = Math.min(1, heat[y * cols + x] + mouse.energy * 0.8);
        }
      }
    }

    function stepRain() {
      for (let x = 0; x < cols; x++) {
        const d = drops[x];
        d.y += d.speed;
        if (d.y - d.len > rows) {
          d.y = Math.random() * -20;
          d.speed = 0.25 + Math.random() * 0.6;
          d.len = 6 + Math.random() * 18;
        }
      }
      for (let i = 0; i < cols * 2; i++) {
        glyphs[(Math.random() * glyphs.length) | 0] = (Math.random() * cfg.chars.length) | 0;
      }
    }

    function rainValue(x, y) {
      const d = drops[x];
      const dist = d.y - y;
      let v = 0;
      if (dist >= 0 && dist < d.len) v = dist < 1 ? 1 : Math.pow(1 - dist / d.len, 1.5) * 0.85;
      return Math.min(1, v + mouseBoost(x, y) * 0.5);
    }

    // draw ------------------------------------------------------------------
    // Every glyph in every colour is pre-rendered once into an atlas, so a frame
    // is just a few thousand drawImage calls instead of fillText + fillStyle churn.
    const chars = [...cfg.chars];
    const groups = mode === 'current' ? currentPalettes : [cfg.palette];
    let atlas = null;
    let gw = 0;
    let gh = 0;

    function buildAtlas() {
      gw = Math.ceil(cw * dpr);
      gh = Math.ceil(ch * dpr);
      atlas = document.createElement('canvas');
      atlas.width = gw * chars.length;
      atlas.height = gh * groups.length * BUCKETS;
      const a = atlas.getContext('2d');
      a.font = `${FONT_PX * dpr}px "Geist Mono", ui-monospace, Menlo, monospace`;
      a.textBaseline = 'top';
      groups.forEach((pal, g) =>
        pal.forEach((colour, b) => {
          a.fillStyle = colour;
          chars.forEach((c, i) => a.fillText(c, i * gw, (g * BUCKETS + b) * gh));
        })
      );
    }

    function draw() {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      if (mode === 'ember') stepEmber();
      if (mode === 'rain') stepRain();

      const n = chars.length;
      const np = PASTELS.length;
      for (let y = 0; y < rows; y++) {
        const py = Math.round(y * ch * dpr);
        for (let x = 0; x < cols; x++) {
          let v;
          let group = 0;
          if (mode === 'liquid') v = liquid(x, y);
          else if (mode === 'current') {
            v = current(x, y);
            const hue = x * 0.035 + y * 0.06 + 0.6 * Math.sin(x * 0.02 + t * 0.2) - t * 0.35;
            group = ((Math.floor(hue) % np) + np) % np;
          } else if (mode === 'ember') v = Math.min(1, heat[y * cols + x] * 1.15 + mouseBoost(x, y) * 0.3);
          else v = rainValue(x, y);

          if (v < 0.06) continue;
          const idx = mode === 'rain' ? glyphs[y * cols + x] : Math.min(n - 1, Math.floor(v * n));
          if (chars[idx] === ' ') continue;
          const b = Math.min(BUCKETS - 1, Math.floor(v * BUCKETS));
          ctx.drawImage(atlas, idx * gw, (group * BUCKETS + b) * gh, gw, gh, Math.round(x * cw * dpr), py, gw, gh);
        }
      }
    }

    function frame(now) {
      raf = requestAnimationFrame(frame);
      if (now - last < 1000 / FPS) return;
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      t += dt;
      mouse.energy *= 0.94;
      draw();
    }

    function onMove(e) {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
      mouse.energy = Math.min(1, mouse.energy + 0.25);
    }
    function onVis() {
      cancelAnimationFrame(raf);
      if (!document.hidden && !reduce) raf = requestAnimationFrame(frame);
    }

    resize();
    let alive = true;
    document.fonts?.ready.then(() => {
      if (!alive) return;
      resize();
      if (reduce) draw();
    });
    if (reduce) {
      t = 4;
      draw();
    } else {
      raf = requestAnimationFrame(frame);
    }

    const onResize = () => {
      resize();
      if (reduce) draw();
    };
    window.addEventListener('resize', onResize);
    window.addEventListener('pointermove', onMove, { passive: true });
    document.addEventListener('visibilitychange', onVis);
    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('pointermove', onMove);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [mode]);

  return (
    <>
      <canvas ref={canvasRef} className="ascii-bg" aria-hidden="true" />
      <div className="ascii-veil" aria-hidden="true" />
    </>
  );
}
