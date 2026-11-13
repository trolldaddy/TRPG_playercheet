const fs=require("fs"),path=require("path"),{chromium}=require("playwright");
const PDFLib=require(path.resolve("assets/vendor/pdf-lib.min.js"));
const url=process.env.QA_URL||"http://127.0.0.1:18766/index.html",outDir=path.resolve("tmp/pdfs");
fs.mkdirSync(outDir,{recursive:true});

async function exportCase(page,ruleset,name){
 await page.evaluate(({ruleset,name})=>{
  S.ruleset=ruleset;syncRulesetUI();S.cls=CLASSES.find(x=>x.n===(ruleset==="2014"?"戰士":"法師"));S.level=20;S.classLevels={[S.cls.n]:20};S.classSubs={};S.sub=0;S.sp=SPECIES.find(x=>x.n===(ruleset==="2014"?"矮人":"人類"))||SPECIES[0];S.bg=BACKGROUNDS[0];S.base={str:15,dex:14,con:14,int:16,wis:12,cha:10};S.bio.story=("這是一段用來驗證背景故事自動續頁且保持可編輯的長篇內容。".repeat(70))+"背景故事結尾標記";S.bio.traits="謹慎而堅定。";S.bio.allies="冒險者公會";S.gear.items=("治療藥水、繩索、火把、旅行日誌、備用口糧、".repeat(70))+"裝備結尾標記";S.play={hp:null,hpMax:null,thp:0,hd:null,hdByClass:null,ds:{s:0,f:0},insp:false,res:{},resMax:{},custom:[],notes:""};document.getElementById("fName").value=name;
  const p=ruleset==="2014"?PROG_2014[S.cls.n]:PROG[S.cls.n];Object.values(p.f).flatMap(x=>String(x).split("、")).forEach(n=>{const db=ruleset==="2014"?ALLDESC14:ALLDESC;db[n]=`${db[n]||n} ${"這項能力具有完整的觸發條件、使用次數、作用範圍與恢復方式。".repeat(ruleset==="2014"?2:8)}`});
  reconcileProgress();
 },{ruleset,name});
 const wait=page.waitForEvent("download",{timeout:120000});await page.evaluate(()=>exportOfficialCharacterSheet());const dl=await wait,file=path.join(outDir,`${name}.pdf`);await dl.saveAs(file);return file;
}

(async()=>{
 const browser=await chromium.launch({headless:true,channel:"chrome"}),page=await browser.newPage();page.on("console",msg=>console.log("browser:",msg.text()));page.on("pageerror",err=>console.error("pageerror:",err));await page.goto(url,{waitUntil:"networkidle"});
 const files=[await exportCase(page,"2014","qa-overflow-2014"),await exportCase(page,"2024","qa-overflow-2024")];await browser.close();
 const report=[];
 for(const file of files){const doc=await PDFLib.PDFDocument.load(fs.readFileSync(file)),fields=doc.getForm().getFields(),overflow=fields.filter(f=>f.getName().startsWith("overflow_")),values=overflow.map(f=>{try{return f.getText()||""}catch(_){return ""}}),allText=fields.map(f=>{try{return f.getText()||""}catch(_){return ""}}).join("\n");if(!overflow.length)throw Error(`${path.basename(file)} 未建立續頁欄位`);if(!overflow.some(f=>f.getName().includes("features")))throw Error(`${path.basename(file)} 未建立特性雙欄續頁`);if(values.some(v=>!v.trim()))throw Error(`${path.basename(file)} 含空白續頁欄位`);if(!allText.includes("背景故事結尾標記")||!allText.includes("裝備結尾標記"))throw Error(`${path.basename(file)} 續頁遺漏結尾內容`);report.push({file:path.basename(file),pages:doc.getPageCount(),overflowFields:overflow.length,formFields:fields.length})}
 console.log(JSON.stringify({status:"ok",report}));
})().catch(e=>{console.error(e);process.exit(1)});
