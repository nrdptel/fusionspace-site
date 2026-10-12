// Runs inside the page, laid out at one width and color scheme, and returns every way something
// is cut off or crowded: an expression whose value is a list of { kind, what, detail } problems.
//
// Nothing may be clipped by an edge, so this is stricter than "the page doesn't scroll sideways":
//   - page:    the page itself is wider than the window (it would scroll sideways);
//   - box:     something is cut off by a box: a box that hides or scrolls its overflow has more
//              content than room (an ellipsis, a table that scrolls sideways, a fixed height),
//              text is cut by a clipping ancestor (overflow, clip-path, paint containment), or
//              SVG text runs past its drawing;
//   - edge:    an element or a line of text reaches past the window's left, right or top edge;
//   - spill:   an element reaches past its parent's content box (into the page's margin, out of
//              a table cell), so it crowds an edge even inside the window;
//   - overlap: two pieces of text are drawn over each other;
//   - covered: a control (link, button, field) has something else, or nothing, at its centre,
//              so a tap there doesn't reach it;
//   - pseudo:  text drawn by CSS (::before or ::after), which can't be measured; it belongs in
//              the page;
//   - font:    a font failed to load, so the text was measured in a fallback it won't keep.
// Elements hidden on purpose (display none, visibility hidden, opacity 0, or a box of 2 px or
// less that clips, such as text for screen readers only) are skipped.
(() => {
  const SLACK_PX = 0.5;
  const HIDDEN_BOX_PX = 2;
  // Boxes may overlap their parent's edge by a hairline (shared borders), not more.
  const SPILL_PX = 1.5;
  const problems = [];
  const root = document.documentElement;
  const view = root.clientWidth;
  const styles = new Map();
  const style = (el) => {
    if (!styles.has(el)) styles.set(el, getComputedStyle(el));
    return styles.get(el);
  };

  const name = (el) => {
    let text = el.tagName.toLowerCase();
    if (el.id) text += `#${el.id}`;
    const classes = [...el.classList].slice(0, 2);
    if (classes.length) text += `.${classes.join(".")}`;
    const words = (el.textContent || "").trim().replace(/\s+/g, " ").slice(0, 40);
    return words ? `${text} "${words}"` : text;
  };

  const paints = (s) => /\b(paint|content|strict)\b/.test(s.contain);
  const overflows = (s) => s.overflowX !== "visible" || s.overflowY !== "visible";
  // html's and body's overflow belongs to the window: past it is an edge, not a box.
  const page = (el) => el === root || el === document.body;

  const shown = (el) => {
    for (let node = el; node && node.nodeType === 1; node = node.parentElement) {
      const s = style(node);
      if (s.display === "none" || s.visibility !== "visible" || Number(s.opacity) === 0) return false;
      // Inside a box of 2 px or less that clips (text for screen readers only).
      if (!page(node) && (overflows(s) || s.clipPath !== "none" || paints(s))) {
        const box = node.getBoundingClientRect();
        if (box.width <= HIDDEN_BOX_PX || box.height <= HIDDEN_BOX_PX) return false;
      }
    }
    const rect = el.getBoundingClientRect();
    return rect.width > HIDDEN_BOX_PX && rect.height > HIDDEN_BOX_PX;
  };

  const ALL = { left: -Infinity, right: Infinity, top: -Infinity, bottom: Infinity };
  const meet = (a, b) => ({
    left: Math.max(a.left, b.left),
    right: Math.min(a.right, b.right),
    top: Math.max(a.top, b.top),
    bottom: Math.min(a.bottom, b.bottom),
  });
  const padding = (node) => {
    const rect = node.getBoundingClientRect();
    return {
      left: rect.left + node.clientLeft,
      right: rect.left + node.clientLeft + node.clientWidth,
      top: rect.top + node.clientTop,
      bottom: rect.top + node.clientTop + node.clientHeight,
    };
  };
  // A clip-path's box: the border box, cut in by an inset() (polygons and shapes are taken at
  // their border box, which holds them).
  const clipPathBox = (node) => {
    const rect = node.getBoundingClientRect();
    const inset = style(node).clipPath.match(/^inset\(([^)]*)\)/);
    if (!inset) return { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom };
    const parts = inset[1].split(/\s+round\s+/)[0].trim().split(/\s+/);
    const [t, r = t, b = t, l = r] = parts;
    const px = (value, size) => (value.endsWith("%") ? (parseFloat(value) / 100) * size : parseFloat(value) || 0);
    return {
      left: rect.left + px(l, rect.width),
      right: rect.right - px(r, rect.width),
      top: rect.top + px(t, rect.height),
      bottom: rect.bottom - px(b, rect.height),
    };
  };
  // The element whose box an element is positioned against, as far as clipping goes.
  const containingBlock = (el) => {
    const position = style(el).position;
    if (position === "fixed") return null;
    let node = el.parentElement;
    if (position === "absolute") {
      while (node && !page(node)) {
        const s = style(node);
        if (s.position !== "static" || s.transform !== "none" || s.filter !== "none" || paints(s)) break;
        node = node.parentElement;
      }
    }
    return node;
  };
  // What of an element can be drawn: cut by each ancestor whose overflow clips it (those on its
  // chain of containing blocks), and by each ancestor's clip-path or paint containment (which
  // clip everything inside them).
  const clips = new Map();
  const clipOf = (el) => {
    if (clips.has(el)) return clips.get(el);
    let box = ALL;
    for (let node = containingBlock(el); node && !page(node); node = containingBlock(node)) {
      const s = style(node);
      const inner = padding(node);
      if (s.overflowX !== "visible") box = meet(box, { ...ALL, left: inner.left, right: inner.right });
      if (s.overflowY !== "visible") box = meet(box, { ...ALL, top: inner.top, bottom: inner.bottom });
    }
    for (let node = el.parentElement; node && !page(node); node = node.parentElement) {
      const s = style(node);
      if (paints(s)) box = meet(box, padding(node));
      if (s.clipPath !== "none") box = meet(box, clipPathBox(node));
    }
    clips.set(el, box);
    return box;
  };

  const edge = (what, rect) => {
    const top = rect.top + window.scrollY;
    if (rect.right > view + SLACK_PX || rect.left < -SLACK_PX || top < -SLACK_PX) {
      problems.push({ kind: "edge", what, detail: `spans ${rect.left.toFixed(1)} to ${rect.right.toFixed(1)} px across and starts at ${top.toFixed(1)} px down, in a ${view} px window` });
      return true;
    }
    return false;
  };

  window.scrollTo(0, 0);

  // The page.
  const wide = Math.max(root.scrollWidth, document.body.scrollWidth);
  if (wide > view + SLACK_PX) {
    problems.push({ kind: "page", what: "html", detail: `the page is ${wide} px wide in a ${view} px window` });
  }

  // Boxes: those that cut off or scroll their content, those past an edge, text drawn by CSS.
  const elements = [...document.body.querySelectorAll("*")].filter(shown);
  const reported = new Set();
  for (const el of elements) {
    const s = style(el);
    const clipsX = s.overflowX !== "visible" || paints(s);
    const clipsY = s.overflowY !== "visible" || paints(s);
    if (clipsX && el.scrollWidth > el.clientWidth + 1) {
      problems.push({ kind: "box", what: name(el), detail: `${el.scrollWidth} px of content in ${el.clientWidth} px (overflow-x: ${s.overflowX}, contain: ${s.contain})` });
    }
    if (clipsY && el.scrollHeight > el.clientHeight + 1) {
      problems.push({ kind: "box", what: name(el), detail: `${el.scrollHeight} px of content in ${el.clientHeight} px tall (overflow-y: ${s.overflowY}, contain: ${s.contain})` });
    }
    for (const which of ["::before", "::after"]) {
      const content = getComputedStyle(el, which).content;
      if (content && content !== "none" && content !== "normal" && !/^(""|'')$/.test(content)) {
        problems.push({ kind: "pseudo", what: `${name(el)}${which}`, detail: `draws ${content.slice(0, 40)}, which can't be measured` });
      }
    }
    const rect = meet(el.getBoundingClientRect(), clipOf(el));
    if (rect.right - rect.left <= SLACK_PX || rect.bottom - rect.top <= SLACK_PX) continue;
    // Report only the outermost element of a chain that sticks out.
    let parent = el.parentElement;
    while (parent && !reported.has(parent)) parent = parent.parentElement;
    if (parent) {
      reported.add(el);
      continue;
    }
    if (edge(name(el), rect)) {
      reported.add(el);
      continue;
    }
    // Inside its parent: a box that reaches past its parent's content (into the page's margin, or
    // out of a cell) is crowded even while it is still inside the window.
    const holder = el.parentElement;
    if (holder && holder !== document.body && holder !== root && !(el instanceof SVGElement) && s.position !== "absolute" && s.position !== "fixed") {
      const h = style(holder);
      if (h.overflowX === "visible" && h.display !== "inline" && h.display !== "contents") {
        const inner = padding(holder);
        const left = inner.left + parseFloat(h.paddingLeft);
        const right = inner.right - parseFloat(h.paddingRight);
        const past = Math.max(left - rect.left, rect.right - right);
        if (past > SPILL_PX) {
          problems.push({ kind: "spill", what: name(el), detail: `reaches ${past.toFixed(1)} px past the content of ${name(holder)}` });
          reported.add(el);
        }
      }
    }
  }

  // SVG text is laid out by the drawing, not the page: it must stay inside its <svg>.
  for (const text of document.querySelectorAll("svg text, svg foreignObject")) {
    const svg = text.closest("svg");
    if (!svg || !shown(svg)) continue;
    const outer = svg.getBoundingClientRect();
    const inner = text.getBoundingClientRect();
    if (inner.left < outer.left - SLACK_PX || inner.right > outer.right + SLACK_PX || inner.top < outer.top - SLACK_PX || inner.bottom > outer.bottom + SLACK_PX) {
      problems.push({ kind: "box", what: `svg text "${text.textContent.trim().slice(0, 40)}"`, detail: "runs past its drawing" });
    }
  }

  // Lines of text: cut by a box, past an edge, or drawn over other text.
  const lines = [];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const range = document.createRange();
  const skip = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "TEMPLATE"]);
  let index = 0;
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    if (!/\S/.test(node.data)) continue;
    const parent = node.parentElement;
    if (!parent || skip.has(parent.tagName) || parent.closest("svg") || !shown(parent)) continue;
    index += 1;
    const words = `text "${node.data.trim().slice(0, 40)}"`;
    range.selectNodeContents(node);
    const clip = clipOf(parent);
    // The parent's own overflow, clip-path or paint containment cuts its text too.
    const own = style(parent);
    let cut = clip;
    if (!page(parent)) {
      const inner = padding(parent);
      if (own.overflowX !== "visible") cut = meet(cut, { ...ALL, left: inner.left, right: inner.right });
      if (own.overflowY !== "visible") cut = meet(cut, { ...ALL, top: inner.top, bottom: inner.bottom });
      if (own.clipPath !== "none") cut = meet(cut, clipPathBox(parent));
      if (paints(own)) cut = meet(cut, inner);
    }
    for (const raw of range.getClientRects()) {
      if (raw.width <= SLACK_PX || raw.height <= SLACK_PX) continue;
      const rect = meet(raw, cut);
      const lost = Math.max(rect.left - raw.left, raw.right - rect.right, rect.top - raw.top, raw.bottom - rect.bottom);
      if (lost > 1) problems.push({ kind: "box", what: words, detail: `${lost.toFixed(1)} px of it cut off by a box around it` });
      if (rect.right - rect.left <= SLACK_PX || rect.bottom - rect.top <= SLACK_PX) continue;
      edge(words, rect);
      lines.push({ node: index, text: node.data.trim(), left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom });
    }
  }
  lines.sort((a, b) => a.top - b.top);
  for (let i = 0; i < lines.length; i++) {
    const a = lines[i];
    for (let j = i + 1; j < lines.length && lines[j].top < a.bottom; j++) {
      const b = lines[j];
      if (a.node === b.node) continue;
      const across = Math.min(a.right, b.right) - Math.max(a.left, b.left);
      const down = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
      if (across > 2 && down > 0.25 * Math.min(a.bottom - a.top, b.bottom - b.top)) {
        problems.push({ kind: "overlap", what: `text "${a.text.slice(0, 30)}" and "${b.text.slice(0, 30)}"`, detail: `${across.toFixed(1)} by ${down.toFixed(1)} px` });
      }
    }
  }

  // Controls: whatever is drawn at the centre of each of a control's boxes (a link that wraps
  // has one a line) must be the control or inside it. elementFromPoint sees only the window, so
  // each box is brought into view and read again first.
  const controls = elements.filter((el) => el.matches("a[href], button, input, select, textarea, summary, [role=button], [tabindex]:not([tabindex='-1'])"));
  for (const el of controls) {
    const count = el.getClientRects().length;
    for (let i = 0; i < count; i++) {
      let box = el.getClientRects()[i];
      if (!box || box.width <= HIDDEN_BOX_PX || box.height <= HIDDEN_BOX_PX) continue;
      const middle = (box.top + box.bottom) / 2;
      // elementFromPoint finds nothing on the window's very edge, so keep a pixel inside it.
      if (middle < 1 || middle > window.innerHeight - 1) {
        window.scrollBy(0, middle - window.innerHeight / 2);
        box = el.getClientRects()[i];
      }
      const hit = document.elementFromPoint((box.left + box.right) / 2, (box.top + box.bottom) / 2);
      if (!hit) {
        problems.push({ kind: "covered", what: name(el), detail: "nothing is drawn at its centre: it is off the page" });
      } else if (hit !== el && !el.contains(hit)) {
        problems.push({ kind: "covered", what: name(el), detail: `${name(hit)} is drawn over its centre` });
      }
    }
  }
  window.scrollTo(0, 0);

  // Fonts.
  for (const face of document.fonts) {
    if (face.status === "error" && !/Fallback/.test(face.family)) {
      problems.push({ kind: "font", what: face.family, detail: `weight ${face.weight} ${face.style} did not load` });
    }
  }

  return problems;
})()
