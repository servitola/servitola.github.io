// The campfire: a 160×100 indexed-colour sprite redrawn ten times a second, with animals that peek, a fire
// that breathes, and the start screen's scramble.
const fonts = fontsReady(['italic 1em "Instrument Serif"', '1em "JetBrains Mono"', '1em "Press Start 2P"']);
const units = [...document.querySelectorAll(".start b, .start span")];
hush(units);
if (!still) fonts.then(() => { for (const u of units) { typeset(u); decode([u]); } });

const W = 160, H = 100;
const canvas = document.getElementById("scene");
const ctx = canvas.getContext("2d");
const image = ctx.createImageData(W, H);
const rgba = image.data;

const hex = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const NAMES = {
  SKY: "#121116", INK: "#0f0e0c", FAR: "#242020", MID: "#161310", NEAR: "#0a0908", BUSH: "#130f0c",
  GROUND: "#1b1613", GROUND2: "#231b15", DIM3: "#4d443a", DIM: "#8a8273", PAPER: "#efe6d4",
  HOT: "#ff5a1f", HOTD: "#8f2e0e", EMBER: "#ffb347", FOX: "#c24a1a", OWL: "#2a231d",
  RABBIT: "#6b6253", MOONS: "#c9bfa8",
  LG1: "#2c1d13", LG2: "#48291a", LG3: "#73391a",
  LN1: "#1f160f", LN2: "#33201a", LN3: "#50301c",
  LS1: "#6a4e36", LS2: "#8a5c38", LS3: "#a8703e",
};
const PAL = [], C = {};
for (const [name, h] of Object.entries(NAMES)) { C[name] = PAL.length; PAL.push(hex(h)); }
const T = 255;
const LADDER = {
  [C.GROUND]: [C.GROUND, C.LG1, C.LG2, C.LG3],
  [C.GROUND2]: [C.GROUND2, C.LG1, C.LG2, C.LG3],
  [C.NEAR]: [C.NEAR, C.LN1, C.LN2, C.LN3],
  [C.BUSH]: [C.BUSH, C.LN2, C.LN3, C.LS1],
  [C.DIM3]: [C.DIM3, C.LS1, C.LS2, C.LS3],
  [C.MID]: [C.MID, C.MID, C.LN1, C.LN2],
};
const BAYER = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]];

let seed = 7;
const srand = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;
const rand = Math.random;
const ri = (a, b) => a + Math.floor(rand() * (b - a + 1));

class Layer {
  constructor(fill = T) { this.d = new Uint8Array(W * H).fill(fill); }
  px(x, y, c) { if (x >= 0 && y >= 0 && x < W && y < H) this.d[y * W + x] = c; }
  rect(x, y, w, h, c) { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) this.px(i, j, c); }
  blob(cx, cy, rx, ry, c) {
    for (let j = -ry; j <= ry; j++) for (let i = -rx; i <= rx; i++)
      if ((i * i) / (rx * rx) + (j * j) / (ry * ry) <= 1) this.px(cx + i, cy + j, c);
  }
  bush(cx, cy, rx, ry) {
    for (let j = -ry; j <= ry; j++) {
      const w = Math.round(rx * Math.sqrt(1 - (j * j) / (ry * ry))) - (j < 0 && (j & 1) ? 1 : 0);
      this.rect(cx - w, cy + j, w * 2 + 1, 1, C.BUSH);
      if (j < 0 && w > 1) { this.px(cx - w, cy + j, C.MID); this.px(cx + w - 1, cy + j, C.MID); }
    }
    this.rect(cx - 1, cy - ry - 1, 3, 1, C.BUSH);
    this.px(cx + Math.floor(rx / 2), cy - ry, C.BUSH);
    this.px(cx - Math.floor(rx / 2) - 1, cy - ry, C.BUSH);
  }
  pine(x, top, h, half, c) {
    for (let r = 0; r < h; r++) {
      const w = Math.max(0, Math.floor(half * r / h) - [2, 1, 0, 0][r % 4]);
      this.rect(x - w, top + r, w * 2 + 1, 1, c);
    }
  }
  sprite(map, legend, x, y, { flip = false, clip, swap } = {}) {
    for (let j = 0; j < map.length; j++) for (let i = 0; i < map[j].length; i++) {
      let ch = map[j][i];
      if (swap && ch in swap) ch = swap[ch];
      const c = legend[ch];
      if (c === undefined) continue;
      const sx = x + (flip ? map[j].length - 1 - i : i), sy = y + j;
      if (clip && !clip(sx, sy)) continue;
      this.px(sx, sy, c);
    }
  }
}

