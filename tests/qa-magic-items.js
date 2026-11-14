const {chromium}=require("playwright");
const assert=require("assert");

(async()=>{
  const browser=await chromium.launch({headless:true,channel:"chrome"});
  const page=await browser.newPage({viewport:{width:1280,height:900}}),errors=[];
  page.on("pageerror",e=>errors.push(String(e)));
  await page.goto(process.env.QA_URL||"http://127.0.0.1:18766/index.html",{waitUntil:"networkidle"});
  const audit=await page.evaluate(async()=>{
    const a=await magicItemCatalogDb("2014"),b=await magicItemCatalogDb("2024");
    return {a:a.count,b:b.count,aBad:a.items.filter(x=>x.edition!=="2014"||x.spellReferenceEdition!=="2014").length,bBad:b.items.filter(x=>x.edition!=="2024"||x.spellReferenceEdition!=="2024").length,names:b.items.map(x=>x.name)};
  });
  assert.deepEqual({a:audit.a,b:audit.b,aBad:audit.aBad,bBad:audit.bBad},{a:362,b:277,aBad:0,bBad:0});
  for(const name of ["Bead of Nourishment","Cloak of Invisibility","Elixir of Health","Energy Bow","Gloves of Thievery","Hat of Many Spells","Potion of Invulnerability","Potion of Longevity","Potion of Vitality","Quarterstaff of the Acrobat","Rod of Resurrection","Sending Stones","Sentinel Shield","Shield of the Cavalier","Thunderous Greatclub"])assert(audit.names.includes(name),name);
  await page.evaluate(()=>{S.ruleset="2024";S.gear={armor:"",shield:false,weapons:[],items:"",magicItems:[],gold:{pp:0,gp:0,sp:0,cp:0},purchases:{}};shopFilter={q:"",cat:"魔法物品"};go(10);document.getElementById("rulesetModal")?.classList.remove("open")});
  await page.waitForSelector("[data-magic-add]");
  const ui=await page.evaluate(()=>({count:document.querySelectorAll("[data-magic-add]").length,label:document.querySelector(".shop-balance")?.textContent}));
  assert(ui.count>0);assert(ui.label.includes("2024 SRD"));
  const attunement=await page.evaluate(async()=>{
    const db=await magicItemCatalogDb("2024"),items=db.items.filter(x=>x.attunement).slice(0,4);
    items.forEach(addMagicItem);items.forEach(x=>toggleMagicAttunement(x.id));
    const inv=DND_INVENTORY.build();
    return {bag:S.gear.magicItems.length,attuned:S.gear.magicItems.filter(x=>x.attuned).length,names:items.map(x=>x.name),equipment:inv.equipment.allText,treasureField:document.querySelector('[name="Treasure"]')?.value||""};
  });
  assert.equal(attunement.bag,4);assert.equal(attunement.attuned,3);for(const name of attunement.names)assert(attunement.equipment.includes(name));assert.equal(attunement.treasureField,"");
  assert.deepEqual(errors,[]);
  console.log(JSON.stringify({catalogs:{2014:audit.a,2024:audit.b},ui,attunement},null,2));
  await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
