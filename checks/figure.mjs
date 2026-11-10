#!/usr/bin/env node
// Checks the front page's flight: `node checks/figure.mjs`. On a wide window the headline and its
// buttons sit in the sky over the flight, and the page's script grows the chart until the flight
// passes under them. This lays the page out at every width check.mjs uses, in the light and field
// themes, and fails when a point of the flight's line, or an event's label, comes within 16 px of
// the words, or when a label of either figure reaches past its drawing. `--browser webkit` checks
// in WebKit instead of Chrome.

import { BROWSERS, WIDTHS, browserName, launch, serve } from "./run.mjs";

const PAD = 16;
let browser;
const named = process.argv.indexOf("--browser");
try {
  browser = named !== -1 ? process.argv[named + 1] ?? "" : browserName();
  if (!Object.hasOwn(BROWSERS, browser)) throw new Error(`--browser takes ${Object.keys(BROWSERS).join(" or ")}`);
} catch (error) {
  console.error(error.message);
  process.exit(2);
}

const MEASURE = `(() => {
  const pad = ${PAD}, out = [];
  const copy = document.querySelector('.hero-copy').getBoundingClientRect();
  const near = (r) => r.right > copy.left - pad && r.left < copy.right + pad && r.bottom > copy.top - pad && r.top < copy.bottom + pad;
  const svg = document.querySelector('.flight .plot svg');
  const line = svg.querySelector('path[stroke]');
  const m = line.getScreenCTM();
  for (let i = 0, n = line.getTotalLength(); i <= n; i += 2) {
    const p = line.getPointAtLength(i), x = p.x * m.a + m.c * p.y + m.e, y = p.x * m.b + p.y * m.d + m.f;
    if (near({ left: x, right: x, top: y, bottom: y })) { out.push('the flight passes within ' + pad + ' px of the words at (' + Math.round(x) + ', ' + Math.round(y) + ')'); break; }
  }
  for (const fig of document.querySelectorAll('.flight .plot svg, .hist-plot svg')) {
    const box = fig.getBoundingClientRect();
    for (const t of fig.querySelectorAll('text')) {
      const r = t.getBoundingClientRect();
      if (fig.closest('.flight') && near(r)) out.push('"' + t.textContent + '" comes within ' + pad + ' px of the words');
      if (r.left < box.left - 0.5 || r.right > box.right + 0.5 || r.top < box.top - 0.5) out.push('"' + t.textContent + '" reaches past its drawing');
    }
  }
  return out;
})()`;

const server = await serve();
const engine = await launch(browser);
const failures = [];
try {
  const page = await engine.newPage();
  for (const width of WIDTHS) {
    for (const theme of ["light", "field"]) {
      await page.emulate(width, 900, "light");
      await page.goto(`${server.url}/?still`);
      if (theme === "field") await page.evaluate(`(() => { document.querySelector('[data-set-theme="field"]').click(); return true; })()`);
      // Two frames: the script draws on the next frame after a resize, and once the fonts are in.
      await page.evaluate("new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(() => r(true), 50))))");
      for (const problem of await page.evaluate(MEASURE)) failures.push(`${theme} at ${width} px: ${problem}`);
    }
  }
} finally {
  await engine.close();
  await server.close();
}
for (const line of failures) console.log(`FAIL ${line}`);
const layouts = WIDTHS.length * 2;
if (failures.length) {
  console.log(`${failures.length} problem(s) in ${layouts} layouts in ${browser}`);
  process.exit(1);
}
console.log(`ok in ${browser}: the flight and its labels stay clear of the headline in ${layouts} layouts, and every label stays in its drawing`);
