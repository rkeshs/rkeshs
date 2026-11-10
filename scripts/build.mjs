#!/usr/bin/env node
// Builds the animated header for README.md:
//   assets/trace-wide.svg    desktop
//   assets/trace-narrow.svg  phones
//
// Edit the data below, then run: node scripts/build.mjs
// No dependencies. The fonts in assets/fonts are embedded into each SVG,
// because an SVG shown through <img> cannot load anything from outside itself.

import { readFileSync, writeFileSync } from 'node:fs';

const repo = new URL('..', import.meta.url);

// ---------------------------------------------------------------- content

const name = 'Rishikesh S';
const tagline = ['Full-stack engineer.', 'TypeScript, fast backends, practical AI workflows.'];
const note = ['The same request twice, through the stack I work in.', 'Timings are illustrative.'];

// One row per layer, in the order a request meets them.
const layers = [
  { id: 'edge', tools: 'Vercel, AWS' },
  { id: 'route', tools: 'Hono, Express, FastAPI' },
  { id: 'auth', tools: 'Clerk, Better Auth' },
  { id: 'cache', tools: 'Redis' },
  { id: 'data', tools: 'Postgres, Drizzle' },
  { id: 'agent', tools: 'AI SDK, Mastra, RAG' },
  { id: 'render', tools: 'React, Next.js' },
];

// Each request lists [start, end] in milliseconds for the layers it touches.
// A layer left out is skipped, and its label dims while that request plays.
const requests = [
  {
    state: 'first time',
    cache: 'miss',
    spans: { edge: [0, 8], route: [8, 18], auth: [18, 27], cache: [27, 31], data: [31, 68], agent: [68, 198], render: [198, 212] },
  },
  {
    state: 'second time',
    cache: 'hit',
    spans: { edge: [0, 8], route: [8, 18], auth: [18, 27], cache: [27, 30], render: [30, 44] },
  },
];

const ticks = [0, 50, 100, 150, 200];

// ----------------------------------------------------------------- timing

const total = (r) => Math.max(...Object.values(r.spans).map(([, end]) => end));
const axisMs = Math.max(...requests.map(total));

const secondsPerMs = 3.6 / axisMs; // the slowest request takes 3.6 s to draw
const lead = 0.6; // pause before a request starts
const hold = 4.0; // how long a finished request stays up
const fade = 0.4;

let clock = 0;
const phases = requests.map((r) => {
  const begin = clock + lead;
  const end = begin + total(r) * secondsPerMs;
  const hide = end + hold;
  const gone = hide + fade;
  clock = gone;
  return { begin, end, hide, gone };
});
const cycle = clock + 0.2;

const pct = (seconds) => `${Math.min(100, Math.max(0, (seconds / cycle) * 100)).toFixed(2)}%`;

// ------------------------------------------------------------------ parts

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const n = (v) => +v.toFixed(2);
const font = (file) => readFileSync(new URL(`assets/fonts/${file}.woff2`, repo)).toString('base64');