const GROUND_Y = 72;
const FX = 80, FY = 85;

const bg = new Layer(C.SKY);
const fg = new Layer();
const stars = [];

function buildScene() {
  for (let i = 0; i < 46; i++) {
    const x = Math.floor(srand() * W), y = Math.floor(srand() * 52);
    stars.push({ x, y, phase: Math.floor(srand() * 4), big: srand() < .12 });
  }
  bg.blob(134, 15, 7, 7, C.PAPER);
  bg.blob(137, 13, 6, 6, C.SKY);
  bg.px(131, 18, C.MOONS); bg.px(130, 15, C.MOONS); bg.px(132, 20, C.MOONS);

  for (let x = -4; x < W + 6; x += 4 + Math.floor(srand() * 5)) {
    const h = 9 + Math.floor(srand() * 10);
    bg.pine(x, GROUND_Y - h, h, 3 + Math.floor(srand() * 3), C.FAR);
  }
  bg.rect(0, GROUND_Y - 1, W, 1, C.FAR);
  for (let x = -6; x < W + 8; x += 9 + Math.floor(srand() * 9)) {
    const h = 20 + Math.floor(srand() * 18);
    bg.pine(x, GROUND_Y - h, h, 6 + Math.floor(srand() * 4), C.MID);
    bg.rect(x - 1, GROUND_Y - 3, 3, 3, C.MID);
  }
  bg.rect(0, GROUND_Y, W, H - GROUND_Y, C.GROUND);
  for (let i = 0; i < 140; i++) {
    const x = Math.floor(srand() * W), y = GROUND_Y + Math.floor(srand() * srand() * (H - GROUND_Y));
    bg.px(x, y, C.GROUND2);
  }
  for (let x = 0; x < W; x++) if (srand() < .5) bg.px(x, GROUND_Y, C.MID);

  for (const [x, w, boughs] of [[6, 10, [[20, 16], [34, 12], [52, 14], [68, 10]]], [146, 10, [[14, 14], [30, 12], [46, 15], [62, 11]]]]) {
    fg.rect(x, 0, w, GROUND_Y + 6, C.NEAR);
    for (const [y, half] of boughs) {
      fg.pine(x + Math.floor(w / 2), y - 9, 10, half + Math.floor(w / 2), C.NEAR);
    }
    fg.rect(x - 2, GROUND_Y + 4, w + 4, 3, C.NEAR);
  }
  for (const [x, w] of [[38, 5], [121, 5]]) {
    fg.rect(x, GROUND_Y - 34, w, 36, C.NEAR);
    fg.pine(x + 2, GROUND_Y - 46, 20, 9, C.NEAR);
    fg.rect(x - 1, GROUND_Y, w + 2, 2, C.NEAR);
  }
  for (const [cx, cy, rx, ry] of [[58, 80, 9, 5], [104, 83, 8, 4], [28, 87, 11, 5], [134, 88, 10, 5]]) {
    fg.bush(cx, cy, rx, ry);
  }

  fg.rect(50, 90, 16, 3, C.DIM3);
  fg.rect(50, 90, 16, 1, C.LS1);
  fg.rect(49, 91, 1, 1, C.DIM3); fg.rect(66, 91, 1, 1, C.DIM3);
  fg.rect(66, 90, 1, 3, C.LS1);
  for (let a = 0; a < 12; a++) {
    const t = a / 12 * Math.PI * 2;
    const x = Math.round(FX + Math.cos(t) * 13), y = Math.round(FY + 3 + Math.sin(t) * 4);
    fg.rect(x, y, 2, 1, C.DIM3);
    if (a % 3 === 0) fg.px(x, y - 1, C.DIM3);
  }
  fg.rect(FX - 8, FY, 17, 2, C.DIM3);
  fg.rect(FX - 8, FY, 17, 1, C.LS1);
  fg.rect(FX - 8, FY, 2, 2, C.HOTD); fg.rect(FX + 7, FY, 2, 2, C.HOTD);
  fg.rect(FX - 5, FY - 2, 11, 2, C.DIM3);
  fg.px(FX - 5, FY - 1, C.HOT); fg.px(FX + 5, FY - 2, C.HOT);

  fg.rect(108, 86, 7, 7, C.DIM3);
  fg.rect(108, 86, 7, 1, C.LS1);
  fg.px(108, 87, C.LS1); fg.px(114, 92, C.NEAR);
  fg.sprite(GUITAR.map, GUITAR.legend, 97, 71);
}

