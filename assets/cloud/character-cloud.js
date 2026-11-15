(() => {
  "use strict";
  const API = "/api/dashboard";
  let dashboard = null;
  let syncTimer = null;
  let syncInFlight = false;
  let syncAgain = false;
  let cloudReadOnly = false;
  let readOnlyObserver = null;
  const guestMode = new URLSearchParams(location.search).get("guest") === "1";

  async function request(method = "GET", body, url = API) {
    const response = await fetch(url, {
      method,
      cache: "no-store",
      credentials: "same-origin",
      headers: body ? { "content-type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) throw new Error("cloud-unavailable");
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "雲端操作失敗");
    return data;
  }

  function reportEvent(category, error, context = {}) {
    const message = String(error?.message || error || "未知錯誤").slice(0, 300);
    const throttleKey = `dnd5r:event:${category}`;
    try {
      const last = Number(sessionStorage.getItem(throttleKey) || 0);
      if (Date.now() - last < 5 * 60 * 1000) return;
      sessionStorage.setItem(throttleKey, String(Date.now()));
    } catch (_) {}
    fetch("/api/events", { method: "POST", credentials: "same-origin", headers: { "content-type": "application/json" },
      body: JSON.stringify({ category, severity: "error", message, context }) }).catch(() => {});
  }

  function cloudKey() { return S?.id ? `dnd5r:cloud:${S.id}` : ""; }
  function currentCloudId() { try { return localStorage.getItem(cloudKey()) || ""; } catch (_) { return ""; } }
  function rememberCloudId(id) { try { if (cloudKey() && id) localStorage.setItem(cloudKey(), id); } catch (_) {} }
  function localIdForCloud(cloudId) {
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith("dnd5r:cloud:") && localStorage.getItem(key) === cloudId) return key.slice("dnd5r:cloud:".length);
      }
    } catch (_) {}
    return "";
  }

  function ensureUi() {
    if (document.getElementById("btnCloud")) return;
    const button = document.createElement("button");
    button.id = "btnCloud"; button.textContent = "雲端卷宗";
    document.getElementById("btnShare")?.after(button);
    const modal = document.createElement("div");
    modal.id = "cloudModal"; modal.className = "modal-bg";
    modal.innerHTML = `<div class="modal cloud-modal"><button class="close-x" id="closeCloud" aria-label="關閉">×</button><h3>雲端角色卷宗</h3><div class="mhint">只有你登入後才能存取。角色加入團務後，DM 才能查看你主動連結的角色。</div><div class="cloud-actions"><button class="primary" id="cloudSave">同步目前角色</button><button id="cloudRefresh">重新整理</button></div><div id="cloudStatus" class="mhint"></div><div id="cloudList" class="cloud-list"></div></div>`;
    document.body.appendChild(modal);
    const style = document.createElement("style");
    style.textContent = `.cloud-modal{max-width:720px}.cloud-actions{display:flex;gap:8px;flex-wrap:wrap;margin:12px 0}.cloud-list{display:grid;gap:8px;max-height:52vh;overflow:auto}.cloud-card{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px;align-items:center;border:1px solid var(--line-soft);background:#f8f3e2;padding:11px}.cloud-card b{display:block;font-family:var(--serif)}.cloud-card small{color:var(--muted)}.cloud-card button{white-space:nowrap}@media(max-width:520px){.cloud-card{grid-template-columns:1fr}.cloud-card button{width:100%}}`;
    document.head.appendChild(style);
    button.onclick = open;
    document.getElementById("closeCloud").onclick = close;
    modal.onclick = event => { if (event.target === modal) close(); };
    document.getElementById("cloudSave").onclick = saveCurrentToCloud;
    document.getElementById("cloudRefresh").onclick = refresh;
  }

  function close() { document.getElementById("cloudModal")?.classList.remove("open"); }
  function status(text) { const node = document.getElementById("cloudStatus"); if (node) node.textContent = text || ""; }
  function render() {
    const list = document.getElementById("cloudList"); if (!list) return;
    const items = dashboard?.characters || [];
    list.innerHTML = items.length ? items.map(item => `<article class="cloud-card"><div><b>${escapeHtml(item.name || "未命名冒險者")}</b><small>${item.ruleset === "2014" ? "5E 2014" : "5R 2024"} · ${escapeHtml(item.classSummary || "未選職業")} ${Math.max(1, +item.level || 1)} 級</small></div><button data-cloud-load="${item.id}">載入到本機</button></article>`).join("") : `<p class="mhint">雲端卷宗目前沒有角色。完成角色後按「同步目前角色」。</p>`;
    list.querySelectorAll("[data-cloud-load]").forEach(button => button.onclick = () => loadFromCloud(button.dataset.cloudLoad));
  }
  function escapeHtml(value) { const node = document.createElement("span"); node.textContent = String(value); return node.innerHTML; }

  async function refresh() {
    status("正在讀取雲端卷宗…");
    try { dashboard = await request(); render(); status(`已載入 ${dashboard.characters.length} 名角色。`); }
    catch (error) { status(error.message === "cloud-unavailable" ? "此部署未啟用雲端卷宗。" : error.message); }
  }
  async function open() { document.getElementById("cloudModal")?.classList.add("open"); await refresh(); }

  async function saveCurrentToCloud() {
    if (!S?.cls) { toast("請先建立角色再同步"); return; }
    saveCurrent(true); status("正在同步角色…");
    try {
      await syncCurrentRecord(); await refresh(); toast("角色已同步到雲端卷宗");
    } catch (error) { status(error.message); reportEvent("manual_cloud_sync", error, { cloudId: Boolean(currentCloudId()) }); }
  }

  async function syncCurrentRecord(options = {}) {
    if (!S?.cls || syncInFlight) {
      if (syncInFlight) syncAgain = true;
      return null;
    }
    syncInFlight = true;
    try {
      saveCurrent(true);
      const record = CHARACTER_REPO.loadRecord(S.id) || DND_CHARACTER_RECORD.fromSave(serialize());
      const result = await request("POST", { action: "save-character", cloudId: currentCloudId(), record });
      rememberCloudId(result.id);
      if (!options.silent) status(`雲端同步完成（修訂 ${result.revision || 1}）`);
      return result;
    } finally {
      syncInFlight = false;
      if (syncAgain) { syncAgain = false; scheduleCloudSync(250); }
    }
  }

  function scheduleCloudSync(delay = 1200) {
    if (cloudReadOnly || !currentCloudId() || !S?.cls) return;
    clearTimeout(syncTimer);
    syncTimer = setTimeout(() => {
      syncCurrentRecord({ silent: true }).catch(error => { status(`自動同步失敗：${error.message}`); reportEvent("automatic_cloud_sync", error, { cloudId: Boolean(currentCloudId()) }); });
    }, delay);
  }

  function installAutoSync() {
    if (typeof window.autoSave !== "function" || window.autoSave.__cloudWrapped) return;
    const localAutoSave = window.autoSave;
    function cloudAwareAutoSave(...args) {
      const result = localAutoSave.apply(this, args);
      scheduleCloudSync();
      return result;
    }
    cloudAwareAutoSave.__cloudWrapped = true;
    window.autoSave = cloudAwareAutoSave;
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden" && currentCloudId()) scheduleCloudSync(0);
    });
  }

  function lockReadOnlyControls() {
    if (!cloudReadOnly) return;
    document.querySelectorAll("[data-pm-hp],[data-pm-ds],[data-pm-insp],[data-pm-hd],[data-pm-res],[data-pm-slot]").forEach(node => {
      node.disabled = true;
      node.setAttribute("aria-disabled", "true");
    });
    const back = document.getElementById("pmClose");
    if (back) { back.title = "返回團務"; back.onclick = () => { location.href = "/"; }; }
  }

  function setCloudReadOnly(enabled) {
    cloudReadOnly = Boolean(enabled);
    document.body.classList.toggle("cloud-readonly", cloudReadOnly);
    if (!document.getElementById("cloudReadOnlyStyle")) {
      const style = document.createElement("style");
      style.id = "cloudReadOnlyStyle";
      style.textContent = `.cloud-readonly #pmCharacter{display:none}.cloud-readonly [data-pm-hp],.cloud-readonly [data-pm-ds],.cloud-readonly [data-pm-insp],.cloud-readonly [data-pm-hd],.cloud-readonly [data-pm-res],.cloud-readonly [data-pm-slot]{cursor:not-allowed;opacity:.55}`;
      document.head.appendChild(style);
    }
    readOnlyObserver?.disconnect();
    if (cloudReadOnly) {
      readOnlyObserver = new MutationObserver(lockReadOnlyControls);
      const view = document.getElementById("playModeView");
      if (view) readOnlyObserver.observe(view, { childList: true, subtree: true });
      lockReadOnlyControls();
    }
  }

  function showGuestNotice() {
    document.body.classList.add("guest-mode");
    if (document.getElementById("guestModeNotice")) return;
    const notice = document.createElement("aside");
    notice.id = "guestModeNotice";
    notice.innerHTML = `<b>訪客模式</b><span>角色只儲存在這台裝置；請定期匯出 JSON 或 PDF 備份。</span><a href="/">登入雲端卷宗</a>`;
    document.body.prepend(notice);
    const style = document.createElement("style");
    style.id = "guestModeStyle";
    style.textContent = `#guestModeNotice{position:relative;z-index:30;display:flex;align-items:center;justify-content:center;gap:10px;flex-wrap:wrap;padding:8px 14px;background:#2d271e;color:#fff4d8;font-size:13px}#guestModeNotice b{color:#ffcf72}#guestModeNotice a{color:#fff;text-decoration:underline}.guest-mode #btnCloud{display:none!important}@media(max-width:600px){#guestModeNotice{align-items:flex-start;justify-content:flex-start}}`;
    document.head.appendChild(style);
  }

  function loadFromCloud(id, options = {}) {
    const row = options.row || dashboard?.characters?.find(item => item.id === id); if (!row) return;
    try {
      const record = { recordVersion: 1, id: localIdForCloud(row.id) || newId(), ruleset: row.ruleset, revision: row.revision || 1,
        updatedAt: Date.now(), ownerId: null, campaignId: null, character: JSON.parse(row.characterJson),
        runtime: JSON.parse(row.runtimeJson || "{}"), sync: { dirty: false, baseRevision: row.revision || 1 } };
      const save = DND_CHARACTER_RECORD.toSave(record); deserialize(save); S.id = save.id; refreshAll(); saveCurrent(true);
      if (!options.readOnly) rememberCloudId(row.id);
      setCloudReadOnly(options.readOnly); close(); go(7);
      if (options.play) setTimeout(() => { openPlayMode(); lockReadOnlyControls(); }, 0);
      toast(options.readOnly ? "DM 唯讀跑團卡" : options.play ? "已開啟雲端跑團卡" : "已從雲端更新本機角色");
    } catch (error) { status(`角色資料無法載入：${error.message}`); reportEvent("cloud_character_load", error, { readOnly: Boolean(options.readOnly) }); }
  }

  async function boot() {
    if (guestMode) { showGuestNotice(); return; }
    installAutoSync();
    try {
      dashboard = await request(); ensureUi();
      const query = new URLSearchParams(location.search), cloudId = query.get("cloud");
      if (cloudId) {
        const readOnly = query.get("readonly") === "1";
        let row = dashboard.characters.find(item => item.id === cloudId);
        if (!row && readOnly) {
          const detail = await request("GET", undefined, `${API}?characterId=${encodeURIComponent(cloudId)}`);
          if (detail.access === "dm") row = detail.character;
        }
        if (!row) return;
        loadFromCloud(cloudId, { row, readOnly, play: query.get("mode") === "play" });
        history.replaceState(null, "", location.pathname);
      }
    }
    catch (_) { /* GitHub Pages 與未登入環境維持純本機模式。 */ }
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once: true }); else void boot();
})();
