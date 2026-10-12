// Runs inside the page and returns every comparative claim ("better", "faster", "most
// accurate"…) that doesn't stand beside a committed comparison: a { kind, what, detail } list.
//
// A claim passes only when the same block of text (paragraph, list item, table cell, caption,
// heading or definition) links to one of the comparisons listed in comparisons.json, each of
// which is committed with its inputs and the tools' versions. The page's title and description
// have no links, so a claim there always fails. `COMPARISONS` is set by the caller.
((comparisons) => {
  const CLAIM = /\b(better|best|faster|fastest|quicker|more accurate|most accurate|more precise|outperforms?|beats?|superior|leading|unmatched|unrivall?ed|world[- ]class|state[- ]of[- ]the[- ]art|second to none)\b/gi;
  const listed = new Set(comparisons.map((url) => url.replace(/#.*$/, "")));
  const problems = [];
  const words = (text) => text.replace(/\s+/g, " ").trim();

  for (const [what, text] of [
    ["title", document.title],
    ["description", document.querySelector('meta[name="description"]')?.content ?? ""],
  ]) {
    for (const match of text.matchAll(CLAIM)) {
      problems.push({ kind: "claim", what, detail: `"${match[0]}" with no comparison beside it: ${words(text).slice(0, 80)}` });
    }
  }

  const blocks = "p, li, td, th, dd, dt, caption, figcaption, h1, h2, h3, h4, h5, h6, blockquote, summary, label, button, a";
  for (const block of document.body.querySelectorAll(blocks)) {
    // Text in a nested block is judged with that block, not twice.
    const own = [...block.childNodes]
      .map((node) => (node.nodeType === 3 ? node.data : node.nodeType === 1 && !node.matches(blocks) ? node.textContent : ""))
      .join(" ");
    const claims = [...own.matchAll(CLAIM)];
    if (!claims.length) continue;
    const container = block.closest("p, li, td, th, dd, dt, caption, figcaption, h1, h2, h3, h4, h5, h6, blockquote, summary") ?? block;
    const backed = [...container.querySelectorAll("a[href]")].some((link) => listed.has(link.href.replace(/#.*$/, "")));
    if (!backed) {
      for (const match of claims) {
        problems.push({ kind: "claim", what: block.tagName.toLowerCase(), detail: `"${match[0]}" with no committed comparison linked beside it: ${words(own).slice(0, 80)}` });
      }
    }
  }
  return problems;
})(COMPARISONS)
