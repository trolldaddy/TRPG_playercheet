const { chromium } = require("playwright");
const url = process.env.QA_URL || "http://127.0.0.1:18766/index.html";

(async () => {
  const browser = await chromium.launch({ headless: true, channel: "chrome" });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  await page.goto(url, { waitUntil: "networkidle" });
  await page.evaluate(() => {
    S.ruleset = "2024"; syncRulesetUI();
    S.cls = CLASSES.find(x => x.n === "法師");
    S.level = 3; S.classLevels = { "法師": 3 }; S.sub = 0;
    S.base = { str: 8, dex: 14, con: 13, int: 15, wis: 12, cha: 10 };
    S.bonus = { b2: "int", b1: "con", c1: "", c2: "", c3: "" };
    S.skills = new Set(["奧秘", "調查"]);
    S.gear.weapons = ["輕弩"];
    S.cantrips = new Set(["火焰箭"]);
    S.prepared = new Set(["魔法飛彈", "護盾術"]);
    S.spellbook = new Set(["魔法飛彈", "護盾術"]);
    document.getElementById("fName").value = "手機測試法師";
    reconcileProgress(); refreshAll(); renderFinal();
    openPlayMode();
  });

  await page.waitForSelector("#playModeView.open");
  const start = await page.evaluate(() => ({ hp: S.play.hp, max: S.play.hpMax, tabs: document.querySelectorAll("[data-pm-tab]").length, weapon: document.getElementById("playModeView").textContent.includes("輕弩") }));
  if (!start.hp || start.tabs !== 4 || !start.weapon) throw new Error(`手機戰鬥頁內容不完整: ${JSON.stringify(start)}`);
  await page.locator("#pmHpAmt").fill("3");
  await page.click('[data-pm-hp="dmg"]');
  const damaged = await page.evaluate(() => S.play.hp);
  if (damaged !== start.hp - 3) throw new Error(`手機生命值控制失敗: ${start.hp} -> ${damaged}`);
  await page.click('[data-pm-ds="s1"]');
  await page.click('[data-pm-insp]');
  const runtime = await page.evaluate(() => ({ deathSuccess: S.play.ds.s, inspiration: S.play.insp }));
  if (runtime.deathSuccess !== 1 || runtime.inspiration !== true) throw new Error(`手機跑團狀態控制失敗: ${JSON.stringify(runtime)}`);
  const slotButton = page.locator('[data-pm-slot="l1"][data-d="1"]');
  if (await slotButton.count()) {
    await slotButton.click();
    const used = await page.evaluate(() => S.slotsUsed.l1);
    if (used !== 1) throw new Error(`手機法術位控制失敗: ${used}`);
  }

  await page.click('[data-pm-tab="spells"]');
  if (!(await page.locator('[data-pm-panel="spells"]').innerText()).includes("火焰箭")) throw new Error("手機法術頁沒有顯示已選法術");
  await page.click('[data-pm-tab="abilities"]');
  if (!(await page.locator('[data-pm-panel="abilities"]').innerText()).includes("奧秘")) throw new Error("手機能力頁沒有顯示技能");

  await page.click("#pmClose");
  if (await page.locator("body.play-mode").count()) throw new Error("無法離開手機跑團模式");
  await page.evaluate(() => {
    S.ruleset = "2014"; syncRulesetUI();
    S.cls = CLASSES.find(x => x.n === "戰士"); S.level = 2; S.classLevels = { "戰士": 2 }; S.sub = null; S.classSubs = {};
    S.base = { str: 15, dex: 14, con: 13, int: 10, wis: 12, cha: 8 };
    S.bonus = { b2: "", b1: "", c1: "", c2: "", c3: "" }; S.skills = new Set(["運動", "察覺"]);
    S.gear.weapons = ["長劍"]; S.play.hp = null; S.play.hpMax = null;
    reconcileProgress(); renderFinal(); playModeTab = "combat"; openPlayMode();
  });
  await page.waitForSelector("#playModeView.open");
  const text14 = await page.locator("#playModeView").innerText();
  if (!text14.includes("5E 2014") || !text14.includes("長劍") || !text14.includes("回氣")) throw new Error(`2014 手機跑團內容不完整: ${text14.slice(0, 800)}`);
  await page.click("#pmClose");
  await browser.close();
  console.log(JSON.stringify({ status: "ok", hpBefore: start.hp, hpAfter: damaged, tabs: start.tabs }));
})().catch(error => { console.error(error); process.exit(1); });
