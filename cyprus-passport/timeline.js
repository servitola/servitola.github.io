(() => {
  const root = document.getElementById("queue");
  const box = root && root.querySelector(".queue-chart");
  if (!box) return;
  const script = document.currentScript;
  const dataUrl = new URL("data/timeline.json", script ? script.src : location.href);

  const NS = "http://www.w3.org/2000/svg";
  const MONTHS = ["янв", "фев", "мар", "апр", "май", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"];
  const MD = 30.4;
  const MIN_N = 3;
  const SERIES = [
    { key: "interview", label: "собеседование", color: "var(--accent)" },
    { key: "approval", label: "письмо об одобрении", color: "var(--stamp)" },
  ];

  const style = document.createElement("style");
  style.textContent = `
    #queue .q-big{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,240px),1fr));gap:14px;margin:18px 0}
    #queue .q-card{background:var(--sheet);border:1px solid var(--rule);border-top:4px solid var(--accent);padding:14px 16px 12px}
    #queue .q-card.b{border-top-color:var(--stamp)}
    #queue .q-card small{display:block;color:var(--muted);font-size:15px;line-height:1.3}
    #queue .q-num{font:700 clamp(48px,9vw,68px)/1 var(--f-display);color:var(--ink);margin:6px 0 4px}
    #queue .q-num span{font-size:.45em;margin-left:.2em;color:var(--muted)}
    #queue .q-trend{font-size:15px;line-height:1.35;margin:0}
    #queue .q-trend b{color:var(--stamp);white-space:nowrap}
    #queue .q-trend.ok b{color:var(--accent)}
    #queue .q-base{color:var(--muted);font-size:15px;margin:0 0 6px}
    #queue .q-how{margin:8px 0 10px;padding-left:22px;display:grid;gap:6px}
    #queue .q-how li{margin:0}
    #queue .q-cap{font:700 20px/1.2 var(--f-display);text-transform:uppercase;letter-spacing:.02em;margin:26px 0 4px}
    #queue .q-key{display:flex;flex-wrap:wrap;gap:4px 18px;font-size:15px;margin:0 0 4px}
    #queue .q-key i{display:inline-block;width:12px;height:12px;margin-right:6px;vertical-align:-1px}
    #queue svg{display:block;width:100%;max-width:640px;height:auto}
    #queue .q-val{fill:var(--ink);font:700 13px var(--f-display);text-anchor:middle}
    #queue .q-mon{fill:var(--muted);font:12px var(--f-body);text-anchor:middle}
    #queue .q-base-line{stroke:var(--ink);stroke-width:1.5}
    #queue .q-caveat{color:var(--muted);font-size:15px;margin:10px 0 6px}
    #queue details{margin:6px 0;font-size:15px}
    #queue summary{cursor:pointer;color:var(--accent)}
    #queue details p{margin:8px 0}
    #queue .q-tab{overflow-x:auto}
    #queue table{border-collapse:collapse;min-width:100%}
    #queue th,#queue td{padding:3px 10px;border-bottom:1px solid var(--rule);text-align:right;white-space:nowrap}
    #queue th:first-child,#queue td:first-child{text-align:left}
    #queue th{color:var(--muted);font-weight:500}
  `;
  document.head.appendChild(style);

  const el = (tag, attrs = {}, kids = []) => {
    const svg = ["svg", "g", "line", "text", "rect", "title", "desc"].includes(tag);
    const n = svg ? document.createElementNS(NS, tag) : document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
    n.append(...[].concat(kids));
    return n;
  };

  const mo = (days) => Math.round(days / MD);
  const fmt = (iso) => iso.split("-").reverse().join(".");
  const monthLabel = (m) => MONTHS[+m.slice(5) - 1];
  const people = (n) => `${n} ${n % 10 === 1 && n % 100 !== 11 ? "человека" : "человек"}`;
  const ago = (back) => (back === 6 ? "полгода назад" : back === 12 ? "год назад" : `${back} мес. назад`);

  function card(h, title, cls) {
    const num = el("div", { class: "q-num" }, [`≈ ${mo(h.now_days)}`, el("span", {}, "мес.")]);
    const kids = [el("small", {}, title), num];
    if (h.then_days != null) {
      const diff = h.now_days - h.then_days;
      const [arrow, word, good] = diff > 30 ? ["↑", "ждут дольше", false] : diff < -30 ? ["↓", "ждут меньше", true] : ["→", "примерно так же", true];
      kids.push(
        el("p", { class: "q-trend" + (good ? " ok" : "") }, [
          `${ago(h.then_back_months)} было ≈ ${mo(h.then_days)} мес. — `,
          el("b", {}, `${word} ${arrow}`),
        ]),
      );
    }
    return el("div", { class: "q-card " + cls }, kids);
  }

  function chart(by) {
    const months = [...new Set(SERIES.flatMap((s) => by[s.key].filter((r) => r.n >= MIN_N).map((r) => r.month)))].sort();
    const W = 360, H = 230, top = 22, bottom = 34, left = 6, right = 6;
    const slot = (W - left - right) / months.length;
    const bw = Math.min(18, slot / 2 - 2);
    const max = Math.max(...SERIES.flatMap((s) => by[s.key].filter((r) => r.n >= MIN_N).map((r) => mo(r.median))));
    const y = (v) => H - bottom - ((H - top - bottom) * v) / max;
    const svg = el("svg", { viewBox: `0 0 ${W} ${H}`, role: "img", "aria-labelledby": "q-t q-d" }, [
      el("title", { id: "q-t" }, "Сколько месяцев ждали, по месяцу получения результата"),
      el("desc", { id: "q-d" }, "Столбики: чем выше, тем дольше ждали. Точные цифры в таблице под графиком."),
    ]);
    months.forEach((m, i) => {
      const cx = left + slot * (i + 0.5);
      SERIES.forEach((s, j) => {
        const row = by[s.key].find((r) => r.month === m && r.n >= MIN_N);
        if (!row) return;
        const v = mo(row.median);
        const x = cx + (j - 1) * bw + (j ? 1 : -1);
        svg.append(
          el("rect", { x, y: y(v), width: bw, height: H - bottom - y(v), fill: s.color }, [
            el("title", {}, `${s.label}, ${monthLabel(m)} ${m.slice(0, 4)}: ≈ ${v} мес. (${people(row.n)})`),
          ]),
          el("text", { class: "q-val", x: x + bw / 2, y: y(v) - 4 }, String(v)),
        );
      });
      svg.append(el("text", { class: "q-mon", x: cx, y: H - bottom + 15 }, monthLabel(m)));
      if (i === 0 || m.endsWith("-01")) svg.append(el("text", { class: "q-mon", x: cx, y: H - bottom + 28 }, m.slice(0, 4)));
    });
    svg.append(el("line", { class: "q-base-line", x1: left, x2: W - right, y1: H - bottom, y2: H - bottom }));
    return svg;
  }

  function table(by) {
    const months = [...new Set(SERIES.flatMap((s) => by[s.key].map((r) => r.month)))].sort();
    const cell = (s, m) => {
      const r = by[s.key].find((x) => x.month === m);
      return r ? `${mo(r.median)} мес. (${r.n})` : "—";
    };
    return el("div", { class: "q-tab" }, [
      el("table", {}, [
        el("thead", {}, el("tr", {}, [el("th", {}, "Месяц"), ...SERIES.map((s) => el("th", {}, s.label))])),
        el("tbody", {}, months.map((m) => el("tr", {}, [el("td", {}, `${monthLabel(m)} ${m.slice(0, 4)}`), ...SERIES.map((s) => el("td", {}, cell(s, m)))]))),
      ]),
    ]);
  }

  function render(d) {
    const st = d.stats, h = st.headline;
    const used = d.records.filter((r) => r.counted && r.counted.length).length;
    box.replaceChildren(
      el("p", { class: "q-base" }, [`По рассказам ${people(used)} из чата `, el("a", { href: "https://t.me/cyfasttrack" }, "@cyfasttrack"), `. Данные на ${fmt(d.meta.as_of)}, обновляются сами.`]),
      el("div", { class: "q-big" }, [
        card(h.days_to_interview, "Сейчас от подачи до собеседования", ""),
        card(h.days_to_approval, "Сейчас от подачи до письма об одобрении", "b"),
      ]),
      el("h3", { class: "q-cap" }, "Сколько месяцев ждали"),
      el("div", { class: "q-key" }, SERIES.map((s) => el("span", {}, [el("i", { style: `background:${s.color}` }), s.label]))),
      chart(st.by_event_month),
      el("p", { class: "q-caveat" }, "Это рассказы тех, кто написал в чат, а не официальная статистика. Не обещание сроков."),
      el("details", {}, [
        el("summary", {}, "Как считали"),
        el("ol", { class: "q-how" }, [
          el("li", {}, "Люди в чате @cyfasttrack пишут: «подал тогда-то, на собеседование позвали тогда-то, письмо пришло тогда-то». Мы собрали эти даты."),
          el("li", {}, "Для каждого посчитали, сколько месяцев прошло от подачи до собеседования и до письма."),
          el("li", {}, "Крупная цифра «сейчас» — у тех, кому позвонили или пришло письмо за последние 3 месяца. Рядом — сколько ждали раньше."),
          el("li", {}, "Столбик — один месяц: сколько обычно ждали те, кому ответили в этом месяце. Растёт столбик — ждут дольше."),
        ]),
        el("p", {}, "Это не официальные цифры, а рассказы людей. Свежие сроки на деле обычно чуть длиннее: кто ещё ждёт, тот в чат не пишет."),
      ]),
      el("details", {}, [el("summary", {}, "Таблица с цифрами (в скобках — сколько человек)"), table(st.by_event_month)]),
    );
  }

  fetch(dataUrl)
    .then((r) => (r.ok ? r.json() : Promise.reject(new Error(r.status))))
    .then(render)
    .catch(() => {
      box.textContent = "Не получилось загрузить данные. Обновите страницу позже.";
    });
})();
