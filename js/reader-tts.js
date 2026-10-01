(function () {
  "use strict";
  var synth = window.speechSynthesis;
  var PREF_KEY = "vcbg_tts_prefs";
  var AUTO_KEY = "vcbg_tts_autoplay";
  var MAX_CHUNK = 900;
  var state = null;

  function esc(v) {
    return String(v == null ? "" : v).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function loadPrefs() {
    try { return Object.assign({ rate: 1, voice: "female" }, JSON.parse(localStorage.getItem(PREF_KEY) || "{}")); }
    catch (_) { return { rate: 1, voice: "female" }; }
  }
  function savePrefs(p) {
    try { localStorage.setItem(PREF_KEY, JSON.stringify(p)); } catch (_) {}
  }

  // opts: { cover, title }
  function html(opts) {
    opts = opts || {};
    var rates = [0.8, 0.9, 1, 1.1, 1.25, 1.5, 1.75, 2];
    return '<section class="chapter-youtube-audio reader-tts" data-reader-tts>' +
      '<div class="chapter-youtube-bar">' +
        '<button type="button" class="tts-hit" data-tts="toggle" aria-label="Nghe đọc chương">' +
          '<span class="chapter-youtube-cover" style="--audio-cover:url(\'' + esc(opts.cover || "brand/mark.png") + '\')" aria-hidden="true"><i data-tts-icon>▶</i></span>' +
          '<span class="chapter-youtube-copy"><small data-tts-label>NGHE ĐỌC TRUYỆN</small><strong data-tts-status>' + esc(opts.title || "Nghe chương này") + '</strong></span>' +
          '<span class="chapter-youtube-action" data-tts-action>Phát</span>' +
        '</button>' +
        '<button type="button" class="tts-chevron" data-tts="panel" aria-expanded="false" aria-label="Tuỳ chỉnh giọng đọc"><span class="chapter-youtube-chevron" aria-hidden="true">⌄</span></button>' +
      '</div>' +
      '<div class="tts-panel" data-tts-panel hidden>' +
        '<div class="tts-row">' +
          '<button type="button" class="tts-step" data-tts="prev" aria-label="Đoạn trước">⏮</button>' +
          '<button type="button" class="tts-step tts-step-main" data-tts="toggle" aria-label="Phát hoặc tạm dừng" data-tts-icon2>▶</button>' +
          '<button type="button" class="tts-step" data-tts="next" aria-label="Đoạn sau">⏭</button>' +
        '</div>' +
        '<div class="tts-row tts-opts">' +
          '<label>Tốc độ<select data-tts="rate">' + rates.map(function (r) { return '<option value="' + r + '">' + r + '×</option>'; }).join("") + '</select></label>' +
          '<label data-tts-voice-wrap>Giọng<select data-tts="voice"><option value="female">Giọng nữ</option><option value="male">Giọng nam</option></select></label>' +
        '</div>' +
      '</div>' +
    '</section>';
  }

  function paragraphs(body) {
    return Array.prototype.slice.call(body.querySelectorAll("p.r-p")).map(function (p) {
      var c = p.cloneNode(true);
      Array.prototype.forEach.call(c.querySelectorAll(".p-bubble,.p-menu"), function (n) { n.remove(); });
      return { el: p, text: c.textContent.replace(/\s+/g, " ").trim() };
    }).filter(function (x) { return /[\p{L}\p{N}]/u.test(x.text); });
  }

  function chunks(text) {
    var out = [];
    var parts = text.match(/[^.!?…。]+[.!?…。]*["”’)]*\s*/g) || [text];
    var cur = "";
    parts.forEach(function (s) {
      if ((cur + s).length > MAX_CHUNK && cur) { out.push(cur.trim()); cur = ""; }
      cur += s;
    });
    if (cur.trim()) out.push(cur.trim());
    return out;
  }

  // ---- neural voice from /api/tts, with browser voice as fallback ----
  function silentUrl() {
    var n = 800, buf = new ArrayBuffer(44 + n * 2), v = new DataView(buf);
    var w = function (o, s) { for (var i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
    w(0, "RIFF"); v.setUint32(4, 36 + n * 2, true); w(8, "WAVEfmt ");
    v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
    v.setUint32(24, 8000, true); v.setUint32(28, 16000, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true);
    w(36, "data"); v.setUint32(40, n * 2, true);
    return URL.createObjectURL(new Blob([buf], { type: "audio/wav" }));
  }

  function fetchAudio(text) {
    var key = state.prefs.voice + "|" + text;
    if (state.cache[key]) return state.cache[key];
    var p = fetch("/api/tts", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text: text, voice: state.prefs.voice })
    }).then(function (r) {
      if (!r.ok) throw new Error("tts " + r.status);
      return r.blob();
    }).then(function (b) { return URL.createObjectURL(b); });
    state.cache[key] = p;
    p.catch(function () { delete state.cache[key]; });
    return p;
  }

  function prefetch(i) {
    if (!state || !state.neural || i >= state.items.length) return;
    chunks(state.items[i].text).slice(0, 2).forEach(function (c) { fetchAudio(c).catch(function () {}); });
  }

  function setUi() {
    if (!state) return;
    var b = state.box;
    var playing = state.playing;
    b.classList.toggle("is-playing", playing);
    b.querySelector("[data-tts-icon]").textContent = playing ? "Ⅱ" : "▶";
    b.querySelector("[data-tts-icon2]").textContent = playing ? "Ⅱ" : "▶";
    b.querySelector("[data-tts-action]").textContent = playing ? "Tạm dừng" : (state.idx > 0 ? "Tiếp tục" : "Phát");
    b.querySelector("[data-tts-status]").textContent = playing || state.idx > 0
      ? "Đang đọc · đoạn " + (Math.min(state.idx, state.items.length - 1) + 1) + "/" + state.items.length
      : state.title;
    b.querySelector("[data-tts-label]").textContent = state.neural === false ? "GIỌNG MÁY CỦA THIẾT BỊ" : "NGHE ĐỌC TRUYỆN";
    b.querySelector("[data-tts-voice-wrap]").hidden = state.neural === false;
  }

  function mark(i) {
    if (state.current) state.current.classList.remove("tts-reading");
    var el = state.items[i] && state.items[i].el;
    state.current = el || null;
    if (el) {
      el.classList.add("tts-reading");
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }

  function finish() {
    var href = state && state.nextHref;
    halt(true);
    if (href) {
      try { sessionStorage.setItem(AUTO_KEY, "1"); } catch (_) {}
      location.hash = href;
    }
  }

  function halt(reset) {
    if (!state) return;
    state.token++;
    state.audio.pause();
    try { synth && synth.cancel(); } catch (_) {}
    state.playing = false;
    if (state.current) state.current.classList.remove("tts-reading");
    if (reset) state.idx = 0;
    setUi();
  }

  function speakFrom(i) {
    if (!state) return;
    if (i >= state.items.length) return finish();
    var token = ++state.token;
    state.audio.pause();
    try { synth && synth.cancel(); } catch (_) {}
    state.idx = i;
    state.playing = true;
    mark(i);
    setUi();
    prefetch(i + 1);
    var list = chunks(state.items[i].text);
    var n = 0;
    var next = function () {
      if (!state || token !== state.token) return;
      if (n >= list.length) return speakFrom(i + 1);
      var text = list[n++];
      if (state.neural !== false) {
        fetchAudio(text).then(function (url) {
          if (!state || token !== state.token) return;
          var a = state.audio;
          a.onended = next;
          a.onerror = function () { if (state && token === state.token) fallback(i, text, token, next); };
          a.src = url;
          a.playbackRate = state.prefs.rate;
          var pr = a.play();
          if (pr && pr.catch) pr.catch(function (e) {
            if (!state || token !== state.token) return;
            if (e && e.name === "NotAllowedError") { state.playing = false; setUi(); }
            else fallback(i, text, token, next);
          });
        }).catch(function () {
          if (state && token === state.token) fallback(i, text, token, next);
        });
      } else {
        browserSpeak(text, next, token);
      }
    };
    next();
  }

  function fallback(i, text, token, next) {
    if (!synth || typeof SpeechSynthesisUtterance === "undefined") {
      state.neural = false;
      halt(false);
      state.box.querySelector("[data-tts-status]").textContent = "Chưa nghe được trên thiết bị này";
      return;
    }
    state.neural = false;
    setUi();
    browserSpeak(text, next, token);
  }

  function browserSpeak(text, next, token) {
    var u = new SpeechSynthesisUtterance(text);
    u.lang = "vi-VN";
    u.rate = state.prefs.rate;
    var v = synth.getVoices().filter(function (x) { return /^vi/i.test(x.lang); })[0];
    if (v) { u.voice = v; u.lang = v.lang; }
    u.onend = next;
    u.onerror = function (e) {
      if (e && (e.error === "canceled" || e.error === "interrupted")) return;
      if (state && token === state.token) next();
    };
    synth.speak(u);
  }

  function toggle() {
    if (!state) return;
    // Unlock audio playback inside the user gesture (needed on iOS Safari).
    if (!state.unlocked) {
      state.unlocked = true;
      try { state.audio.src = state.silent; var pr = state.audio.play(); if (pr && pr.catch) pr.catch(function () {}); } catch (_) {}
    }
    if (state.playing) {
      state.playing = false;
      state.audio.pause();
      state.paused = state.neural !== false && state.audio.src && state.audio.src !== state.silent;
      if (state.neural === false) { try { synth.cancel(); } catch (_) {} state.token++; state.paused = false; }
      setUi();
    } else if (state.paused) {
      state.paused = false;
      state.playing = true;
      state.audio.play();
      setUi();
    } else {
      speakFrom(state.idx);
    }
  }

  function bind(page, opts) {
    unbind();
    var box = page && page.querySelector("[data-reader-tts]");
    var body = page && page.querySelector("#rbody");
    if (!box || !body) return;
    var items = paragraphs(body);
    if (!items.length) { box.hidden = true; return; }
    var nextLink = page.querySelector(".r-nav-r[href]");
    var audio = new Audio();
    audio.preload = "auto";
    state = {
      box: box, items: items, idx: 0, token: 0, playing: false, paused: false, unlocked: false,
      current: null, cache: {}, neural: null, audio: audio, silent: silentUrl(),
      title: (opts && opts.title) || "Nghe chương này",
      prefs: loadPrefs(),
      nextHref: nextLink ? nextLink.getAttribute("href") : ""
    };
    box.querySelector('[data-tts="rate"]').value = String(state.prefs.rate);
    box.querySelector('[data-tts="voice"]').value = state.prefs.voice;

    box.addEventListener("click", function (e) {
      var t = e.target.closest("[data-tts]");
      if (!t || !state) return;
      e.stopPropagation();
      var a = t.dataset.tts;
      if (a === "toggle") toggle();
      else if (a === "prev") { state.paused = false; speakFrom(Math.max(0, state.idx - 1)); }
      else if (a === "next") { state.paused = false; speakFrom(Math.min(state.items.length - 1, state.idx + 1)); }
      else if (a === "panel") {
        var panel = box.querySelector("[data-tts-panel]");
        var open = t.getAttribute("aria-expanded") === "true";
        panel.hidden = open;
        t.setAttribute("aria-expanded", String(!open));
        box.classList.toggle("is-open", !open);
      }
    });
    box.addEventListener("change", function (e) {
      var t = e.target.closest("select[data-tts]");
      if (!t || !state) return;
      if (t.dataset.tts === "rate") {
        state.prefs.rate = Number(t.value) || 1;
        state.audio.playbackRate = state.prefs.rate;
        if (state.neural === false && state.playing) speakFrom(state.idx);
      }
      if (t.dataset.tts === "voice") {
        state.prefs.voice = t.value;
        if (state.playing || state.paused) { state.paused = false; speakFrom(state.idx); }
      }
      savePrefs(state.prefs);
    });
    // Tap a paragraph to start reading from it once the player has been used.
    body.addEventListener("dblclick", function (e) {
      var p = e.target.closest("p.r-p");
      if (!p || !state) return;
      var i = state.items.findIndex(function (x) { return x.el === p; });
      if (i >= 0 && (state.playing || state.paused)) { state.paused = false; speakFrom(i); }
    });

    if ("mediaSession" in navigator) {
      try {
        navigator.mediaSession.metadata = new MediaMetadata({ title: state.title, artist: "ViCamBachGiai", artwork: opts && opts.cover ? [{ src: opts.cover }] : [] });
        navigator.mediaSession.setActionHandler("play", function () { if (!state.playing) toggle(); });
        navigator.mediaSession.setActionHandler("pause", function () { if (state.playing) toggle(); });
        navigator.mediaSession.setActionHandler("previoustrack", function () { speakFrom(Math.max(0, state.idx - 1)); });
        navigator.mediaSession.setActionHandler("nexttrack", function () { speakFrom(state.idx + 1); });
      } catch (_) {}
    }

    var auto = false;
    try { auto = sessionStorage.getItem(AUTO_KEY) === "1"; sessionStorage.removeItem(AUTO_KEY); } catch (_) {}
    if (auto) speakFrom(0);
  }

  function unbind() {
    if (!state) return;
    state.token++;
    try { state.audio.pause(); state.audio.removeAttribute("src"); } catch (_) {}
    try { synth && synth.cancel(); } catch (_) {}
    if (state.current) state.current.classList.remove("tts-reading");
    Object.keys(state.cache).forEach(function (k) {
      state.cache[k].then(function (u) { URL.revokeObjectURL(u); }, function () {});
    });
    try { URL.revokeObjectURL(state.silent); } catch (_) {}
    if ("mediaSession" in navigator) {
      try { ["play", "pause", "previoustrack", "nexttrack"].forEach(function (a) { navigator.mediaSession.setActionHandler(a, null); }); } catch (_) {}
    }
    state = null;
  }

  window.addEventListener("hashchange", function () {
    setTimeout(function () {
      if (state && !document.body.contains(state.box)) unbind();
    }, 400);
  });
  window.addEventListener("pagehide", unbind);

  window.VCBGReaderTTS = { html: html, bind: bind, stop: unbind };
})();
