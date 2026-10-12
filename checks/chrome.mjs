// A small client for headless Chrome over the DevTools protocol, with no dependencies: Node's
// own WebSocket (Node 22 and later) and child_process. The checks use it to lay the page out at
// a given width and colour scheme and to run a script in it.

import { spawn } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

/** Where Chrome usually lives on each platform; `CHROME` overrides. */
export function findChrome() {
  if (process.env.CHROME) return process.env.CHROME;
  const candidates = {
    darwin: [
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
      "/Applications/Chromium.app/Contents/MacOS/Chromium",
    ],
    win32: [
      join(process.env["PROGRAMFILES"] ?? "C:\\Program Files", "Google\\Chrome\\Application\\chrome.exe"),
      join(process.env["PROGRAMFILES(X86)"] ?? "C:\\Program Files (x86)", "Google\\Chrome\\Application\\chrome.exe"),
      join(process.env["LOCALAPPDATA"] ?? "", "Google\\Chrome\\Application\\chrome.exe"),
    ],
    linux: ["/usr/bin/google-chrome", "/usr/bin/google-chrome-stable", "/usr/bin/chromium", "/usr/bin/chromium-browser"],
  }[process.platform] ?? [];
  const found = candidates.find((path) => path && existsSync(path));
  if (!found) throw new Error(`no Chrome found; set CHROME to its path (looked in: ${candidates.join(", ")})`);
  return found;
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Starts Chrome and returns a connected browser; `close()` ends it and removes its profile. */
export async function launch() {
  const profile = mkdtempSync(join(tmpdir(), "fs-site-chrome-"));
  const child = spawn(
    findChrome(),
    [
      "--headless=new",
      "--disable-gpu",
      "--no-first-run",
      "--no-default-browser-check",
      "--hide-scrollbars",
      "--force-device-scale-factor=1",
      `--user-data-dir=${profile}`,
      "--remote-debugging-port=0",
      "--disable-extensions",
      "--disable-background-networking",
      // macOS asks the keychain for a password store unless told to use a stand-in.
      ...(process.platform === "darwin" ? ["--use-mock-keychain"] : []),
      // Ubuntu 24.04's AppArmor stops Chrome's sandbox for an unprivileged user, as on CI runners.
      ...(process.platform === "linux" ? ["--no-sandbox", "--password-store=basic"] : []),
      "about:blank",
    ],
    { stdio: "ignore" },
  );
  const portFile = join(profile, "DevToolsActivePort");
  let lines = null;
  for (let waited = 0; waited < 30_000; waited += 100) {
    if (existsSync(portFile)) {
      const text = readFileSync(portFile, "utf8").trim().split(/\r?\n/);
      if (text.length >= 2) {
        lines = text;
        break;
      }
    }
    if (child.exitCode !== null) throw new Error(`Chrome exited with code ${child.exitCode} before it listened`);
    await sleep(100);
  }
  if (!lines) {
    child.kill();
    throw new Error("Chrome did not open its debugging port within 30 s");
  }
  const socket = new WebSocket(`ws://127.0.0.1:${lines[0]}${lines[1]}`);
  await new Promise((resolve, reject) => {
    socket.addEventListener("open", resolve, { once: true });
    socket.addEventListener("error", () => reject(new Error("could not connect to Chrome")), { once: true });
  });
  return new Browser(child, socket, profile);
}

class Browser {
  constructor(child, socket, profile) {
    this.child = child;
    this.socket = socket;
    this.profile = profile;
    this.nextId = 1;
    this.pending = new Map();
    this.listeners = new Set();
    socket.addEventListener("message", (event) => {
      const message = JSON.parse(event.data);
      if (message.id !== undefined) {
        const waiter = this.pending.get(message.id);
        if (!waiter) return;
        this.pending.delete(message.id);
        if (message.error) waiter.reject(new Error(`${waiter.method}: ${message.error.message}`));
        else waiter.resolve(message.result);
      } else {
        for (const listener of this.listeners) listener(message);
      }
    });
  }

  /** Sends one protocol command, to the browser or (with `sessionId`) to a page. */
  send(method, params = {}, sessionId = undefined) {
    const id = this.nextId++;
    const message = { id, method, params };
    if (sessionId) message.sessionId = sessionId;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject, method });
      this.socket.send(JSON.stringify(message));
    });
  }

  /** Resolves on the first event named `method` from `sessionId`, or rejects after `ms`. */
  waitFor(method, sessionId, ms = 30_000) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.listeners.delete(listener);
        reject(new Error(`timed out after ${ms} ms waiting for ${method}`));
      }, ms);
      const listener = (message) => {
        if (message.method === method && message.sessionId === sessionId) {
          clearTimeout(timer);
          this.listeners.delete(listener);
          resolve(message.params);
        }
      };
      this.listeners.add(listener);
    });
  }

  /** Opens a new tab and returns a page bound to it. */
  async newPage() {
    const { targetId } = await this.send("Target.createTarget", { url: "about:blank" });
    const { sessionId } = await this.send("Target.attachToTarget", { targetId, flatten: true });
    const page = new Page(this, targetId, sessionId);
    await this.send("Page.enable", {}, sessionId);
    await this.send("Runtime.enable", {}, sessionId);
    await this.send("Log.enable", {}, sessionId);
    return page;
  }

  async close() {
    try {
      await this.send("Browser.close");
    } catch {
      // Chrome may drop the socket before it answers; the kill below ends it either way.
    }
    this.socket.close();
    this.child.kill();
    await sleep(200);
    try {
      rmSync(this.profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
    } catch {
      // Windows can hold a closing Chrome's files a little longer; a stray temporary profile is harmless.
    }
  }
}

