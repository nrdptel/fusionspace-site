// The same browser and page as chrome.mjs, in WebKit, the engine Safari is built on, so the page
// is checked the way Safari lays it out too: WebKit sizes some boxes differently from Chrome (a
// table column holding an icon in a chip came out narrower than the chip's text). It drives
// Playwright's WebKit build, the one dependency of the checks (package.json): `npm ci`, then
// `npx playwright-core install webkit` (with `--with-deps` on Linux, for its system libraries).

/** Starts WebKit and returns a connected browser; `close()` ends it. */
export async function launch() {
  let webkit;
  try {
    ({ webkit } = await import("playwright-core"));
  } catch {
    throw new Error("the WebKit check needs Playwright: run `npm ci`, then `npx playwright-core install webkit`");
  }
  return new Browser(await webkit.launch());
}

class Browser {
  constructor(browser) {
    this.browser = browser;
  }

  /** Opens a new tab and returns a page bound to it. */
  async newPage() {
    const context = await this.browser.newContext({ deviceScaleFactor: 1 });
    return new Page(context, await context.newPage());
  }

  async close() {
    await this.browser.close();
  }
}

class Page {
  constructor(context, page) {
    this.context = context;
    this.page = page;
    // Every error the browser reports for this tab (a file that didn't load, a request the
    // page's security policy refused, an uncaught exception), until the next `goto`.
    this.errors = [];
    page.on("console", (message) => {
      if (message.type() === "error" || message.type() === "assert") {
        const { url } = message.location();
        this.errors.push(url ? `${message.text()} (${url})` : message.text());
      }
    });
    page.on("pageerror", (error) => this.errors.push(error.message));
    page.on("requestfailed", (request) => this.errors.push(`${request.failure()?.errorText ?? "failed"} (${request.url()})`));
    page.on("response", (response) => {
      if (response.status() >= 400) this.errors.push(`HTTP ${response.status()} (${response.url()})`);
    });
  }

  /** Lays the page out `width` CSS pixels wide in the given color scheme ("light" or "dark"). */
  async emulate(width, height, scheme) {
    await this.page.setViewportSize({ width, height });
    await this.page.emulateMedia({ colorScheme: scheme });
  }

  /** Loads `url` and waits for its load event and its fonts. */
  async goto(url) {
    this.errors = [];
    await this.page.goto(url, { waitUntil: "load" });
    await this.evaluate("document.fonts.ready.then(() => true)");
  }

  /** Runs `expression` in the page and returns its value (awaiting a promise). */
  async evaluate(expression) {
    try {
      return await this.page.evaluate(expression);
    } catch (error) {
      throw new Error(`script failed in the page: ${error.message}`);
    }
  }

  async close() {
    await this.context.close();
  }
}
