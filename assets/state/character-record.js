(() => {
  "use strict";

  const RECORD_VERSION = 1;
  const PREFIX = "dnd5r:record:";
  const LEGACY_PREFIX = "dnd5r:char:";
  const ROSTER_KEY = "dnd5r:roster";
  const CURRENT_KEY = "dnd5r:current";
  const clone = value => value == null ? value : JSON.parse(JSON.stringify(value));
  const isObject = value => Boolean(value && typeof value === "object" && !Array.isArray(value));

  function isRecord(value) {
    return isObject(value) && value.recordVersion === RECORD_VERSION && isObject(value.character) && isObject(value.runtime);
  }

  function fromSave(save, previous = null) {
    if (!isObject(save)) throw new TypeError("角色存檔格式錯誤");
    const character = clone(save);
    const runtime = {
      play: clone(character.play || {}),
      slotsUsed: clone(character.slotsUsed || {})
    };
    delete character.play;
    delete character.slotsUsed;
    delete character.ts;
    return {
      recordVersion: RECORD_VERSION,
      id: String(save.id || ""),
      ruleset: save.ruleset === "2014" ? "2014" : "2024",
      revision: Math.max(1, (+previous?.revision || 0) + 1),
      updatedAt: +save.ts || Date.now(),
      ownerId: previous?.ownerId || null,
      campaignId: previous?.campaignId || null,
      character,
      runtime,
      sync: { dirty: true, baseRevision: +previous?.revision || 0 }
    };
  }

  function toSave(record) {
    if (!isRecord(record)) throw new TypeError("角色紀錄格式錯誤");
    return {
      ...clone(record.character),
      id: record.id,
      ruleset: record.ruleset,
      ts: record.updatedAt,
      play: clone(record.runtime.play || {}),
      slotsUsed: clone(record.runtime.slotsUsed || {})
    };
  }

  function createLocalRepository(storage = globalThis.localStorage) {
    const readJson = key => {
      try { const raw = storage.getItem(key); return raw == null ? null : JSON.parse(raw); }
      catch (_) { return null; }
    };
    const writeJson = (key, value) => { storage.setItem(key, JSON.stringify(value)); return value; };
    const recordKey = id => PREFIX + id;
    const legacyKey = id => LEGACY_PREFIX + id;

    function available() {
      try {
        const key = "dnd5r:record-test";
        storage.setItem(key, "1"); storage.removeItem(key);
        return true;
      } catch (_) { return false; }
    }

    function loadRecord(id) {
      const current = readJson(recordKey(id));
      if (isRecord(current)) return current;
      const legacy = readJson(legacyKey(id));
      return isObject(legacy) ? fromSave(legacy) : null;
    }

    return Object.freeze({
      kind: "local",
      available,
      loadRecord,
      load(id) { const record = loadRecord(id); return record ? toSave(record) : null; },
      save(save) {
        const previous = save?.id ? loadRecord(save.id) : null;
        const record = fromSave(save, previous);
        writeJson(recordKey(record.id), record);
        // 新格式確認寫入後才移除舊格式，避免同一份大型畫像長期占用兩倍空間。
        storage.removeItem(legacyKey(record.id));
        return record;
      },
      remove(id) { storage.removeItem(recordKey(id)); storage.removeItem(legacyKey(id)); },
      getRoster() { const value = readJson(ROSTER_KEY); return Array.isArray(value) ? value : []; },
      setRoster(value) { return writeJson(ROSTER_KEY, Array.isArray(value) ? value : []); },
      getCurrentId() { return storage.getItem(CURRENT_KEY); },
      setCurrentId(id) { if (id) storage.setItem(CURRENT_KEY, id); else storage.removeItem(CURRENT_KEY); },
      keys: Object.freeze({ prefix: PREFIX, legacyPrefix: LEGACY_PREFIX, roster: ROSTER_KEY, current: CURRENT_KEY })
    });
  }

  const api = Object.freeze({ RECORD_VERSION, isRecord, fromSave, toSave, createLocalRepository });
  globalThis.DND_CHARACTER_RECORD = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})();
