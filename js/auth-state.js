/* Keep cached auth for UI, but gate admin navigation on db.js's real requireAdmin path. */
(function () {
  if (!window.VCBG) return;

  var KEY = "vicambachgiai.auth.state.v1";
  var originalCurrentUser = typeof window.VCBG.currentUser === "function" ? window.VCBG.currentUser.bind(window.VCBG) : function () { return null; };
  var originalIsAdmin = typeof window.VCBG.isAdmin === "function" ? window.VCBG.isAdmin.bind(window.VCBG) : function () { return false; };
  var originalLogin = typeof window.VCBG.login === "function" ? window.VCBG.login.bind(window.VCBG) : null;
  var originalLogout = typeof window.VCBG.logout === "function" ? window.VCBG.logout.bind(window.VCBG) : null;
  var AUTH_MAX_AGE = 7 * 24 * 60 * 60 * 1000;
  var checking = null;

  function readCached() {
    try {
      var x = JSON.parse(localStorage.getItem(KEY) || "null");
      if (!x || !x.id || !x.role) return null;
      if (Date.now() - Number(x.at || 0) > AUTH_MAX_AGE) return null;
      return x;
    } catch (_) { return null; }
  }

  function saveUser(u) {
    if (!u || !u.id) return;
    var old = readCached();
    var role = u.role === "admin" ? "admin" : "reader";
    if (old && old.role === "admin" && role !== "admin" &&
        (old.id === u.id || (old.email && u.email && old.email === u.email))) role = "admin";
    try {
      localStorage.setItem(KEY, JSON.stringify({
        id: u.id,
        email: u.email || (old && old.email) || "",
        role: role,
        status: u.status || "active",
        profile: u.profile || (old && old.profile) || null,
        at: Date.now()
      }));
    } catch (_) {}
  }

  function clearUser() {
    try { localStorage.removeItem(KEY); } catch (_) {}
  }

  function liveUser() {
    try { return originalCurrentUser(); } catch (_) { return null; }
  }

  window.VCBG.currentUser = function persistedCurrentUser() {
    var live = liveUser();
    var cached = readCached();
    if (live) {
      if (cached && cached.role === "admin" && live.role !== "admin" &&
          (cached.id === live.id || (cached.email && live.email && cached.email === live.email))) {
        return Object.assign({}, live, { role: "admin", profile: live.profile || cached.profile || null });
      }
      saveUser(live);
      return live;
    }
    return cached || null;
  };

  window.VCBG.isAdmin = function persistedIsAdmin() {
    var u = window.VCBG.currentUser();
    if (u) return u.role === "admin";
    try { return originalIsAdmin(); } catch (_) { return false; }
  };

  if (originalLogin) {
    window.VCBG.login = async function persistedLogin(args) {
      var u = await originalLogin(args);
      if (!u) u = liveUser();
      if (u) saveUser(u);
      return u;
    };
  }

  if (originalLogout) {
    window.VCBG.logout = function persistedLogout() {
      clearUser();
      return originalLogout();
    };
  }

  function showChecking() {
    var old = document.getElementById("vcbg-auth-checking");
    if (old) return;
    var el = document.createElement("div");
    el.id = "vcbg-auth-checking";
    el.innerHTML = '<div class="vcbg-auth-spinner"></div><div>Đang xác thực quyền quản trị…</div>';
    el.style.cssText = "position:fixed;inset:0;z-index:9999;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;background:#070b14;color:#8b9bb3;font:500 16px 'Be Vietnam Pro',system-ui,sans-serif";
    var sp = el.firstElementChild;
    if (sp) sp.style.cssText = "width:34px;height:34px;border-radius:50%;border:3px solid rgba(149,137,230,.2);border-top-color:#9589e6;animation:vcbgSpin .75s linear infinite";
    if (!document.getElementById("vcbg-auth-spin-style")) {
      var st = document.createElement("style");
      st.id = "vcbg-auth-spin-style";
      st.textContent = "@keyframes vcbgSpin{to{transform:rotate(360deg)}}";
      document.head.appendChild(st);
    }
    document.body.appendChild(el);
  }

  function hideChecking() {
    var el = document.getElementById("vcbg-auth-checking");
    if (el) el.remove();
  }

  /* This is the authoritative readiness test: adminStats() itself calls db.js requireAdmin().
     If this succeeds, every admin route/API sees the same role and the panel can render safely. */
  function internalAdminReady() {
    try {
      if (typeof window.VCBG.adminStats !== "function") return false;
      window.VCBG.adminStats();
      return true;
    } catch (_) {
      return false;
    }
  }

  function waitForInternalAdmin(maxMs) {
    if (internalAdminReady()) return Promise.resolve(true);
    if (checking) return checking;
    maxMs = maxMs || 15000;
    checking = (async function () {
      try {
        if (typeof window.VCBG.backgroundReady === "function") {
          Promise.resolve(window.VCBG.backgroundReady()).catch(function () {});
        }
      } catch (_) {}

      var started = Date.now();
      while (Date.now() - started < maxMs) {
        if (internalAdminReady()) return true;
        await new Promise(function (resolve) { setTimeout(resolve, 80); });
      }
      return internalAdminReady();
    })().finally(function () { checking = null; });
    return checking;
  }

  function navigate(target) {
    target = String(target || "#/admin");
    if (!target.startsWith("#")) target = "#" + target.replace(/^#?/, "");
    if (location.hash === target) {
      try { window.dispatchEvent(new HashChangeEvent("hashchange")); }
      catch (_) { location.reload(); }
    } else {
      location.hash = target;
    }
  }

  /* Intercept EVERY admin navigation for a cached admin. Do not let app.js needAdmin() run
     until the exact db.js requireAdmin() path is ready. */
  document.addEventListener("click", function (e) {
    var a = e.target && e.target.closest ? e.target.closest('a[href^="#/admin"]') : null;
    if (!a) return;
    var cached = readCached();
    if (!cached || cached.role !== "admin") return;

    e.preventDefault();
    e.stopImmediatePropagation();
    var href = a.getAttribute("href") || "#/admin";
    showChecking();
    waitForInternalAdmin(15000).then(function (ok) {
      hideChecking();
      if (ok) navigate(href);
      else console.error("[VCBG admin] Internal admin guard did not become ready.");
    }).catch(function (err) {
      hideChecking();
      console.error("[VCBG admin]", err);
    });
  }, true);

  /* Same protection on refresh while already inside an admin route. */
  var initialHash = String(location.hash || "");
  var cached = readCached();
  if (/^#\/admin(?:\/|$)/.test(initialHash) && cached && cached.role === "admin" && !internalAdminReady()) {
    var target = initialHash;
    try { history.replaceState(null, "", location.pathname + location.search + "#/"); } catch (_) {}
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", showChecking, { once: true });
    else showChecking();
    waitForInternalAdmin(15000).then(function (ok) {
      hideChecking();
      if (ok) navigate(target);
      else console.error("[VCBG admin] Reload guard never became ready.");
    }).catch(function (err) {
      hideChecking();
      console.error("[VCBG admin reload]", err);
    });
  }
})();
