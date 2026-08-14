const { chromium } = require("playwright");
const path = require("path");
const fs = require("fs");

const url = process.env.QA_URL || "http://127.0.0.1:18766/index.html";
const outputDir = path.resolve(process.env.QA_PDF_DIR || "tmp/pdfs");

(async () => {
  fs.mkdirSync(outputDir, { recursive: true });
  const browser = await chromium.launch({ headless: true, channel: "chrome" });
  const page = await browser.newPage();
  await page.goto(url, { waitUntil: "networkidle" });
  for (const level of [1, 20]) {
    await page.evaluate(level => {
      S.ruleset = "2014"; syncRulesetUI();
      S.cls = CLASSES.find(x => x.n === "聖武士"); S.level = level; S.classLevels = { 聖武士: level }; S.classSubs = {}; S.sub = level >= 3 ? 0 : null;
      S.sp = SPECIES_2014.find(x => x.n === "半身人"); S.spChoices = { subrace: "輕足半身人" };
      S.bg = BACKGROUNDS_2014.find(x => x.n === "貴族"); S.bgChoices14 = { game: "龍棋組", lang1: "矮人語" };
      S.skills = new Set(["歷史", "說服", "洞悉", "威嚇"]); S.startGear14 = { 0: 0, 1: 0, 2: 0 };
      S.gear = { armor: "鍊甲", unarmored: "auto", shield: true, weapons: ["長劍"], miscAC: 0, miscLabel: "", items: "治療藥水 × 2", gold: { pp: 0, gp: 25, sp: 0, cp: 0 } };
      S.spellByClass = {}; S.asiByClass = {}; S.classChoices14 = {}; S.slotsUsed = {}; S.play.hp = null; S.play.hpMax = null;
      document.getElementById("fName").value = `QA-2014-${level}`; document.getElementById("fAlign").value = "守序善良";
      update(); window.PDF_EXPORT_KEEP_FORM = false;
    }, level);
    const downloadPromise = page.waitForEvent("download");
    await page.evaluate(() => exportOfficialCharacterSheet());
    const download = await downloadPromise;
    await download.saveAs(path.join(outputDir, `qa-2014-paladin-${level}.pdf`));
  }
  await browser.close();
  console.log(JSON.stringify({ outputDir, files: [1, 20].map(x => `qa-2014-paladin-${x}.pdf`) }));
})().catch(error => { console.error(error); process.exit(1); });
