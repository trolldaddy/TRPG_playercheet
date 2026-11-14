(() => {
  "use strict";

  const SHARE_VERSION = 1;
  const HASH_KEY = "character";
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  const clone = value => JSON.parse(JSON.stringify(value));

  function toBase64Url(bytes) {
    let binary = "";
    for (let i = 0; i < bytes.length; i += 0x8000) {
      binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    }
    return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
  }

  function fromBase64Url(value) {
    const padded = value.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((value.length + 3) % 4);
    const binary = atob(padded), bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
  }

  async function gzip(bytes) {
    const stream = new Blob([bytes]).stream().pipeThrough(new CompressionStream("gzip"));
    return new Uint8Array(await new Response(stream).arrayBuffer());
  }

  async function gunzip(bytes) {
    const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("gzip"));
    return new Uint8Array(await new Response(stream).arrayBuffer());
  }

  function portableSave(save) {
    if (!save || typeof save !== "object" || Array.isArray(save)) throw new TypeError("角色快照格式錯誤");
    const out = clone(save);
    // 畫像通常是大型 data URL，會讓網址與 QR 超出容量；其餘角色與跑團狀態完整保留。
    out.portrait = "";
    return out;
  }

  async function encode(save) {
    const payload = encoder.encode(JSON.stringify({ kind: "dnd5r-character-snapshot", version: SHARE_VERSION, save: portableSave(save) }));
    if (typeof CompressionStream === "function") {
      try { return "g." + toBase64Url(await gzip(payload)); } catch (_) {}
    }
    return "j." + toBase64Url(payload);
  }

  async function decode(token) {
    if (typeof token !== "string" || !/^[gj]\.[A-Za-z0-9_-]+$/.test(token)) throw new TypeError("分享連結格式錯誤");
    const [mode, body] = [token.slice(0, 1), token.slice(2)];
    let bytes = fromBase64Url(body);
    if (mode === "g") {
      if (typeof DecompressionStream !== "function") throw new Error("這個瀏覽器無法解壓縮角色快照，請更新瀏覽器");
      bytes = await gunzip(bytes);
    }
    let payload;
    try { payload = JSON.parse(decoder.decode(bytes)); } catch (_) { throw new TypeError("角色快照內容損壞"); }
    if (!payload || payload.kind !== "dnd5r-character-snapshot" || payload.version !== SHARE_VERSION || !payload.save || typeof payload.save !== "object") {
      throw new TypeError("無法識別這個角色快照");
    }
    return clone(payload.save);
  }

  async function makeUrl(save, href = globalThis.location?.href || "") {
    const url = new URL(href);
    url.hash = `${HASH_KEY}=${await encode(save)}`;
    return url.href;
  }

  function tokenFromHash(hash = globalThis.location?.hash || "") {
    const raw = String(hash).replace(/^#/, "");
    if (!raw.startsWith(HASH_KEY + "=")) return null;
    try { return decodeURIComponent(raw.slice(HASH_KEY.length + 1)); } catch (_) { return null; }
  }

  const api = Object.freeze({ SHARE_VERSION, HASH_KEY, portableSave, encode, decode, makeUrl, tokenFromHash });
  globalThis.DND_CHARACTER_SHARE = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})();
