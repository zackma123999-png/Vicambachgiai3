(function () {
  const status = document.getElementById("adminAccessStatus"); const button = document.getElementById("adminAccessLogin"); const cfg = window.VCBG_CONFIG || {};
  if (!window.supabase || !cfg.supabaseUrl || !cfg.supabaseAnonKey) { status.textContent = "Không tải được hệ thống đăng nhập."; button.disabled = true; return; }
  const client = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey);
  async function establishBypass() {
    status.textContent = "Đang xác minh quyền quản trị…";
    const params = new URLSearchParams(location.search); const code = params.get("code");
    if (code) { const exchanged = await client.auth.exchangeCodeForSession(code); if (exchanged.error) throw exchanged.error; history.replaceState(null, "", "/admin-access.html"); }
    const sessionResult = await client.auth.getSession(); if (sessionResult.error) throw sessionResult.error;
    const token = sessionResult.data && sessionResult.data.session && sessionResult.data.session.access_token;
    if (!token) { status.textContent = ""; return false; }
    const response = await fetch("/api/site-mode", { method: "POST", headers: { "content-type": "application/json", authorization: "Bearer " + token }, body: JSON.stringify({ action: "session" }) });
    const result = await response.json().catch(function () { return {}; }); if (!response.ok) throw new Error(result.error || "Tài khoản này không có quyền quản trị.");
    status.textContent = "Đã xác minh. Đang mở bảng điều khiển…"; location.replace("/#/admin/van-hanh"); return true;
  }
  button.addEventListener("click", async function () {
    button.disabled = true; status.textContent = "Đang mở Google…";
    const result = await client.auth.signInWithOAuth({ provider: "google", options: { redirectTo: location.origin + "/admin-access.html", queryParams: { prompt: "select_account" } } });
    if (result.error) { status.textContent = result.error.message || "Không mở được Google."; button.disabled = false; }
  });
  establishBypass().catch(function (error) { status.textContent = error.message || "Không xác minh được quyền quản trị."; button.disabled = false; });
})();