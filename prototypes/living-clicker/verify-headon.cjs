/* A natural save (hygiene stage, 5200 s, 64 ants) where a soil carrier and a
   digger met head-on in a neck. Each one's own trail curved past the other,
   so neither could back out along it and the colony stopped for 1500 s. One
   must give way along a planned route to open room space and work resumes. */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),Game=require('./game.js');
const s=Game.Simulation.restore(JSON.parse(fs.readFileSync(path.join(__dirname,'qa/head-on-retreat.json'))));
const a=s.ants.find(a=>a.id===18),b=s.ants.find(a=>a.id===42),start={a:{x:a.x,y:a.y},b:{x:b.x,y:b.y}},delivered=s.stats.grainDelivered,yields=s.stats.yields;
assert(Math.hypot(a.x-b.x,a.y-b.y)<.75&&a.task==='haul'&&b.task==='travel','the fixed save holds the head-on pair');
for(let k=0;k<60*120;k++)s.step(Game.STEP);
s.assertLedger();assert.deepEqual(Game.Simulation.restore(s.dump()).dump(),s.dump());
assert(s.stats.yields>yields,'one worker gave way');assert(s.stats.grainDelivered>delivered,'hauling resumed');
const moved=Math.hypot(a.x-start.a.x,a.y-start.a.y)+Math.hypot(b.x-start.b.x,b.y-start.b.y);assert(moved>1);
// Another natural 64-ant stop: a reversed trail turns toward the passer after
// the latter has advanced. Replanning must keep the original resume/work and
// reach real open floor; clearing flags or moving either worker is not enough.
const crypto=require('node:crypto'),qa=path.join(__dirname,'qa'),sha=b=>crypto.createHash('sha256').update(b).digest('hex'),fixture=fs.readFileSync(path.join(qa,'retreat-turnback-64.json')),data=JSON.parse(fixture),oldFolder=path.join(qa,'pop512-20261027/before-turnback-fix'),Old=require(path.join(oldFolder,'game.js'));
for(const[n,h]of Object.entries(data.provenance.source))assert.equal(sha(fs.readFileSync(path.join(oldFolder,n))),h);
const old=Old.Simulation.restore(data.state),fixed=Game.Simulation.restore(data.state),pair=sim=>[6,11].map(id=>sim.ants.find(a=>a.id===id)),poses=sim=>pair(sim).map(a=>({x:a.x,y:a.y,angle:a.angle})),initial=poses(old),before=old.stats.grainDelivered;
assert.equal(pair(old)[0].yieldFor,11);assert.equal(pair(old)[1].waitingFor,6);assert(pair(old).every(a=>a.blocked>3000));
for(let k=0;k<60*10;k++)old.step(Game.STEP);
assert.deepEqual(poses(old),initial);assert.equal(old.stats.grainDelivered,before,'old source reproduces the mutual stop');
let replanned=0;const retreat=fixed.retreat;
fixed.retreat=function(a,b){const active=a.yielding,resume=active?structuredClone(a.resume):null,pose={x:a.x,y:a.y,angle:a.angle},job=a.job,cargo=active?structuredClone(a.cargo):null,soil=active?this.grains.slice():null;const ok=retreat.call(this,a,b);if(active&&ok){replanned++;assert.deepEqual(a.resume,resume);assert.deepEqual({x:a.x,y:a.y,angle:a.angle},pose);assert.equal(a.job,job);assert.deepEqual(a.cargo,cargo);assert.deepEqual(this.grains,soil);let p=a;for(const q of a.path){assert(this.sweptClear(p,q,this.carriedKind(a),-1,.025));p=q;}}return ok;};
for(let k=0;k<60*120;k++)fixed.step(Game.STEP);
fixed.assertLedger();fixed.assertProgress();assert.deepEqual(Game.Simulation.restore(fixed.dump()).dump(),fixed.dump());
assert(replanned>0);assert(fixed.stats.grainDelivered>=before+4);assert(!fixed.jobs.some(j=>j.id===664),'the same carrier finished its four-grain load');assert.equal(pair(fixed)[1].cargo,null);assert(Math.hypot(pair(fixed)[0].x-initial[0].x,pair(fixed)[0].y-initial[0].y)>1);
const names=['game.js','core.js','lifecycle.js','build.cjs','build-retreat.cjs','verify-headon.cjs',...['game.js','core.js','lifecycle.js'].map(n=>'qa/pop512-20261027/before-turnback-fix/'+n)],source=Object.fromEntries(names.map(n=>[n,sha(fs.readFileSync(path.join(__dirname,n)))]));
const turnback={pass:true,inputSha256:sha(fixture),oldReproductionSeconds:10,newContinuationSeconds:120,replanned,delivered:[before,fixed.stats.grainDelivered],source};
fs.writeFileSync(path.join(__dirname,'qa/headon-results.json'),JSON.stringify({pass:true,yields:s.stats.yields-yields,delivered:[delivered,s.stats.grainDelivered],turnback},null,2));
console.log('PASS active retreat turn-back '+JSON.stringify({replanned,delivered:fixed.stats.grainDelivered-before}));
console.log('PASS head-on neck: planned give-way and hauling resumed '+JSON.stringify({yields:s.stats.yields-yields,delivered:s.stats.grainDelivered-delivered}));
