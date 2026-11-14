const assert = require("assert");
const share = require("../assets/share/character-share.js");

(async () => {
  const source = {
    v: 7, id: "c-test", ruleset: "2014", cls: "聖武士", level: 3,
    portrait: "data:image/png;base64," + "x".repeat(5000),
    meta: { name: "測試角色" }, play: { hp: 18, thp: 2 }, slotsUsed: { l1: 1 },
    bio: { notes: "保留玩家自行輸入的文字" }
  };
  const token = await share.encode(source);
  assert.match(token, /^[gj]\./);
  const restored = await share.decode(token);
  assert.equal(restored.meta.name, source.meta.name);
  assert.equal(restored.play.hp, 18);
  assert.equal(restored.slotsUsed.l1, 1);
  assert.equal(restored.bio.notes, source.bio.notes);
  assert.equal(restored.portrait, "", "分享快照應排除大型畫像");
  assert.equal(source.portrait.startsWith("data:image"), true, "不得修改原始存檔");
  const url = await share.makeUrl(source, "https://example.test/path?x=1#old");
  assert.equal(new URL(url).pathname, "/path");
  assert.equal(share.tokenFromHash(new URL(url).hash), token);
  await assert.rejects(() => share.decode("x.bad"), /格式/);
  console.log(JSON.stringify({ status: "ok", mode: token.slice(0, 1), tokenLength: token.length, portraitOmitted: true }));
})().catch(error => { console.error(error); process.exit(1); });
