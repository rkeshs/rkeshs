#!/usr/bin/env node
// Builds assets/sign.svg, the flip-dot sign at the top of the profile README.
//
// A flip-dot sign is a grid of small discs, yellow on one side and black on
// the other, that turn over to draw a picture. This one is 53 discs wide and
// shows three screens in turn:
//
//   1. A name. A 5 by 7 letter is the usual size on these signs, and nine
//      letters with a gap between them come to exactly 53 columns.
//   2. Three years of GitHub contributions. A year on GitHub is also 53 weeks
//      of 7 days, so each line of text gives way to one year, a disc a day.
//   3. The latest release.
//
//   GITHUB_TOKEN=$(gh auth token) node scripts/build.mjs
//
// A workflow runs this once a day and commits the result.

import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const LOGIN = "rkeshs";

/** The first screen. Each line holds nine letters at most. */
const TITLE = ["RISHIKESH", "SOFTWARE", "ENGINEER"];

/** The third screen names whichever of these was released most recently. */
const PROJECTS = [
  { repo: "yeetfactory/deja", name: "DEJA" },
  { repo: "yeetfactory/recur", name: "RECUR" },
];

// ------------------------------------------------------------------ board

const COLS = 53;
const LINES = 3;
const LINE_ROWS = 7;
/** One spare row between lines, so letters do not touch. */
const ROWS = LINES * LINE_ROWS + (LINES - 1);
const lineTop = (line) => line * (LINE_ROWS + 1);

/**
 * The classic 5 by 7 dot-matrix alphabet. Each glyph is five columns, and
 * each column is seven bits with the top row in the lowest bit.
 */
const FONT = {
  " ": [0x00, 0x00, 0x00, 0x00, 0x00],
  ".": [0x00, 0x60, 0x60, 0x00, 0x00],
  "-": [0x08, 0x08, 0x08, 0x08, 0x08],
  0: [0x3e, 0x51, 0x49, 0x45, 0x3e],
  1: [0x00, 0x42, 0x7f, 0x40, 0x00],
  2: [0x42, 0x61, 0x51, 0x49, 0x46],
  3: [0x21, 0x41, 0x45, 0x4b, 0x31],
  4: [0x18, 0x14, 0x12, 0x7f, 0x10],
  5: [0x27, 0x45, 0x45, 0x45, 0x39],
  6: [0x3c, 0x4a, 0x49, 0x49, 0x30],
  7: [0x01, 0x71, 0x09, 0x05, 0x03],
  8: [0x36, 0x49, 0x49, 0x49, 0x36],
  9: [0x06, 0x49, 0x49, 0x29, 0x1e],
  A: [0x7e, 0x11, 0x11, 0x11, 0x7e],
  B: [0x7f, 0x49, 0x49, 0x49, 0x36],
  C: [0x3e, 0x41, 0x41, 0x41, 0x22],
  D: [0x7f, 0x41, 0x41, 0x22, 0x1c],
  E: [0x7f, 0x49, 0x49, 0x49, 0x41],
  F: [0x7f, 0x09, 0x09, 0x09, 0x01],
  G: [0x3e, 0x41, 0x49, 0x49, 0x7a],
  H: [0x7f, 0x08, 0x08, 0x08, 0x7f],
  I: [0x00, 0x41, 0x7f, 0x41, 0x00],
  J: [0x20, 0x40, 0x41, 0x3f, 0x01],
  K: [0x7f, 0x08, 0x14, 0x22, 0x41],
  L: [0x7f, 0x40, 0x40, 0x40, 0x40],
  M: [0x7f, 0x02, 0x0c, 0x02, 0x7f],
  N: [0x7f, 0x04, 0x08, 0x10, 0x7f],
  O: [0x3e, 0x41, 0x41, 0x41, 0x3e],
  P: [0x7f, 0x09, 0x09, 0x09, 0x06],
  Q: [0x3e, 0x41, 0x51, 0x21, 0x5e],
  R: [0x7f, 0x09, 0x19, 0x29, 0x46],
  S: [0x46, 0x49, 0x49, 0x49, 0x31],
  T: [0x01, 0x01, 0x7f, 0x01, 0x01],
  U: [0x3f, 0x40, 0x40, 0x40, 0x3f],
  V: [0x1f, 0x20, 0x40, 0x20, 0x1f],
  W: [0x3f, 0x40, 0x38, 0x40, 0x3f],
  X: [0x63, 0x14, 0x08, 0x14, 0x63],
  Y: [0x07, 0x08, 0x70, 0x08, 0x07],
  Z: [0x61, 0x51, 0x49, 0x45, 0x43],
};