const GUITAR = {
  legend: { l: C.LS2, p: C.LS1, k: C.DIM3, o: C.DIM3, n: C.DIM3, s: C.PAPER, w: C.LS1, h: C.INK },
  map: [
    "....lpo....",
    "....lko....",
    "....lpo....",
    ".....n.....",
    ".....s.....",
    ".....s.....",
    ".....s.....",
    ".....s.....",
    "....lso....",
    "...lwswo...",
    "..lwwswwo..",
    "..lwwswwo..",
    "...lwswo...",
    "...lwswo...",
    "..lwwhwwo..",
    ".lwwwhwwwo.",
    ".lwwwswwwo.",
    ".lwwwswwwo.",
    ".lwwwswwwo.",
    "..lwwswwo..",
    "...lwwwo...",
    "....ooo....",
  ].map((row, j) => " ".repeat(Math.floor(j / 5)) + row),
};

const FOX = {
  name: "fox",
  legend: { b: C.FOX, a: C.HOTD, e: C.PAPER, w: C.PAPER, k: C.INK },
  blink: { e: "b" }, map: [
    "..b......b..",
    "..bb....bb..",
    "..bab..bab..",
    "..bbbbbbbb..",
    ".bbbbbbbbbb.",
    ".bbbbbbbbbb.",
    ".bebbbbbbeb.",
    ".bbbbbbbbbb.",
    "..bbwwwwbb..",
    "...bwwkwb...",
    "..bbbwwwbbb.",
    ".bbbbbbbbbbb",
    ".bbbbbbbbbbb",
  ],
};
const OWL = {
  name: "owl",
  legend: { k: C.OWL, a: C.EMBER, e: C.INK, b: C.DIM, c: C.DIM3 },
  blink: { a: "k", e: "k" }, map: [
    ".k......k.",
    ".kk....kk.",
    ".kkkkkkkk.",
    "kkkkkkkkkk",
    "kaaakkaaak",
    "kaeakkaeak",
    "kaaakkaaak",
    "kkkkkbkkkk",
    ".kkkkkkkk.",
    ".kckkkkck.",
    ".kkkkkkkk.",
    "..kkkkkk..",
    "..c.cc.c..",
  ],
};
const DEER = {
  name: "deer",
  legend: { d: C.DIM, k: C.RABBIT, e: C.PAPER, w: C.DIM, n: C.INK, s: C.DIM3 },
  blink: { e: "k" }, map: [
    "..dd......dd..",
    ".d.dd....dd.d.",
    ".d..d....d..d.",
    "..d.dd..dd.d..",
    "...d.d..d.d...",
    "....dd..dd....",
    "...kkd..dkk...",
    "..kkkkkkkkkk..",
    "...kkkkkkkk...",
    "...kekkkkek...",
    "...kkkkkkkk...",
    "....kkkkkk....",
    "....kkkkkk....",
    "....kwwwwk....",
    "....knnnnk....",
    ".....kkkk.....",
    ".....kkkks....",
    ".....kkkks....",
    ".....kkkkks...",
    ".....kkkkks...",
    "......kkkks...",
  ],
};
const RABBIT = {
  name: "rabbit",
  legend: { k: C.RABBIT, r: C.HOTD, e: C.PAPER, w: C.PAPER },
  blink: { e: "k" }, map: [
    ".k....k.",
    ".kr..rk.",
    ".kr..rk.",
    ".kr..rk.",
    ".kk..kk.",
    "..kkkk..",
    ".kkkkkk.",
    ".kekkek.",
    ".kkkkkk.",
    "..kwwk..",
    ".kkkkkk.",
    ".kkkkkk.",
  ],
};
const HEDGEHOG = {
  name: "hedgehog",
  legend: { s: C.DIM3, t: C.DIM, k: C.OWL, b: C.RABBIT, e: C.PAPER, n: C.INK },
  blink: { e: "b" }, map: [
    "...t.t.t.t..",
    "..tsssssst..",
    ".tsssssssst.",
    ".ssssssssss.",
    "tssssssssskb",
    ".sssssssskbb",
    ".ksssssskbeb",
    ".kkkkkkkkbbn",
    "..kk..kk.b..",
  ],
};

