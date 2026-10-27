const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto'),G=require('./game.js');
const qa=path.join(__dirname,'qa'),input=fs.readFileSync(path.join(qa,'world-final.json')),pack=JSON.parse(input),results=[],sha=value=>crypto.createHash('sha256').update(value).digest('hex');
const load=()=>G.Simulation.restore(pack),pose=(s,rid)=>{
  const p=s.cells(rid).map(c=>s.walkPoint(c)).filter(p=>p.valid&&p.clearance>.8&&s.grainRoom[G.GRAIN.at(p.x,p.y)]===rid).at(-1);assert(p,'room '+rid);return {x:p.x,y:p.y,angle:p.angle};
};
function test(name,fn){const detail=fn()||{};results.push({name,pass:true,...detail});console.log('PASS '+name+' '+JSON.stringify(detail));}
function clear(s,start,route,kind){assert(route?.length);let previous=start;for(const p of route){assert(s.sweptClear(previous,p,kind),'body/load sweep');previous=p;}}
test('only-the-requested-direction-is-prepared-from-real-air',()=>{
  const s=load(),before=s.dump(),from=pose(s,1),to=pose(s,3),route=s.sharedNetworkPath(from,to,null);clear(s,from,route,null);
  const n=s._routeNetwork,p=n.profiles.get('body');assert.equal(p.entries.size,1);assert.equal(n.metrics.corridorBuilds,1);
  for(const node of p.nodes)assert.equal(s.grains[G.GRAIN.at(node.pose.x,node.pose.y)],0);
  assert.deepEqual(s.dump(),before);return n.report();
});
test('body-and-all-real-cargo-envelopes-keep-swept-clearance',()=>{
  const s=load(),from=pose(s,2),to=pose(s,3),tested=[];
  for(const kind of [null,'egg','food','soil1','soil2','soil','waste','cookie']){
    if(!s.poseClear(from,kind)||!s.poseClear(to,kind))continue;
    const original=s.planPath(from,to,kind);if(!original)continue;
    const route=s.path(from,to,kind);clear(s,from,route,kind);tested.push(kind||'body');
  }
  assert(tested.includes('body')&&tested.includes('egg')&&tested.includes('soil'));return {tested};
});
test('different-workers-share-the-graph-but-own-their-paths',()=>{
  const s=load(),from=pose(s,2),to=pose(s,3),first=s.sharedNetworkPath(from,to,null);clear(s,from,first,null);
  const n=s._routeNetwork,before={...n.metrics},second=s.sharedNetworkPath({...from,x:from.x+.05},to,null);clear(s,{...from,x:from.x+.05},second,null);
  assert.equal(n.metrics.corridorBuilds,before.corridorBuilds);assert(n.metrics.fieldHits>before.fieldHits);
  const profile=n.profiles.get('body'),edge=[...profile.entries.values()][0].edges[0],original=edge.route[0].x;
  assert(Object.isFrozen(edge.route)&&Object.isFrozen(edge.route[0]));first[0].x+=1;assert.equal(edge.route[0].x,original);assert.notEqual(first,second);
  return n.report();
});
test('cold-and-warm-query-order-give-the-same-path',()=>{
  const warm=load(),cold=load(),from=pose(warm,2),to=pose(warm,3);
  for(const r of [3,5,7,2,4])warm.path(pose(warm,1),pose(warm,r),null);
  const a=warm.sharedNetworkPath(from,to,null),b=cold.sharedNetworkPath(from,to,null);assert(a&&b);assert.deepEqual(a,b);
});
test('unrelated-corridor-survives-local-invalidation',()=>{
  const s=load(),from=pose(s,2),to=pose(s,3);s.sharedNetworkPath(from,to,null);s.sharedNetworkPath(pose(s,4),pose(s,7),null);
  const n=s._routeNetwork,p=n.profiles.get('body'),before=p.entries.get('b2:r'),unrelated=p.entries.get('b7:f');assert(before&&unrelated);
  const point=before.history[Math.floor(before.history.length/2)],cell=G.idx(Math.floor(point.x),Math.floor(point.y));n.invalidate(cell);
  assert(before.dirty);assert(!unrelated.dirty);const route=s.sharedNetworkPath(from,to,null);clear(s,from,route,null);
  assert.notEqual(p.entries.get('b2:r'),before);assert.equal(p.entries.get('b7:f'),unrelated);
});
test('a-room-tag-with-solid-soil-is-never-a-passable-link',()=>{
  const s=load(),from=pose(s,1),g=s.grains.findIndex((v,i)=>v===3&&G.GRAIN.center(i).y>20),to={...G.GRAIN.center(g),angle:0};assert(g>=0);
  s.grainRoom[g]=3;assert(!s.poseClear(to,'egg'));assert.equal(s.path(from,to,'egg'),null);
});
test('surface-portals-retain-the-complete-excavated-entrance',()=>{
  const s=load(),from=pose(s,1),to={...s.surfacePoint(27.5),angle:0},route=s.sharedNetworkPath(from,to,'soil1');clear(s,from,route,'soil1');
  const n=s._routeNetwork,p=n.profiles.get('soil1'),edge=p.entries.get('entry:f').edges[0],spine=s.laneSpine(s._entryHistory||s.entranceHistory,false,'soil1');
  assert.deepEqual(edge.route.at(-1),spine.at(-1));assert(edge.route.at(-1).y<G.SURFACE);
});
test('saved-world-excludes-caches-and-resumes-identically',()=>{
  const warm=load();warm.path(pose(warm,2),pose(warm,3),'food');const saved=warm.dump(),cold=G.Simulation.restore(saved);
  assert(!cold._routeNetwork);assert.equal(sha(JSON.stringify(cold.dump())),sha(JSON.stringify(saved)));
  for(let k=0;k<180;k++){
    warm.step(G.STEP);cold.step(G.STEP);const a=warm.dump(),b=cold.dump();
    if(sha(JSON.stringify(a))!==sha(JSON.stringify(b))){fs.writeFileSync(path.join(qa,'network-replay-failed.json'),JSON.stringify({at:k,warm:a,cold:b}));assert.fail('saved continuation differs at step '+k);}
  }
  return {comparedSteps:180};
});
test('resting-sites-include-valid-alternative-standing-points',()=>{
  const s=G.Simulation.restore(JSON.parse(fs.readFileSync(path.join(qa,'home-pose-coverage.json')))),before=s.dump(),a=s.ants.find(a=>a.id===58),sites=s.homeSpots(a);
  assert(sites.length>0,'usable floor was missed by the representative carrying pose');assert(sites.some(p=>p.x===44.25&&p.y===24.75));
  for(const p of sites)assert(s.poseClear(p),'unchanged body-clearance rule');assert(sites.some(p=>s.path(a,p,null)!==null),'worker can actually walk to a site');assert.deepEqual(s.dump(),before);
  return {sites:sites.length};
});
assert.equal(sha(fs.readFileSync(path.join(qa,'world-final.json'))),sha(input));
const hashes=Object.fromEntries(['core.js','lifecycle.js','game.js','build.cjs','route-network.js'].map(n=>[n,sha(fs.readFileSync(path.join(__dirname,n)))]));
fs.writeFileSync(path.join(qa,'network-results.json'),JSON.stringify({results,inputHash:sha(input),hashes},null,2));
