/* Tap-driven paragraph comments for the reader.
   Keeps the reader layout untouched and reveals the comment affordance only after tapping a paragraph. */
(function () {
  var hideTimer = 0;

  function activeReader() {
    return document.querySelector('.reader-page');
  }

  function clearTargets(except) {
    document.querySelectorAll('.reader-page .r-p.is-comment-target').forEach(function (p) {
      if (p !== except) p.classList.remove('is-comment-target');
    });
    if (!except) clearTimeout(hideTimer);
  }

  function revealTarget(p) {
    clearTimeout(hideTimer);
    clearTargets(p);
    p.classList.add('is-comment-target');
    hideTimer = setTimeout(function () {
      p.classList.remove('is-comment-target');
    }, 2000);
  }

  // Block the old long-press paragraph menu before its listener receives pointerdown.
  document.addEventListener('pointerdown', function (e) {
    var p = e.target && e.target.closest && e.target.closest('.reader-page p.r-p');
    if (!p || e.target.closest('.p-bubble')) return;
    e.stopImmediatePropagation();
  }, true);

  document.addEventListener('click', function (e) {
    var page = activeReader();
    if (!page) return;

    var bubble = e.target.closest && e.target.closest('.p-bubble');
    if (bubble) {
      clearTimeout(hideTimer);
      clearTargets(bubble.closest('p.r-p'));
      return;
    }

    var p = e.target.closest && e.target.closest('.reader-page p.r-p');
    if (p && !e.target.closest('a,button,.r-engage')) {
      // A normal tap only reveals the floating comment icon. It never changes line wrapping.
      revealTarget(p);
      e.stopPropagation();
      return;
    }

    if (!e.target.closest('.drawer,.drawer-bg,.vc-cmt-panel,.vc-cmt-backdrop')) clearTargets(null);
  }, true);

  function routeParaKey() {
    try {
      var raw = (location.hash || '').replace(/^#/, '');
      var q = raw.split('?')[1] || '';
      return new URLSearchParams(q).get('para') || '';
    } catch (_) {
      return '';
    }
  }

  function focusLinkedParagraph() {
    var key = routeParaKey();
    if (!key) return;
    var p = document.querySelector('.reader-page p.r-p[data-pk="' + CSS.escape(key) + '"]');
    if (!p) return;
    revealTarget(p);
    p.classList.add('is-linked-comment');
    setTimeout(function () {
      p.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 120);
    setTimeout(function () { p.classList.remove('is-linked-comment'); }, 2200);
  }

  function enhanceHomeSignalLinks() {
    if (typeof window.VCBG === 'undefined' || !document.querySelector('.sig-board')) return;
    var feed;
    try { feed = window.VCBG.communityFeed({ sort: 'latest', storyId: '' }) || []; } catch (_) { return; }
    var byId = {};
    feed.forEach(function (c) { if (c && c.id) byId[String(c.id)] = c; });

    document.querySelectorAll('.sig-card[data-cid]').forEach(function (card) {
      var c = byId[card.dataset.cid];
      if (!c || !c.para_key) return;
      var link = card.querySelector('.sig-loc');
      if (!link) return;
      var href = link.getAttribute('href') || c.href || '';
      if (!href) return;
      var sep = href.indexOf('?') >= 0 ? '&' : '?';
      if (!/[?&]para=/.test(href)) link.setAttribute('href', href + sep + 'para=' + encodeURIComponent(c.para_key));
      link.title = 'Mở đúng đoạn được trích dẫn';
    });
  }

  var lastHref = '';
  function sync() {
    var href = location.href;
    if (href !== lastHref) {
      lastHref = href;
      setTimeout(function () {
        focusLinkedParagraph();
        enhanceHomeSignalLinks();
      }, 180);
    } else {
      enhanceHomeSignalLinks();
    }
  }

  window.addEventListener('hashchange', sync);
  window.addEventListener('load', sync);
  new MutationObserver(function () { sync(); }).observe(document.documentElement, { childList: true, subtree: true });
})();
