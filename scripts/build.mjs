#!/usr/bin/env node
// Builds the images in README.md:
//   assets/profile-wide.svg    desktop
//   assets/profile-narrow.svg  phones
//   assets/link-*.svg          the link buttons under it
//
// Edit the content below, then run: node scripts/build.mjs
// No dependencies. Fonts, icons and the grain texture are embedded in each
// SVG, because an SVG shown through <img> cannot load anything from outside.
//
// Icons: Simple Icons (CC0) for brands, Phosphor (MIT) for the generic ones.
// Fonts: Syne, Instrument Sans and DM Mono (SIL Open Font License, see assets/fonts).

import { readFileSync, writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

const repo = new URL('..', import.meta.url);
const icons = JSON.parse(readFileSync(new URL('scripts/icons.json', repo), 'utf8'));
const font = (file) => readFileSync(new URL(`assets/fonts/${file}.woff2`, repo)).toString('base64');

// ---------------------------------------------------------------- content

const name = 'Rishikesh S';
const handle = 'rkeshs';
const tagline = ['Full-stack engineer.', 'TypeScript, fast backends, practical AI workflows.'];

// The terminal window: a few plain facts, next to an ASCII hillside.
const facts = [
  ['role', 'full-stack engineer'],
  ['based in', 'india'],
  ['likes', 'reliable software, clean dev workflows'],
  ['ships', 'products that survive real users'],
  ['editor', 'zed'],
  ['ask me', 'system design, ai agents, why typescript'],
  ['site', 'rishikeshs.net'],
];
const art = [
  '     .       *        .   ',
  '  *      /\\       .       ',
  '        /  \\         *    ',
  '   /\\  /    \\    /\\       ',
  '  /  \\/      \\  /  \\      ',
  ' /    \\       \\/    \\     ',
  '/      \\      /      \\    ',
  '  ^  ^   ^  ^    ^  ^   ^ ',
  ' ^^^^^^ ^^^^^^  ^^^^^ ^^^^',
];

// Each group has its own tile colour. [label, icon key in scripts/icons.json]
const groups = [
  { name: 'Languages', color: '#4B6788', skills: [['TypeScript', 'typescript'], ['JavaScript', 'javascript'], ['Python', 'python'], ['Java', 'openjdk'], ['C++', 'cplusplus'], ['Solidity', 'solidity']] },
  { name: 'Frontend', color: '#8C4F71', skills: [['React', 'react'], ['Next.js', 'nextdotjs'], ['React Native', 'react'], ['Remotion', 'film-strip'], ['Tailwind CSS', 'tailwindcss'], ['shadcn/ui', 'shadcnui']] },
  { name: 'Backend and data', color: '#3F6E57', skills: [['Node.js', 'nodedotjs'], ['Express', 'express'], ['Hono', 'hono'], ['FastAPI', 'fastapi'], ['Spring Boot', 'springboot'], ['PostgreSQL', 'postgresql'], ['Redis', 'redis'], ['Drizzle', 'drizzle']] },
  { name: 'Cloud and infra', color: '#2F7A80', skills: [['AWS', 'amazonwebservices'], ['Vercel', 'vercel'], ['Docker', 'docker'], ['Serverless', 'serverless'], ['Linux', 'linux']] },
  { name: 'Tooling and quality', color: '#9A6B22', skills: [['Git', 'git'], ['GitHub', 'github'], ['Vitest', 'vitest'], ['Turborepo', 'turborepo'], ['Bun', 'bun'], ['Zod', 'zod'], ['Sentry', 'sentry'], ['PostHog', 'posthog'], ['Mixpanel', 'mixpanel']] },
  { name: 'Auth', color: '#B2573C', skills: [['Clerk', 'clerk'], ['Better Auth', 'betterauth']] },
  { name: 'AI', color: '#6B5BB5', skills: [['AI agents', 'robot'], ['RAG', 'file-magnifying-glass'], ['AI SDK', 'vercel'], ['Mastra', 'graph']] },
];

// width is the label's width at 17px Instrument Sans 600, measured in a browser.
const links = [
  { file: 'link-site', label: 'rishikeshs.net', icon: 'globe-simple', color: '#3F6E57', width: 111 },
  { file: 'link-linkedin', label: 'LinkedIn', icon: 'linkedin', color: '#4B6788', width: 68 },
  { file: 'link-email', label: 'Email', icon: 'envelope-simple', color: '#B2573C', width: 45 },
];

// ---------------------------------------------------------------- helpers

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const n = (v) => +v.toFixed(1);

// Seeded random numbers, so a rebuild gives the same landscape.
function random(seed) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// A small tile of film grain as a PNG: light and dark specks on transparency.
function grainTile(size, seed) {
  const rand = random(seed);
  const alphas = [0, 14, 30, 50, 14, 30, 50];
  const weights = [0.26, 0.17, 0.13, 0.07, 0.17, 0.13, 0.07];
  const raw = Buffer.alloc(size * (size + 1));
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let r = rand();
      let i = 0;
      while (i < weights.length - 1 && r > weights[i]) r -= weights[i++];
      raw[y * (size + 1) + 1 + x] = i;
    }
  }
  const table = Array.from({ length: 256 }, (_, k) => {
    let c = k;
    for (let j = 0; j < 8; j++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    return c >>> 0;
  });
  const crc = (buf) => {
    let c = 0xffffffff;
    for (const b of buf) c = table[(c ^ b) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  };
  const chunk = (type, data) => {
    const body = Buffer.concat([Buffer.from(type), data]);
    const out = Buffer.alloc(body.length + 8);
    out.writeUInt32BE(data.length, 0);
    body.copy(out, 4);
    out.writeUInt32BE(crc(body), body.length + 4);
    return out;
  };
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header[8] = 8; // bits per pixel
  header[9] = 3; // palette
  const palette = Buffer.from(alphas.flatMap((_, i) => (i >= 1 && i <= 3 ? [255, 250, 240] : [20, 16, 30])));
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', header),
    chunk('PLTE', palette),
    chunk('tRNS', Buffer.from(alphas)),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]).toString('base64');
}

