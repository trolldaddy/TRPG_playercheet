const { chromium } = require("playwright");

const url = process.env.QA_URL || "http://127.0.0.1:18766/index.html";

(async () => {
  const browser = await chromium.launch({ headless: true, channel: "chrome" });
  const page = await browser.newPage();
  await page.goto(url, { waitUntil: "networkidle" });
  const report = await page.evaluate(() => {
    const failures = [], counts = { classes: 0, subclasses: 0, speciesVariants: 0, speciesChoices: 0, backgrounds: 0, multiclassOrdered: 0, cartesian: 0 };
    const check = (label, fn) => { try { const result = fn(); if (result === false) throw new Error("assertion failed"); } catch (error) { failures.push(`${label}: ${error.message}`); } };
    const chooseSpecies = (sp, subrace = null) => {
      S.sp = sp; S.spChoices = {};
      const usedAbilities = new Set(), usedSkills = new Set();
      for (const choice of sp.ch || []) {
        if (choice.t === "subrace") S.spChoices[choice.k] = subrace || choice.opts[0];
        else if (choice.t === "ability") { const keys = Object.keys(ABN), key = keys.find(x => !usedAbilities.has(x) && x !== "cha") || keys.find(x => !usedAbilities.has(x)); S.spChoices[choice.k] = key; usedAbilities.add(key); }
        else if (choice.t === "skill") { const skill = ALL_SKILLS.find(x => !usedSkills.has(x)); S.spChoices[choice.k] = skill; usedSkills.add(skill); }
        else if (choice.t === "spell") { const spell = spellsFor(choice.code, choice.level || 0)[0]; if (spell) S.spChoices[choice.k] = spell.n; }
        else if (Array.isArray(choice.opts)) S.spChoices[choice.k] = choice.opts[0];
      }
    };
    const chooseBackground = bg => {
      S.bg = bg; S.bgChoices14 = {};
      for (const choice of BG14_DETAILS[bg.n]?.choices || []) S.bgChoices14[choice.k] = choice.o.find(x => !Object.values(S.bgChoices14).includes(x)) || choice.o[0];
    };
    const chooseClass = (primary, levels) => {
      S.cls = primary; S.classLevels = { ...levels }; S.level = Object.values(levels).reduce((a, b) => a + b, 0); S.classSubs = {}; S.sub = null;
      S.classChoices14 = {}; S.spellByClass = {}; S.asiByClass = {}; S.startGear14 = {}; S.slotsUsed = {}; S.skills = new Set(primary.sk.slice(0, primary.skc));
      S.gear = { armor: "", unarmored: "auto", shield: false, weapons: [], miscAC: 0, miscLabel: "", items: "", gold: { pp: 0, gp: 0, sp: 0, cp: 0 } };
    };
    S.ruleset = "2014"; syncRulesetUI();
    chooseSpecies(SPECIES_2014.find(x => x.n === "人類")); chooseBackground(BACKGROUNDS_2014[0]);

    for (const cls of CLASSES) for (const level of [1, 2, 3, 20]) check(`class ${cls.n} ${level}`, () => {
      chooseClass(cls, { [cls.n]: level }); counts.classes++;
      const profiles = castingProfiles2014(), casterLevel = multiclassCasterLevel();
      if (["聖武士", "遊俠"].includes(cls.n) && level === 1 && (profiles.length || casterLevel)) return false;
      if (["聖武士", "遊俠"].includes(cls.n) && level === 2 && (!profiles.length || casterLevel !== 1)) return false;
      if (!["吟遊詩人", "牧師", "德魯伊", "聖武士", "遊俠", "術士", "邪術師", "法師"].includes(cls.n) && profiles.length) return false;
      classSummary(); proficiencySummary14(); startingGearText2014(); slotTracker(); return true;
    });

    for (const cls of CLASSES) for (let i = 0; i < (PROG_2014[cls.n]?.subs || []).length; i++) check(`subclass ${cls.n} ${i}`, () => {
      const level = PHB14_SUB_AT[cls.n] || 3; chooseClass(cls, { [cls.n]: level }); S.sub = i; counts.subclasses++;
      if (!subclassNameFor(cls.n)) return false; castingProfiles2014(); fixedSpells2014(cls.n); classChoiceSummaryAll14(cls.n); return true;
    });

    const speciesVariants = [];
    for (const sp of SPECIES_2014) {
      const sub = (sp.ch || []).find(x => x.t === "subrace");
      if (sub) for (const option of sub.opts) speciesVariants.push([sp, option]); else speciesVariants.push([sp, null]);
      for (const choice of sp.ch || []) for (const option of choice.opts || []) check(`species choice ${sp.n} ${choice.k} ${option}`, () => { chooseSpecies(sp); S.spChoices[choice.k] = option; counts.speciesChoices++; bonusMap(); speedInfo(); speciesChoicesReady(); return true; });
    }
    for (const [sp, subrace] of speciesVariants) check(`species ${sp.n} ${subrace || "base"}`, () => {
      chooseSpecies(sp, subrace); counts.speciesVariants++; bonusMap(); speedInfo(); speciesChoicesReady(); speciesAbilityChoicesReady14(); speciesSkillChoices14(); return true;
    });

    for (const bg of BACKGROUNDS_2014) check(`background ${bg.n}`, () => {
      chooseBackground(bg); counts.backgrounds++; if (!backgroundChoicesReady14()) return false;
      const details = BG14_DETAILS[bg.n]; if (!details?.gear || !bg.feature || bg.sk.length !== 2) return false; proficiencySummary14(); return true;
    });

    for (const primary of CLASSES) for (const secondary of CLASSES) if (primary !== secondary) check(`multiclass ${primary.n}/${secondary.n}`, () => {
      chooseClass(primary, { [primary.n]: 3, [secondary.n]: 3 }); counts.multiclassOrdered++;
      const profiles = castingProfiles2014(), casterLevel = multiclassCasterLevel(), expected = [primary, secondary].reduce((n, c) => n + (["吟遊詩人", "牧師", "德魯伊", "術士", "法師"].includes(c.n) ? 3 : ["聖武士", "遊俠"].includes(c.n) ? 1 : 0), 0);
      if (casterLevel !== expected) return false; classSummary(); proficiencySummary14(); slotTracker(); profiles.forEach(x => spellStore2014(x.name)); return true;
    });

    for (const cls of CLASSES) for (const [sp, subrace] of speciesVariants) for (const bg of BACKGROUNDS_2014) check(`matrix ${cls.n}/${sp.n}/${subrace || "base"}/${bg.n}`, () => {
      chooseClass(cls, { [cls.n]: 1 }); chooseSpecies(sp, subrace); chooseBackground(bg); counts.cartesian++;
      bonusMap(); finalScore("str"); hpTotal(); speedInfo(); proficiencySummary14(); startingGearText2014(); castingProfiles2014(); slotTracker(); return true;
    });

    check("2014 has no weapon mastery", () => masteryCount() === 0);
    check("2014 paladin 1 no spells after stale 2024 state", () => {
      const cls = CLASSES.find(x => x.n === "聖武士"); chooseClass(cls, { 聖武士: 1 }); S.cantrips = new Set(["聖光術"]); S.prepared = new Set(["祝福術"]); S.slotsUsed = { l1: 1 };
      return castingProfiles2014().length === 0 && multiclassCasterLevel() === 0 && slotTracker() === "";
    });
    return { counts, failures };
  });
  console.log(JSON.stringify(report, null, 2));
  await browser.close();
  if (report.failures.length) process.exit(1);
})().catch(error => { console.error(error); process.exit(1); });
