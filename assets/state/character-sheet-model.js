(() => {
  "use strict";
  const abilityKeys=["str","dex","con","int","wis","cha"];
  const value=id=>(document.getElementById(id)?.value||"").trim();
  const signed=n=>n>=0?`+${n}`:`${n}`;

  function classIdentity(){
    if(!S.cls)return {classes:"",subclasses:""};
    if(S.ruleset==="2014"){
      const rows=Object.entries(S.classLevels||{});
      return {classes:rows.map(([name,level])=>`${name} ${level}`).join("／"),subclasses:rows.map(([name])=>subclassNameFor(name)).filter(Boolean).join("／")};
    }
    return {classes:S.cls.n,subclasses:S.sub!=null?prog()?.subs?.[S.sub]?.n||"":""};
  }

  function build(){
    ensureClassLevels();
    const classInfo=classIdentity(),skillSet=allSkills(),saveSet=saveProfSet(),expertise=name=>hasExpertise(name),hp=syncPlayHP()||0,pools=hitDicePools(),inventory=DND_INVENTORY.build(),prof=inventory.proficiencies;
    const abilities=Object.fromEntries(abilityKeys.map(key=>{const score=finalScore(key)||10,modifier=mod(score);return [key,{score,modifier,modifierText:signed(modifier),save:modifier+(saveSet.has(key)?pb():0)+saveAura(),proficient:saveSet.has(key)}]}));
    const skills=Object.fromEntries(SKILLS.map(skill=>{const proficient=skillSet.has(skill.n),isExpert=expertise(skill.n),total=abilities[skill.a].modifier+(proficient?pb()*(isExpert?2:1):0);return [skill.n,{ability:skill.a,total,totalText:signed(total),proficient,expertise:isExpert}]}));
    const hitDice=Object.entries(pools).map(([name,pool])=>({className:name,die:pool.die,max:pool.max,remaining:S.play?.hdByClass?.[name]??pool.max}));
    return {
      ruleset:S.ruleset,
      identity:{name:value("fName"),player:value("fPlayer"),alignment:value("fAlign"),faith:value("fFaith"),age:value("fAge"),race:S.sp?.n||"",background:S.bg?.n||"",className:classInfo.classes,subclassName:classInfo.subclasses,level:S.level,size:S.sp?.size||"中型"},
      abilities,skills,
      combat:{pb:pb(),pbText:signed(pb()),ac:acInfo().total,initiative:abilities.dex.modifier,initiativeText:signed(abilities.dex.modifier),speed:speedInfo()?.total||0,hpMax:hp,hpCurrent:S.play?.hp??hp,hpTemp:S.play?.thp||0,passivePerception:10+(skills["察覺"]?.total||0),inspiration:!!S.play?.insp,deathSaves:{success:S.play?.ds?.s||0,failure:S.play?.ds?.f||0}},
      hitDice,
      hitDiceTotalText:hitDice.map(x=>`${x.max}d${x.die}`).join("／"),
      hitDiceTypeText:hitDice.map(x=>`d${x.die}`).join("／"),
      proficiencies:prof,
      inventory,
      money:{cp:inventory.money.cp||0,sp:inventory.money.sp||0,ep:0,gp:inventory.money.gp||0,pp:inventory.money.pp||0},
      bio:{appearance:S.bio?.look||"",traits:S.bio?.traits||"",ideals:S.bio?.story||"",bonds:S.bio?.allies||"",flaws:S.bio?.notes||"",backstory:S.bio?.story||"",allies:S.bio?.allies||""}
    };
  }

  window.DND_SHEET_MODEL=Object.freeze({build});
})();
