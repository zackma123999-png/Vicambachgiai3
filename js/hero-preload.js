/* Preload cached homepage hero covers as early as possible. */
(function () {
  try {
    var raw = localStorage.getItem("vicambachgiai.catalog.v1");
    if (!raw) return;
    var snap = JSON.parse(raw);
    var stories = (snap && snap.stories) || [];
    if (!stories.length) return;
    var featured = stories.filter(function (s) { return !!s.featured; });
    var ongoing = stories.filter(function (s) { return s.status === "ongoing"; });
    var pool = featured.concat(ongoing, stories);
    var seen = {};
    var covers = [];
    for (var i = 0; i < pool.length && covers.length < 3; i++) {
      var s = pool[i] || {};
      var src = s.cover || s.cover_url || "";
      if (!src || seen[src]) continue;
      seen[src] = true;
      covers.push(src);
    }
    covers.forEach(function (src, idx) {
      var link = document.createElement("link");
      link.rel = "preload";
      link.as = "image";
      link.href = src;
      if (idx === 0) link.setAttribute("fetchpriority", "high");
      document.head.appendChild(link);
      var img = new Image();
      if (idx === 0) img.fetchPriority = "high";
      img.decoding = "async";
      img.src = src;
    });
  } catch (_) {}
})();
