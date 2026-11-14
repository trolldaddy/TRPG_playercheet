const { chromium } = require("playwright");
const url = process.env.QA_URL || "http://127.0.0.1:18766/index.html";

(async () => {
  const browser = await chromium.launch({ headless: true, channel: "chrome" });
  const page = await browser.newPage();
  const legacy = {
    v: 7,
    ruleset: "2024",
    id: "browser-legacy",
    ts: 1710000000000,
    cls: "法師",
    bg: "侍僧",
    sp: "人類",
    sub: null,
    method: "array",
    base: { str: 8, dex: 14, con: 13, int: 15, wis: 12, cha: 10 },
    rolled: [],
    bonusMode: "fixed",
    bonus: { b2: "int", b1: "con", c1: "", c2: "", c3: "" },
    skills: ["奧術"],
    level: 1,
    classLevels: { "法師": 1 },
    classSubs: {},
    spellByClass: {},
    asiByClass: {},
    startGear14: {},
    startGear24: {},
    classChoices14: {},
    hpMode: "avg",
    hpRolls: {},
    hpRollsByClass: {},
    asi: {},
    cantrips: ["火焰箭"],
    prepared: ["魔法飛彈"],
    spellbook: ["魔法飛彈"],
    meta: { name: "瀏覽器遷移", player: "", align: "", faith: "", gender: "", age: "" },
    play: { hp: 4, hpMax: 8, thp: 2, hd: 1, hdByClass: { "法師": 1 }, ds: { s: 0, f: 0 }, insp: false, res: {}, resMax: {}, custom: [], notes: "" },
    slotsUsed: { l1: 1 }
  };

  await page.addInitScript(value => {
    localStorage.setItem("dnd5r:char:" + value.id, JSON.stringify(value));
    localStorage.setItem("dnd5r:current", value.id);
    localStorage.setItem("dnd5r:roster", JSON.stringify([{ id: value.id, name: value.meta.name, ruleset: value.ruleset, cls: value.cls, level: value.level, ts: value.ts }]));
  }, legacy);
  await page.goto(url, { waitUntil: "networkidle" });

  const before = await page.evaluate(() => ({ id: S.id, name: document.getElementById("fName").value, hp: S.play.hp, thp: S.play.thp, slot: S.slotsUsed.l1 }));
  if (before.id !== legacy.id || before.name !== legacy.meta.name || before.hp !== 4 || before.thp !== 2 || before.slot !== 1) {
    throw new Error(`舊角色啟動恢復失敗: ${JSON.stringify(before)}`);
  }

  const after = await page.evaluate(() => {
    saveCurrent(true);
    const raw = localStorage.getItem("dnd5r:record:" + S.id);
    const record = raw ? JSON.parse(raw) : null;
    return {
      legacyExists: localStorage.getItem("dnd5r:char:" + S.id) !== null,
      record,
      portable: CHARACTER_REPO.load(S.id)
    };
  });
  await browser.close();

  if (!after.record || after.legacyExists) throw new Error("舊角色未正確升級為新版紀錄");
  if (after.record.character.play || after.record.character.slotsUsed) throw new Error("固定資料仍混入跑團狀態");
  if (after.record.runtime.play.hp !== 4 || after.record.runtime.play.thp !== 2 || after.record.runtime.slotsUsed.l1 !== 1) throw new Error("跑團狀態升級失敗");
  if (after.portable.meta.name !== legacy.meta.name || after.portable.play.hp !== 4) throw new Error("新版紀錄無法還原可攜式存檔");
  console.log(JSON.stringify({ status: "ok", id: after.record.id, revision: after.record.revision }));
})().catch(error => { console.error(error); process.exit(1); });