const grain = grainTile(160, 7);

const icon = (key, cx, cy, size) => {
  const { box, d } = icons[key];
  return `<path class="glyph" transform="translate(${n(cx - size / 2)} ${n(cy - size / 2)}) scale(${+(size / box).toFixed(4)})" d="${d}"/>`;
};

const fonts = (...files) =>
  files
    .map((f) => {
      const family = f.startsWith('syne') ? 'Syne' : f.startsWith('dm-mono') ? 'DM Mono' : 'Instrument Sans';
      return `@font-face{font-family:"${family}";font-weight:${f.slice(-3)};src:url(data:font/woff2;base64,${font(f)}) format("woff2")}`;
    })
    .join('\n');

// Shared colours. The landscape is morning in light mode and night in dark mode.
const theme = `
svg{
--sky1:#9FB2CC;--sky2:#E6C3A5;--sky3:#F7E4C6;--sun:#FFF6DC;--glow:#FFD79A;--cloud:#FFF3E2;
--h1:#A7B3C6;--h2:#8E9FB3;--h3:#7A9296;--h4:#74875F;--h5:#8E8C52;--h6:#55643B;--tree:#35432E;--haze:#F4E3C9;
--stars:0;--birds:.55;--grain:.95;
--win:#FBFAF6;--bar:#F3F1EC;--line:#E2DED5;--dot:#D2CEC4;--ink:#1F2421;--soft:#666C66;--shadow:#3A2A14;
--term:#1A1F1C;--termbar:#232926;--termline:#343B36}
@media (prefers-color-scheme:dark){svg{
--sky1:#070B1E;--sky2:#172048;--sky3:#3B3D75;--sun:#F3ECD6;--glow:#8E93D6;--cloud:#5A62A0;
--h1:#343F78;--h2:#283264;--h3:#1E2750;--h4:#171E40;--h5:#111730;--h6:#0B1024;--tree:#060916;--haze:#2F356E;
--stars:1;--birds:0;--grain:.7;
--win:#15181F;--bar:#1B1F28;--line:#2A2F3B;--dot:#3A404E;--ink:#ECEEF2;--soft:#9BA2AF;--shadow:#000000;
--term:#0D1015;--termbar:#141820;--termline:#262B37}}
text{font-family:"Instrument Sans","Helvetica Neue",Arial,sans-serif;font-weight:500;fill:var(--ink)}
.soft{fill:var(--soft)}
.glyph{fill:#FFF8EC}`;

