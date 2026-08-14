const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");
const PDFLib = require(path.resolve("assets/vendor/pdf-lib.min.js"));

const url = process.env.QA_URL || "http://127.0.0.1:18766/index.html";
const output = path.resolve("tmp/qa-2024-export.pdf");

(async () => {
  fs.mkdirSync(path.dirname(output), { recursive: true });
  const browser = await chromium.launch({ headless: true, channel: "chrome" });
  const page = await browser.newPage();
  await page.goto(url, { waitUntil: "networkidle" });

  const spellUi = await page.evaluate(() => {
    S.ruleset = "2014"; syncRulesetUI();
    S.cls = CLASSES.find(x => x.n === "法師"); S.level = 1; S.classLevels = { 法師: 1 };
    S.sp = SPECIES_2014.find(x => x.n === "人類");
    S.bg = BACKGROUNDS_2014.find(x => x.n === "賢者");
    S.spellByClass = {}; renderSpells2014();
    const chips = [...document.querySelectorAll("#spellBody .spell-chip")];
    return { chips: chips.length, linked: chips.filter(x => x.querySelector(".sref[data-sref]")).length };
  });
  if (!spellUi.chips || spellUi.linked !== spellUi.chips) throw new Error(`2014 spell hover links incomplete: ${JSON.stringify(spellUi)}`);

  await page.evaluate(() => {
    S.ruleset = "2024"; syncRulesetUI();
    S.cls = CLASSES.find(x => x.n === "術士"); S.level = 4; S.classLevels = { 術士: 4 };
    S.sp = SPECIES_2024.find(x => x.n === "人類"); S.spChoices = { hFeat: "警覺", hSkill: "察覺" };
    S.bg = BACKGROUNDS_2024.find(x => x.n === "流浪兒");
    S.asi = { 4: { t: "feat", feat: "戰鬥施法者" } };
    S.base = { str: 8, dex: 14, con: 14, int: 12, wis: 10, cha: 17 };
    S.skills = new Set(["欺瞞", "說服"]); S.gear.weapons = []; S.gear.items = "";
    document.getElementById("fName").value = "QA-2024";
    window.PDF_EXPORT_KEEP_FORM = true; update();
  });
  const downloadPromise = page.waitForEvent("download");
  await page.evaluate(() => exportOfficialCharacterSheet());
  const download = await downloadPromise; await download.saveAs(output);
  await browser.close();

  const doc = await PDFLib.PDFDocument.load(fs.readFileSync(output));
  const form = doc.getForm();
  const get = name => form.getTextField(name).getText() || "";
  const feat = get("feat-trat"), tool = get("tool_pro"), species = get("speice-trat"), cls = get("class-a-1");
  for (const expected of ["背景起源專長", "幸運", "額外起源專長", "警覺", "4級專長", "戰鬥施法者"]) if (!feat.includes(expected)) throw new Error(`missing feat export: ${expected}`);
  if (!feat.includes("專注")) throw new Error("general feat description missing");
  if (!tool.includes("盜賊工具")) throw new Error(`missing background tool: ${tool}`);
  if (!species.includes("物種：人類") || !cls.includes("術士")) throw new Error("species/class feature export missing");
  console.log(JSON.stringify({ spellUi, feat, tool, species: species.slice(0, 60), cls: cls.slice(0, 60) }));
})().catch(error => { console.error(error); process.exit(1); });
