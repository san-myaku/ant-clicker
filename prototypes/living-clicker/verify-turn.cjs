const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const Game=require('./game.js'),Original=require('../colony-game/core.js');
const fixture=JSON.parse(fs.readFileSync(path.join(__dirname,'qa/collision.json')));
const original=Original.Simulation.restore(fixture.save.world),current=Game.Simulation.restore(fixture.save),c=fixture.collision;
assert(original.sweptClear(c.from,c.target));
assert(!current.sweptClear(c.from,c.target));
const ant=current.ants.find(a=>a.id===c.id),job=current.jobs.find(j=>j.ant===ant.id),route=current.path(ant,job.pose,null);
assert(route&&route.length,'no safe replacement route');let p=ant;
for(const q of route){assert(current.sweptClear(p,q,null));p=q;}
fs.writeFileSync(path.join(__dirname,'qa/turn-results.json'),JSON.stringify({pass:true,at:fixture.save.world.time,oldAcceptsUnsafeTurn:true,newRejectsUnsafeTurn:true,safeRoutePoints:route.length},null,2));
console.log('PASS exact heading boundary and safe replacement route');