// -------------------------------------------------------------- landscape

const fox = (x, y, size) => `<g transform="translate(${x} ${y}) scale(${size})">
<ellipse cx="108" cy="114" rx="78" ry="5" fill="#1F2A1A" opacity=".4"/>
<g class="tail"><path d="M142 62C168 44 200 48 212 70C198 80 172 84 146 80Z" fill="#C4623A"/><path d="M192 55C203 57 210 63 212 70C205 75 196 76 188 74C194 68 195 61 192 55Z" fill="#F6E7CF"/></g>
<path d="M128 84L121 112M141 82L147 112" stroke="#3A2418" stroke-width="6.5" stroke-linecap="round"/>
<path d="M60 60C70 40 130 38 150 58C158 70 150 88 130 90L80 90C66 90 56 76 60 60Z" fill="#CE6B3F"/>
<path d="M79 86L70 112M92 88L94 112" stroke="#3A2418" stroke-width="6.5" stroke-linecap="round"/>
<path d="M56 74L72 66L80 90L66 90Z" fill="#F6E7CF"/>
<path d="M74 46L63 20L53 38L42 24L41 46L16 64L23 70L58 76Z" fill="#CE6B3F"/>
<path d="M63 20L58 30L66 32ZM42 24L42 34L48 33Z" fill="#3A2418"/>
<path d="M16 64L23 70L40 68L30 60Z" fill="#F6E7CF"/>
<circle cx="18.5" cy="65" r="3" fill="#3A2418"/><circle cx="42" cy="51" r="2.6" fill="#2A1A12"/>
</g>`;

// One conifer as a path: a thin trunk and six ragged tiers.
function pineShape(rand, x, base, h) {
  const w = h * 0.36;
  let d = `M${n(x - 1.5)} ${n(base + 4)}V${n(base - h * 0.06)}`;
  const tiers = 6;
  for (let t = tiers; t >= 1; t--) {
    const y = base - h + (h * 0.94 * t) / tiers;
    const half = (w / 2) * (t / tiers) * (0.85 + rand() * 0.3);
    d += `L${n(x - half)} ${n(y)}L${n(x - half * 0.35)} ${n(y - (h / tiers) * 0.55)}`;
  }
  d += `L${n(x)} ${n(base - h)}`;
  for (let t = 1; t <= tiers; t++) {
    const y = base - h + (h * 0.94 * t) / tiers;
    const half = (w / 2) * (t / tiers) * (0.85 + rand() * 0.3);
    d += `L${n(x + half * 0.35)} ${n(y - (h / tiers) * 0.55)}L${n(x + half)} ${n(y)}`;
  }
  return `${d}L${n(x + 1.5)} ${n(base - h * 0.06)}V${n(base + 4)}Z`;
}

