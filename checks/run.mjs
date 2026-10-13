// The page checks, shared by the command line (check.mjs) and the tests (test.mjs): the layout at
// every width in each theme, comparative claims, and where the page loads things from.

import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { readFileSync, readdirSync } from "node:fs";
import { extname, join, normalize, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import * as chrome from "./chrome.mjs";
import * as webkit from "./webkit.mjs";

const here = fileURLToPath(new URL(".", import.meta.url));
export const ROOT = resolve(here, "..");
const MEASURE = readFileSync(join(here, "measure.js"), "utf8");
const CLAIMS = readFileSync(join(here, "claims.js"), "utf8");

/**
 * Every width from 320 to 1,920 px, 40 px apart (41 widths), and both sides of each breakpoint
 * the site's stylesheets set (a `min-width: 720px` adds 719 and 720), so each layout is checked
 * at its narrowest and widest.
 */
export const WIDTHS = (() => {
  const widths = new Set(Array.from({ length: 41 }, (_, i) => 320 + 40 * i));
  const site = join(ROOT, "site");
  for (const name of readdirSync(site).filter((n) => n.endsWith(".css"))) {
    for (const [, kind, value] of readFileSync(join(site, name), "utf8").matchAll(/\((min|max)-width:\s*(\d+(?:\.\d+)?)px\)/g)) {
      const edge = Math.round(Number(value));
      for (const width of kind === "min" ? [edge - 1, edge] : [edge, edge + 1]) {
        if (width >= 320 && width <= 1920) widths.add(width);
      }
    }
  }
  return [...widths].sort((a, b) => a - b);
})();
/**
 * The themes: light and dark as the system asks for them (`prefers-color-scheme`, the switch on
 * Auto), and field, the outdoor theme, chosen on the switch.
 */
export const THEMES = ["light", "dark", "field"];

/**
 * The engines the page is checked in: Chrome (Blink), and WebKit, which Safari is built on. Each
 * lays some boxes out differently, so a page that fits in one can be clipped in the other.
 * `CHECK_BROWSER` picks one; Chrome is the default, since it needs nothing installed beyond itself.
 */
export const BROWSERS = { chrome, webkit };
export function browserName() {
  const name = process.env.CHECK_BROWSER || "chrome";
  if (!Object.hasOwn(BROWSERS, name)) throw new Error(`CHECK_BROWSER is "${name}"; it takes ${Object.keys(BROWSERS).join(" or ")}`);
  return name;
}
/** Starts the browser `CHECK_BROWSER` names (Chrome unless it says otherwise). */
export function launch(name = browserName()) {
  return BROWSERS[name].launch();
}
const HEIGHT_PX = 900;

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".woff2": "font/woff2",
  ".txt": "text/plain; charset=utf-8",
  ".webmanifest": "application/manifest+json",
};

/**
 * Serves `site/` at `/`, and the checks' own pages built to fail at `/canaries/`, on a free port
 * of 127.0.0.1. Resolves to { url, close }.
 */
export function serve() {
  const roots = { "/canaries/": join(here, "canaries"), "/": join(ROOT, "site") };
  const headers = siteHeaders();
  const server = createServer(async (request, response) => {
    let path;
    try {
      path = decodeURIComponent(new URL(request.url, "http://localhost").pathname);
    } catch {
      response.writeHead(400).end();
      return;
    }
    const [prefix, root] = Object.entries(roots).find(([prefix]) => path.startsWith(prefix));
    let file = normalize(join(root, path.slice(prefix.length)));
    if (!file.startsWith(root + sep) && file !== root) {
      response.writeHead(403).end();
      return;
    }
    try {
      if ((await stat(file)).isDirectory()) file = join(file, "index.html");
      const body = await readFile(file);
      response.writeHead(200, {
        ...(prefix === "/" ? headers : {}),
        "content-type": TYPES[extname(file)] ?? "application/octet-stream",
        "cache-control": "no-store",
      });
      response.end(body);
    } catch {
      response.writeHead(404).end();
    }
  });
  return new Promise((resolveServer) => {
    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address();
      resolveServer({ url: `http://127.0.0.1:${port}`, close: () => new Promise((done) => server.close(done)) });
    });
  });
}

