// The spider that hangs from "github ↗": summoned by Spider-Man, drowned or rafted by the Weight flood, towelled on Answers.
const spider = document.getElementById("spider");
const spiderChoice = document.querySelector('[data-go="spider-man"]');
const weight = document.getElementById("weight");
if (halloween) spider.classList.add("hat");
if (winter) spider.classList.add("snow");
const dropSpider = () => { spider.classList.add("drop"); stash.set(SPIDER_KEY, spider.classList.contains("towel") ? FATE.TOWEL : FATE.DROPPED); };
if ([FATE.DROPPED, FATE.TOWEL].includes(stash.get(SPIDER_KEY))) spider.classList.add("drop", ...(stash.get(SPIDER_KEY) === FATE.TOWEL ? ["towel"] : []));
spiderChoice.addEventListener("pointerenter", dropSpider, { once: true });
spiderChoice.addEventListener("focus", () => { if (document.getElementById("choices").classList.contains("on")) dropSpider(); });

function pop(text) {
  const b = spider.querySelector(".pop");
  b.textContent = text;
  b.classList.remove("go");
  void b.offsetWidth;
  b.classList.add("go");
}

// Narrow the window on Answers until the illustration slides under the spider: it dips and takes the towel.
let grabbing = false, reaching;
function reach() {
  const answers = document.getElementById("answers");
  if (winter || grabbing || answers.hidden || !spider.classList.contains("drop") || spider.classList.contains("towel") || spider.classList.contains("drown")) return;
  const a = answers.querySelector("img").getBoundingClientRect(), b = spider.querySelector("img").getBoundingClientRect();
  if (b.left >= a.right || b.right <= a.left || b.top >= a.bottom || b.bottom <= a.top) return;
  grabbing = true;
  spider.classList.add("grab");
  pop("+1 TOWEL");
  setTimeout(() => {
    spider.classList.remove("grab");
    spider.classList.add("towel");
    stash.set(SPIDER_KEY, FATE.TOWEL);
    grabbing = false;
  }, still ? 0 : 1500);
}
addEventListener("resize", () => { cancelAnimationFrame(reaching); reaching = requestAnimationFrame(reach); });

// A dropped spider drowns when the flood reaches it; it hangs again only after a fresh hover.
// With the towel it rides the surface instead and lands beside the back button.
let sinking;
function watchSpider() {
  if (winter) return;
  const towel = spider.classList.contains("towel");
  const sea = weight.querySelector(towel ? ".sea.front" : ".sea.deep");
  const body = spider.querySelector("img");
  let rest;
  const tick = () => {
    if (weight.hidden || !spider.classList.contains("drop")) return;
    rest ??= body.getBoundingClientRect();
    const crest = sea.getBoundingClientRect().top + innerHeight * (towel ? .08 : .18);
    if (!towel) {
      if (crest > rest.top + rest.height * .6) return requestAnimationFrame(tick);
      spider.classList.add("drown");
      sinking = setTimeout(sink, 2300);
      return;
    }
    if (weight.classList.contains("flooded")) {
      const dock = weight.querySelector(".back").getBoundingClientRect();
      spider.classList.add("ashore");
      spider.style.setProperty("--dx", dock.right + 36 - rest.left + "px");
      spider.style.setProperty("--dy", dock.top + dock.height / 2 - rest.top - rest.height / 2 + "px");
      return;
    }
    if (crest <= rest.bottom - 8) {
      if (!spider.classList.contains("raft")) { spider.classList.add("raft"); pop("SAVED"); }
      spider.style.setProperty("--dy", Math.max(crest - rest.bottom + 10, innerHeight * .22 - rest.top) + "px");
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}
function sink() {
  clearTimeout(sinking);
  spider.classList.remove("drop", "drown", "towel");
  stash.set(SPIDER_KEY, FATE.DROWNED);
  spiderChoice.addEventListener("pointerenter", dropSpider, { once: true });
}
function beach() {
  spider.classList.remove("raft", "ashore");
  spider.style.removeProperty("--dx");
  spider.style.removeProperty("--dy");
}
