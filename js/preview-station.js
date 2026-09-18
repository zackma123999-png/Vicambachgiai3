// TRẠM PREVIEW: lazily open one TikTok teaser inside the homepage section.
(function () {
  const esc = (value) => {
    const node = document.createElement("span");
    node.textContent = String(value || "");
    return node.innerHTML;
  };

  function notify(message) {
    if (typeof window.toast === "function") {
      window.toast(message);
      return;
    }
    let wrap = document.getElementById("toasts");
    if (!wrap) {
      wrap = document.createElement("div");
      wrap.id = "toasts";
      wrap.className = "toast-wrap";
      wrap.setAttribute("aria-live", "polite");
      document.body.appendChild(wrap);
    }
    const item = document.createElement("div");
    item.className = "toast";
    item.textContent = message;
    wrap.appendChild(item);
    window.setTimeout(() => item.remove(), 3200);
  }

  function dataFrom(node) {
    return {
      post: String(node?.dataset.previewPost || "").replace(/\D/g, ""),
      title: node?.dataset.previewTitle || "Truyện sắp edit",
      author: node?.dataset.previewAuthor || "",
      cover: node?.dataset.previewCover || "",
      label: node?.dataset.previewLabel || "Truyện mới",
      teaser: node?.dataset.previewTeaser || "",
    };
  }

  function attrs(data) {
    return `data-preview-post="${esc(data.post)}" data-preview-title="${esc(data.title)}" data-preview-author="${esc(data.author)}" data-preview-cover="${esc(data.cover)}" data-preview-label="${esc(data.label)}" data-preview-teaser="${esc(data.teaser)}"`;
  }

  function posterMarkup(data) {
    const canPlay = !!data.post;
    return `<div class="preview-station-media">
      ${data.cover ? `<img class="preview-station-backdrop" src="${esc(data.cover)}" alt="" aria-hidden="true"><img class="preview-station-poster" src="${esc(data.cover)}" alt="Bìa ${esc(data.title)}">` : `<span class="preview-station-no-cover" aria-hidden="true">V</span>`}
      ${canPlay
        ? `<button class="preview-station-play" type="button" ${attrs(data)} aria-label="Phát teaser ${esc(data.title)} ngay tại đây"><span aria-hidden="true">▶</span><small>Phát tại đây</small></button>`
        : `<span class="preview-station-pending"><i aria-hidden="true"></i>Teaser đang chuẩn bị</span>`}
    </div>
    <div class="preview-station-copy">
      <span class="preview-station-now"><i aria-hidden="true"></i>${canPlay ? "Sẵn sàng phát" : "Đang chuẩn bị"}</span>
      <h3>${esc(data.title)}</h3>
      <p class="preview-station-author">${esc(data.author || "Chưa cập nhật tác giả")}</p>
      <div class="preview-station-pills"><span>Sắp edit</span><span>${esc(data.label)}</span></div>
      <p class="preview-station-teaser">${esc(data.teaser || "Một câu chuyện mới đang được chuẩn bị tại ViCamBachGiai.")}</p>
    </div>`;
  }

  function showPoster(station, data) {
    const stage = station.querySelector("[data-preview-stage]");
    if (!stage) return;
    stage.classList.remove("is-playing");
    Object.assign(stage.dataset, {
      previewPost: data.post,
      previewTitle: data.title,
      previewAuthor: data.author,
      previewCover: data.cover,
      previewLabel: data.label,
      previewTeaser: data.teaser,
    });
    stage.innerHTML = posterMarkup(data);
  }

  function play(station, data) {
    if (!data.post) {
      showPoster(station, data);
      notify("Teaser của truyện này đang được chuẩn bị.");
      return;
    }
    const stage = station.querySelector("[data-preview-stage]");
    if (!stage) return;
    Object.assign(stage.dataset, {
      previewPost: data.post,
      previewTitle: data.title,
      previewAuthor: data.author,
      previewCover: data.cover,
      previewLabel: data.label,
      previewTeaser: data.teaser,
    });
    stage.classList.add("is-playing");
    stage.innerHTML = `<header class="preview-station-playing-head">
      <div><span><i aria-hidden="true"></i>Đang phát tại đây</span><h3>${esc(data.title)}</h3></div>
      <button class="preview-station-close" type="button" aria-label="Đóng video">× <small>Đóng video</small></button>
    </header>
    <div class="preview-station-video">
      ${data.cover ? `<img src="${esc(data.cover)}" alt="" aria-hidden="true">` : ""}
      <iframe title="Teaser TikTok ${esc(data.title)}" src="https://www.tiktok.com/player/v1/${data.post}?autoplay=1&muted=0&loop=0&controls=1&progress_bar=1&play_button=1&volume_control=1&fullscreen_button=1&description=0&music_info=0&rel=0&native_context_menu=0" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe>
    </div>`;
    stage.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "nearest" });
  }

  document.addEventListener("click", (event) => {
    const station = event.target.closest(".preview-station");
    if (!station) return;
    const card = event.target.closest(".preview-station-card");
    if (card) {
      event.preventDefault();
      station.querySelectorAll(".preview-station-card").forEach((item) => item.classList.toggle("is-active", item === card));
      play(station, dataFrom(card));
      return;
    }
    const launch = event.target.closest(".preview-station-play");
    if (launch) {
      event.preventDefault();
      play(station, dataFrom(launch));
      return;
    }
    if (event.target.closest(".preview-station-close")) {
      event.preventDefault();
      showPoster(station, dataFrom(station.querySelector("[data-preview-stage]")));
    }
  });
})();
