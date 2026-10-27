/* Real growth, with actual food/cookies and the same fed brood hatching.
   No ants, stock, homes or air are injected. */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto'),G=require('./game.js'),{Observer}=require('./diagnostics.js');
const qa=path.join(__dirname,'qa'),inputName=process.argv.includes('--chain')?'world-scale.json':'before-256.json',bytes=fs.readFileSync(path.join(qa,inputName)),sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const source=Object.fromEntries(['core.js','lifecycle.js','game.js','view-research.js','build.cjs','verify-256.cjs'].map(n=>[n,sha(fs.readFileSync(path.join(__dirname,n)))]));
const s=G.Simulation.restore(JSON.parse(bytes)),began=s.time,initial={ants:s.ants.length,laid:s.colony.stats.laid,born:s.colony.stats.born,eaten:s.colony.stats.eaten,generated:s.colony.stats.generated,gathered:s.colony.stats.gathered,dug:s.stats.grainDug,delivered:s.stats.grainDelivered};
assert.equal(s.level('queen_embrace'),1);assert.equal(s.populationLimit(),128);assert.equal(s.researchStatus('queen_embrace'),'ready');
const air=s.grains.slice(),beforeFood=s.availableFood().length,beforeCookie=s.progress.cookie;assert(s.buyResearch('queen_embrace'));assert.equal(s.populationLimit(),256);assert.equal(s.availableFood().length,beforeFood-48);assert.equal(s.progress.cookie,beforeCookie-18);assert.deepEqual(s.grains,air);
const observer=new Observer({metadata:{sourceSha256:source},config:{maxIncidents:4}}).attach(s),samples=[];let reached=null,wideCarrier=null,peakBrood=0;
try{
 for(let second=0;second<9000;second++){
  for(let k=0;k<60;k++){s.step(G.STEP);peakBrood=Math.max(peakBrood,s.colony.brood.length);if(!wideCarrier){const b=s.physics.bodies.find(b=>b.carrier>255&&s.ants.some(a=>a.id===b.carrier));if(b){const saved=s.dump();assert.deepEqual(G.Simulation.restore(saved).dump(),saved);wideCarrier={t:s.time,id:b.id,carrier:b.carrier,kind:b.kind};}}}
  if(second%120===0){s.assertLedger();s.assertProgress();const p=s.dump();assert.deepEqual(G.Simulation.restore(p).dump(),p);const row={t:s.time,ants:s.ants.length,brood:s.colony.brood.length,stock:s.availableFood().length,crowded:s.crowding().length,rooms:s.roomIds().length,capacity:s.capacities(),dug:s.stats.grainDug,delivered:s.stats.grainDelivered,care:s.growthCare(),incidents:observer.incidents.map(e=>({type:e.type,ids:e.ids}))};samples.push(row);console.log(JSON.stringify(row));}
  if(reached===null&&s.ants.length===256)reached=s.time;
  if(reached!==null&&s.time>=reached+600&&s.crowding().length<6)break;
 }
 assert(reached!==null,'the real colony did not reach 256');assert.equal(s.ants.length,256);assert(s.time>=reached+600,'observe life after reaching the cap');assert(s.crowding().length<6,'the workers have actual places to rest');
 assert(s.colony.stats.born-initial.born>=128);assert(s.colony.stats.eaten-initial.eaten>=256);assert(s.colony.stats.gathered>initial.gathered);assert(s.stats.grainDug>initial.dug);assert(s.stats.grainDelivered>initial.delivered);assert(wideCarrier,'a worker above id255 carries a real load');
 assert.deepEqual(observer.incidents.map(e=>({type:e.type,ids:e.ids})),[]);s.assertLedger();s.assertProgress();assert.deepEqual(G.Simulation.restore(s.dump()).dump(),s.dump());
 for(const [n,h]of Object.entries(source))assert.equal(sha(fs.readFileSync(path.join(__dirname,n))),h);assert.equal(sha(fs.readFileSync(path.join(qa,inputName))),sha(bytes));
 const result={pass:true,began,reached,finished:s.time,ants:s.ants.length,peakBrood,wideCarrier,initial,final:{laid:s.colony.stats.laid,born:s.colony.stats.born,eaten:s.colony.stats.eaten,generated:s.colony.stats.generated,gathered:s.colony.stats.gathered,dug:s.stats.grainDug,delivered:s.stats.grainDelivered,crowded:s.crowding().length},samples,source,input:inputName,inputSha256:sha(bytes)};
 fs.writeFileSync(path.join(qa,'world-256.json'),JSON.stringify(s.dump()));fs.writeFileSync(path.join(qa,'growth-256-results.json'),JSON.stringify(result,null,2)+'\n');console.log('PASS natural 256 '+JSON.stringify({reached,finished:s.time,peakBrood,crowded:s.crowding().length}));
}catch(error){fs.writeFileSync(path.join(qa,'growth-256-failed.json'),JSON.stringify({error:String(error.stack||error),state:s.dump(),diagnostics:observer.export(),samples,source,input:inputName,inputSha256:sha(bytes)}));throw error;}
