(() => {
  "use strict";
  const list=value=>Array.isArray(value)?value.filter(Boolean):String(value||"").split(/[、,，\n]+/).map(x=>x.trim()).filter(Boolean);
  const unique=values=>[...new Set(values.flatMap(list))];

  function build(){
    const prof=typeof proficiencySummary14==="function"?proficiencySummary14():{armor:"無",weapons:"無",tools:"無",languages:"無"};
    const purchases=typeof shopBought==="function"?shopBought():{},catalog=typeof shopCatalog==="function"?new Map(shopCatalog().map(x=>[x.id,x])):new Map();
    const bought={武器:[],護甲:[],工具:[],冒險用品:[]};
    Object.entries(purchases).forEach(([id,qty])=>{const item=catalog.get(id);if(item&&bought[item.cat])bought[item.cat].push(item.n+(qty>1?` ×${qty}`:""))});
    const classGear=S.ruleset==="2014"?(typeof expandedStartingGear2014==="function"?expandedStartingGear2014():{raw:"",packs:[]}):{raw:typeof resolvedStartingGear2024==="function"?resolvedStartingGear2024():"",packs:[]};
    const backgroundGear=S.ruleset==="2014"?(BG14_DETAILS?.[S.bg?.n]?.gear||""):(typeof backgroundGearText2024==="function"?backgroundGearText2024():"");
    const tools=unique([prof.tools==="無"?[]:prof.tools,S.gear?.customTools]);
    const languages=unique([prof.languages==="無"?[]:prof.languages,S.gear?.customLanguages]);
    const equipmentRows=[classGear.raw,...(classGear.packs||[]),backgroundGear,bought.工具.join("、"),bought.冒險用品.join("、"),S.gear?.items].filter(Boolean);
    const allEquipment=unique([equipmentRows,S.gear?.armor,S.gear?.shield?"盾牌":[],S.gear?.weapons]);
    return {
      proficiencies:{armor:prof.armor||"無",weapons:prof.weapons||"無",tools:tools.join("、")||"無",languages:languages.join("、")||"無"},
      equipment:{classGear:classGear.raw||"",packs:classGear.packs||[],backgroundGear,bought,manual:S.gear?.items||"",armor:S.gear?.armor||"",shield:!!S.gear?.shield,weapons:[...(S.gear?.weapons||[])],rows:equipmentRows,allText:allEquipment.join("、")},
      money:{...(S.gear?.gold||{pp:0,gp:0,sp:0,cp:0})}
    };
  }

  window.DND_INVENTORY=Object.freeze({build,list});
})();
