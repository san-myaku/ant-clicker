/* Raids from a neighbouring colony. A real scout walks in from the edge of
   the map to the entrance; if it gets home, a party follows, walks down the
   shaft and carries real brood or food off the map. Guards posted in the
   shaft grapple with intruders; a fallen intruder is real prey food and a
   fallen guard is refuse. Only player actions are used: assigning guards,
   tapping an intruder (alarm pheromone) and buying defence studies. */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto'),Game=require('./game.js');
const qa=path.join(__dirname,'qa'),sha=b=>crypto.createHash('sha256').update(b).digest('hex'),results=[],{STEP,SURFACE,W,GRAIN}=Game;
const hashes=Object.fromEntries(['core.js','lifecycle.js','game.js'].map(n=>[n,sha(fs.readFileSync(path.join(__dirname,n)))]));
function test(name,fn){const detail=fn()||{};results.push({name,pass:true,...detail});console.log('PASS '+name+' '+JSON.stringify(detail));}
const roundtrip=s=>{const d=s.dump();assert.deepEqual(Game.Simulation.restore(d).dump(),d);};
// A free body that has not come to rest must still be simulated; a save hides this, so check it live.
const settling=s=>s.physics.bodies.every(b=>b.carrier||b.rest>=30||s.physics.moving.has(b));
const input=fs.readFileSync(path.join(qa,'world-final.json')),load=()=>Game.Simulation.restore(JSON.parse(input));

test('save-from-before-raids-starts-quiet-without-guards',()=>{
  const s=Game.Simulation.restore(JSON.parse(fs.readFileSync(path.join(qa,'storage-ring.json'))));
  assert.equal(s.colony.raid.phase,'quiet');assert.equal(s.colony.raid.next,0);assert.equal(s.colony.roleWeights.guard,0);assert.equal(s.roleCounts().guard,0);roundtrip(s);
});
test('a-small-nest-is-not-found',()=>{
  const s=Game.Simulation.restore(JSON.parse(fs.readFileSync(path.join(qa,'world-900.json'))));assert(s.ants.length<40);
  for(let k=0;k<60*120;k++)s.step(STEP);assert.equal(s.colony.raid.phase,'quiet');assert.equal(s.colony.raid.next,0);return {ants:s.ants.length};
});
test('guards-are-assigned-only-on-purpose',()=>{
  const s=load(),before=s.roleCounts(true);assert(s.shiftRole('guard',1));assert(s.shiftRole('guard',1));const two=s.roleCounts(true);assert.equal(two.guard,2);
  assert(s.shiftRole('forage',-1));assert.equal(s.roleCounts(true).guard,2,'a freed forager does not become a guard');
  assert(s.shiftRole('build',1));assert.equal(s.roleCounts(true).guard,2,'a new digger is not taken from the guards');
  assert(s.shiftRole('guard',-1));assert.equal(s.roleCounts(true).guard,1);return {before,two};
});

// Counts are taken from the save's own starting point: it may already carry raids.
const mark=s=>({...s.colony.raid,died:s.colony.stats.died,waste:s.colony.waste.made});
const over=(s,m)=>s.colony.raid.raids>m.raids&&s.colony.raid.phase==='quiet';

// No guards: the scheduled scout, then a party that takes real items.
const quiet=load(),q0=mark(quiet);let scoutAt=null,carrySave=null,endAt=null;
assert.equal(q0.phase,'quiet');assert(q0.next>quiet.time&&q0.next-quiet.time<=840+1e-6,'a scout is already scheduled');
for(let k=0;k<60*1100&&!over(quiet,q0);k++){
  quiet.step(STEP);const r=quiet.colony.raid;assert(settling(quiet),'a body was left unsimulated');
  if(scoutAt===null&&r.phase==='scout')scoutAt=quiet.time;
  if(!carrySave&&r.enemies.some(e=>e.itemTask)){roundtrip(quiet);carrySave=quiet.time;}
}
endAt=quiet.time;
test('a-scout-comes-on-the-natural-schedule',()=>{
  const r=quiet.colony.raid;assert(scoutAt!==null);assert(scoutAt-q0.next>=0&&scoutAt-q0.next<2*STEP,'the scout comes when scheduled');
  const gap=r.next-endAt;assert(gap>=480-1e-6&&gap<=840+1e-6,'next scout in 8-14 minutes: '+gap);return {scheduled:+q0.next.toFixed(1),scoutAt:+scoutAt.toFixed(1),nextGap:+gap.toFixed(1)};
});
test('without-guards-the-party-carries-real-items-off',()=>{
  const r=quiet.colony.raid,taken=r.stolenBrood+r.stolenFood-q0.stolenBrood-q0.stolenFood;
  assert.equal(r.raids,q0.raids+1);assert(taken>0,'something was taken');assert(carrySave,'saved while an item was being carried');
  assert.equal(quiet.colony.stats.died,q0.died,'no worker fights without guards');assert.equal(r.killed,q0.killed);
  assert(quiet.events.some(e=>e.text.startsWith('襲撃が終わりました')));quiet.assertLedger();roundtrip(quiet);
  return {raidSize:r.size,taken,carrySave:+carrySave.toFixed(1)};
});

