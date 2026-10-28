const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const Game=require('./game.js'),{Observer,cyclesOf}=require('./diagnostics.js'),qa=path.join(__dirname,'qa'),results=[];
const hashes=Object.fromEntries(['diagnostics.js','game.js','core.js','lifecycle.js'].map(n=>[n,crypto.createHash('sha256').update(fs.readFileSync(path.join(__dirname,n))).digest('hex')]));
function test(name,fn){const detail=fn()||{};results.push({name,pass:true,...detail});console.log('PASS '+name+' '+JSON.stringify(detail));}
function replay(checkpoint){
  assert(checkpoint.state);const s=Game.Simulation.restore(checkpoint.state);
  for(const op of checkpoint.operations){
    if(op.type==='step')for(let k=0;k<op.count;k++)s.step(op.dt);
    else if(op.type==='call')s[op.method](...op.args);
    else if(op.type==='setting'){const keys=op.path.split('.'),key=keys.pop();keys.reduce((o,k)=>o[k],s)[key]=op.value;}
    else assert.fail('unknown operation');
  }
  return s;
}
function fake(ants){
  const s={ticks:0,time:0,ants,jobs:[],physics:{byId:new Map(),bodies:[],moving:new Set()},colony:{brood:[],stats:{eaten:0,born:0},raid:{enemies:[]}},stats:{grainDug:0,grainDelivered:0},step(dt=Game.STEP){this.ticks++;this.time+=dt;},tap(){return false;},dump(){return {ticks:this.ticks,time:this.time,ants:structuredClone(this.ants)};}};
  for(const method of ['path','status','capacities','canLay','branchBusy'])s[method]=()=>assert.fail('observer must not run simulation queries: '+method);
  return s;
}
const ant=id=>({id,x:id,y:20,angle:0,task:'idle',job:null,path:[],next:0,wait:0});
const walk=id=>({...ant(id),task:'travel',path:[{x:20,y:20,angle:0}]});
const run=(s,seconds)=>{for(let k=0;k<Math.ceil(seconds/Game.STEP);k++)s.step(Game.STEP);};

