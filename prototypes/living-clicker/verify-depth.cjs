const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto'),Game=require('./game.js');
const qa=path.join(__dirname,'qa'),input=fs.readFileSync(path.join(qa,'before-depth.json')),s=Game.Simulation.restore(JSON.parse(input));
const gate=process.env.LIVING_DEPTH_GATE||'both',prefix=gate==='nursery'?'depth-nursery':'depth';fs.writeFileSync(path.join(qa,prefix+'-input.json'),input);
const hashes=Object.fromEntries(['core.js','lifecycle.js','game.js'].map(n=>[n,crypto.createHash('sha256').update(fs.readFileSync(path.join(__dirname,n))).digest('hex')]));
const snapshots=[],began=s.time;let firstReach=null,firstRoom=null;
// The deep rooms are found by purpose and layer: other chambers take ids too.
const deep=kind=>{const r=s.roomOf(2,kind);return r!==undefined&&!!s.builds[r]?.complete;};
(async()=>{for(let n=0;n<4000;n++){
 for(let k=0;k<60;k++)s.step(Game.STEP);
 if(s.progress.reached>=2&&firstReach===null)firstReach=s.time;
 if(deep('egg')&&firstRoom===null)firstRoom=s.time;
 if(n%100===0){const snap={t:s.time,reached:s.progress.reached,delivered:s.stats.grainDelivered,rooms:s.builds.slice(4).map(b=>({mode:b.mode,complete:b.complete,length:b.length,tip:b.tip}))};snapshots.push(snap);console.log(JSON.stringify(snap));fs.writeFileSync(path.join(qa,prefix+'-checkpoint.json'),JSON.stringify(s.dump()));}
 if(firstRoom&&(gate==='nursery'?s.time>=firstRoom+30:deep('food')))break;
 await new Promise(setImmediate);
 }
 assert(firstReach!==null,'no real arrival at layer 2');assert(firstRoom!==null,'deep nursery was not opened');if(gate==='both')assert(deep('food'),'deep food room was not opened');assert(s.stats.grainDelivered>JSON.parse(input).world.stats.grainDelivered);s.assertLedger();s.assertProgress();assert.deepEqual(Game.Simulation.restore(s.dump()).dump(),s.dump());
 for(const mutate of [p=>p.progress.cookie++,p=>p.progress.research.dig_speed=99,p=>p.progress.earned++,p=>p.progress.speed=11,p=>p.colony.stats.born++,p=>p.progress.claims.push(2)]){const p=s.dump();mutate(p);assert.throws(()=>Game.Simulation.restore(p));}
 for(const [n,h]of Object.entries(hashes))assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(__dirname,n))).digest('hex'),h,'source changed during depth verification');
 const result={pass:true,gate,began,finished:s.time,firstReach,firstRoom,foodRoomComplete:deep('food'),delivered:s.stats.grainDelivered,ants:s.ants.length,capacity:s.capacities(),invalidInputs:6,snapshots,hashes,inputHash:crypto.createHash('sha256').update(input).digest('hex')};
 fs.writeFileSync(path.join(qa,gate==='nursery'?'world-nursery-final.json':'world-final.json'),JSON.stringify(s.dump()));fs.writeFileSync(path.join(qa,prefix+'-results.json'),JSON.stringify(result,null,2));console.log('PASS '+JSON.stringify(result));
})().catch(e=>{fs.writeFileSync(path.join(qa,prefix+'-failed.json'),JSON.stringify({error:String(e),collision:s.collision,state:s.dump()}));console.error(e);process.exitCode=1;});
