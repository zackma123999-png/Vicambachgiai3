/* ViCamBachGiai — instant non-blocking startup with lightweight homepage fallback. */
(function () {
  if (!window.VCBG || typeof window.VCBG.init !== "function") return;

  var HERO_KEY = "vicambachgiai.hero.v1";
  var originalInit = window.VCBG.init.bind(window.VCBG);
  var originalListStories = window.VCBG.listStories.bind(window.VCBG);
  var started = false;

  function proxyCover(s) {
    if (!s || !s.id) return "";
    var v = Number(s.updated_at || 0) || Date.now();
    return "https://isawawkxjbnlbuxlhlnk.supabase.co/functions/v1/story-cover?id=" + encodeURIComponent(s.id) + "&v=" + encodeURIComponent(v);
  }

  function normalizeFallback(s) {
    var copy = Object.assign({}, s || {});
    copy.genres = Array.isArray(copy.genres) ? copy.genres : [];
    copy.tags = Array.isArray(copy.tags) ? copy.tags : [];
    copy.stats = Object.assign(
      { views: 0, likes: 0, rating_avg: 0, rating_count: 0, chapter_count: 0, latest_chapter: null },
      copy.stats || {}
    );
    if (!copy.cover || /^data:image\//i.test(copy.cover)) copy.cover = proxyCover(copy);
    return copy;
  }

  function readFallback() {
    try {
      var saved = JSON.parse(localStorage.getItem(HERO_KEY) || "null");
      if (saved && Array.isArray(saved.stories) && saved.stories.length) {
        return saved.stories.map(normalizeFallback);
      }
    } catch (_) {}
    return (Array.isArray(window.VCBG_HERO_SNAPSHOT) ? window.VCBG_HERO_SNAPSHOT : []).map(normalizeFallback);
  }

  var fallbackStories = readFallback();

  function filterFallback(opts) {
    opts = opts || {};
    var list = fallbackStories.slice();
    if (opts.status) list = list.filter(function (s) { return s.status === opts.status; });
    if (opts.featured) list = list.filter(function (s) { return !!s.featured; });
    if (opts.upcoming) list = list.filter(function (s) { return !!s.upcoming; });
    if (opts.q) {
      var q = String(opts.q).toLowerCase();
      list = list.filter(function (s) {
        return String(s.title || "").toLowerCase().indexOf(q) >= 0 || String(s.author || "").toLowerCase().indexOf(q) >= 0;
      });
    }
    if (opts.sort === "updated") list.sort(function (a, b) { return Number(b.updated_at || 0) - Number(a.updated_at || 0); });
    else if (opts.sort === "az") list.sort(function (a, b) { return String(a.title || "").localeCompare(String(b.title || ""), "vi"); });
    return list;
  }

  window.VCBG.listStories = function instantListStories(opts) {
    var live = [];
    try { live = originalListStories(opts || {}); } catch (_) {}
    if (live && live.length) return live;
    return filterFallback(opts || {});
  };

  function saveLiveFallback() {
    try {
      var live = originalListStories({ sort: "updated" }) || [];
      if (!live.length) return;
      var slim = live.slice(0, 24).map(function (s) {
        return normalizeFallback({
          id: s.id,
          title: s.title,
          slug: s.slug,
          author: s.author,
          synopsis: String(s.synopsis || "").slice(0, 700),
          status: s.status,
          featured: !!s.featured,
          upcoming: !!s.upcoming,
          accent: s.accent || "#8a6a4a",
          updated_at: Number(s.updated_at || 0),
          cover: proxyCover(s),
          genres: (s.genres || []).slice(0, 3),
          tags: (s.tags || []).slice(0, 3),
          stats: s.stats || undefined
        });
      });
      fallbackStories = slim;
      localStorage.setItem(HERO_KEY, JSON.stringify({ at: Date.now(), stories: slim }));
    } catch (_) {}
  }

  window.VCBG.init = function fastInit() {
    if (!started) {
      started = true;
      try {
        Promise.resolve(originalInit())
          .then(saveLiveFallback)
          .catch(function (err) { console.error("[VCBG background init]", err); });
      } catch (err) {
        console.error("[VCBG background init]", err);
      }
    }
    return Promise.resolve();
  };
})();
