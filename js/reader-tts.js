(function () {
  "use strict";
  var synth = window.speechSynthesis;
  var KEY = "vcbg_tts_prefs";
  var AUTO_KEY = "vcbg_tts_autoplay";
  var state = null;

  function loadPrefs() {
    try {
      return Object.assign({ rate: 1, voice: "" }, JSON.parse(localStorage.getItem(KEY) || "{}"));
    } catch (_) {
      return { rate: 1, voice: "" };
    }
  }
  function savePrefs(p) {
    try { localStorage.setItem(KEY, JSON.stringify(p)); } catch (_) {}
  }

  function html() {
    if (!synth || typeof SpeechSynthesisUtterance === "undefined") return "";
    return '<section class="reader-tts" data-reader-tts>' +
      '<button type="button" class="tts-main" data-tts="toggle" aria-label="Nghe đọc">▶</button>' +
      '<span class="tts-copy"><small>MÁY ĐỌC TRUYỆN</small><strong data-tts-status>Nghe đọc chương này</strong></span>' +
      '<button type="button" class="tts-step" data-tts="prev" aria-label="Đoạn trước">⏮</button>' +
      '<button type="button" class="tts-step" data-tts="next" aria-label="Đoạn sau">⏭</button>' +
      '<select class="tts-rate" data-tts="rate" aria-label="Tốc độ đọc">' +
      [0.75, 1, 1.25, 1.5, 1.75, 2].map(function (r) { return '<option value="' + r + '">' + r + '×</option>'; }).join("") +
      '</select>' +
      '<select class="tts-voice" data-tts="voice" aria-label="Giọng đọc" hidden></select>' +
      '</section>';
  }

  function paragraphs(body) {
    return Array.prototype.slice.call(body.querySelectorAll("p.r-p")).map(function (p) {
      var c = p.cloneNode(true);
      Array.prototype.forEach.call(c.querySelectorAll(".p-bubble,.p-menu"), function (n) { n.remove(); });
      return { el: p, text: c.textContent.replace(/\s+/g, " ").trim() };
    }).filter(function (x) { return x.text; });
  }

  // Chrome stops long utterances, so split into sentence-sized chunks.
  function chunks(text) {
    var out = [];
    var parts = text.match(/[^.!?…。]+[.!?…。]*["”’)]*\s*/g) || [text];
    var cur = "";
    parts.forEach(function (s) {
      if ((cur + s).length > 180 && cur) { out.push(cur); cur = ""; }
      cur += s;
    });
    if (cur.trim()) out.push(cur);
    return out;
  }

  function viVoices() {
    return synth.getVoices().filter(function (v) { return /^vi/i.test(v.lang); });
  }

  function stop(reset) {
    if (!state) return;
    state.token++;
    try { synth.cancel(); } catch (_) {}
    state.playing = false;
    if (state.current) state.current.classList.remove("tts-reading");
    if (reset) state.idx = 0;
    render();
  }

  function render() {
    if (!state) return;
    var b = state.box.querySelector(".tts-main");
    b.textContent = state.playing ? "Ⅱ" : "▶";
    b.setAttribute("aria-label", state.playing ? "Tạm dừng" : "Nghe đọc");
    state.box.classList.toggle("is-playing", state.playing);
    var st = state.box.querySelector("[data-tts-status]");
    st.textContent = state.playing || state.idx > 0
      ? "Đoạn " + (Math.min(state.idx, state.items.length - 1) + 1) + "/" + state.items.length
      : "Nghe đọc chương này";
  }

  function speakFrom(i) {
    if (!state) return;
    if (i >= state.items.length) {
      stop(true);
      if (state.nextHref) {
        try { sessionStorage.setItem(AUTO_KEY, "1"); } catch (_) {}
        location.hash = state.nextHref;
      }
      return;
    }
    try { synth.cancel(); } catch (_) {}
    var token = ++state.token;
    state.idx = i;
    state.playing = true;
    if (state.current) state.current.classList.remove("tts-reading");
    var item = state.items[i];
    state.current = item.el;
    item.el.classList.add("tts-reading");
    item.el.scrollIntoView({ behavior: "smooth", block: "center" });
    render();
    var list = chunks(item.text);
    var n = 0;
    var next = function () {
      if (!state || token !== state.token) return;
      if (n >= list.length) return speakFrom(i + 1);
      var u = new SpeechSynthesisUtterance(list[n++]);
      u.lang = "vi-VN";
      u.rate = state.prefs.rate;
      var v = synth.getVoices().filter(function (x) { return x.name === state.prefs.voice; })[0] || viVoices()[0];
      if (v) { u.voice = v; u.lang = v.lang; }
      u.onend = next;
      u.onerror = function (e) {
        if (e && (e.error === "canceled" || e.error === "interrupted")) return;
        next();
      };
      synth.speak(u);
    };
    next();
  }

  function bind(page) {
    unbind();
    var box = page && page.querySelector("[data-reader-tts]");
    var body = page && page.querySelector("#rbody");
    if (!box || !body) return;
    var items = paragraphs(body);
    if (!items.length) { box.hidden = true; return; }
    var nextLink = page.querySelector(".r-nav-r[href]");
    state = {
      box: box, items: items, idx: 0, token: 0, playing: false, current: null,
      prefs: loadPrefs(),
      nextHref: nextLink ? nextLink.getAttribute("href") : ""
    };

    var rate = box.querySelector('[data-tts="rate"]');
    rate.value = String(state.prefs.rate);
    var voiceSel = box.querySelector('[data-tts="voice"]');
    var fillVoices = function () {
      var vs = viVoices();
      if (!vs.length) {
        box.querySelector(".tts-copy small").textContent = "THIẾT BỊ CHƯA CÓ GIỌNG TIẾNG VIỆT";
        return;
      }
      if (vs.length > 1) {
        voiceSel.hidden = false;
        voiceSel.innerHTML = vs.map(function (v) {
          return '<option value="' + v.name.replace(/"/g, "&quot;") + '">' + v.name + "</option>";
        }).join("");
        voiceSel.value = state && state.prefs.voice || vs[0].name;
      }
    };
    fillVoices();
    if (synth.addEventListener) synth.addEventListener("voiceschanged", fillVoices);

    box.addEventListener("click", function (e) {
      var t = e.target.closest("[data-tts]");
      if (!t || !state) return;
      e.stopPropagation();
      var a = t.dataset.tts;
      if (a === "toggle") {
        if (state.playing) {
          stop(false);
        } else {
          speakFrom(state.idx);
        }
      } else if (a === "prev") {
        speakFrom(Math.max(0, state.idx - 1));
      } else if (a === "next") {
        speakFrom(Math.min(state.items.length - 1, state.idx + 1));
      }
    });
    box.addEventListener("change", function (e) {
      var t = e.target.closest("[data-tts]");
      if (!t || !state) return;
      if (t.dataset.tts === "rate") state.prefs.rate = Number(t.value) || 1;
      if (t.dataset.tts === "voice") state.prefs.voice = t.value;
      savePrefs(state.prefs);
      if (state.playing) speakFrom(state.idx);
    });

    var auto = false;
    try { auto = sessionStorage.getItem(AUTO_KEY) === "1"; sessionStorage.removeItem(AUTO_KEY); } catch (_) {}
    if (auto) speakFrom(0);
  }

  function unbind() {
    if (state) {
      try { synth.cancel(); } catch (_) {}
      if (state.current) state.current.classList.remove("tts-reading");
      state.token++;
      state = null;
    }
  }

  window.addEventListener("hashchange", function () {
    setTimeout(function () {
      if (state && !document.body.contains(state.box)) unbind();
    }, 400);
  });
  window.addEventListener("pagehide", unbind);

  window.VCBGReaderTTS = { html: html, bind: bind, stop: unbind };
})();
