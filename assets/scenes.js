// Scenes of the front page: hash navigation, the question, the stories, the flood's cue.
const QUESTION = "What are you looking for?";
const UNITS = "#typed, .sub, .label, .say, .spidey > span, .choice";
const scenes = [...document.querySelectorAll(".scene")];
const question = document.getElementById("q");
const typed = document.getElementById("typed");
const choices = document.getElementById("choices");
const keys = { "1": "answers", "2": "dignity", "3": "spider-man", "Escape": "ask" };
const sub = document.getElementById("sub");
let typedOnce = false;
let asked = false;

document.getElementById("year").textContent = new Date().getFullYear();
typed.textContent = QUESTION;
for (const b of document.querySelectorAll(".choice")) b.dataset.key = b.querySelector("kbd").textContent;
if (mood) { sub.textContent = mood; sub.hidden = false; }

const units = root => [...(root.matches?.(UNITS) ? [root] : []), ...root.querySelectorAll(UNITS)].filter(u => !u.closest(".sr-only") && !u.closest("[hidden]"));
// Hidden text cannot be measured, so late arrivals are typeset the moment they are shown.
function reveal(el) {
  el.hidden = false;
  if (still) return;
  for (const u of units(el)) if (!u.dataset.set) { u.dataset.set = "1"; typeset(u); }
}
hush(document.querySelectorAll(UNITS));

const ready = fontsReady(['1em "Instrument Serif"', 'italic 1em "Instrument Serif"', '1em "JetBrains Mono"', '500 1em "JetBrains Mono"']);
function prepare(scene) {
  if (still || scene.dataset.set) return;
  scene.dataset.set = "1";
  for (const u of units(scene)) { u.dataset.set = "1"; typeset(u); }
}

const spidey = document.getElementById("spider-man");
const who = spidey.querySelector(".who");
let tale = [];
const later = (ms, fn) => tale.push(setTimeout(fn, ms));
function offerNext() {
  spidey.classList.add("next");
  const next = spidey.querySelector(".next");
  if (!still) decode([next]);
  next.focus({ preventScroll: true });
}
function story() {
  later(2500, () => encode([who], () => {
    retext(who, "Tssss.");
    decode([who], () => later(2000, () => encode([who], () => later(400, offerNext))));
  }));
}

const nothingLi = document.getElementById("nothing-li");
const again = () => +stash.get("again", true) || 0;
const wording = () => QUESTION + ["", " (again)", " (again, again)"][Math.min(2, again())];
let idle;
function armIdle() {
  clearTimeout(idle);
  if (document.getElementById("ask").hidden || !choices.classList.contains("on") || !nothingLi.hidden) return;
  idle = setTimeout(() => { reveal(nothingLi); if (!still) decode(units(nothingLi)); }, 20000);
}
for (const ev of ["keydown", "pointerdown", "pointermove", "touchstart"]) addEventListener(ev, armIdle, { passive: true });

function ask() {
  if (asked || still) {
    settle(question);
    settle(sub);
    settle(choices);
    question.classList.add("done");
    choices.classList.add("on");
    armIdle();
    return;
  }
  asked = true;
  decode(units(question), () => {
    question.classList.add("done");
    choices.classList.add("on");
    decode(units(choices), () => { if (!sub.hidden) decode([sub]); });
    armIdle();
  });
}

function found() {
  later(still ? 0 : 3000, () => {
    const more = document.getElementById("more");
    reveal(more);
    if (!still) decode(units(more));
    more.querySelector(".choice").focus({ preventScroll: true });
  });
}

const PARENT = { nothing: "ask", answers: "ask", dignity: "ask", weight: "dignity", "spider-man": "ask", "not-a-choice": "spider-man", yes: "not-a-choice", no: "not-a-choice" };
const isBack = (from, to) => { for (let p = PARENT[from]; p; p = PARENT[p]) if (p === to) return true; return false; };
let book;
function turn() {
  book?.remove();
  const leaf = document.createElement("div");
  leaf.className = "leaf";
  const copy = document.querySelector(".frame").cloneNode(true);
  // The copy keeps its own clip paths: ids are re-pointed so url(#…) never reaches into the hidden original.
  for (const el of copy.querySelectorAll("[id]")) el.id = "leaf-" + el.id;
  for (const el of copy.querySelectorAll("[clip-path], [fill]")) for (const a of ["clip-path", "fill"]) {
    const v = el.getAttribute(a);
    if (v?.includes("url(#")) el.setAttribute(a, v.replace("url(#", "url(#leaf-"));
  }
  leaf.append(copy);
  book = document.createElement("div");
  book.className = "book";
  book.setAttribute("aria-hidden", "true");
  book.append(leaf);
  const mine = book;
  leaf.addEventListener("animationend", () => { if (book === mine) { book.remove(); book = null; } });
  document.body.append(book);
}

