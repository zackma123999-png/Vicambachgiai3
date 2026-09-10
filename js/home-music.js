(() => {
  const formatTime = (seconds) => {
    if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
    return `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;
  };
  function mount(root) {
    if (!root || root.dataset.musicReady === "true") return;
    root.dataset.musicReady = "true";
    const audio = root.querySelector("[data-music-audio]");
    const toggle = root.querySelector("[data-music-toggle]");
    const seek = root.querySelector("[data-music-seek]");
    const current = root.querySelector("[data-music-current]");
    const duration = root.querySelector("[data-music-duration]");
    if (!audio || !toggle || !seek) return;
    const available = Boolean(audio.getAttribute("src"));
    const paint = () => {
      const playing = !audio.paused && !audio.ended;
      root.classList.toggle("is-playing", playing);
      toggle.setAttribute("aria-pressed", String(playing));
      toggle.setAttribute("aria-label", playing ? "Tạm dừng nhạc" : "Phát nhạc");
      toggle.querySelector("span").textContent = available ? (playing ? "Ⅱ" : "▶") : "♪";
      current.textContent = formatTime(audio.currentTime);
      duration.textContent = formatTime(audio.duration);
      seek.value = audio.duration ? String((audio.currentTime / audio.duration) * 100) : "0";
    };
    toggle.addEventListener("click", async () => {
      if (!available) return;
      try { if (audio.paused) await audio.play(); else audio.pause(); }
      catch (_) { toggle.setAttribute("aria-label", "Không thể phát đường dẫn nhạc này"); }
      paint();
    });
    seek.addEventListener("input", () => {
      if (audio.duration) audio.currentTime = (Number(seek.value) / 100) * audio.duration;
    });
    ["loadedmetadata","timeupdate","play","pause","ended"].forEach((event) => audio.addEventListener(event, paint));
    paint();
  }
  const scan = () => document.querySelectorAll("[data-home-music]").forEach(mount);
  document.addEventListener("DOMContentLoaded", scan, { once:true });
  new MutationObserver(scan).observe(document.documentElement, { childList:true, subtree:true });
  scan();
})();