// The spider only comes along if the visitor got it the towel on the main page.
let helped = stash.get(SPIDER_KEY) === FATE.TOWEL;
const SPIDER = {
  legend: { h: C.HOT, e: C.PAPER }, map: [
    ".h..h..h.",
    "h.hhhhh.h",
    ".hhehehh.",
    "h.hhhhh.h",
    ".h..h..h.",
  ],
};
const TOWEL = { legend: { p: C.PAPER, h: C.HOT }, map: ["phphp", "ppppp"] };
const NEST = { x: 22, top: 35, rest: 46 };
const nest = { y: NEST.rest, wiggle: 0, burps: [], towel: null, leaving: false };
let midge = null, nextMidgeAt = 2500 + rand() * 4000;

function stepMidge() {
  for (const b of nest.burps) { b.y -= 1; b.life--; }
  nest.burps = nest.burps.filter(b => b.life > 0);
  if (nest.wiggle > 0) nest.wiggle--;
  if (nest.leaving) {
    nest.y -= 2;
    if (nest.y < NEST.top - 8) { helped = false; nest.leaving = false; }
    document.body.dataset.midge = "";
    return;
  }
  if (!midge) {
    if (nest.y > NEST.rest) nest.y--;
    if (performance.now() > nextMidgeAt) midge = { x: FX + ri(-16, 16), y: ri(58, 72), buzz: ri(30, 60), phase: "buzz" };
    document.body.dataset.midge = midge ? "buzz" : nest.wiggle > 0 ? "nom" : "";
    return;
  }
  const m = midge;
  if (m.phase === "buzz") {
    m.x += ri(-1, 1); m.y += ri(-1, 1);
    m.x = Math.min(FX + 20, Math.max(FX - 20, m.x)); m.y = Math.min(74, Math.max(56, m.y));
    if (--m.buzz <= 0) m.phase = "come";
  } else if (m.phase === "come") {
    const tx = NEST.x + 4, ty = NEST.rest + 16;
    m.x += Math.sign(tx - m.x) + (rand() < .4 ? ri(-1, 1) : 0);
    m.y += Math.sign(ty - m.y) + (rand() < .4 ? ri(-1, 1) : 0);
    if (Math.abs(m.x - tx) <= 1 && Math.abs(m.y - ty) <= 1) m.phase = "lure";
  } else {
    m.x = NEST.x + 4 + (tick % 4 < 2 ? 0 : 1);
    if (nest.y + 5 < m.y - 1) nest.y++;
    else {
      midge = null;
      nest.wiggle = 10;
      nest.burps.push({ x: NEST.x + 7, y: nest.y - 1, life: 7 }, { x: NEST.x + 9, y: nest.y + 1, life: 10 });
      nextMidgeAt = performance.now() + 8000 + rand() * 12000;
    }
  }
  document.body.dataset.midge = midge ? midge.phase : "nom";
}

