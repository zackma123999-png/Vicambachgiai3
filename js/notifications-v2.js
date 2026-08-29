/* ViCamBachGiai — realtime notification center v3. */
(function () {
  let sb = null;
  let userId = "";
  let items = [];
  let realtimeChannel = null;
  let busy = false;
  let filter = "all";

  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[c]);

  function client() {
    if (sb) return sb;
    const cfg = window.VCBG_CONFIG || {};
    if (!window.supabase || !cfg.supabaseUrl || !cfg.supabaseAnonKey) return null;
    sb = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
    });
    return sb;
  }

  function kind(type) {
    if (["new_story", "new_chapter", "saved_chapter", "chapter_edit"].includes(type)) return "story";
    if (["comment_reply", "mention", "new_comment", "comment_report", "comment_moderation"].includes(type)) return "comment";
    return "system";
  }

  function icon(type) {
    if (type === "new_story") return "✦";
    if (type === "new_chapter" || type === "saved_chapter") return "▤";
    if (type === "chapter_edit") return "✎";
    if (type === "comment_reply") return "↩";
    if (type === "mention") return "@";
    if (type === "new_comment") return "◌";
    if (type === "comment_report") return "⚑";
    if (type === "comment_moderation") return "!";
    return "◆";
  }

  function relative(ts) {
    const d = new Date(ts || Date.now());
    const diff = Math.max(0, Date.now() - d.getTime());
    if (diff < 60000) return "Vừa xong";
    if (diff < 3600000) return Math.floor(diff / 60000) + " phút trước";
    if (diff < 86400000) return Math.floor(diff / 3600000) + " giờ trước";
    if (diff < 604800000) return Math.floor(diff / 86400000) + " ngày trước";
    return d.toLocaleDateString("vi-VN");
  }

  function unreadCount() {
    return items.filter((n) => !n.read).length;
  }

  function bellSvg() {
    return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/></svg>';
  }

  function renderBell() {
    const a = $('a[href="#/thong-bao"]');
    if (!a) return;
    const count = unreadCount();
    a.classList.add("vc-notification-bell");
    a.setAttribute("aria-label", count ? count + " thông báo chưa đọc" : "Thông báo");
    a.setAttribute("aria-haspopup", "dialog");
    a.setAttribute("aria-expanded", $("#vcNotifPopover") ? "true" : "false");
    a.innerHTML = bellSvg() + (count ? '<span class="vc-notification-badge">' + (count > 99 ? "99+" : count) + "</span>" : "");
    if (a.dataset.vcBound) return;
    a.dataset.vcBound = "1";
    a.addEventListener("click", function (event) {
      event.preventDefault();
      event.stopPropagation();
      togglePopover(a);
    });
  }

  function itemHtml(n, compact) {
    const cls = "vc-notif-card vc-kind-" + kind(n.notification_type) + (!n.read ? " is-unread" : "") + (compact ? " is-compact" : "");
    return '<article class="' + cls + '" data-notif-id="' + esc(n.id) + '">' +
      '<span class="vc-notif-icon" aria-hidden="true">' + esc(icon(n.notification_type)) + '</span>' +
      '<a class="vc-notif-copy" href="' + esc(n.href || "#/") + '" data-notif-open="' + esc(n.id) + '">' +
        '<span class="vc-notif-line"><b>' + esc(n.title || "Thông báo") + '</b>' + (!n.read ? '<i class="vc-notif-new">Mới</i>' : "") + '</span>' +
        '<p>' + esc(n.body || "") + '</p>' +
        '<time datetime="' + esc(n.created_at || "") + '">' + esc(relative(n.created_at)) + '</time>' +
      '</a>' +
      (compact ? "" : '<button type="button" class="vc-notif-delete" data-notif-delete="' + esc(n.id) + '" aria-label="Xóa thông báo">×</button>') +
    '</article>';
  }

  function closePopover() {
    const pop = $("#vcNotifPopover");
    if (pop) pop.remove();
    const bell = $(".vc-notification-bell");
    if (bell) bell.setAttribute("aria-expanded", "false");
  }

  function togglePopover(anchor) {
    if ($("#vcNotifPopover")) {
      closePopover();
      return;
    }
    const pop = document.createElement("section");
    pop.id = "vcNotifPopover";
    pop.className = "vc-notif-popover";
    pop.setAttribute("role", "dialog");
    pop.setAttribute("aria-label", "Thông báo gần đây");
    const recent = items.slice(0, 5);
    pop.innerHTML = '<header><div><small>TRUNG TÂM TÍN HIỆU</small><h3>Thông báo</h3></div>' +
      (unreadCount() ? '<button type="button" data-notif-read-all>Đánh dấu đã đọc</button>' : "") + '</header>' +
      '<div class="vc-notif-pop-list">' + (recent.length ? recent.map((n) => itemHtml(n, true)).join("") : '<div class="vc-notif-empty"><span>◇</span><b>Chưa có thông báo</b><p>Các cập nhật mới sẽ xuất hiện tại đây.</p></div>') + '</div>' +
      '<a class="vc-notif-view-all" href="#/thong-bao">Xem tất cả thông báo <span>→</span></a>';
    document.body.appendChild(pop);
    anchor.setAttribute("aria-expanded", "true");
    const rect = anchor.getBoundingClientRect();
    pop.style.setProperty("--bell-right", Math.max(12, window.innerWidth - rect.right) + "px");
    bindActions(pop);
  }

  function filteredItems() {
    if (filter === "unread") return items.filter((n) => !n.read);
    if (filter === "story") return items.filter((n) => kind(n.notification_type) === "story");
    if (filter === "comment") return items.filter((n) => kind(n.notification_type) === "comment");
    return items;
  }

  function renderCenter() {
    const host = $("#vcNotificationCenter");
    if (!host) return;
    const shown = filteredItems();
    host.innerHTML = '<section class="vc-notif-hero">' +
      '<div class="vc-notif-hero-icon">' + bellSvg() + (unreadCount() ? '<span>' + unreadCount() + '</span>' : "") + '</div>' +
      '<div><small>TRUNG TÂM TÍN HIỆU</small><h1>Thông báo</h1><p>' + (unreadCount() ? 'Bạn có ' + unreadCount() + ' thông báo chưa đọc.' : 'Bạn đã xem hết các cập nhật mới.') + '</p></div>' +
      '<div class="vc-notif-hero-actions">' +
        (unreadCount() ? '<button type="button" class="btn btn-ghost" data-notif-read-all>Đánh dấu tất cả đã đọc</button>' : "") +
        (items.length ? '<button type="button" class="btn btn-ghost" data-notif-clear>Xóa tất cả</button>' : "") +
      '</div></section>' +
      '<nav class="vc-notif-filters" aria-label="Lọc thông báo">' +
        [['all','Tất cả'],['unread','Chưa đọc'],['story','Truyện'],['comment','Bình luận']].map((x) => '<button type="button" data-notif-filter="' + x[0] + '" class="' + (filter === x[0] ? 'on' : '') + '">' + x[1] + '</button>').join("") +
      '</nav>' +
      '<div class="vc-notif-list">' + (shown.length ? shown.map((n) => itemHtml(n, false)).join("") : '<div class="vc-notif-empty"><span>◇</span><b>Không có thông báo phù hợp</b><p>Hãy thử chọn một nhóm khác.</p></div>') + '</div>';
    bindActions(host);
  }

  async function markOne(id) {
    const n = items.find((x) => x.id === id);
    if (!n || n.read) return;
    n.read = true;
    renderBell(); renderCenter();
    const out = await client().from("notifications").update({ read: true }).eq("id", id);
    if (out.error) refresh();
  }

  async function markAll() {
    if (!userId) return;
    items.forEach((n) => { n.read = true; });
    closePopover(); renderBell(); renderCenter();
    const out = await client().from("notifications").update({ read: true }).eq("user_id", userId).eq("read", false);
    if (out.error) refresh();
  }

  async function removeOne(id) {
    const out = await client().from("notifications").delete().eq("id", id);
    if (!out.error) {
      items = items.filter((n) => n.id !== id);
      closePopover(); renderBell(); renderCenter();
    }
  }

  async function clearAll() {
    if (!userId || !confirm("Xóa toàn bộ thông báo?")) return;
    const out = await client().from("notifications").delete().eq("user_id", userId);
    if (!out.error) {
      items = []; closePopover(); renderBell(); renderCenter();
    }
  }

  function bindActions(root) {
    $$('[data-notif-open]', root).forEach((a) => a.addEventListener("click", () => markOne(a.dataset.notifOpen)));
    $$('[data-notif-delete]', root).forEach((b) => b.addEventListener("click", () => removeOne(b.dataset.notifDelete)));
    $$('[data-notif-read-all]', root).forEach((b) => b.addEventListener("click", markAll));
    $$('[data-notif-clear]', root).forEach((b) => b.addEventListener("click", clearAll));
    $$('[data-notif-filter]', root).forEach((b) => b.addEventListener("click", () => { filter = b.dataset.notifFilter; renderCenter(); }));
  }

  async function refresh() {
    const api = client();
    if (!api) return;
    const session = await api.auth.getSession();
    const nextId = session.data && session.data.session && session.data.session.user && session.data.session.user.id;
    if (!nextId) {
      userId = ""; items = []; closePopover(); renderBell(); renderCenter(); unsubscribe();
      return;
    }
    if (nextId !== userId) {
      userId = nextId;
      subscribe();
    }
    const out = await api.from("notifications").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(100);
    if (!out.error) items = out.data || [];
    renderBell(); renderCenter();
  }

  function unsubscribe() {
    if (realtimeChannel && sb) sb.removeChannel(realtimeChannel);
    realtimeChannel = null;
  }

  function subscribe() {
    unsubscribe();
    if (!userId || !client()) return;
    realtimeChannel = client().channel("vc-notifications-" + userId)
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications", filter: "user_id=eq." + userId }, () => refresh())
      .subscribe();
  }

  function adminNav() {
    const nav = $(".admin-nav");
    if (!nav || nav.querySelector('[href="#/admin/thong-bao"]')) return;
    const a = document.createElement("a");
    a.href = "#/admin/thong-bao"; a.textContent = "Thông báo";
    const inbox = nav.querySelector('[href="#/admin/hop-thu"]');
    inbox ? nav.insertBefore(a, inbox) : nav.appendChild(a);
  }

  function adminPage() {
    if (!/^#\/admin\/thong-bao(?:\?|$)/.test(location.hash) || !window.VCBG || !VCBG.isAdmin()) return;
    const host = $(".admin-shell>div");
    if (!host || host.querySelector("#vcAdminNotif")) return;
    $$(".admin-nav a").forEach((a) => a.classList.toggle("on", a.getAttribute("href") === "#/admin/thong-bao"));
    const users = VCBG.adminUsers ? VCBG.adminUsers() : [];
    const stories = VCBG.adminListStories ? VCBG.adminListStories() : [];
    host.innerHTML = '<section class="vc-admin-notification" id="vcAdminNotif"><h1>Gửi thông báo</h1><p class="sub">Gửi thông báo thủ công đến tất cả thành viên, một thành viên hoặc độc giả theo dõi một truyện.</p><form>' +
      '<div class="field"><label>Người nhận</label><select name="audience"><option value="all">Tất cả thành viên và Admin</option><option value="user">Một thành viên</option><option value="story">Người theo dõi một truyện</option></select></div>' +
      '<div class="field vc-target-user" hidden><label>Thành viên</label><select name="user_id">' + users.map((u) => '<option value="' + esc(u.id) + '">' + esc(u.profile.display_name) + ' · ' + esc(u.email) + '</option>').join("") + '</select></div>' +
      '<div class="field vc-target-story" hidden><label>Truyện</label><select name="story_id">' + stories.map((s) => '<option value="' + esc(s.id) + '">' + esc(s.title) + '</option>').join("") + '</select></div>' +
      '<div class="field"><label>Tiêu đề</label><input name="title" maxlength="100" required></div><div class="field"><label>Nội dung</label><textarea name="body" maxlength="500" required></textarea></div>' +
      '<div class="field"><label>Đường dẫn khi bấm</label><input name="href" placeholder="#/truyen/..."></div><button class="btn btn-primary" type="submit">Gửi thông báo</button></form></section>';
    const form = $("form", host), audience = form.audience;
    const toggle = () => { $(".vc-target-user", form).hidden = audience.value !== "user"; $(".vc-target-story", form).hidden = audience.value !== "story"; };
    audience.onchange = toggle; toggle();
    form.onsubmit = async (e) => {
      e.preventDefault();
      const btn = $('button[type="submit"]', form); btn.disabled = true;
      try {
        const fd = new FormData(form), aud = fd.get("audience");
        let ids = [];
        if (aud === "user") ids = [fd.get("user_id")];
        else if (aud === "story") {
          const q = await client().from("follows").select("user_id").eq("story_id", fd.get("story_id"));
          if (q.error) throw q.error;
          ids = (q.data || []).map((x) => x.user_id);
        } else ids = users.filter((u) => u.status === "active").map((u) => u.id);
        ids = Array.from(new Set(ids.filter(Boolean)));
        if (!ids.length) throw new Error("Không có thành viên phù hợp.");
        const rows = ids.map((user_id) => ({
          id: crypto.randomUUID(), user_id, notification_type: "manual",
          title: String(fd.get("title") || "").trim(), body: String(fd.get("body") || "").trim(),
          href: String(fd.get("href") || "#/").trim() || "#/", read: false
        }));
        const out = await client().from("notifications").insert(rows);
        if (out.error) throw out.error;
        if (window.toast) toast("Đã gửi đến " + rows.length + " tài khoản.");
        form.reset(); toggle();
      } catch (err) {
        if (window.toast) toast(err.message || "Không gửi được thông báo.");
      } finally { btn.disabled = false; }
    };
  }

  function bindReportButtons() {
    $$('[data-report-comment]:not([data-report-bound])').forEach((b) => {
      b.dataset.reportBound = "1";
      b.addEventListener("click", (event) => {
        event.preventDefault(); event.stopPropagation();
        if (!window.VCBG || !VCBG.currentUser()) {
          location.hash = "#/dang-nhap"; return;
        }
        const reason = prompt("Lý do báo cáo bình luận:");
        if (!reason || !reason.trim()) return;
        try {
          VCBG.sendInbox({ type: "report", body: "Báo cáo " + b.dataset.reportComment + ": " + reason.trim(), story: b.dataset.storyTitle || "Bình luận" });
          if (window.toast) toast("Đã gửi báo cáo đến quản trị viên.");
        } catch (err) {
          if (window.toast) toast(err.message || "Không gửi được báo cáo.");
        }
      });
    });
  }

  function run() {
    if (busy) return;
    busy = true;
    requestAnimationFrame(() => {
      busy = false;
      renderBell(); renderCenter(); adminNav(); adminPage(); bindReportButtons();
    });
  }

  document.addEventListener("click", (e) => {
    if (!e.target.closest("#vcNotifPopover") && !e.target.closest(".vc-notification-bell")) closePopover();
  });
  window.addEventListener("resize", closePopover);
  window.addEventListener("hashchange", () => { closePopover(); setTimeout(run, 40); });
  new MutationObserver(run).observe(document.documentElement, { childList: true, subtree: true });
  window.addEventListener("load", () => { run(); refresh(); });
  setTimeout(() => { run(); refresh(); }, 100);
  setInterval(refresh, 60000);
})();
