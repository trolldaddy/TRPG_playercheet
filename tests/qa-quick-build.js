const { chromium } = require("playwright");
const url = process.env.QA_URL || "http://127.0.0.1:18766/index.html";

(async () => {
  const browser = await chromium.launch({ headless: true, channel: "chrome" });
  const page = await browser.newPage({ viewport: { width: 430, height: 900 } });
  const pageErrors = [], dialogs = [];
  page.on("pageerror", error => pageErrors.push(error.message));
  page.on("dialog", async dialog => { dialogs.push(dialog.message()); await dialog.dismiss(); });
  await page.goto(url, { waitUntil: "networkidle" });
  await page.waitForFunction(() => typeof createQuickCharacter === "function");
  const classes = await page.evaluate(() => CLASSES.map(x => x.n));
  const report = [];

  for (const ruleset of ["2014", "2024"]) for (const className of classes) {
    const result = await page.evaluate(async ({ ruleset, className }) => {
      openQuickBuild();
      document.getElementById("quickRuleset").value = ruleset;
      renderQuickBuildOptions();
      document.getElementById("quickClass").value = className;
      document.getElementById("quickName").value = `快建-${ruleset}-${className}`;
      await createQuickCharacter();
      const ci = ruleset === "2014" ? null : castInfo();
      const spellOK = ruleset === "2014"
        ? spellsReady2014()
        : !ci || (S.cantrips.size === ci.cant && S.prepared.size === ci.prep && (!ci.book || S.spellbook.size >= spellbookMax()));
      const record = JSON.parse(localStorage.getItem(`dnd5r:record:${S.id}`) || "null");
      const state = {
        ruleset: S.ruleset,
        cls: S.cls?.n,
        level: S.level,
        abilities: abilitiesReady(),
        skills: skillsReady(),
        species: speciesChoicesReady(),
        background: backgroundChoicesReady14() && backgroundGearReady2024(),
        languages: languagesReady2024(),
        gear: startingGearReady2014() && startingGearReady2024(),
        spellOK,
        saved: Boolean(record && record.character && record.runtime),
        hp: hpTotal(),
        weapons: S.gear.weapons.length,
        staleChoices: (S.cls.n !== "邪術師" && S.invocations.size) || (S.cls.n !== "牧師" && S.divineOrder) || (S.cls.n !== "德魯伊" && S.primalOrder) || S.metamagic.size
      };
      return state;
    }, { ruleset, className });
    const failed = Object.entries(result).filter(([key, value]) => ["abilities", "skills", "species", "background", "languages", "gear", "spellOK", "saved"].includes(key) && value !== true);
    if (result.ruleset !== ruleset || result.cls !== className || result.level !== 1 || !result.hp || result.staleChoices || failed.length) {
      throw new Error(`${ruleset}/${className} 快速創角失敗: ${JSON.stringify(result)}`);
    }
    report.push(result);
  }

  if (dialogs.length) throw new Error(`快速創角出現對話框: ${dialogs.join(" | ")}`);
  if (pageErrors.length) throw new Error(`頁面錯誤: ${pageErrors.join(" | ")}`);
  await browser.close();
  console.log(JSON.stringify({ status: "ok", cases: report.length, rulesets: ["2014", "2024"], classes: classes.length }));
})().catch(error => { console.error(error); process.exit(1); });
