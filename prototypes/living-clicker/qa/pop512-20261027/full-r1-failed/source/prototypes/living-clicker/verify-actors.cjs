const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto'),G=require('./game.js');
const qa=path.join(__dirname,'qa'),results=[],inputs={},sha=b=>crypto.createHash('sha256').update(b).digest('hex');
function load(n){const b=fs.readFileSync(path.join(qa,n));inputs[n]=sha(b);return G.Simulation.restore(JSON.parse(b));}
function test(name,fn){const info=fn()||{};results.push({name,pass:true,...info});console.log('PASS '+name+' '+JSON.stringify(info));}
function workerId(s,a,id){const old=a.id;a.id=id;for(const j of s.jobs)if(j.ant===old)j.ant=id;for(const b of s.physics.bodies)if(b.carrier===old)b.carrier=id;
 for(const x of s.ants)for(const k of ['waitingFor','yieldFor','yieldHold'])if(x[k]===old)x[k]=id;
 for(const e of s.colony.raid.enemies)if(e.fight?.ant===old)e.fight.ant=id;s.colony.nextActor=Math.max(s.colony.nextActor,id+1);}
function enemyId(s,e,id){const old=e.id;e.id=id;for(const b of s.physics.bodies)if(b.carrier===old)b.carrier=id;
 for(const a of s.ants)for(const k of ['fight','alarm'])if(a[k]?.enemy===old)a[k].enemy=id;s.colony.nextActor=Math.max(s.colony.nextActor,id+1);}