function landscape(layout, rand) {
  const { width, height, win } = layout;
  const out = [];
  const defs = [];

  // sky, sun (or moon), stars
  defs.push(
    `<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:var(--sky1)"/><stop offset=".3" style="stop-color:var(--sky2)"/><stop offset=".55" style="stop-color:var(--sky3)"/></linearGradient>`,
    `<radialGradient id="glow"><stop offset="0" style="stop-color:var(--glow);stop-opacity:.9"/><stop offset="1" style="stop-color:var(--glow);stop-opacity:0"/></radialGradient>`,
    `<radialGradient id="puff"><stop offset="0" style="stop-color:var(--cloud);stop-opacity:.85"/><stop offset="1" style="stop-color:var(--cloud);stop-opacity:0"/></radialGradient>`,
  );
  out.push(`<rect width="${width}" height="${height}" fill="url(#sky)"/>`);

  const stars = [[], []];
  for (let i = 0; i < 70; i++) {
    const x = rand() * width;
    const y = rand() * (win.y + 120);
    stars[i % 2].push(`<circle cx="${n(x)}" cy="${n(y)}" r="${n(0.7 + rand() * 1.1)}"/>`);
  }
  out.push(`<g class="stars" fill="#F3ECD6"><g class="tw1">${stars[0].join('')}</g><g class="tw2">${stars[1].join('')}</g></g>`);

  const sun = { x: width * 0.8, y: win.y * 0.52, r: win.y * 0.2 };
  out.push(`<circle cx="${n(sun.x)}" cy="${n(sun.y)}" r="${n(sun.r * 5.5)}" fill="url(#glow)"/>`);
  out.push(`<circle cx="${n(sun.x)}" cy="${n(sun.y)}" r="${n(sun.r)}" style="fill:var(--sun)"/>`);

  // clouds: clusters of soft puffs that drift
  const cloud = (cx, cy, scale) => {
    let puffs = '';
    for (let i = 0; i < 7; i++) {
      const dx = (rand() - 0.5) * 230 * scale;
      const dy = (rand() - 0.5) * 22 * scale;
      puffs += `<ellipse cx="${n(cx + dx)}" cy="${n(cy + dy)}" rx="${n((70 + rand() * 80) * scale)}" ry="${n((16 + rand() * 14) * scale)}" fill="url(#puff)"/>`;
    }
    return puffs;
  };
  const s = width / 1200;
  out.push(`<g class="drift1">${cloud(width * 0.2, win.y * 0.42, 0.6 + 0.4 * s)}${cloud(width * 0.92, win.y * 0.9, 0.5 + 0.4 * s)}</g>`);
  out.push(`<g class="drift2">${cloud(width * 0.55, win.y * 0.7, 0.5 + 0.4 * s)}${cloud(width * 0.02, win.y * 1.05, 0.5 + 0.3 * s)}</g>`);

  // birds
  const bird = (x, y, w) => `<path d="M${n(x)} ${n(y)}q${n(w / 2)} ${n(-w / 2)} ${w} 0q${n(w / 2)} ${n(-w / 2)} ${w} 0"/>`;
  out.push(
    `<g class="birds" fill="none" stroke-width="1.6" stroke-linecap="round" style="stroke:var(--ink)">${bird(width * 0.36, win.y * 0.36, 8)}${bird(width * 0.36 + 26, win.y * 0.36 + 13, 6)}${bird(width * 0.36 - 20, win.y * 0.36 + 20, 5)}</g>`,
  );

  // hills, far to near. Each ridge is a few sine waves; nearer ones carry a forest edge.
  const near = height - win.bottom * 0.62;
  const first = win.y + 6;
  const count = 6;
  const pine = (x, base, h) => pineShape(rand, x, base, h);

  for (let i = 0; i < count; i++) {
    const t = i / (count - 1);
    const base = i === 0 ? first : first + 170 + (near - first - 170) * ((i - 1) / (count - 2));
    const amp = i === 0 ? win.y * 0.5 : 52 - i * 6;
    const waves = [0, 1, 2].map((k) => ({ len: (260 + rand() * 240) / (k * 1.7 + 1), phase: rand() * 7, gain: [0.62, 0.28, 0.1][k] }));
    const ridge = (x) => base + amp * waves.reduce((sum, w) => sum + w.gain * Math.sin(x / w.len + w.phase), 0);
    const teeth = i < 2 ? 0 : 3 + i * 2.2; // forest edge height
    const step = i < 2 ? 12 : 5;
    let d = `M0 ${height}L0 ${n(ridge(0))}`;
    for (let x = step; x <= width + step; x += step) {
      const y = ridge(x);
      d += teeth ? `L${n(x - step / 2)} ${n(y - teeth * (0.35 + rand() * 0.65))}L${n(x)} ${n(y)}` : `L${n(x)} ${n(y)}`;
    }
    d += `L${width} ${height}Z`;
    const top = base - amp;
    const fade = i === count - 1 ? height : top + 250;
    defs.push(
      `<linearGradient id="hill${i}" gradientUnits="userSpaceOnUse" x1="0" y1="${n(top)}" x2="0" y2="${n(fade)}"><stop offset="0" style="stop-color:var(--h${i + 1})"/><stop offset="1" style="stop-color:var(--haze);stop-opacity:${n(0.9 - t * 0.75)}"/></linearGradient>`,
    );
    out.push(`<path d="${d}" style="fill:var(--h${i + 1})"/><path d="${d}" fill="url(#hill${i})"/>`);

    // standing pines on the two nearest ridges, tallest at the edges of the picture
    if (i >= count - 2) {
      const tall = i === count - 1;
      let trees = '';
      const total = Math.round((width / 1200) * (tall ? 16 : 22));
      for (let k = 0; k < total; k++) {
        const x = rand() * width;
        const edge = Math.min(x, width - x) / width; // 0 at the sides
        const h = tall ? 34 + rand() * 30 + Math.max(0, 0.09 - edge) * 2 * width * (0.6 + rand() * 0.4) : 22 + rand() * 20;
        trees += pine(x, ridge(x) + 3, h);
      }
      out.push(`<path d="${trees}" style="fill:var(${tall ? '--tree' : '--h6'})"/>`);
    }
  }

  if (layout.fox) out.push(fox(layout.fox.x, layout.fox.y, layout.fox.size));

  // grain over everything
  defs.push(
    `<pattern id="grain" width="208" height="208" patternUnits="userSpaceOnUse"><image width="208" height="208" href="data:image/png;base64,${grain}"/></pattern>`,
  );
  out.push(`<rect width="${width}" height="${height}" fill="url(#grain)" style="opacity:var(--grain)"/>`);

  return { defs: defs.join(''), body: out.join('\n') };
}

