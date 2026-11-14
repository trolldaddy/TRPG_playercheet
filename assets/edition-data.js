(function(){
const cache={};
async function loadJson(url){const r=await fetch(url);if(!r.ok)throw Error(`${url}: HTTP ${r.status}`);return r.json()}
window.magicItemRulesDb=async function(edition=(window.S&&S.ruleset)||"2024"){
 const key=edition==="2014"?"2014":"2024";
 return cache[key]||(cache[key]=loadJson(`assets/data/magic-item-rules-${key}.json`));
};
window.magicItemCatalogDb=async function(edition=(window.S&&S.ruleset)||"2024"){
 const key=edition==="2014"?"2014":"2024",cacheKey=`catalog-${key}`;
 const data=await (cache[cacheKey]||(cache[cacheKey]=loadJson(`assets/data/magic-items-srd-${key}.json`)));
 if(data.edition!==key||data.count!==data.items?.length||data.items.some(x=>x.edition!==key||x.spellReferenceEdition!==key))throw Error(`魔法物品目錄版本驗證失敗：${key}`);
 return data;
};
window.magicItemSpellDb=async function(item){
 const rules=await window.magicItemRulesDb(item?.edition);
 if(item?.edition!==rules.spellReferenceEdition)throw Error("魔法物品與內建法術版本不一致");
 return spellDbForEdition(item.edition);
};
})();