class Page {
  constructor(browser, targetId, sessionId) {
    this.browser = browser;
    this.targetId = targetId;
    this.sessionId = sessionId;
    // Every error the browser reports for this tab (a file that didn't load, a request the
    // page's security policy refused, an uncaught exception), until the next `goto`.
    this.errors = [];
    browser.listeners.add((message) => {
      if (message.sessionId !== sessionId) return;
      if (message.method === "Log.entryAdded" && message.params.entry.level === "error") {
        const { text, url } = message.params.entry;
        this.errors.push(url ? `${text} (${url})` : text);
      } else if (message.method === "Runtime.exceptionThrown") {
        const details = message.params.exceptionDetails;
        this.errors.push(details.exception?.description ?? details.text);
      }
    });
  }

  send(method, params = {}) {
    return this.browser.send(method, params, this.sessionId);
  }

  /** Lays the page out `width` CSS pixels wide in the given colour scheme ("light" or "dark"). */
  async emulate(width, height, scheme) {
    await this.send("Emulation.setDeviceMetricsOverride", {
      width,
      height,
      deviceScaleFactor: 1,
      mobile: width < 600,
    });
    await this.send("Emulation.setEmulatedMedia", {
      features: [{ name: "prefers-color-scheme", value: scheme }],
    });
  }

  /** Loads `url` and waits for its load event and its fonts. */
  async goto(url) {
    this.errors = [];
    const loaded = this.browser.waitFor("Page.loadEventFired", this.sessionId);
    const result = await this.send("Page.navigate", { url });
    if (result.errorText) throw new Error(`could not load ${url}: ${result.errorText}`);
    await loaded;
    await this.evaluate("document.fonts.ready.then(() => true)");
  }

  /** Runs `expression` in the page and returns its value (awaiting a promise). */
  async evaluate(expression) {
    const { result, exceptionDetails } = await this.send("Runtime.evaluate", {
      expression,
      awaitPromise: true,
      returnByValue: true,
    });
    if (exceptionDetails) {
      const text = exceptionDetails.exception?.description ?? exceptionDetails.text;
      throw new Error(`script failed in the page: ${text}`);
    }
    return result.value;
  }

  async close() {
    await this.browser.send("Target.closeTarget", { targetId: this.targetId });
  }
}
