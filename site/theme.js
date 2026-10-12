// SPDX-License-Identifier: MIT OR Apache-2.0
// The theme switch (Auto, Light, Dark, Field). Loaded in <head> without `defer`, so the reader's
// last choice is applied before the page draws and it never flashes the other theme; Auto removes
// the choice and follows the system (prefers-color-scheme).
(() => {
  const root = document.documentElement;
  const THEMES = ["light", "dark", "field"];
  try {
    const saved = localStorage.getItem("fs-theme");
    if (THEMES.includes(saved)) root.dataset.theme = saved;
  } catch (error) {
    // Storage can be off (private windows, strict settings); the page then follows the system.
  }
  document.addEventListener("DOMContentLoaded", () => {
    const buttons = document.querySelectorAll("[data-set-theme]");
    const show = (theme) => {
      for (const button of buttons) button.setAttribute("aria-pressed", String(button.dataset.setTheme === theme));
    };
    show(root.dataset.theme || "auto");
    for (const button of buttons) {
      button.addEventListener("click", () => {
        const theme = button.dataset.setTheme;
        if (THEMES.includes(theme)) root.dataset.theme = theme;
        else delete root.dataset.theme;
        try {
          if (THEMES.includes(theme)) localStorage.setItem("fs-theme", theme);
          else localStorage.removeItem("fs-theme");
        } catch (error) {
          // Without storage the choice lasts until the page closes.
        }
        show(theme);
      });
    }
  });
})();