// --------------------------------------------------------------- terminal

const artColor = (ch) => (ch === '^' ? '#86A872' : ch === '*' || ch === '.' ? '#F1DFA0' : '#A9A2CC');

function terminal(t) {
  const out = [];
  const cw = t.size * 0.6; // DM Mono is 0.6em wide
  for (let i = 6; i >= 1; i--) {
    out.push(`<rect x="${t.x - i * 2}" y="${t.y - i * 2 + 10}" width="${t.w + i * 4}" height="${t.h + i * 4}" rx="${t.r + i * 2}" style="fill:var(--shadow)" opacity=".05"/>`);
  }
  out.push(`<rect x="${t.x}" y="${t.y}" width="${t.w}" height="${t.h}" rx="${t.r}" style="fill:var(--term)"/>`);
  out.push(
    `<path d="M${t.x} ${t.y + t.bar}v${-(t.bar - t.r)}a${t.r} ${t.r} 0 0 1 ${t.r} ${-t.r}h${t.w - t.r * 2}a${t.r} ${t.r} 0 0 1 ${t.r} ${t.r}v${t.bar - t.r}z" style="fill:var(--termbar)"/>`,
  );
  out.push(`<rect x="${t.x + 0.5}" y="${t.y + 0.5}" width="${t.w - 1}" height="${t.h - 1}" rx="${t.r}" fill="none" style="stroke:var(--termline)"/>`);
  for (let i = 0; i < 3; i++) out.push(`<circle cx="${t.x + 24 + i * 21}" cy="${t.y + t.bar / 2}" r="6.5" fill="#4A524C"/>`);
  out.push(`<text class="mono" x="${t.x + t.w / 2}" y="${t.y + t.bar / 2 + 5}" font-size="${t.size - 2}" text-anchor="middle" style="fill:#8D958C">about</text>`);

  const x = t.x + t.pad;
  let y = t.y + t.bar + t.pad + t.size * 0.8;
  const prompt = (cmd) =>
    `<text class="mono" x="${x}" y="${n(y)}" font-size="${t.size}"><tspan fill="#9DBB88">${esc(handle)}@github</tspan><tspan fill="#8D958C">:~$</tspan><tspan fill="#EDE8DA"> ${esc(cmd)}</tspan></text>`;
  out.push(prompt('about'));
  y += t.lead * 1.5;

  const artTop = y;
  art.forEach((line, i) => {
    let spans = '';
    let run = '';
    let color = null;
    for (const ch of line + '\n') {
      const c = ch === ' ' || ch === '\n' ? color : artColor(ch);
      if (ch === '\n' || c !== color) {
        if (run) spans += `<tspan fill="${color}">${esc(run)}</tspan>`;
        run = '';
        color = c;
      }
      if (ch !== '\n') run += ch;
    }
    out.push(`<text class="mono" x="${x}" y="${n(artTop + i * t.lead)}" font-size="${t.size}">${spans}</text>`);
  });

  const factsX = t.stacked ? x : x + (art[0].length + 3) * cw;
  const factsTop = t.stacked ? artTop + (art.length + 0.6) * t.lead : artTop + t.lead;
  facts.forEach(([key, value], i) => {
    const fy = n(factsTop + i * t.lead);
    out.push(
      `<text class="mono" x="${n(factsX)}" y="${fy}" font-size="${t.size}" style="fill:#DDA94B">${esc(key)}</text>` +
        `<text class="mono" x="${n(factsX + 10 * cw)}" y="${fy}" font-size="${t.size}" style="fill:#EDE8DA">${esc(value)}</text>`,
    );
  });

  y = (t.stacked ? factsTop + facts.length * t.lead : artTop + art.length * t.lead) + t.lead * 0.5;
  out.push(prompt(''));
  out.push(`<rect class="cursor" x="${n(x + (handle.length + 11) * cw)}" y="${n(y - t.size * 0.86)}" width="${n(cw)}" height="${n(t.size * 1.1)}" fill="#EDE8DA"/>`);
  return out.join('\n');
}

