const {chromium}=require("playwright");
const url=process.env.QA_URL||"http://127.0.0.1:18766/index.html";

(async()=>{
 const browser=await chromium.launch({headless:true,channel:"chrome"}),page=await browser.newPage();
 await page.goto(url,{waitUntil:"networkidle"});
 const result=await page.evaluate(()=>{
  S.ruleset="2014";syncRulesetUI();S.cls=CLASSES.find(x=>x.n==="盜賊");S.bg=BACKGROUNDS_2014.find(x=>x.n==="罪犯");
  S.gear={...S.gear,customLanguages:["龍語","龍語"],customTools:["煉金工具"],items:"粉筆 ×3",purchases:{"t:盜賊工具":1,"g:火把":2},weapons:["短劍"]};
  const a=DND_INVENTORY.build();
  S.ruleset="2024";syncRulesetUI();S.cls=CLASSES.find(x=>x.n==="遊俠");S.bg=BACKGROUNDS_2024.find(x=>x.n==="嚮導");S.languages24=["精靈語","龍語"];S.gear.customLanguages=["龍語","矮人語"];
  const b=DND_INVENTORY.build();
  return {a,b};
 });
 await browser.close();
 const {a,b}=result;
 if(!a.proficiencies.languages.includes("龍語")||a.proficiencies.languages.match(/龍語/g).length!==1)throw Error(`2014 language merge failed: ${a.proficiencies.languages}`);
 if(!a.proficiencies.tools.includes("煉金工具")||!a.equipment.manual.includes("粉筆")||!a.equipment.allText.includes("短劍"))throw Error("2014 tool/equipment merge failed");
 if(!b.proficiencies.languages.includes("精靈語")||!b.proficiencies.languages.includes("矮人語")||b.proficiencies.languages.match(/龍語/g).length!==1)throw Error(`2024 language merge failed: ${b.proficiencies.languages}`);
 console.log(JSON.stringify({status:"ok",languages14:a.proficiencies.languages,tools14:a.proficiencies.tools,languages24:b.proficiencies.languages}));
})().catch(e=>{console.error(e);process.exit(1)});
