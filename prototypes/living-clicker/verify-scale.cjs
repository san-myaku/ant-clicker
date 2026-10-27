/* Measure how one real colony's step cost grows with its own ants, stock, work and traffic.
   From the natural 64-ant depth save, buy 女王の包容力 with its real food/cookies and keep
   stepping at 1/60 s. No ants, food or air are injected. Per-phase time is exclusive. */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto'),Game=require('./game.js');
const qa=path.join(__dirname,'qa'),inputName=process.env.LIVING_SCALE_INPUT||'world-final.json',input=fs.readFileSync(path.join(qa,inputName));
const limit=+(process.env.LIVING_SCALE_SECONDS||6000),every=+(process.env.LIVING_SCALE_EVERY||300),sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const hashes=Object.fromEntries(['core.js','lifecycle.js','game.js'].map(n=>[n,sha(fs.readFileSync(path.join(__dirname,n)))]));
const phases={plan:0,path:0,item:0,move:0,physics:0,biology:0},stack=[];let on=false;
function wrap(proto,name,label){const original=proto[name];proto[name]=function(...args){if(!on)return original.apply(this,args);
  const frame={start:process.hrtime.bigint(),child:0n};stack.push(frame);try{return original.apply(this,args);}finally{stack.pop();const spent=process.hrtime.bigint()-frame.start;phases[label]+=Number(spent-frame.child)/1e6;if(stack.length)stack.at(-1).child+=spent;}};}
const S=Game.Simulation.prototype;wrap(S,'plan','plan');wrap(S,'path','path');wrap(S,'stepItemTask','item');wrap(S,'move','move');wrap(S,'biology','biology');wrap(S,'updateCarriers','physics');
const s=Game.Simulation.restore(JSON.parse(input)),began=s.time,startAnts=s.ants.length;wrap(Object.getPrototypeOf(s.physics),'step','physics');
const before={grains:s.grains.slice(),rooms:s.grainRoom.slice()};
assert.equal(s.researchStatus('queen_embrace'),'ready','女王の包容力 must be affordable from real stock');assert(s.buyResearch('queen_embrace'));
assert.deepEqual(s.grains,before.grains);assert.deepEqual(s.grainRoom,before.rooms);assert.equal(s.populationLimit(),128);
function window(steps,timed){for(const k in phases)phases[k]=0;on=timed;const t0=process.hrtime.bigint();for(let k=0;k<steps;k++)s.step(Game.STEP);on=false;return Number(process.hrtime.bigint()-t0)/1e6/steps;}
function census(){
  const bodies={},states={};for(const b of s.physics.bodies){bodies[b.kind]=(bodies[b.kind]||0)+1;if(b.kind!=='soil')states[b.state]=(states[b.state]||0)+1;}
  let flow=0,jam=0;for(let i=0;i<s.traffic.length;i++){if(s.traffic[i]>.05)flow++;if(s.jam[i]>.05)jam++;}
  const st=s.status();
  return {ants:s.ants.length,brood:s.colony.brood.length,roles:s.roleCounts(),bodies,stockStates:states,jobs:s.jobs.length,itemTasks:s.ants.filter(a=>a.itemTask).length,idle:s.ants.filter(a=>a.task==='idle'&&!a.itemTask).length,
    rooms:s.rooms.length,complete:s.builds.filter(b=>b?.complete).length,capacity:s.capacities(),flowCells:flow,jamCells:jam,delivered:s.stats.grainDelivered,reached:s.progress.reached,births:st.births,meals:st.meals,harvest:st.harvest,footprintMemo:s._footprints?.size||0};
}
// Ants above 64 carry real bodies. That exact moment must save and reload, and
// a carrier that does not exist must still be refused.
let carried=null;
function checkCarrier(){const b=s.physics.bodies.find(b=>b.carrier>64&&s.ants.some(a=>a.id===b.carrier));if(!b)return;
  const saved=s.dump();assert.deepEqual(Game.Simulation.restore(saved).dump(),saved);
  const bad=structuredClone(saved),bytes=Buffer.from(bad.world.physics.data,'base64');bytes.writeUInt32LE(4294967295,s.physics.bodies.indexOf(b)*50+46);bad.world.physics.data=bytes.toString('base64');assert.throws(()=>Game.Simulation.restore(bad));
  carried={t:+s.time.toFixed(2),body:b.id,kind:b.kind,carrier:b.carrier,ants:s.ants.length};console.log('PASS carrier above 64 saves '+JSON.stringify(carried));}
const snapshots=[];
try{
for(let at=began+every;at<=began+limit+1e-6;at+=every){
  while(s.time<at-1200*Game.STEP-Game.STEP/2){s.step(Game.STEP);if(!carried)checkCarrier();}
  const msPerStep=window(600,false),timedMs=window(600,true),phaseMs=Object.fromEntries(Object.entries(phases).map(([k,v])=>[k,+(v/600).toFixed(3)]));
  s.assertLedger();s.assertProgress();const saved=s.dump();assert.deepEqual(Game.Simulation.restore(saved).dump(),saved);
  const snap={t:+s.time.toFixed(2),msPerStep:+msPerStep.toFixed(3),gameSecondsPerCpuSecond:+(Game.STEP*1000/msPerStep).toFixed(2),phaseMs,timedMsPerStep:+timedMs.toFixed(3),...census()};
  snapshots.push(snap);console.log(JSON.stringify({t:snap.t,ants:snap.ants,brood:snap.brood,bodies:snap.bodies,jobs:snap.jobs,flow:snap.flowCells,ms:snap.msPerStep,phase:snap.phaseMs}));
  fs.writeFileSync(path.join(qa,'scale-checkpoint.json'),JSON.stringify(saved));
  if(s.ants.length>=s.populationLimit())break;
}
}catch(e){
  // Keep the measured growth and the exact stop. Nothing is retried or moved.
  fs.writeFileSync(path.join(qa,'scale-failed.json'),JSON.stringify({error:String(e),t:s.time,ants:s.ants.length,collision:s.collision,carried,snapshots,hashes,inputHash:sha(input)},null,2));throw e;
}
for(const [n,h]of Object.entries(hashes))assert.equal(sha(fs.readFileSync(path.join(__dirname,n))),h,'source changed during scale measurement');
if(s.ants.length>64)assert(carried,'no ant above 64 carried a body during the run');
const result={pass:true,input:inputName,inputHash:sha(input),bought:'queen_embrace',began,finished:s.time,startAnts,ants:s.ants.length,limit:s.populationLimit(),carried,snapshots,hashes,node:process.version};
fs.writeFileSync(path.join(qa,'world-scale.json'),JSON.stringify(s.dump()));fs.writeFileSync(path.join(qa,'scale-results.json'),JSON.stringify(result,null,2));
console.log('PASS '+JSON.stringify({began,finished:s.time,startAnts,ants:s.ants.length,last:snapshots.at(-1)?.msPerStep}));
