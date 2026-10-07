# servitola.github.io

A toy, not a blog. Plain HTML/CSS/JS on GitHub Pages (`.nojekyll` turns the Jekyll build off), no build step,
no dependencies beyond the Google Fonts link. Three inks everywhere: ink `#0f0e0c`, paper `#efe6d4`,
dim `#8a8273`, hot `#ff5a1f`; Instrument Serif for display, JetBrains Mono for labels, Press Start 2P only on
the guitar page.

## Pages and scenes

`index.html` is one page whose `<section class="scene">`s are switched by hash (`show()` in `assets/scenes.js`):

| Hash | Scene | Leads to |
| --- | --- | --- |
| (none) | the question, three choices; a fourth, "or nothing", decodes after 20 idle seconds | `#answers`, `#dignity`, `#spider-man`, `#nothing` |
| `#nothing` | "Found it." → "Want more?" → yes returns to the question with "(again)" / "(again, again)" (sessionStorage `again`) | start |
| `#answers` | the 42 illustration | start |
| `#dignity` | God hugging «ты» | `#weight`, `/guitar/`, start |
| `#weight` | the glass fills, overflows, floods the viewport orange; `esc back` decodes on the orange | `#dignity` |
| `#spider-man` | "Spider-Man is Peter Parker." → re-scrambles to "Tssss." → `→ next` | `#not-a-choice`, start |
| `#not-a-choice` | "It's not a choice." Yes / No | `#yes` (1994 series frame), `#no` (Gwen, 2014), back to `#spider-man` |

Esc always goes one step up that table; browser back/forward works through `popstate`.

`guitar/index.html` is its own page: a 160×100 pixel campfire on a canvas (`guitar/scene.js`), Sonic (2006) on
loop after PRESS START, animals peeking at random; tapping the fire throws sparks; once all five animals have
been seen (localStorage `guitar.seen`, `guitar.everyone`) a line decodes under the scene and stays.

`404.html` is the GitHub Pages not-found page: the spider lands on the 0 of 404 with a "not found" tag.

## Shared files

- `assets/site.css` — tokens, reset, riso grain overlay, `.frame`/`.meta`/`.stage`, `.choice` + `kbd`,
  `.caret`, `.sr-only`, the scramble spans (`.w`, `.ch`, `.hush`), reduced-motion base.
- `assets/decode.js` — the text engine: `typeset(unit)` keeps a screen-reader copy and splits the visible
  text into per-letter spans whose widths are measured in context (so nothing reflows); `decode(list, done)`
  scrambles through `GLYPHS` and settles, `encode(list, done)` runs it backwards, `retext`, `settle`,
  `stopDecoding`, `fontsReady(specs)`, `hush(list)`, and `still` (prefers-reduced-motion: everything instant,
  no spans at all).
- `assets/state.js` — `stash.get/set(key, session?)`: localStorage/sessionStorage behind try/catch with an
  in-memory fallback, and the spider contract: key `spider`, values `dropped | towel | drowned`.
- Front page only: `assets/scenes.css|js` (scenes, question, stories, keyboard), `assets/flood.css` (Weight),
  `assets/spider.css|js` (the rig under "github ↗"), `assets/clock.js` (time-of-day variants).
- Guitar only: `guitar/guitar.css`, `guitar/scene.js`. The 404 keeps its few rules inline.

All references are absolute (`/assets/…`), so they resolve from `/`, `/guitar/` and any 404 depth.

## The spider

Hovering or focusing the Spider-Man choice drops it from "github ↗" (`dropped`). On `#answers`, narrowing
the window until the illustration slides under it makes it dip for the towel in the picture (`towel`). On
`#weight` a bare spider drowns when the flood reaches it (`drowned`, hangs again only after a fresh hover); a
towelled one rafts on the surface and parks beside the back button. On `/guitar/` a towelled spider hangs from
the left pine and now and then eats a midge. The state travels through `stash` in `assets/state.js`.

## Clock

`assets/clock.js` reads the visitor's clock: before 05:00 the question gets "can't sleep?", Friday from 18:00
"friday. close the laptop.", January 1 "new year, same question"; October 31 the spider wears a witch hat;
in December an orange snowflake drops instead of the spider and the quest sits out. `?date=YYYY-MM-DDTHH:MM`
previews any moment.

## Keyboard

The owner browses with Vimium, which swallows plain letters and digits, so every path must work with arrows,
Enter and Esc alone (and mouse/touch). The `kbd` hint on a button is also its hotkey when the button is
visible; arrows cycle the visible choices of the current scene.

## Assets

Illustrations come from fal.ai `openai/gpt-image-2.5/sunburst/text-to-image` at 1024×1280 with one style
prefix: risograph, two inks `#efe6d4` and `#ff5a1f` on `#0f0e0c` paper. Commit WebP (`cwebp -q 82`), not the
PNGs. The two Spider-Man frames are stills supplied by the owner, shown at their own aspect.

`assets/audio/sonic.mp3` was compressed 3:1 and normalised to −16 LUFS so it does not blast on first play;
to redo it from a source: `ffmpeg -i src -af "acompressor=ratio=3,loudnorm=I=-16:TP=-1.5:LRA=11" sonic.mp3`.

## Checks

Serve the repo root (`python3 -m http.server 8771 --bind 127.0.0.1`) and run the Playwright scripts with
`uv run -q --with playwright python <script>.py` (they launch `channel="chrome"` at 1440×900 and 420×800
plus a reduced-motion context, assert hashes/classes/text, fail on any console error, and drop screenshots
in the preview folder). One script per feature: flood, story, drown, quest, nothing, date, fire, shoot (the
start screen and key paths), extra (404 and guitar start/audio).