// The dropped towel flutters down to the ground and fades into it on its own clock.
function stepTowel() {
  const t = nest.towel;
  if (!t) return;
  if (t.y < GROUND_Y + 8) {
    t.y++;
    if (tick % 3 === 0) t.x += tick % 6 ? 1 : -1;
  } else if (--t.life <= 0) nest.towel = null;
}
function drawTowel(layer) {
  const t = nest.towel;
  if (t) layer.sprite(TOWEL.map, t.life > 4 ? TOWEL.legend : { p: C.DIM3, h: C.DIM3 }, t.x, t.y);
}

function drawSpider(layer) {
  const wx = nest.wiggle > 0 ? (nest.wiggle % 2 ? 1 : -1) : 0;
  if (nest.y > NEST.top) layer.rect(NEST.x + 4, NEST.top, 1, nest.y - NEST.top, C.DIM);
  layer.sprite(SPIDER.map, SPIDER.legend, NEST.x + wx, nest.y);
  if (!nest.towel && !nest.leaving) layer.sprite(TOWEL.map, TOWEL.legend, NEST.x + 2 + wx, nest.y + 5);
  for (const b of nest.burps) layer.px(b.x, b.y, b.life > 4 ? C.PAPER : C.DIM);
  if (midge) { layer.px(midge.x, midge.y, tick % 2 ? C.PAPER : C.DIM); layer.px(midge.x - 1, midge.y + (tick % 2), C.DIM3); }
}

const SPOTS = [
  { who: FOX, mode: "slide", x: 16, y: 58, dir: 1, max: .8 },
  { who: FOX, mode: "slide", x: 121, y: 56, dir: -1, max: .75 },
  { who: DEER, mode: "slide", x: 146, y: 54, dir: -1, max: .72 },
  { who: DEER, mode: "slide", x: 43, y: 52, dir: 1, max: .72 },
  { who: RABBIT, mode: "rise", x: 55, y: 76, max: .75 },
  { who: RABBIT, mode: "rise", x: 130, y: 84, max: .8 },
  { who: HEDGEHOG, mode: "slide", x: 39, y: 83, dir: 1, max: 1 },
  { who: HEDGEHOG, mode: "slide", x: 124, y: 86, dir: -1, max: .85 },
  { who: OWL, mode: "glint", x: 8, y: 22 },
  { who: OWL, mode: "glint", x: 147, y: 18 },
];

let peek = null, lastWho = null, nextPeekAt = 3000 + rand() * 3000;

// Sightings outlive the visit; the line shows once all five have peeked, and stays.
const seen = JSON.parse(stash.get("guitar.seen") || "[]");
let everyone = stash.get("guitar.everyone") === "1";
const allEl = document.getElementById("all");
if (everyone) allEl.hidden = false;
function noteSeen(who) {
  if (!seen.includes(who.name)) {
    seen.push(who.name);
    stash.set("guitar.seen", JSON.stringify(seen));
  }
  if (everyone || seen.length < 5) return;
  everyone = true;
  stash.set("guitar.everyone", "1");
  allEl.hidden = false;
  if (still) return;
  fonts.then(() => { typeset(allEl); decode([allEl]); });
}

function startPeek() {
  const options = SPOTS.filter(s => s.who !== lastWho);
  const spot = options[ri(0, options.length - 1)];
  lastWho = spot.who;
  noteSeen(spot.who);
  peek = { spot, p: 0, phase: "in", hold: ri(25, 45), blink: ri(8, 18), blinkLeft: 0, tick: 0 };
}

