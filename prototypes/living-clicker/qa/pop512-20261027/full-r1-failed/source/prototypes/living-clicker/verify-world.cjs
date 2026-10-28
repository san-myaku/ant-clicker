const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const Game=require('./game.js'),{Simulation,STEP,GRAIN,FINE_SIZE}=Game;
const qa=path.join(__dirname,'qa');fs.mkdirSync(qa,{recursive:true});
const hashes=Object.fromEntries(['core.js','lifecycle.js','game.js'].map(n=>[n,crypto.createHash('sha256').update(fs.readFileSync(path.join(__dirname,n))).digest('hex')]));
const results=[],snapshots=[];
function test(name,fn){const detail=fn();results.push({name,pass:true,...detail});console.log('PASS '+name);}
const s=new Simulation(24014);
test('queen-only-physical-start',()=>{assert.equal(s.ants.length,12);assert.equal(s.colony.brood.length,3);assert.equal(s.foodBodies().length,6);assert.equal(s.capacities().larvae,0);assert(!s.grainRoom.includes(2));assert(!s.grainRoom.includes(3));assert.equal(s.progress.reached,1);assert.equal(s.depthAbility(),1);return {};});
for(const at of [60,180,360,600,900,1200]){
  const started=Date.now();while(s.time<at-STEP/2)s.step(STEP);
  s.assertLedger();s.assertProgress();const saved=s.dump(),restored=Simulation.restore(saved);assert.deepEqual(restored.dump(),saved);
  const status=s.status();snapshots.push({at,...status,elapsedMs:Date.now()-started});fs.writeFileSync(path.join(qa,`world-${at}.json`),JSON.stringify(saved));
  console.log(JSON.stringify({at,ants:status.ants,meals:status.meals,food:status.food,dug:status.grainDug,delivered:status.grainDelivered,capacity:status.capacity,jobs:s.jobs.length}));
}
test('natural-forage-feed-hatch-excavate',()=>{assert(s.colony.stats.gathered>10);assert(s.colony.stats.eaten>6);assert(s.colony.stats.born>=3);assert(s.stats.grainDelivered>50);assert(s.capacities().larvae>=5);assert(s.capacities().food>=10);assert(s.ants.every(a=>a.broodId===undefined||!s.colony.brood.some(b=>b.id===a.broodId)));return snapshots.at(-1);});
test('locked-grains-never-cleared',()=>{for(let g=0;g<FINE_SIZE;g++)if(!s.grains[g]){const p=GRAIN.center(g);assert(s.layerAt(p.x,p.y)<=1);}return {reached:s.progress.reached};});
test('research-spends-real-unreserved-food',()=>{const before=s.dump(),food=s.foodBodies().length,cost=s.researchCost('dig_speed'),dig=s.digRate(),reserved=new Set(s.ants.filter(a=>a.itemTask).map(a=>a.itemTask.body));assert(s.buyResearch('dig_speed'));assert.equal(s.foodBodies().length,food-cost.food);for(const id of reserved)assert(s.physics.byId.has(id));assert(s.digRate()>dig);assert.deepEqual(s.dump().world.grains,before.world.grains);assert.deepEqual(s.dump().world.grainRoom,before.world.grainRoom);s.assertLedger();Simulation.restore(s.dump());return {cost,rate:s.digRate()};});
test('depth-purchase-does-not-open-air-or-reveal',()=>{assert.equal(s.researchStatus('geo_depth_2'),'ready');const grains=s.grains.slice(),rooms=s.grainRoom.slice(),reached=s.progress.reached;assert(s.buyResearch('geo_depth_2'));assert.deepEqual(s.grains,grains);assert.deepEqual(s.grainRoom,rooms);assert.equal(s.progress.reached,reached);assert.equal(s.depthAbility(),2);Simulation.restore(s.dump());return {cost:s.researchCost('geo_depth_2'),reached};});
fs.writeFileSync(path.join(qa,'before-depth.json'),JSON.stringify(s.dump()));
for(const [n,h]of Object.entries(hashes))assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(__dirname,n))).digest('hex'),h,'source changed during world verification');
fs.writeFileSync(path.join(qa,'first-loop-results.json'),JSON.stringify({results,snapshots,hashes},null,2));console.log('PASS first loop complete');
