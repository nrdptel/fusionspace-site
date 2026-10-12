#!/usr/bin/env node
// Checks what the site says about the outside world: `node checks/links.mjs` (needs a network).
//   - every link out of the site, and every comparison in comparisons.json, answers without an
//     error (a status under 400, after redirects);
//   - each release number the page states (an element with `data-release="<package>"`) is the
//     latest version of that package on PyPI and on crates.io, so the register never lags a release.
// It is kept apart from the layout check, which needs no network, so an outage elsewhere can't
// hide a layout problem.

import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { ROOT } from "./run.mjs";

const AGENT = "fusionspace-site link check (https://github.com/nrdptel/fusionspace-site)";
const site = join(ROOT, "site");
const pages = readdirSync(site).filter((name) => name.endsWith(".html"));
const html = pages.map((name) => readFileSync(join(site, name), "utf8")).join("\n");

const links = new Set([...html.matchAll(/href="(https?:\/\/[^"]+)"/g)].map((match) => match[1].replace(/&amp;/g, "&")));
for (const entry of JSON.parse(readFileSync(join(ROOT, "comparisons.json"), "utf8"))) links.add(entry.url);

const failures = [];

async function answer(url) {
  for (let attempt = 1; ; attempt++) {
    try {
      // Asked for as a browser asks for a page: crates.io answers 404 to a request that accepts anything.
      const response = await fetch(url, { redirect: "follow", headers: { "user-agent": AGENT, accept: "text/html,*/*;q=0.8" } });
      await response.body?.cancel();
      return response.status;
    } catch (error) {
      // A dropped connection gets two more tries, a few seconds apart, before it counts.
      if (attempt === 3) return `no answer (${error.cause?.code ?? error.message})`;
      await new Promise((done) => setTimeout(done, 3000 * attempt));
    }
  }
}

for (const url of [...links].sort()) {
  const status = await answer(url);
  if (typeof status !== "number" || status >= 400) failures.push(`${url}: ${status}`);
  else console.log(`ok ${status} ${url}`);
}

const json = async (url) => {
  const response = await fetch(url, { headers: { "user-agent": AGENT, accept: "application/json" } });
  if (!response.ok) throw new Error(`${url}: ${response.status}`);
  return response.json();
};
// A stated release is an element whose only text is the version: <span data-release="name">0.1.0</span>.
const releases = [...html.matchAll(/<[a-z]+\b[^>]*\bdata-release="([^"]+)"[^>]*>([^<]+)</g)].map((match) => ({ name: match[1], stated: match[2].trim() }));
const marked = [...html.matchAll(/\bdata-release=/g)].length;
if (!releases.length) failures.push("the site states no release (no data-release element)");
if (marked !== releases.length) failures.push(`${marked} data-release attributes, but only ${releases.length} read as an element holding just a version`);
for (const { name, stated } of releases) {
  try {
    const pypi = (await json(`https://pypi.org/pypi/${name}/json`)).info.version;
    const crates = (await json(`https://crates.io/api/v1/crates/${name}`)).crate.max_stable_version;
    for (const [where, latest] of [["PyPI", pypi], ["crates.io", crates]]) {
      if (latest !== stated) failures.push(`${name}: the page says ${stated}, ${where}'s latest is ${latest}`);
      else console.log(`ok ${name} ${stated} is ${where}'s latest`);
    }
  } catch (error) {
    failures.push(`${name}: could not read its latest version (${error.message})`);
  }
}

if (failures.length) {
  for (const line of failures) console.log(`FAIL ${line}`);
  process.exit(1);
}
console.log(`ok: ${links.size} links answer; ${releases.length} stated release(s) current`);
