const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto'),Game=require('./game.js');
const qa=path.join(__dirname,'qa'),results=[],inputs={};
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
function test(name,fn){const detail=fn()||{};results.push({name,pass:true,...detail});console.log('PASS '+name+' '+JSON.stringify(detail));}
function exactNear(ants,p){return ants.filter(a=>Math.hypot(a.x-p.x,a.y-p.y)<=2.6);}
test('radius-boundaries-corners-order-and-same-step-updates',()=>{
  const ants=[{id:9,x:3,y:3},{id:1,x:5.6,y:3},{id:7,x:2.999999,y:5.6},{id:2,x:95.9,y:89.9}];
  for(const width of [2,3]){
    const index=new Game.AntTrafficIndex(ants,width);
    for(const p of [{x:3,y:3},{x:.1,y:.1},{x:95.9,y:89.9}])assert.deepEqual(exactNear(index.query(p),p),exactNear(ants,p));
    Object.assign(ants[3],{x:3.1,y:3.1});index.update(ants[3]);assert.deepEqual(index.query({x:3,y:3}).map(a=>a.id),[9,1,7,2]);
    Object.assign(ants[3],{x:95.9,y:89.9});index.update(ants[3]);
  }
});
test('randomized-moving-workers-never-lose-or-reorder-a-neighbor',()=>{
  let seed=24014;const rng=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  const ants=Array.from({length:1000},(_,i)=>({id:1000-i,x:.1+rng()*95.8,y:.1+rng()*89.8})),index=new Game.AntTrafficIndex(ants);
  let candidates=0;
  for(let k=0;k<2000;k++){
    const a=ants[Math.floor(rng()*ants.length)];a.x=.1+rng()*95.8;a.y=.1+rng()*89.8;index.update(a);
    const p={x:.1+rng()*95.8,y:.1+rng()*89.8},near=index.query(p);candidates+=near.length;assert.deepEqual(exactNear(near,p),exactNear(ants,p));
  }
  return {queries:2000,linearCandidates:2000*ants.length,gridCandidates:candidates};
});
test('birth-death-and-array-replacement-refresh-id-map',()=>{
  const host={ants:[{id:8,x:3,y:3},{id:2,x:4,y:4}]},get=()=>Game.Simulation.prototype.trafficIndex.call(host),first=get();
  host.ants.push({id:1,x:5,y:5});assert.notEqual(get(),first);assert.equal(get().byId.get(1),host.ants[2]);
  host.ants=[host.ants[1],{id:8,x:20,y:20}];assert.equal(get().byId.get(8),host.ants[1]);assert(!get().byId.has(1));
});
const counts={linear:0,grid:0,queries:0};
for(const name of ['world-900.json','world-scale.json','head-on-retreat.json','room-reservation.json','raid-stuck-loot.json','heap-ceiling.json'])test('same-state-as-full-scan-'+name,()=>{
  const bytes=fs.readFileSync(path.join(qa,name));inputs[name]=sha(bytes);const pack=JSON.parse(bytes),input=pack.state||pack;
  const grid=Game.Simulation.restore(input),linear=Game.Simulation.restore(input),query=grid.trafficCandidates;
  grid.trafficCandidates=function(p){const candidates=query.call(this,p);counts.grid+=candidates.length;counts.queries++;return candidates;};
  linear.trafficCandidates=function(){counts.linear+=this.ants.length;return this.ants;};
  // Full save comparisons every step first, then ant/job/physics comparisons
  // every step with full saves each second over the longer continuation.
  for(let k=0;k<60*20;k++){
    grid.step(Game.STEP);linear.step(Game.STEP);
    if(k<30||k%60===0)assert.deepEqual(grid.dump(),linear.dump(),name+' step '+k);
    else{
      assert.deepEqual(grid.ants,linear.ants,name+' ants at '+k);
      assert.deepEqual(grid.jobs,linear.jobs,name+' jobs at '+k);
      assert.deepEqual(grid.physics.dump(),linear.physics.dump(),name+' bodies at '+k);
      assert.equal(grid.rng,linear.rng);assert.equal(grid.revision,linear.revision);
    }
  }
  assert.deepEqual(grid.dump(),linear.dump());grid.assertLedger();assert.equal(sha(fs.readFileSync(path.join(qa,name))),inputs[name]);
  return {ants:grid.ants.length,comparedSteps:1200,fullSavesEveryStep:30};
});
test('real-traffic-candidate-count-is-reduced',()=>{assert(counts.grid<counts.linear);return counts;});
const hashes=Object.fromEntries(['core.js','lifecycle.js','game.js','build.cjs','traffic-index.js'].map(n=>[n,sha(fs.readFileSync(path.join(__dirname,n)))]));
fs.writeFileSync(path.join(qa,'traffic-results.json'),JSON.stringify({results,hashes,inputs},null,2));