/**
 * The headers site/_headers gives every path (its `/*` block), so the check sees the page under
 * the same security policy the host serves it with.
 */
function siteHeaders() {
  const headers = {};
  let inAll = false;
  for (const line of readFileSync(join(ROOT, "site", "_headers"), "utf8").split(/\r?\n/)) {
    if (!line.trim() || line.trimStart().startsWith("#")) continue;
    if (!/^\s/.test(line)) {
      inAll = line.trim() === "/*";
      continue;
    }
    if (!inAll) continue;
    const colon = line.indexOf(":");
    if (colon === -1) throw new Error(`site/_headers: no colon in "${line.trim()}"`);
    headers[line.slice(0, colon).trim()] = line.slice(colon + 1).trim();
  }
  if (!headers["Content-Security-Policy"]) throw new Error("site/_headers gives every path no Content-Security-Policy");
  return headers;
}

/** The committed comparisons a claim may link to (comparisons.json). */
export function comparisons() {
  const list = JSON.parse(readFileSync(join(ROOT, "comparisons.json"), "utf8"));
  return list.map((entry) => entry.url);
}

/** Lays `url` out at `width` in `theme` and returns what measure.js finds. */
async function layout(page, url, width, theme) {
  await page.emulate(width, HEIGHT_PX, theme === "dark" ? "dark" : "light");
  await page.goto(url);
  // The field theme is a choice on the switch, so it is chosen the way a reader chooses it.
  if (theme === "field") {
    await page.evaluate(`(() => { const b = document.querySelector('[data-set-theme="field"]'); if (b) b.click(); else document.documentElement.dataset.theme = "field"; return true; })()`);
  }
  // Two frames, so styles from the theme change are laid out before anything is measured.
  await page.evaluate("new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(() => done(true))))");
  const problems = await page.evaluate(MEASURE);
  for (const error of page.errors) problems.push({ kind: "console", what: "the browser", detail: error });
  // Leave nothing behind for the next layout (a chosen theme is kept in storage).
  await page.evaluate("(() => { try { localStorage.clear(); } catch (e) {} return true; })()");
  return problems;
}

/**
 * Runs every check on each path under `base`, in the browser named (Chrome unless
 * `CHECK_BROWSER` says otherwise), and returns a list of
 * { path, width, theme, kind, what, detail } problems; an empty list is a pass.
 */
export async function check(base, paths, { widths = WIDTHS, themes = THEMES, browser: name = browserName() } = {}) {
  const browser = await launch(name);
  const found = [];
  try {
    const page = await browser.newPage();
    for (const path of paths) {
      const url = base + path;
      for (const theme of themes) {
        for (const width of widths) {
          for (const problem of await layout(page, url, width, theme)) found.push({ path, width, theme, ...problem });
        }
      }
      // Claims and origins don't depend on the width; read them once, at a desktop width.
      await page.emulate(1280, HEIGHT_PX, "light");
      await page.goto(url);
      const claims = await page.evaluate(`((COMPARISONS) => ${CLAIMS})(${JSON.stringify(comparisons())})`);
      for (const problem of claims) found.push({ path, width: null, theme: null, ...problem });
      const origins = await page.evaluate(
        `performance.getEntriesByType("resource").map((entry) => entry.name).filter((name) => new URL(name).origin !== location.origin)`,
      );
      for (const name of origins) found.push({ path, width: null, theme: null, kind: "origin", what: name, detail: "loaded from another site" });
    }
  } finally {
    await browser.close();
  }
  return found;
}

/** One line per problem, grouped so a problem seen at many widths is printed once. */
export function report(problems) {
  const groups = new Map();
  for (const problem of problems) {
    const key = `${problem.path} · ${problem.kind} · ${problem.what} · ${problem.theme ?? "any theme"}`;
    const group = groups.get(key) ?? { widths: [], detail: problem.detail };
    if (problem.width !== null) group.widths.push(problem.width);
    groups.set(key, group);
  }
  return [...groups].map(([key, { widths, detail }]) => {
    const at = widths.length ? ` at ${widths.length === 1 ? `${widths[0]} px` : `${widths.length} widths, ${Math.min(...widths)} to ${Math.max(...widths)} px`}` : "";
    return `${key}${at}: ${detail}`;
  });
}