// The owl perches on a foreground bough, so it is drawn after the foreground; everyone else hides behind it.
function drawPeek(layer, front) {
  if (!peek || (peek.spot.mode === "glint") !== front) return;
  const { spot, p } = peek, { who } = spot;
  const h = who.map.length, w = who.map[0].length;
  const swap = peek.blinkLeft > 0 ? who.blink : undefined;
  if (spot.mode === "slide") {
    const out = Math.round(p * w);
    const x = spot.dir > 0 ? spot.x - w + out : spot.x + 1 - out;
    const clip = spot.dir > 0 ? (sx) => sx >= spot.x : (sx) => sx <= spot.x;
    layer.sprite(who.map, who.legend, x, spot.y, { flip: spot.dir < 0, clip, swap });
  } else if (spot.mode === "rise") {
    const y = spot.y - Math.round(p * h);
    layer.sprite(who.map, who.legend, spot.x, y, { clip: (sx, sy) => sy < spot.y, swap });
  } else {
    const eyesOnly = p < .5;
    const legend = eyesOnly ? { a: who.legend.a, e: who.legend.e } : who.legend;
    layer.sprite(who.map, legend, spot.x, spot.y, { swap });
  }
}

function stepPeek() {
  if (!peek) return;
  const k = peek;
  k.tick++;
  if (k.blinkLeft > 0) k.blinkLeft--;
  if (k.phase === "in") {
    k.p = Math.min(k.spot.max ?? 1, k.p + .2);
    if (k.p >= (k.spot.max ?? 1)) k.phase = "hold";
  } else if (k.phase === "hold") {
    if (--k.blink <= 0) { k.blinkLeft = 2; k.blink = ri(8, 20); }
    if (--k.hold <= 0) k.phase = "out";
  } else {
    k.p -= .2;
    if (k.p <= 0) { peek = null; nextPeekAt = performance.now() + 5000 + rand() * 9000; }
  }
}

const FW = 17, FH = 24, HEAT = 12;
let heat = new Uint8Array(FW * FH), heatNext = new Uint8Array(FW * FH);
const FIRE_COLORS = [T, T, C.HOTD, C.HOTD, C.HOT, C.HOT, C.HOT, C.HOT, C.EMBER, C.EMBER, C.EMBER, C.PAPER, C.PAPER];
let fireLevel = .18, fireTarget = .18;
const sparks = [];

function stepFire() {
  if (fireLevel < fireTarget) fireLevel = Math.min(fireTarget, fireLevel + .09);
  else if (fireLevel > fireTarget) fireLevel = Math.max(fireTarget, fireLevel - .05);
  const base = Math.min(HEAT, Math.round(HEAT * fireLevel));
  const spread = fireLevel > 1 ? 1 : 0;
  for (let x = 0; x < FW; x++) {
    const d = Math.abs(x - 8) - spread;
    const edge = d <= 3 ? 1 : d <= 5 ? .7 : d <= 6 ? .35 : 0;
    heat[(FH - 1) * FW + x] = Math.max(0, Math.round(base * edge) - (rand() < .35 ? 1 : 0));
  }
  heatNext.fill(0);
  heatNext.set(heat.subarray((FH - 1) * FW), (FH - 1) * FW);
  for (let y = FH - 1; y > 0; y--) for (let x = 0; x < FW; x++) {
    const src = heat[y * FW + x];
    if (!src) continue;
    const dx = x + (rand() < .3 ? ri(-1, 1) : 0);
    if (dx < 0 || dx >= FW) continue;
    const decay = (rand() < .6 ? 1 : 0) + (rand() < .18 ? 1 : 0);
    const v = Math.max(0, src - decay);
    const i = (y - 1) * FW + dx;
    if (v > heatNext[i]) heatNext[i] = v;
  }
  [heat, heatNext] = [heatNext, heat];

  if (fireLevel > .5 && rand() < .55) sparks.push({ x: FX + ri(-3, 3), y: FY - 8 - ri(0, 6), life: ri(8, 18) });
  for (const s of sparks) {
    s.y -= rand() < .25 ? 2 : 1;
    s.x += rand() < .5 ? ri(-1, 1) : 0;
    s.life--;
  }
  for (let i = sparks.length - 1; i >= 0; i--) if (sparks[i].life <= 0 || sparks[i].y < 0) sparks.splice(i, 1);
}