// Guards posted in the shaft: the scout meets them at the mouth.
const guarded=load(),g0=mark(guarded);for(let k=0;k<3;k++)guarded.shiftRole('guard',1);
let scoutFate=null,preyId=null,preyCarried=false,preyStored=null;
for(let k=0;k<60*1100&&!(preyStored!==null);k++){
  const before=new Set(guarded.physics.bodies.map(b=>b.id)),prey=guarded.colony.raid.prey;
  guarded.step(STEP);const r=guarded.colony.raid;
  if(scoutFate===null&&r.scouts>g0.scouts&&r.phase!=='scout')scoutFate={t:guarded.time,phase:r.phase,killed:r.killed-g0.killed};
  if(preyId===null&&r.prey>prey)preyId=guarded.physics.bodies.find(b=>b.kind==='food'&&!before.has(b.id)&&!guarded.colony.wild.includes(b.id)).id;
  if(preyId!==null){const b=guarded.physics.byId.get(preyId);if(b?.carrier)preyCarried=true;if(preyCarried&&b&&!b.carrier&&b.state==='stored'&&b.rest>=30)preyStored=guarded.time;}
}
test('guards-at-the-mouth-stop-the-scout',()=>{
  assert(scoutFate,'the scout came');assert.equal(scoutFate.phase,'quiet','the scout did not get home');assert.equal(scoutFate.killed,1);
  const r=guarded.colony.raid;assert.equal(r.raids,g0.raids);assert.equal(r.prey-g0.prey,1);assert(guarded.events.some(e=>e.text==='偵察アリを倒しました。'));
  return {scoutFell:+scoutFate.t.toFixed(1)};
});
test('a-fallen-scout-is-prey-carried-to-the-stores',()=>{
  assert(preyCarried&&preyStored!==null,'a worker carried the prey in');const b=guarded.physics.byId.get(preyId);assert(b.y>=SURFACE&&guarded.grainRoom[GRAIN.at(b.x,b.y)]>=1);guarded.assertLedger();guarded.assertProgress();
  return {storedAt:+preyStored.toFixed(1),room:guarded.roomName(guarded.grainRoom[GRAIN.at(b.x,b.y)])};
});

// Guards posted after the warning: the party grapples with them in the shaft.
const fight=load(),f0=mark(fight);let warned=null,fightSave=null,grapples=0;
for(let k=0;k<60*1100&&!over(fight,f0);k++){
  fight.step(STEP);const r=fight.colony.raid;assert(settling(fight),'a body was left unsimulated');
  if(warned===null&&r.phase==='coming'){warned=fight.time;for(let i=0;i<4;i++)fight.shiftRole('guard',1);}
  const now=r.enemies.filter(e=>e.fight).length;if(now)grapples=Math.max(grapples,now);
  if(!fightSave&&now){const a=fight.ants.find(a=>a.fight),e=fight.enemyById(a.fight.enemy);assert.equal(e.fight.ant,a.id);assert.equal(a.role,'guard');roundtrip(fight);fightSave=fight.time;}
}
test('guards-grapple-with-the-party-in-the-shaft',()=>{
  const r=fight.colony.raid,killed=r.killed-f0.killed,lost=r.lost-f0.lost;assert(warned!==null);assert(fightSave!==null,'saved during a grapple');assert(killed>0,'intruders fell');assert.equal(r.prey-f0.prey,killed);
  assert.equal(fight.colony.stats.died-f0.died,lost,'fallen guards are counted as deaths');assert(fight.colony.waste.made-f0.waste>=lost,'each fallen guard is refuse');
  assert.equal(fight.ants.length,fight.colony.stats.initialAnts+fight.colony.stats.born-fight.colony.stats.died);fight.assertLedger();roundtrip(fight);
  return {warned:+warned.toFixed(1),fightSave:+fightSave.toFixed(1),grapples,killed,lost,stolen:r.stolenBrood+r.stolenFood-f0.stolenBrood-f0.stolenFood};
});

