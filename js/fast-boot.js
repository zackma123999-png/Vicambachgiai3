/* ViCamBachGiai — non-blocking startup */
(function () {
  if (!window.VCBG || typeof window.VCBG.init !== "function") return;
  const originalInit = window.VCBG.init.bind(window.VCBG);
  let started = false;
  window.VCBG.init = function fastInit() {
    if (!started) {
      started = true;
      try {
        Promise.resolve(originalInit()).catch(function (err) {
          console.error("[VCBG background init]", err);
        });
      } catch (err) {
        console.error("[VCBG background init]", err);
      }
    }
    return Promise.resolve();
  };
})();
