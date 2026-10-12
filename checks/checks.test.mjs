// Tests of the checks themselves: `node --test checks/checks.test.mjs`. Each page in canaries/
// is built to fail one way and names it (<meta name="expect">); the check must find exactly that
// kind of problem there, so a detector that stops firing, or starts firing on the wrong thing,
// fails here. The clean canary and the site itself must pass.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { check, report, serve } from "./run.mjs";
import { launch } from "./chrome.mjs";

const canaries = fileURLToPath(new URL("canaries/", import.meta.url));
const pages = readdirSync(canaries).filter((name) => name.endsWith(".html")).sort();

const expected = (name) => {
  const html = readFileSync(join(canaries, name), "utf8");
  const content = html.match(/<meta name="expect" content="([^"]*)">/);
  assert.ok(content, `${name} names what it expects in <meta name="expect">`);
  return new Set(content[1].split(/\s+/).filter(Boolean));
};

test("each canary fails exactly the way it is built to, and the clean one passes", async () => {
  assert.ok(pages.length >= 15, `found ${pages.length} canaries`);
  const server = await serve();
  try {
    // A phone width, where every layout canary fails, in the light theme.
    const problems = await check(server.url, pages.map((name) => `/canaries/${name}`), { widths: [320], themes: ["light"] });
    for (const name of pages) {
      const found = new Set(problems.filter((p) => p.path === `/canaries/${name}`).map((p) => p.kind));
      assert.deepEqual([...found].sort(), [...expected(name)].sort(), `${name}: found ${[...found].join(", ") || "nothing"}`);
    }
  } finally {
    await server.close();
  }
});

test("every detector has a canary", () => {
  const kinds = new Set(pages.flatMap((name) => [...expected(name)]));
  for (const kind of ["page", "box", "edge", "overlap", "covered", "font", "console", "claim", "origin"]) {
    assert.ok(kinds.has(kind), `no canary expects ${kind}`);
  }
});

test("the site passes at a phone, a tablet and a desktop width in every theme", async () => {
  const server = await serve();
  try {
    const problems = await check(server.url, ["/"], { widths: [320, 768, 1440] });
    assert.deepEqual(report(problems), []);
  } finally {
    await server.close();
  }
});

test("a comparative claim is caught in a table cell and a heading, not only a paragraph", async () => {
  const server = await serve();
  try {
    const problems = await check(server.url, ["/canaries/claim-cell.html"], { widths: [1280], themes: ["light"] });
    const where = new Set(problems.filter((p) => p.kind === "claim").map((p) => p.what));
    assert.deepEqual([...where].sort(), ["h2", "td"]);
  } finally {
    await server.close();
  }
});

test("the theme switch sets the theme, keeps it for the next visit, and Auto follows the system again", async () => {
  const server = await serve();
  const browser = await launch();
  try {
    const page = await browser.newPage();
    await page.emulate(1280, 900, "light");
    await page.goto(`${server.url}/`);
    const state = () =>
      page.evaluate(`({ theme: document.documentElement.dataset.theme ?? "auto", pressed: [...document.querySelectorAll("[data-set-theme][aria-pressed=true]")].map((b) => b.dataset.setTheme) })`);
    assert.deepEqual(await state(), { theme: "auto", pressed: ["auto"] });
    await page.evaluate(`document.querySelector('[data-set-theme="dark"]').click()`);
    assert.deepEqual(await state(), { theme: "dark", pressed: ["dark"] });
    await page.goto(`${server.url}/`);
    assert.deepEqual(await state(), { theme: "dark", pressed: ["dark"] });
    await page.evaluate(`document.querySelector('[data-set-theme="auto"]').click()`);
    await page.goto(`${server.url}/`);
    assert.deepEqual(await state(), { theme: "auto", pressed: ["auto"] });
    assert.deepEqual(page.errors, []);
  } finally {
    await browser.close();
    await server.close();
  }
});