function drawFire(layer) {
  const ox = FX - 8, oy = FY - 1 - (FH - 1);
  for (let y = 0; y < FH; y++) for (let x = 0; x < FW; x++) {
    const c = FIRE_COLORS[heat[y * FW + x]];
    if (c !== T) layer.px(ox + x, oy + y, c);
  }
  for (const s of sparks) layer.px(s.x, s.y, s.life > 9 ? C.EMBER : s.life > 4 ? C.HOT : C.HOTD);
}

let shooting = null;
let tick = 0;
const out = new Layer();
let glow = 1;

function render() {
  out.d.set(bg.d);
  const twinkle = Math.floor(tick / 3);
  for (const s of stars) {
    const on = (twinkle + s.phase) % 5 !== 0;
    out.px(s.x, s.y, on ? (s.big ? C.PAPER : C.DIM) : C.DIM3);
    if (s.big && on) { out.px(s.x + 1, s.y, C.DIM3); out.px(s.x - 1, s.y, C.DIM3); out.px(s.x, s.y + 1, C.DIM3); out.px(s.x, s.y - 1, C.DIM3); }
  }
  if (shooting) {
    for (let i = 0; i < 4; i++) out.px(shooting.x - i * 2, shooting.y + i, i ? C.DIM : C.PAPER);
  }
  drawPeek(out, false);
  for (let i = 0; i < W * H; i++) if (fg.d[i] !== T) out.d[i] = fg.d[i];
  drawPeek(out, true);
  if (helped) drawSpider(out);
  drawTowel(out);

  const I = fireLevel * glow;
  for (let y = 30; y < H; y++) for (let x = 0; x < W; x++) {
    const c = out.d[y * W + x];
    const ladder = LADDER[c];
    if (!ladder) continue;
    const dx = (x - FX) / 54, dy = (y - FY) / (y > FY ? 24 : 42);
    const light = (1 - Math.sqrt(dx * dx + dy * dy)) * I * 3.4;
    if (light <= 0) continue;
    const lvl = Math.min(3, Math.floor(light + BAYER[y & 3][x & 3] / 16));
    out.d[y * W + x] = ladder[lvl];
  }

  drawFire(out);
  for (let i = 0, j = 0; i < W * H; i++, j += 4) {
    const c = PAL[out.d[i]];
    rgba[j] = c[0]; rgba[j + 1] = c[1]; rgba[j + 2] = c[2]; rgba[j + 3] = 255;
  }
  ctx.putImageData(image, 0, 0);
}

function step() {
  tick++;
  stepFire();
  if (tick % 2 === 0) { stepPeek(); glow = [.9, 1, 1, 1.1][ri(0, 3)]; }
  stepTowel();
  if (helped) stepMidge();
  if (!peek && performance.now() > nextPeekAt) startPeek();
  if (shooting) {
    shooting.x += 4; shooting.y += 2;
    if (shooting.x > W + 8) shooting = null;
  } else if (rand() < .0015) shooting = { x: ri(10, 90), y: ri(2, 20) };
  render();
}

function fit() {
  const stage = document.querySelector(".stage");
  const dpr = devicePixelRatio || 1;
  const availW = stage.clientWidth;
  const availH = Math.max(240, innerHeight - 9 * 16);
  const scale = Math.max(1, Math.floor(Math.min(availW * dpr / W, availH * dpr / H))) / dpr;
  canvas.style.width = W * scale + "px";
  canvas.style.height = H * scale + "px";
  document.getElementById("screen").style.setProperty("--px", scale + "px");
}

buildScene();
fit();
addEventListener("resize", fit);