/** A blank screen: one byte per disc, row by row. */
const blank = () => new Uint8Array(COLS * ROWS);

/** Writes `words` centred on one line, cutting anything that will not fit. */
function write(screen, line, words) {
  const letters = [...words.toUpperCase()].filter((ch) => FONT[ch]).slice(0, 9);
  const width = letters.length * 6 - 1;
  let col = Math.floor((COLS - width) / 2);
  for (const letter of letters) {
    FONT[letter].forEach((bits, i) => {
      for (let row = 0; row < LINE_ROWS; row += 1) {
        if (bits & (1 << row)) screen[(lineTop(line) + row) * COLS + col + i] = 1;
      }
    });
    col += 6;
  }
}

// ------------------------------------------------------------------- data

const DAY_MS = 86_400_000;

async function request(url, init = {}) {
  const token = process.env.GITHUB_TOKEN ?? process.env.GH_TOKEN;
  if (!token) throw new Error("Set GITHUB_TOKEN to fetch from GitHub.");
  const res = await fetch(url, {
    ...init,
    headers: { authorization: `Bearer ${token}`, "user-agent": "profile-sign", ...init.headers },
  });
  if (!res.ok) throw new Error(`${url} answered ${res.status}: ${await res.text()}`);
  return res.json();
}

async function fetchData(now) {
  // GitHub hands out contributions a year at a time. Three lines of 53 weeks
  // is a little over three years, so ask for four.
  const years = [0, 1, 2, 3]
    .map((back) => {
      const to = new Date(now - back * 365 * DAY_MS).toISOString();
      const from = new Date(now - (back + 1) * 365 * DAY_MS).toISOString();
      return `y${back}: contributionsCollection(from: "${from}", to: "${to}") {
        contributionCalendar { weeks { contributionDays { date contributionCount } } }
      }`;
    })
    .join("\n");
  const projects = PROJECTS.map(({ repo }, i) => {
    const [owner, name] = repo.split("/");
    return `p${i}: repository(owner: "${owner}", name: "${name}") { latestRelease { tagName publishedAt } }`;
  }).join("\n");

  const graph = await request("https://api.github.com/graphql", {
    method: "POST",
    body: JSON.stringify({ query: `{ user(login: "${LOGIN}") { ${years} } ${projects} }` }),
  });
  if (graph.errors) throw new Error(JSON.stringify(graph.errors));

  const active = new Set();
  for (const year of Object.values(graph.data.user)) {
    for (const week of year.contributionCalendar.weeks) {
      for (const day of week.contributionDays) {
        if (day.contributionCount > 0) active.add(day.date);
      }
    }
  }
  const releases = PROJECTS.map((project, i) => ({ ...project, ...graph.data[`p${i}`]?.latestRelease }))
    .filter((release) => release.tagName)
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
  return { active, release: releases[0] };
}

// ---------------------------------------------------------------- screens

function titleScreen() {
  const screen = blank();
  TITLE.forEach((words, line) => write(screen, line, words));
  return screen;
}

/**
 * One disc a day, lit if there was a contribution. Weeks run left to right
 * and days top to bottom, Sunday first, as on GitHub. The bottom line is the
 * last 53 weeks and ends at today. Each line above is the year before.
 */
function yearsScreen(active, now) {
  const screen = blank();
  const today = new Date(now);
  const thisSunday = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() - today.getUTCDay());
  for (let weeksAgo = 0; weeksAgo < COLS * LINES; weeksAgo += 1) {
    const line = LINES - 1 - Math.floor(weeksAgo / COLS);
    const col = COLS - 1 - (weeksAgo % COLS);
    for (let weekday = 0; weekday < 7; weekday += 1) {
      const date = new Date(thisSunday - weeksAgo * 7 * DAY_MS + weekday * DAY_MS).toISOString().slice(0, 10);
      if (active.has(date)) screen[(lineTop(line) + weekday) * COLS + col] = 1;
    }
  }
  return screen;
}

function releaseScreen(release) {
  const screen = blank();
  if (release) {
    write(screen, 0, "SHIPPING");
    write(screen, 1, release.name);
    write(screen, 2, release.tagName);
  } else {
    write(screen, 1, "BUILDING");
  }
  return screen;
}

// ----------------------------------------------------------------- render

const PAD = 22;
const WIDTH = 824;
const PITCH = (WIDTH - PAD * 2) / COLS;
const HEIGHT = PITCH * ROWS + PAD * 2;
const RADIUS = PITCH * 0.43;

