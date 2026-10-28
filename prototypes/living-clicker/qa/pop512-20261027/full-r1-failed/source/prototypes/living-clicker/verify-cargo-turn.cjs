const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),G=require('./game.js'),Old=require('../colony-game/core.js');
const f=JSON.parse(fs.readFileSync(path.join(__dirname,'qa/deep-collision.json'))),s=G.Simulation.restore(f.state),c=f.collision,a=s.ants.find(a=>a.id===c.id),prev=a.path[a.next-1];
assert(Old.Simulation.prototype.sweptClear.call(s,prev,c.target,c.kind));
assert(!Old.Simulation.prototype.sweptClear.call(s,c.from,c.proposed,c.kind,-1,.025));
assert(s.sweptClear(prev,c.target,c.kind));assert(s.sweptClear(c.from,c.proposed,c.kind,-1,.025));
for(let n=0;n<1000;n++){const lo=n/1000,hi=(n+1)/1000,p=t=>({x:prev.x+(c.target.x-prev.x)*t,y:prev.y+(c.target.y-prev.y)*t,angle:prev.angle+(c.target.angle-prev.angle)*t});assert(s.sweptClear(p(lo),p(hi),c.kind,-1,.025));}
const walked=a.walked;s.advance(60);s.assertLedger();assert(s.ants.find(a=>a.id===c.id).walked>walked+1);assert.deepEqual(G.Simulation.restore(s.dump()).dump(),s.dump());
fs.writeFileSync(path.join(__dirname,'qa/cargo-turn-results.json'),JSON.stringify({pass:true,at:f.state.world.time,subdivisions:1000,continuedTo:s.time,delivered:s.stats.grainDelivered},null,2));console.log('PASS exact cargo translation and heading jump, all subdivisions, real saved continuation');