// How tall the terminal needs to be for its content.
const terminalHeight = (t) => {
  const rows = 1.5 + art.length + (t.stacked ? 0.6 + facts.length : 0) + 0.5;
  return Math.round(t.bar + t.pad + t.size * 0.8 + rows * t.lead + t.pad);
};

// ----------------------------------------------------------------- window

function page(layout) {
  const { width, height, win, radius } = layout;
  const rand = random(layout.seed);
  const scene = landscape(layout, rand);
  const out = [];

  // soft shadow, drawn as stacked outlines so nothing needs a blur filter
  for (let i = 6; i >= 1; i--) {
    out.push(
      `<rect x="${win.x - i * 2}" y="${win.y - i * 2 + 10}" width="${win.w + i * 4}" height="${win.h + i * 4}" rx="${win.r + i * 2}" style="fill:var(--shadow)" opacity=".035"/>`,
    );
  }
  out.push(`<rect x="${win.x}" y="${win.y}" width="${win.w}" height="${win.h}" rx="${win.r}" style="fill:var(--win)"/>`);
  out.push(
    `<path d="M${win.x} ${win.y + win.bar}v${-(win.bar - win.r)}a${win.r} ${win.r} 0 0 1 ${win.r} ${-win.r}h${win.w - win.r * 2}a${win.r} ${win.r} 0 0 1 ${win.r} ${win.r}v${win.bar - win.r}z" style="fill:var(--bar)"/>`,
  );
  out.push(`<rect x="${win.x}" y="${win.y + win.bar}" width="${win.w}" height="1" style="fill:var(--line)"/>`);
  out.push(`<rect x="${win.x + 0.5}" y="${win.y + 0.5}" width="${win.w - 1}" height="${win.h - 1}" rx="${win.r}" fill="none" style="stroke:var(--line)"/>`);
  for (let i = 0; i < 3; i++) out.push(`<circle cx="${win.x + 24 + i * 21}" cy="${win.y + win.bar / 2}" r="6.5" style="fill:var(--dot)"/>`);
  out.push(`<text class="soft" x="${win.x + win.w / 2}" y="${win.y + win.bar / 2 + 5.5}" font-size="${layout.small}" text-anchor="middle">${esc(handle)}</text>`);

  // name and one line
  const left = win.x + layout.pad;
  out.push(`<text class="name" x="${left}" y="${layout.nameY}" font-size="${layout.nameSize}">${esc(name)}</text>`);
  layout.tagline.forEach((line, i) =>
    out.push(`<text class="soft" x="${left}" y="${layout.taglineY + i * layout.taglineLead}" font-size="${layout.taglineSize}">${esc(line)}</text>`),
  );

  // skills
  const skills = groups.flatMap((g) => g.skills.map(([label, key]) => ({ label, key, color: g.color })));
  const cell = (win.w - layout.pad * 2 + layout.gutter) / layout.cols;
  skills.forEach((skill, i) => {
    const cx = left - layout.gutter / 2 + cell * ((i % layout.cols) + 0.5);
    const top = layout.gridY + Math.floor(i / layout.cols) * layout.pitch;
    out.push(
      `<rect x="${n(cx - layout.tile / 2)}" y="${top}" width="${layout.tile}" height="${layout.tile}" rx="${n(layout.tile * 0.29)}" fill="${skill.color}"/>` +
        icon(skill.key, cx, top + layout.tile / 2, layout.tile * 0.5) +
        `<text x="${n(cx)}" y="${top + layout.tile + layout.label * 1.45}" font-size="${layout.label}" text-anchor="middle">${esc(skill.label)}</text>`,
    );
  });

  out.push(terminal(layout.term));

  const description =
    `${name}. ${tagline.join(' ')} ` +
    groups.map((g) => `${g.name}: ${g.skills.map(([label]) => label).join(', ')}.`).join(' ') +
    ` A terminal window lists: ${facts.map(([k, v]) => `${k}, ${v}`).join('; ')}.`;

  return `<svg xmlns="http://www.w3.org/2000/svg" xml:space="preserve" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" role="img" aria-labelledby="title desc">
<title id="title">${esc(name)}: skills and a short about, in two windows over a landscape</title>
<desc id="desc">${esc(description)}</desc>
<style>
${fonts('syne-800', 'instrument-sans-500', 'dm-mono-400')}${theme}
.name{font-family:"Syne","Arial Black","Helvetica Neue",Arial,sans-serif;font-weight:800;letter-spacing:-.01em}
.mono{font-family:"DM Mono",ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-weight:400;white-space:pre}
.cursor{animation:blink 1.1s steps(1) infinite}
.tail{transform-box:fill-box;transform-origin:0 60%;animation:sway 3.6s ease-in-out infinite alternate}
@keyframes blink{50%{opacity:0}}
@keyframes sway{from{transform:rotate(-5deg)}to{transform:rotate(6deg)}}
.stars{opacity:var(--stars)}
.birds{opacity:var(--birds);animation:fly 80s linear infinite}
.drift1{animation:drift 70s ease-in-out infinite alternate}
.drift2{animation:drift 95s ease-in-out infinite alternate-reverse}
.tw1{animation:twinkle 5s ease-in-out infinite alternate}
.tw2{animation:twinkle 7s ease-in-out infinite alternate-reverse}
@keyframes drift{from{transform:translateX(-${Math.round(width * 0.05)}px)}to{transform:translateX(${Math.round(width * 0.07)}px)}}
@keyframes fly{from{transform:translate(-${Math.round(width * 0.5)}px,10px)}to{transform:translate(${Math.round(width * 0.8)}px,-14px)}}
@keyframes twinkle{from{opacity:.35}to{opacity:1}}
@media (prefers-reduced-motion:reduce){*{animation:none!important}}
</style>
<defs><clipPath id="frame"><rect width="${width}" height="${height}" rx="${radius}"/></clipPath>${scene.defs}</defs>
<g clip-path="url(#frame)">
${scene.body}
</g>
${out.join('\n')}
</svg>
`;
}

