/* Seed the last verified admin profile into the local catalog before db.js boots.
   This keeps the data-layer's internal currentUser()/requireAdmin() consistent with
   the UI auth cache during mobile reloads. */
(function () {
  var AUTH_KEY = "vicambachgiai.auth.state.v1";
  var CATALOG_KEY = "vicambachgiai.catalog.v1";
  try {
    var auth = JSON.parse(localStorage.getItem(AUTH_KEY) || "null");
    if (!auth || !auth.id || auth.role !== "admin") return;

    var catalog = JSON.parse(localStorage.getItem(CATALOG_KEY) || "null") || {};
    var profiles = Array.isArray(catalog.profiles) ? catalog.profiles.slice() : [];
    var users = Array.isArray(catalog.users) ? catalog.users.slice() : [];
    var id = auth.id;
    var email = auth.email || "";
    var oldProfile = profiles.find(function (p) {
      return p && (p.id === id || p.user_id === id);
    }) || {};

    var profile = Object.assign({}, oldProfile, {
      id: id,
      user_id: id,
      email: email || oldProfile.email || "",
      role: "admin",
      status: auth.status || oldProfile.status || "active",
      display_name:
        (auth.profile && auth.profile.display_name) ||
        oldProfile.display_name ||
        (email ? email.split("@")[0] : "Admin")
    });

    profiles = profiles.filter(function (p) {
      return !(p && (p.id === id || p.user_id === id));
    });
    profiles.push(profile);

    users = users.filter(function (u) { return !(u && u.id === id); });
    users.push({
      id: id,
      email: profile.email,
      role: "admin",
      status: profile.status,
      created_at: profile.created_at || 0
    });

    catalog.profiles = profiles;
    catalog.users = users;
    catalog.at = Date.now();
    localStorage.setItem(CATALOG_KEY, JSON.stringify(catalog));
  } catch (_) {}
})();
