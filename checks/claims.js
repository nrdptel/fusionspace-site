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
  // One rule: a claim is anything that compares. Any "than" ("smaller error than", "more
  // reliable than", "closer than"), any multiple ("twice as accurate as", "three times the
  // accuracy"), and the words that compare without either ("better", "fastest", "most accurate",
  // "outperforms", "lower error"). It errs strict: a plain comparison ("wider than the window")
  // fails too and is worded another way. "Rather than" and "other than" compare nothing and pass.
  const CLAIM = new RegExp(
    [
      "\\b(?<!\\b(?:rather|other) )than\\b",
      // A multiple counts wherever it stands ("doubles the accuracy", "ten times smaller", "10× lower",
      // "one third the error"); a plain one ("half the flights") is worded another way.
      "\\b(twice|thrice|half|halves|halved|halving|doubl\\w*|tripl\\w*|quadrupl\\w*|tenfold|\\w+fold)\\b",
      "\\b(two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|\\w+teen|\\w+ty|dozen|hundred|thousand|million|hundreds of|thousands of|many|several|\\d+(\\.\\d+)?) times\\b",
      "(\\b\\d+(\\.\\d+)? ?[x×]|×)(?!\\w)",
      "\\bone (third|quarter|fifth|tenth|hundredth)\\b",
      "\\b(better|best|faster|fastest|quicker|quickest|superior|leading|unmatched|unrivall?ed|unbeaten|second to none)\\b",
      "\\b(closest|tightest|smallest|lowest|highest|largest|greatest|finest|strongest|easiest|simplest|cheapest|lightest|truest)\\b",
      "\\b(outperforms?|outperformed|outdoes|beats?|surpass(es)?|exceeds?|trumps?)\\b",
      "\\bworld[- ]class\\b|\\bstate[- ]of[- ]the[- ]art\\b|\\bbest[- ]in[- ]class\\b",
      "\\b(the )?(most|least|more|less) (accurate|precise|complete|reliable|capable|advanced|powerful|trusted|realistic|detailed|faithful|efficient)\\b",
      "\\b(smaller|lower|larger|higher|greater|fewer|tighter|closer) (\\S+ ){0,3}(error|errors|miss|misses|spread|bias|bounds|steps)\\b",
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
    for (const match of words(text).matchAll(CLAIM)) {
      problems.push({ kind: "claim", what, detail: `"${match[0]}" where no comparison can be linked: ${words(text).slice(0, 80)}` });
    }
  }

  // Each block's text is read whole, with its whitespace (newlines, runs of spaces, no-break
  // spaces) made single spaces, so a phrase split across lines, inline elements or line breaks
  // still reads as one.
  const groups = new Map();
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const parent = node.parentElement;
    if (!parent || parent.closest("script, style, template")) continue;
    const block = parent.closest(BLOCK);
    const container = block ?? parent;
    if (!groups.has(container)) groups.set(container, { block, text: [] });
    groups.get(container).text.push(node.data);
  }
  for (const [container, { block, text }] of groups) {
    // Joined both ways: as one run (a word split by inline markup, "<b>most</b> accurate") and with
    // a space between nodes (words a <br> or a nested box separates, "most<br>accurate"). A claim
    // in either reading counts.
    const flat = words(text.join(" "));
    const claims = [...flat.matchAll(CLAIM), ...words(text.join("")).matchAll(CLAIM)];
    if (!claims.length) continue;
    // A link backs the claim only from inside the same block (a link in another paragraph of the
    // same section doesn't), or when the block is itself the link.
    const links = [...container.querySelectorAll("a[href]"), ...(container.closest("a[href]") ? [container.closest("a[href]")] : [])];
    const backed = links
      .filter((link) => link === container.closest("a[href]") || link.closest(BLOCK) === block)
      .some((link) => listed.has(link.href.replace(/#.*$/, "")));
    if (!backed) {
      for (const match of claims) {
        problems.push({ kind: "claim", what: container.tagName.toLowerCase(), detail: `"${match[0]}" with no committed comparison linked beside it: ${flat.slice(0, 80)}` });
      }
    }
  }
  return problems;
})(COMPARISONS)
