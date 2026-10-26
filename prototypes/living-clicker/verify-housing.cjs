/* Living space. Workers rest at places of their own. When several share a
   place, the builders dig a rest chamber (居室) in the shallowest layer with
   room for it, and crowded workers walk to free places in it. When a layer
   has no room left, the next chamber goes one layer down, as far as the
   depth studies allow. No ants, air or homes are injected. */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto'),Game=require('./game.js');
const qa=path.join(__dirname,'qa'),sha=b=>crypto.createHash('sha256').update(b).digest('hex'),results=[],{STEP,GRAIN,layerBoundaries}=Game;
const hashes=Object.fromEntries(['core.js','lifecycle.js','game.js'].map(n=>[n,sha(fs.readFileSync(path.join(__dirname,n)))]));
function test(name,fn){const detail=fn()||{};results.push({name,pass:true,...detail});console.log('PASS '+name+' '+JSON.stringify(detail));}
const roundtrip=s=>{const d=s.dump();assert.deepEqual(Game.Simulation.restore(d).dump(),d);};
const input=fs.readFileSync(path.join(qa,'before-depth.json')),load=()=>Game.Simulation.restore(JSON.parse(input));
const restRooms=s=>s.roomIds().filter(r=>s.roomKind(r)==='rest');

const s=load(),crowd0=s.crowding().length,grains0=s.stats.grainDug,rest0=new Set(restRooms(s));let started=null,done=null,moved=null;const homes0=new Map(s.ants.map(a=>[a.id,{...a.home}]));
for(let k=0;k<60*1200&&done===null;k++){
  s.step(STEP);const rest=restRooms(s).filter(r=>!rest0.has(r));
  if(started===null&&rest.length)started={t:s.time,rid:rest[0],layer:s.rooms[rest[0]].layer,gap:Math.min(...[1,...s.roomIds()].filter(x=>x!==rest[0]).map(o=>Math.hypot(s.rooms[o].x-s.rooms[rest[0]].x,s.rooms[o].y-s.rooms[rest[0]].y)))};
  if(started&&s.builds[started.rid]?.complete&&done===null)done=s.time;
}
for(let k=0;k<60*300;k++){s.step(STEP);if(!moved){const a=s.ants.find(a=>homes0.has(a.id)&&s.roomKind(s.grainRoom[GRAIN.at(a.home.x,a.home.y)])==='rest'&&(homes0.get(a.id).x!==a.home.x||homes0.get(a.id).y!==a.home.y)&&Math.hypot(a.x-a.home.x,a.y-a.home.y)>.35);if(a)moved={id:a.id,t:s.time,from:homes0.get(a.id),to:{...a.home},at:{x:a.x,y:a.y}};}}
test('crowded-workers-start-a-rest-chamber-in-the-first-layer',()=>{
  assert(crowd0>=6,'workers share places at the start');assert(started,'a rest chamber was started');assert(started.layer>=1&&started.layer<=s.depthAbility());
  assert(started.gap>=9-1e-9,'planned away from every other chamber');
  return {crowded:crowd0,before:rest0.size,startedAt:+started.t.toFixed(1),room:s.roomName(started.rid),layer:started.layer,gap:+started.gap.toFixed(2)};
});
test('the-chamber-is-dug-and-workers-walk-to-rest-chambers',()=>{
  assert(done!==null,'the chamber was finished');assert(s.stats.grainDug>grains0,'by real digging');assert(moved,'a crowded worker took a place in a rest chamber');
  assert(Math.hypot(moved.at.x-moved.to.x,moved.at.y-moved.to.y)>.35,'it walks there rather than appearing');
  const inside=s.ants.filter(a=>s.roomKind(s.grainRoom[GRAIN.at(a.home.x,a.home.y)])==='rest').length;assert(inside>0);assert(s.crowding().length<crowd0,'fewer workers share places');
  s.assertLedger();s.assertProgress();roundtrip(s);
  return {finishedAt:+done.toFixed(1),living:inside,crowded:s.crowding().length,capacity:Math.round(s.roomCapacity(started.rid))};
});
test('only-stores-count-as-store-capacity',()=>{
  let food=0,larvae=0;for(let g=0;g<s.grains.length;g++)if(!s.grains[g]&&!s.grainPending[g]&&s.grainRoom[g]>=2){const k=s.roomKind(s.grainRoom[g]);if(k==='food')food++;else if(k==='egg')larvae++;}
  const c=s.rawCapacities();assert(Math.abs(c.food-food*2*Game.GRAIN_AREA)<1e-9);assert(Math.abs(c.larvae-larvae*Game.GRAIN_AREA)<1e-9);
});
test('a-full-layer-sends-the-next-chamber-down',()=>{
  // Fill the first layer's free sites with planned chamber markers only: no
  // air is opened. The site search must then look one layer down.
  const t=load();assert(t.buyResearch('geo_depth_2')||t.depthAbility()>=2);const first=t.restRoomSite();assert.equal(first.layer,1);
  const marks=[];for(let x=10;x<=Game.W-10;x+=3){const b=layerBoundaries(t.seed,x);for(let y=Game.SURFACE+5;y<=b[0]-2.5;y+=2.5)if([1,...t.roomIds(),...marks].every(r=>Math.hypot(t.rooms[r].x-x,t.rooms[r].y-y)>=9)){t.rooms.push({id:t.rooms.length,x,y,kind:'rest',layer:1});marks.push(t.rooms.length-1);}}
  const deeper=t.restRoomSite();assert(deeper,'a site one layer down');assert.equal(deeper.layer,2);
  return {firstLayer1:first.target,next:deeper.target,markers:marks.length};
});
test('without-deeper-studies-the-colony-says-it-lacks-space',()=>{
  // From the world above, once its chambers are finished.
  const t=Game.Simulation.restore(s.dump());t.colony.raid.next=1e12;for(const k of Object.keys(t.progress.research))if(/^geo_depth/.test(k))t.progress.research[k]=0;
  const marks=[];for(let x=10;x<=Game.W-10;x+=3){const b=layerBoundaries(t.seed,x);for(let y=Game.SURFACE+5;y<=b[0]-2.5;y+=2.5)if([1,...t.roomIds()].every(r=>Math.hypot(t.rooms[r].x-x,t.rooms[r].y-y)>=9)){t.rooms.push({id:t.rooms.length,x,y,kind:'egg',layer:1});marks.push(1);}}
  // Existing rest chambers count as settled, so a new one is wanted now.
  for(const r of restRooms(t))if(t.builds[r]?.complete)t.rooms[r].doneAt=t.time-1e4;
  assert(t.crowding().length>=6);assert.equal(t.depthAbility(),1);{assert.equal(t.restRoomSite(),null);t.ensureRestRoom();assert(t.events.some(e=>e.text.startsWith('住む場所が足りません')));}
  return {depth:t.depthAbility()};
});
for(const [n,h]of Object.entries(hashes))assert.equal(sha(fs.readFileSync(path.join(__dirname,n))),h,'source changed during housing verification');
fs.writeFileSync(path.join(qa,'housing-results.json'),JSON.stringify({results,hashes,inputHash:sha(input)},null,2));console.log('PASS housing');
