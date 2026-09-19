// TRẠM PREVIEW: synchronized story carousel with lazy TikTok playback.
(function () {
  const reduceMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
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
      status: node?.dataset.previewStatus || "Đang cập nhật",
      teaser: node?.dataset.previewTeaser || "",
    };
  }

  function attrs(data) {
    return [
      `data-preview-post="${esc(data.post)}"`,
      `data-preview-title="${esc(data.title)}"`,
      `data-preview-author="${esc(data.author)}"`,
      `data-preview-cover="${esc(data.cover)}"`,
      `data-preview-label="${esc(data.label)}"`,
      `data-preview-status="${esc(data.status)}"`,
      `data-preview-teaser="${esc(data.teaser)}"`,
    ].join(" ");
  }

  function writeStageData(stage, data) {
    Object.assign(stage.dataset, {
      previewPost: data.post,
      previewTitle: data.title,
      previewAuthor: data.author,
      previewCover: data.cover,
      previewLabel: data.label,
      previewStatus: data.status,
      previewTeaser: data.teaser,
    });
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
      <div class="preview-station-pills"><span>${esc(data.status)}</span><span>${esc(data.label)}</span></div>
      <p class="preview-station-teaser">${esc(data.teaser || "Một câu chuyện mới đang được chuẩn bị tại ViCamBachGiai.")}</p>
    </div>`;
  }

  function showPoster(station, data) {
    const stage = station.querySelector("[data-preview-stage]");
    if (!stage) return;
    writeStageData(stage, data);
    stage.classList.remove("is-playing");
    stage.classList.add("is-switching");
    stage.innerHTML = posterMarkup(data);
    requestAnimationFrame(() => requestAnimationFrame(() => stage.classList.remove("is-switching")));
  }

  function play(station, data) {
    if (!data.post) {
      showPoster(station, data);
      notify("Teaser của truyện này đang được chuẩn bị.");
      return;
    }
    const stage = station.querySelector("[data-preview-stage]");
    if (!stage) return;
    writeStageData(stage, data);
    stage.classList.add("is-playing");
    stage.innerHTML = `<header class="preview-station-playing-head">
      <div><span><i aria-hidden="true"></i>Đang phát tại đây</span><h3>${esc(data.title)}</h3></div>
      <button class="preview-station-close" type="button" aria-label="Đóng video">× <small>Đóng video</small></button>
    </header>
    <div class="preview-station-video">
      ${data.cover ? `<img src="${esc(data.cover)}" alt="" aria-hidden="true">` : ""}
      <iframe title="Teaser TikTok ${esc(data.title)}" src="https://www.tiktok.com/player/v1/${data.post}?autoplay=1&muted=0&loop=0&controls=1&progress_bar=1&play_button=1&volume_control=1&fullscreen_button=1&description=0&music_info=0&rel=0&native_context_menu=0" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe>
    </div>`;
    stage.scrollIntoView({ behavior: reduceMotion() ? "auto" : "smooth", block: "nearest" });
  }

  function cards(station) {
    return Array.from(station.querySelectorAll(".preview-station-card"));
  }

  function centerCard(station, card, behavior) {
    const rail = station.querySelector(".preview-station-rail");
    if (!rail || !card) return;
    const left = card.offsetLeft - (rail.clientWidth - card.offsetWidth) / 2;
    rail.scrollTo({ left: Math.max(0, left), behavior: reduceMotion() ? "auto" : (behavior || "smooth") });
  }

  function syncIndicators(station, activeCard) {
    const list = cards(station);
    const index = Math.max(0, list.indexOf(activeCard));
    station.querySelectorAll("[data-preview-progress]").forEach((dot, dotIndex) => {
      const active = dotIndex === index;
      dot.classList.toggle("is-active", active);
      dot.setAttribute("aria-current", active ? "true" : "false");
    });
  }

  function selectCard(station, card, options) {
    if (!card) return;
    const stage = station.querySelector("[data-preview-stage]");
    const changed = !card.classList.contains("is-active") || !!stage?.classList.contains("is-playing");
    cards(station).forEach((item) => {
      const active = item === card;
      item.classList.toggle("is-active", active);
      item.setAttribute("aria-current", active ? "true" : "false");
      item.tabIndex = active ? 0 : -1;
    });
    syncIndicators(station, card);
    if (changed) showPoster(station, dataFrom(card));
    if (options?.center !== false) centerCard(station, card, options?.behavior);
  }

  function nearestCard(station) {
    const rail = station.querySelector(".preview-station-rail");
    const list = cards(station);
    if (!rail || !list.length) return null;
    const center = rail.scrollLeft + rail.clientWidth / 2;
    return list.reduce((best, card) => {
      const distance = Math.abs(card.offsetLeft + card.offsetWidth / 2 - center);
      return !best || distance < best.distance ? { card, distance } : best;
    }, null)?.card || null;
  }

  function bindStation(station) {
    if (!station || station.dataset.previewBound === "true") return;
    station.dataset.previewBound = "true";
    const rail = station.querySelector(".preview-station-rail");
    const initial = station.querySelector(".preview-station-card.is-active") || cards(station)[0];
    if (initial) {
      cards(station).forEach((card) => {
        const active = card === initial;
        card.setAttribute("aria-current", active ? "true" : "false");
        card.tabIndex = active ? 0 : -1;
      });
      syncIndicators(station, initial);
      requestAnimationFrame(() => centerCard(station, initial, "auto"));
    }
    if (!rail) return;
    let settleTimer = 0;
    const settle = () => {
      window.clearTimeout(settleTimer);
      settleTimer = window.setTimeout(() => {
        const next = nearestCard(station);
        const current = station.querySelector(".preview-station-card.is-active");
        if (next && next !== current) selectCard(station, next, { center: false });
      }, 110);
    };
    rail.addEventListener("scroll", settle, { passive: true });
    rail.addEventListener("scrollend", () => {
      window.clearTimeout(settleTimer);
      const next = nearestCard(station);
      if (next) selectCard(station, next, { center: true });
    }, { passive: true });
  }

  function bindAll(root) {
    (root || document).querySelectorAll?.(".preview-station").forEach(bindStation);
  }

  document.addEventListener("click", (event) => {
    const station = event.target.closest(".preview-station");
    if (!station) return;
    bindStation(station);

    const card = event.target.closest(".preview-station-card");
    if (card) {
      event.preventDefault();
      selectCard(station, card, { center: true });
      return;
    }

    const dot = event.target.closest("[data-preview-progress]");
    if (dot) {
      event.preventDefault();
      selectCard(station, cards(station)[Number(dot.dataset.previewProgress)], { center: true });
      return;
    }

    const playButton = event.target.closest(".preview-station-play");
    if (playButton) {
      event.preventDefault();
      play(station, dataFrom(playButton));
      return;
    }

    if (event.target.closest(".preview-station-close")) {
      event.preventDefault();
      showPoster(station, dataFrom(station.querySelector("[data-preview-stage]")));
    }
  });

  document.addEventListener("keydown", (event) => {
    const card = event.target.closest(".preview-station-card");
    if (!card || !["ArrowLeft", "ArrowRight"].includes(event.key)) return;
    const station = card.closest(".preview-station");
    const list = cards(station);
    const index = list.indexOf(card);
    const next = list[index + (event.key === "ArrowRight" ? 1 : -1)];
    if (!next) return;
    event.preventDefault();
    selectCard(station, next, { center: true });
    next.focus({ preventScroll: true });
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => bindAll(document), { once: true });
  } else {
    bindAll(document);
  }
  new MutationObserver((mutations) => {
    if (mutations.some((item) => item.addedNodes.length)) bindAll(document);
  }).observe(document.documentElement, { childList: true, subtree: true });
})();
