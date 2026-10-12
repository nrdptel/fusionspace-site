#!/usr/bin/env node
// Checks the site: `node checks/check.mjs`. Lays every page out at each width from 320 to
// 1,920 px in the light, dark and field themes and fails on anything clipped or crowded, on a
// comparative claim with no committed comparison beside it, and on anything loaded from another
// site. `--widths 320,1280` checks only those widths (for a quick look while editing).

import { readdirSync } from "node:fs";
import { join } from "node:path";
import { ROOT, WIDTHS, check, report, serve } from "./run.mjs";

// Every page of the site, so a new one can't be left out of the check.
const PAGES = readdirSync(join(ROOT, "site"))
  .filter((name) => name.endsWith(".html"))
  .sort()
  .map((name) => (name === "index.html" ? "/" : `/${name}`));

let widths = WIDTHS;
const flag = process.argv.indexOf("--widths");
if (flag !== -1) {
  widths = (process.argv[flag + 1] ?? "").split(",").map(Number);
  if (!widths.length || widths.some((width) => !Number.isInteger(width) || width < 1)) {
    console.error("--widths takes a comma-separated list of whole pixel widths, such as 320,1280");
    process.exit(2);
  }
}

const started = Date.now();
const server = await serve();
let problems;
try {
  problems = await check(server.url, PAGES, { widths });
} finally {
  await server.close();
}
const seconds = ((Date.now() - started) / 1000).toFixed(1);
const layouts = PAGES.length * widths.length * 3;
if (problems.length) {
  for (const line of report(problems)) console.log(`FAIL ${line}`);
  console.log(`${problems.length} problem(s) in ${layouts} layouts (${seconds} s)`);
  process.exit(1);
}
console.log(`ok: ${PAGES.length} page(s), ${widths.length} widths from ${Math.min(...widths)} to ${Math.max(...widths)} px, 3 themes: ${layouts} layouts with nothing clipped, no unbacked claim, nothing from another site (${seconds} s)`);
