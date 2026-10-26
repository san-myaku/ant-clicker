/* Fermentation from real food. From the natural 64-ant save, the colony buys
   the fermentation studies with its own stock, digs the chamber, carries
   real food into it, ferments batches into sweet grains, and foragers carry
   each grain to the queen chamber where it counts as a cookie. */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto'),Game=require('./game.js');
const qa=path.join(__dirname,'qa'),sha=b=>crypto.createHash('sha256').update(b).digest('hex'),results=[],{STEP,GRAIN}=Game;
const hashes=Object.fromEntries(['core.js','lifecycle.js','game.js'].map(n=>[n,sha(fs.readFileSync(path.join(__dirname,n)))]));
function test(name,fn){const detail=fn()||{};results.push({name,pass:true,...detail});console.log('PASS '+name+' '+JSON.stringify(detail));}
const input=fs.readFileSync(path.join(qa,'world-final.json')),s=Game.Simulation.restore(JSON.parse(input));
test('save-from-before-fermentation-starts-empty',()=>{assert.deepEqual(s.colony.ferment,{batch:[],startedAt:0,used:0,made:0,credited:0,batches:0});assert.equal(s.fermentRoom(),undefined);});
test('fermentation-studies-from-real-stock',()=>{for(const id of ['ferment_unlock','ferment_1','ferment_2','ferment_3'])assert(s.buyResearch(id),id);assert.equal(s.fermentBatch(),5);s.assertLedger();s.assertProgress();});
const cookie0=s.progress.cookie,earned0=s.progress.earned;let readyAt=null,committed=null,carried=null,savedMid=null;
for(let k=0;k<60*1800;k++){
  s.step(STEP);const r=s.fermentRoom();
  if(readyAt===null&&s.fermentReady()!==undefined)readyAt=s.time;
  if(!committed&&s.colony.ferment.batch.length){const ids=new Set(s.colony.ferment.batch);assert(!s.foodBodies(true).some(b=>ids.has(b.id)),'committed food is not usable');assert(!s.availableFood().some(b=>ids.has(b.id)));committed={t:s.time,batch:ids.size};}
  if(!carried){const a=s.ants.find(a=>a.itemTask&&s.physics.byId.get(a.itemTask.body)?.kind==='cookie'&&a.itemTask.phase==='store');if(a){carried={t:s.time,ant:a.id,role:a.role};const d=s.dump();assert.deepEqual(Game.Simulation.restore(d).dump(),d);savedMid=s.time;}}
}
test('chamber-is-dug-and-fed-with-real-food',()=>{const r=s.fermentRoom();assert(r!==undefined&&s.builds[r].complete);assert.equal(s.roomName(r),'発酵室');assert(readyAt!==null);assert(committed);return {readyAt:+readyAt.toFixed(1),committed};});
test('batches-become-sweet-grains-credited-in-the-queen-chamber',()=>{
  const f=s.colony.ferment;assert(f.batches>=10,'ten batches');assert.equal(f.used,f.batches*5);assert.equal(f.made,f.batches+Math.floor(f.batches/10),'one extra grain per ten batches');
  assert(carried,'a worker carried a grain');assert(f.credited>0);assert.equal(s.physics.bodies.filter(b=>b.kind==='cookie').length,f.made-f.credited);
  assert.equal(s.progress.earned-earned0,s.progress.cookie-cookie0);s.assertLedger();s.assertProgress();assert.deepEqual(Game.Simulation.restore(s.dump()).dump(),s.dump());
  return {batches:f.batches,used:f.used,made:f.made,credited:f.credited,cookieGain:s.progress.cookie-cookie0,carried,savedMid};
});
test('invalid-fermentation-records-are-refused',()=>{
  const d=s.dump(),a=structuredClone(d);a.colony.ferment.credited=a.colony.ferment.made+1;assert.throws(()=>Game.Simulation.restore(a));
  const b=structuredClone(d);b.colony.ferment.used++;assert.throws(()=>Game.Simulation.restore(b));
  const c=structuredClone(d);c.colony.ferment.batch=[s.physics.bodies.find(x=>x.kind==='soil').id];assert.throws(()=>Game.Simulation.restore(c));
});
for(const [n,h]of Object.entries(hashes))assert.equal(sha(fs.readFileSync(path.join(__dirname,n))),h,'source changed during fermentation verification');
fs.writeFileSync(path.join(qa,'ferment-results.json'),JSON.stringify({results,hashes,inputHash:sha(input)},null,2));console.log('PASS ferment');
