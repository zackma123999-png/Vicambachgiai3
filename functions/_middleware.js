const SUPABASE_URL = "https://isawawkxjbnlbuxlhlnk.supabase.co";
const FALLBACK_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJIUzI1NiIsInJlZiI6ImlzYXdhd2t4amJubGJ1eGxobG5rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY4OTQ0NzAsImV4cCI6MjEwMjQ3MDQ3MH0.QfFRAyBOKnpy9fjvv5UKv1EgvMDh5LJTKoo36Da8ZAc";
let cached = null; let cachedAt = 0;
const config = (env) => ({ url: env.SUPABASE_URL || SUPABASE_URL, key: env.SUPABASE_ANON_KEY || FALLBACK_KEY });
function cookieValue(request, name) { const source = request.headers.get("cookie") || ""; const match = source.match(new RegExp("(?:^|;\\s*)" + name + "=([^;]*)")); return match ? decodeURIComponent(match[1]) : ""; }
function escapeHtml(value) { return String(value || "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]); }
async function currentMode(env) {
  if (String(env.EMERGENCY_LOCK || "").toLowerCase() === "true") return { site_mode: "locked", maintenance_message: env.EMERGENCY_MESSAGE || "Website đang được khóa khẩn cấp để bảo vệ dữ liệu.", maintenance_until: null };
  if (cached && Date.now() - cachedAt < 10000) return cached;
  const { url, key } = config(env);
  const response = await fetch(url + "/rest/v1/site_settings?select=site_mode,maintenance_message,maintenance_until&id=eq.1&limit=1", { headers: { apikey: key, authorization: "Bearer " + key, "cache-control": "no-cache" } });
  if (!response.ok) throw new Error("STATUS_UNAVAILABLE");
  const rows = await response.json(); cached = rows[0] || { site_mode: "normal" }; cachedAt = Date.now(); return cached;
}
async function isAdminRequest(request, env) {
  const token = cookieValue(request, "vcbg_admin_session"); if (!token) return false;
  const { url, key } = config(env); const headers = { apikey: key, authorization: "Bearer " + token };
  const userRes = await fetch(url + "/auth/v1/user", { headers }); if (!userRes.ok) return false;
  const user = await userRes.json();
  const profileRes = await fetch(url + "/rest/v1/profiles?select=role,status&user_id=eq." + encodeURIComponent(user.id) + "&limit=1", { headers });
  if (!profileRes.ok) return false; const profiles = await profileRes.json();
  return !!(profiles[0] && profiles[0].role === "admin" && profiles[0].status === "active");
}
function maintenancePage(settings, unavailable) {
  const locked = settings.site_mode === "locked";
  const title = unavailable ? "Thư viện tạm gián đoạn" : locked ? "Website đang được bảo vệ" : "ViCamBachGiai đang bảo trì";
  const message = unavailable ? "Hệ thống dữ liệu đang tạm thời không phản hồi. Chúng tôi đang kiểm tra và sẽ sớm hoạt động trở lại." : settings.maintenance_message || "Thư viện đang được chăm sóc và sẽ sớm hoạt động trở lại.";
  let until = "";
  if (settings.maintenance_until) { const date = new Date(settings.maintenance_until); if (!Number.isNaN(date.getTime())) until = '<p class="until">Dự kiến mở lại: <b>' + escapeHtml(new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeStyle: "short", timeZone: "Asia/Tokyo" }).format(date)) + " (giờ Nhật)</b></p>"; }
  return `<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(title)} — ViCamBachGiai</title><meta name="robots" content="noindex,nofollow"><style>*{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;padding:22px;background:radial-gradient(circle at 50% 15%,#17102f 0,#080d18 40%,#030711 100%);color:#f2f0f8;font-family:system-ui,-apple-system,"Segoe UI",sans-serif}.card{width:min(100%,620px);padding:34px 26px;text-align:center;border-radius:30px;border:1px solid rgba(189,159,255,.32);background:linear-gradient(145deg,rgba(23,33,55,.96),rgba(7,13,25,.98));box-shadow:0 28px 90px #0009,0 0 55px rgba(132,82,226,.14)}.mark{width:82px;height:82px;object-fit:contain;filter:drop-shadow(0 0 18px rgba(153,105,255,.35))}.eyebrow{margin:18px 0 6px;color:#c3aaef;letter-spacing:.2em;font-size:12px;font-weight:800}h1{font-family:Georgia,serif;font-size:clamp(30px,7vw,48px);font-weight:500;margin:8px 0 15px}.message{max-width:490px;margin:0 auto;color:#b8c0d1;line-height:1.75;font-size:16px}.until{display:inline-block;margin:22px 0 0;padding:10px 16px;border:1px solid rgba(190,160,255,.25);border-radius:999px;color:#cbbaf2;background:rgba(117,78,193,.12)}.pulse{display:flex;justify-content:center;gap:7px;margin:25px 0}.pulse i{width:7px;height:7px;border-radius:50%;background:#aa84ef;animation:p 1.4s infinite ease-in-out}.pulse i:nth-child(2){animation-delay:.18s}.pulse i:nth-child(3){animation-delay:.36s}@keyframes p{0%,80%,100%{opacity:.25;transform:scale(.75)}40%{opacity:1;transform:scale(1.15)}}.admin{display:inline-block;margin-top:24px;color:#71809b;font-size:12px;text-decoration:none}.admin:hover{color:#bda6ee}</style></head><body><main class="card"><img class="mark" src="/brand/mark.png" alt=""><p class="eyebrow">THƯ VIỆN BÁCH HỢP</p><h1>${escapeHtml(title)}</h1><p class="message">${escapeHtml(message)}</p>${until}<div class="pulse" aria-label="Đang xử lý"><i></i><i></i><i></i></div><a class="admin" href="/admin-access.html">Đăng nhập quản trị</a></main></body></html>`;
}
function isPublicBypass(pathname) { return pathname === "/admin-access.html" || pathname === "/api/site-mode" || pathname === "/js/config.js" || pathname === "/styles/admin-site-mode.css" || pathname.startsWith("/brand/"); }
export async function onRequest(context) {
  const url = new URL(context.request.url);
  if (isPublicBypass(url.pathname)) return context.next();
  const destination = context.request.headers.get("sec-fetch-dest") || "";
  const looksLikeAsset = /\.[a-z0-9]{2,8}$/i.test(url.pathname) && !/\.html?$/i.test(url.pathname);
  if ((destination && destination !== "document") || looksLikeAsset) return context.next();
  let settings;
  try { settings = await currentMode(context.env); }
  catch (_) { return new Response(maintenancePage({ site_mode: "maintenance" }, true), { status: 503, headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store", "retry-after": "120" } }); }
  if (settings.site_mode !== "maintenance" && settings.site_mode !== "locked") return context.next();
  if (await isAdminRequest(context.request, context.env)) return context.next();
  return new Response(maintenancePage(settings, false), { status: 503, headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store", "retry-after": "300" } });
}