function show(id) {
  if (!document.getElementById(id)) id = "ask";
  const from = scenes.find(s => !s.hidden);
  if (from && from.id !== id && !still && isBack(from.id, id)) turn();
  else { book?.remove(); book = null; }
  for (const s of scenes) {
    s.hidden = s.id !== id;
    s.classList.remove("in", "done", "flooded", "next");
  }
  tale.forEach(clearTimeout);
  tale = [];
  stopDecoding();
  if (spider.classList.contains("drown")) sink();
  if (spider.classList.contains("raft")) beach();
  clearTimeout(idle);
  nothingLi.hidden = true;
  document.getElementById("more").hidden = true;
  const scene = document.getElementById(id);
  if (id === "spider-man" && scene.dataset.set) retext(who, "Peter Parker.");
  if (id === "ask" && typed.textContent !== wording()) {
    question.setAttribute("aria-label", wording());
    if (scene.dataset.set) retext(typed, wording()); else typed.textContent = wording();
    asked = false;
  }
  // Two frames: the first paints the hidden-state styles, the second lets transitions run from them.
  requestAnimationFrame(() => requestAnimationFrame(() => scene.classList.add("in")));
  ready.then(() => {
    if (scene.hidden) return;
    prepare(scene);
    if (id === "ask") ask();
    else if (still) settle(scene);
    else decode(units(scene), { "spider-man": story, nothing: found }[id]);
    if (id === "nothing" && still) found();
    if (id === "weight" && still) scene.classList.add("done");
    if (id === "weight" && !still) watchSpider();
    if (id === "spider-man" && still) offerNext();
    if (id === "answers") later(still ? 0 : 1300, reach);
    const focusable = scene.querySelector(".choice");
    if (focusable && typedOnce) focusable.focus({ preventScroll: true });
  });
  if (id === "ask") typedOnce = true;
  if (id === "spider-man") dropSpider();
  scrollTo({ top: 0, behavior: still ? "auto" : "smooth" });
}

function go(id) {
  const hash = id === "ask" ? "" : "#" + id;
  if (location.hash !== hash) history.pushState(null, "", hash || location.pathname);
  show(id);
}

weight.querySelector(".sea.front").addEventListener("animationend", e => {
  if (e.animationName !== "flood") return;
  weight.classList.add("flooded", "done");
  const back = weight.querySelector(".back");
  decode([back]);
  back.focus({ preventScroll: true });
});

for (const img of document.querySelectorAll("#yes img, #no img")) {
  const fail = () => { img.hidden = true; document.querySelector(`[data-go="${img.closest(".scene").id}"]`).closest("li").hidden = true; };
  img.addEventListener("error", fail);
  if (img.complete && !img.naturalWidth) fail();
}

document.addEventListener("click", e => {
  const b = e.target.closest("[data-go]");
  if (!b) return;
  if (b.classList.contains("again")) stash.set("again", again() + 1, true);
  go(b.dataset.go);
});
document.addEventListener("keydown", e => {
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  const scene = scenes.find(s => !s.hidden);
  const shown = b => !b.hidden && getComputedStyle(b).visibility !== "hidden";
  const hint = { Escape: "esc", ArrowRight: "→" }[e.key] ?? e.key;
  const local = [...scene.querySelectorAll(".choice")].find(b => b.dataset.key === hint && (hint === "esc" || shown(b)));
  // Vimium swallows plain letters and digits before the page sees them; arrows still arrive.
  const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
  if (step && !local) {
    const buttons = [...scene.querySelectorAll(".choice")].filter(shown);
    if (!buttons.length) return;
    const at = buttons.indexOf(document.activeElement);
    const next = at < 0 ? (step > 0 ? 0 : buttons.length - 1) : (at + step + buttons.length) % buttons.length;
    buttons[next].focus();
    e.preventDefault();
    return;
  }
  if (local && !local.dataset.go) return local.click();
  const id = local ? local.dataset.go : keys[e.key];
  if (!id) return;
  if (document.getElementById(id).hidden) go(id);
});
addEventListener("popstate", () => show(location.hash.slice(1) || "ask"));
// Chrome re-scrolls to the #hash element once loading ends, which tucks the header away on the tall scenes.
addEventListener("load", () => scrollTo(0, 0));

show(location.hash.slice(1) || "ask");
