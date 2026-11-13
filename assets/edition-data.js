(function(){
const cache={};
async function loadJson(url){const r=await fetch(url);if(!r.ok)throw Error(`${url}: HTTP ${r.status}`);return r.json()}
window.magicItemRulesDb=async function(edition=(window.S&&S.ruleset)||"2024"){
 const key=edition==="2014"?"2014":"2024";
 return cache[key]||(cache[key]=loadJson(`assets/data/magic-item-rules-${key}.json`));
};
window.magicItemSpellDb=async function(item){
 const rules=await window.magicItemRulesDb(item?.edition);
 if(item?.edition!==rules.spellReferenceEdition)throw Error("魔法物品與內建法術版本不一致");
 return spellDbForEdition(item.edition);
};
})();
