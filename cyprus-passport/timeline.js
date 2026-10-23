(() => {
  const root = document.getElementById("queue");
  if (!root) return;
  const script = document.currentScript;
  const dataUrl = new URL("data/timeline.json", script ? script.src : location.href);

  const NS = "http://www.w3.org/2000/svg";
  const MONTHS = ["янв", "фев", "мар", "апр", "май", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"];
  const DAY = 86400000;
  const MD = 30.4;
  const METRICS = {
    days_to_interview: { label: "до собеседования", short: "собеседование", end: "interview" },
    days_to_approval: { label: "до письма об одобрении", short: "письмо", end: "approved" },
  };

  const css = `
    #queue .q-ctl{display:flex;flex-wrap:wrap;gap:.5rem;margin:1rem 0 .5rem}
    #queue .q-ctl button{font:inherit;color:var(--ink);background:transparent;border:1px solid var(--rule);padding:.3rem .8rem;border-radius:999px;cursor:pointer}
    #queue .q-ctl button[aria-pressed="true"]{background:var(--ink);color:var(--paper);border-color:var(--ink)}
    #queue .q-ctl button:focus-visible,#queue .q-chart circle:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
    #queue .q-sum{margin:.25rem 0;font-weight:600;color:var(--ink)}
    #queue .q-sum span{color:var(--accent)}
    #queue .q-chart{width:100%;margin:.5rem 0}
    #queue .q-chart svg{display:block;width:100%;height:auto;overflow:visible}
    #queue .q-grid{stroke:var(--rule);stroke-width:1}
    #queue .q-axis{fill:var(--muted);font:11px/1 ui-monospace,Menlo,monospace}
    #queue .q-dot{fill:var(--accent);fill-opacity:.55;stroke:var(--accent);stroke-width:1}
    #queue .q-dot.approx{fill-opacity:0}
    #queue .q-med{fill:none;stroke:var(--ink);stroke-width:2.5;stroke-linejoin:round;stroke-linecap:round}
    #queue .q-key{display:flex;flex-wrap:wrap;gap:.25rem 1.25rem;color:var(--muted);font-size:.85em;margin:.25rem 0}
    #queue .q-key i{display:inline-block;width:.7em;height:.7em;border-radius:50%;border:1px solid var(--accent);background:var(--accent);opacity:.7;margin-right:.35em;vertical-align:baseline}
    #queue .q-key i.h{background:transparent}
    #queue .q-key i.l{width:1.2em;height:0;border:0;border-top:2.5px solid var(--ink);border-radius:0;background:none;opacity:1;vertical-align:middle}
    #queue .q-tab{overflow-x:auto;margin-top:.5rem}
    #queue table{border-collapse:collapse;font-size:.85em;min-width:100%}
    #queue th,#queue td{padding:.25rem .6rem;border-bottom:1px solid var(--rule);text-align:right;white-space:nowrap;color:var(--ink)}
    #queue th:first-child,#queue td:first-child{text-align:left}
    #queue th{color:var(--muted);font-weight:500}
    #queue details summary{cursor:pointer;color:var(--muted)}
    #queue .q-note{color:var(--muted);font-size:.85em;margin:.5rem 0}
  `;
  const style = document.createElement("style");
  style.textContent = css;
  document.head.appendChild(style);

  const el = (tag, attrs = {}, kids = []) => {
    const n = tag in { svg: 1, g: 1, line: 1, text: 1, circle: 1, path: 1, title: 1, desc: 1 }
      ? document.createElementNS(NS, tag)
      : document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
    for (const k of [].concat(kids)) n.append(k);
    return n;
  };

  const ts = (iso) => Date.parse(iso + "T00:00:00Z");
  const fmt = (iso) => iso.split("-").reverse().join(".");
  const months = (days) => (days / MD).toFixed(1).replace(".", ",");
  const plural = (n) => (n % 10 === 1 && n % 100 !== 11 ? "запись" : [2, 3, 4].includes(n % 10) && ![12, 13, 14].includes(n % 100) ? "записи" : "записей");

  function rolling(points, minN) {
    if (points.length < minN) return [];
    const xs = points.map((p) => p.x);
    const lo = Math.min(...xs), hi = Math.max(...xs);
    const out = [];
    for (let x = lo; x <= hi; x += 7 * DAY) {
      const near = points.filter((p) => Math.abs(p.x - x) <= 45 * DAY).map((p) => p.y).sort((a, b) => a - b);
      if (near.length >= minN) {
        const m = near.length >> 1;
        out.push({ x, y: near.length % 2 ? near[m] : (near[m - 1] + near[m]) / 2 });
      } else if (out.length && out[out.length - 1] !== null) out.push(null);
    }
    return out;
  }

  function pointsFor(data, key) {
    return data.records
      .filter((r) => r.counted.includes(key))
      .map((r) => ({
        x: ts(r.submitted),
        y: r[key],
        approx: r.approx.includes("submitted") || r.approx.includes(METRICS[key].end),
        r,
      }));
  }

  function summary(data) {
    const box = el("div");
    for (const [key, m] of Object.entries(METRICS)) {
      const h = data.stats.headline[key];
      if (h.now_days == null) continue;
      const then = h.then_days == null ? "" : `, ${h.then_back_months === 12 ? "год" : h.then_back_months + " мес."} назад ${months(h.then_days)} мес.`;
      box.append(
        el("p", { class: "q-sum" }, [
          `Подача → ${m.short}: медиана сейчас `,
          el("span", {}, [`${months(h.now_days)} мес.`]),
          then,
          el("small", { style: "font-weight:400;color:var(--muted)" }, [` (n=${h.now_n}${h.then_n ? "/" + h.then_n : ""}, окно 90 дней)`]),
        ])
      );
    }
    return box;
  }

  function chart(data, key, width) {
    const pts = pointsFor(data, key);
    const W = Math.max(width, 280);
    const H = W < 520 ? 300 : 400;
    const m = { t: 22, r: 12, b: 34, l: W < 520 ? 34 : 44 };
    const svg = el("svg", { viewBox: `0 0 ${W} ${H}`, width: W, height: H, role: "img", "aria-labelledby": "q-t q-d" });
    const metric = METRICS[key];
    svg.append(
      el("title", { id: "q-t" }, [`Подача → ${metric.short}: точки по людям и скользящая медиана`]),
      el("desc", { id: "q-d" }, [
        `Каждая точка — один человек из чата: по горизонтали дата подачи, по вертикали месяцев ожидания. Точек ${pts.length}. Полная таблица ниже.`,
      ])
    );
    if (!pts.length) return svg;

    const xmin = Math.min(...pts.map((p) => p.x)), xmax = Math.max(...pts.map((p) => p.x));
    const ymax = Math.ceil(Math.max(...pts.map((p) => p.y)) / MD / 2) * 2;
    const sx = (x) => m.l + ((x - xmin) / Math.max(xmax - xmin, DAY)) * (W - m.l - m.r);
    const sy = (d) => H - m.b - (d / MD / ymax) * (H - m.t - m.b);

    for (let mo = 0; mo <= ymax; mo += 2) {
      const y = sy(mo * MD);
      svg.append(el("line", { class: "q-grid", x1: m.l, x2: W - m.r, y1: y, y2: y }), el("text", { class: "q-axis", x: m.l - 6, y: y + 4, "text-anchor": "end" }, [String(mo)]));
    }
    svg.append(el("text", { class: "q-axis", x: 2, y: 10 }, ["мес."]));

    const d0 = new Date(xmin);
    const step = W < 520 ? 3 : 2;
    let t = Date.UTC(d0.getUTCFullYear(), d0.getUTCMonth() + 1, 1);
    for (let i = 0; t <= xmax; i++) {
      const d = new Date(t);
      if (d.getUTCMonth() % step === 0) {
        const x = sx(t);
        svg.append(el("line", { class: "q-grid", x1: x, x2: x, y1: H - m.b, y2: H - m.b + 4 }), el("text", { class: "q-axis", x, y: H - m.b + 17, "text-anchor": "middle" }, [`${MONTHS[d.getUTCMonth()]} ${String(d.getUTCFullYear()).slice(2)}`]));
      }
      t = Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1);
    }

    const med = rolling(pts, 4);
    let path = "", pen = false;
    for (const p of med) {
      if (p === null) { pen = false; continue; }
      path += `${pen ? "L" : "M"}${sx(p.x).toFixed(1)} ${sy(p.y).toFixed(1)}`;
      pen = true;
    }
    for (const p of pts) {
      const r = p.r;
      const c = el("circle", { class: "q-dot" + (p.approx ? " approx" : ""), cx: sx(p.x).toFixed(1), cy: sy(p.y).toFixed(1), r: 3.5, tabindex: 0 });
      c.append(el("title", {}, [`Подача ${fmt(r.submitted)} → ${metric.short} ${fmt(r[metric.end] || r.letter_received)}, ${p.y} дн. (${months(p.y)} мес.)${p.approx ? ", даты приблизительные" : ""}`]));
      svg.append(c);
    }
    if (path) svg.append(el("path", { class: "q-med", d: path }));
    return svg;
  }

  function table(data) {
    const rows = {};
    for (const [key, list] of [["i", data.stats.by_submission_month.interview], ["a", data.stats.by_submission_month.approval]])
      for (const c of list) (rows[c.month] ||= {})[key] = c;
    const body = el("tbody");
    for (const k of Object.keys(rows).sort()) {
      const [y, mo] = k.split("-");
      const cell = (c) => (c ? `${months(c.median)} мес. (${c.n})` : "—");
      body.append(el("tr", {}, [el("td", {}, [`${MONTHS[+mo - 1]} ${y}`]), el("td", {}, [cell(rows[k].i)]), el("td", {}, [cell(rows[k].a)])]));
    }
    return el("div", { class: "q-tab" }, [
      el("table", {}, [
        el("caption", { class: "sr-only", style: "position:absolute;left:-9999px" }, ["Медиана ожидания по месяцу подачи"]),
        el("thead", {}, [el("tr", {}, [el("th", { scope: "col" }, ["Месяц подачи"]), el("th", { scope: "col" }, ["до собеседования"]), el("th", { scope: "col" }, ["до письма"])])]),
        body,
      ]),
    ]);
  }

  function render(data) {
    let key = "days_to_interview";
    const host = root.querySelector(".queue-chart") || root.appendChild(el("div", { class: "queue-chart" }));
    host.textContent = "";
    const ctl = el("div", { class: "q-ctl", role: "group", "aria-label": "Что показывать" });
    const area = el("div", { class: "q-chart" });
    const draw = () => {
      area.textContent = "";
      area.append(chart(data, key, area.clientWidth || host.clientWidth || 640));
      for (const b of ctl.children) b.setAttribute("aria-pressed", String(b.dataset.key === key));
    };
    for (const [k, mt] of Object.entries(METRICS)) {
      const b = el("button", { type: "button", "data-key": k }, [`Подача → ${mt.short}`]);
      b.addEventListener("click", () => { key = k; draw(); });
      ctl.append(b);
    }
    const n = data.meta.records;
    host.append(
      summary(data),
      ctl,
      area,
      el("div", { class: "q-key" }, [
        el("span", {}, [el("i"), "человек, полные даты"]),
        el("span", {}, [el("i", { class: "h" }), "даты приблизительные (месяц)"]),
        el("span", {}, [el("i", { class: "l" }), "скользящая медиана по дате подачи (±45 дн., от 4 человек)"]),
      ]),
      el("p", { class: "q-note" }, [`Данные на ${fmt(data.meta.as_of)}: ${n} ${plural(n)} из чата, в расчёты идут записи с достаточной уверенностью.`]),
      el("details", {}, [el("summary", {}, ["Таблица по месяцам подачи"]), table(data)])
    );
    draw();
    let last = area.clientWidth;
    new ResizeObserver(() => {
      if (Math.abs(area.clientWidth - last) > 8) { last = area.clientWidth; draw(); }
    }).observe(area);
  }

  fetch(dataUrl)
    .then((r) => (r.ok ? r.json() : Promise.reject(new Error(r.status))))
    .then(render)
    .catch(() => {
      (root.querySelector(".queue-chart") || root).textContent = "Данные пока недоступны.";
    });
})();
