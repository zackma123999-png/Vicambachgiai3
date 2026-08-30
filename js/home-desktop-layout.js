(() => {
  const isHome = () => !location.hash || location.hash === "#" || location.hash === "#/";

  function mountHomeDesktopLayout() {
    const app = document.getElementById("app");
    if (!app || !isHome() || app.querySelector(".home-desktop-grid")) return false;

    const direct = (selector) => Array.from(app.children).find((node) => node.matches(selector));
    const label = direct(".home-signal-label");
    const rails = direct(".rails");
    const medal = direct(".medal-picks");
    const signal = direct("#tin-hieu");
    const resonance = direct("#mat-do-cong-huong");
    if (!label || !rails || !medal || !signal || !resonance) return false;

    const grid = document.createElement("div");
    grid.className = "home-desktop-grid";
    const main = document.createElement("div");
    main.className = "home-desktop-main";
    const side = document.createElement("aside");
    side.className = "home-desktop-side";
    side.setAttribute("aria-label", "Thông tin thư viện");

    label.before(grid);
    grid.append(main, side);
    main.append(label, rails);
    side.append(medal, signal, resonance);
    return true;
  }

  let queued = false;
  const schedule = () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      mountHomeDesktopLayout();
    });
  };

  document.addEventListener("DOMContentLoaded", schedule, { once: true });
  window.addEventListener("hashchange", schedule);
  new MutationObserver(schedule).observe(document.documentElement, {
    childList: true,
    subtree: true
  });

  let attempts = 0;
  const retry = setInterval(() => {
    attempts += 1;
    if (mountHomeDesktopLayout() || attempts >= 20) clearInterval(retry);
  }, 250);

  schedule();
})();