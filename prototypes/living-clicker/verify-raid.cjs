/* Raids from a neighbouring colony. A real scout walks in from the edge of
   the map to the entrance; if it gets home, a party follows, walks down the
   shaft and carries real brood or food off the map. Guards posted in the
   shaft grapple with intruders; a fallen intruder is real prey food and a
   fallen guard is refuse. Only player actions are used: assigning guards. */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto'),Game=require('./game.js');
const qa=path.join(__dirname,'qa'),sha=b=>crypto.createHash('sha256').update(b).digest('hex'),results=[],{STEP,SURFACE,W,GRAIN}=Game;
const hashes=Object.fromEntries(['core.js','lifecycle.js','game.js'].map(n=>[n,sha(fs.readFileSync(path.join(__dirname,n)))]));
function test(name,fn){const detail=fn()||{};results.push({name,pass:true,...detail});console.log('PASS '+name+' '+JSON.stringify(detail));}
const roundtrip=s=>{const d=s.dump();assert.deepEqual(Game.Simulation.restore(d).dump(),d);};
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

// No guards: the natural schedule brings a scout, then a party that takes real items.
const quiet=load();let scoutAt=null,firstNext=null,carrySave=null;const food0=quiet.foodBodies().length,brood0=quiet.colony.brood.length,died0=quiet.colony.stats.died;
for(let k=0;k<60*1100&&!(quiet.colony.raid.raids&&quiet.colony.raid.phase==='quiet');k++){
  quiet.step(STEP);const r=quiet.colony.raid;
  if(firstNext===null&&r.next)firstNext={at:quiet.time,next:r.next};
  if(scoutAt===null&&r.phase==='scout')scoutAt=quiet.time;
  if(!carrySave&&r.enemies.some(e=>e.itemTask)){roundtrip(quiet);carrySave=quiet.time;}
}
test('a-scout-comes-on-the-natural-schedule',()=>{
  assert(firstNext&&scoutAt!==null);const gap=scoutAt-firstNext.at;assert(gap>=480-1e-6&&gap<=840+1e-6,'gap '+gap);return {scheduledAt:+firstNext.at.toFixed(1),scoutAt:+scoutAt.toFixed(1)};
});
test('without-guards-the-party-carries-real-items-off',()=>{
  const r=quiet.colony.raid,taken=r.stolenBrood+r.stolenFood;
  assert.equal(r.raids,1);assert.equal(r.phase,'quiet');assert(taken>0,'something was taken');assert(carrySave,'saved while an item was being carried');
  assert.equal(quiet.colony.stats.died,died0,'no worker fights without guards');assert.equal(r.killed,0);
  assert(quiet.events.some(e=>e.text.startsWith('襲撃が終わりました')));quiet.assertLedger();roundtrip(quiet);
  return {raidSize:r.size,stolenBrood:r.stolenBrood,stolenFood:r.stolenFood,carrySave:+carrySave.toFixed(1),foodBefore:food0,broodBefore:brood0};
});

// Guards posted in the shaft: the scout meets them at the mouth.
const guarded=load();for(let k=0;k<3;k++)guarded.shiftRole('guard',1);
let scoutFate=null,preyId=null,preyCarried=false,preyStored=null;
for(let k=0;k<60*1100&&!(preyStored!==null);k++){
  const before=new Set(guarded.physics.bodies.map(b=>b.id)),prey=guarded.colony.raid.prey;
  guarded.step(STEP);const r=guarded.colony.raid;
  if(scoutFate===null&&r.scouts&&r.phase!=='scout')scoutFate={t:guarded.time,phase:r.phase,killed:r.killed};
  if(preyId===null&&r.prey>prey)preyId=guarded.physics.bodies.find(b=>b.kind==='food'&&!before.has(b.id)&&!guarded.colony.wild.includes(b.id)).id;
  if(preyId!==null){const b=guarded.physics.byId.get(preyId);if(b?.carrier)preyCarried=true;if(preyCarried&&b&&!b.carrier&&b.state==='stored'&&b.rest>=30)preyStored=guarded.time;}
}
test('guards-at-the-mouth-stop-the-scout',()=>{
  assert(scoutFate,'the scout came');assert.equal(scoutFate.phase,'quiet','the scout did not get home');assert.equal(scoutFate.killed,1);
  const r=guarded.colony.raid;assert.equal(r.raids,0);assert.equal(r.prey,1);assert(guarded.events.some(e=>e.text==='偵察アリを倒しました。'));
  return {scoutFell:+scoutFate.t.toFixed(1)};
});
test('a-fallen-scout-is-prey-carried-to-the-stores',()=>{
  assert(preyCarried&&preyStored!==null,'a worker carried the prey in');const b=guarded.physics.byId.get(preyId);assert(b.y>=SURFACE&&guarded.grainRoom[GRAIN.at(b.x,b.y)]>=1);guarded.assertLedger();guarded.assertProgress();
  return {storedAt:+preyStored.toFixed(1),room:guarded.roomName(guarded.grainRoom[GRAIN.at(b.x,b.y)])};
});

// Guards posted after the warning: the party grapples with them in the shaft.
const fight=load();let warned=null,fightSave=null,grapples=0;const waste0=fight.colony.waste.made;
for(let k=0;k<60*1100&&!(fight.colony.raid.raids&&fight.colony.raid.phase==='quiet');k++){
  fight.step(STEP);const r=fight.colony.raid;
  if(warned===null&&r.phase==='coming'){warned=fight.time;for(let i=0;i<4;i++)fight.shiftRole('guard',1);}
  const now=r.enemies.filter(e=>e.fight).length;if(now)grapples=Math.max(grapples,now);
  if(!fightSave&&now){const a=fight.ants.find(a=>a.fight),e=fight.enemyById(a.fight.enemy);assert.equal(e.fight.ant,a.id);assert.equal(a.role,'guard');roundtrip(fight);fightSave=fight.time;}
}
test('guards-grapple-with-the-party-in-the-shaft',()=>{
  const r=fight.colony.raid;assert(warned!==null);assert(fightSave!==null,'saved during a grapple');assert(r.killed>0,'intruders fell');assert.equal(r.prey,r.killed);
  assert.equal(fight.colony.stats.died,r.lost,'fallen guards are counted as deaths');assert(fight.colony.waste.made-waste0>=r.lost,'each fallen guard is refuse');
  assert.equal(fight.ants.length,fight.colony.stats.initialAnts+fight.colony.stats.born-fight.colony.stats.died);fight.assertLedger();roundtrip(fight);
  return {warned:+warned.toFixed(1),fightSave:+fightSave.toFixed(1),grapples,killed:r.killed,lost:r.lost,stolen:r.stolenBrood+r.stolenFood};
});

test('invalid-raid-records-are-refused',()=>{
  const s=load();s.colony.raid.next=s.time+1;let d=null;
  for(let k=0;k<60*60&&!d;k++){s.step(STEP);if(s.colony.raid.enemies.length)d=s.dump();}
  assert(d,'a scout to save');
  const a=structuredClone(d);a.colony.raid.phase='storm';assert.throws(()=>Game.Simulation.restore(a));
  const b=structuredClone(d);b.colony.raid.enemies[0].id=12;assert.throws(()=>Game.Simulation.restore(b));
  const c=structuredClone(d);c.colony.raid.enemies[0].fight={ant:999,until:s.time+1};assert.throws(()=>Game.Simulation.restore(c));
  const e=structuredClone(d);e.colony.raid.prey++;assert.throws(()=>Game.Simulation.restore(e));
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