const audio = document.getElementById("music");
const startEl = document.getElementById("start");
const soundBtn = document.getElementById("sound");
const live = document.getElementById("live");
audio.volume = .7;
let started = false;

function label(el, text) {
  const kbd = el.querySelector("kbd");
  el.textContent = text;
  if (kbd) el.append(kbd);
}

function soundState() {
  const on = started && !audio.paused && !audio.muted;
  label(soundBtn, on ? "sound on" : "sound off");
  live.classList.toggle("off", !on);
  live.textContent = on ? "now playing" : "";
}

function start() {
  if (started) return;
  started = true;
  fireTarget = 1.25;
  setTimeout(() => { fireTarget = 1; }, 1400);
  startEl.hidden = true;
  if (still) restFire();
  audio.muted = false;
  audio.play().then(soundState).catch(() => { started = false; startEl.hidden = false; });
}

function toggleSound() {
  if (!started) return start();
  if (audio.paused) audio.play().then(soundState);
  else audio.muted = !audio.muted;
  soundState();
}

function restFire() {
  for (let i = 0; i < 40; i++) stepFire();
  sparks.length = 0;
  render();
}

if (still) {
  peek = { spot: SPOTS[0], p: .8, phase: "hold", hold: 1, blink: 99, blinkLeft: 0, tick: 0 };
  restFire();
} else {
  setInterval(step, 100);
}

// A gesture-free play only succeeds when the site already earned autoplay rights; then nobody needs the prompt.
audio.play().then(() => { started = true; fireTarget = 1; startEl.hidden = true; soundState(); if (still) restFire(); }).catch(() => {});

document.addEventListener("pointerdown", e => {
  if (e.target.closest(".meta")) return;
  start();
});
// Tapping the hanging spider asks about the towel; yes drops it to the ground and the spider climbs out of frame.
const bubble = speech(document.getElementById("bubble"), canvas);
const overSpider = (x, y) => helped && !nest.leaving && x >= NEST.x - 2 && x <= NEST.x + 11 && y >= nest.y - 3 && y <= nest.y + 9;
canvas.addEventListener("pointermove", e => {
  const r = canvas.getBoundingClientRect();
  canvas.style.cursor = overSpider((e.clientX - r.left) / r.width * W, (e.clientY - r.top) / r.height * H) ? "pointer" : "";
});
canvas.addEventListener("pointerdown", e => {
  const r = canvas.getBoundingClientRect();
  const x = (e.clientX - r.left) / r.width * W, y = (e.clientY - r.top) / r.height * H;
  if (overSpider(x, y)) {
    if (bubble.shown) return bubble.close(false);
    return bubble.open(yes => {
      if (!yes) return;
      midge = null;
      nest.towel = { x: NEST.x + 2, y: nest.y + 5, life: 12 };
      nest.leaving = true;
      stash.remove(SPIDER_KEY);
      if (still) { helped = false; nest.towel = null; nest.leaving = false; render(); }
    }, el => {
      const px = parseFloat(getComputedStyle(document.getElementById("screen")).getPropertyValue("--px"));
      el.style.left = (NEST.x + 13) * px + "px";
      el.style.top = Math.max(0, (nest.y - 3) * px) + "px";
    });
  }
  if (!started) return;
  if (Math.abs(x - FX) > 14 || y < FY - 26 || y > FY + 6) return;
  for (let i = ri(4, 6); i > 0; i--) sparks.push({ x: FX + ri(-5, 5), y: FY - 4 - ri(0, 10), life: ri(10, 22) });
  fireTarget = 1.3;
  setTimeout(() => { fireTarget = 1; }, 500);
  if (still) render();
});
soundBtn.addEventListener("click", toggleSound);
document.addEventListener("keydown", e => {
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  if (e.key === "Escape") { location.href = "/#dignity"; return; }
  if (e.key === "m" || e.key === "M") { toggleSound(); return; }
  if (e.key === "Tab") return;
  start();
});
audio.addEventListener("pause", soundState);
audio.addEventListener("play", soundState);
soundState();
