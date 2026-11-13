const { chromium } = require("playwright");
const path = require("path");

const url = process.env.QA_URL || `file:///${path.resolve("index.html").replace(/\\/g, "/")}`;

(async () => {
  const browser = await chromium.launch({ headless: true, channel: "chrome" });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  await page.goto(url, { waitUntil: url.startsWith("file:") ? "load" : "networkidle" });
  await page.waitForTimeout(700);
  const report = await page.evaluate(async () => {
    if (typeof ensureSpellDataReady === "function") await ensureSpellDataReady("2014");
    const failures = [], editions = {};
    const casterLevel = { B: 20, C: 20, D: 20, P: 20, R: 20, S: 20, K: 20, W: 20 };
    const maxLevel = { B: 9, C: 9, D: 9, P: 5, R: 5, S: 9, K: 9, W: 9 };
    for (const ruleset of ["2014", "2024"]) {
      S.ruleset = ruleset; syncRulesetUI();
      const db = spellDb(), meta = spellMetaDb();
      const names = new Set(), duplicate = [], bad = [], inaccessible = [];
      for (const sp of db) {
        if (names.has(sp.n)) duplicate.push(sp.n); names.add(sp.n);
        const m = meta[sp.n] || {};
        if (!sp.n || sp.lv < 0 || sp.lv > 9 || !sp.cls || !sp.d || sp.d === "PHB 2014 法術") bad.push(`${sp.n || "(無名)"}:基本資料`);
        if ([m.school, m.time, m.range, m.comp, m.dur, sp.d].some(x => !x || /\?|undefined|null/.test(String(x)))) bad.push(`${sp.n}:顯示資料`);
        if (m.edition !== ruleset || sp.edition !== ruleset || !m.id || !sp.id) bad.push(`${sp.n}:版本識別`);
        const legal = [...sp.cls].some(code => maxLevel[code] >= sp.lv && spellsFor(code, sp.lv).some(x => x.n === sp.n));
        if (!legal) inaccessible.push(sp.n);
      }
      document.getElementById("srefQ").value = ""; document.getElementById("srefLv").value = "all"; document.getElementById("srefCls").value = "all";
      renderSpellRefList();
      const entries = [...document.querySelectorAll("#srefBody .sref-entry")];
      const rendered = new Set(entries.map(x => x.querySelector(".sr-name")?.textContent.trim()));
      const missingRender = db.filter(x => !rendered.has(x.n)).map(x => x.n);
      const badRender = entries.filter(x => /\?{2,}|undefined|null/.test(x.textContent) || !x.querySelector(".sr-d")?.textContent.trim()).map(x => x.id);
      let hoverFailures = 0;
      for (const sp of db) {
        const probe = document.createElement("span"); probe.className = "sref"; probe.dataset.sref = sp.n; probe.textContent = sp.n; document.body.appendChild(probe);
        probe.dispatchEvent(new MouseEvent("mouseover", { bubbles: true }));
        if (spellTip.style.display !== "block" || !spellTip.textContent.includes(sp.n) || !spellTip.querySelector(".tip-d")?.textContent.trim()) hoverFailures++;
        probe.remove();
      }
      const perClass = {};
      for (const [code, level] of Object.entries(casterLevel)) {
        perClass[code] = db.filter(sp => sp.cls.includes(code) && sp.lv <= maxLevel[code]).length;
        if (!perClass[code]) failures.push(`${ruleset} ${code} 沒有合法法術`);
      }
      if (duplicate.length) failures.push(`${ruleset} 重複法術：${duplicate.join("、")}`);
      if (bad.length) failures.push(`${ruleset} 不完整法術資料 ${bad.length} 筆：${bad.slice(0, 12).join("、")}`);
      if (inaccessible.length) failures.push(`${ruleset} 無合法職業可取得 ${inaccessible.length} 道：${inaccessible.slice(0, 12).join("、")}`);
      if (missingRender.length) failures.push(`${ruleset} 速查未渲染 ${missingRender.length} 道：${missingRender.slice(0, 12).join("、")}`);
      if (badRender.length) failures.push(`${ruleset} 速查顯示異常 ${badRender.length} 筆`);
      if (hoverFailures) failures.push(`${ruleset} 懸浮詳情失敗 ${hoverFailures} 道`);
      editions[ruleset] = { spells: db.length, rendered: entries.length, hoverChecked: db.length, perClass };
    }
    return { editions, failures };
  });
  console.log(JSON.stringify(report, null, 2));
  await browser.close();
  if (report.failures.length) process.exit(1);
})().catch(error => { console.error(error); process.exit(1); });
