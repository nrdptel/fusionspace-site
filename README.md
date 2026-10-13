# fusionspace.co

FusionSpace's front page, `FS · SITE 001`: what FusionSpace makes, each project and product with
its status, guide, docs and latest release, and the four older web tools until their rebuilds in
FusionSpace HPR ship. It is one static page, plain HTML and CSS with one small script for the
theme switch, built on the
[FusionSpace design system](https://github.com/nrdptel/fusionspace-design)'s web rules. There is
no build step: `site/` is what the host serves.

## What's here

| Path | What |
|---|---|
| `site/index.html` | The page: an intro, four sheets (FusionSpace HPR, other projects, web tools, principles) and a title block |
| `site/404.html` | The page for an address that doesn't exist |
| `site/site.css` | The page's own layout, on the design system's roles |
| `site/fusionspace.css` | The design system's stylesheet, copied unchanged (Apache-2.0) |
| `site/fonts.css`, `site/fonts/` | Archivo and Cascadia Mono, self-hosted (SIL OFL) |
| `site/theme.js` | The theme switch: Auto, Light, Dark, Field |
| `site/sw.js` | Removes the service worker the previous site installed |
| `site/_headers`, `site/_redirects` | Response headers (a strict content security policy) and redirects from the previous site's pages, for Cloudflare Pages |
| `.github/workflows/ci.yml` | The checks, and the deploy to Cloudflare Pages once they pass on `main` |
| `site/brand/` | The FusionSpace lockup, mark and icons (not openly licensed; see [notices](THIRD-PARTY-NOTICES.md)) |
| `comparisons.json` | The committed comparisons a claim such as "faster" may link to |
| `checks/` | The checks below, with no dependencies beyond Node and Chrome |

## Checks

Each needs [Node](https://nodejs.org/) 22 or later and Google Chrome (or Chromium; set `CHROME`
to its path if it isn't in the usual place).

```sh
node checks/check.mjs                 # the page, at every width, in every theme
node --test checks/checks.test.mjs    # the checks' own tests
node checks/links.mjs                 # links and release numbers (needs a network)
```

- **Nothing clipped.** `check.mjs` serves `site/` locally, with the headers in `site/_headers`, and
  lays every page out at each width from 320 to 1,920 px, 40 px apart, and on both sides of each
  breakpoint in the stylesheets, in the light and dark themes (as the system asks for them) and the
  field theme (as a reader picks it). It fails when:
  - the page is wider than the window;
  - a box cuts off or scrolls its content (an ellipsis, a table that scrolls sideways, too much
    text for a fixed height), or a box around text cuts it (overflow, a clip-path, paint
    containment);
  - text or a box reaches past the window's left, right or top edge (or its bottom, when fixed to
    the window), or a box reaches past its parent's content, into the page's margin;
  - two pieces of text overlap, or something else, or nothing, is drawn at a control's centre;
  - CSS draws text, or a clip-path takes a shape other than `inset()` or a corner cut off the top
    right (the designation tag's, measured against each line of text): neither can be measured;
  - a font doesn't load, or the browser reports an error, such as a request the security policy
    refused.
- **No claim without a comparison.** Anything that compares is a claim: any "than" ("smaller
  error than", "more reliable than"), any multiple wherever it stands ("twice", "doubles", "ten
  times", "10×", "one third"), and words such as "better", "fastest", "most accurate" or
  "outperforms". A claim passes only in the same block of
  text as a link to one of the comparisons in `comparisons.json`, each committed with its inputs
  and the tools' versions. In text that can't carry a link (the title, the description and
  social-card tags, and attributes such as `alt` and `aria-label`) it always fails. Plain
  comparisons and multiples are caught too ("wider than the window", "half the flights") and are
  worded another way; only "rather
  than" and "other than" pass.
- **Nothing from elsewhere.** Every file the page loads comes from the site itself.
- **The checks can fail.** All but two of the pages in `checks/canaries/` are built to fail one
  way, and the tests require the check to find exactly that problem there. The other two, a clean
  page and a claim beside its comparison, must pass, and so must the site.
- **Links and releases.** `links.mjs` fails on a link out of the site that doesn't answer, and when
  a release number the page states isn't the latest on PyPI and crates.io.

CI runs the page check and the tests on Linux, macOS and Windows, and the link check on Linux.
On `main`, once they pass, it deploys the site (see below).

## Publishing it at fusionspace.co

The site is served by Cloudflare Pages, like the site before it. CI's `deploy` job uploads `site/`
with [wrangler](https://developers.cloudflare.com/workers/wrangler/) (Pages' Direct Upload) after
every check has passed on `main`; until the two secrets below exist, it warns and does nothing.
This way, rather than Cloudflare's Git integration, a deploy only follows green checks; a project
made with the Git integration can never be switched to Direct Upload later; and no Cloudflare app
needs access to the GitHub account. Setting it up and moving the domain takes these steps.
Cloudflare's menus move from time to time, so a label may differ; its guides to
[API tokens](https://developers.cloudflare.com/fundamentals/api/get-started/create-token/),
[Direct Upload](https://developers.cloudflare.com/pages/get-started/direct-upload/) and
[custom domains](https://developers.cloudflare.com/pages/configuration/custom-domains/) have the
current ones.

1. **Create an API token.** In the Cloudflare dashboard, *My Profile* → *API Tokens* → *Create
   Token* → *Custom token*. Permission: *Account* · *Cloudflare Pages* · *Edit*. Account
   resources: the maintainer's account only. *Continue to summary* → *Create Token*, and copy the
   token: it is shown once.
2. **Add the repository's secrets.** Run `gh secret set CLOUDFLARE_API_TOKEN -R
   nrdptel/fusionspace-site` and paste the token, then `gh secret set CLOUDFLARE_ACCOUNT_ID -R
   nrdptel/fusionspace-site` and paste the account ID (the long hex string in the dashboard's
   address, or on the *Workers & Pages* overview).
3. **Run CI on `main` again** (*Actions* → *CI* → *Run workflow*, or `gh workflow run ci.yml -R
   nrdptel/fusionspace-site --ref main`). The `deploy` job creates the `fusionspace-site` project
   (production branch `main`) and deploys. Look it over at `fusionspace-site.pages.dev`. Leave the
   project's Web Analytics off, and the zone's Rocket Loader and other injected scripts off: the
   page allows only its own scripts, so an injected one would be refused (and would load
   something from another site).
4. **Note how `www` reaches the site today.** `https://www.fusionspace.co` answers with a redirect
   to `https://fusionspace.co`. See whether that is a rule in the zone (*Rules* → *Redirect
   Rules*, or *Bulk Redirects*) or the old Pages project's own `www` domain; you'll need it in
   step 6.
5. **Move the domain, in one sitting.** Between these two the domain serves nothing, and a new
   certificate takes a few minutes:
   - In the old project (`fusionspace-landing`) → *Custom domains*, remove `fusionspace.co` and
     `www.fusionspace.co`.
   - In the new project → *Custom domains* → *Set up a custom domain* → `fusionspace.co`. Then, in
     the zone's *DNS* → *Records*, confirm the `fusionspace.co` record points at
     `fusionspace-site.pages.dev`.
6. **Keep `www` redirecting.** If the redirect was a zone rule, nothing more is needed. If it came
   from the old project, add `www.fusionspace.co` to the new project's custom domains and add a
   Redirect Rule from `www.fusionspace.co/*` to `https://fusionspace.co/${1}` (301).
7. **Check it, in a private window** (a browser that visited the old site may show its cached
   copy once, until `site/sw.js` removes the old service worker): <https://fusionspace.co> shows
   `FS · SITE 001` at the top; <https://www.fusionspace.co> leads there;
   <https://fusionspace.co/projects/charge> leads to Charge; the browser's console shows no
   errors.
8. **Retire the previous site,** in this order: on GitHub, delete `fusionspace-landing`'s
   `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` secrets and archive the repository
   (*Settings* → *Archive this repository*), so its deploy workflow can't recreate a project;
   then delete its Cloudflare Pages project, or keep it a while as a fallback.

To go back before step 8, reverse step 5: the old project keeps its deployments until it's
deleted.

## License

The code and text are licensed under either of [MIT](LICENSE-MIT) or
[Apache-2.0](LICENSE-APACHE), at your option. The FusionSpace name, the lockup, mark and icons in
`site/brand/`, and the icons drawn in the page are not: see
[THIRD-PARTY-NOTICES.md](THIRD-PARTY-NOTICES.md).