test('mixed-wait-graph-detects-components-without-recursion',()=>{
  const ids=Array.from({length:1000},(_,i)=>i+1),edges=ids.map(id=>({from:id,to:id===1000?1:id+1}));
  assert.equal(cyclesOf(ids,edges)[0].length,1000);assert.deepEqual(cyclesOf([1,2,3,4],[{from:1,to:2},{from:2,to:1},{from:2,to:3},{from:3,to:3}]),[[1,2],[3]]);
});
test('persistent-waitingFor-and-yieldHold-cycle-is-recorded',()=>{
  const a=walk(1),b=walk(2),c=walk(3);a.waitingFor=2;b.yieldHold=3;c.waitingFor=1;
  const s=fake([a,b,c]),o=new Observer().attach(s);run(s,23);
  const incident=o.incidents.find(e=>e.type==='wait-cycle');assert(incident);assert.deepEqual(incident.ids,[1,2,3]);assert.equal(incident.edges.length,3);
  assert(incident.checkpoint.state);assert(incident.current.state);assert.deepEqual([a.waitingFor,b.yieldHold,c.waitingFor],[2,3,1],'observer did not clear waiting');
  return {detectedAt:incident.time,edges:incident.edges};
});
test('transient-cycle-and-moving-queue-are-not-stalls',()=>{
  for(const moving of [false,true]){
    const a=walk(1),b=walk(2);a.waitingFor=2;b.yieldHold=1;const s=fake([a,b]);
    if(moving){const original=s.step;s.step=function(dt){original.call(this,dt);a.x+=.01;b.x+=.01;};}
    const o=new Observer().attach(s);run(s,10);if(!moving){delete a.waitingFor;delete b.yieldHold;}run(s,30);
    assert(!o.incidents.some(e=>e.type==='wait-cycle'));
  }
});
test('rest-laying-off-feed-interval-and-fighting-are-expected',()=>{
  const resting=ant(1),cooldown=walk(2),guard=walk(3),stunned=walk(4);cooldown.wait=.5;guard.fight={enemy:200};stunned.stun=999;
  const s=fake([resting,cooldown,guard,stunned]);s.colony.laying=false;s.colony.brood=[{id:7,stage:'larva',feeds:0,lastFed:0}];
  const o=new Observer().attach(s);run(s,100);assert.deepEqual(o.incidents,[]);assert.equal(o.samples.at(-1).resting,1);assert.equal(o.samples.at(-1).expectedWaits,3);
});
test('one-stalled-assignment-is-visible-while-others-move',()=>{
  const a=walk(1),b=walk(2),s=fake([a,b]),original=s.step;s.step=function(dt){original.call(this,dt);b.x+=.01;};
  const o=new Observer().attach(s);run(s,85);assert(o.incidents.some(e=>e.type==='work-stall'&&e.ids[0]===1));assert(!o.incidents.some(e=>e.type==='no-work-progress'));
});
test('global-assigned-work-without-progress-is-recorded',()=>{
  const s=fake([walk(1)]),o=new Observer().attach(s);run(s,85);assert(o.incidents.some(e=>e.type==='no-work-progress'));
});
test('lost-target-carrier-and-physics-index-remain-unrepaired',()=>{
  const a=walk(1),s=fake([a]),o=new Observer({config:{maxIncidents:8}}).attach(s);a.itemTask={purpose:'feed',body:100,target:999,phase:'store'};
  a.waitingFor=999;a.job=999;const b={id:100,kind:'food',carrier:998,rest:0},free={id:101,kind:'egg',carrier:0,rest:0};s.physics.bodies.push(b,free);s.physics.byId.set(100,b);s.physics.byId.set(101,free);
  s.dump=()=>{throw Error('invalid fixture');};run(s,2);
  for(const type of ['missing-actor','missing-job','missing-feed-target','missing-carrier','unsimulated-body'])assert(o.incidents.some(e=>e.type===type),type);
  assert(o.incidents.some(e=>e.current.captureError==='invalid fixture'));assert(o.incidents.every(e=>e.checkpoint.state));
  assert.equal(b.carrier,998);assert.equal(a.itemTask.target,999);assert(!s.physics.moving.has(free));
});
test('removed-workers-do-not-leave-observer-timers',()=>{
  const s=fake([walk(1)]),o=new Observer().attach(s);run(s,50);s.ants=[];run(s,1);assert(!o.history.has(1));s.ants=[walk(1)];run(s,20);assert.equal(o.incidents.length,0);
});
test('buffers-are-bounded-and-detach-restores-methods',()=>{
  const s=fake([ant(1)]),step=s.step,tap=s.tap,o=new Observer({config:{maxOperations:5,maxSamples:3,maxIncidents:8}}).attach(s);
  for(let i=0;i<40;i++){s.tap();run(s,.5);}assert(o.checkpoints.length<=2);assert(o.checkpoints.every(c=>c.operations.length<=5));assert(o.samples.length<=3);
  o.detach();assert.equal(s.step,step);assert.equal(s.tap,tap);assert(!o.sim);
});
test('simulation-exceptions-are-reported-and-rethrown',()=>{
  const s=fake([ant(1)]),error=Error('collision');s.step=()=>{throw error;};const o=new Observer().attach(s);
  assert.throws(()=>s.step(Game.STEP),e=>e===error);assert.equal(o.incidents[0].type,'simulation-error');
});
test('actual-game-is-identical-and-actions-replay-exactly',()=>{
  const s=new Game.Simulation(24014),control=Game.Simulation.restore(s.dump()),o=new Observer({metadata:{sourceSha256:hashes}}).attach(s);
  s.tap();control.tap();s.shiftRole('forage',1);control.shiftRole('forage',1);
  o.recordSetting('colony.laying',false);s.colony.laying=false;control.colony.laying=false;
  for(let k=0;k<180;k++){s.step(Game.STEP);control.step(Game.STEP);assert.deepEqual(s.dump(),control.dump(),'observer changed step '+k);}
  for(const dt of [.1,.1,.017]){s.step(dt);control.step(dt);}assert.deepEqual(s.dump(),control.dump());
  const report=o.export();assert.deepEqual(replay(report.checkpoints[0]).dump(),s.dump());assert.equal(report.incidents.length,0);
  o.detach();assert(!Object.hasOwn(s,'step'));return {comparedEveryStep:180,replayedOperations:report.checkpoints[0].operations.length};
});
test('128-workers-preserve-state-with-monitor-enabled',()=>{
  const input=JSON.parse(fs.readFileSync(path.join(qa,'world-scale.json'))),s=Game.Simulation.restore(input),control=Game.Simulation.restore(input),o=new Observer().attach(s);
  for(let k=0;k<120;k++){s.step(Game.STEP);control.step(Game.STEP);if(k%30===0)assert.deepEqual(s.dump(),control.dump());}
  assert.deepEqual(s.dump(),control.dump());assert.equal(o.incidents.length,0);return {ants:s.ants.length};
});
test('natural-work-over-five-minutes-has-no-false-stall',()=>{
  const s=Game.Simulation.restore(JSON.parse(fs.readFileSync(path.join(qa,'world-900.json')))),o=new Observer().attach(s);run(s,300);
  assert.equal(o.incidents.length,0,JSON.stringify(o.incidents.map(e=>({type:e.type,ids:e.ids,tick:e.tick}))));s.assertLedger();assert(o.checkpoints.length<=2);return {ants:s.ants.length,samples:o.samples.length};
});
fs.writeFileSync(path.join(qa,'diagnostics-results.json'),JSON.stringify({results,hashes},null,2));
