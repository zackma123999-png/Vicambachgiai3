/* Keep cached auth for UI, but gate admin navigation on db.js's real requireAdmin path. */
(function () {
  if (!window.VCBG) return;

  var KEY = "vicambachgiai.auth.state.v1";
  var originalCurrentUser = typeof window.VCBG.currentUser === "function" ? window.VCBG.currentUser.bind(window.VCBG) : function () { return null; };
  var originalIsAdmin = typeof window.VCBG.isAdmin === "function" ? window.VCBG.isAdmin.bind(window.VCBG) : function () { return false; };
  var originalLogin = typeof window.VCBG.login === "function" ? window.VCBG.login.bind(window.VCBG) : null;
  var originalLogout = typeof window.VCBG.logout === "function" ? window.VCBG.logout.bind(window.VCBG) : null;
  var AUTH_MAX_AGE = 7 * 24 * 60 * 60 * 1000;

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

  /* app.js waits for the authenticated data layer before rendering an admin route.
     Do not intercept admin links with a second full-screen readiness loop: on a slow
     or stale mobile session that loop can cover the valid admin page indefinitely. */
})();
