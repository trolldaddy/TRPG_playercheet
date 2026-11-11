const { chromium } = require("playwright");
const assert = require("assert");

const url = process.env.QA_URL || "http://127.0.0.1:18766/index.html";
const expectedGold = { 野蠻人:75, 吟遊詩人:90, 牧師:110, 德魯伊:50, 戰士:155, 武僧:50, 聖武士:150, 遊俠:150, 遊蕩者:100, 術士:50, 邪術師:100, 法師:55 };

(async () => {
  const browser = await chromium.launch({ headless: true, channel: "chrome" });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true });
  await page.goto(url, { waitUntil: "networkidle" });
  const result = await page.evaluate(expected => {
    document.getElementById("rulesetModal")?.classList.remove("open");
    S.ruleset = "2024"; syncRulesetUI();
    const classes = {};
    for (const c of CLASSES) {
      S.cls = c; S.classLevels = { [c.n]: 1 }; S.gear.gold = { pp:0, gp:0, sp:0, cp:0 }; S.startGear24 = {};
      chooseStartingGear2024(0);
      if (selectedStartingGear2024()?.choice) S.startGear24.tool = selectedStartingGear2024().choice === "instrument" ? INSTRUMENTS_2014[0] : ARTISAN_TOOLS_2014[0];
      const kit = { ready: startingGearReady2024(), text: resolvedStartingGear2024(), weapons: startingWeapons2024() };
      chooseStartingGear2024((START_GEAR_2024[c.n] || []).length - 1);
      classes[c.n] = { kit, gold: moneyCp() / 100, expected: expected[c.n] };
    }
    S.cls = CLASSES.find(x => x.n === "戰士"); S.classLevels = { 戰士:1 }; S.startGear24 = {}; S.gear.gold = { pp:0, gp:0, sp:0, cp:0 }; renderClasses();
    chooseStartingGear2024(0); renderClasses();
    S.bg = BACKGROUNDS_2024.find(x => x.n === "罪犯"); S.bgGear24 = {}; renderOrigin(); chooseBackgroundGear2024("kit");
    const backgroundKit = { ready: backgroundGearReady2024(), gp: S.bgGear24.goldApplied, text: backgroundGearText2024() };
    chooseBackgroundGear2024("gold");
    const backgroundGold = { ready: backgroundGearReady2024(), gp: S.bgGear24.goldApplied };
    document.getElementById("rulesetModal")?.classList.remove("open");
    return { classes, backgroundKit, backgroundGold, viewport: innerWidth, scrollWidth: document.documentElement.scrollWidth };
  }, expectedGold);
  for (const [name, row] of Object.entries(result.classes)) {
    assert(row.kit.ready && row.kit.text, `${name} package is incomplete`);
    assert.equal(row.gold, row.expected, `${name} gold option is incorrect`);
  }
  assert(result.backgroundKit.ready && result.backgroundKit.text.includes("盜賊工具"));
  assert.deepEqual(result.backgroundGold, { ready:true, gp:50 });
  assert(result.scrollWidth <= result.viewport + 1, `mobile horizontal overflow: ${result.scrollWidth}/${result.viewport}`);
  await browser.close();
  console.log(JSON.stringify({ classes:Object.keys(result.classes).length, background:"ok", mobile:`${result.scrollWidth}/${result.viewport}` }));
})().catch(error => { console.error(error); process.exit(1); });
