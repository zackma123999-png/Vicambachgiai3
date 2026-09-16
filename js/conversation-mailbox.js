/* ViCamBachGiai — private member/admin mailbox. */
(function () {
  let channel = null;
  let painting = false;
  const $ = (s, r) => (r || document).querySelector(s);
  const esc = (v) => String(v == null ? "" : v).replace(/[&<>"']/g, (c) => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" })[c]);
  const api = () => window.VCBG && VCBG.supabaseClient && VCBG.supabaseClient();
  const current = () => window.VCBG && VCBG.currentUser && VCBG.currentUser();
  const isAdmin = () => !!(window.VCBG && VCBG.isAdmin && VCBG.isAdmin());
  const params = () => new URLSearchParams((location.hash.split("?")[1] || "").replace(/#.*$/, ""));
  const date = (v) => new Date(v).toLocaleString("vi-VN", { dateStyle:"short", timeStyle:"short" });
  const mailboxRoute = () => /^#\/(?:hop-thu|admin\/hop-thu)(?:\?|$)/.test(location.hash);

  function toast(message) {
    if (typeof window.toast === "function") return window.toast(message);
    const wrap = $("#toasts");
    if (!wrap) return;
    const node = document.createElement("div"); node.className = "toast"; node.textContent = message;
    wrap.appendChild(node); setTimeout(() => node.remove(), 3000);
  }

  async function loadThreads() {
    const sb = api();
    const query = sb.from("conversation_threads")
      .select("id,member_id,subject,status,created_at,updated_at,profiles!conversation_threads_member_id_fkey(display_name,email,avatar)")
      .order("updated_at", { ascending:false });
    const out = await query;
    if (out.error) throw out.error;
    return out.data || [];
  }

  async function loadMessages(threadId) {
    const out = await api().from("conversation_messages").select("id,thread_id,sender_id,body,created_at").eq("thread_id", threadId).order("created_at", { ascending:true });
    if (out.error) throw out.error;
    return out.data || [];
  }

  async function openNewThread() {
    const user = current();
    if (!user) return;
    const subject = prompt("Chủ đề tin nhắn:", "Tin nhắn gửi quản trị viên");
    if (!subject || !subject.trim()) return;
    const out = await api().from("conversation_threads").insert({ member_id:user.id, created_by:user.id, subject:subject.trim().slice(0,120) }).select("id").single();
    if (out.error) throw out.error;
    location.hash = "#/hop-thu?thread=" + out.data.id;
  }

  async function sendMessage(threadId, body, button) {
    body = String(body || "").trim();
    if (!body) return;
    button.disabled = true;
    const out = await api().from("conversation_messages").insert({ thread_id:threadId, sender_id:current().id, body });
    button.disabled = false;
    if (out.error) throw out.error;
    await paint(true);
  }

  function subscribe(threadId) {
    if (channel && api()) api().removeChannel(channel);
    channel = null;
    if (!threadId || !api()) return;
    channel = api().channel("vc-mailbox-" + threadId)
      .on("postgres_changes", { event:"INSERT", schema:"public", table:"conversation_messages", filter:"thread_id=eq." + threadId }, () => paint(true))
      .subscribe();
  }

  async function paint(force) {
    if (painting || !mailboxRoute() || !current() || !api()) return;
    const host = $(isAdmin() && /^#\/admin\/hop-thu/.test(location.hash) ? "#vcAdminMailbox" : "#vcMailbox");
    if (!host) return;
    const paintKey = location.hash + ":" + current().id;
    if (!force && host.dataset.mailReady === paintKey) return;
    painting = true;
    try {
      const threads = await loadThreads();
      let activeId = params().get("thread") || (threads[0] && threads[0].id) || "";
      if (activeId && !threads.some((t) => t.id === activeId)) activeId = threads[0] ? threads[0].id : "";
      const active = threads.find((t) => t.id === activeId);
      const messages = active ? await loadMessages(active.id) : [];
      const adminView = isAdmin() && /^#\/admin\/hop-thu/.test(location.hash);
      host.innerHTML = '<div class="vc-mail-head"><div><small>TRAO ĐỔI RIÊNG</small><h1>Hộp thư</h1></div>' +
        (!adminView ? '<button type="button" class="btn btn-primary" data-mail-new>Soạn tin mới</button>' : '') + '</div>' +
        '<div class="vc-mail-layout"><aside class="vc-mail-threads">' +
          (threads.length ? threads.map((t) => {
            const p = t.profiles || {};
            return '<a href="' + (adminView ? '#/admin/hop-thu' : '#/hop-thu') + '?thread=' + esc(t.id) + '" class="vc-mail-thread ' + (t.id === activeId ? 'on' : '') + '">' +
              '<b>' + esc(adminView ? (p.display_name || p.email || "Thành viên") : t.subject) + '</b>' +
              '<span>' + esc(adminView ? t.subject : "Trao đổi với quản trị viên") + '</span><time>' + esc(date(t.updated_at)) + '</time></a>';
          }).join('') : '<div class="vc-mail-empty">Chưa có cuộc trò chuyện.</div>') + '</aside>' +
          '<section class="vc-mail-conversation">' + (active ?
            '<header><div><b>' + esc(active.subject) + '</b><span>' + esc(adminView ? ((active.profiles && (active.profiles.display_name || active.profiles.email)) || "Thành viên") : "Quản trị viên ViCamBachGiai") + '</span></div></header>' +
            '<div class="vc-mail-messages">' + (messages.length ? messages.map((m) => '<article class="vc-mail-message ' + (m.sender_id === current().id ? 'mine' : '') + '"><p>' + esc(m.body) + '</p><time>' + esc(date(m.created_at)) + '</time></article>').join('') : '<div class="vc-mail-empty">Hãy gửi tin nhắn đầu tiên.</div>') + '</div>' +
            (active.status === 'open' ? '<form class="vc-mail-compose"><textarea name="body" maxlength="2000" required placeholder="Viết nội dung trả lời…"></textarea><button class="btn btn-primary" type="submit">Gửi</button></form>' : '<p class="vc-mail-closed">Cuộc trò chuyện đã đóng.</p>')
            : '<div class="vc-mail-empty vc-mail-welcome">' + (adminView ? 'Chưa có thư cần trả lời.' : 'Chọn “Soạn tin mới” để gửi tin cho quản trị viên.') + '</div>') + '</section></div>';
      const newBtn = $('[data-mail-new]', host);
      if (newBtn) newBtn.onclick = () => openNewThread().catch((e) => toast(e.message || "Không tạo được cuộc trò chuyện."));
      const form = $('.vc-mail-compose', host);
      if (form) form.onsubmit = (event) => { event.preventDefault(); sendMessage(active.id, new FormData(form).get('body'), $('button', form)).catch((e) => toast(e.message || "Không gửi được tin nhắn.")); };
      const list = $('.vc-mail-messages', host); if (list) list.scrollTop = list.scrollHeight;
      host.dataset.mailReady = paintKey;
      subscribe(activeId);
    } catch (error) {
      host.innerHTML = '<div class="vc-notif-empty"><span>!</span><b>Không mở được hộp thư</b><p>' + esc(error.message || "Vui lòng thử lại.") + '</p></div>';
    } finally { painting = false; }
  }

  function schedule() { setTimeout(paint, 30); }
  window.addEventListener("hashchange", schedule);
  window.addEventListener("load", schedule);
  new MutationObserver(() => { if (mailboxRoute() && ($("#vcMailbox") || $("#vcAdminMailbox"))) schedule(); }).observe(document.documentElement, { childList:true, subtree:true });
})();