function build(layout) {
  const { width, height, pad, x0, x1 } = layout;
  const perMs = (x1 - x0) / axisMs;
  const css = [];
  const out = [];
  let uid = 0;

  const animate = (frames) => {
    const id = `k${uid++}`;
    css.push(`@keyframes ${id}{${frames}}.${id}{animation:${id} ${n(cycle)}s linear infinite}`);
    return id;
  };

  // A bar that grows from its left edge between t0 and t1, then fades with its request.
  const grow = (t0, t1, p) =>
    animate(
      `0%,${pct(t0)}{transform:scaleX(0);opacity:1}` +
        `${pct(t1)},${pct(p.hide)}{transform:scaleX(1);opacity:1}` +
        `${pct(p.gone)},100%{transform:scaleX(1);opacity:0}`,
    );

  // Text that appears at t0 and fades with its request.
  const appear = (t0, p) =>
    animate(`0%,${pct(t0)}{opacity:0}${pct(t0 + 0.2)},${pct(p.hide)}{opacity:1}${pct(p.gone)},100%{opacity:0}`);

  // Without animation only the first request shows, fully drawn.
  const rest = (i) => (i === 0 ? '' : ' off');

  const bar = (row, r, i, span, extra = '') => {
    const p = phases[i];
    const [start, end] = span;
    const k = grow(p.begin + start * secondsPerMs, p.begin + end * secondsPerMs, p);
    return `<rect class="bar ${k}${rest(i)}${extra}" x="${n(x0 + start * perMs)}" y="${n(row.barY)}" width="${n((end - start) * perMs)}" height="${row.barH}"/>`;
  };

  // ---- header
  out.push(`<rect class="field" width="${width}" height="${height}" rx="${layout.radius}"/>`);
  out.push(
    `<text class="name" x="${pad}" y="${layout.nameY}" font-size="${layout.nameSize}" textLength="${n(layout.nameSize * 7.417)}" lengthAdjust="spacingAndGlyphs">${esc(name)}</text>`,
  );
  layout.tagline.forEach((line, i) =>
    out.push(`<text class="t" x="${pad}" y="${layout.taglineY + i * layout.taglineLead}" font-size="${layout.taglineSize}">${esc(line)}</text>`),
  );

  // ---- axis
  const { rows, rootRow } = layout;
  const last = rows[rows.length - 1];
  const axisTop = rootRow.barY;
  const axisBottom = last.barY + last.barH + layout.axisGap;
  for (const t of ticks) {
    const x = n(x0 + t * perMs);
    const y1 = layout.gridlines ? axisTop : axisBottom - 8;
    out.push(`<line class="grid" x1="${x}" y1="${y1}" x2="${x}" y2="${axisBottom}"/>`);
    const label = t === ticks[ticks.length - 1] ? `${t} ms` : `${t}`;
    out.push(`<text class="t soft" x="${x}" y="${axisBottom + 24}" font-size="${layout.small}"${t === 0 ? '' : ' text-anchor="middle"'}>${label}</text>`);
  }

  // ---- the request row: one bar for the whole request, its total inside
  out.push(`<text class="b" x="${rootRow.labelX}" y="${rootRow.labelY}" font-size="${layout.label}">request</text>`);
  requests.forEach((r, i) => {
    const p = phases[i];
    out.push(
      `<text class="t ${appear(p.begin - 0.2, p)}${rest(i)}" x="${rootRow.toolsX}" y="${rootRow.labelY}" font-size="${layout.tools}">${esc(r.state)}</text>`,
    );
    out.push(bar(rootRow, r, i, [0, total(r)]));
    out.push(
      `<text class="total ${appear(p.end, p)}${rest(i)}" x="${x0 + layout.totalInset}" y="${n(rootRow.barY + rootRow.barH / 2 + layout.totalSize * 0.35)}" font-size="${layout.totalSize}">${total(r)} ms</text>`,
    );
  });

  // ---- one row per layer
  layers.forEach((layer, li) => {
    const row = rows[li];

    // Dim the label while a request that skips this layer is on screen.
    const skipped = phases.filter((_, i) => !(layer.id in requests[i].spans));
    let dim = '';
    if (skipped.length) {
      const frames = skipped
        .map((p) => `${pct(p.begin - 0.3)}{opacity:1}${pct(p.begin)},${pct(p.hide)}{opacity:.3}${pct(p.gone)}{opacity:1}`)
        .join('');
      dim = ` class="${animate(`0%{opacity:1}${frames}100%{opacity:1}`)}"`;
    }
    out.push(
      `<g${dim}>` +
        `<text class="b" x="${row.labelX}" y="${row.labelY}" font-size="${layout.label}">${esc(layer.id)}</text>` +
        `<text class="t soft" x="${row.toolsX}" y="${row.labelY}" font-size="${layout.tools}">${esc(layer.tools)}</text>` +
        `</g>`,
    );

    requests.forEach((r, i) => {
      const span = r.spans[layer.id];
      if (!span) return;
      const isCache = layer.id === 'cache';
      out.push(bar(row, r, i, span, isCache && r.cache === 'hit' ? ' hit' : ''));
      if (isCache) {
        const p = phases[i];
        out.push(
          `<text class="b ${appear(p.begin + span[1] * secondsPerMs, p)}${rest(i)}" x="${n(x0 + span[1] * perMs + 10)}" y="${n(row.barY + row.barH / 2 + layout.small * 0.35)}" font-size="${layout.small}">${esc(r.cache)}</text>`,
        );
      }
    });
  });

  // ---- playhead: sweeps each request at the same speed, so the cached one is over quickly
  const sweep = phases
    .map((p, i) => {
      const reach = n(total(requests[i]) * perMs);
      return (
        `${pct(p.begin - 0.02)}{transform:translateX(0);opacity:0}` +
        `${pct(p.begin)}{transform:translateX(0);opacity:1}` +
        `${pct(p.end)}{transform:translateX(${reach}px);opacity:1}` +
        `${pct(p.end + 0.3)},${pct(p.gone)}{transform:translateX(${reach}px);opacity:0}`
      );
    })
    .join('');
  out.push(
    `<line class="head ${animate(`0%{transform:translateX(0);opacity:0}${sweep}100%{transform:translateX(0);opacity:0}`)}" x1="${x0}" y1="${axisTop - 10}" x2="${x0}" y2="${axisBottom}"/>`,
  );

  // ---- note
  layout.note.forEach((line, i) =>
    out.push(`<text class="t soft" x="${pad}" y="${layout.noteY + i * layout.noteLead}" font-size="${layout.small}">${esc(line)}</text>`),
  );

  const first = requests[0];
  const description =
    `${name}. ${tagline.join(' ')} A trace of one request through ${layers.map((l) => `${l.id} (${l.tools})`).join(', ')}. ` +
    requests.map((r) => `The ${r.state} it is a cache ${r.cache} and takes ${total(r)} ms.`).join(' ');

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" role="img" aria-labelledby="title desc">
<title id="title">${esc(name)}: a request traced through the stack, ${total(first)} ms</title>
<desc id="desc">${esc(description)}</desc>
<style>
@font-face{font-family:"Archivo Wide";font-weight:900;src:url(data:font/woff2;base64,${font('archivo-display')}) format("woff2")}
@font-face{font-family:"Archivo";font-weight:700;src:url(data:font/woff2;base64,${font('archivo-bold')}) format("woff2")}
@font-face{font-family:"Archivo";font-weight:500;src:url(data:font/woff2;base64,${font('archivo-text')}) format("woff2")}
svg{--field:#FFB000;--ink:#1A1446;--mark:#1A1446;--accent:#C2104F}
@media (prefers-color-scheme:dark){svg{--field:#1A1446;--ink:#FFE9B8;--mark:#FFB000;--accent:#FF5C93}}
.field{fill:var(--field)}
text{font-family:"Archivo","Helvetica Neue",Arial,sans-serif;fill:var(--ink)}
.t{font-weight:500}
.b{font-weight:700}
.soft{fill-opacity:.8}
.name,.total{font-family:"Archivo Wide","Arial Black","Helvetica Neue",Arial,sans-serif;font-weight:900}
.name{fill:var(--mark)}
.total{fill:var(--field)}
.bar{fill:var(--mark);transform-box:fill-box;transform-origin:0 50%}
.hit{fill:var(--accent)}
.grid{stroke:var(--ink);stroke-opacity:.18;stroke-width:1}
.head{stroke:var(--accent);stroke-width:3;opacity:0}
.off{opacity:0}
${css.join('\n')}
@media (prefers-reduced-motion:reduce){*{animation:none!important}}
</style>
${out.join('\n')}
</svg>
`;
}

// ---------------------------------------------------------------- layouts

function wide() {
  const pad = 56;
  const top = 276;
  const row = (y, barH, pitch) => ({ labelX: pad, toolsX: pad + 98, labelY: y + pitch / 2 + 7, barY: y + (pitch - barH) / 2, barH });
  const rows = layers.map((_, i) => row(top + 60 + i * 44, 24, 44));
  return {
    width: 1200, height: 764, pad, radius: 24,
    x0: 392, x1: 1144,
    nameSize: 146, nameY: 160,
    tagline: [tagline.join(' ')], taglineY: 214, taglineSize: 28, taglineLead: 0,
    label: 22, tools: 20, small: 18,
    rootRow: row(top, 40, 52), rows,
    totalSize: 26, totalInset: 12,
    gridlines: true, axisGap: 14,
    note: [note.join(' ')], noteY: 724, noteLead: 0,
  };
}

function narrow() {
  const pad = 32;
  const top = 196;
  const row = (y, barH) => ({ labelX: pad, toolsX: pad + 98, labelY: y + 20, barY: y + 32, barH });
  const rows = layers.map((_, i) => row(top + 90 + i * 64, 16));
  return {
    width: 600, height: 866, pad, radius: 20,
    x0: pad, x1: 600 - pad,
    nameSize: 72, nameY: 84,
    tagline, taglineY: 124, taglineSize: 23, taglineLead: 30,
    label: 22, tools: 20, small: 18,
    rootRow: row(top, 36), rows,
    totalSize: 22, totalInset: 10,
    gridlines: false, axisGap: 16,
    note, noteY: 800, noteLead: 26,
  };
}

for (const [file, layout] of [['trace-wide', wide()], ['trace-narrow', narrow()]]) {
  const svg = build(layout);
  writeFileSync(new URL(`assets/${file}.svg`, repo), svg);
  console.log(`assets/${file}.svg  ${(svg.length / 1024).toFixed(1)} kB`);
}
