/* Persist resolved auth state and keep admin navigation consistent with db.js internal role. */
(function () {
  if (!window.VCBG) return;

  var KEY = "vicambachgiai.auth.state.v1";
  var CATALOG_KEY = "vicambachgiai.catalog.v1";
  var RECOVER_KEY = "vcbg.admin.recover.once";
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

  function seedCatalogAdmin(u) {
    if (!u || !u.id || u.role !== "admin") return;
    try {
      var cat = JSON.parse(localStorage.getItem(CATALOG_KEY) || "null") || {};
      var profiles = Array.isArray(cat.profiles) ? cat.profiles.slice() : [];
      var users = Array.isArray(cat.users) ? cat.users.slice() : [];
      var old = profiles.find(function (p) { return p && (p.id === u.id || p.user_id === u.id); }) || {};
      var profile = Object.assign({}, old, {
        id: u.id,
        user_id: u.id,
        email: u.email || old.email || "",
        role: "admin",
        status: u.status || old.status || "active",
        display_name: (u.profile && u.profile.display_name) || old.display_name || ((u.email || "Admin").split("@")[0])
      });
      profiles = profiles.filter(function (p) { return !(p && (p.id === u.id || p.user_id === u.id)); });
      profiles.push(profile);
      users = users.filter(function (x) { return !(x && x.id === u.id); });
      users.push({ id: u.id, email: profile.email, role: "admin", status: profile.status, created_at: profile.created_at || 0 });
      cat.profiles = profiles;
      cat.users = users;
      cat.at = Date.now();
      localStorage.setItem(CATALOG_KEY, JSON.stringify(cat));
    } catch (_) {}
  }

  function saveUser(u) {
    if (!u || !u.id) return;
    var old = readCached();
    var role = u.role === "admin" ? "admin" : "reader";
    if (old && old.role === "admin" && role !== "admin" &&
        (old.id === u.id || (old.email && u.email && old.email === u.email))) role = "admin";
    var slim = {
      id: u.id,
      email: u.email || (old && old.email) || "",
      role: role,
      status: u.status || "active",
      profile: u.profile || (old && old.profile) || null,
      at: Date.now()
    };
    try { localStorage.setItem(KEY, JSON.stringify(slim)); } catch (_) {}
    if (slim.role === "admin") seedCatalogAdmin(slim);
  }

  function clearUser() {
    try {
      localStorage.removeItem(KEY);
      sessionStorage.removeItem(RECOVER_KEY);
    } catch (_) {}
  }

  function liveUser() {
    try { return originalCurrentUser(); } catch (_) { return null; }
  }

  function liveAdmin() {
    var u = liveUser();
    return !!(u && u.role === "admin");
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
    if (old) return old;
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
    return el;
  }

  function hideChecking() {
    var el = document.getElementById("vcbg-auth-checking");
    if (el) el.remove();
  }

  /* Do not await the entire catalog refresh before checking admin. db.js restores the
     Supabase session first; as soon as sessionUser exists, the pre-seeded admin profile
     makes its internal currentUser()/requireAdmin() authoritative. */
  function waitForResolvedAdmin(maxMs) {
    if (liveAdmin()) return Promise.resolve(true);
    if (checking) return checking;
    maxMs = maxMs || 12000;
    checking = new Promise(function (resolve) {
      var started = Date.now();
      (function tick() {
        if (liveAdmin()) return resolve(true);
        if (Date.now() - started >= maxMs) return resolve(false);
        setTimeout(tick, 70);
      })();
    }).finally(function () { checking = null; });
    return checking;
  }

  function navigateToAdmin(href) {
    var target = String(href || "#/admin");
    if (!target.startsWith("#")) target = "#" + target.replace(/^#?/, "");
    try { sessionStorage.removeItem(RECOVER_KEY); } catch (_) {}
    if (location.hash === target) {
      try { window.dispatchEvent(new HashChangeEvent("hashchange")); }
      catch (_) { location.reload(); }
    } else {
      location.hash = target;
    }
  }

  function hardRecoverAdmin(href) {
    var cached = readCached();
    if (!cached || cached.role !== "admin") return false;
    seedCatalogAdmin(cached);
    try {
      if (sessionStorage.getItem(RECOVER_KEY) === "1") return false;
      sessionStorage.setItem(RECOVER_KEY, "1");
    } catch (_) {}
    var target = String(href || "#/admin");
    if (!target.startsWith("#")) target = "#" + target.replace(/^#?/, "");
    location.hash = target;
    setTimeout(function () { location.reload(); }, 20);
    return true;
  }

  document.addEventListener("click", function (e) {
    var a = e.target && e.target.closest ? e.target.closest('a[href^="#/admin"]') : null;
    if (!a) return;
    var cached = readCached();
    if (!cached || cached.role !== "admin" || liveAdmin()) return;

    e.preventDefault();
    e.stopImmediatePropagation();
    var href = a.getAttribute("href") || "#/admin";
    seedCatalogAdmin(cached);
    showChecking();
    waitForResolvedAdmin(3500).then(function (ok) {
      hideChecking();
      if (ok) return navigateToAdmin(href);
      hardRecoverAdmin(href);
    }).catch(function () {
      hideChecking();
      hardRecoverAdmin(href);
    });
  }, true);

  /* If the browser reloads while already on #/admin, keep the router away from the guard
     until db.js has restored sessionUser. The cached admin profile was seeded before db.js. */
  var initialHash = String(location.hash || "");
  var initialCached = readCached();
  if (/^#\/admin(?:\/|$)/.test(initialHash) && initialCached && initialCached.role === "admin" && !liveAdmin()) {
    var target = initialHash;
    seedCatalogAdmin(initialCached);
    try { history.replaceState(null, "", location.pathname + location.search + "#/"); } catch (_) {}
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", showChecking, { once: true });
    else showChecking();
    waitForResolvedAdmin(12000).then(function (ok) {
      hideChecking();
      if (ok) navigateToAdmin(target);
      else {
        try { sessionStorage.removeItem(RECOVER_KEY); } catch (_) {}
      }
    }).catch(hideChecking);
  }
})();
