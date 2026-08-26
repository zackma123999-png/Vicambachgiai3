/* ViCamBachGiai — UI, router, reader, admin */
(function () {
  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));
  const app = () => $("#app");
  const esc = (s) => {
    return String(s == null ? "" : s)
      .replace(/&/g, "&" + "amp;")
      .replace(/</g, "&" + "lt;")
      .replace(/>/g, "&" + "gt;")
      .replace(/"/g, "&" + "quot;");
  };
  const ALLOWED = new Set(["P", "BR", "STRONG", "B", "EM", "I", "U", "S", "STRIKE", "H2", "H3", "H4", "BLOCKQUOTE", "UL", "OL", "LI", "A", "IMG", "DIV", "SPAN", "HR"]);
  function cleanStyle(value) {
    const kept = [];
    String(value || "")
      .split(";")
      .forEach((part) => {
        const i = part.indexOf(":");
        if (i < 0) return;
        const prop = part.slice(0, i).trim().toLowerCase();
        const val = part.slice(i + 1).trim();
        if (!prop || !val) return;
        if (prop === "text-align" && /^(left|center|right|justify)$/i.test(val)) kept.push("text-align: " + val.toLowerCase());
        else if (/^margin(-(top|right|bottom|left))?$/.test(prop) && /^[0-9.]+(px|em|rem|%)$/i.test(val)) kept.push(prop + ": " + val);
        else if (prop === "line-height" && /^[0-9.]+(px|em|rem|%)?$/i.test(val)) kept.push("line-height: " + val);
        else if (prop === "text-indent" && /^-?[0-9.]+(px|em|rem|%)$/i.test(val)) kept.push("text-indent: " + val);
      });
    return kept.join("; ");
  }
  function sanitize(html) {
    const box = document.createElement("div");
    box.innerHTML = String(html || "");
    (function walk(n) {
      [...n.childNodes].forEach((c) => {
        if (c.nodeType === 1) {
          if (!ALLOWED.has(c.tagName)) {
            c.replaceWith(...c.childNodes);
            return;
          }
          [...c.attributes].forEach((a) => {
            if (a.name === "align" && /^(left|center|right|justify)$/i.test(a.value)) {
              const cur = c.getAttribute("style") || "";
              if (!/text-align\s*:/i.test(cur)) c.style.textAlign = a.value.toLowerCase();
              c.removeAttribute("align");
              return;
            }
            if (a.name === "style") {
              const cleaned = cleanStyle(a.value);
              if (cleaned) c.setAttribute("style", cleaned);
              else c.removeAttribute("style");
              return;
            }
            const ok =
              (c.tagName === "A" && a.name === "href" && /^(https?:|mailto:|#)/i.test(a.value)) ||
              (c.tagName === "IMG" && a.name === "src" && /^(data:image\/|covers\/|brand\/|https?:)/i.test(a.value)) ||
              a.name === "alt" ||
              a.name === "class";
            if (!ok) c.removeAttribute(a.name);
          });
          walk(c);
        }
      });
    })(box);
    return box.innerHTML;
  }
  function applyParaGap(html, gap) {
    const box = document.createElement("div");
    box.innerHTML = html || "";
    box.querySelectorAll("p").forEach((p) => {
      p.style.marginBottom = gap + "em";
    });
    return box.innerHTML;
  }
  function textToHtml(text) {
    return String(text || "")
      .replace(/\r\n/g, "\n")
      .split(/\n{2,}/)
      .map((block) => {
        const lines = block.split("\n").map((l) => esc(l)).join("<br>");
        return "<p>" + (lines || "<br>") + "</p>";
      })
      .join("");
  }
  function toast(msg) {
    let wrap = $("#toasts");
    if (!wrap) {
      wrap = document.createElement("div");
      wrap.id = "toasts";
      wrap.className = "toast-wrap";
      document.body.appendChild(wrap);
    }
    const el = document.createElement("div");
    el.className = "toast";
    el.textContent = msg;
    wrap.appendChild(el);
    setTimeout(() => el.remove(), 3200);
  }
  function fmtDate(ts) {
    if (!ts) return "";
    return new Date(ts).toLocaleDateString("vi-VN");
  }
  function statusLabel(s) {
    return { ongoing: "Đang lên sóng", completed: "Đã hoàn thành", upcoming: "Sắp ra mắt" }[s] || s;
  }
  function storyStatusLabel(s) {
    return s && s.upcoming ? "Sắp ra mắt" : statusLabel(s && s.status);
  }
  function storyInfoText(s) {
    const raw = String((s && s.description) || "").trim();
    const syn = String((s && s.synopsis) || "").trim();
    if (raw && raw !== syn) return raw;
    const kinds = []
      .concat((s.genres || []).map((g) => g.name))
      .concat((s.tags || []).map((t) => t.name))
      .filter(Boolean);
    return [
      "Tên truyện: " + (s.title || "—"),
      "Tác giả: " + (s.author || "—"),
      kinds.length ? "Thể loại: " + kinds.join(", ") : "",
      "Tình trạng: " + storyStatusLabel(s),
      s.editor ? "Edit: " + s.editor : "",
      s.created_at ? "Ngày bắt đầu: " + fmtDate(s.created_at) : "",
    ]
      .filter(Boolean)
      .join("\n");
  }
  function formatStoryInfo(text) {
    return String(text || "")
      .split(/\r?\n/)
      .map((line) => line.trimEnd())
      .filter((line, i, arr) => line || (i && arr[i - 1]))
      .map((line) => {
        const m = line.match(/^([^:]{1,40}):\s*(.*)$/);
        if (m) return `<p><strong>${esc(m[1])}:</strong> ${esc(m[2] || "—")}</p>`;
        return line ? `<p>${esc(line)}</p>` : "<p><br></p>";
      })
      .join("");
  }
  function formatLandscapeInfo(text) {
    return String(text || "")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .filter((line) => {
        const m = line.match(/^([^:]{1,60}):\s*(.*)$/);
        return !m || Boolean(String(m[2] || "").trim());
      })
      .map((line) => {
        const m = line.match(/^([^:]{1,60}):\s*(.*)$/);
        if (m) return `<p><strong>${esc(m[1])}:</strong> <span>${esc(m[2])}</span></p>`;
        return `<p class="landscape-info-line">${esc(line)}</p>`;
      })
      .join("");
  }
  function setMeta(title, desc) {
    document.title = title;
    let m = document.querySelector('meta[name="description"]');
    if (m) m.setAttribute("content", desc || "");
    let og = document.querySelector('meta[property="og:title"]');
    if (og) og.setAttribute("content", title);
  }
  let currentPath = "/";
  let navigating = false;

  function readLocationPath() {
    try {
      const h = (location.hash || "").replace(/^#/, "");
      if (h) return h.startsWith("/") ? h : "/" + h;
    } catch (_) {}
    return currentPath || "/";
  }

  function parseHash() {
    const raw = readLocationPath() || "/";
    currentPath = raw.startsWith("/") ? raw : "/" + raw;
    const [path, qs] = currentPath.split("?");
    const parts = path.split("/").filter(Boolean);
    const q = Object.fromEntries(new URLSearchParams(qs || ""));
    if (!parts.length) return { name: "home", q };
    if (parts[0] === "kham-pha") return { name: "explore", q };
    if (parts[0] === "tu-truyen") return { name: "library", q };
    if (parts[0] === "dang-nhap") return { name: "login", q };
    if (parts[0] === "dang-ky") return { name: "register", q };
    if (parts[0] === "quen-mat-khau") return { name: "forgot", q };
    if (parts[0] === "tai-khoan") return { name: "account", q };
    if (parts[0] === "thong-bao") return { name: "notifs", q };
    if (parts[0] === "admin") return { name: "admin", parts, q };
    if (parts[0] === "truyen" && parts[1] && /^chuong-/.test(parts[2] || ""))
      return { name: "read", slug: parts[1], number: Number(String(parts[2]).replace("chuong-", "")), q };
    if (parts[0] === "truyen" && parts[1]) return { name: "story", slug: parts[1], q };
    return { name: "home", q };
  }
  function go(hash) {
    let path = String(hash || "/");
    if (path.startsWith("#")) path = path.slice(1);
    if (!path.startsWith("/")) path = "/" + path;
    currentPath = path;
    navigating = true;
    try {
      location.hash = "#" + path;
    } catch (_) {}
    const p = render();
    Promise.resolve(p).finally(() => {
      navigating = false;
    });
    return p;
  }

  const AUTH_RETURN_KEY = "vicambachgiai.auth.return.v1";

  function safeInternalPath(value) {
    let path = String(value || "").trim();
    if (path.startsWith("#")) path = path.slice(1);
    if (!path.startsWith("/") || path.startsWith("//")) return "";
    const name = path.split("?")[0];
    if (["/dang-nhap", "/dang-ky", "/quen-mat-khau"].includes(name)) return "";
    return path;
  }

  function authReturnSnapshot() {
    try {
      const saved = JSON.parse(sessionStorage.getItem(AUTH_RETURN_KEY) || "null");
      if (!saved || !safeInternalPath(saved.path)) return null;
      if (Date.now() - Number(saved.at || 0) > 30 * 60 * 1000) {
        sessionStorage.removeItem(AUTH_RETURN_KEY);
        return null;
      }
      return saved;
    } catch (_) {
      return null;
    }
  }

  function rememberAuthReturn(next) {
    const path = safeInternalPath(next) || safeInternalPath(readLocationPath());
    if (!path) return "";
    try {
      sessionStorage.setItem(
        AUTH_RETURN_KEY,
        JSON.stringify({ path, scrollY: Math.max(0, Math.round(window.scrollY || 0)), at: Date.now() })
      );
    } catch (_) {}
    return path;
  }

  function loginPath(next) {
    const path = safeInternalPath(next);
    return "/dang-nhap" + (path ? "?next=" + encodeURIComponent(path) : "");
  }

  function goToLogin(next) {
    const path = rememberAuthReturn(next);
    return go(loginPath(path));
  }

  async function replaceRoute(path) {
    const target = safeInternalPath(path) || "/";
    currentPath = target;
    navigating = true;
    try {
      history.replaceState(null, "", location.pathname + location.search + "#" + target);
    } catch (_) {
      location.hash = "#" + target;
    }
    try {
      return await render();
    } finally {
      navigating = false;
    }
  }

  async function returnFromAuth(target) {
    const snapshot = authReturnSnapshot();
    const path = safeInternalPath(target) || (snapshot && safeInternalPath(snapshot.path)) || "/";
    const scrollY = snapshot && snapshot.path === path ? Number(snapshot.scrollY) || 0 : 0;
    try {
      sessionStorage.removeItem(AUTH_RETURN_KEY);
    } catch (_) {}
    await replaceRoute(path);
    if (scrollY > 0) {
      requestAnimationFrame(() => {
        window.scrollTo(0, scrollY);
        setTimeout(() => window.scrollTo(0, scrollY), 180);
      });
    }
  }

  window.VCBGGoToLogin = goToLogin;

  const READ_KEY = "vicambachgiai.reader.v2";
  function defaultReadSize() {
    const w = window.innerWidth || 390;
    if (w < 640) return 1.05;
    if (w < 1024) return 1.14;
    return 1.22;
  }
  function readPrefs() {
    const base = { theme: "dark", size: defaultReadSize(), font: "serif", autoScrollSpeed: 1, autoNext: false };
    try {
      const saved = JSON.parse(localStorage.getItem(READ_KEY) || "{}");
      if (saved.theme) base.theme = saved.theme;
      if (saved.size) base.size = Number(saved.size);
      if (saved.font === "sans" || saved.font === "serif") base.font = saved.font;
      if (Number(saved.autoScrollSpeed)) base.autoScrollSpeed = Math.min(1.5, Math.max(0.5, Number(saved.autoScrollSpeed)));
      if (typeof saved.autoNext === "boolean") base.autoNext = saved.autoNext;
      return base;
    } catch {
      return base;
    }
  }
  function savePrefs(p) {
    try {
      localStorage.setItem(READ_KEY, JSON.stringify(p));
    } catch (_) {}
  }

  function coverImg(src, alt, eager) {
    const url = src || "";
    return `<div class="cover-frame"><img src="${esc(url)}" alt="${esc(alt || "")}" ${eager ? "" : 'loading="lazy"'} decoding="async"></div>`;
  }
  function logoHTML() {
    return `<a class="brand" href="#/" aria-label="ViCamBachGiai">
      <img class="brand-mark-img" src="brand/mark.png" alt="" width="42" height="47">
      <img class="brand-word-img" src="brand/word.png" alt="ViCamBachGiai" width="174" height="48">
    </a>`;
  }
  const SOCIAL_DEFAULTS = {
    youtube: "https://www.youtube.com",
    tiktok: "https://www.tiktok.com",
    facebook: "https://www.facebook.com",
    wattpad: "https://www.wattpad.com",
  };
  const SOCIAL_ICONS = {
    youtube: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M23 12.2s0-3.3-.4-4.8c-.2-.9-.9-1.6-1.8-1.8C19.1 5.2 12 5.2 12 5.2s-7.1 0-8.8.4c-.9.2-1.6.9-1.8 1.8C1 8.9 1 12.2 1 12.2s0 3.3.4 4.8c.2.9.9 1.6 1.8 1.8 1.7.4 8.8.4 8.8.4s7.1 0 8.8-.4c.9-.2 1.6-.9 1.8-1.8.4-1.5.4-4.8.4-4.8zM9.8 15.5V8.9l6.1 3.3-6.1 3.3z"/></svg>',
    tiktok: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M14.5 3c.3 2.4 1.6 4.1 4 4.5v2.3c-1.4 0-2.7-.4-4-1.2v6.6c0 3.3-2.6 5.8-5.9 5.8S2.7 18.5 2.7 15.2c0-3.2 2.5-5.7 5.7-5.8v2.5c-1.8.1-3.2 1.6-3.2 3.4 0 1.9 1.5 3.4 3.4 3.4s3.4-1.5 3.4-3.4V3h2.5z"/></svg>',
    facebook: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M14.5 8.5V6.8c0-.7.5-1 1.2-1h1.8V3h-2.5C12.2 3 11 4.5 11 6.7v1.8H9v2.8h2V21h3.5v-9.7h2.4l.4-2.8h-2.8z"/></svg>',
    wattpad: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M4.2 6.2c.8 0 1.4.3 1.8 1.1L8.4 12l2.3-4.7c.4-.8 1-1.1 1.8-1.1s1.4.3 1.8 1.1L16.6 12l2.4-4.7c.4-.8 1-1.1 1.8-1.1.9 0 1.5.7 1.5 1.6 0 .3 0 .5-.1.8l-3.2 8.1c-.4.9-1 1.3-1.9 1.3-.8 0-1.4-.4-1.8-1.2L13 12.4l-2.3 4.6c-.4.8-1 1.2-1.8 1.2-.9 0-1.5-.4-1.9-1.3L3.8 8.6c-.1-.3-.1-.5-.1-.8 0-.9.6-1.6 1.5-1.6z"/></svg>',
  };
  function socialStrip() {
    const so = (VCBG.settings() && VCBG.settings().social) || {};
    const items = [
      ["youtube", "YouTube"],
      ["tiktok", "TikTok"],
      ["facebook", "Facebook"],
      ["wattpad", "Wattpad"],
    ];
    return `<nav class="social-strip" aria-label="Mạng xã hội">${items
      .map(([k, label]) => {
        const href = String(so[k] || SOCIAL_DEFAULTS[k] || "").trim();
        if (!href) return "";
        return `<a class="social-ico" href="${esc(href)}" target="_blank" rel="noopener noreferrer" aria-label="${label}">${SOCIAL_ICONS[k]}</a>`;
      })
      .join("")}</nav>`;
  }
  function storyPills(s) {
    const bits = [storyStatusLabel(s)].concat((s.genres || []).slice(0, 1).map((g) => g.name));
    return bits.map((t) => `<span class="pill">${esc(t)}</span>`).join("");
  }
  function latestLine(s) {
    const ch = s.stats && s.stats.latest_chapter;
    if (!ch) return "Chưa có chương";
    return (ch.number ? ch.number + ". " : "") + (ch.title || ("Chương " + ch.number));
  }
  function fmtCount(n) {
    n = Number(n) || 0;
    if (n >= 10000) return (n / 1000).toFixed(n >= 100000 ? 0 : 1).replace(/\.0$/, "") + "K";
    if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, "") + "K";
    return String(n);
  }
  function storyCard(s, compact) {
    if (compact) {
      return `<a class="story-card compact" href="#/truyen/${esc(s.slug)}">
        ${coverImg(s.cover, "Bìa " + s.title)}
        <div class="meta"><h3>${esc(s.title)}</h3><div class="by">${esc(s.author)}</div></div>
      </a>`;
    }
    const latest = s.stats && s.stats.latest_chapter;
    const latestHref = latest ? `#/truyen/${esc(s.slug)}/chuong-${latest.number}` : `#/truyen/${esc(s.slug)}`;
    const saved = VCBG.isFavorite(s.id);
    const rating = s.stats.rating_avg || 0;
    const kinds = []
      .concat([s.upcoming ? "Sắp ra mắt" : statusLabel(s.status)])
      .concat((s.genres || []).map((g) => g.name))
      .concat((s.tags || []).map((t) => t.name))
      .filter(Boolean);
    const shown = kinds.slice(0, 2);
    const extra = kinds.length - shown.length;
    return `<article class="wide-card" data-slug="${esc(s.slug)}" style="--tone:${esc(s.accent || "#7c5cbf")}">
      <button type="button" class="wide-heart" data-fav="${esc(s.id)}" aria-label="${saved ? "Bỏ lưu" : "Lưu trữ"}" aria-pressed="${saved}">${saved ? "♥" : "♡"}</button>
      <a class="wide-cover" href="#/truyen/${esc(s.slug)}">${coverImg(s.cover, "Bìa " + s.title)}</a>
      <div class="wide-body">
        <a class="wide-title" href="#/truyen/${esc(s.slug)}"><h3>${esc(s.title)}</h3><em>›</em></a>
        <p class="by">Tác giả: ${esc(s.author || "—")}</p>
        <div class="pill-row">${shown.map((t) => `<span class="pill">${esc(t)}</span>`).join("")}${extra > 0 ? `<span class="pill pill-more">+${extra}</span>` : ""}</div>
        <div class="wide-stats">
          <span><i class="stat-eye" aria-hidden="true"></i>${fmtCount(s.stats.views)}</span>
          <span>★ ${rating}</span>
          <span>▤ ${s.stats.chapter_count} chương</span>
        </div>
        <a class="wide-latest" href="${latestHref}">
          <span><i></i> Chương mới</span>
          <b>${esc(latestLine(s))}</b>
          <em>›</em>
        </a>
      </div>
    </article>`;
  }
  function header(active) {
    const u = VCBG.currentUser();
    const unread = u ? VCBG.unreadCount() : 0;
    const admin = u && VCBG.isAdmin() ? `<a href="#/admin">Quản trị</a>` : "";
    const acc = u
      ? `<a class="icon-btn" href="#/thong-bao" aria-label="Thông báo">${unread ? "●" : "○"}</a>
         <a class="avatar-chip" href="#/tai-khoan" title="${esc(u.profile.display_name)}">${esc(u.profile.avatar)}</a>`
      : `<a class="btn btn-login" href="#/dang-nhap">Đăng nhập</a>`;
    return `<header class="site-header">
      <div class="header-inner">
        ${logoHTML()}
        <nav class="nav-links">
          <a class="${active === "home" ? "on" : ""}" href="#/">Trang chủ</a>
          <a href="#/kham-pha">Khám phá</a>
          <a href="#/tu-truyen">Tủ truyện</a>
          ${admin}
        </nav>
        <form class="head-search" id="headSearch" role="search">
          <button type="button" class="icon-btn search-toggle" id="btnSearch" aria-label="Tìm truyện" aria-expanded="false"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.6"></circle><path d="m16 16 4.2 4.2"></path></svg></button>
          <span class="search-ico" aria-hidden="true">⌕</span>
          <input id="qLive" type="search" placeholder="Tìm truyện..." autocomplete="off">
        </form>
        ${acc}
        <button class="icon-btn menu-btn" id="btnMenu" aria-label="Menu" aria-expanded="false">☰</button>
      </div>
      <div id="searchBox" class="search-panel" hidden></div>
    </header>
    <div id="mobileMenu" class="mobile-menu" hidden>
      <a href="#/">Trang chủ</a>
      <a href="#/kham-pha">Khám phá</a>
      <a href="#/tu-truyen">Tủ truyện</a>
      ${admin}
      ${u ? `<a href="#/tai-khoan">Tài khoản</a>` : `<a href="#/dang-nhap">Đăng nhập</a>`}
    </div>`;
  }
  function footer() {
    const st = VCBG.settings();
    const social = st.social || {};
    const links = [
      ["youtube", "YouTube"],
      ["tiktok", "TikTok"],
      ["facebook", "Facebook"],
      ["wattpad", "Wattpad"],
    ].filter(([k]) => social[k]);
    return `<footer class="site-footer">
      <div class="wrap foot-card">
        ${logoHTML()}
        <p class="foot-desc">Nơi lưu giữ những câu chuyện tôi yêu thích và những bản dịch được thực hiện bằng tất cả sự trân trọng.</p>
        <div class="foot-acts">
          <button type="button" class="btn btn-ghost" id="btnMsg">✉ Gửi lời nhắn</button>
          <button type="button" class="btn btn-ghost" id="btnReport">⚑ Báo lỗi nội dung</button>
        </div>
        ${links.length ? `<p class="foot-social">${links.map(([k, l]) => `<a href="${esc(social[k])}" target="_blank" rel="noopener">${l}</a>`).join(" · ")}</p>` : ""}
        <p class="foot-legal"><a href="/privacy.html">Chính sách quyền riêng tư</a> · <a href="/terms.html">Điều khoản sử dụng</a></p>
        <p class="foot-copy">© ${new Date().getFullYear()} ViCamBachGiai · Bản dịch thuộc về người thực hiện · Vui lòng không đăng lại.</p>
      </div>
    </footer>`;
  }
  function fmtRel(ts) {
    if (!ts) return "";
    const d = Date.now() - Number(ts);
    if (d < 60 * 1000) return "vừa xong";
    if (d < 60 * 60 * 1000) return Math.floor(d / 60000) + " phút trước";
    if (d < 24 * 60 * 60 * 1000) return Math.floor(d / 3600000) + " giờ trước";
    if (d < 7 * 24 * 60 * 60 * 1000) return Math.floor(d / 86400000) + " ngày trước";
    return fmtDate(ts);
  }
  function avatarHTML(user, cls) {
    const name = (user && (user.display_name || user.email)) || "Ẩn danh";
    const letter = String(name).trim().slice(0, 1).toUpperCase() || "?";
    const src = user && user.avatar && String(user.avatar).length > 2 ? user.avatar : "";
    if (src && /^(https?:|data:|covers\/|brand\/)/i.test(src)) {
      return `<span class="${cls || "sig-ava"}"><img src="${esc(src)}" alt=""></span>`;
    }
    return `<span class="${cls || "sig-ava"}">${esc(letter)}</span>`;
  }
  function resonancePanel() {
    const stats = VCBG.publicSiteStats ? VCBG.publicSiteStats() : {};
    const value = (key) => (Number.isFinite(stats[key]) ? fmtCount(stats[key]) : "—");
    const resonanceIcon = (name) => {
      const icons = {
        visits: `<svg viewBox="0 0 96 88" aria-hidden="true"><defs><radialGradient id="rv-gold"><stop stop-color="#ffd98a"/><stop offset=".58" stop-color="#b77827"/><stop offset="1" stop-color="#5e3218"/></radialGradient></defs><g fill="url(#rv-gold)" stroke="#e4ad52" stroke-width="1.2"><path d="M31 23c9 1 14 8 13 19-1 12-7 24-14 24-8 0-13-13-12-25 1-11 5-19 13-18Z"/><circle cx="17" cy="20" r="4.3"/><circle cx="23" cy="14" r="4"/><circle cx="30" cy="11" r="3.7"/><circle cx="37" cy="13" r="3.3"/><circle cx="43" cy="18" r="2.8"/><path d="M68 36c8 0 12 7 12 17 0 11-6 22-13 22s-12-12-11-23c0-10 4-16 12-16Z"/><circle cx="57" cy="34" r="3.8"/><circle cx="63" cy="29" r="3.5"/><circle cx="69" cy="27" r="3.2"/><circle cx="75" cy="29" r="2.9"/><circle cx="80" cy="34" r="2.5"/></g><g fill="none" stroke="#f7d28b" stroke-width="1" opacity=".5"><path d="M25 33c7 4 10 12 7 23M62 46c7 4 9 11 6 21"/><path d="M22 42c5-2 11-1 17 3M59 54c5-2 10-1 17 3"/></g><ellipse cx="49" cy="80" rx="37" ry="5" fill="#5c351d" opacity=".28"/></svg>`,
        members: `<svg viewBox="0 0 72 58" aria-hidden="true"><defs><linearGradient id="rm-blue" x2="1" y2="1"><stop stop-color="#7697ff"/><stop offset="1" stop-color="#293c8e"/></linearGradient></defs><path fill="url(#rm-blue)" d="M8 49c1-13 8-20 19-20s18 7 19 20H8Z"/><circle fill="#5d7be1" cx="27" cy="17" r="12"/><path fill="#16265f" d="M38 49c.7-10 6-16 14-16 8.5 0 13.7 6 14.5 16H38Z"/><circle fill="#334da5" cx="52" cy="23" r="9"/><path fill="#9bb2ff" opacity=".55" d="M17 14c3-5 9-7 14-4M46 21c2-3 6-4 9-2"/></svg>`,
        comments: `<svg viewBox="0 0 72 58" aria-hidden="true"><defs><linearGradient id="rc-feather" x2="1" y2="1"><stop stop-color="#83e4de"/><stop offset="1" stop-color="#247c91"/></linearGradient></defs><path fill="url(#rc-feather)" d="M58 5C35 6 18 19 12 44c11-10 22-13 34-16-10 5-19 10-28 18 14-2 29-13 40-41Z"/><path d="M8 52c13-17 27-28 43-38" fill="none" stroke="#b4fff4" stroke-width="2" stroke-linecap="round"/><path d="M28 30l-1-10M38 23l1-9M21 38l-8-2M31 31l-10-2" fill="none" stroke="#d4fff9" stroke-width="1.4" opacity=".72"/></svg>`,
        views: `<svg viewBox="0 0 96 68" aria-hidden="true"><defs><linearGradient id="rv-book" x2="1" y2="1"><stop stop-color="#b48bff"/><stop offset="1" stop-color="#54319d"/></linearGradient><linearGradient id="rv-page"><stop stop-color="#6d51be"/><stop offset="1" stop-color="#261b63"/></linearGradient></defs><path fill="#24114f" d="M6 15c18-4 31 0 42 10 11-10 24-14 42-10v44c-17-3-30 1-42 8C36 60 23 56 6 59Z"/><path fill="url(#rv-book)" d="M8 10c17-3 29 1 40 11v40C36 54 24 51 8 54Z"/><path fill="url(#rv-page)" d="M88 10c-17-3-29 1-40 11v40c12-7 24-10 40-7Z"/><path d="M48 21v40M14 18c13 0 23 3 30 9M82 18c-13 0-23 3-30 9" fill="none" stroke="#d9c8ff" stroke-width="1.2" opacity=".6"/><circle cx="48" cy="29" r="5" fill="#fff1bf" opacity=".86"/><circle cx="43" cy="27" r="2" fill="#fff"/><path d="M20 44c7-9 13-10 20-2M58 42c8-8 15-8 22 1" fill="none" stroke="#c7aaff" stroke-width="1.5"/></svg>`,
        hearts: `<svg viewBox="0 0 72 62" aria-hidden="true"><defs><linearGradient id="rh-pink" x2="1" y2="1"><stop stop-color="#ff9fbd"/><stop offset="1" stop-color="#a92b71"/></linearGradient></defs><path fill="url(#rh-pink)" d="M36 54S9 38 9 20C9 9 23 4 31 15l5 7 5-7C49 4 63 9 63 20c0 18-27 34-27 34Z"/><g fill="none" stroke="#ffd0df" stroke-width="1" opacity=".6"><path d="M9 20h54M20 9l16 45L52 9M9 20l27 34 27-34M31 15h10"/></g><path d="M14 53c7-8 12-10 20-11M58 53c-7-8-12-10-20-11" fill="none" stroke="#7fb36c" stroke-width="2"/><path d="M18 48c-5-1-8-4-9-8 5 0 9 2 11 6M54 48c5-1 8-4 9-8-5 0-9 2-11 6" fill="#85bd72"/></svg>`,
        stories: `<svg viewBox="0 0 72 62" aria-hidden="true"><path d="M14 12h44v13H14z" fill="#6441ac" stroke="#a88af0"/><path d="M18 14h36v8H18z" fill="#d8c9ff"/><path d="M9 27h48v13H9z" fill="#a54f9f" stroke="#eb88df"/><path d="M14 29h39v8H14z" fill="#ffd9ee"/><path d="M16 42h47v13H16z" fill="#70431f" stroke="#d79448"/><path d="M20 44h39v8H20z" fill="#f5d2a2"/><path d="M22 12v13M18 27v13M25 42v13" stroke="#36204f" stroke-width="2"/><path d="M11 9h44M7 24h48M13 39h47" stroke="#d8b5ff" stroke-width="1.4" opacity=".6"/></svg>`,
      };
      return icons[name] || "";
    };
    const metric = (key, label, icon, cls = "") => `<div class="res-metric res-metric-${icon} ${cls}">
      <span class="res-illustration" aria-hidden="true">${resonanceIcon(icon)}</span>
      <span class="res-stat-copy"><b data-res="${key}">${value(key)}</b><small>${label}</small></span>
    </div>`;
    return `<section class="wrap resonance" id="mat-do-cong-huong" aria-labelledby="resTitle">
      <header class="res-head">
        <div><i aria-hidden="true"></i><h2 id="resTitle">Mật độ cộng hưởng</h2></div>
        <time id="resTime">vừa cập nhật</time>
      </header>
      <div class="res-showcase">
        <div class="res-live">
          <span class="res-radar" aria-hidden="true">
            <svg viewBox="0 0 180 180"><defs><radialGradient id="resRadarGlow"><stop stop-color="#3be98b" stop-opacity=".25"/><stop offset="1" stop-color="#3be98b" stop-opacity="0"/></radialGradient></defs><circle cx="90" cy="90" r="86" fill="url(#resRadarGlow)"/><g fill="none" stroke="#4dd788" stroke-opacity=".38"><circle cx="90" cy="90" r="30"/><circle cx="90" cy="90" r="56"/><circle cx="90" cy="90" r="82"/><path d="M8 90h164M90 8v164M32 32l116 116M148 32 32 148" stroke-opacity=".2"/></g><g fill="#6ff0a4"><circle cx="49" cy="120" r="5"/><circle cx="126" cy="55" r="5"/><circle cx="143" cy="119" r="3.5"/><circle cx="78" cy="43" r="3"/></g></svg>
            <b data-res="online">${value("online")}</b>
          </span>
          <strong>đang trực tuyến</strong>
          <small><span data-res="online_guests">${value("online_guests")}</span> vãng lai / <span data-res="online_members">${value("online_members")}</span> thành viên</small>
        </div>
        <div class="res-hero-visits">
          <span class="res-visit-art" aria-hidden="true">${resonanceIcon("visits")}</span>
          <b data-res="visits_today">${value("visits_today")}</b>
          <small>lượt ghé hôm nay</small>
        </div>
      </div>
      <div class="res-strip">
        ${metric("members", "Thành viên", "members")}
        ${metric("comments", "Bình luận", "comments")}
        ${metric("total_views", "Tổng lượt xem", "views")}
        ${metric("hearts", "Lượt thả tim", "hearts")}
        ${metric("published_stories", "Truyện đã đăng", "stories")}
      </div>
    </section>`;
  }
  function bindResonance() {
    if (!VCBG.watchPublicSiteStats) return;
    if (typeof window.__vcbgResonanceUnwatch === "function") window.__vcbgResonanceUnwatch();
    window.__vcbgResonanceUnwatch = VCBG.watchPublicSiteStats((stats) => {
      const root = $("#mat-do-cong-huong");
      if (!root) return;
      $$('[data-res]', root).forEach((el) => {
        const n = stats[el.dataset.res];
        el.textContent = Number.isFinite(n) ? fmtCount(n) : "—";
      });
      const ratio = $("#resRatio");
      if (ratio) ratio.style.width = (stats.online ? Math.round((stats.online_members / stats.online) * 100) : 0) + "%";
      const time = $("#resTime");
      if (time && stats.updated_at) {
        time.textContent = new Date(stats.updated_at).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }) + " · vừa cập nhật";
        time.dateTime = new Date(stats.updated_at).toISOString();
      }
    });
  }
  function homeLower() {
    const q = new URLSearchParams((location.hash.split("?")[1] || "").replace(/#.*$/, ""));
    const sort = ["latest", "hot", "talk"].includes(q.get("sig")) ? q.get("sig") : "latest";
    const storyId = q.get("sigstory") || "";
    const feed = VCBG.communityFeed({ sort, storyId });
    const shown = feed;
    const stories = VCBG.listStories({ sort: "updated" });
    const me = VCBG.currentUser();
    const tab = (id, lab) =>
      `<button type="button" class="sig-tab${sort === id ? " on" : ""}" data-sig="${id}">${lab}</button>`;
    const replyHTML = (c, r, hidden) => {
      const who = (r.user && r.user.display_name) || "Ẩn danh";
      const parent = (c.user && c.user.display_name) || "bạn";
      return `<article class="sig-reply${hidden ? " is-more" : ""}" data-rid="${esc(r.id)}">
        ${avatarHTML(r.user, "sig-ava sm")}
        <div class="sig-reply-body">
          <div class="sig-meta">
            <b>${esc(who)}</b>
            ${r.staff ? `<span class="sig-badge staff">ViCam</span>` : ""}
            <time>${esc(fmtRel(r.created_at))}</time>
          </div>
          <p class="sig-to">Trả lời ${esc(parent)}</p>
          <p class="sig-text">${esc(r.body)}</p>
          <div class="sig-acts">
            <button type="button" class="sig-act" data-reply="${esc(c.id)}" data-to="${esc(who)}">↩ Trả lời</button>
          </div>
        </div>
      </article>`;
    };
    const cardHTML = (c) => {
      const who = (c.user && c.user.display_name) || "Ẩn danh";
      const replies = c.replies || [];
      const firstR = replies.slice(0, 1);
      const rest = replies.slice(1);
      const loc = [c.story && c.story.title, c.chapter ? "Chương " + c.chapter.number : ""]
        .filter(Boolean)
        .join(" · ");
      return `<article class="sig-card" data-cid="${esc(c.id)}">
        ${avatarHTML(c.user)}
        <div class="sig-main">
          <div class="sig-meta">
            <b>${esc(who)}</b>
            ${c.staff ? `<span class="sig-badge staff">ViCam</span>` : `<span class="sig-badge">LV.${c.level || 1}</span>`}
            <time>${esc(fmtRel(c.created_at))}</time>
            ${c.hot ? `<span class="sig-hot">★ Đang được chú ý</span>` : ""}
          </div>
          ${
            c.quote
              ? `<blockquote class="sig-quote"><p>“${esc(c.quote)}”</p>${loc ? `<cite>— ${esc(loc)}</cite>` : ""}</blockquote>`
              : ""
          }
          <p class="sig-text">${esc(c.body)}</p>
          ${loc ? `<a class="sig-loc" href="${esc(c.href)}">${esc(loc)}</a>` : ""}
          <div class="sig-acts">
            <button type="button" class="sig-chip${c.liked ? " on" : ""}" data-like="${esc(c.id)}" aria-pressed="${c.liked}">❤ ${c.like_count || 0}</button>
            <button type="button" class="sig-act" data-reply="${esc(c.id)}" data-to="${esc(who)}">💬 Trả lời</button>
            <button type="button" class="sig-act" data-quote="${esc(c.id)}">❝ Trích dẫn</button>
          </div>
          ${firstR.map((r) => replyHTML(c, r, false)).join("")}
          ${rest.map((r) => replyHTML(c, r, true)).join("")}
          ${
            rest.length
              ? `<button type="button" class="sig-more-replies" data-more="${esc(c.id)}">Xem ${rest.length} phản hồi khác ▾</button>`
              : ""
          }
        </div>
      </article>`;
    };
    return `<section class="wrap sig-wrap" id="tin-hieu">
      <article class="sig-board">
        <header class="sig-head">
          <div class="sig-brand">
            <span class="sig-mark" aria-hidden="true">💬</span>
            <div>
              <h2>Tín hiệu độc giả <i></i></h2>
              <p>Nơi mọi cảm xúc về câu chuyện được kết nối.</p>
            </div>
          </div>
        </header>
        <p class="sig-count">💬 ${feed.total || 0} bình luận · <span class="live-dot"></span> ${feed.talking || 0} người đang trò chuyện</p>
        <div class="sig-tools">
          <div class="sig-tabs">
            ${tab("latest", "Mới nhất")}
            ${tab("hot", "Nhiều tương tác")}
            ${tab("talk", "Đang thảo luận")}
          </div>
          <label class="sig-filter">
            <span class="sr-only">Chọn truyện</span>
            <select id="sigStory">
              <option value="">Chọn truyện</option>
              ${stories.map((s) => `<option value="${esc(s.id)}" ${s.id === storyId ? "selected" : ""}>${esc(s.title)}</option>`).join("")}
            </select>
          </label>
        </div>
        <div class="sig-list" id="sigList">${
          shown.length
            ? shown
                .map((c, i) => cardHTML(c).replace('class="sig-card"', `class="sig-card${i >= 6 ? " is-hidden" : ""}"`))
                .join("")
            : `<div class="empty">Chưa có bình luận.</div>`
        }</div>
        ${shown.length > 6 ? `<button type="button" class="sig-more" id="sigMore">Xem thêm bình luận ▾</button>` : ""}
        <div class="sig-compose">
          ${avatarHTML(me && me.profile)}
          <button type="button" class="sig-fake" id="sigOpen">${me ? "Chia sẻ cảm nghĩ của bạn…" : "Đăng nhập để chia sẻ cảm nghĩ…"}</button>
          <button type="button" class="btn btn-cyan" id="sigJoin">Tham gia trò chuyện</button>
        </div>
        ${me ? "" : `<p class="sig-login"><a href="#/dang-nhap">Đăng nhập</a> để bình luận và tham gia thảo luận cùng cộng đồng ViCam.</p>`}
      </article>
    </section>`;
  }
  function openSignalBox(opts) {
    opts = opts || {};
    const me = VCBG.currentUser();
    if (!me) {
      goToLogin();
      return;
    }
    const stories = VCBG.listStories({ sort: "updated" });
    const host = document.createElement("div");
    host.className = "sig-host";
    host.innerHTML = `<div class="drawer-bg" id="sigBg"></div>
      <aside class="drawer bottom sig-drawer" role="dialog" aria-labelledby="sigBoxTitle">
        <div class="drawer-pad">
          <div class="drawer-head">
            <h3 id="sigBoxTitle">${opts.replyTo ? "Trả lời " + esc(opts.replyTo) : opts.quote ? "Trích dẫn" : "Tham gia trò chuyện"}</h3>
            <button type="button" class="r-ico" id="sigClose" aria-label="Đóng">×</button>
          </div>
          ${opts.quote ? `<blockquote class="sig-quote"><p>“${esc(opts.quote)}”</p></blockquote>` : ""}
          <form id="sigForm">
            ${
              opts.commentId
                ? ""
                : `<div class="field"><label>Truyện</label>
              <select name="story_id" required>
                <option value="">Chọn truyện</option>
                ${stories
                  .map((s) => {
                    const chs = VCBG.listChapters(s.id);
                    const last = chs[chs.length - 1];
                    return `<option value="${esc(s.id)}" data-ch="${last ? esc(last.id) : ""}">${esc(s.title)}</option>`;
                  })
                  .join("")}
              </select></div>`
            }
            <div class="field"><label>Nội dung</label>
              <textarea name="body" required maxlength="2000" placeholder="Viết cảm nghĩ của bạn…">${esc(opts.seed || "")}</textarea>
            </div>
            <button class="btn btn-cyan" type="submit">Gửi</button>
          </form>
        </div>
      </aside>`;
    document.body.appendChild(host);
    const close = () => host.remove();
    $("#sigBg").onclick = close;
    $("#sigClose").onclick = close;
    $("#sigForm").onsubmit = (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      try {
        if (opts.commentId) {
          VCBG.replyComment(opts.commentId, fd.get("body"));
          toast("Đã trả lời.");
        } else {
          const sid = fd.get("story_id");
          const sel = e.target.querySelector("select[name=story_id]");
          const opt = sel && sel.selectedOptions[0];
          let chId = opt && opt.dataset.ch;
          if (!chId) {
            const chs = VCBG.listChapters(sid);
            chId = chs.length ? chs[chs.length - 1].id : "";
          }
          if (!chId) throw new Error("Truyện chưa có chương để gắn bình luận.");
          VCBG.addComment({
            chapterId: chId,
            storyId: sid,
            body: fd.get("body"),
            quote: opts.quote || "",
          });
          toast("Đăng bình luận thành công.");
        }
        close();
        go(location.hash || "/");
      } catch (err) {
        if (err.code === "AUTH_REQUIRED") goToLogin();
        else toast(err.message);
      }
    };
    const ta = host.querySelector("textarea");
    if (ta) ta.focus();
  }
  function bindLowerHome() {
    const setSig = (patch) => {
      const p = new URLSearchParams((location.hash.split("?")[1] || "").replace(/#.*$/, ""));
      Object.keys(patch).forEach((k) => {
        if (patch[k]) p.set(k, patch[k]);
        else p.delete(k);
      });
      const q = p.toString();
      go("/" + (q ? "?" + q : ""));
    };
    $$("[data-sig]").forEach((b) => {
      b.onclick = () => setSig({ sig: b.dataset.sig });
    });
    const storySel = $("#sigStory");
    if (storySel)
      storySel.onchange = () => setSig({ sigstory: storySel.value });
    const more = $("#sigMore");
    if (more)
      more.onclick = () => {
        const hidden = $$(".sig-card.is-hidden");
        hidden.slice(0, 6).forEach((el) => el.classList.remove("is-hidden"));
        if (!$$(".sig-card.is-hidden").length) more.remove();
      };
    const open = () => openSignalBox({});
    if ($("#sigOpen")) $("#sigOpen").onclick = open;
    if ($("#sigJoin")) $("#sigJoin").onclick = open;
    bindSignalActs();
    const openInbox = (type) => {
      const title = type === "report" ? "Báo lỗi nội dung" : "Gửi lời nhắn";
      const host = document.createElement("div");
      host.innerHTML = `<div class="drawer-bg" id="ibg"></div>
        <aside class="drawer bottom" role="dialog"><div class="drawer-pad">
          <h3>${title}</h3>
          <form id="inForm">
            <div class="field"><label>Tên</label><input name="name"></div>
            <div class="field"><label>Email</label><input name="email" type="email"></div>
            ${type === "report" ? `<div class="field"><label>Truyện / chương</label><input name="story"></div>` : ""}
            <div class="field"><label>Nội dung</label><textarea name="body" required></textarea></div>
            <button class="btn btn-cyan" type="submit">Gửi</button>
          </form>
        </div></aside>`;
      document.body.appendChild(host);
      $("#ibg").onclick = () => host.remove();
      $("#inForm").onsubmit = (e) => {
        e.preventDefault();
        const fd = Object.fromEntries(new FormData(e.target));
        try {
          VCBG.sendInbox({ type, ...fd });
          toast(type === "report" ? "Đã gửi báo lỗi." : "Đã gửi lời nhắn.");
          host.remove();
        } catch (err) {
          toast(err.message);
        }
      };
    };
    const bm = $("#btnMsg");
    const br = $("#btnReport");
    if (bm) bm.onclick = () => openInbox("message");
    if (br) br.onclick = () => openInbox("report");
    const qp = new URLSearchParams((location.hash.split("?")[1] || "").replace(/#.*$/, ""));
    if (qp.get("sig") || qp.get("sigstory")) {
      const board = $("#tin-hieu");
      if (board) board.scrollIntoView({ block: "start" });
    }
  }
  function bindSignalActs() {
    $$("[data-like]").forEach((b) => {
      if (b.closest(".sig-board"))
        b.onclick = () => {
          try {
            const r = VCBG.likeComment(b.dataset.like);
            b.textContent = "❤ " + r.count;
            b.classList.toggle("on", r.on);
            b.setAttribute("aria-pressed", r.on);
          } catch (e) {
            if (e.code === "AUTH_REQUIRED") goToLogin();
            else toast(e.message);
          }
        };
    });
    $$("[data-reply]").forEach((b) => {
      if (b.closest(".sig-board"))
        b.onclick = () => openSignalBox({ commentId: b.dataset.reply, replyTo: b.dataset.to || "" });
    });
    $$("[data-quote]").forEach((b) => {
      b.onclick = () => {
        const card = b.closest(".sig-card");
        const text = card && card.querySelector(".sig-text");
        openSignalBox({ quote: text ? text.textContent : "" });
      };
    });
    $$("[data-more]").forEach((b) => {
      b.onclick = () => {
        const card = b.closest(".sig-card");
        if (!card) return;
        card.querySelectorAll(".sig-reply.is-more").forEach((n) => n.classList.remove("is-more"));
        b.remove();
      };
    });
  }
  function bindChrome() {
    const menu = $("#btnMenu");
    const drawer = $("#mobileMenu");
    if (menu && drawer) {
      const closeMenu = () => {
        drawer.hidden = true;
        drawer.classList.remove("is-open");
        menu.setAttribute("aria-expanded", "false");
      };
      const openMenu = () => {
        drawer.hidden = false;
        drawer.classList.add("is-open");
        menu.setAttribute("aria-expanded", "true");
      };
      closeMenu();
      menu.onclick = (e) => {
        e.stopPropagation();
        closeSearch();
        if (drawer.classList.contains("is-open")) closeMenu();
        else openMenu();
      };
      $$("a", drawer).forEach((a) => (a.onclick = () => closeMenu()));
    }
    const searchForm = $("#headSearch");
    const searchBtn = $("#btnSearch");
    const closeSearch = () => {
      if (searchForm) searchForm.classList.remove("is-open");
      if (searchBtn) searchBtn.setAttribute("aria-expanded", "false");
    };
    if (searchBtn && searchForm) {
      searchBtn.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        const open = searchForm.classList.toggle("is-open");
        searchBtn.setAttribute("aria-expanded", open ? "true" : "false");
        document.querySelector(".site-header")?.classList.toggle("is-searching", open);
        if (open && $("#qLive")) $("#qLive").focus();
        else if (box) { box.hidden = true; box.innerHTML = ""; }
      };
    }
    const input = $("#qLive");
    const box = $("#searchBox");
    const paintHits = (q) => {
      if (!box) return;
      if (!q) {
        box.hidden = true;
        box.innerHTML = "";
        return;
      }
      const hits = VCBG.searchSuggest(q, 6);
      box.hidden = false;
      box.innerHTML = hits.length
        ? hits
            .map(
              (s) =>
                `<a class="search-hit" href="#/truyen/${esc(s.slug)}"><img src="${esc(s.cover)}" alt=""><div><b>${esc(s.title)}</b><div class="sub">${esc(s.author)}</div></div></a>`
            )
            .join("")
        : `<div class="empty">Không có kết quả.</div>`;
    };
    if (input) {
      input.oninput = () => paintHits(input.value.trim());
      input.onfocus = () => paintHits(input.value.trim());
    }
    const form = $("#headSearch");
    if (form)
      form.onsubmit = (e) => {
        e.preventDefault();
        const q = ($("#qLive") && $("#qLive").value.trim()) || "";
        go("/kham-pha" + (q ? "?q=" + encodeURIComponent(q) : ""));
      };
    $$("[data-fav]").forEach((b) => {
      b.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        try {
          const r = VCBG.toggleFavorite(b.getAttribute("data-fav"));
          toast(r.on ? "Đã thêm vào tủ truyện." : "Đã xóa khỏi tủ truyện.");
          if (b.classList.contains("wide-heart")) {
            b.textContent = r.on ? "♥" : "♡";
            b.setAttribute("aria-pressed", r.on);
            b.setAttribute("aria-label", r.on ? "Bỏ lưu" : "Lưu trữ");
          } else {
            b.textContent = r.on ? "♥ Đã lưu" : "♡ Lưu trữ";
          }
        } catch (err) {
          if (err.code === "AUTH_REQUIRED") goToLogin();
          else toast(err.message);
        }
      };
    });
    bindLowerHome();
  }
  function bindRails() {
    $$("[data-rail]").forEach((rail) => {
      const bar = rail.parentElement.querySelector("[data-bar]");
      const num = rail.parentElement.querySelector("[data-num]");
      const cards = $$(".wide-card", rail);
      const sync = () => {
        const max = rail.scrollWidth - rail.clientWidth;
        const p = max <= 0 ? 1 : rail.scrollLeft / max;
        if (bar) bar.style.width = Math.max(18, p * 100) + "%";
        if (num && cards.length) {
          const i = Math.min(cards.length, Math.round((rail.scrollLeft / (cards[0].offsetWidth + 16)) + 1));
          num.textContent = String(i).padStart(2, "0") + " / " + String(cards.length).padStart(2, "0");
        }
      };
      rail.addEventListener("scroll", sync, { passive: true });
      sync();
    });
  }
  function rail(title, list, tone) {
    if (!list || !list.length) return "";
    return `<section class="rail-panel tone-${tone || "cyan"}">
      <div class="rail-head">
        <h2><i class="live-dot"></i> ${esc(title)}</h2>
        <span class="count">${list.length} truyện</span>
      </div>
      <div class="rail" data-rail>${list.map((s) => storyCard(s)).join("")}</div>
      <div class="rail-foot">
        <div class="rail-track"><span data-bar></span></div>
        <span data-num></span>
      </div>
    </section>`;
  }
  function pageHome() {
    const featured = VCBG.listStories({ featured: true });
    const ongoing = VCBG.listStories({ status: "ongoing", sort: "updated" }).filter((s) => !s.upcoming);
    const updated = VCBG.listStories({ sort: "updated" }).filter((s) => !s.upcoming);
    const done = VCBG.listStories({ status: "completed" }).filter((s) => !s.upcoming);
    const soon = VCBG.listStories({ upcoming: true });
    const slideMap = new Map();
    featured.concat(ongoing, updated, done, soon).forEach((s) => {
      if (s && s.id && !slideMap.has(s.id)) slideMap.set(s.id, s);
    });
    const slides = Array.from(slideMap.values());
    const tags = VCBG.listTags();
    setMeta("ViCamBachGiai — Thư viện Bách Hợp", VCBG.settings().tagline);
    const banner = slides;
    const stackCards = banner
      .map((s, idx) => {
        const chips = []
          .concat((s.genres || []).map((g) => g.name))
          .concat((s.tags || []).map((t) => t.name))
          .filter(Boolean)
          .slice(0, 2);
        const first = VCBG.listChapters(s.id, { sort: "asc" })[0];
        const readHref = first ? `#/truyen/${esc(s.slug)}/chuong-${first.number}` : `#/truyen/${esc(s.slug)}`;
        const syn = String(s.synopsis || "").replace(/\s+/g, " ").trim();
        const badge = s.upcoming ? "Sắp ra mắt" : statusLabel(s.status);
        return `<article class="stack-card${idx === 0 ? " is-active" : ""}" data-i="${idx}" data-d="${idx}" style="--tone:${esc(s.accent || "#7c5cbf")}">
          <img class="stack-cover" src="${esc(s.cover)}" alt="${esc(s.title)}" ${idx < 3 ? "" : "loading=\"lazy\""}>
          <div class="stack-shade"></div>
          <div class="stack-body">
            <p class="stack-badge">${esc(badge)}</p>
            <h2 class="stack-title">${esc(s.title)}</h2>
            <p class="stack-chips">${chips.map((c) => `<span>${esc(c)}</span>`).join("")}</p>
            <p class="stack-syn">${esc(syn)}</p>
            <div class="stack-actions">
              <a class="btn btn-cyan" href="${readHref}">Đọc ngay →</a>
              <a class="btn btn-ghost" href="#/truyen/${esc(s.slug)}">Chi tiết</a>
            </div>
          </div>
        </article>`;
      })
      .join("");
    const dots = banner
      .map((_, idx) => `<button type="button" data-dot="${idx}" class="${idx === 0 ? "on" : ""}" aria-label="Thẻ ${idx + 1}"></button>`)
      .join("");
    app().innerHTML =
      header("home") +
      `<section class="hero stack-hero" id="hero" aria-roledescription="carousel">
        <button type="button" class="stack-arrow stack-prev" data-dir="-1" aria-label="Thẻ trước">‹</button>
        <div class="stack-stage" id="stackStage">${stackCards}</div>
        <button type="button" class="stack-arrow stack-next" data-dir="1" aria-label="Thẻ sau">›</button>
        <div class="hero-nav"><div class="hero-dots">${dots}</div></div>
      </section>
      <div class="wrap">${socialStrip()}</div>
      <div class="wrap home-signal-label"><span>Thư Viện Tín Hiệu</span></div>
      <div class="wrap rails">
        ${rail("Đang lên sóng", ongoing, "cyan")}
        ${rail("Đã hoàn thành", done, "violet")}
        ${rail("Sắp ra mắt", soon, "blue")}
      </div>
      ${homeLower()}
      ${resonancePanel()}` +
      footer();
    bindChrome();
    bindRails();
    bindResonance();
    const deck = banner;
    const n = deck.length;
    const heroEl = $("#hero");
    if (!heroEl || !n) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const HOLD = 3000;
    let i = 0;
    let timer = null;
    let paused = false;
    const rel = (k) => {
      let d = k - i;
      if (d > n / 2) d -= n;
      if (d < -n / 2) d += n;
      return d;
    };
    const preload = (idx) => {
      const s = deck[idx];
      if (!s || !s.cover) return;
      const im = new Image();
      im.src = s.cover;
    };
    const place = () => {
      const tone = (deck[i] && deck[i].accent) || "#7c5cbf";
      heroEl.style.setProperty("--hero-tone", tone);
      $$(".stack-card", heroEl).forEach((el, k) => {
        const d = rel(k);
        const abs = Math.abs(d);
        el.dataset.d = String(d);
        el.style.setProperty("--d", d);
        el.style.setProperty("--abs", abs);
        el.classList.toggle("is-active", d === 0);
        el.classList.toggle("is-side", abs > 0 && abs <= 2);
        el.style.zIndex = String(50 - abs);
        el.setAttribute("aria-hidden", d === 0 ? "false" : "true");
      });
      $$("[data-dot]", heroEl).forEach((el, k) => el.classList.toggle("on", k === i));
      preload((i + 1) % n);
      preload((i + n - 1) % n);
      preload((i + 2) % n);
    };
    const stop = () => {
      clearTimeout(timer);
      timer = null;
    };
    const schedule = () => {
      stop();
      if (paused || n < 2) return;
      timer = setTimeout(() => go(1), HOLD);
    };
    const go = (dir) => {
      if (n < 2) return;
      const next = (((i + dir) % n) + n) % n;
      if (next === i) return;
      i = next;
      place();
      schedule();
    };
    $$("[data-dot]", heroEl).forEach((b) => {
      b.onclick = () => {
        const t = Number(b.dataset.dot);
        if (t === i) return;
        const fwd = (t - i + n) % n;
        const back = (i - t + n) % n;
        go(fwd <= back ? fwd : -back);
      };
    });
    $$("[data-dir]", heroEl).forEach((b) => {
      b.onclick = () => go(Number(b.dataset.dir));
    });
    $$(".stack-card", heroEl).forEach((el, k) => {
      el.onclick = (ev) => {
        if (el.classList.contains("is-active")) return;
        if (ev.target.closest("a,button")) return;
        const fwd = (k - i + n) % n;
        const back = (i - k + n) % n;
        go(fwd <= back ? fwd : -back);
      };
    });
    heroEl.addEventListener("mouseenter", () => {
      if (window.matchMedia("(hover: hover)").matches) {
        paused = true;
        stop();
      }
    });
    heroEl.addEventListener("mouseleave", () => {
      paused = false;
      schedule();
    });
    let sx = 0;
    let sy = 0;
    heroEl.addEventListener(
      "touchstart",
      (e) => {
        sx = e.changedTouches[0].clientX;
        sy = e.changedTouches[0].clientY;
      },
      { passive: true }
    );
    heroEl.addEventListener(
      "touchend",
      (e) => {
        const dx = e.changedTouches[0].clientX - sx;
        const dy = e.changedTouches[0].clientY - sy;
        if (Math.abs(dx) > 42 && Math.abs(dx) > Math.abs(dy)) go(dx < 0 ? 1 : -1);
      },
      { passive: true }
    );
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        paused = true;
        stop();
      } else {
        paused = false;
        schedule();
      }
    });
    place();
    schedule();
  }
  function section(title, list) {
    if (!list || !list.length) return "";
    return `<section class="wrap section"><h2>${esc(title)}</h2><div class="card-grid">${list.map((s) => storyCard(s, true)).join("")}</div></section>`;
  }

  function pageExplore(route) {
    const q = route.q.q || "";
    const genre = route.q.genre || "";
    const tag = route.q.tag || "";
    const sort = route.q.sort || "updated";
    const list = VCBG.listStories({ q, genre, tag, sort }).filter((s) => (route.q.status ? s.status === route.q.status : true));
    setMeta("Khám phá — ViCamBachGiai", "Tìm truyện Bách Hợp theo bối cảnh và mạch chuyện.");
    app().innerHTML =
      header() +
      `<main class="wrap" style="padding:1.2rem 1rem 2rem">
        <h1 class="hero-title" style="font-size:1.8rem">Khám phá</h1>
        <form id="exForm" class="chapter-toolbar">
          <input name="q" value="${esc(q)}" placeholder="Tìm tên, tác giả…" style="flex:1;min-width:140px;background:#171512;color:var(--ink);border:1px solid var(--line);border-radius:8px;padding:.55rem .7rem">
          <select name="genre">${optList(VCBG.listGenres(), genre, "Bối cảnh")}</select>
          <select name="tag">${optList(VCBG.listTags(), tag, "Mạch chuyện")}</select>
          <select name="sort">
            <option value="updated" ${sort === "updated" ? "selected" : ""}>Mới cập nhật</option>
            <option value="views" ${sort === "views" ? "selected" : ""}>Đọc nhiều</option>
            <option value="likes" ${sort === "likes" ? "selected" : ""}>Yêu thích</option>
            <option value="rating" ${sort === "rating" ? "selected" : ""}>Đánh giá</option>
          </select>
          <button class="btn btn-primary" type="submit">Lọc</button>
        </form>
        <div class="card-grid">${list.length ? list.map((s) => storyCard(s, true)).join("") : ""}</div>
        ${list.length ? "" : `<div class="empty">Không tìm thấy truyện phù hợp.</div>`}
      </main>` +
      footer();
    bindChrome();
    $("#exForm").onsubmit = (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const p = new URLSearchParams();
      ["q", "genre", "tag", "sort"].forEach((k) => {
        if (fd.get(k)) p.set(k, fd.get(k));
      });
      go("/kham-pha?" + p.toString());
    };
  }
  function optList(items, cur, label) {
    return `<option value="">${esc(label)}</option>` + items.map((x) => `<option value="${esc(x.slug)}" ${x.slug === cur ? "selected" : ""}>${esc(x.name)}</option>`).join("");
  }

  function pageStory(route) {
    const s = VCBG.getStoryBySlug(route.slug);
    if (!s) {
      app().innerHTML = header() + `<div class="empty">Không tìm thấy truyện.</div>` + footer();
      bindChrome();
      return;
    }
    setMeta(s.title + " — ViCamBachGiai", s.synopsis.slice(0, 160));
    const sortDesc = route.q.sort === "desc";
    const chs = VCBG.listChapters(s.id, { sort: sortDesc ? "desc" : "asc" });
    const prog = VCBG.getProgress(s.id);
    const readIds = VCBG.readChapterIds(s.id);
    const qch = (route.q.chuong || "").toLowerCase();
    const filtered = qch
      ? chs.filter((c) => String(c.number) === qch || (c.title || "").toLowerCase().includes(qch))
      : chs;
    const groupSize = 50;
    const groups = [];
    if (filtered.length) {
      const nums = filtered.map((c) => c.number);
      const minN = Math.min(...nums);
      const maxN = Math.max(...nums);
      const startG = Math.floor((minN - 1) / groupSize) * groupSize + 1;
      for (let a = startG; a <= maxN; a += groupSize) {
        const b = a + groupSize - 1;
        const items = filtered.filter((c) => c.number >= a && c.number <= b);
        if (items.length) groups.push({ a, b, items });
      }
    }
    const gIdx = Math.min(groups.length ? groups.length - 1 : 0, Math.max(0, Number(route.q.g || 0)));
    const slice = groups[gIdx] ? groups[gIdx].items : [];
    const first = VCBG.listChapters(s.id, { sort: "asc" })[0];
    const last = VCBG.listChapters(s.id, { sort: "asc" }).slice(-1)[0];
    const cont = prog
      ? chs.find((c) => c.id === prog.chapter_id) || chs.find((c) => c.number === prog.chapter_number)
      : first;
    const readHref = cont ? "#/truyen/" + s.slug + "/chuong-" + cont.number : "";
    const readLabel = prog && cont && first && cont.number !== first.number ? "Đọc tiếp" : "Đọc truyện";
    const latestHref = last ? "#/truyen/" + s.slug + "/chuong-" + last.number : "";
    const mine = VCBG.myRating(s.id);
    const fav = VCBG.isFavorite(s.id);
    const fol = VCBG.isFollow(s.id);
    const commentsN = VCBG.storyCommentCount(s.id);
    const sameAuthor = VCBG.storiesByAuthor(s.author, s.id);
    const relatedStories = VCBG.listStories({ sort: "updated" })
      .filter((o) => o.id !== s.id && !sameAuthor.some((a) => a.id === o.id));
    const tab = ["intro", "toc", "rate"].includes(route.q.tab) ? route.q.tab : "intro";
    const qs = (extra) => {
      const p = new URLSearchParams();
      p.set("tab", extra.tab || tab);
      if (extra.sort || (sortDesc && extra.sort !== "asc")) p.set("sort", extra.sort || "desc");
      if (extra.chuong || qch) p.set("chuong", extra.chuong != null ? extra.chuong : route.q.chuong || "");
      if (extra.g != null) p.set("g", String(extra.g));
      else if (route.q.g) p.set("g", route.q.g);
      [...p.keys()].forEach((k) => { if (!p.get(k)) p.delete(k); });
      const str = p.toString();
      return "#/truyen/" + s.slug + (str ? "?" + str : "");
    };
    const tagItems = [].concat(s.genres || []).concat(s.tags || []);
    const titleLength = Array.from(String(s.title || "")).length;
    const titleSizeClass = titleLength >= 32 ? "title-very-long" : titleLength >= 18 ? "title-long" : "";
    const tagShown = tagItems.slice(0, 3);
    const tagExtra = tagItems.length - tagShown.length;
    const tagsLine = tagShown
      .map((t) => {
        const kind = (s.genres || []).some((g) => g.id === t.id) ? "genre" : "tag";
        return `<a class="chip" href="#/kham-pha?${kind}=${esc(t.slug)}">${esc(t.name)}</a>`;
      })
      .join("") + (tagExtra > 0 ? `<span class="chip chip-more">+${tagExtra}</span>` : "");
    const infoText = storyInfoText(s);
    const introHtml = `<article class="intro-card">
        <h2 class="intro-title">Giới thiệu</h2>
        <div class="intro-body is-clamp" id="introBody">${esc(s.synopsis).replace(/\n/g, "<br>")}</div>
        <button type="button" class="intro-more" id="btnMore" hidden>Đọc tiếp tóm tắt →</button>
      </article>
      <article class="info-card">
        <h2 class="info-title">Thông tin truyện</h2>
        <div class="info-body" id="infoBody">${formatStoryInfo(infoText)}</div>
        <button type="button" class="info-more" id="btnInfoMore" hidden>Xem chi tiết đầy đủ</button>
      </article>
      ${sameAuthor.length ? `<section class="same-author">
        <div class="same-head">
          <h3>Cùng tác giả</h3>
          <span>${sameAuthor.length} truyện</span>
        </div>
        <div class="same-rail">${sameAuthor.map((o) => `<a class="same-card" href="#/truyen/${esc(o.slug)}">
          ${coverImg(o.cover, o.title)}
          <b>${esc(o.title)}</b>
          <small>${esc(o.author || "—")}</small>
          <em>${esc(storyStatusLabel(o))}</em>
        </a>`).join("")}</div>
      </section>` : ""}
      ${relatedStories.length ? `<section class="same-author recommended-stories">
        <div class="same-head">
          <h3>Đề xuất tác giả khác</h3>
          <span>${relatedStories.length} truyện</span>
        </div>
        <div class="same-rail">${relatedStories.map((o) => `<a class="same-card" href="#/truyen/${esc(o.slug)}">
          ${coverImg(o.cover, o.title)}
          <b>${esc(o.title)}</b>
          <small>${esc(o.author || "—")}</small>
          <em>${esc(storyStatusLabel(o))}</em>
        </a>`).join("")}</div>
      </section>` : ""}`;
    const sideStoryCard = (o) => `<a class="story-side-card" href="#/truyen/${esc(o.slug)}">
        ${coverImg(o.cover, o.title)}
        <span class="story-side-copy"><b>${esc(o.title)}</b><small>${esc(o.author || "—")}</small><em>${esc(storyStatusLabel(o))}</em></span>
      </a>`;
    const landscapeSidebar = `<aside class="story-landscape-sidebar" aria-label="Truyện liên quan">
        <div class="story-side-scroll">
          ${sameAuthor.length ? `<section class="story-side-section">
            <h2>Cùng tác giả</h2>
            <div class="story-side-list">${sameAuthor.map(sideStoryCard).join("")}</div>
          </section>` : ""}
          ${relatedStories.length ? `<section class="story-side-section story-side-other">
            <h2>Đề xuất khác</h2>
            <div class="story-side-list">${relatedStories.map(sideStoryCard).join("")}</div>
          </section>` : ""}
        </div>
      </aside>`;
    const tocHtml = `<div class="toc-box">
        <div class="toc-head">
          <strong>${filtered.length} chương</strong>
          <input id="chFind" placeholder="Số hoặc tên chương" value="${esc(route.q.chuong || "")}">
          <a class="btn btn-ghost" href="${qs({ sort: sortDesc ? "asc" : "desc", tab: "toc" })}">${sortDesc ? "Cũ → mới" : "Mới → cũ"}</a>
        </div>
        ${groups.length > 1 ? `<div class="toc-groups">${groups.map((g, i) => `<a class="${i === gIdx ? "on" : ""}" href="${qs({ tab: "toc", g: i })}">${g.a}–${g.b}</a>`).join("")}</div>` : ""}
        <ul class="chapter-list${slice.length > 5 ? " is-scrollable" : ""}">${slice.map((c) => `<li><a href="#/truyen/${esc(s.slug)}/chuong-${c.number}" class="${readIds.includes(c.id) ? "read" : ""}">
          <span class="num">${c.number}</span><span>${esc(c.title || "Chương " + c.number)}</span>
          <span class="num">${fmtDate(c.published_at || c.updated_at)}</span></a></li>`).join("")}</ul>
      </div>`;
    const rateHtml = `<div class="rate-box">
        <p>Đánh giá truyện</p>
        <div class="stars" id="rate">${[1,2,3,4,5].map((n) => `<button type="button" data-star="${n}">${n <= mine ? "★" : "☆"}</button>`).join("")}</div>
        <p class="sub">${s.stats.rating_avg || "—"}★ · ${s.stats.rating_count} lượt · ${commentsN} bình luận</p>
      </div>`;
    app().innerHTML =
      header() +
      `<main class="wrap story-page">
        <div class="story-detail-layout ${tab === "intro" ? "is-intro" : "is-secondary"}">
        <div class="story-detail-primary">
        <section class="story-top">
          <div class="story-hero">
            <div class="story-cover">${coverImg(s.cover, "Bìa " + s.title, true)}</div>
            <div class="story-info">
              <div class="story-copy">
                <div class="badge">${esc(s.upcoming ? "Sắp ra mắt" : statusLabel(s.status))}</div>
                <h1 class="${titleSizeClass}">${esc(s.title)}</h1>
                <p class="by">Tác giả: <span>${esc(s.author || "—")}</span></p>
                <div class="tags">${tagsLine}</div>
              </div>
              <aside class="story-landscape-meta" aria-label="Thông tin truyện">
                <h2>Thông tin truyện</h2>
                <div class="landscape-info-body">${formatLandscapeInfo(infoText)}</div>
              </aside>
              <div class="story-metrics" role="list">
                <div class="metric" role="listitem"><span class="metric-ico" aria-hidden="true">👁</span><b>${s.stats.views || 0}</b><small>Lượt xem</small></div>
                <div class="metric" role="listitem"><span class="metric-ico" aria-hidden="true">★</span><b>${s.stats.rating_avg || 0}</b><small>Đánh giá</small></div>
                <div class="metric" role="listitem"><span class="metric-ico" aria-hidden="true">▤</span><b>${s.stats.chapter_count || 0}</b><small>Chương</small></div>
                <div class="metric" role="listitem"><span class="metric-ico heart" aria-hidden="true">♡</span><b>${s.stats.likes || 0}</b><small>Yêu thích</small></div>
              </div>
              <div class="story-acts">
                ${readHref ? `<a class="btn btn-cyan" href="${readHref}">${readLabel}</a>` : `<span class="btn" disabled>Chưa có chương</span>`}
                                <button class="btn btn-ghost" id="btnFol">♡ ${fol ? "Đã thả tim" : "Thả tim"}</button>
<button class="btn btn-ghost" id="btnFav">${fav ? "Đã lưu" : "Lưu trữ"}</button>
              </div>
            </div>
          </div>
        </section>
        <nav class="story-tabs" aria-label="Phần truyện">
          <a class="${tab === "intro" ? "on" : ""}" href="${qs({ tab: "intro" })}">Tóm tắt</a>
          <a class="${tab === "toc" ? "on" : ""}" href="${qs({ tab: "toc" })}">Mục lục</a>
          <a class="${tab === "rate" ? "on" : ""}" href="${qs({ tab: "rate" })}">Đánh giá</a>
        </nav>
        <section class="story-tab">${tab === "intro" ? introHtml : tab === "toc" ? tocHtml : rateHtml}</section>
        </div>
        ${tab === "intro" ? landscapeSidebar : ""}
        </div>
      </main>
      <div class="story-dock">
        ${latestHref ? `<a class="btn btn-cyan dock-read" href="${latestHref}">Chương mới</a>` : ""}
        <button class="btn btn-ghost dock-fav" type="button" id="btnShareStory">Chia sẻ</button>
      </div>` +
      footer();
    bindChrome();
    const more = $("#btnMore");
    const introBody = $("#introBody");
    if (more && introBody) {
      const syncMore = () => {
        const overflow = introBody.scrollHeight > introBody.clientHeight + 2;
        more.hidden = !overflow && introBody.classList.contains("is-clamp");
      };
      requestAnimationFrame(syncMore);
      more.onclick = () => {
        const on = introBody.classList.toggle("is-clamp");
        more.textContent = on ? "Đọc tiếp tóm tắt →" : "Thu gọn ↑";
        more.hidden = false;
      };
    }
    const infoMore = $("#btnInfoMore");
    const infoBody = $("#infoBody");
    if (infoMore && infoBody) {
      const syncInfo = () => {
        const overflow = infoBody.scrollHeight > infoBody.clientHeight + 4;
        infoMore.hidden = !overflow && infoBody.classList.contains("is-clamp");
      };
      requestAnimationFrame(syncInfo);
      infoMore.onclick = () => {
        const on = infoBody.classList.toggle("is-clamp");
        infoMore.textContent = on ? "Xem chi tiết đầy đủ" : "Thu gọn";
        infoMore.hidden = false;
      };
    }
    const toggleFav = () => {
      try {
        const r = VCBG.toggleFavorite(s.id);
        toast(r.on ? "Đã thêm vào tủ truyện." : "Đã xóa khỏi tủ truyện.");
        if ($("#btnFav")) $("#btnFav").textContent = r.on ? "Đã lưu" : "Lưu trữ";
      } catch (e) {
        if (e.code === "AUTH_REQUIRED") goToLogin();
        else toast(e.message);
      }
    };
    if ($("#btnFav")) $("#btnFav").onclick = toggleFav;
    if ($("#btnShareStory")) {
      $("#btnShareStory").onclick = async () => {
        const shareData = {
          title: s.title + " — ViCamBachGiai",
          text: "Đọc " + s.title + " trên ViCamBachGiai",
          url: location.href,
        };
        try {
          if (navigator.share) await navigator.share(shareData);
          else {
            await navigator.clipboard.writeText(location.href);
            toast("Đã sao chép liên kết truyện.");
          }
        } catch (e) {
          if (e && e.name !== "AbortError") toast("Chưa thể chia sẻ liên kết.");
        }
      };
    }
    if ($("#btnFol"))
      $("#btnFol").onclick = () => {
        try {
          const r = VCBG.toggleFollow(s.id);
          toast(r.on ? "Đã thả tim truyện." : "Đã bỏ thả tim.");
          $("#btnFol").textContent = r.on ? "♥ Đã thả tim" : "♡ Thả tim";
        } catch (e) {
          if (e.code === "AUTH_REQUIRED") goToLogin();
          else toast(e.message);
        }
      };
    $$("#rate [data-star]").forEach((b) => {
      b.onclick = () => {
        try {
          VCBG.rateStory(s.id, Number(b.dataset.star));
          toast("Đã ghi đánh giá.");
          pageStory(Object.assign({}, route, { q: Object.assign({}, route.q, { tab: "rate" }) }));
        } catch (e) {
          if (e.code === "AUTH_REQUIRED") goToLogin();
          else toast(e.message);
        }
      };
    });
    const find = $("#chFind");
    if (find)
      find.onchange = () => {
        const v = find.value.trim();
        go("/truyen/" + s.slug + "?tab=toc" + (v ? "&chuong=" + encodeURIComponent(v) : ""));
      };
  }

  async function pageRead(route) {
    const s = VCBG.getStoryBySlug(route.slug);
    if (!s) {
      app().innerHTML = `<div class="empty">Không tìm thấy truyện.</div>`;
      return;
    }
    const ch = VCBG.getChapter(s.id, route.number);
    if (!ch) {
      app().innerHTML = header() + `<div class="empty">Chương chưa xuất bản hoặc không tồn tại.</div>` + footer();
      bindChrome();
      return;
    }
    try {
      await VCBG.ensureChapterBody(ch);
    } catch (err) {
      app().innerHTML = header() + `<div class="empty">${esc(err.message || "Không tải được chương.")}</div>` + footer();
      bindChrome();
      return;
    }
    const all = VCBG.listChapters(s.id);
    const idx = all.findIndex((c) => c.id === ch.id);
    const prev = all[idx - 1];
    const next = all[idx + 1];
    const prefs = readPrefs();
    setMeta(`${s.title} — Chương ${ch.number} | ViCamBachGiai`, (ch.title || s.title) + " — đọc trên ViCamBachGiai.");
    VCBG.recordView(s.id, ch.id);
    const liked = VCBG.likedChapter(ch.id);
    const likeN = VCBG.chapterLikeCount(ch.id);
    const lastProg = VCBG.getProgress(s.id);
    if (!lastProg || lastProg.chapter_id !== ch.id) {
      VCBG.saveProgress(s.id, ch.id, ch.number, 0);
    }
    const comments = VCBG.listComments(ch.id);
    const rating = VCBG.getStory(s.id);
    const ratingAvg = (rating && rating.stats && rating.stats.rating_avg) || 0;
    const ratingN = (rating && rating.stats && rating.stats.rating_count) || 0;
    const mine = VCBG.myRating(s.id);
    const favOn = VCBG.isFavorite(s.id);
    const bodyHtml = decorateParagraphs(sanitize(ch.body), comments);
    // The player is part of the public reading experience. Uploading and
    // editing audio remain protected inside the Admin chapter editor.
    const audioHtml = chapterAudioPlayer(ch, s);
    const chLabel = `Chương ${ch.number}${ch.title ? " · " + esc(ch.title) : ""}`;
    app().innerHTML = `<div class="reader-page" id="reader" data-theme="${esc(prefs.theme)}" data-font="${esc(prefs.font || "serif")}" style="--rsize:${prefs.size}rem">
      <header class="reader-chrome reader-top" id="rTop">
        <a class="r-ico" href="#/truyen/${esc(s.slug)}" aria-label="Về trang truyện">←</a>
        <div class="r-head-copy">
          <div class="r-story">${esc(s.title)}</div>
          <div class="r-sub">${chLabel}</div>
        </div>
        <button class="r-ico" id="btnBm" aria-label="Bookmark" aria-pressed="${favOn}">${favOn ? "★" : "☆"}</button>
        <button class="r-ico" id="btnSet" aria-label="Cỡ chữ và nền">Aa</button>
        <div class="r-progress"><span id="rBar"></span></div>
        <span class="r-pct" id="rPct">0%</span>
      </header>
      <article class="reader-body" id="rbody">
        <h2>Chương ${ch.number}${ch.title ? ": " + esc(ch.title) : ""}</h2>
        <div class="r-orn" aria-hidden="true"></div>
        ${audioHtml}
        ${bodyHtml}
        <section class="r-engage" id="rEngage">
          <button type="button" id="btnLikeCh" class="${liked ? "on" : ""}"><span>♡</span><b>Thích chương này</b><em>${likeN}</em></button>
          <button type="button" id="btnRate"><span>☆</span><b>Đánh giá</b><em>${ratingAvg ? ratingAvg + " ★" : "—"}</em></button>
          <button type="button" id="btnCmtAll"><span>💬</span><b>Bình luận</b><em>${comments.length}</em></button>
        </section>
      </article>
      <nav class="reader-chrome reader-bot" id="rBot">
        ${prev ? `<a class="r-nav" href="#/truyen/${esc(s.slug)}/chuong-${prev.number}">‹ Chương trước</a>` : `<span class="r-nav is-off">‹ Chương trước</span>`}
        <button type="button" class="r-toc" id="btnToc" aria-label="Mục lục"><span></span></button>
        ${next ? `<a class="r-nav r-nav-r" href="#/truyen/${esc(s.slug)}/chuong-${next.number}">Chương sau ›</a>` : `<span class="r-nav r-nav-r is-off">Chương sau ›</span>`}
      </nav>
      <button type="button" class="auto-scroll-float" id="autoScrollFloat" aria-label="Tạm dừng tự cuộn" hidden><span>Ⅱ</span><b>TỰ CUỘN</b><em>1.0×</em></button>
      <div id="rDraw"></div>
    </div>`;
    const page = $("#reader");
    const body = $("#rbody");
    if (lastProg && lastProg.chapter_id === ch.id && lastProg.scroll) {
      requestAnimationFrame(() => window.scrollTo(0, lastProg.scroll));
    }
    let hideT;
    const immerse = (on) => page.classList.toggle("is-immersed", on);
    immerse(true);
    const bump = () => {
      immerse(false);
      clearTimeout(hideT);
      hideT = setTimeout(() => immerse(true), 3000);
    };
    const updateProg = () => {
      const el = document.documentElement;
      const max = Math.max(1, el.scrollHeight - el.clientHeight);
      const pct = Math.min(100, Math.round((window.scrollY / max) * 100));
      const bar = $("#rBar");
      const lab = $("#rPct");
      if (bar) bar.style.width = pct + "%";
      if (lab) lab.textContent = pct + "%";
    };
    page.onclick = (e) => {
      if (e.target.closest("a,button,.drawer,.drawer-bg,#rDraw,.p-bubble,.p-menu,.r-engage")) return;
      if (window.getSelection && String(window.getSelection()).trim()) return;
      bump();
    };
    let progT = 0;
    window.onscroll = () => {
      updateProg();
      if (!page.classList.contains("is-immersed")) immerse(true);
      clearTimeout(hideT);
      clearTimeout(progT);
      progT = setTimeout(() => VCBG.saveProgress(s.id, ch.id, ch.number, window.scrollY), 400);
    };
    updateProg();
    bindChapterAudio();
    const autoScroll = createAutoScroll(page, next ? `#/truyen/${esc(s.slug)}/chuong-${next.number}` : "");
    $("#btnSet").onclick = (e) => {
      e.stopPropagation();
      openSettings(page, autoScroll);
    };
    $("#btnToc").onclick = (e) => {
      e.stopPropagation();
      openToc(s, all, ch.number);
    };
    $("#btnBm").onclick = (e) => {
      e.stopPropagation();
      try {
        const r = VCBG.toggleFavorite(s.id);
        $("#btnBm").textContent = r.on ? "★" : "☆";
        $("#btnBm").setAttribute("aria-pressed", r.on);
        toast(r.on ? "Đã lưu vào tủ truyện." : "Đã bỏ lưu.");
      } catch (err) {
        if (err.code === "AUTH_REQUIRED") goToLogin();
        else toast(err.message);
      }
    };
    $("#btnLikeCh").onclick = () => {
      try {
        const r = VCBG.toggleChapterLike(ch.id);
        $("#btnLikeCh").classList.toggle("on", r.on);
        $("#btnLikeCh").querySelector("em").textContent = r.count;
      } catch (err) {
        if (err.code === "AUTH_REQUIRED") goToLogin();
        else toast(err.message);
      }
    };
    $("#btnRate").onclick = () => {
      if (!VCBG.currentUser()) return goToLogin();
      overlay(
        `<div class="aa-pad">
          <p class="set-lab">Đánh giá truyện</p>
          <div class="aa-row">${[1, 2, 3, 4, 5]
            .map((n) => `<button type="button" class="aa-chip${mine === n ? " on" : ""}" data-star="${n}">${"★".repeat(n)}</button>`)
            .join("")}</div>
        </div>`,
        "sheet"
      );
      $$("[data-star]").forEach((b) => {
        b.onclick = () => {
          try {
            const st = VCBG.rateStory(s.id, Number(b.dataset.star));
            $("#btnRate").querySelector("em").textContent = (st.rating_avg || 0) + " ★";
            toast("Đã ghi đánh giá.");
            $("#rDraw").innerHTML = "";
          } catch (err) {
            toast(err.message);
          }
        };
      });
    };
    $("#btnCmtAll").onclick = () => openComments(s, ch, "", "");
    bindParagraphComments(s, ch, comments);
  }
  function chapterAudioPlayer(ch, story) {
    const cover = ch.audio_cover_url || story.cover || "brand/mark.png";
    const hasAudio = !!ch.audio_url;
    const title = ch.audio_title || (hasAudio ? `Bản thu chương ${ch.number}` : "Chưa có bản thu — bản xem trước");
    return `<section class="chapter-audio${hasAudio ? "" : " is-preview"}" data-chapter-audio>
      <div class="chapter-audio-disc" style="--audio-cover:url('${esc(cover)}')" aria-hidden="true"><i></i></div>
      <div class="chapter-audio-main">
        <span class="chapter-audio-kicker">BẢN THU ÂM</span>
        <strong>${esc(title)}</strong>
        <div class="chapter-audio-controls">
          <button type="button" class="chapter-audio-skip" data-audio-back aria-label="Lùi 15 giây">−15</button>
          <button type="button" class="chapter-audio-play" data-audio-play aria-label="${hasAudio ? "Phát bản thu" : "Chưa có bản thu"}" ${hasAudio ? "" : "disabled"}><span>▶</span></button>
          <button type="button" class="chapter-audio-skip" data-audio-next aria-label="Tiến 15 giây">+15</button>
          <span class="chapter-audio-time" data-audio-time>0:00 / --:--</span>
        </div>
        <input class="chapter-audio-range" data-audio-range type="range" min="0" max="1000" value="0" aria-label="Tiến trình bản thu">
      </div>
      <audio data-audio preload="none" ${hasAudio ? `src="${esc(ch.audio_url)}"` : ""}></audio>
    </section>`;
  }
  function bindChapterAudio() {
    $$('[data-chapter-audio]').forEach((box) => {
      const audio = box.querySelector('[data-audio]');
      const play = box.querySelector('[data-audio-play]');
      const range = box.querySelector('[data-audio-range]');
      const time = box.querySelector('[data-audio-time]');
      const fmt = (n) => {
        if (!Number.isFinite(n)) return "--:--";
        n = Math.max(0, Math.floor(n));
        return Math.floor(n / 60) + ":" + String(n % 60).padStart(2, "0");
      };
      const paint = () => {
        const duration = Number.isFinite(audio.duration) ? audio.duration : 0;
        range.value = duration ? Math.round((audio.currentTime / duration) * 1000) : 0;
        time.textContent = fmt(audio.currentTime) + " / " + fmt(audio.duration);
      };
      play.onclick = async () => {
        try {
          if (audio.paused) await audio.play();
          else audio.pause();
        } catch (_) { toast("Không mở được bản thu. Hãy thử lại."); }
      };
      box.querySelector('[data-audio-back]').onclick = () => { audio.currentTime = Math.max(0, audio.currentTime - 15); };
      box.querySelector('[data-audio-next]').onclick = () => { audio.currentTime = Math.min(audio.duration || Infinity, audio.currentTime + 15); };
      range.oninput = () => { if (Number.isFinite(audio.duration)) audio.currentTime = (Number(range.value) / 1000) * audio.duration; };
      audio.addEventListener("play", () => { box.classList.add("is-playing"); play.querySelector("span").textContent = "Ⅱ"; });
      audio.addEventListener("pause", () => { box.classList.remove("is-playing"); play.querySelector("span").textContent = "▶"; });
      audio.addEventListener("ended", () => { box.classList.remove("is-playing"); play.querySelector("span").textContent = "▶"; });
      audio.addEventListener("timeupdate", paint);
      audio.addEventListener("loadedmetadata", paint);
    });
  }
  function decorateParagraphs(html, comments) {
    const box = document.createElement("div");
    box.innerHTML = html || "";
    const counts = {};
    (comments || []).forEach((c) => {
      const k = c.para_key || hashQuote(c.quote);
      if (!k) return;
      counts[k] = (counts[k] || 0) + 1;
    });
    let n = 0;
    box.querySelectorAll("p").forEach((p) => {
      const key = "p" + n++;
      p.dataset.pk = key;
      p.classList.add("r-p");
      const nC = counts[key] || counts[hashQuote(p.textContent)] || 0;
      const bub = document.createElement("button");
      bub.type = "button";
      bub.className = "p-bubble" + (nC ? " has" : "");
      bub.dataset.pk = key;
      bub.setAttribute("aria-label", "Bình luận đoạn");
      bub.textContent = nC ? String(nC) : "";
      p.appendChild(bub);
    });
    return box.innerHTML;
  }
  function hashQuote(q) {
    const t = String(q || "").replace(/\s+/g, " ").trim();
    if (!t) return "";
    let h = 0;
    for (let i = 0; i < t.length; i++) h = (h * 31 + t.charCodeAt(i)) | 0;
    return "q" + (h >>> 0).toString(36);
  }
  function bindParagraphComments(s, ch, comments) {
    const body = $("#rbody");
    if (!body) return;
    const closeMenu = () => $$(".p-menu").forEach((n) => n.remove());
    body.addEventListener("click", (e) => {
      const bub = e.target.closest(".p-bubble");
      if (bub) {
        e.stopPropagation();
        const p = bub.closest("p");
        const key = p && p.dataset.pk;
        const quote = p ? p.childNodes[0] && p.childNodes[0].textContent : "";
        openComments(s, ch, String(quote || "").trim().slice(0, 500), key);
        return;
      }
    });
    let holdT;
    body.addEventListener("pointerdown", (e) => {
      const p = e.target.closest("p.r-p");
      if (!p || e.target.closest(".p-bubble,a,button")) return;
      holdT = setTimeout(() => {
        closeMenu();
        const menu = document.createElement("div");
        menu.className = "p-menu";
        menu.innerHTML = `<button type="button" data-act="cmt">Bình luận</button><button type="button" data-act="quote">Trích dẫn</button>`;
        p.appendChild(menu);
        menu.onclick = (ev) => {
          ev.stopPropagation();
          const act = ev.target.dataset.act;
          const quote = String(p.innerText || "").replace(/\d+$/, "").trim().slice(0, 500);
          closeMenu();
          if (act) openComments(s, ch, quote, p.dataset.pk);
        };
      }, 420);
    });
    body.addEventListener("pointerup", () => clearTimeout(holdT));
    body.addEventListener("pointercancel", () => clearTimeout(holdT));
    if (window.__vcbgSel) document.removeEventListener("selectionchange", window.__vcbgSel);
    let selT = 0;
    window.__vcbgSel = () => {
      clearTimeout(selT);
      selT = setTimeout(() => {
      const sel = window.getSelection();
      const t = sel && String(sel).trim();
      $$(".quote-pop").forEach((n) => n.remove());
      if (!t || t.length < 4 || !body.contains(sel.anchorNode)) return;
      const r = sel.getRangeAt(0).getBoundingClientRect();
      const pop = document.createElement("div");
      pop.className = "p-menu quote-pop";
      pop.innerHTML = `<button type="button" data-act="cmt">Bình luận</button><button type="button" data-act="quote">Trích dẫn</button>`;
      pop.style.left = Math.max(8, r.left + window.scrollX) + "px";
      pop.style.top = r.top + window.scrollY - 44 + "px";
      pop.onclick = (ev) => {
        const p = sel.anchorNode && sel.anchorNode.parentElement && sel.anchorNode.parentElement.closest("p.r-p");
        openComments(s, ch, t.slice(0, 500), p && p.dataset.pk);
        $$(".quote-pop").forEach((n) => n.remove());
      };
      document.body.appendChild(pop);
      }, 180);
    };
    document.addEventListener("selectionchange", window.__vcbgSel);
  }
  function overlay(html, side, onClose) {
    const host = $("#rDraw") || app();
    const kind = side === "settings" ? "settings" : side === "sheet" ? "sheet" : side === "side" ? "side" : "sheet";
    host.innerHTML = `<div class="drawer-bg" id="obg"></div><aside class="drawer ${kind}" role="dialog">${html}</aside>`;
    const close = () => {
      host.innerHTML = "";
      if (typeof onClose === "function") onClose();
    };
    $("#obg").onclick = close;
    const x = $("#btnCloseDraw");
    if (x) x.onclick = close;
    return close;
  }
  function createAutoScroll(page, nextHref) {
    const pill = $("#autoScrollFloat");
    const scroller = document.scrollingElement || document.documentElement;
    const speeds = { 0.5: 12, 0.75: 18, 1: 26, 1.25: 36, 1.5: 48 };
    let running = false;
    let raf = 0;
    let last = 0;
    let carry = 0;
    let oldScrollBehavior = "";
    let behaviorChanged = false;
    let speed = readPrefs().autoScrollSpeed || 1;
    const paint = () => {
      if (!pill) return;
      pill.hidden = !running;
      const em = pill.querySelector("em");
      if (em) em.textContent = String(speed) + "×";
    };
    const stop = () => {
      running = false;
      cancelAnimationFrame(raf);
      raf = 0;
      last = 0;
      carry = 0;
      if (behaviorChanged) {
        scroller.style.scrollBehavior = oldScrollBehavior;
        behaviorChanged = false;
      }
      paint();
    };
    const step = (now) => {
      if (!running || !document.body.contains(page)) return stop();
      if (!last) last = now;
      const dt = Math.min(40, now - last);
      last = now;
      const max = Math.max(0, scroller.scrollHeight - scroller.clientHeight);
      if (scroller.scrollTop >= max - 2) {
        stop();
        const pref = readPrefs();
        if (pref.autoNext && nextHref) location.hash = nextHref.slice(1);
        return;
      }
      // Mobile Safari rounds sub-pixel scrollBy values down to zero. Keep the
      // remainder and move by whole pixels so slow speeds remain visible.
      carry += (speeds[speed] || speeds[1]) * dt / 1000;
      if (carry >= 1) {
        const pixels = Math.floor(carry);
        carry -= pixels;
        // The site uses smooth scrolling globally. Repeated scrollBy calls can
        // keep restarting that animation on iOS, making the page look frozen.
        // Update the real scrolling element directly while auto-scroll runs.
        scroller.scrollTop = Math.min(max, scroller.scrollTop + pixels);
      }
      raf = requestAnimationFrame(step);
    };
    const start = () => {
      if (running) return;
      running = true;
      last = 0;
      carry = 0;
      oldScrollBehavior = scroller.style.scrollBehavior;
      scroller.style.scrollBehavior = "auto";
      behaviorChanged = true;
      paint();
      raf = requestAnimationFrame(step);
    };
    const setSpeed = (value) => {
      speed = Math.min(1.5, Math.max(0.5, Number(value) || 1));
      const p = readPrefs();
      p.autoScrollSpeed = speed;
      savePrefs(p);
      paint();
    };
    if (pill) pill.onclick = (e) => { e.stopPropagation(); stop(); };
    const userStops = () => { if (running) stop(); };
    page.addEventListener("touchstart", (e) => { if (!e.target.closest("#autoScrollFloat")) userStops(); }, { passive: true });
    page.addEventListener("wheel", userStops, { passive: true });
    return { start, stop, setSpeed, isRunning: () => running };
  }

  function openSettings(page, autoScroll) {
    const p = readPrefs();
    const speedOptions = [0.5, 0.75, 1, 1.25, 1.5];
    page.classList.add("settings-open");
    const closeSettings = overlay(
      `<div class="aa-pad aa-settings">
        <div class="aa-tabs" role="tablist" aria-label="Cài đặt đọc">
          <button type="button" class="on" data-setting-tab="text">Chữ</button>
          <button type="button" data-setting-tab="theme">Nền</button>
          <button type="button" data-setting-tab="scroll">Tự cuộn</button>
        </div>
        <section class="aa-panel on" data-setting-panel="text">
          <p class="set-lab">Cỡ chữ</p>
          <div class="aa-row">
            <button type="button" class="aa-chip" data-sz="-">A−</button>
            <button type="button" class="aa-chip" data-sz="+">A+</button>
          </div>
          <p class="set-lab">Kiểu chữ</p>
          <div class="aa-row">
            <button type="button" class="aa-chip${p.font !== "sans" ? " on" : ""}" data-ft="serif">Serif</button>
            <button type="button" class="aa-chip${p.font === "sans" ? " on" : ""}" data-ft="sans">Sans</button>
          </div>
        </section>
        <section class="aa-panel" data-setting-panel="theme">
          <p class="set-lab">Màu nền đọc</p>
          <div class="aa-row">
            <button type="button" class="aa-chip${p.theme === "dark" ? " on" : ""}" data-th="dark">Tối</button>
            <button type="button" class="aa-chip${p.theme === "light" ? " on" : ""}" data-th="light">Sáng</button>
            <button type="button" class="aa-chip${p.theme === "sepia" ? " on" : ""}" data-th="sepia">Kem</button>
          </div>
        </section>
        <section class="aa-panel" data-setting-panel="scroll">
          <div class="auto-scroll-setting">
            <div class="auto-scroll-setting-head"><div><b>Tự cuộn văn bản</b><small>Đọc rảnh tay, không cần vuốt màn hình</small></div><button type="button" class="auto-scroll-toggle${autoScroll && autoScroll.isRunning() ? " on" : ""}" id="autoScrollToggle">${autoScroll && autoScroll.isRunning() ? "Dừng" : "Bắt đầu"}</button></div>
            <p class="set-lab">Tốc độ tự cuộn</p>
            <div class="auto-speed-row">${speedOptions.map((v) => `<button type="button" class="auto-speed${Number(p.autoScrollSpeed) === v ? " on" : ""}" data-auto-speed="${v}">${v}×</button>`).join("")}</div>
            <label class="auto-next"><span><b>Hết chương tự chuyển chương tiếp</b></span><input type="checkbox" id="autoNext" ${p.autoNext ? "checked" : ""}><i></i></label>
          </div>
        </section>
      </div>`,
      "settings",
      () => page.classList.remove("settings-open")
    );
    $$('[data-setting-tab]').forEach((tab) => {
      tab.onclick = () => {
        $$('[data-setting-tab]').forEach((x) => x.classList.toggle("on", x === tab));
        $$('[data-setting-panel]').forEach((panel) => panel.classList.toggle("on", panel.dataset.settingPanel === tab.dataset.settingTab));
      };
    });
    const apply = () => {
      savePrefs(p);
      page.dataset.theme = p.theme;
      page.dataset.font = p.font || "serif";
      page.style.setProperty("--rsize", p.size + "rem");
      $$(".aa-chip[data-th]").forEach((b) => b.classList.toggle("on", b.dataset.th === p.theme));
      $$(".aa-chip[data-ft]").forEach((b) => b.classList.toggle("on", b.dataset.ft === (p.font || "serif")));
    };
    $$("[data-sz]").forEach(
      (b) =>
        (b.onclick = () => {
          p.size = Math.min(1.7, Math.max(0.95, +(p.size + (b.dataset.sz === "+" ? 0.08 : -0.08)).toFixed(2)));
          apply();
        })
    );
    $$("[data-th]").forEach(
      (b) =>
        (b.onclick = () => {
          p.theme = b.dataset.th;
          apply();
        })
    );
    $$("[data-ft]").forEach(
      (b) =>
        (b.onclick = () => {
          p.font = b.dataset.ft;
          apply();
        })
    );
    $$("[data-auto-speed]").forEach((b) => {
      b.onclick = () => {
        p.autoScrollSpeed = Number(b.dataset.autoSpeed);
        savePrefs(p);
        if (autoScroll) autoScroll.setSpeed(p.autoScrollSpeed);
        $$("[data-auto-speed]").forEach((x) => x.classList.toggle("on", x === b));
      };
    });
    const autoNext = $("#autoNext");
    if (autoNext) autoNext.onchange = () => {
      p.autoNext = autoNext.checked;
      savePrefs(p);
    };
    const autoToggle = $("#autoScrollToggle");
    if (autoToggle && autoScroll) autoToggle.onclick = () => {
      if (autoScroll.isRunning()) autoScroll.stop();
      else {
        autoScroll.setSpeed(p.autoScrollSpeed);
        autoScroll.start();
        closeSettings();
      }
    };
  }
  function openToc(s, all, cur) {
    overlay(
      `<div class="aa-pad toc-pad">
        <div class="drawer-head">
          <h3>Mục lục</h3>
          <button type="button" class="r-ico" id="btnCloseDraw" aria-label="Đóng">×</button>
        </div>
        <ul class="chapter-list">${all
          .map(
            (c) =>
              `<li><a class="${c.number === cur ? "on" : ""}" href="#/truyen/${esc(s.slug)}/chuong-${c.number}"><span class="num">${c.number}</span><span>${esc(c.title || "")}</span></a></li>`
          )
          .join("")}</ul>
      </div>`,
      "sheet"
    );
  }
  function openComments(s, ch, quote, paraKey) {
    const u = VCBG.currentUser();
    let list = VCBG.listComments(ch.id);
    if (paraKey) {
      list = list.filter((c) => c.para_key === paraKey || hashQuote(c.quote) === paraKey);
    }
    overlay(
      `<div class="aa-pad toc-pad">
        <div class="drawer-head">
          <h3>${paraKey ? "Bình luận đoạn" : "Bình luận chương " + ch.number}</h3>
          <button type="button" class="r-ico" id="btnCloseDraw" aria-label="Đóng">×</button>
        </div>
        ${
          u
            ? `<form id="cForm">
          ${quote ? `<div class="quote-ref" id="qRef">${esc(quote)}</div>` : ""}
          <textarea name="body" required maxlength="2000" placeholder="Viết bình luận…"></textarea>
          <button class="btn btn-primary" type="submit" style="margin-top:.5rem">Gửi</button>
        </form>`
            : `<p><a href="#/dang-nhap">Đăng nhập</a> để bình luận.</p>`
        }
        <div id="cList">${renderComments(list, s)}</div>
      </div>`,
      "side"
    );
    const form = $("#cForm");
    if (form)
      form.onsubmit = (e) => {
        e.preventDefault();
        try {
          VCBG.addComment({ chapterId: ch.id, storyId: s.id, body: form.body.value, quote, para_key: paraKey || "" });
          toast("Đăng bình luận thành công.");
          openComments(s, ch, "", paraKey || "");
        } catch (err) {
          toast(err.message);
        }
      };
    bindCommentActs(s, ch);
  }
  function renderComments(list, s) {
    if (!list.length) return `<div class="empty">Chưa có bình luận.</div>`;
    const me = VCBG.currentUser();
    return list
      .map(
        (c) => `<article class="comment" data-id="${c.id}">
        ${c.quote ? `<div class="quote-ref">${esc(c.quote)}</div>` : ""}
        <b>${esc((c.user && c.user.display_name) || "Ẩn danh")}</b>
        <p>${esc(c.body)}</p>
        <div class="action-row">
          <button class="btn btn-ghost" data-like="${c.id}">♥ ${c.like_count || 0}</button>
          ${me ? `<button class="btn btn-ghost" data-reply="${c.id}">Trả lời</button>` : ""}
          ${me && (me.id === c.user_id || VCBG.isAdmin()) ? `<button class="btn btn-ghost" data-del="${c.id}">Xóa</button>` : ""}
        </div>
        ${(c.replies || [])
          .map(
            (r) =>
              `<div class="comment" style="margin-left:1rem"><b>${esc((r.user && r.user.display_name) || "")}</b><p>${esc(r.body)}</p>
              ${me && (me.id === r.user_id || VCBG.isAdmin()) ? `<button class="btn btn-ghost" data-delr="${r.id}">Xóa</button>` : ""}</div>`
          )
          .join("")}
      </article>`
      )
      .join("");
  }
  function bindCommentActs(s, ch) {
    $$("[data-like]").forEach(
      (b) =>
        (b.onclick = () => {
          try {
            const r = VCBG.likeComment(b.dataset.like);
            b.textContent = "♥ " + r.count;
          } catch (e) {
            toast(e.message);
          }
        })
    );
    $$("[data-del]").forEach(
      (b) =>
        (b.onclick = () => {
          VCBG.deleteOwnComment(b.dataset.del);
          toast("Đã xóa bình luận.");
          openComments(s, ch, "");
        })
    );
    $$("[data-delr]").forEach(
      (b) =>
        (b.onclick = () => {
          VCBG.deleteOwnReply(b.dataset.delr);
          openComments(s, ch, "");
        })
    );
    $$("[data-reply]").forEach(
      (b) =>
        (b.onclick = () => {
          const body = prompt("Trả lời:");
          if (!body) return;
          try {
            VCBG.replyComment(b.dataset.reply, body);
            toast("Đã trả lời.");
            openComments(s, ch, "");
          } catch (e) {
            toast(e.message);
          }
        })
    );
  }

  function needUser(next) {
    if (!VCBG.currentUser()) {
      goToLogin(next);
      return false;
    }
    return true;
  }
  function pageAuth(kind) {
    const authRoute = parseHash();
    const savedReturn = authReturnSnapshot();
    const returnTarget =
      safeInternalPath(authRoute.q && authRoute.q.next) ||
      (savedReturn && safeInternalPath(savedReturn.path)) ||
      "";
    setMeta("Đăng nhập — ViCamBachGiai", "Đăng nhập ViCamBachGiai bằng Google.");
    app().innerHTML =
      header() +
      `<main class="wrap auth-page auth-google-only" style="max-width:30rem;padding:2rem 1rem">
        <button class="auth-back" id="authBack" type="button" aria-label="Quay lại trang trước">← Quay lại trang trước</button>
        <section class="auth-login-content" aria-labelledby="authTitle">
          <h1 class="hero-title" id="authTitle">Đăng nhập</h1>
          <p class="auth-google-intro">Lưu truyện, bình luận và tiếp tục đọc trên mọi thiết bị.</p>
          <div class="auth-google-block">
            <div class="auth-google-choice">
              <div class="auth-google-copy"><strong>Chọn tài khoản Google</strong><span>Chạm biểu tượng G để tiếp tục</span></div>
              <div class="auth-google-direct" id="googleAuth" aria-live="polite">Đang tải…</div>
            </div>
            <button type="button" class="auth-google-retry" id="googleRetry" hidden>Tải lại trang</button>
          </div>
          <p class="auth-google-note">ViCamBachGiai chỉ nhận tên, email và ảnh đại diện.</p>
          <p class="auth-error" id="aErr"></p>
        </section>
      </main>` +
      footer();
    bindChrome();
    const back = $("#authBack");
    if (back) {
      back.onclick = () => {
        if (returnTarget) returnFromAuth(returnTarget);
        else if (history.length > 1) history.back();
        else returnFromAuth("/");
      };
    }
    const showErr = (msg) => {
      const el = $("#aErr");
      if (el) el.textContent = msg || "";
      if (msg) toast(msg);
    };
    const googleBtn = $("#googleAuth");
    const retryBtn = $("#googleRetry");
    if (retryBtn) retryBtn.onclick = () => location.reload();
    if (googleBtn) {
      let attempts = 0;
      const mountGoogle = async () => {
        if (!googleBtn.isConnected) return;
        if (!(window.google && google.accounts && google.accounts.id)) {
          attempts += 1;
          if (attempts >= 50) {
            googleBtn.textContent = "Google chưa tải được trên trình duyệt này.";
            if (retryBtn) retryBtn.hidden = false;
            showErr("Kiểm tra mạng hoặc mở trang bằng Safari rồi tải lại.");
            return;
          }
          setTimeout(mountGoogle, 200);
          return;
        }
        const rawNonce = crypto.randomUUID
          ? crypto.randomUUID()
          : Array.from(crypto.getRandomValues(new Uint8Array(24)), (n) => n.toString(16).padStart(2, "0")).join("");
        const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(rawNonce));
        const hashedNonce = Array.from(new Uint8Array(digest), (n) => n.toString(16).padStart(2, "0")).join("");
        googleBtn.textContent = "";
        // Do not silently reuse the last Google account on a fresh sign-in.
        // The website session is still persisted normally after the user chooses.
        google.accounts.id.disableAutoSelect();
        google.accounts.id.initialize({
          client_id: "726540465981-pg5i7fnr26ljb0cpi22su28b1lhc4f6b.apps.googleusercontent.com",
          nonce: hashedNonce,
          auto_select: false,
          itp_support: true,
          callback: async (response) => {
            showErr("");
            rememberAuthReturn(returnTarget || "/");
            googleBtn.classList.add("is-busy");
            try {
              await VCBG.loginWithGoogleIdToken({ token: response.credential, nonce: rawNonce });
              toast("Đăng nhập thành công.");
              await returnFromAuth(returnTarget || "/");
            } catch (err) {
              googleBtn.classList.remove("is-busy");
              showErr(err.message || "Không thể đăng nhập bằng Google.");
            }
          },
        });
        google.accounts.id.renderButton(googleBtn, {
          type: "icon",
          theme: "outline",
          size: "large",
          shape: "circle",
        });
      };
      mountGoogle().catch((err) => {
        googleBtn.textContent = "Google chưa tải được trên trình duyệt này.";
        if (retryBtn) retryBtn.hidden = false;
        showErr(err.message || "Không thể khởi tạo đăng nhập Google.");
      });
    }

  }
  function pageLibrary() {
    if (!needUser()) return;
    const lib = VCBG.library();
    setMeta("Tủ truyện — ViCamBachGiai", "Truyện đã lưu trên ViCamBachGiai.");
    const block = (title, items, kind) =>
      `<section class="section"><h2>${title}</h2>${
        items.length
          ? `<div class="card-grid">${items
              .map((x) => {
                const s = x.story;
                if (!s) return "";
                const p = x.progress;
                return `<div>${storyCard(s, true)}${p ? `<a class="btn btn-ghost" href="#/truyen/${esc(s.slug)}/chuong-${p.chapter_number}">Đọc tiếp ch. ${p.chapter_number}</a>` : ""}${
                  kind === "fav"
                    ? `<button class="btn btn-ghost" data-unfav="${s.id}">Xóa khỏi tủ</button>`
                    : ""
                }</div>`;
              })
              .join("")}</div>`
          : `<div class="empty">Chưa có.</div>`
      }</section>`;
    app().innerHTML =
      header() +
      `<main class="wrap" style="padding:1.2rem 1rem 2rem">
        <h1 class="hero-title" style="font-size:1.8rem">Tủ truyện</h1>
        ${block("Yêu thích", lib.favorites, "fav")}
        ${block("Đang theo dõi", lib.follows)}
        <section class="section"><h2>Lịch sử đọc</h2>
          <ul class="chapter-list">${lib.history
            .map(
              (h) =>
                h.story
                  ? `<li><a href="#/truyen/${esc(h.story.slug)}/chuong-${h.chapter_number}"><span class="num">${h.chapter_number}</span><span>${esc(h.story.title)}</span><span class="num">${fmtDate(h.at)}</span></a></li>`
                  : ""
            )
            .join("")}</ul>
        </section>
        <section class="section"><h2>Bình luận của bạn</h2>
          ${lib.comments.map((c) => `<p>${esc(c.body)} — <a href="#/truyen/${esc((c.story && c.story.slug) || "")}">${esc((c.story && c.story.title) || "")}</a></p>`).join("") || `<div class="empty">Chưa có.</div>`}
        </section>
      </main>` +
      footer();
    bindChrome();
    $$("[data-unfav]").forEach(
      (b) =>
        (b.onclick = () => {
          VCBG.toggleFavorite(b.dataset.unfav);
          toast("Đã xóa khỏi tủ truyện.");
          pageLibrary();
        })
    );
  }
  function pageAccount() {
    if (!needUser()) return;
    const u = VCBG.currentUser();
    setMeta("Tài khoản — ViCamBachGiai", "Hồ sơ độc giả.");
    app().innerHTML =
      header() +
      `<main class="wrap" style="max-width:32rem;padding:1.4rem 1rem">
        <h1 class="hero-title" style="font-size:1.8rem">${esc(u.profile.display_name)}</h1>
        <p>${esc(u.email)} · ${VCBG.isAdmin() ? "Quản trị viên" : "Người đọc"}</p>
        <form id="pForm">
          <div class="field"><label>Tên hiển thị</label><input name="display_name" value="${esc(u.profile.display_name)}"></div>
          <div class="field"><label>Giới thiệu</label><textarea name="bio">${esc(u.profile.bio || "")}</textarea></div>
          <button class="btn btn-primary">Lưu hồ sơ</button>
        </form>
        <p style="margin-top:1rem"><button class="btn btn-ghost" id="out">Đăng xuất</button></p>
      </main>` +
      footer();
    bindChrome();
    $("#pForm").onsubmit = (e) => {
      e.preventDefault();
      VCBG.updateProfile(Object.fromEntries(new FormData(e.target)));
      toast("Đã lưu hồ sơ.");
      render();
    };
    $("#out").onclick = () => {
      VCBG.logout();
      toast("Đã đăng xuất.");
      go("/");
    };
  }
  function pageNotifs() {
    if (!needUser()) return;
    const list = VCBG.myNotifications();
    VCBG.markNotificationsRead();
    setMeta("Thông báo — ViCamBachGiai", "Cập nhật theo dõi.");
    app().innerHTML =
      header() +
      `<main class="wrap" style="padding:1.2rem 1rem">
        <h1 class="hero-title" style="font-size:1.8rem">Thông báo</h1>
        ${
          list.length
            ? list
                .map((n) => `<a class="comment" href="${esc(n.href || "#/")}"><b>${esc(n.title)}</b><p>${esc(n.body)}</p><div class="sub">${fmtDate(n.at)}</div></a>`)
                .join("")
            : `<div class="empty">Chưa có thông báo.</div>`
        }
      </main>` +
      footer();
    bindChrome();
  }

  function needAdmin() {
    const u = VCBG.currentUser();
    if (!u) {
      goToLogin();
      return false;
    }
    if (!VCBG.isAdmin()) {
      toast("Khu vực quản trị chỉ dành cho quản trị viên.");
      go("/");
      return false;
    }
    return true;
  }
  function adminNav(on) {
    const links = [
      ["", "Tổng quan"],
      ["/truyen", "Truyện"],
      ["/chuong", "Chương"],
      ["/binh-luan", "Bình luận"],
      ["/thanh-vien", "Thành viên"],
      ["/phan-loai", "Phân loại"],
      ["/trang-chu", "Trang chủ"],
      ["/hop-thu", "Hộp thư"],
      ["/cai-dat", "Cài đặt"],
    ];
    return `<nav class="admin-nav">${links
      .map(([h, l]) => `<a class="${on === h ? "on" : ""}" href="#/admin${h}">${l}</a>`)
      .join("")}</nav>`;
  }
  async function pageAdmin(route) {
    if (!needAdmin()) return;
    const sub = route.parts[1] || "";
    setMeta("Quản trị — ViCamBachGiai", "Bảng điều khiển.");
    if (sub === "truyen" && route.parts[2] === "moi") return adminStoryForm(null);
    if (sub === "truyen" && route.parts[2]) return adminStoryForm(route.parts[2]);
    if (sub === "chuong" && route.parts[2] === "moi") return adminChapterForm(null, route.q.story);
    if (sub === "chuong" && route.parts[2]) return adminChapterForm(route.parts[2]);
    let body = "";
    if (!sub) {
      const st = VCBG.adminStats();
      body = `<div class="card-grid">
        ${kpi("Truyện", st.stories)}${kpi("Chương", st.chapters)}${kpi("Thành viên", st.members)}${kpi("Bình luận", st.comments)}${kpi("Lượt đọc", st.views)}
      </div>
      <h2>Cập nhật gần đây</h2>
      <ul class="chapter-list">${st.recent.map((s) => `<li><a href="#/admin/truyen/${s.id}"><span></span><span>${esc(s.title)}</span><span>${fmtDate(s.updated_at)}</span></a></li>`).join("")}</ul>`;
    } else if (sub === "truyen") {
      const list = VCBG.adminListStories();
      body = `<p><a class="btn btn-primary" href="#/admin/truyen/moi">Thêm truyện</a></p>
        <div class="table-wrapper"><table style="width:100%;border-collapse:collapse">
        <thead><tr><th>Tên</th><th>Trạng thái</th><th>Chương</th><th></th></tr></thead>
        <tbody>${list
          .map(
            (s) =>
              `<tr><td><a href="#/admin/truyen/${s.id}">${esc(s.title)}</a></td><td>${esc(storyStatusLabel(s))}</td><td>${s.stats.chapter_count}</td>
              <td><a href="#/admin/chuong/moi?story=${s.id}">+ Chương</a> · <button data-delst="${s.id}">Xóa</button></td></tr>`
          )
          .join("")}</tbody></table></div>`;
    } else if (sub === "chuong") {
      const stories = VCBG.adminListStories();
      const sid = route.q.story || (stories[0] && stories[0].id);
      const chs = sid ? VCBG.listChapters(sid, { includeUnpublished: true, sort: "desc" }) : [];
      body = `<div class="chapter-toolbar">
        <select id="stPick">${stories.map((s) => `<option value="${s.id}" ${s.id === sid ? "selected" : ""}>${esc(s.title)}</option>`).join("")}</select>
        <a class="btn btn-primary" href="#/admin/chuong/moi?story=${sid || ""}">Chương mới</a>
      </div>
      <ul class="chapter-list">${chs
        .map(
          (c) =>
            `<li class="row"><span class="num">${c.number}</span><a href="#/admin/chuong/${c.id}">${esc(c.title || "")} · ${esc(c.status)}</a>
            <button data-delch="${c.id}">Xóa</button></li>`
        )
        .join("")}</ul>`;
    } else if (sub === "binh-luan") {
      const cm = VCBG.adminComments();
      body = `<label><input type="checkbox" id="lockC" ${VCBG.settings().allow_comments ? "" : "checked"}> Khóa bình luận toàn site</label>
        ${cm
          .map(
            (c) =>
              `<article class="comment"><b>${esc((c.user && c.user.display_name) || "")}</b> · ${esc((c.story && c.story.title) || "")} ch.${c.chapter ? c.chapter.number : "?"}
              <p>${esc(c.body)}</p>
              <button data-hide="${c.id}">Ẩn</button> <button data-kill="${c.id}">Xóa</button></article>`
          )
          .join("")}`;
    } else if (sub === "thanh-vien") {
      body = `<ul class="chapter-list">${VCBG.adminUsers()
        .map(
          (u) =>
            `<li class="row"><span>${esc(u.profile.display_name)}</span><span>${esc(u.email)} · ${u.role} · ${u.status}</span>
            <span><button data-ban="${u.id}">${u.status === "active" ? "Khóa" : "Mở"}</button>
            <button data-role="${u.id}">${u.role === "admin" ? "Hạ thành người đọc" : "Thành quản trị"}</button></span></li>`
        )
        .join("")}</ul>`;
    } else if (sub === "phan-loai") {
      body = `<h3>Bối cảnh</h3>
        <form id="gAdd" class="chapter-toolbar"><input name="name" placeholder="Bối cảnh mới" required><button class="btn btn-primary">Thêm</button></form>
        <ul>${VCBG.listGenres()
          .map((g) => `<li>${esc(g.name)} <button data-rg="${g.id}">Sửa</button> <button data-dg="${g.id}">Xóa</button></li>`)
          .join("")}</ul>
        <h3>Mạch chuyện / motif</h3>
        <form id="tAdd" class="chapter-toolbar"><input name="name" placeholder="Tag mới" required><button class="btn btn-primary">Thêm</button></form>
        <ul>${VCBG.listTags()
          .map((t) => `<li>${esc(t.name)} <button data-rt="${t.id}">Sửa</button> <button data-dt="${t.id}">Xóa</button></li>`)
          .join("")}</ul>`;
    } else if (sub === "trang-chu") {
      const stories = VCBG.adminListStories();
      const quote = VCBG.featuredQuote();
      const poll = VCBG.pollState();
      const qStory = quote ? quote.story.id : "";
      const qChs = qStory ? VCBG.listChapters(qStory, { includeUnpublished: true }) : [];
      body = `<h2>Câu lưu lại</h2>
        <form id="qForm">
          <div class="field"><label>Truyện</label>
            <select name="story_id" id="qStory">${stories.map((s) => `<option value="${s.id}" ${s.id === qStory ? "selected" : ""}>${esc(s.title)}</option>`).join("")}</select>
          </div>
          <div class="field"><label>Chương</label>
            <select name="chapter_id">${qChs.map((c) => `<option value="${c.id}" ${quote && quote.chapter.id === c.id ? "selected" : ""}>${c.number}. ${esc(c.title || "")}</option>`).join("")}</select>
          </div>
          <div class="field"><label>Nội dung trích dẫn</label><textarea name="text">${esc(quote ? quote.text : "")}</textarea></div>
          <button class="btn btn-cyan">Lưu câu</button>
        </form>
        <h2>Đợt bình chọn</h2>
        <form id="pollForm">
          <div class="field"><label>Tiêu đề</label><input name="title" value="${esc(poll.poll.title || "")}"></div>
          <p>Chọn tối đa 6 truyện:</p>
          ${stories
            .map(
              (s) =>
                `<label><input type="checkbox" name="sid" value="${s.id}" ${(poll.poll.story_ids || []).includes(s.id) ? "checked" : ""}> ${esc(s.title)}</label>`
            )
            .join("<br>")}
          <p><button class="btn btn-cyan">Lưu đợt bình chọn</button></p>
        </form>`;
    } else if (sub === "hop-thu") {
      const box = VCBG.adminInbox();
      body = box.length
        ? box
            .map(
              (m) => `<article class="comment">
              <b>${esc(m.type === "report" ? "Báo lỗi" : "Lời nhắn")}</b> · ${esc(m.name)} · ${esc(m.email)}
              ${m.story ? `<p class="sub">${esc(m.story)}</p>` : ""}
              <p>${esc(m.body)}</p>
              <small>${fmtDate(m.at)}</small>
            </article>`
            )
            .join("")
        : `<div class="empty">Hộp thư trống.</div>`;
    } else if (sub === "cai-dat") {
      const st = VCBG.settings();
      const so = st.social || {};
      body = `<form id="setF">
        <div class="field"><label>Tên website</label><input name="name" value="${esc(st.name)}"></div>
        <div class="field"><label>Khẩu hiệu</label><input name="tagline" value="${esc(st.tagline)}"></div>
        <div class="field"><label>YouTube</label><input name="youtube" value="${esc(so.youtube || "")}"></div>
        <div class="field"><label>TikTok</label><input name="tiktok" value="${esc(so.tiktok || "")}"></div>
        <div class="field"><label>Facebook</label><input name="facebook" value="${esc(so.facebook || "")}"></div>
        <div class="field"><label>Wattpad</label><input name="wattpad" value="${esc(so.wattpad || "")}"></div>
        <label><input type="checkbox" name="allow_registration" ${st.allow_registration ? "checked" : ""}> Cho phép đăng ký</label>
        <label><input type="checkbox" name="allow_comments" ${st.allow_comments ? "checked" : ""}> Cho phép bình luận</label>
        <p><button class="btn btn-primary">Lưu</button></p>
      </form>`;
    }
    app().innerHTML =
      header() +
      `<main class="wrap admin-shell">${adminNav("/" + sub === "/" ? "" : "/" + sub)}<div>${body}</div></main>` +
      footer();
    bindChrome();
    bindAdmin(route);
  }
  function kpi(l, n) {
    return `<div class="kpi"><b>${n}</b>${esc(l)}</div>`;
  }
  function bindAdmin(route) {
    const pick = $("#stPick");
    if (pick) pick.onchange = () => go("/admin/chuong?story=" + pick.value);
    $$("[data-delst]").forEach(
      (b) =>
        (b.onclick = () => {
          if (confirm("Xóa truyện và toàn bộ chương?")) {
            VCBG.deleteStory(b.dataset.delst);
            toast("Đã xóa truyện.");
            render();
          }
        })
    );
    $$("[data-delch]").forEach(
      (b) =>
        (b.onclick = () => {
          if (confirm("Xóa chương?")) {
            VCBG.deleteChapter(b.dataset.delch);
            toast("Đã xóa chương.");
            render();
          }
        })
    );
    const lock = $("#lockC");
    if (lock)
      lock.onchange = () => {
        VCBG.setCommentsAllowed(!lock.checked);
        toast(lock.checked ? "Đã khóa bình luận." : "Đã mở bình luận.");
      };
    $$("[data-hide]").forEach(
      (b) =>
        (b.onclick = () => {
          VCBG.moderateComment(b.dataset.hide, "hidden");
          toast("Đã ẩn.");
          render();
        })
    );
    $$("[data-kill]").forEach(
      (b) =>
        (b.onclick = () => {
          VCBG.moderateComment(b.dataset.kill, "deleted");
          toast("Đã xóa.");
          render();
        })
    );
    $$("[data-ban]").forEach(
      (b) =>
        (b.onclick = () => {
          try {
            const u = VCBG.adminUsers().find((x) => x.id === b.dataset.ban);
            VCBG.setUserStatus(b.dataset.ban, u.status === "active" ? "banned" : "active");
            render();
          } catch (e) {
            toast(e.message);
          }
        })
    );
    $$("[data-role]").forEach(
      (b) =>
        (b.onclick = () => {
          try {
            const u = VCBG.adminUsers().find((x) => x.id === b.dataset.role);
            VCBG.setUserRole(b.dataset.role, u.role === "admin" ? "reader" : "admin");
            render();
          } catch (e) {
            toast(e.message);
          }
        })
    );
    const gAdd = $("#gAdd");
    if (gAdd)
      gAdd.onsubmit = (e) => {
        e.preventDefault();
        VCBG.ensureGenre(new FormData(gAdd).get("name"));
        toast("Đã thêm bối cảnh.");
        render();
      };
    const tAdd = $("#tAdd");
    if (tAdd)
      tAdd.onsubmit = (e) => {
        e.preventDefault();
        VCBG.ensureTag(new FormData(tAdd).get("name"));
        toast("Đã thêm tag.");
        render();
      };
    $$("[data-rg]").forEach(
      (b) =>
        (b.onclick = () => {
          const n = prompt("Tên mới");
          if (n) {
            VCBG.renameGenre(b.dataset.rg, n);
            render();
          }
        })
    );
    $$("[data-dg]").forEach(
      (b) =>
        (b.onclick = () => {
          VCBG.deleteGenre(b.dataset.dg);
          render();
        })
    );
    $$("[data-rt]").forEach(
      (b) =>
        (b.onclick = () => {
          const n = prompt("Tên mới");
          if (n) {
            VCBG.renameTag(b.dataset.rt, n);
            render();
          }
        })
    );
    $$("[data-dt]").forEach(
      (b) =>
        (b.onclick = () => {
          VCBG.deleteTag(b.dataset.dt);
          render();
        })
    );
    const setF = $("#setF");
    if (setF)
      setF.onsubmit = (e) => {
        e.preventDefault();
        const fd = new FormData(setF);
        VCBG.updateSettings({
          name: fd.get("name"),
          tagline: fd.get("tagline"),
          allow_registration: setF.allow_registration.checked,
          allow_comments: setF.allow_comments.checked,
          social: {
            youtube: fd.get("youtube") || "",
            tiktok: fd.get("tiktok") || "",
            facebook: fd.get("facebook") || "",
            wattpad: fd.get("wattpad") || "",
          },
        });
        toast("Đã lưu cài đặt.");
      };
    const qForm = $("#qForm");
    if (qForm)
      qForm.onsubmit = (e) => {
        e.preventDefault();
        const fd = new FormData(qForm);
        try {
          VCBG.setFeaturedQuote({
            text: fd.get("text"),
            story_id: fd.get("story_id"),
            chapter_id: fd.get("chapter_id"),
          });
          toast("Đã lưu câu lưu lại.");
        } catch (err) {
          toast(err.message);
        }
      };
    const pollForm = $("#pollForm");
    if (pollForm)
      pollForm.onsubmit = (e) => {
        e.preventDefault();
        const ids = $$("[name=sid]:checked").map((x) => x.value).slice(0, 6);
        VCBG.setPollStories(ids, new FormData(pollForm).get("title"));
        toast("Đã lưu đợt bình chọn.");
        render();
      };
  }
  function adminStoryForm(id) {
    const s = id ? VCBG.getStory(id) : { title: "", slug: "", author: "", editor: "", synopsis: "", description: "", status: "ongoing", featured: false, upcoming: false, accent: "#8a6a4a", cover: "", genres: [], tags: [] };
    const selectedStatus = s.upcoming ? "upcoming" : s.status;
    const gids = (s.genres || []).map((g) => g.id);
    const tids = (s.tags || []).map((t) => t.id);
    app().innerHTML =
      header() +
      `<main class="wrap admin-shell">${adminNav("/truyen")}<div>
        <h1>${id ? "Sửa truyện" : "Thêm truyện"}</h1>
        <form id="stForm">
          <div class="field"><label>Tên</label><input name="title" required value="${esc(s.title)}"></div>
          <div class="field"><label>Slug</label><input name="slug" value="${esc(s.slug || "")}"></div>
          <div class="field"><label>Tác giả</label><input name="author" value="${esc(s.author || "")}"></div>
          <div class="field"><label>Editor / Dịch giả</label><input name="editor" value="${esc(s.editor || "")}"></div>
          <div class="field"><label>Văn án / Giới thiệu</label><textarea name="synopsis" rows="8">${esc(s.synopsis || "")}</textarea></div>
          <div class="field"><label>Thông tin truyện</label>
            <textarea name="description" rows="12" placeholder="Dán cả khối thông tin vào đây, mỗi dòng một mục. Ví dụ:&#10;Tên truyện: …&#10;Tác giả: …&#10;Thể loại: …&#10;Nhân vật chính: …&#10;CP phụ: …">${esc((s.description && s.description !== s.synopsis ? s.description : "") || "")}</textarea>
            <p class="editor-hint">Một ô duy nhất. Xuống dòng tự do, không cần thêm từng trường.</p>
          </div>
          <div class="field"><label>Trạng thái</label>
            <select name="status">
              <option value="ongoing" ${selectedStatus === "ongoing" ? "selected" : ""}>Đang lên sóng</option>
              <option value="completed" ${selectedStatus === "completed" ? "selected" : ""}>Đã hoàn thành</option>
              <option value="upcoming" ${selectedStatus === "upcoming" ? "selected" : ""}>Sắp ra mắt</option>
            </select>
          </div>
          <label><input type="checkbox" name="featured" ${s.featured ? "checked" : ""}> Nổi bật (banner)</label>
          <div class="field"><label>Màu chủ đạo banner</label><input name="accent" value="${esc(s.accent || "#8a6a4a")}"></div>
          <div class="field"><label>Bìa</label><input type="file" id="coverFile" accept="image/*">
            <div class="detail-cover" style="margin-top:.6rem">${s.cover ? coverImg(s.cover, "Bìa") : ""}</div>
          </div>
          <fieldset class="field"><legend>Bối cảnh</legend>
            ${VCBG.listGenres()
              .map((g) => `<label><input type="checkbox" name="genre" value="${g.id}" ${gids.includes(g.id) ? "checked" : ""}> ${esc(g.name)}</label>`)
              .join(" ")}
          </fieldset>
          <fieldset class="field"><legend>Mạch chuyện</legend>
            ${VCBG.listTags()
              .map((t) => `<label><input type="checkbox" name="tag" value="${t.id}" ${tids.includes(t.id) ? "checked" : ""}> ${esc(t.name)}</label>`)
              .join(" ")}
          </fieldset>
          <button class="btn btn-primary">Lưu truyện</button>
        </form>
      </div></main>` +
      footer();
    bindChrome();
    let cover = s.cover || "";
    let coverFile = null;
    $("#coverFile").onchange = () => {
      const f = $("#coverFile").files[0];
      if (!f) return;
      coverFile = f;
      toast("Đã chọn bìa; ảnh sẽ tự tối ưu khi lưu.");
    };
    $("#stForm").onsubmit = async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const btn = e.target.querySelector('button[type="submit"]');
      if (btn) {
        btn.disabled = true;
        btn.textContent = "Đang lưu…";
      }
      try {
        const rec = await VCBG.upsertStory({
          id: id && id !== "moi" ? id : undefined,
          title: fd.get("title"),
          slug: fd.get("slug"),
          author: fd.get("author"),
          editor: fd.get("editor"),
          synopsis: fd.get("synopsis"),
          description: fd.get("description"),
          status: fd.get("status"),
          featured: e.target.featured.checked,
          upcoming: fd.get("status") === "upcoming",
          accent: fd.get("accent"),
          cover,
          cover_file: coverFile,
          genre_ids: $$("[name=genre]:checked").map((x) => x.value),
          tag_ids: $$("[name=tag]:checked").map((x) => x.value),
        });
        toast("Đã lưu truyện.");
        go("/admin/truyen/" + rec.id);
      } catch (err) {
        toast(err.message || "Không lưu được truyện.");
      } finally {
        if (btn) {
          btn.disabled = false;
          btn.textContent = "Lưu truyện";
        }
      }
    };
  }
  let editorTimer = null;
  async function adminChapterForm(id, storyId) {
    const ch = id ? VCBG.getChapterById(id) : null;
    if (ch) {
      try {
        await VCBG.ensureChapterBody(ch);
      } catch (err) {
        toast(err.message || "Không tải được nội dung chương.");
      }
    }
    const stories = VCBG.adminListStories();
    const sid = (ch && ch.story_id) || storyId || (stories[0] && stories[0].id);
    const num = ch ? ch.number : sid ? VCBG.nextChapterNumber(sid) : 1;
    const tools = [
      ["undo", "Hoàn tác", "↶"],
      ["redo", "Làm lại", "↷"],
      ["bold", "Đậm", "B"],
      ["italic", "Nghiêng", "I"],
      ["underline", "Gạch chân", "U"],
      ["strike", "Gạch ngang", "S"],
      ["h2", "Tiêu đề lớn", "H2"],
      ["h3", "Tiêu đề nhỏ", "H3"],
      ["p", "Đoạn văn", "¶"],
      ["quote", "Trích dẫn", "“ ”"],
      ["ul", "Danh sách", "•"],
      ["ol", "Đánh số", "1."],
      ["left", "Căn trái", "⬅"],
      ["center", "Căn giữa", "↔"],
      ["right", "Căn phải", "➡"],
      ["justify", "Căn đều", "☰"],
      ["gap-", "Giãn đoạn hẹp", "¶−"],
      ["gap+", "Giãn đoạn rộng", "¶+"],
      ["link", "Chèn liên kết", "🔗"],
      ["img", "Chèn ảnh", "🖼"],
      ["clear", "Xóa định dạng", "Tx"],
    ];
    app().innerHTML =
      header() +
      `<main class="wrap admin-shell">${adminNav("/chuong")}<div>
        <h1>${ch ? "Sửa chương" : "Chương mới"}</h1>
        <form id="chForm">
          <div class="field"><label>Truyện</label>
            <select name="story_id">${stories.map((s) => `<option value="${s.id}" ${s.id === sid ? "selected" : ""}>${esc(s.title)}</option>`).join("")}</select>
          </div>
          <div class="field"><label>Số chương</label><input name="number" type="number" min="1" value="${num}"></div>
          <div class="field"><label>Tiêu đề</label><input name="title" value="${esc((ch && ch.title) || "")}"></div>
          <section class="admin-audio-box">
            <div class="admin-audio-head"><div class="admin-audio-mini ${ch && ch.audio_url ? "has-audio" : ""}" ${ch && ch.audio_cover_url ? `style="--audio-cover:url('${esc(ch.audio_cover_url)}')"` : ""}></div><div><b>Bản thu âm của chương</b><small>File chỉ tải khi độc giả bấm phát nên không làm nặng lúc mở chương.</small></div></div>
            <div class="field"><label>Tên hiển thị của bản thu</label><input name="audio_title" value="${esc((ch && ch.audio_title) || "")}" placeholder="Ví dụ: Nghe chương 12"></div>
            <div class="field"><label>File ghi âm (M4A, MP3, AAC… tối đa 95MB)</label><input name="audio_file" type="file" accept="audio/*,.m4a,.mp3,.aac,.ogg"></div>
            <div class="field"><label>Ảnh trên đĩa nhạc</label><input name="audio_cover_file" type="file" accept="image/*"></div>
            ${ch && ch.audio_url ? `<label class="admin-audio-remove"><input name="remove_audio" type="checkbox"> Xóa bản thu hiện tại khỏi chương</label>` : ""}
            ${ch && ch.audio_cover_url ? `<label class="admin-audio-remove"><input name="remove_audio_cover" type="checkbox"> Bỏ ảnh đĩa hiện tại</label>` : ""}
          </section>
          <div class="editor-toolbar" role="toolbar" aria-label="Định dạng văn bản">
            ${tools.map(([c, t, lab]) => `<button type="button" data-cmd="${c}" title="${esc(t)}">${lab}</button>`).join("")}
          </div>
          <div class="editor-shell">
            <div class="editor-area" id="ed" contenteditable="true" role="textbox" aria-multiline="true" data-placeholder="Dán hoặc viết nội dung chương…"></div>
          </div>
          <p class="editor-hint">Dán từ Word/web được giữ đoạn văn, bỏ màu chữ rác. Ảnh nên dưới 2MB.</p>
          <div class="field"><label>Trạng thái</label>
            <select name="status">
              <option value="draft" ${ch && ch.status === "draft" ? "selected" : ""}>Nháp</option>
              <option value="published" ${!ch || ch.status === "published" ? "selected" : ""}>Xuất bản</option>
              <option value="scheduled" ${ch && ch.status === "scheduled" ? "selected" : ""}>Hẹn giờ</option>
            </select>
          </div>
          <div class="field"><label>Hẹn giờ xuất bản</label><input name="publish_at" type="datetime-local" value="${ch && ch.publish_at ? new Date(ch.publish_at).toISOString().slice(0, 16) : ""}"></div>
          <button class="btn btn-primary" type="submit">Lưu chương</button>
        </form>
      </div></main>` +
      footer();
    bindChrome();
    const ed = $("#ed");
    let edGap = 0.9;
    if (ch && ch.body) {
      ed.innerHTML = sanitize(ch.body);
      const firstP = ed.querySelector("p");
      const mb = firstP && firstP.style && firstP.style.marginBottom;
      const n = mb ? parseFloat(mb) : NaN;
      if (Number.isFinite(n)) edGap = Math.min(2.2, Math.max(0.4, n));
    }
    ed.style.setProperty("--ed-gap", edGap + "em");
    const key = "vicambachgiai.autosave." + (id || "new");
    try {
      const saved = localStorage.getItem(key);
      if (saved && !ch && saved.length < 400000) ed.innerHTML = saved;
    } catch (_) {}
    if (editorTimer) clearInterval(editorTimer);
    editorTimer = setInterval(() => {
      if (!ed.isConnected) {
        clearInterval(editorTimer);
        editorTimer = null;
        return;
      }
      const html = ed.innerHTML;
      if (html.length > 400000) return;
      try {
        localStorage.setItem(key, html);
      } catch (_) {}
    }, 8000);
    const run = (cmd, val) => {
      ed.focus();
      try {
        document.execCommand(cmd, false, val);
      } catch (_) {}
    };
    const focusEditor = () => {
      try { ed.focus({ preventScroll: true }); } catch (_) { ed.focus(); }
      const sel = window.getSelection && window.getSelection();
      if (!sel || (sel.anchorNode && ed.contains(sel.anchorNode))) return;
      try {
        const range = document.createRange();
        range.selectNodeContents(ed);
        range.collapse(false);
        sel.removeAllRanges();
        sel.addRange(range);
      } catch (_) {}
    };
    ed.addEventListener("click", (e) => {
      if (e.target === ed) requestAnimationFrame(focusEditor);
    });
    const insertHtml = (html) => {
      ed.focus();
      try {
        document.execCommand("insertHTML", false, html);
      } catch (_) {
        ed.insertAdjacentHTML("beforeend", html);
      }
    };
    const shrinkImage = (file, cb) => {
      if (!file) return;
      if (file.size > 6 * 1024 * 1024) {
        toast("Ảnh quá lớn. Chọn ảnh dưới 6MB.");
        return;
      }
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        const max = 1400;
        let w = img.width;
        let h = img.height;
        if (w > max) {
          h = Math.round((h * max) / w);
          w = max;
        }
        const c = document.createElement("canvas");
        c.width = w;
        c.height = h;
        c.getContext("2d").drawImage(img, 0, 0, w, h);
        URL.revokeObjectURL(url);
        cb(c.toDataURL("image/jpeg", 0.82));
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        toast("Không đọc được ảnh.");
      };
      img.src = url;
    };
    ed.addEventListener("paste", (e) => {
      e.preventDefault();
      const clip = e.clipboardData || window.clipboardData;
      const files = clip && clip.files;
      if (files && files[0] && /^image\//.test(files[0].type)) {
        shrinkImage(files[0], (src) => insertHtml('<p><img src="' + src + '" alt=""></p>'));
        return;
      }
      const text = (clip && (clip.getData("text/plain") || clip.getData("text"))) || "";
      insertHtml(textToHtml(text));
    });
    $$("[data-cmd]").forEach((b) => {
      b.onclick = () => {
        const c = b.dataset.cmd;
        if (c === "undo") run("undo");
        else if (c === "redo") run("redo");
        else if (c === "bold") run("bold");
        else if (c === "italic") run("italic");
        else if (c === "underline") run("underline");
        else if (c === "strike") run("strikeThrough");
        else if (c === "h2") run("formatBlock", "H2");
        else if (c === "h3") run("formatBlock", "H3");
        else if (c === "p") run("formatBlock", "P");
        else if (c === "quote") run("formatBlock", "BLOCKQUOTE");
        else if (c === "ul") run("insertUnorderedList");
        else if (c === "ol") run("insertOrderedList");
        else if (c === "left") run("justifyLeft");
        else if (c === "center") run("justifyCenter");
        else if (c === "right") run("justifyRight");
        else if (c === "justify") run("justifyFull");
        else if (c === "gap-") {
          edGap = Math.max(0.4, +(edGap - 0.15).toFixed(2));
          ed.style.setProperty("--ed-gap", edGap + "em");
        } else if (c === "gap+") {
          edGap = Math.min(2.2, +(edGap + 0.15).toFixed(2));
          ed.style.setProperty("--ed-gap", edGap + "em");
        }
        else if (c === "clear") run("removeFormat");
        else if (c === "link") {
          const sel = window.getSelection && window.getSelection();
          const hasText = sel && !sel.isCollapsed && ed.contains(sel.anchorNode) && ed.contains(sel.focusNode);
          if (!hasText) {
            toast("Hãy bôi đen đoạn chữ cần gắn liên kết.");
            focusEditor();
            return;
          }
          const u = prompt("URL liên kết");
          if (u) run("createLink", u);
        } else if (c === "img") {
          const inp = document.createElement("input");
          inp.type = "file";
          inp.accept = "image/*";
          inp.onchange = () => shrinkImage(inp.files[0], (src) => insertHtml('<p><img src="' + src + '" alt=""></p>'));
          inp.click();
        }
      };
    });
    $("#chForm").onsubmit = async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const at = fd.get("publish_at") ? new Date(fd.get("publish_at")).getTime() : null;
      const saveButton = e.target.querySelector('[type="submit"]');
      try {
        saveButton.disabled = true;
        saveButton.textContent = (e.target.elements.audio_file.files[0] || e.target.elements.audio_cover_file.files[0]) ? "Đang tải bản thu…" : "Đang lưu…";
        await VCBG.upsertChapter({
          id: ch ? ch.id : undefined,
          story_id: fd.get("story_id"),
          number: fd.get("number"),
          title: fd.get("title"),
          audio_title: fd.get("audio_title"),
          audio_file: e.target.elements.audio_file.files[0] || null,
          audio_cover_file: e.target.elements.audio_cover_file.files[0] || null,
          remove_audio: fd.get("remove_audio") === "on",
          remove_audio_cover: fd.get("remove_audio_cover") === "on",
          body: sanitize(applyParaGap(ed.innerHTML, edGap)),
          status: fd.get("status"),
          publish_at: at,
        });
        try {
          localStorage.removeItem(key);
        } catch (_) {}
        toast(fd.get("status") === "published" ? "Xuất bản thành công." : "Đã lưu chương.");
        go("/admin/chuong?story=" + fd.get("story_id"));
      } catch (err) {
        toast(err.message || "Không lưu được chương.");
      } finally {
        saveButton.disabled = false;
        saveButton.textContent = "Lưu chương";
      }
    };
  }

  let renderLock = Promise.resolve();
  async function render() {
    const mine = renderLock.then(runRender);
    renderLock = mine.catch(() => {});
    return mine;
  }
  function paintShell() {
    if (app().querySelector(".site-header")) return;
    app().innerHTML =
      header() +
      `<main class="wrap"><div class="empty" id="bootEmpty">Đang mở thư viện…<p><button type="button" class="btn btn-cyan" id="bootRetry">Thử lại</button></p></div></main>` +
      footer();
    bindChrome();
    const retry = $("#bootRetry");
    if (retry) retry.onclick = () => location.reload();
  }
  async function runRender() {
    paintShell();
    const watchdog = setTimeout(() => {
      const empty = $("#bootEmpty");
      if (empty && empty.isConnected) {
        empty.innerHTML =
          'Mạng chậm hoặc chưa tải xong.<p><button type="button" class="btn btn-cyan" id="bootRetry">Thử lại</button></p>';
        const retry = $("#bootRetry");
        if (retry) retry.onclick = () => location.reload();
      }
    }, 9000);
    try {
      await VCBG.init();
    } catch (e) {
      clearTimeout(watchdog);
      app().innerHTML =
        header() +
        `<div class="empty">Không khởi tạo được dữ liệu: ${esc(e.message)}<p><button type="button" class="btn btn-cyan" id="bootRetry">Thử lại</button></p></div>` +
        footer();
      bindChrome();
      const retry = $("#bootRetry");
      if (retry) retry.onclick = () => location.reload();
      return;
    }
    clearTimeout(watchdog);
    const route = parseHash();
    const pendingAuthReturn = authReturnSnapshot();
    if (route.name === "home" && VCBG.currentUser() && pendingAuthReturn) {
      await returnFromAuth(pendingAuthReturn.path);
      return;
    }
    window.scrollTo(0, 0);
    try {
      if (route.name === "home") pageHome();
      else if (route.name === "explore") pageExplore(route);
      else if (route.name === "story") pageStory(route);
      else if (route.name === "read") await pageRead(route);
      else if (route.name === "login") pageAuth("login");
      else if (route.name === "register") pageAuth("register");
      else if (route.name === "forgot") pageAuth("forgot");
      else if (route.name === "library") pageLibrary();
      else if (route.name === "account") pageAccount();
      else if (route.name === "notifs") pageNotifs();
      else if (route.name === "admin") await pageAdmin(route);
      else pageHome();
    } catch (err) {
      console.error("[VCBG render]", err);
      app().innerHTML =
        header() +
        `<div class="empty">Không mở được trang: ${esc(err.message || "lỗi không xác định.")}</div>` +
        footer();
      bindChrome();
    }
  }

  document.addEventListener("click", (e) => {
    const a = e.target.closest("a[href]");
    if (!a) return;
    const href = a.getAttribute("href") || "";
    if (href.startsWith("#/dang-nhap")) {
      e.preventDefault();
      const raw = href.slice(1);
      const query = raw.split("?")[1] || "";
      const next = new URLSearchParams(query).get("next") || "";
      goToLogin(next);
      return;
    }
    if (href.startsWith("#/")) {
      e.preventDefault();
      go(href);
    }
  });
  window.addEventListener("hashchange", () => {
    if (navigating) return;
    currentPath = readLocationPath();
    render();
  });
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
  async function boot() {
    await render();
    if (VCBG.whenReady) {
      VCBG.whenReady()
        .then(() => render())
        .catch(() => {});
    }
  }
})();
