#!/usr/bin/env node
// Builds the images in README.md:
//   assets/profile-wide.svg    desktop
//   assets/profile-narrow.svg  phones
//   assets/link-*.svg          the link buttons under it
//   assets/walk-*.svg          the four endings of the walk
//
// Edit the content below, then run: node scripts/build.mjs
// No dependencies. Fonts, icons and the grain texture are embedded in each
// SVG, because an SVG shown through <img> cannot load anything from outside.
//
// Icons: Simple Icons (CC0) for brands, Phosphor (MIT) for the generic ones.
// Fonts: Syne and Instrument Sans (SIL Open Font License, see assets/fonts).

import { readFileSync, writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

const repo = new URL('..', import.meta.url);
const icons = JSON.parse(readFileSync(new URL('scripts/icons.json', repo), 'utf8'));
const font = (file) => readFileSync(new URL(`assets/fonts/${file}.woff2`, repo)).toString('base64');

// ---------------------------------------------------------------- content

const name = 'Rishikesh S';
const handle = 'rkeshs';
const tagline = ['Full-stack engineer.', 'TypeScript, fast backends, practical AI workflows.'];

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
      const family = f.startsWith('syne') ? 'Syne' : 'Instrument Sans';
      return `@font-face{font-family:"${family}";font-weight:${f.slice(-3)};src:url(data:font/woff2;base64,${font(f)}) format("woff2")}`;
    })
    .join('\n');

// Shared colours. The landscape is morning in light mode and night in dark mode.
const theme = `
svg{
--sky1:#9FB2CC;--sky2:#E6C3A5;--sky3:#F7E4C6;--sun:#FFF6DC;--glow:#FFD79A;--cloud:#FFF3E2;
--h1:#A7B3C6;--h2:#8E9FB3;--h3:#7A9296;--h4:#74875F;--h5:#8E8C52;--h6:#55643B;--tree:#35432E;--haze:#F4E3C9;
--stars:0;--birds:.55;--grain:.95;
--win:#FBFAF6;--bar:#F3F1EC;--line:#E2DED5;--dot:#D2CEC4;--ink:#1F2421;--soft:#666C66;--shadow:#3A2A14}
@media (prefers-color-scheme:dark){svg{
--sky1:#070B1E;--sky2:#172048;--sky3:#3B3D75;--sun:#F3ECD6;--glow:#8E93D6;--cloud:#5A62A0;
--h1:#343F78;--h2:#283264;--h3:#1E2750;--h4:#171E40;--h5:#111730;--h6:#0B1024;--tree:#060916;--haze:#2F356E;
--stars:1;--birds:0;--grain:.7;
--win:#15181F;--bar:#1B1F28;--line:#2A2F3B;--dot:#3A404E;--ink:#ECEEF2;--soft:#9BA2AF;--shadow:#000000}}
text{font-family:"Instrument Sans","Helvetica Neue",Arial,sans-serif;font-weight:500;fill:var(--ink)}
.soft{fill:var(--soft)}
.glyph{fill:#FFF8EC}`;

// -------------------------------------------------------------- landscape

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