// Stage 2: alarm pheromone. A tap on an intruder calls free workers near it.
test('a-tap-away-from-intruders-calls-no-one',()=>{
  const s=load();s.colony.raid.next=s.time+5;let e=null;for(let k=0;k<60*120&&!e;k++){s.step(STEP);e=s.colony.raid.enemies.find(x=>x.kind==='raider');}
  assert(e);assert.equal(s.alarmAt(e.x+8,e.y),0);assert.equal(s.ants.filter(a=>a.alarm).length,0);
});
const alarm=load(),a0=mark(alarm);alarm.colony.raid.next=alarm.time+5;let called=0,alarmSave=null,alarmedFights=0;const tapped=new Set();
for(let k=0;k<60*300&&!over(alarm,a0);k++){
  alarm.step(STEP);const r=alarm.colony.raid;assert(settling(alarm),'a body was left unsimulated');
  for(const e of r.enemies)if(!tapped.has(e.id)&&alarm.grainRoom[GRAIN.at(e.x,e.y)]>=1){tapped.add(e.id);
    const free=new Set(alarm.ants.filter(a=>a.job===null&&!a.itemTask&&!a.cargo).map(a=>a.id)),n=alarm.alarmAt(e.x+.3,e.y);called+=n;
    for(const a of alarm.ants.filter(a=>a.alarm?.enemy===e.id))assert(free.has(a.id)&&a.role!=='guard','only free workers answer');}
  if(alarm.ants.some(a=>a.alarm&&a.fight)){alarmedFights++;if(!alarmSave){roundtrip(alarm);alarmSave=alarm.time;}}
}
test('alarm-calls-free-workers-who-grapple',()=>{
  const r=alarm.colony.raid;assert(called>0,'workers answered');assert(alarmSave!==null,'saved while a called worker grappled');assert(r.killed-a0.killed>0,'intruders fell');
  assert.equal(alarm.ants.filter(a=>a.alarm).length,0,'everyone calmed down after the raid');assert.equal(alarm.colony.stats.died-a0.died,r.lost-a0.lost);alarm.assertLedger();roundtrip(alarm);
  return {tapped:tapped.size,called,killed:r.killed-a0.killed,lost:r.lost-a0.lost,stolen:r.stolenBrood+r.stolenFood-a0.stolenBrood-a0.stolenFood};
});

// Defence studies, bought with the colony's own stock.
test('defence-studies-change-the-grapple',()=>{
  const s=load(),far={x:-100,y:-100},guard={role:'guard',...far},worker={role:'nurse',...far},raider={kind:'raider',...far},scout={kind:'scout',...far};
  const base=[s.grappleOdds(guard,raider),s.grappleOdds(worker,raider),s.grappleOdds(guard,scout)];assert.deepEqual(base,[.5,1/3,2/3]);
  assert(s.buyResearch('soldier_jaw_2x'));assert(Math.abs(s.grappleOdds(guard,raider)-1.25/2.25)<1e-12);assert(Math.abs(s.grappleOdds(worker,raider)-1/3)<1e-12,'only guards');
  assert(s.buyResearch('poison_jaw'));assert(Math.abs(s.grappleOdds(guard,raider)-1.25/2.05)<1e-12);
  assert(s.buyResearch('oshiai'));const near={...far,x:-100.5};s.ants.push({id:999,role:'guard',x:-101.9,y:-100});assert(s.grappleOdds(guard,raider)>1.25/2.05,'a guard two steps away now helps');s.ants.pop();
  s.assertProgress();return {base,jaw:+(1.25/2.25).toFixed(4),poison:+(1.25/2.05).toFixed(4)};
});
const study=load(),s0=mark(study);for(const id of ['soldier_jaw_2x','raid_spoils','early_warning','formic_acid'])assert(study.buyResearch(id),id);
study.colony.raid.next=study.time+5;let warning=null;
for(let k=0;k<60*400&&!over(study,s0);k++){
  study.step(STEP);const r=study.colony.raid;if(warning===null&&r.phase==='coming'){warning=r.attackAt-study.time;for(let i=0;i<3;i++)study.shiftRole('guard',1);}
}
test('studies-in-a-real-raid',()=>{
  const r=study.colony.raid,killed=r.killed-s0.killed;assert(Math.abs(warning-80)<1e-6,'early warning gives 80 s');assert(killed>0);
  assert.equal(r.prey-s0.prey,killed*2,'spoils: two prey food per fallen intruder');assert(r.stuns-s0.stuns>0,'formic acid stopped an intruder beside a grapple');study.assertLedger();study.assertProgress();roundtrip(study);
  return {warning,killed,prey:r.prey-s0.prey,stuns:r.stuns-s0.stuns,lost:r.lost-s0.lost};
});

