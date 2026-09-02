const SUPABASE_URL = "https://isawawkxjbnlbuxlhlnk.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJIUzI1NiIsInJlZiI6ImlzYXdhd2t4amJubGJ1eGxobG5rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY4OTQ0NzAsImV4cCI6MjEwMjQ3MDQ3MH0.QfFRAyBOKnpy9fjvv5UKv1EgvMDh5LJTKoo36Da8ZAc";
const config = (env) => ({ url: env.SUPABASE_URL || SUPABASE_URL, key: env.SUPABASE_ANON_KEY || SUPABASE_ANON_KEY });
const json = (body, status = 200, extraHeaders = {}) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...extraHeaders } });
function sameOrigin(request) { const origin = request.headers.get("origin"); return !origin || origin === new URL(request.url).origin; }
async function requireAdmin(request, env) {
  const auth = request.headers.get("authorization") || "";
  if (!auth.startsWith("Bearer ")) throw Object.assign(new Error("UNAUTHORIZED"), { code: 401 });
  const { url, key } = config(env); const headers = { apikey: key, authorization: auth };
  const userRes = await fetch(url + "/auth/v1/user", { headers });
  if (!userRes.ok) throw Object.assign(new Error("UNAUTHORIZED"), { code: 401 });
  const user = await userRes.json();
  const profileRes = await fetch(url + "/rest/v1/profiles?select=role,status&user_id=eq." + encodeURIComponent(user.id) + "&limit=1", { headers });
  if (!profileRes.ok) throw Object.assign(new Error("FORBIDDEN"), { code: 403 });
  const profiles = await profileRes.json(); const profile = profiles && profiles[0];
  if (!profile || profile.role !== "admin" || profile.status !== "active") throw Object.assign(new Error("FORBIDDEN"), { code: 403 });
  return { user, auth, headers, token: auth.slice(7) };
}
async function readSettings(env, authHeaders) {
  const { url, key } = config(env); const headers = authHeaders || { apikey: key, authorization: "Bearer " + key };
  const response = await fetch(url + "/rest/v1/site_settings?select=site_mode,maintenance_message,maintenance_until,mode_updated_at&id=eq.1&limit=1", { headers });
  if (!response.ok) throw new Error("Không đọc được trạng thái website.");
  const rows = await response.json(); return rows[0] || { site_mode: "normal" };
}
export async function onRequestGet(context) {
  try { return json({ settings: await readSettings(context.env) }); }
  catch (error) { return json({ error: error.message || "Không đọc được trạng thái website." }, 503); }
}
export async function onRequestPost(context) {
  if (!sameOrigin(context.request)) return json({ error: "Yêu cầu không hợp lệ." }, 403);
  try {
    const admin = await requireAdmin(context.request, context.env);
    const body = await context.request.json().catch(() => ({})); let settings;
    if (body.action === "session") {
      settings = await readSettings(context.env, admin.headers);
    } else {
      const allowed = new Set(["normal", "read_only", "maintenance", "locked"]); const mode = String(body.mode || "");
      if (!allowed.has(mode)) return json({ error: "Chế độ website không hợp lệ." }, 400);
      const message = String(body.message || "").trim().slice(0, 500) || "Thư viện đang được chăm sóc và sẽ sớm hoạt động trở lại.";
      let until = null;
      if (body.until) { const date = new Date(body.until); if (Number.isNaN(date.getTime())) return json({ error: "Thời gian mở lại không hợp lệ." }, 400); until = date.toISOString(); }
      const { url } = config(context.env);
      const response = await fetch(url + "/rest/v1/site_settings?id=eq.1", { method: "PATCH", headers: { ...admin.headers, "content-type": "application/json", prefer: "return=representation" }, body: JSON.stringify({ site_mode: mode, maintenance_message: message, maintenance_until: until, mode_updated_at: new Date().toISOString(), mode_updated_by: admin.user.id }) });
      if (!response.ok) { const detail = await response.text(); console.error("[site-mode update]", response.status, detail.slice(0, 240)); return json({ error: "Không lưu được trạng thái website." }, 502); }
      const rows = await response.json(); settings = rows[0] || await readSettings(context.env, admin.headers);
    }
    const cookie = "vcbg_admin_session=" + encodeURIComponent(admin.token) + "; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=3600";
    return json({ success: true, settings }, 200, { "set-cookie": cookie });
  } catch (error) {
    const status = error.code === 401 ? 401 : error.code === 403 ? 403 : 500;
    const message = status === 401 ? "Phiên đăng nhập đã hết." : status === 403 ? "Chỉ quản trị viên được đổi trạng thái website." : "Không cập nhật được trạng thái website.";
    return json({ error: message }, status);
  }
}
