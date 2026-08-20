/* Reveal the fan of hero cards together instead of one cover at a time. */
(function () {
  function whenReady(img) {
    if (!img) return Promise.resolve();
    if (img.complete && img.naturalWidth > 0) {
      if (typeof img.decode === "function") return img.decode().catch(function () {});
      return Promise.resolve();
    }
    return new Promise(function (resolve) {
      var done = function () {
        img.removeEventListener("load", done);
        img.removeEventListener("error", done);
        if (typeof img.decode === "function") img.decode().catch(function () {}).then(resolve);
        else resolve();
      };
      img.addEventListener("load", done, { once: true });
      img.addEventListener("error", done, { once: true });
    });
  }

  function arm(hero) {
    if (!hero || hero.dataset.smoothArmed === "1") return;
    hero.dataset.smoothArmed = "1";

    var active = hero.querySelector(".stack-card.is-active .stack-cover");
    if (active) {
      try { active.fetchPriority = "high"; } catch (_) {}
      active.loading = "eager";
    }

    var sideImgs = Array.prototype.slice.call(
      hero.querySelectorAll('.stack-card[data-d="-2"] .stack-cover, .stack-card[data-d="-1"] .stack-cover, .stack-card[data-d="1"] .stack-cover, .stack-card[data-d="2"] .stack-cover')
    );
    sideImgs.forEach(function (img) {
      img.loading = "eager";
      try { img.fetchPriority = "high"; } catch (_) {}
    });

    Promise.all(sideImgs.map(whenReady)).then(function () {
      requestAnimationFrame(function () {
        hero.classList.add("hero-sides-ready");
      });
    });

    /* Never leave the fan hidden on a slow/erroring connection. */
    setTimeout(function () {
      hero.classList.add("hero-sides-ready");
    }, 1800);
  }

  function scan() {
    arm(document.getElementById("hero"));
  }

  var observer = new MutationObserver(scan);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", scan);
  else scan();
})();
