(() => {
  "use strict";

  const clampLevel=value=>Math.max(1,Math.min(20,Math.trunc(+value||1)));

  function normalizeClassProgress(state,knownClasses=[]){
    if(!state?.cls)return state;
    const valid=new Set(knownClasses.map(c=>c.n));
    if(state.ruleset!=="2014"){
      state.level=clampLevel(state.level);
      state.classLevels={[state.cls.n]:state.level};
      return state;
    }
    const source=state.classLevels&&typeof state.classLevels==="object"?state.classLevels:{};
    const clean={};
    Object.entries(source).forEach(([name,value])=>{
      const level=Math.max(0,Math.min(20,Math.trunc(+value||0)));
      if(level&&(!valid.size||valid.has(name)))clean[name]=level;
    });
    if(!clean[state.cls.n])clean[state.cls.n]=1;
    let total=Object.values(clean).reduce((sum,n)=>sum+n,0);
    if(total>20){
      let overflow=total-20;
      Object.keys(clean).reverse().forEach(name=>{
        if(!overflow)return;
        const floor=name===state.cls.n?1:0,cut=Math.min(overflow,clean[name]-floor);
        clean[name]-=cut;overflow-=cut;if(clean[name]===0)delete clean[name];
      });
      total=Object.values(clean).reduce((sum,n)=>sum+n,0);
    }
    state.classLevels=clean;
    state.level=clampLevel(total);
    return state;
  }

  function hitDicePools(state,knownClasses=[]){
    if(!state?.cls)return {};
    const dice=new Map(knownClasses.map(c=>[c.n,c.hd]));
    if(state.ruleset!=="2014")return {[state.cls.n]:{die:dice.get(state.cls.n)||state.cls.hd||0,max:clampLevel(state.level)}};
    return Object.fromEntries(Object.entries(state.classLevels||{}).filter(([,level])=>+level>0).map(([name,level])=>[name,{die:dice.get(name)||0,max:+level}]));
  }

  function syncHitDice(state,knownClasses=[],beforePools=null){
    if(!state?.play)return {};
    const after=hitDicePools(state,knownClasses),play=state.play;
    let remaining=play.hdByClass&&typeof play.hdByClass==="object"&&Object.keys(play.hdByClass).length?{...play.hdByClass}:null;
    if(!remaining){
      remaining={};
      let legacy=play.hd==null?Object.values(after).reduce((n,p)=>n+p.max,0):Math.max(0,Math.trunc(+play.hd||0));
      Object.entries(after).forEach(([name,pool])=>{remaining[name]=Math.min(pool.max,legacy);legacy-=remaining[name]});
    }
    const previous=beforePools||after;
    const next={};
    Object.entries(after).forEach(([name,pool])=>{
      const oldMax=previous[name]?.max||0,oldLeft=Math.max(0,+remaining[name]||0);
      next[name]=Math.min(pool.max,oldLeft+Math.max(0,pool.max-oldMax));
    });
    play.hdByClass=next;
    play.hd=Object.values(next).reduce((sum,n)=>sum+n,0);
    return after;
  }

  function changeHitDie(state,knownClasses,name,delta){
    const pools=syncHitDice(state,knownClasses),pool=pools[name];
    if(!pool)return;
    state.play.hdByClass[name]=Math.max(0,Math.min(pool.max,(+state.play.hdByClass[name]||0)+Math.sign(delta)));
    state.play.hd=Object.values(state.play.hdByClass).reduce((sum,n)=>sum+n,0);
  }

  window.DND_STATE=Object.freeze({normalizeClassProgress,hitDicePools,syncHitDice,changeHitDie});
})();
