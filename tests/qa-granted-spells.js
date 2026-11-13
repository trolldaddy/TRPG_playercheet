const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");
const PDFLib = require(path.resolve("assets/vendor/pdf-lib.min.js"));

const url = process.env.QA_URL || "http://127.0.0.1:18766/index.html";
const outDir = path.resolve("tmp/granted-spells");

const pdfText = async file => {
  const doc = await PDFLib.PDFDocument.load(fs.readFileSync(file));
  return doc.getForm().getFields().map(field => {
    try { return field.getText?.() || ""; } catch { return ""; }
  }).join("\n");
};

(async () => {
  fs.mkdirSync(outDir, { recursive: true });
  const browser = await chromium.launch({ headless: true, channel: "chrome" });
  const page = await browser.newPage();
  await page.goto(url, { waitUntil: "networkidle" });

  const coverage = await page.evaluate(() => {
    const failures = [], check = (label, actual, expected) => {
      const names = actual.map(x => x.n);
      for (const name of expected) if (!names.includes(name)) failures.push(`${label} 缺少 ${name}`);
    };
    const cls = CLASSES.find(x => x.n === "戰士");
    const setup = (ruleset, species, choices, level = 5) => {
      S.ruleset = ruleset; syncRulesetUI(); S.cls = cls; S.level = level; S.classLevels = { 戰士: level }; S.sub = null;
      S.sp = (ruleset === "2014" ? SPECIES_2014 : SPECIES_2024).find(x => x.n === species); S.spChoices = choices; S.bg = (ruleset === "2014" ? BACKGROUNDS_2014 : BACKGROUNDS_2024)[0]; S.featSpells = {};
    };
    const cases24 = [
      ["精靈", { eLine: "卓爾", eSkill: "察覺" }, ["舞光術", "妖火", "黑暗術"]],
      ["精靈", { eLine: "高等精靈", eSkill: "察覺" }, ["變戲法", "偵測魔法", "迷蹤步"]],
      ["精靈", { eLine: "木精靈", eSkill: "察覺" }, ["德魯伊工藝", "大步奔行", "行跡無蹤"]],
      ["阿斯莫", {}, ["光亮術"]],
      ["侏儒", { gLine: "森林侏儒" }, ["次級幻影", "與動物交談"]],
      ["侏儒", { gLine: "岩石侏儒" }, ["修復術", "變戲法"]],
      ["提夫林", { fLine: "深淵" }, ["毒液噴濺", "患病射線", "人類定身術"]],
      ["提夫林", { fLine: "冥界" }, ["寒冰之觸", "虛假生命", "衰弱射線"]],
      ["提夫林", { fLine: "九獄" }, ["火焰箭", "地獄斥責", "黑暗術"]]
    ];
    for (const [sp, choices, expected] of cases24) { setup("2024", sp, choices); check(`2024 ${sp}/${Object.values(choices)[0] || "base"}`, speciesGrantedSpells(), expected); }
    const cases14 = [
      ["精靈", { subrace: "卓爾" }, ["舞光術", "妖火術", "黑暗術"]],
      ["侏儒", { subrace: "森林侏儒" }, ["次級幻象"]],
      ["提夫林", {}, ["奇術", "煉獄叱喝", "黑暗術"]]
    ];
    for (const [sp, choices, expected] of cases14) { setup("2014", sp, choices); check(`2014 ${sp}`, speciesGrantedSpells(), expected); }
    setup("2024", "精靈", { eLine: "高等精靈", eSkill: "察覺" });
    S.bg = BACKGROUNDS_2024.find(x => x.n === "賢者"); S.featSpells = { ogbg: { c1: "法師之手", c2: "光亮術", s1: "魔法飛彈" } };
    check("2024 賢者背景", grantedSpells(), ["變戲法", "偵測魔法", "迷蹤步", "法師之手", "光亮術", "魔法飛彈"]);
    renderSpells(); const ui = [...document.querySelectorAll("#spellBody .sref")].map(x => x.dataset.sref);
    for (const n of ["變戲法", "偵測魔法", "迷蹤步", "法師之手", "光亮術", "魔法飛彈"]) if (!ui.includes(n)) failures.push(`網頁法術欄缺少 ${n}`);
    return { failures, cases24: cases24.length, cases14: cases14.length, ui };
  });
  if (coverage.failures.length) throw new Error(coverage.failures.join("\n"));

  const exportPdf = async (edition, setup) => {
    await page.evaluate(setup);
    const wait = page.waitForEvent("download");
    await page.evaluate(() => exportOfficialCharacterSheet());
    const download = await wait, file = path.join(outDir, `qa-granted-${edition}.pdf`); await download.saveAs(file); return file;
  };
  const pdf24 = await exportPdf("2024", () => {
    S.ruleset = "2024"; syncRulesetUI(); S.cls = CLASSES.find(x => x.n === "戰士"); S.level = 5; S.classLevels = { 戰士: 5 }; S.sub = null;
    S.sp = SPECIES_2024.find(x => x.n === "精靈"); S.spChoices = { eLine: "高等精靈", eSkill: "察覺" }; S.bg = BACKGROUNDS_2024.find(x => x.n === "賢者");
    S.featSpells = { ogbg: { c1: "法師之手", c2: "光亮術", s1: "魔法飛彈" } }; document.getElementById("fName").value = "QA授予法術";
  });
  const text24 = await pdfText(pdf24);
  for (const n of ["變戲法", "偵測魔法", "迷蹤步", "法師之手", "光亮術", "魔法飛彈"]) if (!text24.includes(n)) throw new Error(`2024 PDF 缺少 ${n}`);
  const pdf14 = await exportPdf("2014", () => {
    S.ruleset = "2014"; syncRulesetUI(); S.cls = CLASSES.find(x => x.n === "戰士"); S.level = 5; S.classLevels = { 戰士: 5 }; S.sub = null;
    S.sp = SPECIES_2014.find(x => x.n === "精靈"); S.spChoices = { subrace: "卓爾" }; S.bg = BACKGROUNDS_2014[0]; S.featSpells = {}; document.getElementById("fName").value = "QA授予法術";
  });
  const text14 = await pdfText(pdf14);
  for (const n of ["舞光術", "妖火術", "黑暗術"]) if (!text14.includes(n)) throw new Error(`2014 PDF 缺少 ${n}`);
  console.log(JSON.stringify({ status: "ok", coverage, pdf24, pdf14 }));
  await browser.close();
})().catch(error => { console.error(error); process.exit(1); });
