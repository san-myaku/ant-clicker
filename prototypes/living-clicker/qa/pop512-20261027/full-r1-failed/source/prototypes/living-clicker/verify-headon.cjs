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
fs.writeFileSync(path.join(__dirname,'qa/headon-results.json'),JSON.stringify({pass:true,yields:s.stats.yields-yields,delivered:[delivered,s.stats.grainDelivered]},null,2));
console.log('PASS head-on neck: planned give-way and hauling resumed '+JSON.stringify({yields:s.stats.yields-yields,delivered:s.stats.grainDelivered-delivered}));
