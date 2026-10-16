/* The Cormoran — Dossier Nº 2 chart engine (vanilla JS + SVG) */
(function () {
  "use strict";
  const D = window.DOSSIER;
  const SVGNS = "http://www.w3.org/2000/svg";

  const CITY_COLOR = {
    vienna: "#302B72", helsinki: "#5C8868", paris: "#6679CE",
    berlin: "#C3699E", london: "#491F14", rome: "#C53A19"
  };
  /* brick sequential ramp (map + neutral marks) */
  const SEQ = ["#F2E797", "#E9B06E", "#DA7946", "#C53A19", "#852D19", "#491F14"];
  const INK = "#201B12", INK2 = "#6B5F49", INK3 = "#93866C", LINE = "#D4C9B1", CREAM = "#F1EDE2";

  const fmtN = n => n.toLocaleString("en-GB");
  const svgEl = (tag, attrs) => {
    const e = document.createElementNS(SVGNS, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    return e;
  };
  const txt = (parent, x, y, str, attrs) => {
    const t = svgEl("text", Object.assign({ x, y, fill: INK2, "font-size": 12 }, attrs || {}));
    t.textContent = str;
    parent.appendChild(t);
    return t;
  };

  /* ---------- tooltip ---------- */
  function makeTip(container) {
    const tip = document.createElement("div");
    tip.className = "tip";
    container.appendChild(tip);
    function place(html, px, py) {
      tip.innerHTML = html;
      tip.style.opacity = 1;
      const cw = container.clientWidth;
      const tw = tip.offsetWidth, th = tip.offsetHeight;
      let x = px + 14, y = py - th - 10;
      if (x + tw > cw - 4) x = px - tw - 14;
      if (x < 4) x = 4;
      if (y < 4) y = py + 16;
      tip.style.left = x + "px";
      tip.style.top = y + "px";
    }
    return {
      show(html, px, py) { place(html, px, py); },
      hide() { tip.style.opacity = 0; }
    };
  }

  /* ============================================================
     INTRO RAIL — small multiples: the social share, then → now,
     one shared 0–60% scale so every slope is comparable
     ============================================================ */
  (function introRail() {
    const host = document.getElementById("rail-grid");
    if (!host) return;
    const MINV = 0, MAXV = 60;
    const W = 300, H = 46, P = 4;
    const Y = v => H - P - (H - P * 2) * ((v - MINV) / (MAXV - MINV));

    const keys = Object.keys(D.cities).sort((a, b) => D.cities[b].shareNow - D.cities[a].shareNow);

    for (const key of keys) {
      const c = D.cities[key];
      const s = c.sharePath;
      const color = CITY_COLOR[key];
      const delta = Math.round((c.shareNow - c.shareThen) * 10) / 10;
      /* x follows the calendar, not the index: the points are the years the
         source reports, and they are unevenly spaced */
      const ya = s.years[0], yb = s.years[s.years.length - 1];
      const X = i => P + (W - P * 2) * ((s.years[i] - ya) / (yb - ya));
      const est = new Set(s.est || []);

      const card = document.createElement("a");
      card.className = "sm";
      card.href = "#" + key;
      card.style.setProperty("--city", color);
      card.innerHTML =
        `<span class="sm-head"><span class="sm-name">${c.label}</span>` +
        /* a city whose share never moved reads better as "flat" than as "+0pp" */
        `<span class="sm-delta">${delta ? (delta > 0 ? "+" : "−") + Math.abs(delta) + "pp" : "flat"}</span></span>` +
        `<span class="sm-spark"></span>` +
        `<span class="sm-foot">${delta
          ? `${c.shareNow}% in ${c.nowYear} · ${c.shareThen}% in ${c.thenYear}`
          : `${c.shareNow}% in ${c.nowYear} · unmoved since ${c.thenYear}`}</span>`;

      const svg = svgEl("svg", { viewBox: `0 0 ${W} ${H}`, preserveAspectRatio: "none",
        role: "img", "aria-label": `${c.label}: social housing is ${c.shareNow}% of homes in ${c.nowYear}, ${c.shareThen}% in ${c.thenYear}` });
      const d = s.vals.map((v, i) => (i ? "L" : "M") + X(i).toFixed(1) + " " + Y(v).toFixed(1)).join("");
      svg.appendChild(svgEl("path", {
        d: d + `L${(W - P).toFixed(1)} ${H - P}L${P} ${H - P}Z`,
        fill: color, "fill-opacity": 0.08, stroke: "none"
      }));
      svg.appendChild(svgEl("path", {
        d, fill: "none", stroke: color, "stroke-width": 2,
        "stroke-linejoin": "round", "stroke-linecap": "round",
        "vector-effect": "non-scaling-stroke"
      }));
      card.querySelector(".sm-spark").appendChild(svg);
      /* one dot per published measure, hollow where the point is an estimate;
         drawn in HTML over the stretched SVG so the dots stay round */
      const spark = card.querySelector(".sm-spark");
      spark.style.position = "relative";
      s.vals.forEach((v, i) => {
        const dot = document.createElement("span");
        const last = i === s.vals.length - 1;
        const r = last ? 3.2 : 2.3;
        dot.style.cssText = `position:absolute;left:${(X(i) / W * 100).toFixed(2)}%;top:${(Y(v) / H * 100).toFixed(2)}%;` +
          `width:${2 * r}px;height:${2 * r}px;margin:-${r}px 0 0 -${r}px;border-radius:50%;box-sizing:border-box;` +
          (est.has(i) ? `background:${CREAM};border:1.4px solid ${color};` : `background:${color};border:1.2px solid ${CREAM};`);
        dot.title = `${s.years[i]}: ${v}%${est.has(i) ? " (estimate)" : ""}`;
        spark.appendChild(dot);
      });
      host.appendChild(card);
    }
  })();

  /* ============================================================
     EUROPE MAP — social rental housing, % of stock, by country
     ============================================================ */
  (function europeMap() {
    const host = document.getElementById("europe-map");
    if (!host) return;
    const LON0 = -12.5, LON1 = 34, LAT0 = 34, LAT1 = 62.5;
    const KX = Math.cos(48 * Math.PI / 180);
    const S = 22;
    const W = (LON1 - LON0) * KX * S, H = (LAT1 - LAT0) * S * 0.92;
    const px = lon => (lon - LON0) * KX * S;
    const py = lat => (LAT1 - lat) * S * 0.92;

    const svg = svgEl("svg", { viewBox: `0 0 ${W.toFixed(0)} ${H.toFixed(0)}`, role: "img",
      "aria-label": "Map of Europe showing social rental housing as a share of each country's homes" });

    const gLand = svgEl("g", { fill: "#E5DDC8", stroke: "#CFC3A8", "stroke-width": 0.9, "stroke-linejoin": "round" });
    for (const f of D.europe) {
      for (const poly of f.p) {
        let d = "";
        for (const ring of poly) {
          d += "M" + ring.map(pt => px(pt[0]).toFixed(1) + " " + py(pt[1]).toFixed(1)).join("L") + "Z";
        }
        gLand.appendChild(svgEl("path", { d }));
      }
    }
    svg.appendChild(gLand);

    const countries = D.mapCountries.filter(c => c.share !== null && !c.offMap)
      .sort((a, b) => b.share - a.share);
    const special = D.mapCountries.filter(c => c.share === null);
    const offMap = D.mapCountries.filter(c => c.offMap);
    const maxP = Math.max(...countries.map(c => c.share));
    const rOf = v => 3 + 22 * Math.sqrt(v / maxP);

    const tip = makeTip(host);
    const gDots = svgEl("g", {});
    const gHit = svgEl("g", { fill: "transparent" });
    for (const c of countries) {
      const x = px(c.lon), y = py(c.lat), r = rOf(c.share);
      const dot = svgEl("circle", { cx: x, cy: y, r: Math.max(r, 1.6),
        fill: SEQ[4], "fill-opacity": 0.09,
        stroke: SEQ[4], "stroke-width": 1.4, "stroke-opacity": 0.85 });
      const ttl = document.createElementNS(SVGNS, "title");
      ttl.textContent = `${c.nameOverride || c.name} — social rental housing is ${c.share}% of the stock`;
      dot.appendChild(ttl);
      const rows =
        `<div class="trow"><span>share of the stock</span><span class="v">${c.share}%</span></div>` +
        (c.note ? `<div class="trow"><span style="max-width:220px">${c.note}</span></div>` : "");
      const target = svgEl("circle", { cx: x, cy: y, r: Math.max(r, 2.2) + 5 });
      target.addEventListener("mousemove", ev => {
        const bb = host.getBoundingClientRect();
        tip.show(`<b>${c.nameOverride || c.name}</b>${rows}`, ev.clientX - bb.left, ev.clientY - bb.top);
      });
      target.addEventListener("mouseleave", () => tip.hide());
      gDots.appendChild(dot);
      gDots.appendChild(svgEl("circle", { cx: x, cy: y, r: 1.5, fill: SEQ[4] }));
      gHit.appendChild(target);
    }
    /* Sweden: shown, but hollow-dashed — outside the definition */
    for (const c of special) {
      const x = px(c.lon), y = py(c.lat);
      const dot = svgEl("circle", { cx: x, cy: y, r: 9, fill: "none",
        stroke: INK3, "stroke-width": 1.2, "stroke-dasharray": "3 3" });
      gDots.appendChild(dot);
      const target = svgEl("circle", { cx: x, cy: y, r: 14 });
      target.addEventListener("mousemove", ev => {
        const bb = host.getBoundingClientRect();
        tip.show(`<b>${c.name}</b><div class="trow"><span style="max-width:230px">${c.note}</span></div>`,
          ev.clientX - bb.left, ev.clientY - bb.top);
      });
      target.addEventListener("mouseleave", () => tip.hide());
      gHit.appendChild(target);
    }
    svg.appendChild(gDots);

    /* labels: eight candidate slots, first that clears wins (from Dossier Nº 1) */
    const CW = 0.545;
    const all = countries.concat(special);
    const marks = all.map(c => {
      const r = c.share === null ? 9 : Math.max(rOf(c.share), 2.2);
      return { x: px(c.lon) - r, y: py(c.lat) - r, w: 2 * r, h: 2 * r };
    });
    const hits = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
    const overlap = (a, b) => Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)) *
                              Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));
    const gAll = svgEl("g", {});
    svg.appendChild(gAll);
    svg.appendChild(gHit);

    const layout = () => {
      const scale = (host.clientWidth || W) / W;
      const tight = scale < 1;
      const floor = 11.5 / scale;
      const pinned = new Set(all.filter(c => c.focus).map(c => c.key));
      for (const c of countries.slice(0, 3)) pinned.add(c.key);
      const queue = tight
        ? [...all].sort((a, b) =>
            (pinned.has(b.key) ? 1 : 0) - (pinned.has(a.key) ? 1 : 0) || (b.share || 0) - (a.share || 0))
        : all;
      while (gAll.firstChild) gAll.removeChild(gAll.firstChild);
      const taken = [];
      for (const c of queue) {
        const name = c.nameOverride || c.name;
        const fs = Math.max(c.focus ? 12.5 : 11.2, floor);
        const val = c.share === null ? "✳" : String(c.share) + "%";
        const w = (name.length + val.length + 1.2) * CW * fs, h = fs * 1.05;
        const r = c.share === null ? 9 : Math.max(rOf(c.share), 2.2), gap = r + 3.5;
        const ring = k => [[gap * k, fs * 0.36, "start"], [-gap * k, fs * 0.36, "end"],
                          [0, -(r + 4) * k, "middle"], [0, (r + 2) * k + fs, "middle"],
                          [gap * 0.75 * k, -(r + 3) * k, "start"], [-gap * 0.75 * k, -(r + 3) * k, "end"],
                          [gap * 0.75 * k, (r + 1) * k + fs, "start"], [-gap * 0.75 * k, (r + 1) * k + fs, "end"]];
        const slots = ring(1).concat(ring(1.9));
        let put = null;
        for (const [dx, dy, anchor] of slots) {
          const x = px(c.lon) + dx, y = py(c.lat) + dy;
          const left = anchor === "start" ? x : anchor === "end" ? x - w : x - w / 2;
          const box = { x: left - 1.5, y: y - h + 1, w: w + 3, h: h + 2 };
          if (box.x < 2 || box.x + box.w > W - 2 || box.y < 2 || box.y + box.h > H - 2) continue;
          if (taken.some(t => hits(box, t)) || marks.some(m => hits(box, m))) continue;
          put = { x, y, anchor, box };
          break;
        }
        if (!put) {
          if (tight && !pinned.has(c.key)) continue;
          for (const [dx, dy, anchor] of slots) {
            const x = px(c.lon) + dx, y = py(c.lat) + dy;
            const left = anchor === "start" ? x : anchor === "end" ? x - w : x - w / 2;
            const box = { x: left - 1.5, y: y - h + 1, w: w + 3, h: h + 2 };
            if (box.x < 2 || box.x + box.w > W - 2 || box.y < 2 || box.y + box.h > H - 2) continue;
            let cost = 0;
            for (const t of taken) cost += overlap(box, t);
            for (const m of marks) cost += overlap(box, m) * 2;
            if (!put || cost < put.cost) put = { x, y, anchor, box, cost };
          }
          if (!put) {
            const x = px(c.lon) + gap, y = py(c.lat) + fs * 0.36;
            put = { x, y, anchor: "start", box: { x: x - 1.5, y: y - h + 1, w: w + 3, h: h + 2 } };
          }
        }
        taken.push(put.box);
        const t = svgEl("text", { x: put.x.toFixed(1), y: put.y.toFixed(1), "text-anchor": put.anchor,
          "font-size": fs, "font-weight": c.focus ? 600 : 500, fill: c.focus ? INK : INK2,
          "paint-order": "stroke", stroke: CREAM, "stroke-width": 3, "stroke-linejoin": "round" });
        const nm = svgEl("tspan", {}); nm.textContent = name; t.appendChild(nm);
        const vl = svgEl("tspan", { fill: SEQ[4], "font-weight": 600, dx: "3.2" });
        vl.textContent = val; t.appendChild(vl);
        gAll.appendChild(t);
      }
    };
    layout();
    let pending;
    window.addEventListener("resize", () => {
      clearTimeout(pending);
      pending = setTimeout(layout, 180);
    });

    host.appendChild(svg);

    const leg = document.getElementById("europe-legend");
    if (leg) leg.innerHTML =
      `<span class="li"><span class="swatch ring" style="border-color:${SEQ[4]}"></span>` +
      `the figure beside each country is social rental housing as % of all homes</span>` +
      `<span class="li" style="color:${INK3}">circle area ∝ share · ✳ Sweden sits outside the definition — see the note</span>`;

    const tbody = document.querySelector("#europe-table tbody");
    if (tbody) tbody.innerHTML = countries.concat(offMap).sort((a, b) => b.share - a.share).concat(special).map(c =>
      `<tr><td>${c.nameOverride || c.name}</td><td>${c.share === null ? "—" : c.share + "%"}</td><td>${c.year || "—"}</td><td>${c.note || ""}</td></tr>`).join("");
  })();

  /* ============================================================
     CITY CHARTS — one signature figure per chapter
     ============================================================ */
  function lineChart(key) {
    const cfg = D.citySeries[key];
    const host = document.getElementById("chart-" + key);
    if (!host || cfg.type !== "line") return;
    const color = CITY_COLOR[key];
    const years = cfg.years, vals = cfg.vals;
    /* narrow frame: the chart sits in one column of the city grid, beside the
       map, so the viewBox is close to its rendered width and the type in it
       stays near its nominal size */
    const W = 560, H = 360, M = { t: 26, r: 60, b: 30, l: 46 };
    const minV = cfg.minV, maxV = cfg.maxV;
    const y0 = years[0], y1 = years[years.length - 1];
    const X = yr => M.l + (W - M.l - M.r) * ((yr - y0) / (y1 - y0));
    const Y = v => M.t + (H - M.t - M.b) * (1 - (v - minV) / (maxV - minV));

    const svg = svgEl("svg", { viewBox: `0 0 ${W} ${H}`, role: "img",
      "aria-label": `${cfg.title} — ${D.cities[key].label}` });

    for (const v of cfg.gridSteps) {
      svg.appendChild(svgEl("line", { x1: M.l, x2: W - M.r, y1: Y(v), y2: Y(v), stroke: LINE, "stroke-width": 1 }));
      txt(svg, M.l - 6, Y(v) + 4, String(v), { "text-anchor": "end", fill: INK3, "font-size": 11 });
    }
    if (cfg.target) {
      svg.appendChild(svgEl("line", { x1: M.l, x2: W - M.r, y1: Y(cfg.target.v), y2: Y(cfg.target.v),
        stroke: INK3, "stroke-width": 1.2, "stroke-dasharray": "5 4" }));
      txt(svg, W - M.r, Y(cfg.target.v) - 6, cfg.target.label,
        { "text-anchor": "end", fill: INK2, "font-size": 11.5, "font-weight": 600 });
    }
    /* first year, last year, and whichever decades fall between them with room
       to be read: in a column this narrow a tick every ten years can collide */
    const GAPX = 34;
    const xticks = [y0];
    for (const y of years) {
      if (y % 10 !== 0 || y === y0 || y === y1) continue;
      if (X(y) - X(xticks[xticks.length - 1]) < GAPX || X(y1) - X(y) < GAPX) continue;
      xticks.push(y);
    }
    xticks.push(y1);
    for (const yr of xticks) {
      txt(svg, X(yr), H - 8, String(yr),
        { "text-anchor": yr === y0 ? "start" : yr === y1 ? "end" : "middle", fill: INK3, "font-size": 11 });
    }

    const d = years.map((yr, i) => (i ? "L" : "M") + X(yr).toFixed(1) + " " + Y(vals[i]).toFixed(1)).join("");
    svg.appendChild(svgEl("path", { d: d + `L${X(y1).toFixed(1)} ${Y(minV)}L${X(y0).toFixed(1)} ${Y(minV)}Z`,
      fill: color, "fill-opacity": 0.06, stroke: "none" }));
    svg.appendChild(svgEl("path", { d, fill: "none", stroke: color, "stroke-width": 2.6,
      "stroke-linejoin": "round", "stroke-linecap": "round" }));
    /* every point on these charts is a published figure: mark each one,
       except on long annual series where the dots would merge into the line */
    if (years.length <= 20) {
      years.forEach((yr, i) => svg.appendChild(svgEl("circle",
        { cx: X(yr), cy: Y(vals[i]), r: 2.6, fill: color, stroke: CREAM, "stroke-width": 1.2 })));
    }
    const last = vals[vals.length - 1];
    svg.appendChild(svgEl("circle", { cx: X(y1), cy: Y(last), r: 4, fill: color, stroke: CREAM, "stroke-width": 2 }));
    txt(svg, W - M.r + 8, Y(last) + 4, String(last), { fill: color, "font-weight": 700, "font-size": 14 });

    if (cfg.marks) {
      for (const m of cfg.marks) {
        const i = years.indexOf(m.year);
        if (i < 0) continue;
        const x = X(m.year), y = Y(vals[i]);
        svg.appendChild(svgEl("circle", { cx: x, cy: y, r: 3.6, fill: INK, stroke: CREAM, "stroke-width": 1.6 }));
        /* a centred label would run off the plot at either end — and on the
           right it would land on the last value; tuck it in against the dot */
        const half = m.label.length * 3.15;
        const anchor = x + half > W - M.r ? "end" : x - half < 2 ? "start" : "middle";
        txt(svg, anchor === "end" ? x - 8 : anchor === "start" ? x + 8 : x,
          anchor === "middle" ? y - 10 : y - 6, m.label,
          { "text-anchor": anchor, fill: INK, "font-size": 11.5, "font-weight": 600,
            "paint-order": "stroke", stroke: CREAM, "stroke-width": 3 });
      }
    }

    /* hover */
    const hoverDot = svgEl("circle", { r: 4.5, fill: color, stroke: CREAM, "stroke-width": 2, opacity: 0 });
    const hoverLine = svgEl("line", { y1: M.t, y2: H - M.b, stroke: INK3, "stroke-width": 1, opacity: 0 });
    svg.appendChild(hoverLine); svg.appendChild(hoverDot);
    const tip = makeTip(host);
    const overlay = svgEl("rect", { x: M.l, y: M.t, width: W - M.l - M.r, height: H - M.t - M.b, fill: "transparent" });
    overlay.addEventListener("mousemove", ev => {
      const bb = host.querySelector("svg").getBoundingClientRect();
      const sx = (ev.clientX - bb.left) / bb.width * W;
      let best = 0, bd = Infinity;
      years.forEach((yr, i) => { const dd = Math.abs(X(yr) - sx); if (dd < bd) { bd = dd; best = i; } });
      const i = best;
      hoverLine.setAttribute("x1", X(years[i])); hoverLine.setAttribute("x2", X(years[i])); hoverLine.setAttribute("opacity", 0.5);
      hoverDot.setAttribute("cx", X(years[i])); hoverDot.setAttribute("cy", Y(vals[i])); hoverDot.setAttribute("opacity", 1);
      tip.show(`<b>${years[i]}</b><div class="trow"><span>${cfg.unit}</span><span class="v">${vals[i]}</span></div>`,
        X(years[i]) / W * bb.width, Y(vals[i]) / H * bb.height);
    });
    overlay.addEventListener("mouseleave", () => { tip.hide(); hoverDot.setAttribute("opacity", 0); hoverLine.setAttribute("opacity", 0); });
    svg.appendChild(overlay);
    host.appendChild(svg);
  }

  function barsChart(key) {
    const cfg = D.citySeries[key];
    const host = document.getElementById("chart-" + key);
    if (!host || cfg.type !== "bars") return;
    const color = CITY_COLOR[key];
    const n = cfg.bars.length;
    const W = 560, RH = 46, M = { t: 12, r: 90, b: 8, l: 10 };
    const H = M.t + n * RH + M.b;
    const maxV = Math.max(...cfg.bars.map(b => b[1]));
    const BX = v => (W - M.l - M.r - 210) * (v / maxV);
    const isPct = cfg.unit.indexOf("%") >= 0;

    const svg = svgEl("svg", { viewBox: `0 0 ${W} ${H}`, role: "img", "aria-label": cfg.title });
    cfg.bars.forEach((b, i) => {
      const [label, v, hi] = b;
      const y = M.t + i * RH;
      txt(svg, M.l, y + 20, label, { fill: hi ? INK : INK2, "font-size": 14, "font-weight": hi ? 600 : 400 });
      svg.appendChild(svgEl("rect", { x: M.l + 210, y: y + 8, width: Math.max(BX(v), 2), height: RH - 22,
        rx: 2, fill: hi ? color : LINE, "fill-opacity": hi ? 0.9 : 1 }));
      txt(svg, M.l + 214 + Math.max(BX(v), 2), y + 24, isPct ? v + "%" : fmtN(v),
        { fill: hi ? color : INK2, "font-size": 14, "font-weight": 700 });
    });
    host.appendChild(svg);
  }

  for (const key in D.citySeries) { lineChart(key); barsChart(key); }

  /* ============================================================
     MEGA DIDA — fill stat numbers
     ============================================================ */
  for (const key in D.cities) {
    const c = D.cities[key];
    c.stats.forEach((s, i) => {
      const e = document.getElementById(`st-${i + 1}-${key}`);
      if (e) {
        e.querySelector(".n").innerHTML = s[0];
        e.querySelector(".l").innerHTML = s[1];
      }
    });
  }

  /* ============================================================
     VERDICT — slope chart, then → now
     ============================================================ */
  (function slope() {
    const host = document.getElementById("slope-chart");
    if (!host) return;
    const W = 960, H = 480, M = { t: 40, r: 250, b: 40, l: 150 };
    const maxV = 58;
    const Y = v => M.t + (H - M.t - M.b) * (1 - v / maxV);
    const X0 = M.l, X1 = W - M.r;

    const svg = svgEl("svg", { viewBox: `0 0 ${W} ${H}`, role: "img",
      "aria-label": "Slope chart: social housing share of each city's homes, earliest published measure versus latest, six cities and Amsterdam" });

    for (const v of [0, 10, 20, 30, 40, 50]) {
      svg.appendChild(svgEl("line", { x1: X0, x2: X1, y1: Y(v), y2: Y(v), stroke: LINE, "stroke-width": 1 }));
    }
    svg.appendChild(svgEl("line", { x1: X0, y1: M.t - 14, x2: X0, y2: H - M.b, stroke: INK3, "stroke-width": 1 }));
    svg.appendChild(svgEl("line", { x1: X1, y1: M.t - 14, x2: X1, y2: H - M.b, stroke: INK3, "stroke-width": 1 }));
    txt(svg, X0, M.t - 22, "THEN", { "text-anchor": "middle", fill: INK2, "font-size": 12, "font-weight": 600, "letter-spacing": "1.5" });
    txt(svg, X1, M.t - 22, "LATEST", { "text-anchor": "middle", fill: INK2, "font-size": 12, "font-weight": 600, "letter-spacing": "1.5" });

    /* stagger left labels when values collide */
    const sorted = [...D.slope].sort((a, b) => b.then - a.then);
    let lastLY = -99;
    const rights = [];
    for (const s of sorted) {
      const label = s.label || D.cities[s.key].label;
      const color = s.color || CITY_COLOR[s.key];
      const yT = Y(s.then), yN = Y(s.now);
      svg.appendChild(svgEl("line", { x1: X0, y1: yT, x2: X1, y2: yN,
        stroke: color, "stroke-width": s.muted ? 1.8 : 2.4, "stroke-linecap": "round",
        "stroke-opacity": s.muted ? 0.55 : 0.85,
        "stroke-dasharray": s.muted ? "6 5" : "none" }));
      svg.appendChild(svgEl("circle", { cx: X0, cy: yT, r: s.muted ? 3.5 : 4.5, fill: color, stroke: CREAM, "stroke-width": 1.6 }));
      svg.appendChild(svgEl("circle", { cx: X1, cy: yN, r: s.muted ? 3.5 : 4.5, fill: color, stroke: CREAM, "stroke-width": 1.6 }));
      let ly = Math.max(yT + 4, lastLY + 15);
      lastLY = ly;
      txt(svg, X0 - 10, ly, `${s.then}%  ·  ${label} ${s.thenYear}`,
        { "text-anchor": "end", fill: INK2, "font-size": 12.5 });
      rights.push({ s, label, color, yN });
    }
    /* right labels, staggered from the top */
    rights.sort((a, b) => a.yN - b.yN);
    let lastRY = -99;
    for (const r of rights) {
      const ly = Math.max(r.yN + 4, lastRY + 16);
      lastRY = ly;
      const delta = Math.round((r.s.now - r.s.then) * 10) / 10;
      const t = svgEl("text", { x: X1 + 10, y: ly, fill: r.color, "font-size": 13.5, "font-weight": r.s.muted ? 400 : 600 });
      const a = svgEl("tspan", {}); a.textContent = `${r.s.now}% ${r.label} ${r.s.nowYear}`;
      const bTs = svgEl("tspan", { fill: INK3, "font-weight": 400, dx: "6" });
      bTs.textContent = `${delta >= 0 ? "+" : "−"}${Math.abs(delta)}pp`;
      t.appendChild(a); t.appendChild(bTs);
      svg.appendChild(t);
    }
    host.appendChild(svg);
  })();

  /* ============================================================
     CITY CLUSTER MAPS — one dot per social estate, area ∝ homes.
     Every map is drawn into the same frame and fitted to the city's own
     administrative outline, so extents differ: the 5 km bar is what makes
     them comparable. Dot sizes share one scale across all six cities.
     The frame turns taller on narrow screens — the same shape for all six,
     so the comparison survives. Each map also carries a banded heatmap of the
     same records, one switch away. Payload in data/city-maps.js is
     delta-encoded; the decoders are below.
     ============================================================ */
  (function cityMaps() {
    const M = window.CITYMAP;
    if (!M) return;
    const FW = 1000, PAD = 4;
    const KM_DEG = 111.32;                 /* km per degree of latitude */
    /* The frame turns taller as its box narrows — a column of the city grid,
       then a phone — measured from the host so it follows the CSS rather than
       repeating its breakpoints. All six share whichever frame is in force. */
    const frameH = w => (w < 430 ? 880 : w < 720 ? 700 : 560);
    const rOf = n => 0.315 * Math.sqrt(n);

    /* delta-encoded flat int array -> array of [x, y] in 1e-5° units */
    function decRing(a) {
      const out = []; let x = 0, y = 0;
      for (let i = 0; i < a.length; i += 2) { x += a[i]; y += a[i + 1]; out.push([x, y]); }
      return out;
    }

    /* The heatmap behind every map, one switch away (Dossier Nº 1's approach):
       the same records as the circles, spread by a Gaussian of HEAT_BW km and
       sorted into six bands of homes per km². Unlike Nº 1 the bands are
       absolute — one set of breaks for every city — because the circles here
       already share one size scale. The switch above each map flips all six. */
    const CITY_MAP_DEFAULT = "dots";       /* "dots" or "heat": the view the maps open on */
    const HEAT_BW = 0.5;                   /* smoothing radius, km (the Gaussian's σ) */
    const HEAT_SS = 2;                     /* raster pixels per frame unit */
    const HEAT_ALPHA = 0.78;               /* heat opacity: the land shows through */
    /* the traditional heat ramp, ColorBrewer YlOrRd in six classes */
    const HEAT = ["#FFFFB2", "#FED976", "#FEB24C", "#FD8D3C", "#F03B20", "#BD0026"];
    const HEAT_RGB = HEAT.map(h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)));
    const HEAT_BREAKS = [100, 250, 500, 1000, 2000, 4000];        /* homes per km² */
    /* Berlin counts no homes, so its heat is ground cover: the share of the
       land under municipal-company parcels, on breaks of its own */
    const COVER_BREAKS = [0.02, 0.05, 0.08, 0.12, 0.16, 0.2];
    /* registers that give one count per area rather than per building: the
       count is spread evenly over its area before it is smoothed, so the map
       shows density by area rather than inventing estates inside it */
    const AREAL = { helsinki: "district", rome: "zona urbanistica" };
    const mapViews = [];
    const setCityMapView = v => mapViews.forEach(m => m.set(v));

    /* three box blurs approximate a Gaussian (Kovesi): the box radii for σ */
    function boxes(sigma, n) {
      const wIdeal = Math.sqrt(12 * sigma * sigma / n + 1);
      let wl = Math.floor(wIdeal); if (wl % 2 === 0) wl--;
      const m = Math.round((12 * sigma * sigma - n * wl * wl - 4 * n * wl - 3 * n) / (-4 * wl - 4));
      return Array.from({ length: n }, (_, i) => ((i < m ? wl : wl + 2) - 1) / 2);
    }
    /* one running-sum pass along rows or columns; zero outside the raster */
    function blurPass(src, dst, w, h, r, horiz) {
      const len = horiz ? w : h, lines = horiz ? h : w, step = horiz ? 1 : w;
      const inv = 1 / (2 * r + 1);
      for (let l = 0; l < lines; l++) {
        const base = horiz ? l * w : l;
        let acc = 0;
        for (let i = 0; i < r && i < len; i++) acc += src[base + i * step];
        for (let i = 0; i < len; i++) {
          if (i + r < len) acc += src[base + (i + r) * step];
          dst[base + i * step] = acc * inv;
          if (i - r >= 0) acc -= src[base + (i - r) * step];
        }
      }
    }
    function blur(grid, w, h, sigma) {
      const tmp = new Float32Array(grid.length);
      for (const r of boxes(sigma, 3)) {
        if (r < 1) continue;
        blurPass(grid, tmp, w, h, r, true);
        blurPass(tmp, grid, w, h, r, false);
      }
    }
    function inside(pt, ring) {
      let c = false;
      for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
        const [xi, yi] = ring[i], [xj, yj] = ring[j];
        if ((yi > pt[1]) !== (yj > pt[1]) && pt[0] < (xj - xi) * (pt[1] - yi) / (yj - yi) + xi) c = !c;
      }
      return c;
    }
    const ringArea = r => Math.abs(r.reduce((a, p, i) => {
      const q = r[(i + 1) % r.length]; return a + p[0] * q[1] - q[0] * p[1];
    }, 0)) / 2;
    /* raster mask of a shape, at HEAT_SS pixels per frame unit, cropped to a box */
    function mask(path2d, x0, y0, w, h) {
      const cv = document.createElement("canvas");
      cv.width = Math.max(w, 1); cv.height = Math.max(h, 1);
      const ctx = cv.getContext("2d");
      ctx.setTransform(HEAT_SS, 0, 0, HEAT_SS, -x0, -y0);
      ctx.fill(path2d);
      return ctx.getImageData(0, 0, cv.width, cv.height).data;
    }

    function draw(key) {
      const c = M[key];
      const host = document.getElementById("map-" + key);
      if (!c || !host) return;
      const color = CITY_COLOR[key] || INK;
      const spanX = c.span[0], spanY = c.span[1];
      const midLat = c.o[1] + spanY / 2e5;
      const kx = Math.cos(midLat * Math.PI / 180);
      const D = c.d, N = D.n.length;

      let FH = frameH(host.clientWidth || FW);
      const svg = svgEl("svg", { viewBox: `0 0 ${FW} ${FH}`, role: "img", tabindex: "0",
        "aria-label": `Map of ${c.label}: every ${c.unit} shown as a circle sized by the number of homes. ` +
          `Zoomable: + and − zoom, the arrow keys pan, 0 resets. The table below lists the largest entries.` });
      const land = svgEl("path", { class: "cm-land" });
      const water = svgEl("path", { class: "cm-water" });
      const river = svgEl("path", { class: "cm-river" });
      /* Berlin's register maps land, not homes: it lists the parcels the six
         municipal companies hold housing on and attaches no flat counts. Those
         cities are drawn as filled ground instead of circles. */
      const parcels = svgEl("path", { class: "cm-parcels", fill: color, "fill-opacity": 0.42,
        stroke: color, "stroke-opacity": 0.5 });
      const g = svgEl("g", { class: "cm-dots", fill: color, "fill-opacity": 0.17,
        stroke: color, "stroke-opacity": 0.7 });
      const bar = svgEl("g", { class: "cm-scale" });
      const barLine = svgEl("path", { stroke: INK2 });
      const barTicks = svgEl("path", { stroke: INK2 });
      /* zoomed in, the bar sits over the city rather than over empty ground,
         so the label carries its own halo */
      const barLabel = txt(bar, 0, 0, "5 km", { fill: INK2, "paint-order": "stroke",
        stroke: CREAM, "stroke-linejoin": "round" });
      bar.appendChild(barLine); bar.appendChild(barTicks);
      const hi = svgEl("circle", { fill: "none", stroke: INK, opacity: 0, r: 0 });
      /* Everything geographic rides in one group, so a zoom is a single
         transform rather than a redraw of ten thousand circles. The scale bar
         stays outside it, pinned to the frame like a real map's. */
      /* the heat sits on the land and under the water, clipped to the city,
         with the district lines redrawn in cream over it as in Nº 1 */
      const cover = !!c.footprints;
      const breaks = cover ? COVER_BREAKS : HEAT_BREAKS;
      const defs = svgEl("defs", {}), clip = svgEl("clipPath", { id: "heatclip-" + key });
      const clipPath = svgEl("path", {});
      clip.appendChild(clipPath); defs.appendChild(clip);
      const heat = svgEl("image", { class: "cm-heat", preserveAspectRatio: "none",
        "clip-path": `url(#heatclip-${key})`, opacity: HEAT_ALPHA });
      const heatLines = svgEl("path", { class: "cm-heat-lines" });
      const view = svgEl("g", { class: "cm-view" });
      view.appendChild(land); view.appendChild(heat); view.appendChild(heatLines);
      view.appendChild(water); view.appendChild(river);
      view.appendChild(parcels); view.appendChild(g); view.appendChild(hi);
      svg.appendChild(defs); svg.appendChild(view); svg.appendChild(bar);
      for (let i = 0; i < N; i++) g.appendChild(svgEl("circle", {}));

      /* the switch and the heat key, above the map as in Nº 1 */
      const mapBar = document.createElement("div");
      mapBar.className = "map-bar";
      mapBar.innerHTML =
        `<div class="map-switch" role="group" aria-label="Map view">` +
        `<button type="button" data-view="dots">${cover ? "Parcels" : "Circles"}</button>` +
        `<button type="button" data-view="heat">Heatmap</button></div>` +
        `<div class="map-legend"><span class="hl-steps">` +
        breaks.map((b, i) =>
          `<span class="hl-step"><span class="hl-sw" style="background:${HEAT[i]};opacity:${HEAT_ALPHA}"></span>` +
          `${cover ? Math.round(b * 100) + "%" : fmtN(b)}${i === breaks.length - 1 ? "+" : ""}</span>`).join("") +
        `</span><span class="aside">` +
        (cover ? "share of the ground under municipal-company parcels" : `${c.tenure} per km²`) +
        `, smoothed over 500 m · <span class="peak"></span>` +
        (cover ? "" : " · one scale for all five cities with home counts") + `</span></div>`;
      host.insertAdjacentElement("beforebegin", mapBar);
      mapBar.querySelectorAll("button").forEach(b =>
        b.addEventListener("click", () => setCityMapView(b.dataset.view)));
      const heatCanvas = document.createElement("canvas");

      /* pts holds the laid-out [x, y, r] of every dot, refreshed by layout() */
      const pts = new Array(N);
      /* the fit: how the city sits in the frame before anyone touches it */
      let fitS = 1, ox = 0, oy = 0, mw = 0, mh = 0, k = 1;
      /* the view: a magnification and an offset laid over that fit */
      let z = 1, tx = 0, ty = 0;
      let dragging = false, pinchD = 0;   /* the gesture in progress, if any */
      const ZMAX = 14;
      let btnIn = null, btnOut = null, btnReset = null;

      /* Everything geometric is recomputed here, because the frame changes
         shape between the wide and narrow layouts. Zoom does not come through
         here: it is a transform on the view group, so a gesture costs one
         attribute instead of a full redraw. */
      function layout() {
        FH = frameH(host.clientWidth || FW);
        svg.setAttribute("viewBox", `0 0 ${FW} ${FH}`);
        fitS = Math.min((FW - PAD * 2) / (spanX * kx), (FH - PAD * 2) / spanY);
        mw = spanX * kx * fitS; mh = spanY * fitS;
        ox = (FW - mw) / 2; oy = (FH - mh) / 2;
        k = FW / (host.clientWidth || FW);       /* viewBox units per rendered pixel */
        const px = x => ox + x * kx * fitS;
        const py = y => oy + (spanY - y) * fitS;

        const path = (rings, close) => rings.map(a => {
          const r = decRing(a);
          return "M" + r.map(p => px(p[0]).toFixed(1) + " " + py(p[1]).toFixed(1)).join("L") + (close ? "Z" : "");
        }).join("");

        land.setAttribute("d", path(c.adm, true));
        water.setAttribute("d", c.wat && c.wat.length ? path(c.wat, true) : "");
        river.setAttribute("d", c.riv && c.riv.length ? path(c.riv, false) : "");
        parcels.setAttribute("d", c.poly && c.poly.length ? path(c.poly, true) : "");

        const floor = 1.4 * k;
        const circles = g.children;
        let ax = 0, ay = 0;
        for (let i = 0; i < N; i++) {
          ax += D.x[i]; ay += D.y[i];
          const x = px(ax), y = py(ay), r = Math.max(floor, rOf(D.n[i]));
          pts[i] = [x, y, r];
          const el = circles[i];
          el.setAttribute("cx", x.toFixed(1));
          el.setAttribute("cy", y.toFixed(1));
          el.setAttribute("r", r.toFixed(2));
        }
        paintHeat(AREAL[key] ? c.adm.map(a => decRing(a).map(p => [px(p[0]), py(p[1])])) : null);
        radiiZ = 1;
        clampView();
        paintView();
      }

      /* The heat surface, rastered in frame units like everything else in the
         view, so the zoom transform carries it. Laid out again with the frame. */
      function paintHeat(areas) {
        const uKm = (1e5 / KM_DEG) * fitS;       /* frame units per km, both axes */
        const W = FW * HEAT_SS, H = Math.round(FH * HEAT_SS);
        const grid = new Float32Array(W * H);
        const splat = (pt, n) => {
          const x = Math.floor(pt[0] * HEAT_SS), y = Math.floor(pt[1] * HEAT_SS);
          if (x >= 0 && x < W && y >= 0 && y < H) grid[y * W + x] += n;
        };
        if (cover) {
          /* ground cover: 1 under a parcel, 0 elsewhere */
          const a = mask(new Path2D(parcels.getAttribute("d")), 0, 0, W, H);
          for (let p = 0; p < grid.length; p++) grid[p] = a[p * 4 + 3] / 255;
        } else if (areas) {
          /* each count spread evenly over the smallest area its point falls in */
          const size = areas.map(ringArea), load = new Map();
          for (let i = 0; i < N; i++) {
            let best = -1;
            areas.forEach((r, j) => { if ((best < 0 || size[j] < size[best]) && inside(pts[i], r)) best = j; });
            if (best < 0) splat(pts[i], D.n[i]);
            else load.set(best, (load.get(best) || 0) + D.n[i]);
          }
          load.forEach((n, j) => {
            const r = areas[j];
            const xs = r.map(p => p[0] * HEAT_SS), ys = r.map(p => p[1] * HEAT_SS);
            const x0 = Math.max(0, Math.floor(Math.min(...xs))), y0 = Math.max(0, Math.floor(Math.min(...ys)));
            const w = Math.min(W, Math.ceil(Math.max(...xs))) - x0, h = Math.min(H, Math.ceil(Math.max(...ys))) - y0;
            const a = mask(new Path2D("M" + r.map(p => p.join(" ")).join("L") + "Z"), x0, y0, w, h);
            let cells = 0;
            for (let p = 3; p < a.length; p += 4) if (a[p] >= 128) cells++;
            if (!cells) return;
            for (let y = 0; y < h; y++) for (let x = 0; x < w; x++)
              if (a[(y * w + x) * 4 + 3] >= 128) grid[(y0 + y) * W + x0 + x] += n / cells;
          });
        } else {
          for (let i = 0; i < N; i++) splat(pts[i], D.n[i]);
        }
        blur(grid, W, H, HEAT_BW * uKm * HEAT_SS);
        const scale = cover ? 1 : (uKm * HEAT_SS) * (uKm * HEAT_SS);   /* to a share, or per km² */

        heatCanvas.width = W; heatCanvas.height = H;
        const ctx = heatCanvas.getContext("2d");
        const im = ctx.createImageData(W, H), px4 = im.data;
        let peak = 0;
        for (let p = 0; p < grid.length; p++) {
          const v = grid[p] * scale;
          if (v > peak) peak = v;
          if (v < breaks[0]) continue;
          let b = breaks.length - 1;
          while (v < breaks[b]) b--;
          const rgb = HEAT_RGB[b];
          px4[p * 4] = rgb[0]; px4[p * 4 + 1] = rgb[1]; px4[p * 4 + 2] = rgb[2]; px4[p * 4 + 3] = 255;
        }
        ctx.putImageData(im, 0, 0);
        heat.setAttribute("href", heatCanvas.toDataURL("image/png"));
        heat.setAttribute("x", 0); heat.setAttribute("y", 0);
        heat.setAttribute("width", FW); heat.setAttribute("height", FH);
        clipPath.setAttribute("d", land.getAttribute("d"));
        heatLines.setAttribute("d", land.getAttribute("d"));
        mapBar.querySelector(".peak").textContent = cover
          ? `densest spot ≈ ${Math.round(peak * 100)}% of the ground`
          : `densest spot ≈ ${fmtN(Math.round(peak / 100) * 100)}`;
      }

      /* Everything that is a mark rather than a place holds its size on screen:
         the hairlines, the scale bar, and the dots themselves, all divided back
         out by the zoom. That is what makes zooming worth anything here — the
         geography spreads while the circles stay put, so a cluster that reads
         as one blot at rest resolves into the addresses it is made of, and the
         size key in the legend goes on telling the truth at every zoom. */
      const KM_LADDER = [5, 2, 1, 0.5, 0.2, 0.1];
      let radiiZ = 0;                     /* the zoom the radii were written for */
      let raf = 0;
      /* a pinch fires far faster than the screen refreshes, and Paris is 9,645
         circles: state moves on every event, the DOM once a frame */
      function applyView() {
        if (raf) return;
        raf = requestAnimationFrame(() => { raf = 0; paintView(); });
      }
      function paintView() {
        view.setAttribute("transform", `translate(${tx.toFixed(2)} ${ty.toFixed(2)}) scale(${z.toFixed(4)})`);
        const kz = k / z;
        if (radiiZ !== z) {
          radiiZ = z;
          const circles = g.children;
          for (let i = 0; i < N; i++) circles[i].setAttribute("r", (pts[i][2] / z).toFixed(2));
        }
        land.setAttribute("stroke-width", (0.8 * kz).toFixed(2));
        heatLines.setAttribute("stroke-width", (1.1 * kz).toFixed(2));
        river.setAttribute("stroke-width", ((c.rivW || 3.5) * Math.min(k, 1.6) / z).toFixed(2));
        parcels.setAttribute("stroke-width", (0.6 * kz).toFixed(2));
        g.setAttribute("stroke-width", (0.7 * kz).toFixed(2));
        hi.setAttribute("stroke-width", (1.6 * kz).toFixed(2));

        /* The bar holds 5 km wherever it fits — one bar across all six cities
           is what makes their different extents comparable — and steps down
           the ladder once a zoom pushes 5 km past the edge of the frame. */
        const uKm = (1e5 / KM_DEG) * fitS * z;
        const km = KM_LADDER.find(v => v * uKm <= FW * 0.4) || KM_LADDER[KM_LADDER.length - 1];
        const len = km * uKm;
        const bx = Math.max(ox * z + tx, 0) + 8 * k;
        const by = Math.min(oy * z + ty + mh * z, FH) - 14 * k;
        barLine.setAttribute("d", `M${bx.toFixed(1)} ${by.toFixed(1)}h${len.toFixed(1)}`);
        barTicks.setAttribute("d",
          `M${bx.toFixed(1)} ${(by - 3.5 * k).toFixed(1)}v${(7 * k).toFixed(1)}` +
          `M${(bx + len).toFixed(1)} ${(by - 3.5 * k).toFixed(1)}v${(7 * k).toFixed(1)}`);
        [barLine, barTicks].forEach(p => p.setAttribute("stroke-width", (1.6 * k).toFixed(2)));
        barLabel.setAttribute("x", bx.toFixed(1));
        barLabel.setAttribute("y", (by - 7 * k).toFixed(1));
        barLabel.setAttribute("font-size", (12.5 * k).toFixed(1));
        barLabel.setAttribute("stroke-width", (3 * k).toFixed(1));
        barLabel.textContent = km >= 1 ? km + " km" : (km * 1000) + " m";

        if (!dragging) svg.style.cursor = z > 1 ? "grab" : "zoom-in";
        /* at rest the page scrolls through the map; zoomed in, the map keeps
           the gesture, because that is when panning it means something */
        svg.style.touchAction = z > 1 ? "none" : "pan-y";
        if (btnIn) btnIn.disabled = z >= ZMAX - 1e-6;
        if (btnOut) btnOut.disabled = z <= 1;
        if (btnReset) btnReset.disabled = z <= 1;
      }

      /* The city may not be dragged out of the frame: once it is larger than
         the frame it has to cover it, and while it is smaller it has to stay
         inside it — which is also what re-centres it as the zoom returns. */
      function clampView() {
        if (z <= 1) { z = 1; tx = 0; ty = 0; return; }
        if (z > ZMAX) z = ZMAX;
        const axis = (span, frame, off, t) => {
          const edge = off * z + t, run = span * z;
          const lo = run >= frame ? frame - run : 0;
          const hi2 = run >= frame ? 0 : frame - run;
          return Math.min(hi2, Math.max(lo, edge)) - off * z;
        };
        tx = axis(mw, FW, ox, tx);
        ty = axis(mh, FH, oy, ty);
      }

      /* zoom about a point of the frame: whatever sits under it stays under it */
      function zoomAt(nz, fx, fy) {
        nz = Math.min(ZMAX, Math.max(1, nz));
        const vx = (fx - tx) / z, vy = (fy - ty) / z;
        z = nz; tx = fx - vx * z; ty = fy - vy * z;
        clampView(); applyView();
      }
      const zoomBy = f => zoomAt(z * f, FW / 2, FH / 2);
      const resetView = () => { z = 1; clampView(); applyView(); };
      const toFrame = ev => {
        const b = svg.getBoundingClientRect();
        return [(ev.clientX - b.left) * FW / b.width, (ev.clientY - b.top) * FH / b.height];
      };

      /* controls: small, in the corner, and every one of them stands for a
         gesture that also works directly on the map */
      const ctl = document.createElement("div");
      ctl.className = "cm-zoom";
      const mkBtn = (glyph, label, fn) => {
        const b = document.createElement("button");
        b.type = "button";
        b.textContent = glyph;
        b.title = label;
        b.setAttribute("aria-label", label);
        b.addEventListener("click", fn);
        ctl.appendChild(b);
        return b;
      };
      btnIn = mkBtn("+", "Zoom in", () => zoomBy(1.6));
      btnOut = mkBtn("−", "Zoom out", () => zoomBy(1 / 1.6));
      btnReset = mkBtn("↺", "Reset the view", resetView);
      host.appendChild(ctl);

      host.appendChild(svg);
      layout();
      let pending;
      window.addEventListener("resize", () => {
        clearTimeout(pending);
        pending = setTimeout(layout, 180);
      });

      /* A plain wheel is left to the page: a reader scrolling past a map should
         never be caught inside it. A trackpad pinch arrives as a ctrl-wheel,
         and that does zoom — as do the buttons, a double-click and the keys. */
      svg.addEventListener("wheel", ev => {
        if (!ev.ctrlKey && !ev.metaKey) return;
        ev.preventDefault();
        const p = toFrame(ev);
        /* deltas arrive in pixels, lines or pages depending on the device */
        const dy = ev.deltaY * (ev.deltaMode === 1 ? 16 : ev.deltaMode === 2 ? 100 : 1);
        zoomAt(z * Math.exp(-dy * 0.0035), p[0], p[1]);
      }, { passive: false });

      svg.addEventListener("dblclick", ev => {
        ev.preventDefault();
        const p = toFrame(ev);
        zoomAt(z * (ev.shiftKey || ev.altKey ? 0.5 : 2), p[0], p[1]);
      });

      svg.addEventListener("keydown", ev => {
        const STEP = 60;                    /* frame units: a constant nudge on screen */
        if (ev.key === "+" || ev.key === "=") zoomBy(1.6);
        else if (ev.key === "-" || ev.key === "_") zoomBy(1 / 1.6);
        else if (ev.key === "0") resetView();
        else if (ev.key === "ArrowLeft") { tx += STEP; clampView(); applyView(); }
        else if (ev.key === "ArrowRight") { tx -= STEP; clampView(); applyView(); }
        else if (ev.key === "ArrowUp") { ty += STEP; clampView(); applyView(); }
        else if (ev.key === "ArrowDown") { ty -= STEP; clampView(); applyView(); }
        else return;
        ev.preventDefault();
      });

      /* drag to pan, two fingers to pinch */
      const down = new Map();
      svg.addEventListener("pointerdown", ev => {
        down.set(ev.pointerId, [ev.clientX, ev.clientY]);
        if (down.size === 2) {
          svg.style.touchAction = "none";     /* the browser is not having this one */
          const p = Array.from(down.values());
          pinchD = Math.hypot(p[0][0] - p[1][0], p[0][1] - p[1][1]);
          dragging = false;
          tip.hide(); hi.setAttribute("opacity", 0);
        } else if (down.size === 1 && z > 1) {
          dragging = true;
          svg.setPointerCapture(ev.pointerId);
          svg.style.cursor = "grabbing";
          tip.hide(); hi.setAttribute("opacity", 0);
        }
      });
      svg.addEventListener("pointermove", ev => {
        if (!down.has(ev.pointerId)) return;
        const prev = down.get(ev.pointerId);
        down.set(ev.pointerId, [ev.clientX, ev.clientY]);
        const b = svg.getBoundingClientRect();
        if (down.size === 2 && pinchD > 0) {
          const p = Array.from(down.values());
          const d = Math.hypot(p[0][0] - p[1][0], p[0][1] - p[1][1]);
          zoomAt(z * (d / pinchD),
            ((p[0][0] + p[1][0]) / 2 - b.left) * FW / b.width,
            ((p[0][1] + p[1][1]) / 2 - b.top) * FH / b.height);
          pinchD = d;
        } else if (dragging) {
          tx += (ev.clientX - prev[0]) * FW / b.width;
          ty += (ev.clientY - prev[1]) * FH / b.height;
          clampView(); applyView();
        }
      });
      const endPointer = ev => {
        down.delete(ev.pointerId);
        if (down.size < 2) pinchD = 0;
        /* the cursor is the one thing that should not wait for a frame */
        if (!down.size) { dragging = false; svg.style.cursor = z > 1 ? "grab" : "zoom-in"; applyView(); }
      };
      svg.addEventListener("pointerup", endPointer);
      svg.addEventListener("pointercancel", endPointer);

      /* hover: nearest dot within its own radius + a few units */
      const tip = makeTip(host);
      /* big registers name only their larger entries; the rest fall back to the
         district they sit in, so a hover always says where you are */
      const nameOf = i => D.nm[i] ||
        (D.sub && c.subs
          ? (c.subFmt || "%s").replace("%s", c.subs[D.sub[i]])
          : c.label);
      svg.addEventListener("pointermove", ev => {
        if (dragging || down.size > 1) return;
        const b = svg.getBoundingClientRect();
        /* the pointer comes back through the view transform to find its dot */
        const mx = ((ev.clientX - b.left) * FW / b.width - tx) / z;
        const my = ((ev.clientY - b.top) * FH / b.height - ty) / z;
        const tol = 5 / z;
        let best = -1, bestD = Infinity;
        for (let i = 0; i < N; i++) {
          const dx = pts[i][0] - mx, dy = pts[i][1] - my;
          const d = Math.sqrt(dx * dx + dy * dy) - pts[i][2] / z;
          if (d < bestD && d < tol) { bestD = d; best = i; }
        }
        if (best < 0) { tip.hide(); hi.setAttribute("opacity", 0); return; }
        hi.setAttribute("cx", pts[best][0]); hi.setAttribute("cy", pts[best][1]);
        hi.setAttribute("r", (pts[best][2] + 2.5) / z); hi.setAttribute("opacity", 1);
        tip.show(
          `<b>${nameOf(best)}</b>` +
          `<div class="trow"><span>${c.tenure}</span><span class="v">${fmtN(D.n[best])}</span></div>` +
          (D.yr[best] ? `<div class="trow"><span>built</span><span class="v">${D.yr[best]}</span></div>` : ""),
          (pts[best][0] * z + tx) / FW * b.width, (pts[best][1] * z + ty) / FH * b.height);
      });
      svg.addEventListener("pointerleave", () => { tip.hide(); hi.setAttribute("opacity", 0); });

      /* legend: three reference circles on the shared size scale */
      const leg = document.getElementById("mapleg-" + key);
      if (leg && c.footprints) {
        /* nothing is sized by homes here, so the size key would lie */
        leg.innerHTML = "";
        const sw = document.createElement("span");
        sw.className = "li";
        sw.innerHTML = `<span class="swatch" style="background:${color};opacity:.55;` +
          `width:13px;height:13px;border-radius:2px"></span>${c.legendNote}`;
        sw.style.color = INK3;
        leg.appendChild(sw);
      } else if (leg) {
        /* the same key in every city — the size scale is what makes the six comparable */
        const top = Math.max.apply(null, D.n);
        const keys = [100, 1000, 5000];
        const rs = keys.map(rOf);
        const GAP = 15;
        const base = rs[rs.length - 1] * 2;        /* circles sit on one baseline */
        const lsvg = svgEl("svg", { "aria-hidden": "true" });
        let cx = 0;
        keys.forEach((v, i) => {
          const r = rs[i];
          cx += r;
          lsvg.appendChild(svgEl("circle", { cx: cx.toFixed(1), cy: (base - r).toFixed(1), r: r.toFixed(2),
            fill: color, "fill-opacity": 0.17, stroke: color, "stroke-opacity": 0.7, "stroke-width": 0.7 }));
          txt(lsvg, cx, base - r * 2 - 4, fmtN(v), { fill: INK3, "font-size": 11.5, "text-anchor": "middle" });
          cx += r + GAP;
        });
        leg.innerHTML = "";
        leg.appendChild(lsvg);
        /* Size the box from what was actually drawn: the centred labels are wider
           than the circles they sit above, and how much wider depends on the font.
           Measure once now and again when the webfont has settled. */
        const fit = () => {
          const bb = lsvg.getBBox();
          const m = 2;
          lsvg.setAttribute("viewBox",
            `${(bb.x - m).toFixed(1)} ${(bb.y - m).toFixed(1)} ` +
            `${(bb.width + m * 2).toFixed(1)} ${(bb.height + m * 2).toFixed(1)}`);
          lsvg.setAttribute("width", Math.ceil(bb.width + m * 2));
          lsvg.setAttribute("height", Math.ceil(bb.height + m * 2));
        };
        fit();
        if (document.fonts && document.fonts.ready) document.fonts.ready.then(fit);
        const t = document.createElement("span");
        t.className = "li";
        t.style.color = INK3;
        t.textContent = `circle area ∝ homes, one scale for all six cities · largest here: ${fmtN(top)}`;
        leg.appendChild(t);
      }
      /* a gesture nobody is told about is a gesture nobody uses */
      if (leg) {
        const coarse = window.matchMedia && window.matchMedia("(pointer: coarse)").matches;
        const h = document.createElement("span");
        h.className = "li";
        h.style.color = INK3;
        h.textContent = coarse
          ? "double-tap or pinch to zoom · drag to pan"
          : "double-click to zoom · drag to pan";
        leg.appendChild(h);
      }

      /* table fallback: the largest estates */
      const tab = document.getElementById("maptab-" + key);
      if (tab && !N) {
        tab.closest("details").hidden = true;      /* no counts, nothing to tabulate */
      } else if (tab) {
        const order = Array.from({ length: N }, (_, i) => i).sort((a, b) => D.n[b] - D.n[a]);
        const rows = order.slice(0, 12).map(i =>
          `<tr><td>${nameOf(i)}</td><td>${D.yr[i] || "—"}</td><td>${fmtN(D.n[i])}</td></tr>`);
        tab.innerHTML =
          `<table><thead><tr><th>${c.unit}</th><th>Built</th><th>Homes</th></tr></thead>` +
          `<tbody>${rows.join("")}</tbody></table>` +
          `<p class="mt-foot">${fmtN(N)} ${c.unitPl} in all, ${fmtN(D.n.reduce((a, b) => a + b, 0))} ${c.tenure}.</p>`;
      }

      /* the switch: each view shows its own marks, its own key and a subtitle
         that says what is drawn. The hover keeps naming the nearest entry. */
      const sub = host.closest("figure").querySelector(".viz-sub");
      const subDots = sub ? sub.innerHTML : "";
      const cap = s => s[0].toUpperCase() + s.slice(1);
      const subHeat = cover
        ? "Share of the ground under the state-owned housing companies' parcels, smoothed over 500 m"
        : AREAL[key]
          ? `${cap(c.tenure)} per km² · each ${AREAL[key]}'s count spread over its area, smoothed over 500 m`
          : `${cap(c.tenure)} per km², smoothed over 500 m · one colour scale for every city`;
      mapViews.push({ set(v) {
        const on = v === "heat";
        heat.style.display = heatLines.style.display = on ? "" : "none";
        g.style.display = parcels.style.display = on ? "none" : "";
        mapBar.querySelector(".map-legend").hidden = !on;
        if (leg) leg.hidden = on;
        if (sub) sub.innerHTML = on ? subHeat : subDots;
        mapBar.querySelectorAll("button").forEach(b => b.setAttribute("aria-pressed", b.dataset.view === v));
      } });
      mapViews[mapViews.length - 1].set(CITY_MAP_DEFAULT);
    }

    Object.keys(M).forEach(draw);
  })();

  /* ============================================================
     CITY NAV active state
     ============================================================ */
  (function nav() {
    const links = document.querySelectorAll(".city-nav a");
    if (!links.length || !("IntersectionObserver" in window)) return;
    const map = {};
    links.forEach(a => { map[a.getAttribute("href").slice(1)] = a; });
    const io = new IntersectionObserver(entries => {
      entries.forEach(en => {
        if (en.isIntersecting) {
          links.forEach(a => a.classList.remove("active"));
          const a = map[en.target.id];
          if (a) a.classList.add("active");
        }
      });
    }, { rootMargin: "-30% 0px -60% 0px" });
    document.querySelectorAll("section.city").forEach(s => io.observe(s));
  })();
})();

