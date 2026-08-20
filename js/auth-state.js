/* Persist resolved auth state and defer admin navigation until the live role is known. */
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
    } catch (_) {
      return null;
    }
  }

  function saveUser(u) {
    if (!u || !u.id) return;
    var old = readCached();
    var role = u.role === "admin" ? "admin" : "reader";
    /* Do not downgrade a verified admin while the profile row is still being restored. */
    if (old && old.role === "admin" && role !== "admin" &&
        (old.id === u.id || (old.email && u.email && old.email === u.email))) {
      role = "admin";
    }
    var slim = {
      id: u.id,
      email: u.email || (old && old.email) || "",
      role: role,
      status: u.status || "active",
      profile: u.profile || (old && old.profile) || null,
      at: Date.now()
    };
    try { localStorage.setItem(KEY, JSON.stringify(slim)); } catch (_) {}
  }

  function clearUser() {
    try { localStorage.removeItem(KEY); } catch (_) {}
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
        return Object.assign({}, live, {
          role: "admin",
          profile: live.profile || cached.profile || null
        });
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
    el.setAttribute("aria-live", "polite");
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

  /* Important: the database layer restores the Supabase session first, then loads the
     user's profile/role after catalog work. Never decide FORBIDDEN while that sequence is
     still running. Wait for VCBG.whenReady(), then verify the real internal admin role. */
  function waitForResolvedAdmin() {
    if (liveAdmin()) return Promise.resolve(true);
    if (checking) return checking;

    checking = (async function () {
      try {
        if (typeof window.VCBG.whenReady === "function") {
          await Promise.resolve(window.VCBG.whenReady());
        }
      } catch (_) {}

      /* whenReady can be briefly null during fast boot; allow the profile cache to settle. */
      var started = Date.now();
      while (Date.now() - started < 3000) {
        if (liveAdmin()) return true;
        await new Promise(function (resolve) { setTimeout(resolve, 80); });
      }
      return liveAdmin();
    })().finally(function () {
      checking = null;
    });

    return checking;
  }

  function openAdminAfterAuth(href) {
    showChecking();
    waitForResolvedAdmin().then(function (ok) {
      hideChecking();
      if (ok) {
        location.hash = String(href || "#/admin").replace(/^#/, "");
        return;
      }
      /* Only reject after the auth/profile bootstrap has genuinely completed. */
      var cached = readCached();
      if (cached && cached.role === "admin") {
        /* Keep the user on the current page and allow a later retry; never show a false
           'no admin permission' page caused by startup timing. */
        return;
      }
      location.hash = "/tai-khoan";
    }).catch(function () {
      hideChecking();
    });
  }

  document.addEventListener("click", function (e) {
    var a = e.target && e.target.closest ? e.target.closest('a[href^="#/admin"]') : null;
    if (!a) return;
    var cached = readCached();
    if (!cached || cached.role !== "admin" || liveAdmin()) return;

    e.preventDefault();
    e.stopImmediatePropagation();
    openAdminAfterAuth(a.getAttribute("href") || "#/admin");
  }, true);

  /* On a mobile reload of an admin hash, temporarily park at home so the normal router
     cannot execute needAdmin() before the internal profile role is restored. */
  var initialHash = String(location.hash || "");
  var initialCached = readCached();
  if (/^#\/admin(?:\/|$)/.test(initialHash) && initialCached && initialCached.role === "admin" && !liveAdmin()) {
    var target = initialHash;
    try { history.replaceState(null, "", location.pathname + location.search + "#/"); } catch (_) {}
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", showChecking, { once: true });
    else showChecking();
    waitForResolvedAdmin().then(function (ok) {
      hideChecking();
      if (ok) location.hash = target.slice(1);
    }).catch(function () {
      hideChecking();
    });
  }
})();
