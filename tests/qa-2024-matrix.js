const { chromium } = require("playwright");
const path = require("path");

const url = process.env.QA_URL || `file:///${path.resolve("index.html").replace(/\\/g, "/")}`;

(async () => {
  const browser = await chromium.launch({ headless: true, channel: "chrome" });
  const page = await browser.newPage();
  await page.goto(url, { waitUntil: url.startsWith("file:") ? "load" : "networkidle" });
  await page.waitForTimeout(400);
  const report = await page.evaluate(() => {
    const failures = [];
    const counts = { classLevels: 0, subclasses: 0, speciesVariants: 0, speciesOptions: 0, backgrounds: 0, cartesian: 0 };
    const check = (label, fn) => {
      try { if (fn() === false) throw new Error("assertion failed"); }
      catch (error) { failures.push(`${label}: ${error.message}`); }
    };
    const resetFor = (cls, level = 1) => {
      S.ruleset = "2024"; syncRulesetUI();
      S.cls = cls; S.level = level; S.classLevels = { [cls.n]: level }; S.sub = null; S.classSubs = {};
      S.sp = SPECIES_2024[0]; S.spChoices = { hSkill: "察覺", hFeat: "警覺" };
      S.bg = BACKGROUNDS_2024[0]; S.bgAbilityMode = "+2/+1"; S.bgAbilityPicks = [S.bg.ab[0], S.bg.ab[1]];
      S.skills = new Set(cls.sk.slice(0, cls.skc)); S.asi = {}; S.cantrips = new Set(); S.prepared = new Set(); S.spellbook = new Set();
      S.slotsUsed = {}; S.startGear24 = {}; S.bgGear24 = {}; S.masteries = new Set();
      S.gear = { armor: "", unarmored: "auto", shield: false, weapons: [], miscAC: 0, miscLabel: "", items: "", gold: { pp: 0, gp: 0, sp: 0, cp: 0 } };
    };
    const speciesVariants = [];
    for (const sp of SPECIES_2024) {
      const optChoices = (sp.ch || []).filter(x => x.t === "opt");
      if (!optChoices.length) speciesVariants.push([sp, {}]);
      else {
        for (const choice of optChoices) for (const option of SP_OPTS[choice.opts] || []) {
          speciesVariants.push([sp, { [choice.k]: option.n }]);
          counts.speciesOptions++;
        }
      }
    }
    const setSpecies = ([sp, choices]) => {
      S.sp = sp; S.spChoices = { ...choices };
      for (const choice of sp.ch || []) {
        if (choice.t === "skill") S.spChoices[choice.k] = (choice.pool || ALL_SKILLS)[0];
        if (choice.t === "ofeat") S.spChoices[choice.k] = originFeatOptions().find(x => x !== S.bg?.feat) || originFeatOptions()[0];
      }
    };

    for (const cls of CLASSES) for (let level = 1; level <= 20; level++) check(`class-level ${cls.n} ${level}`, () => {
      resetFor(cls, level); counts.classLevels++;
      const ci = castInfo();
      if (PROG_2024[cls.n].caster && !ci) return false;
      if (!PROG_2024[cls.n].caster && ci) return false;
      if (ci && (ci.max < 0 || ci.max > 9 || ci.prep == null)) return false;
      hpTotal(); bonusMap(); speedInfo(); masteryCount(); slotTracker(); classSummary(); proficiencySummary14();
      return true;
    });

    for (const cls of CLASSES) for (let sub = 0; sub < PROG_2024[cls.n].subs.length; sub++) for (const level of [3, 20]) check(`subclass ${cls.n}/${sub}/${level}`, () => {
      resetFor(cls, level); S.sub = sub; counts.subclasses++;
      const name = prog()?.subs?.[S.sub]?.n; if (!name || name !== PROG_2024[cls.n].subs[sub].n) return false;
      classSummary(); castInfo(); alwaysPrepared(); slotTracker(); return true;
    });

    resetFor(CLASSES[0], 20);
    for (const variant of speciesVariants) check(`species ${variant[0].n}/${Object.values(variant[1]).join("|") || "base"}`, () => {
      setSpecies(variant); counts.speciesVariants++;
      bonusMap(); speedInfo(); speciesChoicesReady(); hpTotal(); return true;
    });
    for (const bg of BACKGROUNDS_2024) check(`background ${bg.n}`, () => {
      S.bg = bg; S.bgAbilityPicks = [bg.ab[0], bg.ab[1]]; counts.backgrounds++;
      if (bg.ab.length !== 3 || bg.sk.length !== 2 || !bg.feat || !bg.tool) return false;
      bonusMap(); proficiencySummary14(); backgroundGearText2024(); return true;
    });

    for (const cls of CLASSES) for (let sub = 0; sub < PROG_2024[cls.n].subs.length; sub++) for (const variant of speciesVariants) for (const bg of BACKGROUNDS_2024) check(`matrix ${cls.n}/${sub}/${variant[0].n}/${bg.n}`, () => {
      resetFor(cls, 20); S.sub = sub; S.bg = bg; S.bgAbilityPicks = [bg.ab[0], bg.ab[1]]; setSpecies(variant); counts.cartesian++;
      bonusMap(); finalScore("str"); hpTotal(); speedInfo(); classSummary(); proficiencySummary14(); castInfo(); slotTracker();
      if (typeof DND_INVENTORY !== "undefined") DND_INVENTORY.build(S);
      if (typeof DND_SHEET_MODEL !== "undefined") DND_SHEET_MODEL.build(S);
      return true;
    });
    return { counts, failures };
  });
  console.log(JSON.stringify(report, null, 2));
  await browser.close();
  if (report.failures.length) process.exit(1);
})().catch(error => { console.error(error); process.exit(1); });
