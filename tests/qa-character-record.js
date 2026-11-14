"use strict";

const assert = require("node:assert/strict");
const records = require("../assets/state/character-record.js");

class MemoryStorage {
  constructor() { this.values = new Map(); }
  getItem(key) { return this.values.has(key) ? this.values.get(key) : null; }
  setItem(key, value) { this.values.set(key, String(value)); }
  removeItem(key) { this.values.delete(key); }
}

const storage = new MemoryStorage();
const repo = records.createLocalRepository(storage);
const legacy = {
  v: 7,
  id: "hero-1",
  ruleset: "2014",
  ts: 1710000000000,
  cls: "聖武士",
  level: 5,
  meta: { name: "遷移測試" },
  play: { hp: 23, temp: 4, conditions: ["中毒"] },
  slotsUsed: { l1: 2, l2: 1 }
};

storage.setItem("dnd5r:char:hero-1", JSON.stringify(legacy));
assert.equal(repo.available(), true);
assert.deepEqual(repo.load("hero-1"), legacy, "舊版角色應可無損讀取");

const firstRecord = repo.save({ ...repo.load("hero-1"), ts: 1710000001000 });
assert.equal(firstRecord.recordVersion, 1);
assert.equal(firstRecord.ruleset, "2014");
assert.equal(firstRecord.revision, 2);
assert.equal(firstRecord.character.play, undefined, "固定角色資料不可混入跑團狀態");
assert.equal(firstRecord.character.slotsUsed, undefined, "固定角色資料不可混入法術位消耗");
assert.deepEqual(firstRecord.runtime.play, legacy.play);
assert.deepEqual(firstRecord.runtime.slotsUsed, legacy.slotsUsed);
assert.equal(storage.getItem("dnd5r:char:hero-1"), null, "成功升級後應移除重複的舊格式資料");
assert.ok(storage.getItem("dnd5r:record:hero-1"));

const restored = repo.load("hero-1");
assert.equal(restored.meta.name, "遷移測試");
assert.equal(restored.play.hp, 23);
assert.equal(restored.play.temp, 4);
assert.deepEqual(restored.slotsUsed, { l1: 2, l2: 1 });

restored.play.hp = 17;
const secondRecord = repo.save({ ...restored, ts: 1710000002000 });
assert.equal(secondRecord.revision, 3);
assert.equal(secondRecord.sync.baseRevision, 2);
assert.equal(repo.load("hero-1").play.hp, 17);

repo.setRoster([{ id: "hero-1", name: "遷移測試" }]);
repo.setCurrentId("hero-1");
assert.deepEqual(repo.getRoster(), [{ id: "hero-1", name: "遷移測試" }]);
assert.equal(repo.getCurrentId(), "hero-1");

repo.remove("hero-1");
assert.equal(repo.load("hero-1"), null);
repo.setCurrentId(null);
assert.equal(repo.getCurrentId(), null);

console.log("qa-character-record: PASS");
