/* Preserve the authenticated user's verified admin role when public_profiles is fetched.
   public_profiles intentionally omits role/email/status; without this bridge db.js can
   overwrite the richer cached own profile with a public-only row and temporarily downgrade
   the current admin to reader after mobile reload. Backend RLS remains authoritative. */
(function () {
  if (!window.supabase || typeof window.supabase.createClient !== "function") return;

  var AUTH_KEY = "vicambachgiai.auth.state.v1";
  var originalCreateClient = window.supabase.createClient.bind(window.supabase);

  function readVerifiedAdmin() {
    try {
      var u = JSON.parse(localStorage.getItem(AUTH_KEY) || "null");
      if (!u || !u.id || u.role !== "admin") return null;
      return u;
    } catch (_) {
      return null;
    }
  }

  function patchResult(result) {
    var admin = readVerifiedAdmin();
    if (!admin || !result || !Array.isArray(result.data)) return result;

    var found = false;
    var rows = result.data.map(function (row) {
      if (!row || (row.user_id !== admin.id && row.id !== admin.id)) return row;
      found = true;
      return Object.assign({}, row, {
        id: admin.id,
        user_id: admin.id,
        email: admin.email || row.email || "",
        role: "admin",
        status: admin.status || row.status || "active"
      });
    });

    if (!found) {
      rows.push({
        id: admin.id,
        user_id: admin.id,
        email: admin.email || "",
        role: "admin",
        status: admin.status || "active",
        display_name: admin.profile && admin.profile.display_name || "Admin",
        avatar: admin.profile && admin.profile.avatar || "A",
        bio: admin.profile && admin.profile.bio || ""
      });
    }

    return Object.assign({}, result, { data: rows });
  }

  function wrapBuilder(builder, tableName) {
    if (!builder || typeof builder !== "object") return builder;
    return new Proxy(builder, {
      get: function (target, prop, receiver) {
        if (prop === "then") {
          return function (resolve, reject) {
            return target.then(function (result) {
              resolve(tableName === "public_profiles" ? patchResult(result) : result);
            }, reject);
          };
        }
        var value = Reflect.get(target, prop, receiver);
        if (typeof value !== "function") return value;
        return function () {
          var out = value.apply(target, arguments);
          if (out && typeof out === "object" && typeof out.then === "function") {
            return wrapBuilder(out, tableName);
          }
          return out;
        };
      }
    });
  }

  window.supabase.createClient = function () {
    var client = originalCreateClient.apply(null, arguments);
    var originalFrom = client.from.bind(client);
    client.from = function (tableName) {
      return wrapBuilder(originalFrom(tableName), tableName);
    };
    return client;
  };
})();
