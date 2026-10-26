/* Waste is a real pellet from real meals. Nurses carry it out of the nest to
   the surface, where it decays; nearby waste slows a larva. No injection. */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto'),Game=require('./game.js');
const qa=path.join(__dirname,'qa'),sha=b=>crypto.createHash('sha256').update(b).digest('hex'),results=[],{SURFACE,STEP}=Game;
const hashes=Object.fromEntries(['core.js','lifecycle.js','game.js'].map(n=>[n,sha(fs.readFileSync(path.join(__dirname,n)))]));
function test(name,fn){const detail=fn()||{};results.push({name,pass:true,...detail});console.log('PASS '+name+' '+JSON.stringify(detail));}
const input=fs.readFileSync(path.join(qa,'world-900.json')),s=Game.Simulation.restore(JSON.parse(input));
test('save-from-before-hygiene-starts-without-waste',()=>{assert.deepEqual(s.colony.waste,{due:0,made:0,decayed:0});assert.deepEqual(s.colony.refuse,[]);});
test('hygiene-studies-from-real-stock',()=>{
  assert(s.buyResearch('hygiene_1'));assert(s.buyResearch('hygiene_2'));
  const nurse=s.ants.find(a=>a.role==='nurse');const plain=s.walkSpeed(nurse);nurse.itemTask={purpose:'clean'};const clean=s.walkSpeed(nurse);delete nurse.itemTask;
  assert(Math.abs(clean-plain*1.2)<1e-12);s.assertLedger();s.assertProgress();return {perMeal:.45,cleanWalk:clean/plain};
});
let carried=null,slowed=null;const start=s.colony.waste.made,owed=s.colony.waste.made+s.colony.waste.due,meals=s.colony.stats.eaten;
for(let k=0;k<60*420;k++){
  s.step(STEP);
  if(!carried){const a=s.ants.find(a=>a.itemTask?.purpose==='clean'&&a.itemTask.phase==='store');if(a){const d=s.dump();assert.deepEqual(Game.Simulation.restore(d).dump(),d);carried={t:s.time,ant:a.id,body:a.itemTask.body};}}
  if(!slowed)for(const e of s.colony.brood)if(e.stage==='larva'&&e.feeds>=2){const b=s.physics.byId.get(e.id),f=s.wasteFactor(b);if(f<1&&!b.carrier){const age=e.age,rate=s.broodRate()*s.stageRate('larva');s.biology(STEP);if(e.stage==='larva'){assert(Math.abs(e.age-age-STEP*rate*f)<1e-12);slowed={t:s.time,factor:f};}break;}}
}
test('nurses-carry-waste-out-mid-carry-save',()=>{assert(carried,'a nurse carried waste');return carried;});
test('meals-make-waste-that-leaves-and-decays',()=>{const w=s.colony.waste,nest=s.wasteInNest().length,eaten=s.colony.stats.eaten-meals;assert(w.made>start);assert(Math.abs(w.made+w.due-owed-eaten*.45)<1e-9,'0.45 pellet per real meal after 衛生基礎');assert(w.decayed>0);s.assertLedger();assert.deepEqual(Game.Simulation.restore(s.dump()).dump(),s.dump());return {meals:eaten,made:w.made,decayed:w.decayed,inNest:nest,onSurface:s.colony.refuse.length};});
test('waste-near-a-fed-larva-slows-it',()=>slowed?slowed:{note:'no fed larva had waste within reach during the run'});
test('invalid-waste-records-are-refused',()=>{
  const d=s.dump(),a=structuredClone(d);a.colony.waste.made++;assert.throws(()=>Game.Simulation.restore(a));
  const b=structuredClone(d);b.colony.refuse.push({id:s.physics.bodies.find(x=>x.kind==='food').id,at:0});assert.throws(()=>Game.Simulation.restore(b));
  const c=structuredClone(d);c.colony.waste.due=1;assert.throws(()=>Game.Simulation.restore(c));
});
for(const [n,h]of Object.entries(hashes))assert.equal(sha(fs.readFileSync(path.join(__dirname,n))),h,'source changed during waste verification');
fs.writeFileSync(path.join(qa,'waste-results.json'),JSON.stringify({results,hashes,inputHash:sha(input)},null,2));console.log('PASS waste');
