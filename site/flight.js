// SPDX-License-Identifier: MIT OR Apache-2.0
// The page's two figures, drawn at the width they're shown so their words stay 13 px at every size. The page
// carries a drawing of each, so they show without this script; the script redraws them to fit, and lets a reader
// move along the flight.
// The flight is HPR Sim 0.1.0's own recording of Loft Demo 54mm on an H54 (`hpr sim ... --export`), one sample
// every 0.1 s plus its events, in feet and feet per second.
(() => {
  const NS = "http://www.w3.org/2000/svg";
  const STILL = new URLSearchParams(location.search).has("still") || matchMedia("(prefers-reduced-motion: reduce)").matches;
  const fmt = (n) => Math.round(n).toLocaleString("en-US");
  const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");

  /* ------------------------------------------------------------------ the flight */
  const D = [[0.0,2,0],[0.1,3,13],[0.2,5,28],[0.3,8,40],[0.4,13,52],[0.5,18,63],[0.6,25,74],[0.7,33,85],[0.8,42,95],[0.9,52,106],[1.0,63,115],[1.1,75,125],[1.2,88,134],[1.3,102,143],[1.4,117,152],[1.5,133,160],[1.6,149,168],[1.7,166,176],[1.8,184,182],[1.9,203,189],[2.0,222,195],[2.1,242,200],[2.2,262,204],[2.3,283,208],[2.4,304,211],[2.5,325,214],[2.6,346,215],[2.7,368,216],[2.8,389,216],[2.9,411,215],[3.0,432,213],[3.1,454,211],[3.2,474,207],[3.3,495,204],[3.4,515,200],[3.5,535,196],[3.6,554,192],[3.7,573,188],[3.8,592,184],[3.9,610,180],[4.0,628,176],[4.1,645,172],[4.2,662,168],[4.3,679,164],[4.4,695,160],[4.5,711,157],[4.6,726,153],[4.7,741,149],[4.8,756,145],[4.9,771,142],[5.0,785,138],[5.1,798,135],[5.2,811,131],[5.3,824,127],[5.4,837,124],[5.5,849,120],[5.6,861,117],[5.7,872,113],[5.8,884,110],[5.9,894,106],[6.0,905,103],[6.1,915,99],[6.2,925,96],[6.3,934,92],[6.4,943,89],[6.5,952,86],[6.6,960,82],[6.7,968,79],[6.8,976,76],[6.9,983,72],[7.0,990,69],[7.1,997,66],[7.2,1004,62],[7.3,1010,59],[7.4,1015,56],[7.5,1021,52],[7.6,1026,49],[7.7,1031,46],[7.8,1035,43],[7.9,1039,39],[8.0,1043,36],[8.1,1046,33],[8.2,1049,30],[8.3,1052,26],[8.4,1055,23],[8.5,1057,20],[8.6,1059,17],[8.7,1060,14],[8.8,1061,10],[8.9,1062,7],[9.0,1063,4],[9.1,1063,1],[9.2,1063,3],[9.3,1063,6],[9.4,1062,9],[9.5,1061,12],[9.6,1059,15],[9.7,1058,18],[9.8,1056,20],[9.9,1054,23],[10.0,1051,25],[10.1,1049,27],[10.2,1046,29],[10.3,1043,31],[10.4,1040,33],[10.5,1036,34],[10.6,1033,36],[10.7,1029,37],[10.8,1025,38],[10.9,1021,39],[11.0,1017,40],[11.1,1013,41],[11.2,1009,42],[11.3,1005,42],[11.4,1001,43],[11.5,997,43],[11.6,992,44],[11.7,988,44],[11.8,983,44],[11.9,979,45],[12.0,974,45],[12.1,970,45],[12.2,965,45],[12.3,961,45],[12.4,956,46],[12.5,952,46],[12.6,947,46],[12.7,943,46],[12.8,938,46],[12.9,933,46],[13.0,929,46],[13.1,924,46],[13.2,920,46],[13.3,915,46],[13.4,910,46],[13.5,906,46],[13.6,901,46],[13.7,896,46],[13.8,892,46],[13.9,887,46],[14.0,882,46],[14.1,878,46],[14.2,873,46],[14.3,869,46],[14.4,864,46],[14.5,859,46],[14.6,855,46],[14.7,850,46],[14.8,845,46],[14.9,841,46],[15.0,836,46],[15.1,831,47],[15.2,827,47],[15.3,822,46],[15.4,817,46],[15.5,813,46],[15.6,808,46],[15.7,803,46],[15.8,799,46],[15.9,794,46],[16.0,790,46],[16.1,785,46],[16.2,780,46],[16.3,776,46],[16.4,771,46],[16.5,766,46],[16.6,762,46],[16.7,757,46],[16.8,752,46],[16.9,748,46],[17.0,743,46],[17.1,738,46],[17.2,734,46],[17.3,729,46],[17.4,724,46],[17.5,720,46],[17.6,715,46],[17.7,711,46],[17.8,706,46],[17.9,701,46],[18.0,697,46],[18.1,692,46],[18.2,687,46],[18.3,683,46],[18.4,678,46],[18.5,673,46],[18.6,669,46],[18.7,664,46],[18.8,659,46],[18.9,655,46],[19.0,650,46],[19.1,646,46],[19.2,641,46],[19.3,636,46],[19.4,632,46],[19.5,627,46],[19.6,622,46],[19.7,618,46],[19.8,613,46],[19.9,608,46],[20.0,604,46],[20.1,599,46],[20.2,595,46],[20.3,590,46],[20.4,585,46],[20.5,581,46],[20.6,576,46],[20.7,571,46],[20.8,567,46],[20.9,562,46],[21.0,557,46],[21.1,553,46],[21.2,548,46],[21.3,544,46],[21.4,539,46],[21.5,534,46],[21.6,530,46],[21.7,525,46],[21.8,520,46],[21.9,516,46],[22.0,511,46],[22.1,506,46],[22.2,502,46],[22.3,497,46],[22.4,493,46],[22.5,489,32],[22.6,486,25],[22.7,484,21],[22.8,482,19],[22.9,480,18],[23.0,478,17],[23.1,476,16],[23.2,475,16],[23.3,473,16],[23.4,472,16],[23.5,470,16],[23.6,469,16],[23.7,467,16],[23.8,465,16],[23.9,464,16],[24.0,462,16],[24.1,461,16],[24.2,459,16],[24.3,458,15],[24.4,456,15],[24.5,455,15],[24.6,453,15],[24.7,451,15],[24.8,450,15],[24.9,448,15],[25.0,447,15],[25.1,445,15],[25.2,444,15],[25.3,442,15],[25.4,441,15],[25.5,439,15],[25.6,438,15],[25.7,436,15],[25.8,434,15],[25.9,433,15],[26.0,431,15],[26.1,430,15],[26.2,428,15],[26.3,427,15],[26.4,425,15],[26.5,424,15],[26.6,422,15],[26.7,421,15],[26.8,419,15],[26.9,417,15],[27.0,416,15],[27.1,414,15],[27.2,413,15],[27.3,411,15],[27.4,410,15],[27.5,408,15],[27.6,407,15],[27.7,405,15],[27.8,403,15],[27.9,402,15],[28.0,400,15],[28.1,399,15],[28.2,397,15],[28.3,396,15],[28.4,394,15],[28.5,393,15],[28.6,391,15],[28.7,390,15],[28.8,388,15],[28.9,386,15],[29.0,385,15],[29.1,383,15],[29.2,382,15],[29.3,380,15],[29.4,379,15],[29.5,377,15],[29.6,376,15],[29.7,374,15],[29.8,373,15],[29.9,371,15],[30.0,369,15],[30.1,368,15],[30.2,366,15],[30.3,365,15],[30.4,363,15],[30.5,362,15],[30.6,360,15],[30.7,359,15],[30.8,357,15],[30.9,356,15],[31.0,354,15],[31.1,352,15],[31.2,351,15],[31.3,349,15],[31.4,348,15],[31.5,346,15],[31.6,345,15],[31.7,343,15],[31.8,342,15],[31.9,340,15],[32.0,338,15],[32.1,337,15],[32.2,335,15],[32.3,334,15],[32.4,332,15],[32.5,331,15],[32.6,329,15],[32.7,328,15],[32.8,326,15],[32.9,325,15],[33.0,323,15],[33.1,321,15],[33.2,320,15],[33.3,318,15],[33.4,317,15],[33.5,315,15],[33.6,314,15],[33.7,312,15],[33.8,311,15],[33.9,309,15],[34.0,308,15],[34.1,306,15],[34.2,304,15],[34.3,303,15],[34.4,301,15],[34.5,300,15],[34.6,298,15],[34.7,297,15],[34.8,295,15],[34.9,294,15],[35.0,292,15],[35.1,291,15],[35.2,289,15],[35.3,287,15],[35.4,286,15],[35.5,284,15],[35.6,283,15],[35.7,281,15],[35.8,280,15],[35.9,278,15],[36.0,277,15],[36.1,275,15],[36.2,274,15],[36.3,272,15],[36.4,270,15],[36.5,269,15],[36.6,267,15],[36.7,266,15],[36.8,264,15],[36.9,263,15],[37.0,261,15],[37.1,260,15],[37.2,258,15],[37.3,257,15],[37.4,255,15],[37.5,253,15],[37.6,252,15],[37.7,250,15],[37.8,249,15],[37.9,247,15],[38.0,246,15],[38.1,244,15],[38.2,243,15],[38.3,241,15],[38.4,240,15],[38.5,238,15],[38.6,237,15],[38.7,235,15],[38.8,233,15],[38.9,232,15],[39.0,230,15],[39.1,229,15],[39.2,227,15],[39.3,226,15],[39.4,224,15],[39.5,223,15],[39.6,221,15],[39.7,220,15],[39.8,218,15],[39.9,216,15],[40.0,215,15],[40.1,213,15],[40.2,212,15],[40.3,210,15],[40.4,209,15],[40.5,207,15],[40.6,206,15],[40.7,204,15],[40.8,203,15],[40.9,201,15],[41.0,199,15],[41.1,198,15],[41.2,196,15],[41.3,195,15],[41.4,193,15],[41.5,192,15],[41.6,190,15],[41.7,189,15],[41.8,187,15],[41.9,186,15],[42.0,184,15],[42.1,182,15],[42.2,181,15],[42.3,179,15],[42.4,178,15],[42.5,176,15],[42.6,175,15],[42.7,173,15],[42.8,172,15],[42.9,170,15],[43.0,169,15],[43.1,167,15],[43.2,166,15],[43.3,164,15],[43.4,162,15],[43.5,161,15],[43.6,159,15],[43.7,158,15],[43.8,156,15],[43.9,155,15],[44.0,153,15],[44.1,152,15],[44.2,150,15],[44.3,149,15],[44.4,147,15],[44.5,145,15],[44.6,144,15],[44.7,142,15],[44.8,141,15],[44.9,139,15],[45.0,138,15],[45.1,136,15],[45.2,135,15],[45.3,133,15],[45.4,132,15],[45.5,130,15],[45.6,128,15],[45.7,127,15],[45.8,125,15],[45.9,124,15],[46.0,122,15],[46.1,121,15],[46.2,119,15],[46.3,118,15],[46.4,116,15],[46.5,115,15],[46.6,113,15],[46.7,112,15],[46.8,110,15],[46.9,108,15],[47.0,107,15],[47.1,105,15],[47.2,104,15],[47.3,102,15],[47.4,101,15],[47.5,99,15],[47.6,98,15],[47.7,96,15],[47.8,95,15],[47.9,93,15],[48.0,92,15],[48.1,90,15],[48.2,88,15],[48.3,87,15],[48.4,85,15],[48.5,84,15],[48.6,82,15],[48.7,81,15],[48.8,79,15],[48.9,78,15],[49.0,76,15],[49.1,75,15],[49.2,73,15],[49.3,71,15],[49.4,70,15],[49.5,68,15],[49.6,67,15],[49.7,65,15],[49.8,64,15],[49.9,62,15],[50.0,61,15],[50.1,59,15],[50.2,58,15],[50.3,56,15],[50.4,55,15],[50.5,53,15],[50.6,51,15],[50.7,50,15],[50.8,48,15],[50.9,47,15],[51.0,45,15],[51.1,44,15],[51.2,42,15],[51.3,41,15],[51.4,39,15],[51.5,38,15],[51.6,36,15],[51.7,35,15],[51.8,33,15],[51.9,31,15],[52.0,30,15],[52.1,28,15],[52.2,27,15],[52.3,25,15],[52.4,24,15],[52.5,22,15],[52.6,21,15],[52.7,19,15],[52.8,18,15],[52.9,16,15],[53.0,15,15],[53.1,13,15],[53.2,11,15],[53.3,10,15],[53.4,8,15],[53.5,7,15],[53.6,5,15],[53.7,4,15],[53.8,2,15],[53.9,1,15],[53.94,0,15]].filter(([t]) => ![3.5, 9.1, 22.4].includes(t));
  // The events, with the numbers `hpr sim` prints for them.
  const EV = [[3.5, 535, 196, "Burnout"], [9.12, 1063, 0, "Apogee"], [22.41, 492, 46, "Main opens"], [53.94, 0, 15, "Landing"]];
  for (const e of EV) D.push([e[0], e[1], e[2]]);
  D.sort((a, b) => a[0] - b[0]);
  const T_END = 53.94;
  const phase = (t) => {
    const at = EV.find((e) => Math.abs(e[0] - t) < 0.001);
    if (at) return { Burnout: "Burnout: the motor is spent", Apogee: "Apogee: the drogue fires", "Main opens": "The main opens", Landing: "On the ground" }[at[3]];
    if (t < 0.27) return "On the rail";
    if (t < 3.5) return "Motor burning";
    if (t < 9.12) return "Coasting up";
    if (t < 22.41) return "Falling under the drogue";
    return "Falling under the main";
  };

  const fig = document.querySelector(".flight");
  const hero = document.querySelector(".hero");
  const copy = document.querySelector(".hero-copy");
  if (fig) {
    const plot = fig.querySelector(".plot");
    const out = {}; for (const k of ["t", "h", "v", "p"]) out[k] = fig.querySelector(`[data-r="${k}"]`);
    let S = null, cur = D.findIndex((d) => d[0] === 9.12), played = STILL, anim = 0;

    const show = (i) => {
      cur = Math.max(0, Math.min(D.length - 1, i));
      const [t, h, v] = D[cur];
      out.t.innerHTML = `${t.toFixed(t % 0.1 > 0.001 && 0.1 - (t % 0.1) > 0.001 ? 2 : 1)}<small>s</small>`;
      out.h.innerHTML = `${fmt(h)}<small>ft</small>`;
      out.v.innerHTML = `${fmt(v)}<small>ft/s</small>`;
      out.p.textContent = phase(t);
      plot.setAttribute("aria-valuenow", t.toFixed(2));
      plot.setAttribute("aria-valuetext", `${t.toFixed(1)} seconds: ${fmt(h)} feet, ${fmt(v)} feet per second. ${phase(t)}.`);
      if (S) {
        const x = S.X(t), y = S.Y(h);
        S.line.setAttribute("x1", x); S.line.setAttribute("x2", x); S.line.setAttribute("y1", S.Y(0)); S.line.setAttribute("y2", y);
        S.dot.setAttribute("cx", x); S.dot.setAttribute("cy", y);
      }
    };

    const draw = () => {
      const W = Math.round(plot.clientWidth);
      if (!W) return;
      const overlay = matchMedia("(min-width: 1080px)").matches;
      hero.classList.toggle("overlay", overlay);
      const narrow = W < 560;
      const ml = 66, mr = 8, mt = 30, mb = 34, xmax = 55;
      const pw = W - ml - mr;
      const X = (t) => ml + (t / xmax) * pw;
      let H = Math.round(Math.max(250, Math.min(440, W * 0.58))), ymax = 1200;
      if (overlay) {
        // The words sit in the sky above the descent: grow the chart until the flight passes under them, with room.
        const pr = plot.getBoundingClientRect(), cr = copy.getBoundingClientRect();
        const left = cr.left - pr.left - 32, bottom = cr.bottom - pr.top + 40;
        let hi = 0; for (const [t, h] of D) if (X(t) >= left) hi = Math.max(hi, h);
        for (H = 520; H < 1000; H += 10) {
          const ph = H - mt - mb, frac = (bottom - mt) / ph;
          if (frac < 0.85) { ymax = Math.max(1200, hi / (1 - frac)); if (ymax <= 1500) break; }
        }
      }
      ymax = Math.ceil(ymax / 50) * 50;
      const ph = H - mt - mb;
      const Y = (h) => mt + ph * (1 - h / ymax);
      const yt = [0, 500, 1000, 1500].filter((v) => v <= ymax);
      const xt = narrow ? [0, 20, 40] : [0, 10, 20, 30, 40, 50];
      const path = D.map(([t, h], i) => `${i ? "L" : "M"}${X(t).toFixed(1)} ${Y(h).toFixed(1)}`).join(" ");
      const area = `${path} L${X(T_END).toFixed(1)} ${Y(0)} L${X(0)} ${Y(0)} Z`;
      const labels = narrow
        ? [[9.12, 1063, "Apogee", "1,063 ft", "top"], [22.41, 492, "Main", "", "right"]]
        : [[3.5, 535, "Burnout", "535 ft", "upleft"], [9.12, 1063, "Apogee", "1,063 ft at 9.1 s", "top"], [22.41, 492, "Main opens", "492 ft", "left"]];
      const lab = ([t, h, name, val, side]) => {
        const x = X(t), y = Y(h);
        const [lx, ly, anchor] = side === "top" ? [x - 6, y - 14, "start"] : side === "right" ? [x + 12, y + 5, "start"]
          : side === "upleft" ? [x - 10, y - 10, "end"] : [x - 12, y + 22, "end"];
        return `<g class="late${played ? "" : " wait"}" data-t="${t}"${side === "upleft" ? ' data-fit="left"' : ""}><circle class="ev-dot" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="4.5"/>` +
          `<text class="ev" x="${lx.toFixed(1)}" y="${ly.toFixed(1)}" text-anchor="${anchor}">${esc(name)}${val ? ` <tspan class="ev-v">${esc(val)}</tspan>` : ""}</text></g>`;
      };
      const reveal = played ? W : 0;
      plot.innerHTML = `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" aria-hidden="true" focusable="false">
<defs><linearGradient id="fl-g" gradientUnits="userSpaceOnUse" x1="${X(0)}" y1="0" x2="${X(T_END).toFixed(1)}" y2="0"><stop offset="0" stop-color="#DA7C30"/><stop offset=".35" stop-color="#D07D7A"/><stop offset=".65" stop-color="#A188CB"/><stop offset="1" stop-color="#768DF5"/></linearGradient>
<linearGradient id="fl-f" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".26"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
<mask id="fl-m"><rect x="0" y="${mt}" width="${W}" height="${ph}" fill="url(#fl-f)"/></mask>
</defs>
${yt.map((v, i) => `<line class="tick" x1="${ml - 6}" x2="${ml}" y1="${Y(v)}" y2="${Y(v)}"/><text x="${ml - 10}" y="${Y(v) + 4.5}" text-anchor="end">${fmt(v)}${i === yt.length - 1 ? " ft" : ""}</text>`).join("")}
<line class="axis" x1="${ml}" x2="${ml + pw}" y1="${Y(0)}" y2="${Y(0)}"/>
${xt.map((v, i) => `<text x="${X(v)}" y="${Y(0) + 22}" text-anchor="${i ? "middle" : "start"}">${v}${i === xt.length - 1 ? " s" : ""}</text>`).join("")}
<g class="rv"><path d="${area}" fill="url(#fl-g)" mask="url(#fl-m)"/><path class="under" d="${path}"/>
<path d="${path}" fill="none" stroke="url(#fl-g)" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/></g>
<line class="scrub-line" x1="0" x2="0" y1="0" y2="0"/>
${labels.map(lab).join("")}
<circle class="scrub-dot" r="5"/>
</svg>`;
      const svg = plot.firstElementChild;
      // A label set to the left of its point keeps its value only while the whole label clears the chart's left edge.
      for (const g of svg.querySelectorAll('[data-fit="left"]')) {
        const text = g.querySelector("text"), v = text.querySelector(".ev-v");
        if (v && +text.getAttribute("x") - text.getComputedTextLength() < 2) v.remove();
      }
      S = { X, Y, ml, pw, xmax, line: svg.querySelector(".scrub-line"), dot: svg.querySelector(".scrub-dot"), rv: svg.querySelector(".rv"), W };
      S.rv.style.clipPath = `inset(0 ${W - reveal}px 0 0)`; // set through the CSSOM: the security policy refuses style attributes
      show(cur);
      if (!played) play();
    };

    // One moment on arrival: the flight draws itself, each event appearing as the line reaches it.
    const play = () => {
      played = true;
      cancelAnimationFrame(anim);
      const start = performance.now(), dur = 2400;
      const step = (now) => {
        const k = Math.min(1, (now - start) / dur), e = 1 - Math.pow(1 - k, 2.2);
        const x = S.X(e * T_END) + 6;
        S.rv.style.clipPath = `inset(0 ${k < 1 ? Math.max(0, S.W - x) : 0}px 0 0)`;
        for (const g of plot.querySelectorAll(".late.wait")) if (S.X(+g.dataset.t) <= x) g.classList.remove("wait");
        if (k < 1) anim = requestAnimationFrame(step);
      };
      anim = requestAnimationFrame(step);
    };
    const finish = () => {
      if (!S) return;
      cancelAnimationFrame(anim); S.rv.style.clipPath = "inset(0 0px 0 0)";
      for (const g of plot.querySelectorAll(".late.wait")) g.classList.remove("wait");
    };

    const nearest = (t) => { let b = 0; for (let i = 1; i < D.length; i++) if (Math.abs(D[i][0] - t) < Math.abs(D[b][0] - t)) b = i; return b; };
    const at = (e) => {
      const r = plot.getBoundingClientRect();
      const t = ((e.clientX - r.left - S.ml) / S.pw) * S.xmax;
      finish(); show(nearest(Math.max(0, Math.min(T_END, t))));
    };
    plot.addEventListener("pointermove", (e) => { if (S) at(e); });
    plot.addEventListener("pointerdown", (e) => { if (S) at(e); });
    plot.addEventListener("keydown", (e) => {
      const t = D[cur][0], big = e.shiftKey ? 5 : 0.5;
      const go = { ArrowRight: t + big, ArrowUp: t + big, ArrowLeft: t - big, ArrowDown: t - big, PageUp: t + 5, PageDown: t - 5, Home: 0, End: T_END }[e.key];
      if (go === undefined) return;
      e.preventDefault(); finish(); show(nearest(Math.max(0, Math.min(T_END, go))));
    });

    // Redraw on the next frame, and only for a new width: drawing changes the figure's height, and a redraw run while
    // the browser delivers resize notifications (as a promise's callback can be) is a ResizeObserver loop.
    let queued = 0, lastW = -1;
    const redraw = () => { cancelAnimationFrame(queued); queued = requestAnimationFrame(() => { lastW = plot.clientWidth; const p = played; draw(); if (p) finish(); }); };
    new ResizeObserver(() => { if (plot.clientWidth !== lastW) redraw(); }).observe(plot);
    if (document.fonts) document.fonts.ready.then(redraw);
  }

  /* ------------------------------------------------------------------ the 60-flight check */
  // Misses in steps of 5%, from -35% to +35%; the end steps hold every flight past 30%.
  const HIST = [[-35, 0], [-30, 0], [-25, 0], [-20, 1], [-15, 4], [-10, 6], [-5, 4], [0, 10], [5, 12], [10, 10], [15, 2], [20, 5], [25, 4], [30, 2]];
  const MEAN = 7.76;
  const hf = document.querySelector(".hist-plot");
  if (hf) {
    const drawHist = (above = false) => {
      const W = Math.round(hf.clientWidth); if (!W) return;
      const narrow = W < 520;
      const ml = 30, mr = 6, mb = 52, mt = above ? 58 : 34;   // the band's label gets a line above the band when it can't fit inside
      const H = Math.round(Math.max(250, Math.min(340, W * 0.4)));
      const pw = W - ml - mr, ph = H - mt - mb, lo = -35, hi = 35, cmax = 16;
      const X = (v) => ml + ((v - lo) / (hi - lo)) * pw;
      const Y = (c) => mt + ph - (c / cmax) * ph;
      const xt = narrow ? [-30, -10, 10, 30] : [-30, -20, -10, 0, 10, 20, 30];
      const sign = (v) => (v > 0 ? "+" : v < 0 ? "−" : "") + Math.abs(v) + "%";
      const gap = narrow ? 2 : 3;
      const mx = X(MEAN), meanRight = mx + 6 + 104 < W;
      const bin = HIST.find(([b]) => MEAN >= b && MEAN < b + 5), cnt = Y(bin[1]) - 6;   // the count over the bar the average falls in
      const parted = Math.abs(mx - X(bin[0] + 2.5)) < 14;                             // its digits are about 16 px wide
      const meanLine = parted
        ? `<line class="mean" x1="${mx}" x2="${mx}" y1="${mt + 2}" y2="${cnt - 15}"/><line class="mean" x1="${mx}" x2="${mx}" y1="${cnt + 4}" y2="${Y(0)}"/>`
        : `<line class="mean" x1="${mx}" x2="${mx}" y1="${mt + 2}" y2="${Y(0)}"/>`;
      hf.innerHTML = `<svg class="fs-chart hist" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" aria-hidden="true" focusable="false">
<rect class="within" x="${X(-10)}" y="${mt - 26}" width="${X(10) - X(-10)}" height="${ph + 26}"/>
<text class="t-ink band-label" x="${X(-10) + 8}" y="${mt - 9}">32 within 10%</text>
${[0, 5, 10].map((c) => `<line class="grid" x1="${ml}" x2="${ml + pw}" y1="${Y(c)}" y2="${Y(c)}"/><text x="${ml - 8}" y="${Y(c) + 4.5}" text-anchor="end">${c}</text>`).join("")}
${HIST.filter(([, c]) => c).map(([b, c]) => `<rect class="bar${b >= -10 && b < 10 ? " in" : ""}" x="${X(b) + gap / 2}" y="${Y(c)}" width="${X(b + 5) - X(b) - gap}" height="${Y(0) - Y(c)}"/>`).join("")}
<line class="axis" x1="${ml}" x2="${ml + pw}" y1="${Y(0)}" y2="${Y(0)}"/>
${meanLine}
${HIST.filter(([, c]) => c).map(([b, c]) => `<text class="t-ink${b >= -10 && b < 10 ? " in" : ""}" x="${X(b + 2.5)}" y="${Y(c) - 6}" text-anchor="middle">${c}</text>`).join("")}
<text class="t-mean" x="${meanRight ? mx + 6 : mx - 6}" y="${mt + 12}" text-anchor="${meanRight ? "start" : "end"}">average +7.8%</text>
${xt.map((v) => `<text x="${X(v)}" y="${Y(0) + 20}" text-anchor="middle">${sign(v)}</text>`).join("")}
<text x="${ml}" y="${Y(0) + 42}">read low</text><text x="${ml + pw}" y="${Y(0) + 42}" text-anchor="end">read high</text>
</svg>`;
      const band = hf.querySelector(".band-label");
      if (!above && band.getComputedTextLength() + 16 > X(10) - X(-10)) return drawHist(true);
      if (above) { band.setAttribute("x", X(-10)); band.setAttribute("y", mt - 34); }
    };
    let hq = 0, hw = -1;
    new ResizeObserver(() => { if (hf.clientWidth === hw) return; cancelAnimationFrame(hq); hq = requestAnimationFrame(() => { hw = hf.clientWidth; drawHist(); }); }).observe(hf);
    if (document.fonts) document.fonts.ready.then(() => { cancelAnimationFrame(hq); hq = requestAnimationFrame(() => drawHist()); });   // it measures its words
  }
})();
