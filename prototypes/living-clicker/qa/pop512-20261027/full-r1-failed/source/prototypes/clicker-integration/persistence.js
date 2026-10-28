/* Complete, validated snapshots. Built inline by build.cjs; no production keys. */
(function(root){
  'use strict';
  const FORMAT='ant-clicker-grain-save',SCHEMA=1,MAX_BYTES=32*1024*1024;
  const roles=['worker','nurse','builder','soldier','fermenter'];
  const own=(o,k)=>Object.prototype.hasOwnProperty.call(o,k);
  function check(ok,label){if(!ok)throw new Error('Invalid save: '+label);}
  function object(v,label){check(v&&typeof v==='object'&&!Array.isArray(v),label);return v;}
  function num(v,label,min=0,max=1e15){check(typeof v==='number'&&Number.isFinite(v)&&v>=min&&v<=max,label);}
  function integer(v,label,min=0,max=Number.MAX_SAFE_INTEGER){num(v,label,min,max);check(Number.isSafeInteger(v),label);}
  function array(v,label,max=2000000){check(Array.isArray(v)&&v.length<=max,label);return v;}
  function point(v){object(v,'point');num(v.x,'x',-1e7,1e7);num(v.y,'y',-1e7,1e7);}
  function ref(v,n,label){integer(v,label,0,n-1);}
  function uniqueMap(v,label,max=2000000){const m=new Map();for(const p of array(v,label,max)){check(Array.isArray(p)&&p.length===2,label);check(!m.has(p[0]),label+' duplicate');m.set(p[0],p[1]);}return m;}
  // Reject prototype-pollution keys, nonfinite numbers and unbounded nesting before adoption.
  function tree(v,depth=0,budget={n:0}){
    check(depth<=32&&++budget.n<=4000000,'size/depth');
    if(typeof v==='number')check(Number.isFinite(v),'finite');
    else if(typeof v==='string')check(v.length<=MAX_BYTES,'string');
    else if(v&&typeof v==='object')for(const k of Object.keys(v)){
      check(!['__proto__','constructor','prototype'].includes(k),'key');tree(v[k],depth+1,budget);
    }
  }
  function permanent(p){
    object(p,'permanent');integer(p.insight,'insight');object(p.meta,'meta');
    integer(p.meta.costDown,'costDown',0,20);integer(p.meta.effUp,'effUp',0,10000);
  }
  function validate(pack,{researchDefs=[],branchIds=[],expeditionIds=[]}={},allowLegacy=false){
    tree(pack);object(pack,'pack');check(pack.v==='23.0','game version');
    const legacy=!own(pack,'format');
    check(legacy?allowLegacy:pack.format===FORMAT&&pack.schema===SCHEMA,'format/version');
    const g=object(pack.g,'game');
    for(const k of ['food','cookie','eggs','larvae','goldenEggs','goldenLarvae','eggToLarvaP','larvaToAdultP','layP','legacyBonus'])num(g[k],k);
    for(const k of ['qLv','nLv','bLv','sLv','wLv','goldenCount','goldenFingerLv','milestoneIdx','prestigeCount','raidWins','raidTotal','fermentRoomPending','cookieRoomPending','wasteRoomPending','barracksPending','venomSac'])integer(g[k],k,0,1e9);
    num(g.raidTimer,'raidTimer',-1);num(g.lastSave,'lastSave',1);
    if(g.timeScale!=null)integer(g.timeScale,'play speed',1,10);
    object(g.ants,'ants');check(Object.keys(g.ants).every(k=>roles.includes(k)),'roles');
    for(const r of roles)integer(g.ants[r],r,0,10000000);
    check(g.goldenCount<=g.ants.worker&&g.goldenEggs<=g.eggs&&g.goldenLarvae<=g.larvae,'golden subset');
    for(const k of ['tutorialDone','cookieDiscovered','unlockWasteRoom','fermentFirstStarted','fermentFirstCompleted','fermenterFirstHired','fermentCookieMade'])check(typeof g[k]==='boolean',k);
    for(const k of ['major','achievements','trophies']){object(g[k],k);for(const v of Object.values(g[k]))check(typeof v==='boolean',k);}
    for(const entry of array(g.queenLog,'diary',50)){check(typeof entry.text==='string'&&entry.text.length<=4000,'diary text');num(entry.t,'diary time');}
    object(g.soldierCaste,'caste');for(const k of ['scout','heavy'])integer(g.soldierCaste[k],k,0,100);
    object(g.globalBuffs,'global buffs');check(g.globalBuffs.activeId===null||typeof g.globalBuffs.activeId==='string','active buff');
    const rs=object(g.research,'research');check(typeof rs.unlocked==='boolean','research unlock');
    object(rs.unlockedBranches,'branches');for(const [id,v]of Object.entries(rs.unlockedBranches)){check(!branchIds.length||branchIds.includes(id),'branch ID');check(typeof v==='boolean','branch');}
    object(rs.unlockedNodes,'research nodes');for(const [id,v]of Object.entries(rs.unlockedNodes)){
      const def=researchDefs.find(d=>d.id===id);check(!researchDefs.length||def,'research ID');
      const level=typeof v==='boolean'?Number(v):v;integer(level,'research level',0,def?.max??10000);
    }
    const expeditions=new Set();for(const e of array(g.expeditions,'expeditions',1000)){
      object(e,'expedition');check(typeof e.id==='string'&&!expeditions.has(e.id),'expedition ID');expeditions.add(e.id);
      check(typeof e.destId==='string'&&(!expeditionIds.length||expeditionIds.includes(e.destId)),'destination');
      for(const k of ['workers','soldiers','startMs','returnMs','resolvedMs','workerReturn'])integer(e[k],k);
      check(e.returnMs>=e.startMs&&typeof e.resolved==='boolean','expedition time');num(e.successRate,'successRate',0,1);num(e.heavyRatio,'heavyRatio',0,1);
    }
    if(!legacy)permanent(pack.permanent);
    if(pack.world===null){check(!legacy&&pack.start==='new-colony','new colony');return pack;}
    const w=object(pack.world,'world');num(w.w,'width',1,1e6);num(w.h,'height',1,1e6);num(w.sy,'surface',0,w.h);num(w.grainDpr,'DPR',.25,8);
    check(typeof w.meshNest==='boolean'&&typeof w.meshGrowth==='boolean','world mode');
    const band=object(w.band,'band');for(const k of ['top','bottom','height','step','targetFill','targetSpan'])num(band[k],k);check(band.height>0&&band.step>0&&band.bottom>band.top,'band dimensions');integer(band.index,'band index',0,10000);integer(band.forceShaft,'shaft count',0,10000);
    object(w.season,'season');integer(w.season.idx,'season index',0,3);integer(w.season.day,'day');num(w.season.dayProgress,'day progress');
    object(w.weather,'weather');check(typeof w.weather.id==='string'&&typeof w.weather.label==='string','weather type');num(w.weather.nextChangeAt,'next weather');num(w.weather.changeTimer,'weather timer',-1e6);
    const nodes=array(w.nodes,'nodes',10000),edges=array(w.edges,'edges',20000);check(nodes.length>1,'nodes');
    for(const k of ['eid','qid','mainTipId'])ref(w[k],nodes.length,k);
    check(nodes[w.eid].type==='entrance'&&nodes[w.qid].type==='queen','entrance/queen');
    const types=['entrance','queen','nursery','food','rest','storage','soldier','ferment','cookieroom','shaft','waste'];
    nodes.forEach((n,i)=>{
      object(n,'node');check(n.id===i&&types.includes(n.type),'node ID/type');point(n);num(n.r,'radius',.01,1e5);
      for(const k of ['blob','slots']){array(n[k],k,10000).forEach(point);check(n[k].length>2,k);}
      for(const k of ['invEgg','invGoldenEgg','invFood','invCookie','invLarva','invGoldenLarva','invLarvaFood','invWaste','waste','fermentProgress','fermentInputFood'])num(n[k],k);
      for(const k of ['blobScaleX','blobScaleY'])num(n[k],k,.01,100);num(n.floorFlat,'floor',0,1);
      check(n.invGoldenEgg<=n.invEgg&&n.invGoldenLarva<=n.invLarva,'room golden subset');
    });
    for(const e of edges){ref(e.u,nodes.length,'edge u');ref(e.v,nodes.length,'edge v');for(const k of ['p0','p1','p2','p3'])point(e[k]);}
    check(array(w.nodeVis,'visibility').length===nodes.length&&w.nodeVis.every(v=>typeof v==='boolean'),'visibility');
    check(array(w.edgeFrac,'progress').length===edges.length,'edge count');w.edgeFrac.forEach(v=>num(v,'progress',0,1));
    const surface=object(w.grainSurface,'surface profile');num(surface.step,'surface step',.01,1e5);
    array(surface.pts,'surface points',10000).forEach((p,i)=>{point(p);if(i)check(p.x>surface.pts[i-1].x,'ordered surface');});check(surface.pts.length>1&&surface.pts.at(-1).x===w.w,'surface extent');
    const z=object(w.grain,'grain');check(['clicker-grain-1','clicker-grain-2'].includes(z.format),'grain format');
    for(const k of ['time','nextAt','remainder'])num(z[k],k);for(const k of ['clock','revision','nextBody'])integer(z[k],k);
    const cell=k=>{integer(k,'cell',0,65536*65536-1);const y=Math.floor(k/65536),x=k-y*65536;check(x<=Math.ceil(w.w/w.grainDpr/2)+8&&y<=Math.ceil(w.h/w.grainDpr/2)+8,'cell bounds');};
    const air=uniqueMap(z.air,'air');for(const [k,rid]of air){cell(k);ref(rid,nodes.length,'air room');}
    if(z.format==='clicker-grain-2'){
      const geo=object(z.geology,'geology');check(geo.format==='geology-1','geology version');integer(geo.seed,'geology seed',0,4294967295);num(geo.tunnelRadius,'tunnel radius',11,20);
      check(['compact-1','retained'].includes(geo.layout),'layout');check(array(geo.boundaries,'boundaries',5).length===5,'boundary count');
      geo.boundaries.forEach((v,i)=>{num(v,'boundary',1,1e6);if(i)check(v>geo.boundaries[i-1]+20,'boundary order');});
      const deposits=new Set();for(const p of array(geo.deposits,'deposits',30)){check(typeof p.id==='string'&&!deposits.has(p.id),'deposit ID');deposits.add(p.id);point(p);num(p.r,'deposit radius',1,20);integer(p.layer,'deposit layer',1,6);integer(p.reward,'deposit reward',0,10000);}
      for(const r of array(geo.rocks,'rocks',200)){point(r);num(r.rx,'rock radius',1,100);num(r.ry,'rock radius',1,100);num(r.phase,'rock shape',0,10);}
      const sight=object(z.exploration,'exploration');check(sight.format==='exploration-1','exploration version');integer(sight.reached,'reached layer',1,6);num(sight.mineAcc,'mining remainder',0,1);
      const seen=uniqueMap(sight.seen,'explored');for(const [k,d]of seen){cell(k);integer(d,'wall distance',0,6);}for(const k of air.keys())check(seen.get(k)===0,'air exploration');
      const flags={};for(const name of ['discovered','active','claimed']){const entries=array(sight[name],name,30);flags[name]=new Set(entries);check(flags[name].size===entries.length&&entries.every(id=>deposits.has(id)),name);}
      for(const id of flags.active)check(flags.discovered.has(id),'active discovery');for(const id of flags.claimed)check(flags.active.has(id),'claimed discovery');
    }
    const actors=new Map();for(const a of array(z.actors,'actors',10000)){
      integer(a.vid,'actor ID',1);check(!actors.has(a.vid),'duplicate actor');actors.set(a.vid,a);point(a);num(a.rot,'rotation',-1e7,1e7);ref(a.node,nodes.length,'actor room');
      if(a.digT!=null){ref(a.digT.eid,edges.length,'actor edge');ref(a.digT.to,nodes.length,'actor destination');}
    }
    const targets=uniqueMap(z.targets,'targets',20000),jobs=uniqueMap(z.jobs,'jobs',10000);
    if(z.assignments===null)check(!jobs.size&&!targets.size,'unassigned jobs');
    else{
      object(z.assignments,'assignments');object(z.assignments.targets,'assigned targets');object(z.assignments.stats,'assignment stats');
      for(const t of Object.values(z.assignments.targets)){ref(t.eid,edges.length,'assignment edge');ref(t.to,nodes.length,'assignment destination');}
    }
    for(const [id,t]of targets){
      ref(id,edges.length,'target ID');check(id===t.eid,'target edge');ref(t.to,nodes.length,'target room');check(t.to===edges[id].u||t.to===edges[id].v,'target adjacency');
      if(t.reservation!=null)check(t.reservation===({ferment:'fermentRoomPending',cookieroom:'cookieRoomPending',soldier:'barracksPending',waste:'wasteRoomPending'})[nodes[t.to].type],'reservation type');
      const grains=array(t.grains,'target grains');grains.forEach(cell);check(new Set(grains).size===grains.length&&t.total===grains.length,'target total');
      integer(t.delivered,'target delivered',0,t.total);integer(t.cleared,'target cleared',0,t.total);check(t.delivered<=t.cleared,'target ledger');
      num(t.base,'base progress',0,1);integer(t.rewarded,'reward progress',0,50);if(t.scanIndex!=null)integer(t.scanIndex,'scan cursor',0,t.total);
      for(const [k,rid]of uniqueMap(t.mask,'target mask')){cell(k);ref(rid,nodes.length,'target mask room');}
    }
    const bodies=new Map(),sources=new Set();let delivered=0,maxBody=0;
    for(const b of array(z.bodies,'soil bodies')){
      integer(b.id,'body ID',1);check(!bodies.has(b.id),'duplicate body');bodies.set(b.id,b);maxBody=Math.max(maxBody,b.id);
      check(b.kind==='soil'&&['cargo','delivered'].includes(b.state),'body kind/state');cell(b.source);check(!sources.has(b.source)&&air.has(b.source),'source ledger');sources.add(b.source);
      for(const k of ['x','y','vx','vy'])num(b[k],k,-1e7,1e7);num(b.rest,'rest');check([1,2].includes(b.material),'material');
      if(b.state==='delivered'){delivered++;check(b.carrier===0,'delivered carrier');}else check(actors.has(b.carrier),'body owner');
    }
    check(z.nextBody>maxBody,'next body ID');
    const cargo=new Set(),reserved=new Set(),bodyBySource=new Map([...bodies.values()].map(b=>[b.source,b]));for(const [id,j]of jobs){
      check(id===j.id&&actors.has(id),'job owner');check(targets.has(j.eid)&&j.to===targets.get(j.eid).to,'job target');
      check(['travel','dig','back','haul','unload'].includes(j.phase),'job phase');point(j.pose);point(j.back);if(j.dump)point(j.dump);
      num(j.pose.rot,'dig rotation',-1e7,1e7);check(j.dir===1||j.dir===-1,'dig direction');if(['haul','unload'].includes(j.phase))point(j.dump);
      array(j.route,'route',10000).forEach(point);integer(j.next,'route cursor',0,j.route.length);num(j.stroke,'stroke');
      const grains=array(j.grains,'job grains',4);check(grains.length>0&&new Set(grains).size===grains.length,'job grains');integer(j.cursor,'dig cursor',0,grains.length);
      const targetGrains=new Set(targets.get(j.eid).grains);grains.forEach(k=>check(targetGrains.has(k),'job source'));
      check(j.cargo.length===j.cursor,'cargo cursor');grains.forEach((k,i)=>{
        check(!reserved.has(k),'duplicate reservation');reserved.add(k);
        if(i<j.cursor)check(air.has(k)&&bodyBySource.get(k)?.carrier===id,'picked source');else check(!air.has(k),'unpicked source');
      });
      for(const bid of array(j.cargo,'cargo',4)){const b=bodies.get(bid);check(b&&b.carrier===id&&b.state==='cargo'&&!cargo.has(bid)&&grains.includes(b.source),'cargo reference');cargo.add(bid);}
      if(j.pickup)check(j.cargo.includes(j.pickup.id),'pickup reference');
    }
    check(cargo.size===bodies.size-delivered,'unowned cargo');
    object(z.stats,'grain stats');check(z.stats.dug===bodies.size&&z.stats.delivered===delivered,'grain ledger');integer(z.stats.completed,'completed',0,edges.length);
    return pack;
  }
  function create(api){
    let recovery=null,blocked=false,legacy=false,originalRaw=null,lastError=null,rejectedRaw=null;
    const fail=e=>{lastError=String(e);api.onError?.(e);return false;};
    const normalized=p=>{validate(p,api.rules);return p;};
    const core=p=>{const q=structuredClone(p);delete q.recovery;return q;};
    function capture(){return normalized({format:FORMAT,schema:SCHEMA,v:'23.0',...structuredClone(api.capture())});}
    function write(pack){
      if(rejectedRaw&&!pack.rejectedRaw)pack.rejectedRaw=rejectedRaw;
      normalized(pack);const raw=JSON.stringify(pack);check(raw.length<=MAX_BYTES,'size');
      // localStorage.setItem is atomic. The previous colony and the new state share this write.
      api.storage.setItem(api.key,raw);originalRaw=raw;recovery=pack.recovery||null;rejectedRaw=pack.rejectedRaw||null;blocked=false;lastError=null;api.onSaved?.(pack);return true;
    }
    function load(){
      try{
        originalRaw=api.storage.getItem(api.key);if(!originalRaw){const p=api.legacyPermanent();permanent(p);api.applyPermanent(p);legacy=true;return null;}
        check(originalRaw.length<=MAX_BYTES,'size');const pack=JSON.parse(originalRaw);legacy=!own(pack,'format');validate(pack,api.rules,legacy);
        if(legacy){pack.format=FORMAT;pack.schema=SCHEMA;pack.permanent=api.legacyPermanent();permanent(pack.permanent);}
        if(pack.recovery){validate(pack.recovery,api.rules);check(!pack.recovery.recovery,'nested recovery');recovery=pack.recovery;}
        if(pack.rejectedRaw){check(typeof pack.rejectedRaw==='string','rejected raw');rejectedRaw=pack.rejectedRaw;}
        api.applyPermanent(pack.permanent);return pack;
      }catch(e){lastError=String(e);blocked=true;api.onBlocked?.(e);return null;}
    }
    function save(){if(blocked)return fail(new Error('Save protected'));try{const p=capture();if(recovery)p.recovery=recovery;return write(p);}catch(e){return fail(e);}}
    function decode(code){
      check(typeof code==='string'&&code.length<=MAX_BYTES*1.4,'encoded size');const trimmed=code.trim();
      const raw=trimmed.startsWith('{')?trimmed:new TextDecoder('utf-8',{fatal:true}).decode(Uint8Array.from(atob(trimmed),c=>c.charCodeAt(0)));
      check(raw.length<=MAX_BYTES,'size');return normalized(JSON.parse(raw));
    }
    function encode(pack){const bytes=new TextEncoder().encode(JSON.stringify(pack));let s='';for(let i=0;i<bytes.length;i+=32768)s+=String.fromCharCode(...bytes.subarray(i,i+32768));return btoa(s);}
    function importCode(code){
      try{
        const incoming=core(decode(code));incoming.g.lastSave=Date.now();
        if(!blocked)incoming.recovery=capture(); // includes unsaved purchases and cargo, not only last storage.
        else if(originalRaw)incoming.rejectedRaw=originalRaw; // preserve unreadable data for recovery/export.
        if(write(incoming)){blocked=true;api.onReload?.();return true;}
      }catch(e){return fail(e);}return false;
    }
    function replace(pack){
      if(blocked)return false;
      try{const p=core(pack);p.recovery=capture();if(write(p)){blocked=true;api.onReload?.();return true;}}catch(e){return fail(e);}return false;
    }
    function undo(){if(!recovery)return false;try{const p=core(recovery);p.g.lastSave=Date.now();if(!blocked)p.recovery=capture();if(write(p)){blocked=true;api.onReload?.();return true;}}catch(e){return fail(e);}return false;}
    function recoverFresh(pack){if(!blocked)return false;try{const p=core(pack);if(originalRaw)p.rejectedRaw=originalRaw;if(write(p)){blocked=true;api.onReload?.();return true;}}catch(e){return fail(e);}return false;}
    return {load,save,capture,decode,encode,importCode,replace,undo,recoverFresh,validate:p=>normalized(p),get blocked(){return blocked;},get legacy(){return legacy;},get raw(){return originalRaw;},get recovery(){return recovery;},get lastError(){return lastError;}};
  }
  root.ClickerPersistence={create,validate,FORMAT,SCHEMA};
  if(typeof module!=='undefined')module.exports=root.ClickerPersistence;
})(globalThis);
