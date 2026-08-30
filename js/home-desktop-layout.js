(() => {
  const isHome = () => !location.hash || location.hash === "#" || location.hash === "#/";

  function mountHomeDesktopLayout() {
    const app = document.getElementById("app");
    if (!app || !isHome() || app.querySelector(".home-desktop-grid")) return;

    const label = app.querySelector(":scope > .home-signal-label");
    const rails = app.querySelector(":scope > .rails");
    const medal = app.querySelector(":scope > .medal-picks");
    const signal = app.querySelector(":scope > #tin-hieu");
    const resonance = app.querySelector(":scope > #mat-do-cong-huong");
    if (!label || !rails || !medal || !signal || !resonance) return;

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
  const app = document.getElementById("app");
  if (app) new MutationObserver(schedule).observe(app, { childList: true });
  schedule();
})();