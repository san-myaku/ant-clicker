/* Pebbles. A few loose pebbles lie in the soil, more in the deeper layers.
   A digger pries one loose and carries it alone, at a slower pace; on the
   heap it does not sink into the ground like soil, so pebbles gather there. */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto'),Game=require('./game.js');
const qa=path.join(__dirname,'qa'),sha=b=>crypto.createHash('sha256').update(b).digest('hex'),results=[],{STEP,SURFACE,PEBBLE,WALK_SPEED}=Game;
const hashes=Object.fromEntries(['core.js','lifecycle.js','game.js'].map(n=>[n,sha(fs.readFileSync(path.join(__dirname,n)))]));
function test(name,fn){const detail=fn()||{};results.push({name,pass:true,...detail});console.log('PASS '+name+' '+JSON.stringify(detail));}
const s=new Game.Simulation(24014);
test('pebbles-lie-in-the-soil',()=>{let soil=0,pebbles=0,deep=0;for(let g=0;g<s.grains.length;g++){if(!s.grains[g])continue;soil++;if(s.grains[g]===PEBBLE){pebbles++;if(s.layerAt(...Object.values(Game.GRAIN.center(g)))>1)deep++;}}
  assert(pebbles>0&&pebbles/soil<.05);assert(deep>0);return {pebbles,share:+(pebbles/soil).toFixed(4),deep};});
const seen=new Set();let alone=0,mixed=0,pace=null,carrySave=null,dug=0;
for(let k=0;k<60*1200;k++){
  s.step(STEP);
  for(const j of s.jobs){if(seen.has(j.id))continue;seen.add(j.id);if(j.materials.includes(PEBBLE)){if(j.materials.length===1)alone++;else mixed++;}}
  if(pace===null){const a=s.ants.find(a=>s.carriesPebble(a));if(a){pace=s.walkSpeed(a)/s.walkSpeed({...a,job:null});const d=s.dump();assert.deepEqual(Game.Simulation.restore(d).dump(),d);carrySave=s.time;}}
}
dug=s.physics.bodies.filter(b=>b.kind==='soil'&&b.material===PEBBLE).length;
test('a-pebble-is-carried-alone-and-slowly',()=>{assert(alone>0,'pebbles were dug');assert.equal(mixed,0);assert(Math.abs(pace-.7)<1e-12);assert(carrySave);return {pebbleTrips:alone,pace,carrySave:+carrySave.toFixed(1)};});
test('pebbles-gather-on-the-heap',()=>{
  const heap=s.physics.bodies.filter(b=>b.kind==='soil'&&b.material===PEBBLE&&b.y<SURFACE&&!b.carrier&&b.state==='delivered');assert(heap.length>0);assert(s.stats.grainSettled>0,'soil still sinks in');
  s.assertLedger();const d=s.dump();assert.deepEqual(Game.Simulation.restore(d).dump(),d);return {onHeap:heap.length,pebbleBodies:dug,settledSoil:s.stats.grainSettled};
});
for(const [n,h]of Object.entries(hashes))assert.equal(sha(fs.readFileSync(path.join(__dirname,n))),h,'source changed during pebble verification');
fs.writeFileSync(path.join(qa,'pebble-results.json'),JSON.stringify({results,hashes},null,2));console.log('PASS pebble');
