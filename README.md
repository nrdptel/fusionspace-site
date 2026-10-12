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
  breakpoint in the stylesheets, in the light and dark
  themes (as the system asks for them) and the field theme (as a reader picks it). It fails when
  the page is wider than the window, when a box cuts off or scrolls its content (an ellipsis, a
  table that scrolls sideways, too much text for a fixed height), when text or a box reaches past
  the window's edge, when two pieces of text overlap, when something is drawn over a control, when
  a font doesn't load, when CSS draws text (which can't be measured), or when the browser reports
  an error, such as a request the security policy refused.
- **No claim without a comparison.** A comparative word ("better", "faster", "most accurate" and
  the like) passes only in a block of text that links to one of the comparisons in
  `comparisons.json`, each committed with its inputs and the tools' versions. In the page's title
  or description, which can't carry a link, it always fails.
- **Nothing from elsewhere.** Every file the page loads comes from the site itself.
- **The checks can fail.** Each page in `checks/canaries/` is built to fail one way, and the tests
  require the check to find exactly that problem there, and nothing on the clean canary and the
  site.
- **Links and releases.** `links.mjs` fails on a link out of the site that doesn't answer, and when
  a release number the page states isn't the latest on PyPI and crates.io.

CI runs the page check and the tests on Linux, macOS and Windows, and the link check on Linux.

## Publishing it at fusionspace.co

The site is served by Cloudflare Pages, like the site before it, straight from this repository's
`main` branch. Moving the domain takes these steps in the Cloudflare dashboard. Its menus move
from time to time, so a label may differ; Cloudflare's guide to
[Git integration](https://developers.cloudflare.com/pages/configuration/git-integration/) and to
[custom domains](https://developers.cloudflare.com/pages/configuration/custom-domains/) has the
current ones.

1. **Create the project.** *Workers & Pages* → *Create* → *Pages* → *Connect to Git*. If
   Cloudflare's GitHub app can't see `nrdptel/fusionspace-site` yet, give it access to that
   repository when it asks. Choose the repository and name the project `fusionspace-site` (its
   address becomes `fusionspace-site.pages.dev`). Production branch `main`; framework preset
   *None*; build command empty; build output directory `site`. *Save and Deploy*.
2. **Look it over at `fusionspace-site.pages.dev`.** Leave the project's Web Analytics off, and
   the zone's Rocket Loader and other injected scripts off: the page allows only its own scripts,
   so an injected one would be refused (and would load something from another site).
3. **Note how `www` reaches the site today.** `https://www.fusionspace.co` answers with a redirect
   to `https://fusionspace.co`. See whether that is a rule in the zone (*Rules* → *Redirect
   Rules*, or *Bulk Redirects*) or the old Pages project's own `www` domain; you'll need it in
   step 5.
4. **Move the domain, in one sitting.** Between these two the domain serves nothing, and a new
   certificate takes a few minutes:
   - In the old project (`fusionspace-landing`) → *Custom domains*, remove `fusionspace.co` and
     `www.fusionspace.co`.
   - In the new project → *Custom domains* → *Set up a custom domain* → `fusionspace.co`. Then, in
     the zone's *DNS* → *Records*, confirm the `fusionspace.co` record points at
     `fusionspace-site.pages.dev`.
5. **Keep `www` redirecting.** If the redirect was a zone rule, nothing more is needed. If it came
   from the old project, add `www.fusionspace.co` to the new project's custom domains and add a
   Redirect Rule from `www.fusionspace.co/*` to `https://fusionspace.co/${1}` (301).
6. **Check it, in a private window** (a browser that visited the old site may show its cached
   copy once, until `site/sw.js` removes the old service worker): <https://fusionspace.co> shows
   `FS · SITE 001` at the top; <https://www.fusionspace.co> leads there;
   <https://fusionspace.co/projects/charge> leads to Charge; the browser's console shows no
   errors.
7. **Retire the previous site,** in this order: on GitHub, delete `fusionspace-landing`'s
   `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` secrets and archive the repository
   (*Settings* → *Archive this repository*), so its deploy workflow can't recreate a project;
   then delete its Cloudflare Pages project, or keep it a while as a fallback.

To go back before step 7, reverse step 4: the old project keeps its deployments until it's
deleted.

## License

The code and text are licensed under either of [MIT](LICENSE-MIT) or
[Apache-2.0](LICENSE-APACHE), at your option. The FusionSpace name, the lockup, mark and icons in
`site/brand/`, and the icons drawn in the page are not: see
[THIRD-PARTY-NOTICES.md](THIRD-PARTY-NOTICES.md).
