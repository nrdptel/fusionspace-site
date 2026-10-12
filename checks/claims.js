// Runs inside the page and returns every comparative claim ("better", "faster", "most
// accurate"…) that doesn't stand beside a committed comparison: a { kind, what, detail } list.
//
// Every piece of text in the page is read. A claim passes only when the block of text it sits in
// (its nearest paragraph, list item, table cell, caption, heading, definition or quote, or its own
// element when it has none of those) links to one of the comparisons listed in comparisons.json,
// each committed with its inputs and the tools' versions. Text that can't carry a link (the
// title, the description and social-card tags, and attributes a reader is shown or read, such as
// alt, title, aria-label and placeholder) fails on any claim. `COMPARISONS` is set by the caller.
((comparisons) => {
  // One rule: a claim is anything that compares. Any "than" ("smaller error than", "more reliable
  // than", "closer than"), any multiple ("twice as accurate as"), and the words that compare
  // without either ("better", "fastest", "most accurate", "outperforms", "lower error"). It errs
  // strict: a plain comparison ("wider than the window") fails too and is worded another way.
  // "Rather than" and "other than" compare nothing and pass.
  const CLAIM = new RegExp(
    [
      "\\b(?<!\\b(?:rather|other) )than\\b",
      "\\b(twice|thrice|half|\\w+ times) as \\w+ as\\b",
      "\\b(better|best|faster|fastest|quicker|quickest|superior|leading|unmatched|unrivall?ed|unbeaten|second to none)\\b",
      "\\b(closest|tightest|smallest|lowest|highest|largest|greatest|finest|strongest|easiest|simplest|cheapest|lightest|truest)\\b",
      "\\b(outperforms?|outperformed|outdoes|beats?|surpass(es)?|exceeds?|trumps?)\\b",
      "\\bworld[- ]class\\b|\\bstate[- ]of[- ]the[- ]art\\b|\\bbest[- ]in[- ]class\\b",
      "\\b(the )?(most|least|more|less) (accurate|precise|complete|reliable|capable|advanced|powerful|trusted|realistic|detailed|faithful|efficient)\\b",
      "\\b(smaller|lower|larger|higher|greater|fewer|tighter|closer) (error|errors|miss|misses|spread|bias|steps)\\b",
    ].join("|"),
    "gi",
  );
  const BLOCK = "p, li, td, th, dd, dt, caption, figcaption, h1, h2, h3, h4, h5, h6, blockquote, summary, label, legend";
  const listed = new Set(comparisons.map((url) => url.replace(/#.*$/, "")));
  const problems = [];
  const words = (text) => text.replace(/\s+/g, " ").trim();

  const unlinkable = [
    ["title", document.title],
    ...[...document.querySelectorAll('meta[name="description"], meta[property^="og:"], meta[name^="twitter:"]')].map((meta) => [
      `meta ${meta.getAttribute("name") ?? meta.getAttribute("property")}`,
      meta.content ?? "",
    ]),
  ];
  for (const el of document.body.querySelectorAll("*")) {
    for (const attribute of ["alt", "title", "aria-label", "aria-description", "placeholder", "value"]) {
      if (el.hasAttribute(attribute)) unlinkable.push([`${el.tagName.toLowerCase()} ${attribute}`, el.getAttribute(attribute)]);
    }
    for (const attribute of el.getAttributeNames().filter((n) => n.startsWith("data-"))) {
      unlinkable.push([`${el.tagName.toLowerCase()} ${attribute}`, el.getAttribute(attribute)]);
    }
  }
  for (const [what, text] of unlinkable) {
    for (const match of text.matchAll(CLAIM)) {
      problems.push({ kind: "claim", what, detail: `"${match[0]}" where no comparison can be linked: ${words(text).slice(0, 80)}` });
    }
  }

  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const parent = node.parentElement;
    if (!parent || parent.closest("script, style, template")) continue;
    const claims = [...node.data.matchAll(CLAIM)];
    if (!claims.length) continue;
    // The block the claim sits in; a link backs it only from inside that same block (a link in
    // another paragraph of the same section doesn't).
    const block = parent.closest(BLOCK);
    const container = block ?? parent;
    const links = [...container.querySelectorAll("a[href]"), ...(parent.closest("a[href]") ? [parent.closest("a[href]")] : [])];
    const backed = links.filter((link) => link === parent.closest("a[href]") || link.closest(BLOCK) === block)
      .some((link) => listed.has(link.href.replace(/#.*$/, "")));
    if (!backed) {
      for (const match of claims) {
        problems.push({ kind: "claim", what: container.tagName.toLowerCase(), detail: `"${match[0]}" with no committed comparison linked beside it: ${words(container.textContent).slice(0, 80)}` });
      }
    }
  }
  return problems;
})(COMPARISONS)
