/* Persist the resolved authenticated user/role so mobile reloads do not temporarily downgrade admin UI. */
(function () {
  if (!window.VCBG) return;

  var KEY = "vicambachgiai.auth.state.v1";
  var originalCurrentUser = typeof window.VCBG.currentUser === "function" ? window.VCBG.currentUser.bind(window.VCBG) : function () { return null; };
  var originalIsAdmin = typeof window.VCBG.isAdmin === "function" ? window.VCBG.isAdmin.bind(window.VCBG) : function () { return false; };
  var originalLogin = typeof window.VCBG.login === "function" ? window.VCBG.login.bind(window.VCBG) : null;
  var originalLogout = typeof window.VCBG.logout === "function" ? window.VCBG.logout.bind(window.VCBG) : null;

  function readCached() {
    try {
      var x = JSON.parse(localStorage.getItem(KEY) || "null");
      if (!x || !x.id || !x.role) return null;
      return x;
    } catch (_) {
      return null;
    }
  }

  function saveUser(u) {
    if (!u || !u.id) return;
    var slim = {
      id: u.id,
      email: u.email || "",
      role: u.role === "admin" ? "admin" : "reader",
      status: u.status || "active",
      profile: u.profile || null,
      at: Date.now()
    };
    try { localStorage.setItem(KEY, JSON.stringify(slim)); } catch (_) {}
  }

  function clearUser() {
    try { localStorage.removeItem(KEY); } catch (_) {}
  }

  window.VCBG.currentUser = function persistedCurrentUser() {
    var live = null;
    try { live = originalCurrentUser(); } catch (_) {}
    var cached = readCached();

    if (live) {
      if (cached && cached.id === live.id && cached.role === "admin" && live.role !== "admin") {
        /* During startup the Supabase session may be restored before the profile row (role) arrives. */
        return Object.assign({}, live, {
          role: "admin",
          profile: live.profile || cached.profile || null
        });
      }
      saveUser(live);
      return live;
    }

    /* Use only a recent cached identity while Supabase restores its session. */
    if (cached && Date.now() - Number(cached.at || 0) < 7 * 24 * 60 * 60 * 1000) return cached;
    return null;
  };

  window.VCBG.isAdmin = function persistedIsAdmin() {
    var u = window.VCBG.currentUser();
    if (u) return u.role === "admin";
    try { return originalIsAdmin(); } catch (_) { return false; }
  };

  if (originalLogin) {
    window.VCBG.login = async function persistedLogin(args) {
      var u = await originalLogin(args);
      if (!u) {
        try { u = originalCurrentUser(); } catch (_) {}
      }
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
})();
