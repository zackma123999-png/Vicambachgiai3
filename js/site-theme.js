(function () {
  "use strict";

  const KEY = "vcbg-site-theme";
  const THEMES = new Set(["dark", "blue"]);

  function savedTheme() {
    try {
      const value = localStorage.getItem(KEY);
      return THEMES.has(value) ? value : "dark";
    } catch (_) {
      return "dark";
    }
  }

  function syncThemeControls(theme) {
    document.querySelectorAll("[data-site-theme-toggle]").forEach((button) => {
      const isBlue = theme === "blue";
      button.setAttribute("aria-pressed", String(isBlue));
      button.setAttribute("aria-label", isBlue ? "Chuyển sang nền tối" : "Chuyển sang nền xanh");
      const label = button.querySelector(".site-theme-toggle__label");
      const labelText = isBlue ? "Xanh" : "Tối";
      if (label && label.textContent !== labelText) label.textContent = labelText;
    });
  }

  function applyTheme(theme, persist) {
    const next = THEMES.has(theme) ? theme : "dark";
    document.documentElement.dataset.siteTheme = next;
    document.documentElement.style.colorScheme = next === "blue" ? "light" : "dark";
    const themeColor = document.querySelector('meta[name="theme-color"]');
    if (themeColor) themeColor.setAttribute("content", next === "blue" ? "#08aebe" : "#070b14");
    if (persist) {
      try { localStorage.setItem(KEY, next); } catch (_) {}
    }
    syncThemeControls(next);
  }

  applyTheme(savedTheme(), false);

  document.addEventListener("click", (event) => {
    const button = event.target.closest("[data-site-theme-toggle]");
    if (!button) return;
    const current = document.documentElement.dataset.siteTheme || "dark";
    applyTheme(current === "blue" ? "dark" : "blue", true);
  });

  document.addEventListener("DOMContentLoaded", () => syncThemeControls(savedTheme()));

  new MutationObserver(() => syncThemeControls(document.documentElement.dataset.siteTheme || "dark"))
    .observe(document.documentElement, { childList: true, subtree: true });
})();
