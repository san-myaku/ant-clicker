const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process'),os=require('node:os'),assert=require('node:assert/strict'),crypto=require('node:crypto'),G=require('./game.js');
const qa=path.join(__dirname,'qa'),results=[],sha=b=>crypto.createHash('sha256').update(b).digest('hex'),input=fs.readFileSync(path.join(qa,'before-256.json')),load=()=>G.Simulation.restore(JSON.parse(input));
function test(name,fn){const info=fn()||{};results.push({name,pass:true,...info});console.log('PASS '+name+' '+JSON.stringify(info));}
test('second-stage-requires-real-depth-and-population',()=>{
 const s=load();assert.equal(s.researchStatus('queen_embrace'),'ready');assert.deepEqual(s.researchCost('queen_embrace'),{food:48,cookie:18});
 s.progress.reached=1;assert.equal(s.researchStatus('queen_embrace'),'locked');s.progress.reached=2;s.ants=s.ants.slice(0,99);assert.equal(s.researchStatus('queen_embrace'),'locked');
 const fresh=new G.Simulation();assert.deepEqual(fresh.researchCost('queen_embrace'),{food:20,cookie:6});assert.equal(fresh.populationLimit(),64);
});
test('real-purchase-pays-for-the-stage-without-opening-air-or-adding-life',()=>{
 const s=load(),before=s.dump(),food=s.availableFood().length,cookie=s.progress.cookie,rate=s.layRate();assert(s.buyResearch('queen_embrace'));
 assert.equal(s.populationLimit(),256);assert.equal(s.layRate(),rate*2);assert.equal(s.forageInterval(),3);assert.equal(s.availableFood().length,food-48);assert.equal(s.progress.cookie,cookie-18);
 const after=s.dump();assert.deepEqual(after.world.grains,before.world.grains);assert.deepEqual(after.world.grainPending,before.world.grainPending);assert.deepEqual(after.world.ants,before.world.ants);assert.deepEqual(after.colony.brood,before.colony.brood);
 assert.deepEqual(G.Simulation.restore(after).dump(),after);assert.equal(s.researchStatus('queen_embrace'),'done');assert(!s.buyResearch('queen_embrace'));assert(s.researchDescription('queen_embrace').includes('256'));
 return {cap:s.populationLimit(),price:{food:48,cookie:18}};
});
function careHost(){return {ticks:1,revision:1,colony:{stats:{laid:0,born:0,eaten:0,spent:0,generated:0,died:0},brood:[],waste:{recycled:0},raid:{stolenFood:0,prey:0}},ants:Array.from({length:20},()=>({role:'nurse'})),physics:{bodies:[]},roomIds:()=>[2,3,4],roomKind:r=>r===3?'food':'egg',transportReady:()=>true,roomCapacity:r=>r===2?18.75:27,level:()=>2,availableFood:()=>Array(20).fill({}),growthCare:G.Simulation.prototype.growthCare};}
test('only-complete-reachable-nursery-floor-and-actual-nurses-count',()=>{
 const s=careHost();assert.equal(s.growthCare().limit,32);assert.equal(s.growthCare().nursery,45.75);
 s.ticks++;s.transportReady=r=>r===2;assert.equal(s.growthCare().limit,18);
 s.ticks++;s.transportReady=()=>false;assert.equal(s.growthCare().limit,0);
 s.ticks++;s.transportReady=()=>true;s.ants=[{role:'nurse'},...Array(19).fill({role:'forage',desiredRole:'nurse'})];assert.equal(s.growthCare().limit,2);
 s.ticks++;s.ants=[];assert.equal(s.growthCare().limit,0);
});
test('remaining-meals-and-reservations-are-counted-once',()=>{
 const s=careHost();s.colony.brood=[{id:1,stage:'egg',feeds:0},{id:2,stage:'larva',feeds:0},{id:3,stage:'larva',feeds:1},{id:4,stage:'pupa',feeds:2}];s.ants[0].itemTask={purpose:'feed',target:2};
 assert.equal(s.growthCare().meals,4);const previous=s.growthCare();assert.equal(s.growthCare(),previous);
 s.ticks++;s.colony.brood[1].feeds=1;assert.equal(s.growthCare().meals,3);
 // Available food excludes the already claimed meal. It must not be subtracted twice.
 s.availableFood=()=>Array(4).fill({});s.ticks++;assert.equal(s.growthCare().food,4);
});
test('second-stage-laying-needs-two-more-meals-and-a-place',()=>{
 const s=careHost();s.colony.laying=true;s.expandedGrowth=()=>true;s.populationLimit=()=>256;s.colony.brood=[{id:1,stage:'egg'}];s.availableFood=()=>Array(3).fill({});
 assert.equal(G.Simulation.prototype.canLay.call(s),false);s.ticks++;s.availableFood=()=>Array(4).fill({});assert.equal(G.Simulation.prototype.canLay.call(s),true);
 s.ticks++;s.transportReady=()=>false;assert.equal(G.Simulation.prototype.canLay.call(s),false);
});
test('public-allocation-and-purchase-refresh-the-shared-care-budget',()=>{
 const s=load();assert(s.buyResearch('queen_embrace'));const before=s.growthCare();s.setRoles(s.roleCounts(true));assert.notEqual(s.growthCare(),before);
 const beforeBuy=s.growthCare();assert(s.buyResearch('hygiene_1'));assert.notEqual(s.growthCare(),beforeBuy);
 const bad=s.dump();bad.progress.reached=1;bad.progress.claims=[1];assert.throws(()=>G.Simulation.restore(bad));
});
test('earlier-stages-stay-byte-identical-to-the-recorded-source',()=>{
 const root=path.resolve(__dirname,'../..'),temp=fs.mkdtempSync(path.join(os.tmpdir(),'living-growth-before-'));
 for(const n of ['core.js','lifecycle.js','game.js'])fs.writeFileSync(path.join(temp,n),cp.execFileSync('git',['show','5c1bb7f:prototypes/living-clicker/'+n],{cwd:root,maxBuffer:8e6}));
 const Old=require(path.join(temp,'game.js')),counts=[];
 for(const name of [null,'world-900.json','before-256.json']){
  const p=name?JSON.parse(fs.readFileSync(path.join(qa,name))):new Old.Simulation().dump(),old=Old.Simulation.restore(p),fresh=G.Simulation.restore(p);
  assert.equal(fresh.forageInterval(),8);assert.equal(fresh.layRate(),old.layRate());
  for(let k=0;k<600;k++){old.step(G.STEP);fresh.step(G.STEP);if(k<10||k%60===0)assert.deepEqual(fresh.dump(),old.dump());}
  assert.deepEqual(fresh.dump(),old.dump());counts.push({input:name||'new',ants:fresh.ants.length,steps:600});
 }
 return {counts};
});
const source=Object.fromEntries(['game.js','lifecycle.js','build.cjs','view-research.js','verify-growth.cjs'].map(n=>[n,sha(fs.readFileSync(path.join(__dirname,n)))]));
assert.equal(sha(fs.readFileSync(path.join(qa,'before-256.json'))),sha(input));fs.writeFileSync(path.join(qa,'growth-results.json'),JSON.stringify({results,source,inputSha256:sha(input)},null,2)+'\n');
