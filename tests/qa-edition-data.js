const fs = require("fs");
const path = require("path");
const read = name => JSON.parse(fs.readFileSync(path.resolve(__dirname, `../assets/data/${name}`), "utf8"));
const a = read("magic-item-rules-2014.json"), b = read("magic-item-rules-2024.json"), failures = [];
for (const [expected, data] of [["2014", a], ["2024", b]]) {
  if (data.edition !== expected) failures.push(`${expected}: edition 錯誤`);
  if (data.spellReferenceEdition !== expected) failures.push(`${expected}: 物品內建法術串版`);
  if (!data.spellcasting || !data.activationAction) failures.push(`${expected}: 魔法物品規則不完整`);
}
if (JSON.stringify(a) === JSON.stringify(b)) failures.push("兩版魔法物品規則意外共用");
console.log(JSON.stringify({ magicItemRules: [a.edition, b.edition], failures }, null, 2));
if (failures.length) process.exit(1);
