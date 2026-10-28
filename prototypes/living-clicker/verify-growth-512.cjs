const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),cp=require('node:child_process'),assert=require('node:assert/strict'),crypto=require('node:crypto'),G=require('./game.js');
const qa=path.join(__dirname,'qa'),sha=b=>crypto.createHash('sha256').update(b).digest('hex'),bytes=fs.readFileSync(path.join(qa,'before-512.json')),load=()=>G.Simulation.restore(JSON.parse(bytes)),results=[];
function test(name,fn){const detail=fn()||{};results.push({name,pass:true,...detail});console.log('PASS '+name);}
test('third-stage-needs-actual-layer3-and-two-hundred-living-workers',()=>{
 const old=G.Simulation.restore(JSON.parse(fs.readFileSync(path.join(qa,'world-256.json'))));assert.equal(old.progress.reached,2);assert.equal(old.researchStatus('queen_embrace'),'locked');assert(old.buyResearch('geo_depth_3'));assert.equal(old.depthAbility(),4);assert.equal(old.progress.reached,2);assert.equal(old.buyResearch('queen_embrace'),false);
 const s=load();assert.equal(s.researchStatus('queen_embrace'),'ready');assert.deepEqual(s.researchRequirements('queen_embrace'),{minAnts:200,reached:3});const workers=s.ants;s.ants=workers.slice(0,199);assert.equal(s.researchStatus('queen_embrace'),'locked');s.ants=workers.slice(0,200);assert.equal(s.researchStatus('queen_embrace'),'ready');
});
test('third-stage-pays-real-price-and-keeps-air-and-lives-unchanged',()=>{
 const s=load(),p=s.dump(),food=s.availableFood().length,cookie=s.progress.cookie,rate=s.layRate();assert.deepEqual(s.researchCost('queen_embrace'),{food:96,cookie:42});assert(s.buyResearch('queen_embrace'));
 assert.equal(s.populationLimit(),512);assert.equal(s.layRate(),rate*2);assert.equal(s.forageInterval(),1.5);assert.equal(s.availableFood().length,food-96);assert.equal(s.progress.cookie,cookie-42);
 const after=s.dump();assert.deepEqual(after.world.grains,p.world.grains);assert.deepEqual(after.world.ants,p.world.ants);assert.deepEqual(after.colony.brood,p.colony.brood);assert.equal(s.colony.stats.spent,p.colony.stats.spent+96);assert.equal(s.progress.spentCookie,p.progress.spentCookie+42);
 assert.equal(s.researchStatus('queen_embrace'),'done');assert(!s.buyResearch('queen_embrace'));assert(s.researchDescription('queen_embrace').includes('512'));assert.deepEqual(G.Simulation.restore(after).dump(),after);
 return {cap:512,food:96,cookie:42};
});
test('room-demand-can-use-four-real-sites-only-in-stage3',()=>{
 const s=load();assert.equal(s.restParallel(),2);assert(s.buyResearch('queen_embrace'));assert.equal(s.restParallel(),4);
 const pressure=JSON.parse(fs.readFileSync(path.join(qa,'housing-512-pressure.json'))).state,real=G.Simulation.restore(pressure),beforeRooms=real.rooms.length,air=real.grains.slice();assert.equal(real.ants.length,489);assert.equal(real.crowding().length,170);
 for(let k=0;k<4;k++)real.ensureRestRoom();assert.equal(real.rooms.length,beforeRooms+2);assert(real.builds.slice(beforeRooms).every(b=>b.mode==='passage'&&!b.complete));assert.deepEqual(real.grains,air);assert.equal(real.ants.length,489);real.assertLedger();real.assertProgress();
 const capped=G.Simulation.restore(pressure);capped.restParallel=()=>2;for(let k=0;k<4;k++)capped.ensureRestRoom();assert.equal(capped.rooms.length,beforeRooms);
 let surveyed=0;const host={time:100,rooms:Array(8).fill({}),builds:Array.from({length:8},()=>({complete:false})),roomIds:()=>[2,3,4,5],roomKind:()=> 'rest',crowding:()=>Array(120),restParallel:()=>4,restRoomSite:()=>{surveyed++;return null;},depthAbility:()=>4,log:()=>{}};
 G.Simulation.prototype.ensureRestRoom.call(host);assert.equal(surveyed,0);host.roomIds=()=>[2,3,4];G.Simulation.prototype.ensureRestRoom.call(host);assert.equal(surveyed,1);host.crowding=()=>[];G.Simulation.prototype.ensureRestRoom.call(host);assert.equal(surveyed,1);host.crowding=()=>Array(120);host.restParallel=()=>2;G.Simulation.prototype.ensureRestRoom.call(host);assert.equal(surveyed,1);
 return {realAnts:489,crowded:170,newPlans:2,noAirOpened:true};
});
test('third-stage-care-is-bounded-by-finished-floor-actual-nurses-and-food',()=>{
 const s=load();assert(s.buyResearch('queen_embrace'));const care=s.growthCare();assert.equal(care.limit,Math.min(64,Math.floor(care.nursery),care.nurses*2));assert(care.limit>32);
 s.ants.forEach(a=>a.role='forage');s.ticks++;assert.equal(s.growthCare().limit,0);assert.equal(s.canLay(),false);
 const q=load();assert(q.buyResearch('queen_embrace'));q.availableFood=()=>[];q.ticks++;assert.equal(q.canLay(),false);
 const r=load();assert(r.buyResearch('queen_embrace'));r.transportReady=()=>false;r.ticks++;assert.equal(r.growthCare().limit,0);assert.equal(r.canLay(),false);
});
test('save-refuses-stage3-without-layer3-and-research-overflow',()=>{
 const s=load();assert(s.buyResearch('queen_embrace'));const p=s.dump(),bad=structuredClone(p);bad.progress.reached=2;bad.progress.claims=bad.progress.claims.filter(l=>l<=2);bad.progress.earned-=9;bad.progress.cookie-=9;assert.throws(()=>G.Simulation.restore(bad));
 const too=structuredClone(p);too.progress.research.queen_embrace=4;assert.throws(()=>G.Simulation.restore(too));assert.deepEqual(G.Simulation.restore(p).dump(),p);
});
test('existing-growth-stages-keep-the-same-full-state-with-corrected-surface',()=>{
 const root=path.resolve(__dirname,'../..'),temp=fs.mkdtempSync(path.join(os.tmpdir(),'living-512-before-'));
 for(const n of ['core.js','lifecycle.js','game.js'])fs.writeFileSync(path.join(temp,n),cp.execFileSync('git',['show','05ffd14:prototypes/living-clicker/'+n],{cwd:root,maxBuffer:8e6}));
 const Old=require('./qa/surface-reference.cjs')(temp),counts=[];
 for(const name of [null,'before-256.json','world-256.json','before-512.json']){
  const p=name?JSON.parse(fs.readFileSync(path.join(qa,name))):new Old.Simulation().dump(),a=Old.Simulation.restore(p),b=G.Simulation.restore(p);
  assert.equal(b.populationLimit(),a.populationLimit());assert.equal(b.layRate(),a.layRate());assert.equal(b.forageInterval(),a.forageInterval());
  for(let k=0;k<600;k++){a.step(G.STEP);b.step(G.STEP);if(k%60===0)assert.deepEqual(a.dump(),b.dump());}assert.deepEqual(a.dump(),b.dump());counts.push({input:name||'new',steps:600,ants:b.ants.length});
 }
 return {counts};
});
assert.equal(sha(fs.readFileSync(path.join(qa,'before-512.json'))),sha(bytes));const source=Object.fromEntries(['game.js','core.js','lifecycle.js','verify-growth-512.cjs'].map(n=>[n,sha(fs.readFileSync(path.join(__dirname,n)))]));fs.writeFileSync(path.join(qa,'growth-512-unit-results.json'),JSON.stringify({pass:true,results,source,inputSha256:sha(bytes)},null,2)+'\n');