// ---------------------------------------------------------------- layouts

function wide() {
  const win = { x: 72, y: 148, w: 1056, bar: 46, r: 18 };
  const gridY = win.y + 204;
  const pitch = 104;
  const rows = 5;
  win.h = gridY - win.y + (rows - 1) * pitch + 56 + 30 + 46;
  win.bottom = 104;
  // the terminal overlaps the bottom edge of the skills window, like a second window on a desktop
  const term = { x: 250, y: win.y + win.h - 22, w: 878, bar: 42, r: 16, pad: 28, size: 17, lead: 26, stacked: false };
  term.h = terminalHeight(term);
  const height = term.y + term.h + win.bottom;
  return {
    seed: 11, width: 1200, height, radius: 22, win, term,
    fox: { x: 104, y: height - 106, size: 0.5 },
    pad: 40, cols: 8, gutter: 0, tile: 56, pitch, gridY, label: 15.5, small: 15,
    nameSize: 56, nameY: win.y + 124,
    tagline: [tagline.join(' ')], taglineY: win.y + 162, taglineSize: 19.5, taglineLead: 0,
  };
}

function narrow() {
  const win = { x: 20, y: 116, w: 560, bar: 46, r: 18 };
  const gridY = win.y + 222;
  const pitch = 118;
  const rows = 10;
  win.h = gridY - win.y + (rows - 1) * pitch + 62 + 34 + 26;
  win.bottom = 96;
  const term = { x: 20, y: win.y + win.h + 18, w: 560, bar: 42, r: 16, pad: 24, size: 17, lead: 26, stacked: true };
  term.h = terminalHeight(term);
  const height = term.y + term.h + win.bottom;
  return {
    seed: 5, width: 600, height, radius: 20, win, term,
    fox: { x: 430, y: height - 100, size: 0.46 },
    pad: 26, cols: 4, gutter: 0, tile: 62, pitch, gridY, label: 18, small: 16,
    nameSize: 52, nameY: win.y + 118,
    tagline, taglineY: win.y + 154, taglineSize: 19.5, taglineLead: 27,
  };
}

// ------------------------------------------------------------ link buttons

function button({ label, icon: key, color, width }) {
  const w = 54 + width + 22;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} 48" width="${w}" height="48" role="img" aria-label="${esc(label)}">
<style>
${fonts('instrument-sans-600')}${theme}
text{font-weight:600}
</style>
<rect x=".5" y=".5" width="${w - 1}" height="47" rx="23.5" style="fill:var(--win);stroke:var(--line)"/>
<circle cx="24" cy="24" r="15" fill="${color}"/>
${icon(key, 24, 24, 16)}
<text x="48" y="30" font-size="17">${esc(label)}</text>
</svg>
`;
}

// ------------------------------------------------------------------ write

const write = (file, svg) => {
  writeFileSync(new URL(`assets/${file}.svg`, repo), svg);
  console.log(`assets/${file}.svg  ${(svg.length / 1024).toFixed(1)} kB`);
};

write('profile-wide', page(wide()));
write('profile-narrow', page(narrow()));
for (const link of links) write(link.file, button(link));