test('loot-that-cannot-be-carried-out-is-put-down',()=>{
  // Two raiders once held pupae deep in a nursery for 6700 s: no route led
  // out with that load. They now put it down and leave; nothing is lost.
  const s=Game.Simulation.restore(JSON.parse(fs.readFileSync(path.join(qa,'raid-stuck-loot.json')))),held=s.colony.raid.enemies.filter(e=>e.itemTask).map(e=>e.itemTask.body);
  assert.equal(held.length,2);for(let k=0;k<60*60&&s.colony.raid.enemies.length;k++)s.step(STEP);
  assert.equal(s.colony.raid.enemies.length,0);assert.equal(s.colony.raid.phase,'quiet');assert.equal(s.colony.raid.stolenBrood,0);
  for(const id of held){const b=s.physics.byId.get(id);assert(!b||!b.carrier,'put down or already hatched');}s.assertLedger();roundtrip(s);
  return {held,ended:+s.time.toFixed(1)};
});
test('an-item-a-raider-cannot-carry-out-stays-simulated',()=>{
  // A raider that finds no way out with an item leaves it untouched; an item
  // once lifted and put back without the physics step froze brood for good.
  const s=load();s.colony.raid.next=s.time+5;const own=s.path.bind(s);s.path=(f,t,k,...r)=>f.enemy&&k&&f.phase==='in'&&!r.length?null:own(f,t,k,...r);
  const m=mark(s);let checked=0;for(let k=0;k<60*240&&!over(s,m);k++){s.step(STEP);assert(settling(s),'a body was left unsimulated at '+s.time.toFixed(2));checked++;}
  assert.equal(s.colony.raid.phase,'quiet');assert.equal(s.colony.raid.stolenFood+s.colony.raid.stolenBrood,m.stolenFood+m.stolenBrood);return {steps:checked};
});
test('invalid-raid-records-are-refused',()=>{
  const s=load();s.colony.raid.next=s.time+1;let d=null;
  for(let k=0;k<60*60&&!d;k++){s.step(STEP);if(s.colony.raid.enemies.length)d=s.dump();}
  assert(d,'a scout to save');
  const a=structuredClone(d);a.colony.raid.phase='storm';assert.throws(()=>Game.Simulation.restore(a));
  const b=structuredClone(d);b.colony.raid.enemies[0].id=12;assert.throws(()=>Game.Simulation.restore(b));
  const c=structuredClone(d);c.colony.raid.enemies[0].fight={ant:999,until:s.time+1};assert.throws(()=>Game.Simulation.restore(c));
  const e=structuredClone(d);e.colony.raid.prey=e.colony.raid.killed-1;assert.throws(()=>Game.Simulation.restore(e));
  const f=structuredClone(d);f.colony.raid.enemies[0].itemTask={phase:'store',body:s.physics.bodies.find(x=>x.kind==='food').id};assert.throws(()=>Game.Simulation.restore(f));
  const g=structuredClone(d);g.colony.raid.stolenFood++;assert.throws(()=>Game.Simulation.restore(g));
});

test('a-worker-backing-over-the-ground-keeps-facing',()=>{
  // Backing out with a load is planned like any step; the ground tilt must
  // not turn the body round to face the way it moves.
  const s=load(),a=s.ants.find(a=>a.role==='forage'&&!a.itemTask&&a.job===null);const x=s.entrance.x-5,y=s.surfacePoint(x).y;
  Object.assign(a,{x,y,angle:.39,cell:Game.idx(Math.floor(x),Math.floor(y)),path:[{x:x-.5,y,angle:.39},{x:x-1,y,angle:.39},{x:x-1.5,y,angle:.39}],next:0,wait:0});delete a.returning;
  for(let k=0;k<30;k++){s.step(STEP);assert(Math.cos(a.angle)>0,'still facing right at '+a.x.toFixed(2));}
  assert(a.x<x-.2,'it moved back');return {from:+x.toFixed(2),to:+a.x.toFixed(2),angle:+a.angle.toFixed(3)};
});
for(const [n,h]of Object.entries(hashes))assert.equal(sha(fs.readFileSync(path.join(__dirname,n))),h,'source changed during raid verification');
fs.writeFileSync(path.join(qa,'raid-results.json'),JSON.stringify({results,hashes,inputHash:sha(input)},null,2));console.log('PASS raid');
