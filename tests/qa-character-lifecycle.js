const {chromium}=require("playwright");
const url=process.env.QA_URL||"http://127.0.0.1:18766/index.html";

(async()=>{
 const browser=await chromium.launch({headless:true,channel:"chrome"}),page=await browser.newPage();
 await page.goto(url,{waitUntil:"networkidle"});
 const result=await page.evaluate(()=>{
  const scores={str:10,dex:12,con:14,int:16,wis:10,cha:8};
  S.ruleset="2024";syncRulesetUI();S.cls=CLASSES.find(x=>x.n==="法師");S.level=1;S.classLevels={法師:1};S.base={...scores};S.bonus={b2:"",b1:"",c1:"",c2:"",c3:""};S.play={hp:null,hpMax:null,thp:0,hd:null,hdByClass:null,ds:{s:0,f:0},insp:false,res:{},resMax:{},custom:[],notes:""};S.cantrips=new Set(["火焰箭"]);S.prepared=new Set(["魔法飛彈"]);S.spellbook=new Set(["魔法飛彈"]);reconcileProgress();
  const lv1={hp:S.play.hp,hpMax:S.play.hpMax,hd:{...S.play.hdByClass}};
  let before=hitDicePools();S.level=5;S.sub=0;S.prepared.add("火球術");S.spellbook.add("火球術");reconcileProgress(before);const lv5={hp:S.play.hp,hpMax:S.play.hpMax,hd:{...S.play.hdByClass}};
  S.play.hp=20;before=hitDicePools();S.level=6;reconcileProgress(before);const damaged={hp:S.play.hp,hpMax:S.play.hpMax};
  before=hitDicePools();S.level=1;reconcileProgress(before);const down={hp:S.play.hp,hpMax:S.play.hpMax,hd:{...S.play.hdByClass},sub:S.sub,prepared:[...S.prepared],book:[...S.spellbook]};

  S.ruleset="2014";syncRulesetUI();S.cls=CLASSES.find(x=>x.n==="聖武士");S.classLevels={聖武士:3,法師:1};S.level=4;S.sub=0;S.classSubs={法師:0};S.spellByClass={聖武士:{cantrips:[],known:["祝福術"],book:[],prepared:[]},法師:{cantrips:["火焰箭"],known:[],book:["魔法飛彈"],prepared:["魔法飛彈"]}};S.asiByClass={法師:{4:{t:"feat"}}};S.classChoices14={法師:{style:"防禦"}};S.hpRollsByClass={法師:{2:4}};S.play={hp:null,hpMax:null,thp:0,hd:null,hdByClass:null,ds:{s:0,f:0},insp:false,res:{},resMax:{},custom:[],notes:""};reconcileProgress();
  before=hitDicePools();delete S.classLevels.法師;reconcileProgress(before);const removed={level:S.level,hd:{...S.play.hdByClass},spellKeys:Object.keys(S.spellByClass),choiceKeys:Object.keys(S.classChoices14)};
  before=hitDicePools();S.classLevels.聖武士=1;reconcileProgress(before);const paladin1={level:S.level,sub:S.sub,profiles:castingProfiles2014().length,spellKeys:Object.keys(S.spellByClass),hd:{...S.play.hdByClass}};
  const saved=serialize();deserialize(saved);const reload={level:S.level,hd:{...S.play.hdByClass},spellKeys:Object.keys(S.spellByClass)};
  return {lv1,lv5,damaged,down,removed,paladin1,reload};
 });
 await browser.close();
 if(result.lv5.hd.法師!==5||result.lv5.hpMax<=result.lv1.hpMax||result.lv5.hp!==result.lv5.hpMax)throw Error(`升級同步失敗 ${JSON.stringify(result.lv5)}`);
 if(result.damaged.hp!==20)throw Error(`受傷後升級不應自動補滿：${JSON.stringify(result.damaged)}`);
 if(result.down.hd.法師!==1||result.down.sub!==null||result.down.prepared.includes("火球術")||result.down.book.includes("火球術"))throw Error(`降級清理失敗 ${JSON.stringify(result.down)}`);
 if(result.removed.level!==3||result.removed.hd.法師!=null||result.removed.spellKeys.includes("法師")||result.removed.choiceKeys.includes("法師"))throw Error(`移除兼職清理失敗 ${JSON.stringify(result.removed)}`);
 if(result.paladin1.profiles!==0||result.paladin1.sub!==null||result.paladin1.spellKeys.includes("聖武士")||result.paladin1.hd.聖武士!==1)throw Error(`2014 一級聖武士殘留 ${JSON.stringify(result.paladin1)}`);
 if(result.reload.level!==1||result.reload.hd.聖武士!==1||result.reload.spellKeys.length)throw Error(`儲存重載失敗 ${JSON.stringify(result.reload)}`);
 console.log(JSON.stringify({status:"ok",result}));
})().catch(e=>{console.error(e);process.exit(1)});