/* ---------- Sources & methodology: collapsed by default, opens on demand ---------- */
(function () {
  const btn = document.getElementById("src-toggle");
  const body = document.getElementById("src-body");
  if (!btn || !body) return;
  document.documentElement.classList.add("js-src");
  const label = btn.querySelector(".lbl");
  function set(open) {
    body.hidden = !open;
    btn.setAttribute("aria-expanded", String(open));
    label.textContent = open ? "Show less" : "Read more";
  }
  set(false);
  btn.addEventListener("click", () => {
    const open = body.hidden;
    set(open);
    if (!open) document.getElementById("sources").scrollIntoView({ block: "start" });
  });
  // any link to the sources section opens it
  document.querySelectorAll('a[href="#sources"]').forEach(a => a.addEventListener("click", () => set(true)));
  if (location.hash === "#sources") set(true);
  window.addEventListener("hashchange", () => { if (location.hash === "#sources") set(true); });
})();

/* ---------- Embedded in an iframe (e.g. a WordPress page): report height and scroll targets to the host page ---------- */
(function () {
  if (window.self === window.top) return;
  const root = document.documentElement;
  root.classList.add("is-embedded");
  const post = msg => window.parent.postMessage(Object.assign({ source: "cormoran-dossier" }, msg), "*");
  // outside links open in a new tab instead of inside the frame
  document.querySelectorAll('a[href^="http"]').forEach(a => { a.target = "_blank"; a.rel = "noopener"; });
  // the frame is as tall as the page, so the host page does the scrolling
  let last = 0;
  const report = () => {
    const h = Math.ceil(document.body.getBoundingClientRect().height);
    if (h !== last) { last = h; post({ type: "height", height: h }); }
  };
  new ResizeObserver(report).observe(document.body);
  window.addEventListener("load", report);
  document.addEventListener("click", e => {
    const a = e.target.closest('a[href^="#"]');
    const el = a && document.getElementById(a.getAttribute("href").slice(1));
    if (!el) return;
    e.preventDefault();
    post({ type: "scroll", top: el.getBoundingClientRect().top + window.scrollY });
  });
})();
