const fs = require("fs");
const path = require("path");
const spells = JSON.parse(fs.readFileSync(path.resolve(__dirname, "../assets/data/spells-phb-2014.json"), "utf8")).spell;
const required = ["name", "ENG_name", "level", "school", "time", "range", "components", "duration", "entries"];
const failures = [], ids = new Set();
for (const spell of spells) {
  for (const key of required) { const value=spell[key]; if(value==null||value===""||(Array.isArray(value)&&!value.length)) failures.push(`${spell.name||"(無名)"}: 缺少 ${key}`); }
  const id=String(spell.ENG_name||"").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");
  if(!id||ids.has(id)) failures.push(`${spell.name}: 英文識別碼無效或重複 (${id})`); ids.add(id);
}
console.log(JSON.stringify({spells:spells.length,uniqueIds:ids.size,failures},null,2));
if(failures.length)process.exit(1);
