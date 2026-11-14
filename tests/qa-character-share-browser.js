const { chromium } = require("playwright");
const url = process.env.QA_URL || "http://127.0.0.1:18766/index.html";

(async () => {
  const browser = await chromium.launch({ headless: true, channel: "chrome" });
  const context = await browser.newContext({ viewport: { width: 430, height: 900 } });
  const page = await context.newPage(), errors = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto(url, { waitUntil: "networkidle" });
  await page.waitForFunction(() => typeof openShareModal === "function");
  const created = await page.evaluate(async () => {
    document.getElementById("quickRuleset").value = "2024";
    renderQuickBuildOptions();
    document.getElementById("quickClass").value = "戰士";
    renderQuickBuildOptions();
    document.getElementById("quickName").value = "分享測試戰士";
    await createQuickCharacter();
    closeQuickGuide();
    S.play.hp = 7;
    S.play.thp = 3;
    await openShareModal();
    return {
      id: S.id,
      href: document.getElementById("shareUrl").value,
      modal: document.getElementById("shareModal").classList.contains("open"),
      qr: Boolean(document.querySelector("#shareQr svg")),
      importHidden: document.getElementById("shareImport").hidden
    };
  });
  if (!created.modal || !created.qr || !created.importHidden || !created.href.includes("#character=g.")) {
    throw new Error(`建立分享快照失敗: ${JSON.stringify(created)}`);
  }

  const receiver = await browser.newContext({ viewport: { width: 430, height: 900 } });
  const received = await receiver.newPage();
  received.on("pageerror", error => errors.push(error.message));
  await received.goto(created.href, { waitUntil: "networkidle" });
  await received.waitForSelector("#shareModal.open");
  const preview = await received.evaluate(() => ({
    title: document.getElementById("shareTitle").textContent,
    summary: document.getElementById("shareSummary").textContent,
    importVisible: !document.getElementById("shareImport").hidden,
    rosterBefore: getRoster().length
  }));
  if (preview.title !== "收到角色快照" || !preview.summary.includes("分享測試戰士") || !preview.importVisible || preview.rosterBefore !== 0) {
    throw new Error(`接收預覽不正確: ${JSON.stringify(preview)}`);
  }
  await received.click("#shareImport");
  await received.waitForFunction(() => document.body.classList.contains("play-mode"));
  const imported = await received.evaluate(() => ({
    id: S.id,
    hp: S.play.hp,
    thp: S.play.thp,
    name: document.getElementById("fName").value,
    roster: getRoster().length,
    hash: location.hash,
    record: Boolean(JSON.parse(localStorage.getItem(`dnd5r:record:${S.id}`) || "null"))
  }));
  if (imported.id === created.id || imported.hp !== 7 || imported.thp !== 3 || imported.name !== "分享測試戰士" || imported.roster !== 1 || imported.hash || !imported.record) {
    throw new Error(`分享副本匯入不正確: ${JSON.stringify(imported)}`);
  }
  if (errors.length) throw new Error(`頁面錯誤: ${errors.join(" | ")}`);
  await browser.close();
  console.log(JSON.stringify({ status: "ok", qr: true, imported: true, runtimePreserved: true }));
})().catch(error => { console.error(error); process.exit(1); });
