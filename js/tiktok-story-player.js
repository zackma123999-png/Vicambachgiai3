/* Compact in-site TikTok story introduction player. */
(function () {
  let dock = null;
  let frame = null;

  function esc(value) {
    const node = document.createElement("span");
    node.textContent = String(value || "");
    return node.innerHTML;
  }

  function closePlayer() {
    if (dock) dock.remove();
    dock = null;
    frame = null;
    document.body.classList.remove("has-tiktok-story-player");
  }

  function openPlayer(button) {
    const post = String(button.dataset.tiktokPost || "").replace(/\D/g, "");
    if (!post) return;
    closePlayer();
    const title = button.dataset.storyTitle || "Giới thiệu truyện";
    const author = button.dataset.storyAuthor || "TikTok";
    const cover = button.dataset.storyCover || "";
    dock = document.createElement("aside");
    dock.className = "tiktok-story-player is-open";
    dock.setAttribute("aria-label", "Trình phát giới thiệu truyện từ TikTok");
    dock.innerHTML = `<div class="tiktok-story-preview">
      <button class="tiktok-story-minimize" type="button" aria-label="Thu nhỏ video">⌄</button>
      <iframe title="TikTok giới thiệu ${esc(title)}" src="https://www.tiktok.com/player/v1/${post}?autoplay=1&loop=0&controls=1&progress_bar=1&play_button=1&volume_control=1&fullscreen_button=0&description=0&music_info=0&rel=0&native_context_menu=0" allow="autoplay; encrypted-media; picture-in-picture" referrerpolicy="strict-origin-when-cross-origin"></iframe>
    </div>
    <div class="tiktok-story-tag">
      <button class="tiktok-story-toggle" type="button" aria-label="Hiện hoặc ẩn video"><span aria-hidden="true">▶</span></button>
      ${cover ? `<img src="${esc(cover)}" alt="">` : ""}
      <span class="tiktok-story-copy"><b>${esc(title)}</b><small>Giới thiệu từ TikTok · ${esc(author)}</small></span>
      <span class="tiktok-story-live"><i></i> Đang phát</span>
      <button class="tiktok-story-close" type="button" aria-label="Đóng trình phát">×</button>
    </div>`;
    document.body.appendChild(dock);
    document.body.classList.add("has-tiktok-story-player");
    frame = dock.querySelector("iframe");
    requestAnimationFrame(() => dock && dock.classList.add("is-ready"));
  }

  document.addEventListener("click", function (event) {
    const launch = event.target.closest(".medal-tiktok-button");
    if (launch) {
      event.preventDefault();
      event.stopPropagation();
      openPlayer(launch);
      return;
    }
    if (!dock) return;
    if (event.target.closest(".tiktok-story-close")) {
      closePlayer();
      return;
    }
    if (event.target.closest(".tiktok-story-minimize, .tiktok-story-toggle")) {
      dock.classList.toggle("is-minimized");
      const minimized = dock.classList.contains("is-minimized");
      const control = dock.querySelector(".tiktok-story-toggle");
      if (control) control.setAttribute("aria-label", minimized ? "Hiện video" : "Ẩn video");
    }
  });

  window.addEventListener("hashchange", closePlayer);
})();

