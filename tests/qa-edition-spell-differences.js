const { chromium } = require("playwright");
const path = require("path");
const url = process.env.QA_URL || `file:///${path.resolve("index.html").replace(/\\/g, "/")}`;

(async () => {
  const browser = await chromium.launch({ headless: true, channel: "chrome" });
  const page = await browser.newPage();
  await page.goto(url, { waitUntil: url.startsWith("file:") ? "load" : "networkidle" });
  const report = await page.evaluate(async () => {
    await ensureSpellDataReady("2014");
    const failures = [];
    const spell = (edition, name) => spellDbForEdition(edition).find(x => x.n === name);
    const check = (ok, message) => { if (!ok) failures.push(message); };
    const cure14 = spell("2014", "治療傷勢"), cure24 = spell("2024", "治療真言");
    const word14 = spell("2014", "治癒真言"), word24 = spell("2024", "治癒之語");
    const bolt14 = spell("2014", "巫術箭"), bolt24 = spell("2024", "巫術箭");
    check(cure14?.d.includes("1d8"), "2014 治療傷勢應為 1d8");
    check(cure24?.d.includes("2d8"), "2024 治療真言應為 2d8");
    check(word14?.d.includes("1d4"), "2014 治癒真言應為 1d4");
    check(word24?.d.includes("2d4"), "2024 治癒之語應為 2d4");
    check(bolt14?.d.includes("1d12"), "2014 巫術箭初始傷害應為 1d12");
    check(bolt24?.d.includes("2d12"), "2024 巫術箭初始傷害應為 2d12");
    check(SPELL_META14["巫術箭"]?.range === "30 呎", `2014 巫術箭射程錯誤：${SPELL_META14["巫術箭"]?.range}`);
    check(SPELL_META["巫術箭"]?.range === "60尺", `2024 巫術箭射程錯誤：${SPELL_META["巫術箭"]?.range}`);
    const item14 = await magicItemRulesDb("2014"), item24 = await magicItemRulesDb("2024");
    check(item14.spellReferenceEdition === "2014", "2014 魔法物品必須引用 2014 法術");
    check(item24.spellReferenceEdition === "2024", "2024 魔法物品必須引用 2024 法術");
    return { failures, samples: { cure14: cure14?.d, cure24: cure24?.d, word14: word14?.d, word24: word24?.d, bolt14: { range: SPELL_META14["巫術箭"]?.range, effect: bolt14?.d.slice(0, 50) }, bolt24: { range: SPELL_META["巫術箭"]?.range, effect: bolt24?.d } } };
  });
  console.log(JSON.stringify(report, null, 2));
  await browser.close();
  if (report.failures.length) process.exit(1);
})().catch(error => { console.error(error); process.exit(1); });