function landscape({ width, height, win }, rand) {
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

  // grain over everything
  defs.push(
    `<pattern id="grain" width="208" height="208" patternUnits="userSpaceOnUse"><image width="208" height="208" href="data:image/png;base64,${grain}"/></pattern>`,
  );
  out.push(`<rect width="${width}" height="${height}" fill="url(#grain)" style="opacity:var(--grain)"/>`);

  return { defs: defs.join(''), body: out.join('\n') };
}

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

  const description = `${name}. ${tagline.join(' ')} ` + groups.map((g) => `${g.name}: ${g.skills.map(([label]) => label).join(', ')}.`).join(' ');

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" role="img" aria-labelledby="title desc">
<title id="title">${esc(name)}: skills, in a window over a landscape</title>
<desc id="desc">${esc(description)}</desc>
<style>
${fonts('syne-800', 'instrument-sans-500')}${theme}
.name{font-family:"Syne","Arial Black","Helvetica Neue",Arial,sans-serif;font-weight:800;letter-spacing:-.01em}
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
  win.h = gridY - win.y + (rows - 1) * pitch + 56 + 30 + 30;
  win.bottom = 104;
  return {
    seed: 11, width: 1200, height: win.y + win.h + win.bottom, radius: 22, win,
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
  win.bottom = 84;
  return {
    seed: 5, width: 600, height: win.y + win.h + win.bottom, radius: 20, win,
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

// --------------------------------------------------------------- the walk
// Four small scenes, one per ending of the walk in README.md.
// They carry no text, so they need no fonts.

const W = 1200;
const H = 520;

// A ridge line as a filled path down to the bottom edge, plus its height function.
function hill(rand, { base, amp, teeth = 0, step = 6, len = 300 }) {
  const waves = [0, 1, 2].map((k) => ({ len: (len * (0.7 + rand() * 0.6)) / (k * 1.7 + 1), phase: rand() * 7, gain: [0.62, 0.28, 0.1][k] }));
  const y = (x) => base + amp * waves.reduce((sum, w) => sum + w.gain * Math.sin(x / w.len + w.phase), 0);
  let d = `M0 ${H}L0 ${n(y(0))}`;
  for (let x = step; x <= W + step; x += step) {
    d += teeth ? `L${n(x - step / 2)} ${n(y(x) - teeth * (0.35 + rand() * 0.65))}L${n(x)} ${n(y(x))}` : `L${n(x)} ${n(y(x))}`;
  }
  return { d: `${d}L${W} ${H}Z`, y };
}

const grad = (id, stops, y1 = 0, y2 = H) =>
  `<linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="0" y1="${y1}" x2="0" y2="${y2}">${stops.map(([o, c, a = 1]) => `<stop offset="${o}" stop-color="${c}" stop-opacity="${a}"/>`).join('')}</linearGradient>`;
const halo = (id, color, alpha = 0.9) =>
  `<radialGradient id="${id}"><stop offset="0" stop-color="${color}" stop-opacity="${alpha}"/><stop offset="1" stop-color="${color}" stop-opacity="0"/></radialGradient>`;
const starField = (rand, count, maxY) => {
  const sets = ['', ''];
  for (let i = 0; i < count; i++) sets[i % 2] += `<circle cx="${n(rand() * W)}" cy="${n(rand() * maxY)}" r="${n(0.7 + rand() * 1.2)}"/>`;
  return `<g fill="#F3ECD6"><g class="tw1">${sets[0]}</g><g class="tw2">${sets[1]}</g></g>`;
};

function scene(label, css, defs, body) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="${esc(label)}">
<style>
${css}
.tw1{animation:twinkle 5s ease-in-out infinite alternate}
.tw2{animation:twinkle 7s ease-in-out infinite alternate-reverse}
@keyframes twinkle{from{opacity:.3}to{opacity:1}}
@media (prefers-reduced-motion:reduce){*{animation:none!important}}
</style>
<defs><clipPath id="frame"><rect width="${W}" height="${H}" rx="22"/></clipPath><pattern id="grain" width="208" height="208" patternUnits="userSpaceOnUse"><image width="208" height="208" href="data:image/png;base64,${grain}"/></pattern>${defs}</defs>
<g clip-path="url(#frame)">
${body}
<rect width="${W}" height="${H}" fill="url(#grain)" opacity=".9"/>
</g>
</svg>
`;
}

// Late afternoon. A lake, the hills mirrored in it, and a stone skipping away.
function lakeScene() {
  const rand = random(21);
  const shore = 268;
  const defs =
    grad('sky', [[0, '#7FA6C4'], [0.42, '#F2C894'], [0.56, '#FCE7BF']]) +
    halo('glow', '#FFE2A8', 0.95) +
    halo('puff', '#FFF6E6', 0.8) +
    grad('water', [[0, '#F6DDB2'], [0.3, '#CDBB9E'], [1, '#55809C']], shore, H) +
    `<clipPath id="lake"><rect y="${shore}" width="${W}" height="${H - shore}"/></clipPath>`;
  const sun = { x: 820, y: 150 };
  const far = [
    [hill(rand, { base: 205, amp: 38, step: 12 }), '#9AA9BE'],
    [hill(rand, { base: 234, amp: 24, teeth: 4 }), '#7B8F8F'],
    [hill(rand, { base: 254, amp: 14, teeth: 7 }), '#5F7350'],
  ];
  const land = far.map(([h, c]) => `<path d="${h.d}" fill="${c}"/>`).join('');
  let body = `<rect width="${W}" height="${H}" fill="url(#sky)"/>`;
  body += `<circle cx="${sun.x}" cy="${sun.y}" r="270" fill="url(#glow)"/><circle cx="${sun.x}" cy="${sun.y}" r="34" fill="#FFF5D6"/>`;
  for (let i = 0; i < 9; i++) body += `<ellipse cx="${n(120 + rand() * 520)}" cy="${n(50 + rand() * 70)}" rx="${n(80 + rand() * 90)}" ry="${n(12 + rand() * 12)}" fill="url(#puff)"/>`;
  body += land;
  body += `<rect y="${shore}" width="${W}" height="${H - shore}" fill="url(#water)"/>`;
  body += `<g clip-path="url(#lake)"><g transform="translate(0 ${shore * 2}) scale(1 -1)" opacity=".4">${land}</g></g>`;
  // the sun's path on the water
  let streak = ['', ''];
  for (let i = 0; i < 16; i++) {
    streak[i % 2] += `<ellipse cx="${n(sun.x + (rand() - 0.5) * 26)}" cy="${shore + 12 + i * 13}" rx="${n(70 - i * 3 + rand() * 16)}" ry="2.4" fill="#FFF3CF" opacity="${n(0.8 - i * 0.035)}"/>`;
  }
  body += `<g class="sh1">${streak[0]}</g><g class="sh2">${streak[1]}</g>`;
  for (let i = 0; i < 46; i++) {
    const y = shore + 20 + rand() * (H - shore - 70);
    body += `<rect x="${n(rand() * W)}" y="${n(y)}" width="${n(30 + rand() * 110)}" height="1.6" fill="#FFFFFF" opacity="${n(0.1 + rand() * 0.16)}"/>`;
  }
  // five bounces, shrinking toward the far shore
  for (let i = 0; i < 5; i++) {
    const t = i / 4;
    body += `<ellipse class="ring" style="animation-delay:${n(i * 0.5)}s" cx="${n(400 + t * 190)}" cy="${n(452 - Math.sqrt(t) * 132)}" rx="${n(36 - t * 26)}" ry="${n(9.5 - t * 6.5)}" fill="none" stroke="#FFF8E6" stroke-width="${n(2.4 - t * 1.2)}"/>`;
  }
  // near bank, reeds and pines
  const bank = hill(rand, { base: 494, amp: 9, teeth: 5, step: 4, len: 220 });
  let reeds = '';
  for (let i = 0; i < 90; i++) {
    const x = rand() * W;
    reeds += `M${n(x)} ${n(bank.y(x) + 2)}l${n((rand() - 0.5) * 8)} ${n(-12 - rand() * 22)}`;
  }
  body += `<path d="${reeds}" stroke="#3D4A2C" stroke-width="1.6" fill="none"/>`;
  let trees = '';
  for (const [x, h] of [[24, 250], [84, 140], [150, 205], [212, 100], [1046, 120], [1104, 245], [1158, 160], [1192, 105]]) {
    trees += pineShape(rand, x, bank.y(x) + 4, h * (0.92 + rand() * 0.16));
  }
  body += `<path d="${trees}" fill="#2B3622"/><path d="${bank.d}" fill="#3D4A2C"/>`;
  const css =
    `.ring{transform-box:fill-box;transform-origin:center;opacity:.6;animation:ring 7s ease-out infinite}` +
    `@keyframes ring{0%{opacity:0;transform:scale(.25)}6%{opacity:.95}34%,100%{opacity:0;transform:scale(1.3)}}` +
    `.sh1{animation:shimmer 3.2s ease-in-out infinite alternate}.sh2{animation:shimmer 4.1s ease-in-out infinite alternate-reverse}` +
    `@keyframes shimmer{from{opacity:.45}to{opacity:1}}`;
  return scene('A lake in the late afternoon, hills mirrored in the water, and the rings of a skipped stone.', css, defs, body);
}

// Dusk. A clearing in the pines, and a fox caught mid-step.
function foxScene() {
  const rand = random(8);
  const defs =
    grad('sky', [[0, '#5B5C93'], [0.42, '#D38A8E'], [0.66, '#F6CBA3']]) +
    halo('glow', '#FFC592', 0.9) +
    grad('meadow', [[0, '#7C8451'], [1, '#3F4E2B']], 360, H);
  let body = `<rect width="${W}" height="${H}" fill="url(#sky)"/><ellipse cx="600" cy="318" rx="520" ry="230" fill="url(#glow)"/>`;
  body += `<path d="${hill(rand, { base: 246, amp: 40, step: 12 }).d}" fill="#8C7FA6"/>`;
  body += `<path d="${hill(rand, { base: 286, amp: 26, teeth: 4 }).d}" fill="#6F6A8C"/>`;
  // a wall of pines with a gap where the clearing opens
  for (const [color, count, lift] of [['#4A5649', 46, 0], ['#2F3B30', 40, 14]]) {
    let trees = '';
    for (let i = 0; i < count; i++) {
      const x = rand() * W;
      const away = Math.abs(x - 610) / 600;
      const h = away < 0.3 ? 28 + rand() * 34 : 70 + Math.pow(away, 1.4) * 330 * (0.75 + rand() * 0.25);
      trees += pineShape(rand, x, 352 + lift + rand() * 8, h);
    }
    body += `<path d="${trees}" fill="${color}"/>`;
  }
  const ground = hill(rand, { base: 372, amp: 7, teeth: 3, step: 4, len: 260 });
  body += `<path d="${ground.d}" fill="url(#meadow)"/>`;
  let tufts = '';
  for (let i = 0; i < 150; i++) {
    const x = rand() * W;
    const y = 384 + rand() * 130;
    tufts += `M${n(x)} ${n(y)}l-3 -9M${n(x)} ${n(y)}l1 -11M${n(x)} ${n(y)}l4 -8`;
  }
  body += `<path d="${tufts}" stroke="#98A066" stroke-width="1.3" fill="none" opacity=".55"/>`;
  for (let i = 0; i < 26; i++) body += `<circle cx="${n(rand() * W)}" cy="${n(392 + rand() * 120)}" r="${n(1.6 + rand())}" fill="#F7E7C2" opacity=".8"/>`;
  // the fox, facing left
  body += `<g transform="translate(486 318) scale(1.3)">
<ellipse cx="108" cy="114" rx="78" ry="5" fill="#2A331F" opacity=".35"/>
<g class="tail"><path d="M142 62C168 44 200 48 212 70C198 80 172 84 146 80Z" fill="#C4623A"/><path d="M192 55C203 57 210 63 212 70C205 75 196 76 188 74C194 68 195 61 192 55Z" fill="#F6E7CF"/></g>
<path d="M128 84L121 112M141 82L147 112" stroke="#3A2418" stroke-width="6.5" stroke-linecap="round"/>
<path d="M60 60C70 40 130 38 150 58C158 70 150 88 130 90L80 90C66 90 56 76 60 60Z" fill="#CE6B3F"/>
<path d="M79 86L70 112M92 88L94 112" stroke="#3A2418" stroke-width="6.5" stroke-linecap="round"/>
<path d="M56 74L72 66L80 90L66 90Z" fill="#F6E7CF"/>
<path d="M74 46L63 20L53 38L42 24L41 46L16 64L23 70L58 76Z" fill="#CE6B3F"/>
<path d="M63 20L58 30L66 32ZM42 24L42 34L48 33Z" fill="#3A2418"/>
<path d="M16 64L23 70L40 68L30 60Z" fill="#F6E7CF"/>
<circle cx="18.500" cy="65" r="3" fill="#3A2418"/><circle cx="42" cy="51" r="2.6" fill="#2A1A12"/>
</g>`;
  const css = `.tail{transform-box:fill-box;transform-origin:0 60%;animation:sway 3.6s ease-in-out infinite alternate}@keyframes sway{from{transform:rotate(-5deg)}to{transform:rotate(6deg)}}`;
  return scene('A clearing in a pine forest at dusk, with a fox standing mid-step in the grass.', css, defs, body);
}

// Sunset. Above the clouds, a cairn on the top, and someone standing next to it.
function summitScene() {
  const rand = random(33);
  const defs =
    grad('sky', [[0, '#2B3A70'], [0.36, '#B5627F'], [0.54, '#F59E62'], [0.66, '#FFD98E']]) +
    halo('glow', '#FFCB78', 0.95) +
    grad('rock', [[0, '#46324F'], [1, '#1E1527']], 260, H);
  let body = `<rect width="${W}" height="${H}" fill="url(#sky)"/>`;
  body += starField(rand, 40, 120);
  body += `<circle cx="650" cy="322" r="340" fill="url(#glow)"/><circle cx="650" cy="322" r="62" fill="#FFF2C6"/>`;
  body += `<path d="M120 372L232 296L300 330L366 304L470 372Z" fill="#6E4F78"/><path d="M830 372L936 304L990 326L1058 290L1180 372Z" fill="#7C5879"/>`;
  // a sea of clouds, lit near the sun and cooler toward us
  const tones = ['#FFDCA8', '#FBC39A', '#EDA591', '#C98A98', '#9C7AA0', '#77669A'];
  tones.forEach((tone, row) => {
    const y = 344 + row * 31;
    let puffs = `<rect x="-120" y="${y + 8}" width="${W + 240}" height="${H - y}"/>`;
    for (let x = -80; x < W + 160; x += 54 + row * 16 + rand() * 40) {
      puffs += `<ellipse cx="${n(x)}" cy="${n(y + rand() * 10)}" rx="${n((58 + rand() * 50) * (1 + row * 0.28))}" ry="${n((15 + rand() * 12) * (1 + row * 0.24))}"/>`;
    }
    body += `<g fill="${tone}" class="${row % 2 ? 'cl2' : 'cl1'}">${puffs}</g>`;
  });
  body += `<path d="M0 520L0 428L92 396L168 342L232 302L262 264L294 288L352 330L432 374L524 430L646 482L770 520Z" fill="url(#rock)"/>`;
  body += `<path d="M262 264L294 288L352 330L432 374L524 430L646 482L690 500L560 462L440 400L340 346L286 304Z" fill="#B0627A" opacity=".5"/>`;
  body += `<g fill="#1E1527"><ellipse cx="258" cy="260" rx="14" ry="6"/><ellipse cx="258" cy="250" rx="10.5" ry="5"/><ellipse cx="259" cy="242" rx="7.500" ry="4"/><ellipse cx="258" cy="235.500" rx="4.500" ry="3"/>`;
  body += `<circle cx="318" cy="279" r="4.6"/><path d="M314.500 284.500h7l2.500 17h-3.200l-1 13h-2.600l-.5-13h-1.400l-.5 13h-2.600l-.700-13z"/><path d="M326 289l3 26" stroke="#1E1527" stroke-width="1.600"/></g>`;
  const css =
    `.cl1{animation:roll 60s ease-in-out infinite alternate}.cl2{animation:roll 80s ease-in-out infinite alternate-reverse}` +
    `@keyframes roll{from{transform:translateX(-40px)}to{transform:translateX(50px)}}`;
  return scene('A mountain top at sunset above a sea of clouds, with a cairn and a small figure beside it.', css, defs, body);
}

// Night. Out of the wind behind the rocks, a small fire, and the stars.
function campfireScene() {
  const rand = random(50);
  const fire = { x: 560, y: 414 };
  const defs =
    grad('sky', [[0, '#050816'], [0.5, '#131B45'], [0.8, '#2B2F68']]) +
    halo('moonlight', '#8E93D6', 0.55) +
    halo('firelight', '#FF8A3A', 0.6) +
    grad('ground', [[0, '#1C1E36'], [1, '#090B18']], 396, H);
  let body = `<rect width="${W}" height="${H}" fill="url(#sky)"/>`;
  body += starField(rand, 150, 320);
  body += `<circle cx="190" cy="92" r="150" fill="url(#moonlight)"/><circle cx="190" cy="92" r="25" fill="#F3ECD6"/>`;
  body += `<path d="${hill(rand, { base: 300, amp: 36, step: 12 }).d}" fill="#1B2350"/>`;
  body += `<path d="${hill(rand, { base: 338, amp: 22, teeth: 5 }).d}" fill="#131A3C"/>`;
  const ground = hill(rand, { base: 402, amp: 6, step: 8, len: 280 });
  let trees = '';
  for (let i = 0; i < 16; i++) {
    const x = i < 9 ? rand() * 270 : 960 + rand() * 240;
    trees += pineShape(rand, x, ground.y(x) + 6, 110 + rand() * 210);
  }
  body += `<path d="${trees}" fill="#080B19"/><path d="${ground.d}" fill="url(#ground)"/>`;
  body += `<circle cx="${fire.x}" cy="${fire.y - 10}" r="310" fill="url(#firelight)"/>`;
  body += `<path d="M664 424C668 350 744 318 820 336C890 354 922 398 914 428Z" fill="#1B1930"/><path d="M664 424C668 350 744 318 792 328C736 346 700 384 694 426Z" fill="#C8683A" opacity=".55"/>`;
  body += `<path d="M612 426C616 390 652 376 684 390C704 400 708 414 706 428Z" fill="#231F38"/><path d="M612 426C616 390 652 376 668 380C644 392 632 408 630 427Z" fill="#E07A40" opacity=".6"/>`;
  body += `<g fill="#2A1810"><rect x="${fire.x - 44}" y="${fire.y - 4}" width="88" height="11" rx="5.500" transform="rotate(14 ${fire.x} ${fire.y})"/><rect x="${fire.x - 44}" y="${fire.y - 4}" width="88" height="11" rx="5.500" transform="rotate(-13 ${fire.x} ${fire.y})"/></g>`;
  const flame = 'M0 0C-24 -10 -20 -42 0 -74C20 -42 24 -10 0 0Z';
  [['#FF6A2B', 1.2, 'f1'], ['#FFA63D', 0.86, 'f2'], ['#FFE48F', 0.5, 'f3']].forEach(([color, size, cls]) => {
    body += `<g transform="translate(${fire.x} ${fire.y + 2}) scale(${size})"><path class="${cls}" d="${flame}" fill="${color}"/></g>`;
  });
  for (let i = 0; i < 9; i++) {
    body += `<circle class="spark" style="animation-duration:${n(2.4 + rand() * 2.4)}s;animation-delay:${n(-rand() * 4)}s" cx="${n(fire.x + (rand() - 0.5) * 44)}" cy="${fire.y - 60}" r="${n(1.2 + rand())}" fill="#FFC56E"/>`;
  }
  const css =
    `.f1,.f2,.f3{transform-box:fill-box;transform-origin:50% 100%}` +
    `.f1{animation:flick 1.3s ease-in-out infinite alternate}.f2{animation:flick 0.9s ease-in-out infinite alternate-reverse}.f3{animation:flick 0.7s ease-in-out infinite alternate}` +
    `@keyframes flick{from{transform:scale(1,.9) skewX(-5deg)}to{transform:scale(.94,1.12) skewX(5deg)}}` +
        `.spark{opacity:0;animation:rise 3s ease-out infinite}@keyframes rise{0%{opacity:0;transform:translate(0,0)}15%{opacity:1}100%{opacity:0;transform:translate(14px,-130px)}}`;
  return scene('A small campfire at night beside two boulders, under a moon and a sky full of stars.', css, defs, body);
}

// ------------------------------------------------------------------ write

const write = (file, svg) => {
  writeFileSync(new URL(`assets/${file}.svg`, repo), svg);
  console.log(`assets/${file}.svg  ${(svg.length / 1024).toFixed(1)} kB`);
};

write('profile-wide', page(wide()));
write('profile-narrow', page(narrow()));
for (const link of links) write(link.file, button(link));
write('walk-lake', lakeScene());
write('walk-fox', foxScene());
write('walk-summit', summitScene());
write('walk-campfire', campfireScene());
