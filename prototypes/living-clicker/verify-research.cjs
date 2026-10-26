/* All 61 original studies are listed in their original order. Connected ones
   are bought from real stored food and earned cookies and change the actual
   walking, growing or laying rates; the rest cannot be bought yet. */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto'),Game=require('./game.js');
const qa=path.join(__dirname,'qa'),sha=b=>crypto.createHash('sha256').update(b).digest('hex'),results=[];
const hashes=Object.fromEntries(['core.js','lifecycle.js','game.js'].map(n=>[n,sha(fs.readFileSync(path.join(__dirname,n)))]));
function test(name,fn){const detail=fn()||{};results.push({name,pass:true,...detail});console.log('PASS '+name);}
const catalog=JSON.parse(fs.readFileSync(path.join(qa,'research-catalog.json')));
test('catalog-matches-original-61',()=>{assert.equal(Game.RESEARCH.length,61);assert.deepEqual(Game.RESEARCH.map(d=>[d.id,d.name]),catalog.map(d=>[d.id,d.name]));return {active:Game.ACTIVE.length,planned:61-Game.ACTIVE.length};});
const input=fs.readFileSync(path.join(qa,'world-scale.json')),s=Game.Simulation.restore(JSON.parse(input));
test('planned-studies-cannot-be-bought',()=>{for(const d of Game.RESEARCH.filter(d=>d.planned)){assert.equal(s.researchStatus(d.id),'planned');assert.equal(s.researchCost(d.id),null);assert.equal(s.buyResearch(d.id),false);}});
function buy(id,check){
  const before={food:s.availableFood().length,cookie:s.progress.cookie,grains:s.grains.slice()},cost=s.researchCost(id);
  assert.equal(s.researchStatus(id),'ready',id+' should be affordable from real stock');assert(s.buyResearch(id));
  assert.equal(s.availableFood().length,before.food-cost.food);assert.equal(s.progress.cookie,before.cookie-cost.cookie);assert.deepEqual(s.grains,before.grains);
  s.assertLedger();s.assertProgress();assert.deepEqual(Game.Simulation.restore(s.dump()).dump(),s.dump());check();return cost;
}
const forager=s.ants.find(a=>a.role==='forage'),builder=s.ants.find(a=>a.role==='build'),bought={};
test('queen-studies-change-real-laying',()=>{
  const lay=s.layRate();bought.queen_vitality=buy('queen_vitality',()=>assert.equal(s.layRate(),lay*1.25));
  bought.queen_double_lay=buy('queen_double_lay',()=>assert.equal(s.tapPower(),2));
  const walk=s.walkSpeed(forager),other=s.walkSpeed(builder);bought.queen_pheromone=buy('queen_pheromone',()=>{assert(Math.abs(s.walkSpeed(forager)-walk-Game.WALK_SPEED*.2)<1e-9);assert.equal(s.walkSpeed(builder),other);});
  return {bought:{...bought}};
});
test('gather-studies-change-forager-walking',()=>{
  if(!s.level('gather_1'))bought.gather_1=buy('gather_1',()=>{});
  const walk=s.walkSpeed(forager);bought.gather_2=buy('gather_2',()=>assert(Math.abs(s.walkSpeed(forager)-walk-Game.WALK_SPEED*.15)<1e-9));
  return {bought:{...bought}};
});
test('repeatable-cost-grows-from-real-units',()=>{for(let k=0;k<6;k++)assert.deepEqual(s.researchCost('gather_inf',k),{food:Math.ceil(6*1.5**k),cookie:Math.ceil(2*1.5**k)});});
test('brood-stage-study-ages-a-real-egg-faster',()=>{
  // The 900 s natural save still has eggs and can pay for both studies.
  const y=Game.Simulation.restore(JSON.parse(fs.readFileSync(path.join(qa,'world-900.json'))));
  if(!y.level('brood_1'))assert(y.buyResearch('brood_1'));assert(y.buyResearch('brood_egg_inf'));assert.equal(y.stageRate('egg'),1.04);
  const egg=y.colony.brood.find(e=>e.stage==='egg'&&e.age<30);assert(egg,'an egg is present');
  const age=egg.age,rate=y.broodRate()*y.stageRate('egg');y.biology(Game.STEP);
  assert(Math.abs(egg.age-age-Game.STEP*rate)<1e-12);y.assertLedger();y.assertProgress();return {rate,eggAge:age};
});
test('older-save-without-new-levels-loads-at-zero',()=>{
  const p=JSON.parse(input);for(const id of Object.keys(p.progress.research))if(!['gather_1','brood_1','dig_speed','queen_fertile','queen_embrace','geo_depth_2','geo_depth_3','geo_depth_4'].includes(id))delete p.progress.research[id];
  const r=Game.Simulation.restore(p);for(const d of Game.ACTIVE)assert(Number.isInteger(r.progress.research[d.id]));
  const planned=JSON.parse(input);planned.progress.research.hygiene_1=1;assert.throws(()=>Game.Simulation.restore(planned));
  const unknown=JSON.parse(input);unknown.progress.research.nope=0;assert.throws(()=>Game.Simulation.restore(unknown));
});
test('studies-keep-the-colony-working',()=>{const d=s.stats.grainDelivered,b=s.colony.stats.gathered;for(let k=0;k<60*60;k++)s.step(Game.STEP);s.assertLedger();s.assertProgress();assert.deepEqual(Game.Simulation.restore(s.dump()).dump(),s.dump());return {delivered:s.stats.grainDelivered-d,gathered:s.colony.stats.gathered-b,ants:s.ants.length};});
for(const [n,h]of Object.entries(hashes))assert.equal(sha(fs.readFileSync(path.join(__dirname,n))),h,'source changed during research verification');
fs.writeFileSync(path.join(qa,'research-results.json'),JSON.stringify({results,hashes,inputHash:sha(input)},null,2));console.log('PASS research');
