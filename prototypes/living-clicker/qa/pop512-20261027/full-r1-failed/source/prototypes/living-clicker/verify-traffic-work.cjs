/* Compare with the archived unoptimized rules, including a real 512-ant save.
   Timing is descriptive under the full suite; equality is the pass condition. */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto'),G=require('./game.js'),Old=require('./qa/surface-reference.cjs')(path.join(__dirname,'qa/pop512-20261027/before-optimization'));
const qa=path.join(__dirname,'qa'),sha=b=>crypto.createHash('sha256').update(b).digest('hex'),names=['game.js','core.js','lifecycle.js','build.cjs','verify-traffic-work.cjs',...['game.js','core.js','lifecycle.js'].map(n=>'qa/pop512-20261027/before-optimization/'+n)],hashes=()=>Object.fromEntries(names.map(n=>[n,sha(fs.readFileSync(path.join(__dirname,n)))])),source=hashes(),inputs={},results=[];
// The room-parallelism change is intentional. Compare traffic/item work with
// that same current planning rule on both sides; keep old core/life behavior.
Old.Simulation.prototype.restParallel=G.Simulation.prototype.restParallel;
Old.Simulation.prototype.ensureRestRoom=G.Simulation.prototype.ensureRestRoom;
for(const name of ['world-900.json','before-512.json','head-on-retreat.json','raid-stuck-loot.json','world-512.json']){
 const bytes=fs.readFileSync(path.join(qa,name));inputs[name]=sha(bytes);const data=JSON.parse(bytes),p=data.state||data,a=Old.Simulation.restore(p),b=G.Simulation.restore(p);if(name==='before-512.json'){assert(a.buyResearch('queen_embrace'));assert(b.buyResearch('queen_embrace'));}
 let queries=0;for(const build of a.builds.slice(2).filter(Boolean))for(let n=0;n<build.history.length;n+=4)for(const [dx,dy]of [[0,0],[1.2,0],[1.2-1e-7,0],[0,1.2+1e-7],[.67,.67]]){const q=build.history[n],point={x:q.x+dx,y:q.y+dy};assert.equal(b.singleFileSection(point),a.singleFileSection(point));queries++;}
 let oldMs=0,newMs=0;const steps=name==='world-512.json'?300:600;
 for(let k=0;k<steps;k++){let t=performance.now();a.step(G.STEP);oldMs+=performance.now()-t;t=performance.now();b.step(G.STEP);newMs+=performance.now()-t;if(k<10||k%60===0)assert.deepEqual(a.dump(),b.dump());}
 assert.deepEqual(a.dump(),b.dump());results.push({name,pass:true,steps,neckQueries:queries,oldMsPerStep:oldMs/steps,newMsPerStep:newMs/steps});console.log('PASS exact traffic and item work '+name);
}
assert.deepEqual(hashes(),source);for(const [name,h]of Object.entries(inputs))assert.equal(sha(fs.readFileSync(path.join(qa,name))),h);fs.writeFileSync(path.join(qa,'traffic-work-results.json'),JSON.stringify({pass:true,source,inputs,results},null,2)+'\n');