// The loop, in seconds. Each screen is held, then the board turns over to the
// next. A turn sweeps across the board rather than happening all at once, so
// the last change is early enough for the sweep to finish before the loop
// restarts.
const LOOP = 19;
const CHANGES = [5.2, 12.2, 17.2];
const FLIP = 0.26;
const SWEEP = { col: 0.016, row: 0.014, jitter: 0.09 };

const n = (v) => Number(v.toFixed(2));
const pct = (seconds) => `${n((seconds / LOOP) * 100)}%`;

/** A small repeatable hash, so the same disc always gets the same quirks. */
function noise(col, row) {
  let h = (col * 374761393 + row * 668265263) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0;
  return ((h ^ (h >>> 16)) >>> 0) / 2 ** 32;
}

function render(screens, label) {
  const turn = (shown) => `transform:rotate(-45deg) scaleX(${shown})`;

  // A disc's life is which screens it is lit on. Discs with the same life
  // share one animation and differ only in when they start.
  const lives = new Set();
  let discs = "";
  for (let row = 0; row < ROWS; row += 1) {
    for (let col = 0; col < COLS; col += 1) {
      const life = screens.map((screen) => screen[row * COLS + col]).join("");
      if (!life.includes("1")) continue;
      lives.add(life);
      const cx = n(PAD + (col + 0.5) * PITCH);
      const cy = n(PAD + (row + 0.5) * PITCH);
      const shade = Math.floor(noise(col, row) * 3);
      if (!life.includes("0")) {
        discs += `<circle class="s${shade}" cx="${cx}" cy="${cy}" r="${n(RADIUS)}"/>`;
        continue;
      }
      const delay = col * SWEEP.col + row * SWEEP.row + noise(row, col) * SWEEP.jitter;
      // A negative delay starts the disc part-way through its loop, so the
      // board opens on the first screen with the sweep already accounted for.
      discs += `<circle class="d l${life} s${shade}" style="animation-delay:${n(delay - LOOP)}s" cx="${cx}" cy="${cy}" r="${n(RADIUS)}"/>`;
    }
  }

  let css =
    `.s0{fill:#f2e63a}.s1{fill:#ebdf2f}.s2{fill:#f7ec4a}` +
    `.d{transform-box:fill-box;transform-origin:center;animation-duration:${LOOP}s;animation-iteration-count:infinite;animation-timing-function:cubic-bezier(.45,0,.25,1)}`;
  for (const life of lives) {
    if (!life.includes("0")) continue;
    const [a, b, c] = life;
    css +=
      `.l${life}{${turn(a)};animation-name:l${life}}` +
      `@keyframes l${life}{0%,${pct(CHANGES[0])}{${turn(a)}}` +
      `${pct(CHANGES[0] + FLIP)},${pct(CHANGES[1])}{${turn(b)}}` +
      `${pct(CHANGES[1] + FLIP)},${pct(CHANGES[2])}{${turn(c)}}` +
      `${pct(CHANGES[2] + FLIP)},100%{${turn(a)}}}`;
  }
  // With the animation off, every disc rests on the first screen.
  css += `@media (prefers-reduced-motion:reduce){.d{animation:none}}`;

  const half = n(PITCH / 2);
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${n(HEIGHT)}" viewBox="0 0 ${WIDTH} ${n(HEIGHT)}" role="img">` +
    `<title>${label}</title><style>${css}</style>` +
    `<defs><pattern id="rest" x="${PAD}" y="${PAD}" width="${n(PITCH)}" height="${n(PITCH)}" patternUnits="userSpaceOnUse">` +
    `<circle cx="${half}" cy="${half}" r="${n(RADIUS)}" fill="#1f1f1d"/></pattern></defs>` +
    `<rect width="${WIDTH}" height="${n(HEIGHT)}" rx="14" fill="#0b0b0a"/>` +
    `<rect x="${PAD}" y="${PAD}" width="${n(PITCH * COLS)}" height="${n(PITCH * ROWS)}" fill="url(#rest)"/>` +
    `${discs}</svg>\n`
  );
}

// ------------------------------------------------------------------- main

const now = Date.now();
const { active, release } = await fetchData(now);
const screens = [titleScreen(), yearsScreen(active, now), releaseScreen(release)];
const shipping = release ? ` Then: shipping ${release.name} ${release.tagName}.` : "";
const label = `A flip-dot sign. It reads ${TITLE.join(", ")}, then turns over to show three years of GitHub contributions, one disc a day.${shipping}`;

await mkdir(join(ROOT, "assets"), { recursive: true });
await writeFile(join(ROOT, "assets", "sign.svg"), render(screens, label));
console.log(`Built the sign: ${active.size} active days on record, latest release ${release ? `${release.name} ${release.tagName}` : "none"}.`);
