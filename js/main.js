/* The Cormoran — Dossier Nº 2 chart engine (vanilla JS + SVG) */
(function () {
  "use strict";
  const D = window.DOSSIER;
  const SVGNS = "http://www.w3.org/2000/svg";

  const CITY_COLOR = {
    vienna: "#302B72", helsinki: "#5C8868", paris: "#6679CE",
    berlin: "#C3699E", london: "#491F14", rome: "#C53A19"
  };
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

  /* how a share moved, in words. A fraction of the starting share
     ("down by four-fifths") reads more easily than a difference in
     percentage points ("−17.4pp"). */
  const FRACTIONS = [[1 / 4, "a quarter"], [1 / 3, "a third"], [1 / 2, "half"],
    [2 / 3, "two-thirds"], [3 / 4, "three-quarters"], [4 / 5, "four-fifths"]];
  const sameShare = (then, now) => Math.abs(now / then - 1) < 0.1;
  function shareChange(then, now) {
    const r = now / then, dir = r > 1 ? "up" : "down", f = Math.abs(r - 1);
    if (sameShare(then, now)) return "about the same";
    if (f < 0.2) return `${dir} slightly`;
    if (r >= 1.9) return r < 2.1 ? "doubled" : `up ${Math.round(r)}-fold`;
    const [v, word] = FRACTIONS.reduce((a, b) => Math.abs(b[0] - f) < Math.abs(a[0] - f) ? b : a);
    const q = f < v - 0.015 ? "nearly " : f > v + 0.015 ? "more than " : "";
    return `${dir} by ${q}${word}`;
  }

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
     INTRO RAIL — one card per city: the social share today, and in
     words where it started
     ============================================================ */
  (function introRail() {
    const host = document.getElementById("rail-grid");
    if (!host) return;
    const keys = Object.keys(D.cities).sort((a, b) => D.cities[b].shareNow - D.cities[a].shareNow);
    for (const key of keys) {
      const c = D.cities[key];
      const card = document.createElement("a");
      card.className = "sm";
      card.href = "#" + key;
      card.style.setProperty("--city", CITY_COLOR[key]);
      card.innerHTML =
        `<span class="sm-head"><span class="sm-name">${c.label}</span>` +
        `<span class="sm-now">${c.shareNow}%</span></span>` +
        `<span class="sm-foot">in ${c.nowYear} · ${sameShare(c.shareThen, c.shareNow)
          ? `about the same as in ${c.thenYear} (${c.shareThen}%)`
          : `${c.shareNow > c.shareThen ? "up" : "down"} from ${c.shareThen}% in ${c.thenYear}`}</span>`;
      host.appendChild(card);
    }
  })();

  /* ============================================================
     EUROPE — social rental housing as a share of each country's homes.
     Three views of the same figures, one switch apart.
     ============================================================ */
  (function europe() {
    const all = D.mapCountries;
    const counted = all.filter(c => c.share !== null).sort((a, b) => b.share - a.share);
    const special = all.filter(c => c.share === null);
    const byKey = {};
    all.forEach(c => { byKey[c.key] = c; });
    /* the countries of the six cities in this dossier carry their city's colour */
    const CITY_OF = { at: "vienna", fi: "helsinki", fr: "paris", de: "berlin", uk: "london", it: "rome" };
    const NEUTRAL = "#B9AA89";
    const colorOf = c => CITY_OF[c.key] ? CITY_COLOR[CITY_OF[c.key]] : NEUTRAL;
    const nameOf = c => c.nameOverride || c.name;
    const cityTag = c => CITY_OF[c.key] ? ` <span class="eu-city">${D.cities[CITY_OF[c.key]].label}</span>` : "";
    /* the EU average quoted in the introduction */
    const EU_AVG = 8;

    /* hover, or a tap on a phone, on anything that carries data-k */
    function hover(host) {
      const tip = makeTip(host);
      const html = c => `<b>${nameOf(c)}</b>` + (c.share === null
        ? `<div class="tnote" style="color:inherit">${c.note}</div>`
        : `<div class="trow"><span>share of all homes</span><span class="v">${c.share}%</span></div>` +
          `<div class="trow"><span>year of the figure</span><span class="v">${c.year}</span></div>` +
          (c.note ? `<div class="tnote">${c.note}</div>` : ""));
      host.addEventListener("pointermove", ev => {
        const el = ev.target.closest("[data-k]");
        if (!el) { tip.hide(); return; }
        const bb = host.getBoundingClientRect();
        tip.show(html(byKey[el.dataset.k]), ev.clientX - bb.left, ev.clientY - bb.top);
      });
      host.addEventListener("pointerleave", () => tip.hide());
    }

    /* A — every country as a bar, longest first */
    (function bars() {
      const host = document.getElementById("eu-bars");
      if (!host) return;
      const MAX = 40;                     /* leaves room past the longest bar for its number */
      const at = v => (v / MAX).toFixed(4);
      host.innerHTML = `<div class="eu-bars" role="img" aria-label="Bar chart: social housing as a share of all homes in ${counted.length} European countries, from ${counted[0].share}% in ${nameOf(counted[0])} to ${counted[counted.length - 1].share}% in ${nameOf(counted[counted.length - 1])}">` +
        `<div class="eb-ref" style="--x:${at(EU_AVG)}" aria-hidden="true"><span>EU average, ${EU_AVG}%</span></div>` +
        counted.map(c =>
          `<div class="eb-row${CITY_OF[c.key] ? " is-city" : ""}" data-k="${c.key}" style="--c:${colorOf(c)};--x:${at(c.share)}">` +
          `<span class="eb-name">${nameOf(c)}${cityTag(c)}</span>` +
          `<span class="eb-track"><span class="eb-bar"></span><span class="eb-val">${c.share}%</span></span></div>`).join("") +
        special.map(c =>
          `<div class="eb-row is-none" data-k="${c.key}"><span class="eb-name">${nameOf(c)}</span>` +
          `<span class="eb-track"><span class="eb-none">✳ not counted</span></span></div>`).join("") +
        `</div>`;
      hover(host);
    })();

    /* B — out of every 100 homes: a 10 × 10 grid per country, filled from
       the bottom row up; the last square is filled in part, so 34.1% is
       34 squares and a tenth */
    (function waffles() {
      const host = document.getElementById("eu-waffle");
      if (!host) return;
      const grid = c => {
        let h = "";
        for (let i = 0; i < 100; i++) {
          const order = (9 - Math.floor(i / 10)) * 10 + i % 10;
          const f = c.share === null ? 0 : Math.max(0, Math.min(1, c.share - order));
          h += f >= 1 ? `<i class="on"></i>`
            : f > 0 ? `<i style="background-image:linear-gradient(90deg,var(--c) ${(f * 100).toFixed(0)}%,transparent 0)"></i>`
            : `<i></i>`;
        }
        return h;
      };
      host.innerHTML = `<div class="eu-waffle">` +
        counted.concat(special).map(c =>
          `<div class="ew-card${c.share === null ? " is-none" : ""}${CITY_OF[c.key] ? " is-city" : ""}" data-k="${c.key}" style="--c:${colorOf(c)}" ` +
          `role="img" aria-label="${nameOf(c)}: ${c.share === null ? "not counted" : c.share + " in every 100 homes are social housing"}">` +
          `<div class="ew-grid" aria-hidden="true">${grid(c)}</div>` +
          `<div class="ew-name">${nameOf(c)}${cityTag(c)}</div>` +
          `<div class="ew-val">${c.share === null ? "✳ not counted" : c.share + " in 100"}</div></div>`).join("") +
        `</div>`;
      hover(host);
    })();

    /* C — one dot per country on a shared scale, grouped as the text above
       groups them: the north and west, the south, and the formerly
       communist centre and east */
    (function regions() {
      const host = document.getElementById("eu-dots");
      if (!host) return;
      const GROUPS = [
        ["Northern and western Europe", ["nl", "at", "dk", "uk", "fr", "ie", "is", "fi", "ch", "be", "no", "de", "se"]],
        ["Southern Europe", ["it", "es", "pt", "gr"]],
        ["Central and eastern Europe, formerly communist", ["pl", "si", "cz", "hu", "sk", "lv", "ee", "lt"]]
      ];
      const MAX = 40;
      const at = v => (v / MAX).toFixed(4);
      const row = c => c.share === null
        ? `<div class="ed-row is-none" data-k="${c.key}"><span class="ed-name">${nameOf(c)}</span>` +
          `<span class="ed-track"><span class="ed-none">✳ not counted</span></span></div>`
        : `<div class="ed-row${CITY_OF[c.key] ? " is-city" : ""}" data-k="${c.key}" style="--c:${colorOf(c)};--x:${at(c.share)}">` +
          `<span class="ed-name">${nameOf(c)}${cityTag(c)}</span>` +
          `<span class="ed-track"><span class="ed-dot"></span><span class="ed-val">${c.share}%</span></span></div>`;
      host.innerHTML = `<div class="eu-dots">` +
        `<div class="ed-axis" aria-hidden="true"><span class="ed-name"></span><span class="ed-track">` +
        [0, 10, 20, 30].map(v => `<span style="--x:${at(v)}">${v}%</span>`).join("") + `</span></div>` +
        GROUPS.map(([label, keys]) => {
          const cs = keys.map(k => byKey[k]).sort((a, b) => (b.share === null ? -1 : b.share) - (a.share === null ? -1 : a.share));
          return `<div class="ed-group">${label}</div>` + cs.map(row).join("");
        }).join("") + `</div>`;
      hover(host);
    })();

    /* the three views, one switch apart */
    const sw = document.getElementById("eu-switch");
    if (sw) sw.querySelectorAll("button").forEach(b => b.addEventListener("click", () => {
      sw.querySelectorAll("button").forEach(x => {
        const on = x === b;
        x.setAttribute("aria-pressed", on);
        document.getElementById(x.dataset.view).hidden = !on;
      });
    }));

    const leg = document.getElementById("europe-legend");
    if (leg) leg.innerHTML =
      `<span class="li">In colour: the countries of the six cities in this dossier</span>` +
      `<span class="li" style="color:${INK3}">✳ not counted: see the note below</span>`;

    const tbody = document.querySelector("#europe-table tbody");
    if (tbody) tbody.innerHTML = counted.concat(special).map(c =>
      `<tr><td>${nameOf(c)}</td><td>${c.share === null ? "—" : c.share + "%"}</td><td>${c.year || "—"}</td><td>${c.note || ""}</td></tr>`).join("");
  })();

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
    const W = 960, H = 480, M = { t: 40, r: 330, b: 40, l: 150 };
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
      const t = svgEl("text", { x: X1 + 10, y: ly, fill: r.color, "font-size": 13.5, "font-weight": r.s.muted ? 400 : 600 });
      const a = svgEl("tspan", {}); a.textContent = `${r.s.now}% ${r.label} ${r.s.nowYear}`;
      const bTs = svgEl("tspan", { fill: INK3, "font-weight": 400, dx: "6" });
      bTs.textContent = shareChange(r.s.then, r.s.now);
      t.appendChild(a); t.appendChild(bTs);
      svg.appendChild(t);
    }
    host.appendChild(svg);
  })();

  /* ============================================================
     CITY MAPS — two views of the same records, one switch apart:
     DISTRICTS, each district shaded by its social homes per km², and a
     banded HEATMAP of the same homes smoothed over 500 m. Both views
     share one colour scale, and it is the same in every city.
     Every map is drawn into the same frame and fitted to the city's own
     administrative outline, so extents differ: the 5 km bar is what makes
     them comparable. The frame turns taller on narrow screens — the same
     shape for all six, so the comparison survives. Payload in
     data/city-maps.js is delta-encoded; the decoders are below. The
     per-district totals come precomputed in window.CITYDIST.
     ============================================================ */
  (function cityMaps() {
    const M = window.CITYMAP;
    if (!M) return;
    const DIST = window.CITYDIST || {};
    const FW = 1000, PAD = 4;
    const KM_DEG = 111.32;                 /* km per degree of latitude */
    /* The frame turns taller as its box narrows — a column of the city grid,
       then a phone — measured from the host so it follows the CSS rather than
       repeating its breakpoints. All six share whichever frame is in force. */
    const frameH = w => (w < 430 ? 880 : w < 720 ? 700 : 560);

    /* delta-encoded flat int array -> array of [x, y] in 1e-5° units */
    function decRing(a) {
      const out = []; let x = 0, y = 0;
      for (let i = 0; i < a.length; i += 2) { x += a[i]; y += a[i + 1]; out.push([x, y]); }
      return out;
    }

    /* The heatmap (Dossier Nº 1's approach): the same records as the
       districts, spread by a Gaussian of HEAT_BW km and sorted into six
       bands of homes per km². The bands are absolute — one set of breaks
       for every city — and the district view uses the same ones, so a colour
       means the same density in either view. The switch above each map flips
       all six. */
    const CITY_MAP_DEFAULT = "districts";  /* "districts" or "heat": the view the maps open on */
    const HEAT_BW = 0.5;                   /* smoothing radius, km (the Gaussian's σ) */
    const HEAT_SS = 2;                     /* raster pixels per frame unit */
    const HEAT_ALPHA = 0.78;               /* colour opacity: the land shows through */
    /* the traditional heat ramp, ColorBrewer YlOrRd in six classes */
    const HEAT = ["#FFFFB2", "#FED976", "#FEB24C", "#FD8D3C", "#F03B20", "#BD0026"];
    const HEAT_RGB = HEAT.map(h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)));
    const HEAT_BREAKS = [100, 250, 500, 1000, 2000, 4000];        /* homes per km² */
    /* a district with some homes but fewer than the first break: paler than
       the first band, so it still reads apart from a district with none */
    const LOW = "#FBF8E6";
    /* Berlin counts no homes, so both its views measure ground cover: the
       share of the land under municipal-company parcels, on breaks of its own */
    const COVER_BREAKS = [0.02, 0.05, 0.08, 0.12, 0.16, 0.2];
    /* registers that give one count per area rather than per building: the
       count is spread evenly over its area before it is smoothed, so the heat
       shows density by area rather than inventing estates inside it */
    const AREAL = { helsinki: "district", rome: "zona urbanistica" };
    /* what a district is called in each city, for the hover and the table */
    const UNIT = { vienna: "district", helsinki: "district", paris: "arrondissement",
      berlin: "district", london: "borough", rome: "zona urbanistica" };
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
      const spanX = c.span[0], spanY = c.span[1];
      const midLat = c.o[1] + spanY / 2e5;
      const kx = Math.cos(midLat * Math.PI / 180);
      const D = c.d, N = D.n.length;
      const cover = !!c.footprints;
      const breaks = cover ? COVER_BREAKS : HEAT_BREAKS;
      const unit = UNIT[key] || "district";

      /* the districts: homes per km², or for Berlin the share of the land */
      const dists = (DIST[key] || []).map(d => Object.assign({}, d,
        { v: cover ? d.cover : d.n / d.km2 }));
      const band = v => { let b = -1; while (b + 1 < breaks.length && v >= breaks[b + 1]) b++; return b; };
      const fillOf = d => !(d.v > 0) ? "none" : band(d.v) < 0 ? LOW : HEAT[band(d.v)];

      let FH = frameH(host.clientWidth || FW);
      const svg = svgEl("svg", { viewBox: `0 0 ${FW} ${FH}`, role: "img", tabindex: "0",
        "aria-label": `Map of ${c.label}: each ${unit} shaded by ` +
          (cover ? "the share of its land held by the city's housing companies" : `${c.tenure} per square kilometre`) +
          `, with a heatmap one switch away. Zoomable: + and − zoom, the arrow keys pan, 0 resets. The table below lists the ${unit === "zona urbanistica" ? "zone" : unit + "s"}.` });
      const land = svgEl("path", { class: "cm-land" });
      const water = svgEl("path", { class: "cm-water" });
      const river = svgEl("path", { class: "cm-river" });
      const gDist = svgEl("g", { class: "cm-dist", "fill-opacity": HEAT_ALPHA });
      const distEls = dists.map(d => {
        const el = svgEl("path", { fill: fillOf(d) });
        gDist.appendChild(el);
        return el;
      });
      const bar = svgEl("g", { class: "cm-scale" });
      const barLine = svgEl("path", { stroke: INK2 });
      const barTicks = svgEl("path", { stroke: INK2 });
      /* zoomed in, the bar sits over the city rather than over empty ground,
         so the label carries its own halo */
      const barLabel = txt(bar, 0, 0, "5 km", { fill: INK2, "paint-order": "stroke",
        stroke: CREAM, "stroke-linejoin": "round" });
      bar.appendChild(barLine); bar.appendChild(barTicks);
      const hi = svgEl("path", { class: "cm-hi", fill: "none", stroke: INK, opacity: 0 });
      /* Everything geographic rides in one group, so a zoom is a single
         transform rather than a redraw. The scale bar stays outside it,
         pinned to the frame like a real map's. */
      /* the heat sits on the land and under the water, clipped to the city,
         with the district lines redrawn in cream over it as in Nº 1 */
      const defs = svgEl("defs", {}), clip = svgEl("clipPath", { id: "heatclip-" + key });
      const clipPath = svgEl("path", {});
      clip.appendChild(clipPath); defs.appendChild(clip);
      const heat = svgEl("image", { class: "cm-heat", preserveAspectRatio: "none",
        "clip-path": `url(#heatclip-${key})`, opacity: HEAT_ALPHA });
      const heatLines = svgEl("path", { class: "cm-heat-lines" });
      const view = svgEl("g", { class: "cm-view" });
      view.appendChild(land); view.appendChild(gDist); view.appendChild(heat); view.appendChild(heatLines);
      view.appendChild(water); view.appendChild(river); view.appendChild(hi);
      svg.appendChild(defs); svg.appendChild(view); svg.appendChild(bar);

      /* the switch and the colour key, above the map as in Nº 1; one key
         serves both views */
      const stepLabel = b => cover ? Math.round(b * 100) + "%" : fmtN(b);
      const mapBar = document.createElement("div");
      mapBar.className = "map-bar";
      mapBar.innerHTML =
        `<div class="map-switch" role="group" aria-label="Map view">` +
        `<button type="button" data-view="districts">Districts</button>` +
        `<button type="button" data-view="heat">Heatmap</button></div>` +
        `<div class="map-legend"><span class="hl-steps">` +
        `<span class="hl-step hl-low"><span class="hl-sw" style="background:${LOW}"></span>under ${stepLabel(breaks[0])}</span>` +
        breaks.map((b, i) =>
          `<span class="hl-step"><span class="hl-sw" style="background:${HEAT[i]};opacity:${HEAT_ALPHA}"></span>` +
          `${stepLabel(b)}${i === breaks.length - 1 ? "+" : ""}</span>`).join("") +
        `</span><span class="aside"></span></div>`;
      host.insertAdjacentElement("beforebegin", mapBar);
      mapBar.querySelectorAll("button").forEach(b =>
        b.addEventListener("click", () => setCityMapView(b.dataset.view)));
      const heatCanvas = document.createElement("canvas");

      /* pts holds the laid-out [x, y] of every record and rings the
         districts in frame units, both refreshed by layout() */
      const pts = new Array(N);
      let rings = [];
      let parcelD = "";
      /* the fit: how the city sits in the frame before anyone touches it */
      let fitS = 1, ox = 0, oy = 0, mw = 0, mh = 0, k = 1;
      /* the view: a magnification and an offset laid over that fit */
      let z = 1, tx = 0, ty = 0;
      let dragging = false, pinchD = 0;   /* the gesture in progress, if any */
      const ZMAX = 14;
      let btnIn = null, btnOut = null, btnReset = null;
      let peakText = "";

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

        const path = (rs, close) => rs.map(a => {
          const r = decRing(a);
          return "M" + r.map(p => px(p[0]).toFixed(1) + " " + py(p[1]).toFixed(1)).join("L") + (close ? "Z" : "");
        }).join("");

        land.setAttribute("d", path(c.adm, true));
        water.setAttribute("d", c.wat && c.wat.length ? path(c.wat, true) : "");
        river.setAttribute("d", c.riv && c.riv.length ? path(c.riv, false) : "");
        parcelD = c.poly && c.poly.length ? path(c.poly, true) : "";

        rings = c.adm.map(a => decRing(a).map(p => [px(p[0]), py(p[1])]));
        const ringD = r => "M" + r.map(p => p[0].toFixed(1) + " " + p[1].toFixed(1)).join("L") + "Z";
        dists.forEach((d, j) => distEls[j].setAttribute("d", d.rings.map(i => ringD(rings[i])).join("")));

        let ax = 0, ay = 0;
        for (let i = 0; i < N; i++) {
          ax += D.x[i]; ay += D.y[i];
          pts[i] = [px(ax), py(ay)];
        }
        paintHeat(AREAL[key] ? rings : null);
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
          const a = mask(new Path2D(parcelD), 0, 0, W, H);
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
        peakText = cover
          ? `densest spot ≈ ${Math.round(peak * 100)}% of the ground`
          : `densest spot ≈ ${fmtN(Math.round(peak / 100) * 100)}`;
        if (view.dataset.mode === "heat") setAside("heat");
      }

      /* Everything that is a mark rather than a place holds its size on screen:
         the hairlines and the scale bar, divided back out by the zoom. */
      const KM_LADDER = [5, 2, 1, 0.5, 0.2, 0.1];
      let raf = 0;
      function applyView() {
        if (raf) return;
        raf = requestAnimationFrame(() => { raf = 0; paintView(); });
      }
      function paintView() {
        view.setAttribute("transform", `translate(${tx.toFixed(2)} ${ty.toFixed(2)}) scale(${z.toFixed(4)})`);
        const kz = k / z;
        land.setAttribute("stroke-width", (0.8 * kz).toFixed(2));
        gDist.setAttribute("stroke-width", (1.1 * kz).toFixed(2));
        heatLines.setAttribute("stroke-width", (1.1 * kz).toFixed(2));
        river.setAttribute("stroke-width", ((c.rivW || 3.5) * Math.min(k, 1.6) / z).toFixed(2));
        hi.setAttribute("stroke-width", (1.8 * kz).toFixed(2));

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

      /* hover, in either view: the district under the pointer, outlined */
      const tip = makeTip(host);
      const cap = s => s[0].toUpperCase() + s.slice(1);
      const distName = d => d.nm ? d.nm.replace(/ arr\.$/, " arrondissement") : null;
      const row = (a, b) => `<div class="trow"><span>${a}</span><span class="v">${b}</span></div>`;
      const pct = v => (v * 100).toFixed(1) + "%";
      svg.addEventListener("pointermove", ev => {
        if (dragging || down.size > 1) return;
        const b = svg.getBoundingClientRect();
        /* the pointer comes back through the view transform to find its district */
        const mx = ((ev.clientX - b.left) * FW / b.width - tx) / z;
        const my = ((ev.clientY - b.top) * FH / b.height - ty) / z;
        let best = -1, bestA = Infinity;
        dists.forEach((d, j) => d.rings.forEach(i => {
          const r = rings[i];
          if (inside([mx, my], r)) { const a = ringArea(r); if (a < bestA) { bestA = a; best = j; } }
        }));
        if (best < 0) { tip.hide(); hi.setAttribute("opacity", 0); return; }
        const d = dists[best];
        hi.setAttribute("d", distEls[best].getAttribute("d"));
        hi.setAttribute("opacity", 1);
        const html = cover
          ? `<b>${distName(d)}</b>` + row("share of the land", pct(d.cover)) +
            row("plots held by the companies", fmtN(d.plots))
          : d.n > 0
            ? `<b>${distName(d) || c.label}</b>` + row(c.tenure, fmtN(d.n)) +
              row("per km²", fmtN(Math.round(d.v)))
            : `<b>${distName(d) || c.label}</b><div class="tnote">no ${c.tenure} in the source for this ${unit}</div>`;
        const hb = host.getBoundingClientRect();
        tip.show(html, ev.clientX - hb.left, ev.clientY - hb.top);
      });
      svg.addEventListener("pointerleave", () => { tip.hide(); hi.setAttribute("opacity", 0); });

      /* a gesture nobody is told about is a gesture nobody uses */
      const leg = document.getElementById("mapleg-" + key);
      if (leg) {
        const coarse = window.matchMedia && window.matchMedia("(pointer: coarse)").matches;
        leg.innerHTML = "";
        const h = document.createElement("span");
        h.className = "li";
        h.style.color = INK3;
        const a = /^[aeiou]/.test(unit) ? "an " : "a ";
        h.textContent = (coarse ? "tap " + a + unit + " for its figures · double-tap or pinch to zoom · drag to pan"
          : "hover over " + a + unit + " for its figures · double-click to zoom · drag to pan");
        leg.appendChild(h);
      }

      /* table fallback: the districts, densest first */
      const tab = document.getElementById("maptab-" + key);
      if (tab) {
        const order = dists.filter(d => d.nm).sort((a, b) => b.v - a.v);
        const LIMIT = order.length > 40 ? 25 : order.length;     /* Rome's 131 zones would be a wall */
        const head = cover
          ? `<tr><th>${cap(unit)}</th><th>Plots</th><th>Share of the land</th></tr>`
          : `<tr><th>${cap(unit)}</th><th>${cap(c.tenure)}</th><th>Per km²</th></tr>`;
        const rows = order.slice(0, LIMIT).map(d => cover
          ? `<tr><td>${distName(d)}</td><td>${fmtN(d.plots)}</td><td>${pct(d.cover)}</td></tr>`
          : `<tr><td>${distName(d)}</td><td>${fmtN(d.n)}</td><td>${fmtN(Math.round(d.v))}</td></tr>`);
        const total = dists.reduce((a, d) => a + (cover ? d.plots : d.n), 0);
        tab.innerHTML = `<table><thead>${head}</thead><tbody>${rows.join("")}</tbody></table>` +
          `<p class="mt-foot">${order.length > LIMIT ? `The ${LIMIT} densest of ${fmtN(order.length)}. ` : ""}` +
          (cover ? `${fmtN(total)} plots in all.` : `${fmtN(total)} ${c.tenure} in all.`) + `</p>`;
      }

      /* the switch: each view shows its own layer and a subtitle and key
         note that say what is drawn. The hover names the district in both. */
      const sub = host.closest("figure").querySelector(".viz-sub");
      const subDist = sub ? sub.innerHTML : "";
      const subHeat = cover
        ? "Share of the ground covered by the city housing companies' plots, smoothed over 500 m"
        : AREAL[key]
          ? `${cap(c.tenure)} per km² · each ${AREAL[key]}'s count spread over its area, smoothed over 500 m`
          : `${cap(c.tenure)} per km², smoothed over 500 m · one colour scale for every city`;
      const aside = mapBar.querySelector(".aside");
      function setAside(v) {
        aside.textContent = v === "heat"
          ? (cover ? "share of the ground covered by the companies' plots, smoothed over 500 m" : `${c.tenure} per km², smoothed over 500 m`) +
            ` · ${peakText}` + (cover ? "" : " · one scale for all five cities with home counts")
          : (cover ? `share of each ${unit}'s land held by the companies` : `${c.tenure} per km² of each ${unit}`) +
            (cover ? "" : " · one scale for all five cities with home counts");
      }
      mapViews.push({ set(v) {
        const on = v === "heat";
        view.dataset.mode = v;
        heat.style.display = heatLines.style.display = on ? "" : "none";
        gDist.style.display = on ? "none" : "";
        mapBar.querySelector(".hl-low").hidden = on;
        setAside(v);
        if (sub) sub.innerHTML = on ? subHeat : subDist;
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
