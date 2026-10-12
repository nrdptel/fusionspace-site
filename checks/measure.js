// Runs inside the page, laid out at one width and colour scheme, and returns every way something
// is cut off or crowded: an expression whose value is a list of { kind, what, detail } problems.
//
// Nothing may be clipped by an edge, so this is stricter than "the page doesn't scroll sideways":
//   - page:    the page itself is wider than the window (it would scroll sideways);
//   - box:     an element that hides or scrolls its overflow has content bigger than itself, so
//              some of it is cut off or only reachable by scrolling (an ellipsis, a table that
//              scrolls sideways, a fixed-height box with too much text);
//   - edge:    an element or a line of text reaches past the window's left or right edge;
//   - overlap: two pieces of text are drawn over each other;
//   - covered: a control (link, button, field) has something else drawn over its centre, so
//              a tap there doesn't reach it;
//   - font:    a font failed to load, so the text was measured in a fallback it won't keep.
// Elements hidden on purpose (display none, visibility hidden, opacity 0, or a box of 2 px or
// less such as text for screen readers only) are skipped.
(() => {
  const SLACK_PX = 0.5;
  const HIDDEN_BOX_PX = 2;
  const problems = [];
  const view = document.documentElement.clientWidth;

  const name = (el) => {
    let text = el.tagName.toLowerCase();
    if (el.id) text += `#${el.id}`;
    const classes = [...el.classList].slice(0, 2);
    if (classes.length) text += `.${classes.join(".")}`;
    const words = (el.textContent || "").trim().replace(/\s+/g, " ").slice(0, 40);
    return words ? `${text} "${words}"` : text;
  };

  const shown = (el) => {
    for (let node = el; node && node.nodeType === 1; node = node.parentElement) {
      const style = getComputedStyle(node);
      if (style.display === "none" || style.visibility !== "visible" || Number(style.opacity) === 0) return false;
      // Inside a box of 2 px or less that clips (text for screen readers only).
      const clips = style.overflowX !== "visible" || style.overflowY !== "visible" || style.clipPath !== "none";
      if (clips) {
        const box = node.getBoundingClientRect();
        if (box.width <= HIDDEN_BOX_PX || box.height <= HIDDEN_BOX_PX) return false;
      }
    }
    const rect = el.getBoundingClientRect();
    return rect.width > HIDDEN_BOX_PX && rect.height > HIDDEN_BOX_PX;
  };

  // The page.
  const wide = Math.max(document.documentElement.scrollWidth, document.body.scrollWidth);
  if (wide > view + SLACK_PX) {
    problems.push({ kind: "page", what: "html", detail: `the page is ${wide} px wide in a ${view} px window` });
  }

  // What of an element's content can be drawn: the window's width, cut by every ancestor that
  // clips its overflow (a box already reported above, so its hidden text isn't reported twice).
  const clipOf = (el) => {
    let box = { left: -Infinity, right: Infinity, top: -Infinity, bottom: Infinity };
    for (let node = el; node && node !== document.documentElement; node = node.parentElement) {
      const style = getComputedStyle(node);
      if (style.position === "fixed") break;
      const rect = node.getBoundingClientRect();
      if (style.overflowX !== "visible") box = { ...box, left: Math.max(box.left, rect.left + node.clientLeft), right: Math.min(box.right, rect.left + node.clientLeft + node.clientWidth) };
      if (style.overflowY !== "visible") box = { ...box, top: Math.max(box.top, rect.top + node.clientTop), bottom: Math.min(box.bottom, rect.top + node.clientTop + node.clientHeight) };
    }
    return box;
  };

  // Boxes that cut off or scroll their content, and boxes past an edge.
  const elements = [...document.body.querySelectorAll("*")].filter(shown);
  const reported = new Set();
  for (const el of elements) {
    const style = getComputedStyle(el);
    const clipsX = style.overflowX !== "visible";
    const clipsY = style.overflowY !== "visible";
    if (clipsX && el.scrollWidth > el.clientWidth + 1) {
      problems.push({ kind: "box", what: name(el), detail: `${el.scrollWidth} px of content in ${el.clientWidth} px (overflow-x: ${style.overflowX})` });
    }
    if (clipsY && el.scrollHeight > el.clientHeight + 1) {
      problems.push({ kind: "box", what: name(el), detail: `${el.scrollHeight} px of content in ${el.clientHeight} px tall (overflow-y: ${style.overflowY})` });
    }
    const raw = el.getBoundingClientRect();
    const clip = el.parentElement ? clipOf(el.parentElement) : { left: -Infinity, right: Infinity };
    const rect = { left: Math.max(raw.left, clip.left), right: Math.min(raw.right, clip.right) };
    if (rect.right - rect.left <= SLACK_PX) continue;
    if (rect.right > view + SLACK_PX || rect.left < -SLACK_PX) {
      // Report only the outermost element of a chain that sticks out.
      let parent = el.parentElement;
      while (parent && !reported.has(parent)) parent = parent.parentElement;
      if (!parent) {
        problems.push({ kind: "edge", what: name(el), detail: `spans ${rect.left.toFixed(1)} to ${rect.right.toFixed(1)} px in a ${view} px window` });
      }
      reported.add(el);
    }
  }

  // Lines of text: past an edge, or drawn over other text.
  const lines = [];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const range = document.createRange();
  const skip = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "TEMPLATE"]);
  let index = 0;
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    if (!/\S/.test(node.data)) continue;
    const parent = node.parentElement;
    if (!parent || skip.has(parent.tagName) || !shown(parent)) continue;
    index += 1;
    range.selectNodeContents(node);
    const clip = clipOf(parent);
    for (const raw of range.getClientRects()) {
      const rect = {
        left: Math.max(raw.left, clip.left),
        right: Math.min(raw.right, clip.right),
        top: Math.max(raw.top, clip.top),
        bottom: Math.min(raw.bottom, clip.bottom),
      };
      if (rect.right - rect.left <= SLACK_PX || rect.bottom - rect.top <= SLACK_PX) continue;
      if (rect.right > view + SLACK_PX || rect.left < -SLACK_PX) {
        problems.push({ kind: "edge", what: `text "${node.data.trim().slice(0, 40)}"`, detail: `spans ${rect.left.toFixed(1)} to ${rect.right.toFixed(1)} px in a ${view} px window` });
      }
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

  // Controls: whatever is drawn at a control's centre must be the control or inside it.
  const controls = elements.filter((el) => el.matches("a[href], button, input, select, textarea, summary, [role=button], [tabindex]:not([tabindex='-1'])"));
  for (const el of controls) {
    for (const rect of el.getClientRects()) {
      if (rect.width <= HIDDEN_BOX_PX || rect.height <= HIDDEN_BOX_PX) continue;
      // elementFromPoint sees only the window, so bring a control below the fold into view first.
      let box = rect;
      const middle = (rect.top + rect.bottom) / 2;
      if (middle < 0 || middle > window.innerHeight) {
        const before = window.scrollY;
        el.scrollIntoView({ block: "center", inline: "nearest" });
        const moved = window.scrollY - before;
        box = { left: rect.left, right: rect.right, top: rect.top - moved, bottom: rect.bottom - moved };
      }
      const hit = document.elementFromPoint((box.left + box.right) / 2, (box.top + box.bottom) / 2);
      if (hit && hit !== el && !el.contains(hit)) {
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