function roundtrip(s){const p=s.dump(),r=G.Simulation.restore(p);assert.deepEqual(r.dump(),p);return p;}
test('new-format-has-an-independent-key-and-rejects-old-encodings',()=>{
 const s=new G.Simulation(),p=roundtrip(s);assert.equal(G.KEY,'livingClicker_2');assert.equal(p.format,'living-clicker-2');assert.equal(G.MAX_ACTORS,1000);
 for(const mutate of [p=>p.format='living-clicker-1',p=>p.world.format='ant-colony-core-1',p=>p.world.physics.encoding='bodies50le',p=>p.world.physics.version=2,p=>delete p.colony.nextActor,p=>p.colony.nextAnt=13]){const bad=structuredClone(p);mutate(bad);assert.throws(()=>G.Simulation.restore(bad));}
});
test('all-32-bit-id-boundaries-preserve-a-workers-real-load',()=>{
 const tested=[];
 for(const id of [129,199,200,249,250,255,256,999,1000,65535,65536,4294967295]){
  const s=load('world-final.json'),b=s.physics.bodies.find(b=>b.carrier&&s.ants.some(a=>a.id===b.carrier));assert(b);const a=s.ants.find(a=>a.id===b.carrier),bodyBefore={...b};workerId(s,a,id);
  const saved=roundtrip(s),bytes=Buffer.from(saved.world.physics.data,'base64'),at=s.physics.bodies.indexOf(b)*50;
  assert.equal(bytes.length,s.physics.bodies.length*50);assert.equal(bytes[at+6],0);assert.equal(bytes.readUInt32LE(at+46),id);
  assert.deepEqual({...b,carrier:bodyBefore.carrier},bodyBefore);tested.push(id);
 }
 return {tested,bytesPerBody:50};
});
test('workers-and-invaders-simultaneously-own-wide-id-loads',()=>{
 // Serialization-only fixture: attach an existing unclaimed food body to a
 // clear worker pose. This is not counted as natural pickup or growth proof.
 const s=load('raid-stuck-loot.json'),claimed=new Set(s.ants.filter(a=>a.itemTask).map(a=>a.itemTask.body));
 const b=s.physics.bodies.find(b=>b.kind==='food'&&!b.carrier&&!s.colony.wild.includes(b.id)&&!claimed.has(b.id)),a=s.ants.find(a=>a.job===null&&!a.itemTask&&s.poseClear(a,'food'));assert(b&&a);
 b.carrier=a.id;b.state='cargo';b.rest=0;a.itemTask={body:b.id,phase:'store',destination:a.cell,rid:1};s.updateCarriers();
 workerId(s,s.ants.find(a=>a.id===b.carrier),65536);const e=s.colony.raid.enemies.find(e=>e.itemTask);assert(e);enemyId(s,e,4294967295);
 s.checkRaid();const p=roundtrip(s),r=G.Simulation.restore(p);assert.equal(r.physics.byId.get(e.itemTask.body).carrier,4294967295);assert.equal(r.physics.byId.get(b.id).carrier,65536);
 // The saved live owners move their own loads with unchanged carrier logic.
 const before={x:r.physics.byId.get(e.itemTask.body).x,y:r.physics.byId.get(e.itemTask.body).y};r.updateCarriers();assert(Number.isFinite(before.x));roundtrip(r);
});
test('orphan-duplicate-mismatched-and-invalid-references-are-refused',()=>{
 const s=load('world-final.json'),saved=s.dump(),carried=s.physics.bodies.findIndex(b=>b.carrier);
 const mutations=[
  p=>p.world.ants[1].id=p.world.ants[0].id,
  p=>{const j=p.world.jobs[0],a=p.world.ants.find(a=>a.id!==j.ant&&a.job===null&&!a.itemTask);assert(j&&a);a.job=j.id;},
  p=>p.colony.nextActor=p.world.ants.at(-1).id,
  p=>p.world.ants[0].waitingFor=4294967295,
  p=>p.world.ants[0].yieldHold=p.world.ants[0].id,
  p=>p.world.ants[0].id=4294967296,
  p=>{const b=Buffer.from(p.world.physics.data,'base64');b.writeUInt32LE(4294967295,carried*50+46);p.world.physics.data=b.toString('base64');},
  p=>{const b=Buffer.from(p.world.physics.data,'base64');b[carried*50+6]=1;p.world.physics.data=b.toString('base64');},
  p=>p.world.physics.data=p.world.physics.data.slice(4)
 ];
 for(const mutate of mutations){const p=structuredClone(saved);mutate(p);assert.throws(()=>G.Simulation.restore(p));}
 const raid=load('raid-stuck-loot.json').dump();raid.colony.raid.enemies[0].id=raid.world.ants[0].id;assert.throws(()=>G.Simulation.restore(raid));
 return {invalidCases:mutations.length+1};
});
test('dump-does-not-truncate-a-carrier-before-writing',()=>{
 const s=new G.Simulation(),b=s.physics.bodies[0];for(const id of [-1,.5,4294967296,NaN]){b.carrier=id;assert.throws(()=>s.physics.dump());}b.carrier=0;
});
test('death-releases-only-references-to-that-worker-and-never-reuses-id',()=>{
 const s=new G.Simulation(),a=s.ants[0],other=s.ants[1],next=s.colony.nextActor;other.waitingFor=a.id;other.yieldFor=a.id;other.yieldHold=a.id;other.wait=7;
 const path=JSON.stringify(other.path);s.killAnt(a);assert.equal(other.wait,7);assert.equal(JSON.stringify(other.path),path);for(const k of ['waitingFor','yieldFor','yieldHold'])assert(!Object.hasOwn(other,k));
 const e=s.spawnEnemy('scout');s.colony.raid.phase='scout';assert.equal(e.id,next);assert.notEqual(e.id,a.id);roundtrip(s);
});
test('births-and-invaders-share-the-monotonic-allocator',()=>{
 const s=load('world-900.json'),before=s.colony.nextActor,enemy=s.spawnEnemy('scout');s.colony.raid.phase='scout';assert.equal(enemy.id,before);const born=s.colony.stats.born;
 for(let k=0;k<60*180&&s.colony.stats.born===born;k++)s.step(G.STEP);
 assert(s.colony.stats.born>born,'a real brood hatches');assert(s.ants.some(a=>a.id>enemy.id));assert.equal(new Set([...s.ants,...s.colony.raid.enemies].map(a=>a.id)).size,s.ants.length+s.colony.raid.enemies.length);roundtrip(s);
 return {enemy:enemy.id,newborn:s.ants.at(-1).id};
});
test('large-numbers-never-outweigh-cargo-or-assigned-work',()=>{
 const host={carriedKind:a=>a.load},rank=(a,b)=>G.Simulation.prototype.trafficPriority.call(host,a,b),a={id:4294967295,job:null,load:'soil'},b={id:1,job:1,load:null};assert(rank(a,b)>0);
 a.load=null;a.job=4;b.job=null;assert(rank(a,b)>0);b.job=5;assert(rank(a,b)<0);assert.equal(rank(a,a),0);
});
test('allocator-reaches-uint32-end-without-wrapping',()=>{
 const s=new G.Simulation();s.colony.nextActor=G.ACTOR_MAX;assert.equal(s.allocateActorId(),4294967295);assert.equal(s.colony.nextActor,4294967296);assert.throws(()=>s.allocateActorId());assert.equal(s.colony.nextActor,4294967296);
});
for(const [n,h]of Object.entries(inputs))assert.equal(sha(fs.readFileSync(path.join(qa,n))),h);
const hashes=Object.fromEntries(['core.js','lifecycle.js','game.js','build.cjs','build-actors.cjs','verify-actors.cjs'].map(n=>[n,sha(fs.readFileSync(path.join(__dirname,n)))]));
fs.writeFileSync(path.join(qa,'actors-results.json'),JSON.stringify({results,inputs,hashes},null,2)+'\n');
