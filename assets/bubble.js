// A 16-bit speech bubble with a yes and a no. Arrows move between them, Enter picks, y / n and Esc answer
// directly, and so does pressing anywhere outside; the text scrambles in and out like everything else.
function speech(el, anchor) {
  const list = [...el.querySelectorAll(".ask, .choice")];
  const buttons = () => [...el.querySelectorAll(".choice")];
  let answer, closing = false;
  const ask = el.querySelector(".ask");
  function open(onAnswer, place, text) {
    if (!el.hidden || closing) return;
    answer = onAnswer;
    el.hidden = false;
    if (text) {
      el.setAttribute("aria-label", text);
      if (el.dataset.set) retext(ask, text); else ask.textContent = text;
    }
    place?.(el);
    if (!still) {
      if (!el.dataset.set) { el.dataset.set = "1"; list.forEach(typeset); }
      decode(list);
    }
    buttons()[1].focus({ preventScroll: true });
  }
  function close(yes) {
    if (el.hidden || closing) return;
    closing = true;
    answer?.(yes);
    const done = () => { closing = false; el.hidden = true; };
    if (still) done(); else encode(list, done, true);
  }
  el.addEventListener("click", e => {
    const b = e.target.closest(".choice");
    if (b) close(b.dataset.yes === "1");
  });
  addEventListener("keydown", e => {
    if (el.hidden || e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key === "Tab") return;
    e.stopImmediatePropagation();
    if (e.key === "Enter") return;
    e.preventDefault();
    const bs = buttons(), at = bs.indexOf(document.activeElement);
    if (e.key.startsWith("Arrow")) bs[(at + 1) % bs.length].focus();
    else if (e.key === "Escape" || e.key === "n") close(false);
    else if (e.key === "y") close(true);
  }, true);
  addEventListener("pointerdown", e => {
    if (!el.hidden && !el.contains(e.target) && !anchor.contains(e.target)) close(false);
  }, true);
  return { open, close, get shown() { return !el.hidden; } };
}
