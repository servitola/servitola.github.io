// Scramble-decode text shared by every page. Screen readers get an untouched copy; the visible text is
// split into per-letter spans that cycle through glyphs before settling on the real character.
const GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%&*+-<>/";
const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
const running = new Map();

const fontsReady = specs => Promise.all(specs.map(f => document.fonts.load(f))).then(() => document.fonts.ready);
function hush(list) {
  if (!still) for (const u of list) u.classList.add("hush");
}

function typeset(unit) {
  if (unit.matches("button, a")) {
    const copy = document.createElement("span");
    copy.className = "sr-only";
    copy.textContent = [...unit.children].map(part => part.textContent).join(" ");
    for (const part of unit.children) part.setAttribute("aria-hidden", "true");
    unit.prepend(copy);
  } else if (!unit.hasAttribute("aria-hidden")) {
    const copy = unit.cloneNode(true);
    copy.className = "sr-only";
    unit.before(copy);
    unit.setAttribute("aria-hidden", "true");
  }
  split(unit);
}

// Each letter keeps the width it had in running text (kerning included, in em so fluid sizes survive), so nothing reflows.
function split(unit) {
  const walker = document.createTreeWalker(unit, NodeFilter.SHOW_TEXT, n => n.parentElement.closest(".sr-only, .keep") ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT);
  const texts = [];
  while (walker.nextNode()) texts.push(walker.currentNode);
  const range = document.createRange();
  const measured = texts.map(text => {
    const size = parseFloat(getComputedStyle(text.parentElement).fontSize);
    return [...text.data].map((ch, i) => {
      range.setStart(text, i);
      range.setEnd(text, i + 1);
      return range.getBoundingClientRect().width / size;
    });
  });
  texts.forEach((text, t) => {
    const frag = document.createDocumentFragment();
    let i = 0;
    for (const piece of text.data.split(/(\s+)/)) {
      if (!piece) continue;
      if (/^\s+$/.test(piece)) { frag.append(piece); i += piece.length; continue; }
      const word = document.createElement("span");
      word.className = "w";
      for (const ch of piece) {
        const s = document.createElement("span");
        s.className = "ch";
        s.dataset.ch = ch;
        s.textContent = ch;
        s.style.width = measured[t][i++].toFixed(3) + "em";
        word.append(s);
      }
      frag.append(word);
    }
    text.replaceWith(frag);
  });
  unit.classList.remove("hush");
}
function retext(unit, text) {
  const copy = unit.previousElementSibling;
  if (copy?.classList.contains("sr-only")) copy.textContent = text;
  unit.textContent = text;
  if (!still) split(unit);
}
function settle(root) {
  for (const c of root.querySelectorAll(".ch")) {
    c.textContent = c.dataset.ch;
    c.classList.add("on");
  }
}

function stopDecoding() {
  for (const t of running.values()) clearInterval(t);
  running.clear();
}

function cycle(list, last, frame, finish) {
  for (const u of list) clearInterval(running.get(u));
  let pass = 0;
  const timer = setInterval(() => {
    frame(pass);
    if (pass++ > last) {
      clearInterval(timer);
      for (const u of list) if (running.get(u) === timer) running.delete(u);
      finish();
    }
  }, 90);
  for (const u of list) running.set(u, timer);
}

function decode(list, done) {
  const plan = [];
  let offset = 0, last = 0;
  for (const unit of list) {
    const chars = [...unit.querySelectorAll(".ch")];
    const rate = Math.min(28 / 90, 24 / chars.length);
    chars.forEach((c, i) => {
      c.classList.remove("on");
      c.textContent = c.dataset.ch;
      const start = offset + (i === 0 ? 0 : Math.floor(i * rate) + Math.floor(Math.random() * 4));
      const end = start + 4 + Math.floor(Math.random() * 5);
      plan.push({ c, start, end });
      last = Math.max(last, end);
    });
    offset += .7;
  }
  cycle(list, last, pass => {
    for (const p of plan) {
      if (pass < p.start) continue;
      if (pass < p.end) {
        p.c.textContent = GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
        p.c.classList.add("on");
      } else if (p.c.textContent !== p.c.dataset.ch) p.c.textContent = p.c.dataset.ch;
    }
  }, () => {
    for (const p of plan) { p.c.textContent = p.c.dataset.ch; p.c.classList.add("on"); }
    done?.();
  });
}

function encode(list, done) {
  const plan = [];
  let last = 0;
  list.flatMap(u => [...u.querySelectorAll(".ch")]).forEach((c, i) => {
    const start = Math.floor(i * 28 / 90) + Math.floor(Math.random() * 3);
    const end = start + 3 + Math.floor(Math.random() * 4);
    plan.push({ c, start, end });
    last = Math.max(last, end);
  });
  cycle(list, last, pass => {
    for (const p of plan) {
      if (pass < p.start) continue;
      if (pass < p.end) p.c.textContent = GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
      else p.c.classList.remove("on");
    }
  }, () => done?.());
}
