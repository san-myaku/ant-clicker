/* Disease from neglected nurseries. Only player actions are used: the player
   leaves one nurse, waste piles up in the nursery, disease starts and idle
   workers die; restoring nurses cleans the nursery and the disease ends. */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto'),Game=require('./game.js');
const qa=path.join(__dirname,'qa'),sha=b=>crypto.createHash('sha256').update(b).digest('hex'),results=[],{STEP,WALK_SPEED}=Game;
const hashes=Object.fromEntries(['core.js','lifecycle.js','game.js'].map(n=>[n,sha(fs.readFileSync(path.join(__dirname,n)))]));
function test(name,fn){const detail=fn()||{};results.push({name,pass:true,...detail});console.log('PASS '+name+' '+JSON.stringify(detail));}
const input=fs.readFileSync(path.join(qa,'world-900.json')),s=Game.Simulation.restore(JSON.parse(input));
test('save-from-before-disease-starts-healthy',()=>{assert.deepEqual(s.colony.disease,{active:false,next:0});assert.equal(s.colony.stats.died,0);});
while(s.roleCounts(true).nurse>1)s.shiftRole('nurse',-1);
let onset=null,firstDeath=null,deaths=[],savedSick=null;
for(let k=0;k<60*2400&&deaths.length<2;k++){
  const before=new Map(s.ants.map(a=>[a.id,{job:a.job,item:!!a.itemTask,cargo:!!a.cargo}])),died=s.colony.stats.died,ratio=s.wasteRatio();
  s.step(STEP);
  if(!onset&&s.colony.disease.active){onset={t:s.time,ratio};assert(ratio>=1-1e-9||s.wasteRatio()>=1,'starts at full tolerance');}
  if(s.colony.stats.died>died){const gone=[...before.keys()].filter(id=>!s.ants.some(a=>a.id===id));assert.equal(gone.length,1);const was=before.get(gone[0]);assert(was.job===null&&!was.item&&!was.cargo,'only an idle worker dies');deaths.push({t:s.time,id:gone[0]});if(!savedSick){const d=s.dump();assert.deepEqual(Game.Simulation.restore(d).dump(),d);savedSick=s.time;}}
}
test('neglected-nursery-gets-sick-and-idle-workers-die',()=>{
  assert(onset,'disease started');assert(deaths.length>=2,'workers died');assert(deaths[1].t-deaths[0].t>=60-1e-9,'one death per interval at most');
  s.assertLedger();assert.equal(s.ants.length,s.colony.stats.initialAnts+s.colony.stats.born-s.colony.stats.died);
  assert(s.events.some(e=>e.text.includes('病気が広がり始めました')));return {onset,deaths,savedSick};
});
test('restoring-nurses-ends-the-disease',()=>{
  while(s.roleCounts(true).nurse<Math.ceil(s.ants.length/3))s.shiftRole('nurse',1);
  let cured=null;for(let k=0;k<60*900&&!cured;k++){s.step(STEP);if(!s.colony.disease.active)cured=s.time;}
  assert(cured,'disease ended');assert(s.wasteRatio()<.7+1e-9);s.assertLedger();assert.deepEqual(Game.Simulation.restore(s.dump()).dump(),s.dump());
  return {cured,ratio:s.wasteRatio(),died:s.colony.stats.died};
});
test('a-later-birth-reuses-a-freed-id',()=>{
  const free=s.freeAntId(),born=s.colony.stats.born,next=s.colony.nextAnt;if(free===undefined)return {note:'no id freed'};
  for(let k=0;k<60*600&&s.colony.stats.born===born;k++)s.step(STEP);if(s.colony.stats.born===born)return {note:'no birth within 600 s'};
  assert(s.ants.some(a=>a.id===free));assert.equal(s.colony.nextAnt,next);return {reused:free};
});
test('clean-colony-study-speeds-foragers-while-nurseries-are-clean',()=>{
  const r=Game.Simulation.restore(JSON.parse(fs.readFileSync(path.join(qa,'world-final.json'))));
  for(const id of ['hygiene_1','hygiene_2','hygiene_clean_bonus'])assert(r.buyResearch(id),id);
  const f=r.ants.find(a=>a.role==='forage');assert.equal(r.nurseryWaste(),0);
  const level=r.level('gather_1')*.15+r.level('gather_2')*.15+r.level('gather_inf')*.05+r.level('queen_pheromone')*.2;
  assert(Math.abs(r.walkSpeed(f)-WALK_SPEED*(1+level+.2))<1e-9);r.assertProgress();return {walk:r.walkSpeed(f)};
});
test('invalid-disease-records-are-refused',()=>{
  const d=s.dump(),a=structuredClone(d);a.colony.stats.died=-1;assert.throws(()=>Game.Simulation.restore(a));
  const b=structuredClone(d);b.colony.disease.active='yes';assert.throws(()=>Game.Simulation.restore(b));
  const c=structuredClone(d);c.colony.stats.died++;assert.throws(()=>Game.Simulation.restore(c));
});
for(const [n,h]of Object.entries(hashes))assert.equal(sha(fs.readFileSync(path.join(__dirname,n))),h,'source changed during disease verification');
fs.writeFileSync(path.join(qa,'disease-results.json'),JSON.stringify({results,hashes,inputHash:sha(input)},null,2));console.log('PASS disease');
