const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto'),G=require('./game.js'),Old=require('./qa/pose-reference/game.js'),results=[],sha=b=>crypto.createHash('sha256').update(b).digest('hex');
function test(name,fn){const detail=fn();results.push({name,pass:true,...detail});console.log('PASS '+name);}
const reference=JSON.parse(fs.readFileSync(path.join(__dirname,'qa/pose-reference/source.json')));assert.equal(reference.baseCommit,'82cb191');for(const[n,h]of Object.entries(reference.source))assert.equal(sha(fs.readFileSync(path.join(__dirname,'qa/pose-reference',n))),h);
test('hash-collisions-never-alias-float64-coordinates',()=>{
 const cache=new G.PoseAnswerCache(),tag=cache.tag(0,null),x=40.1234561,y=25.25,other=40.1234562;assert.equal(cache.slot(x,y,tag),cache.slot(other,y,tag));cache.set(x,y,tag,-1);assert.equal(cache.get(other,y,tag),undefined);cache.set(other,y,tag,123);assert.equal(cache.get(x,y,tag),undefined);assert.equal(cache.get(other,y,tag),123);assert.equal(cache.x[cache.slot(other,y,tag)],other);
 const tags=new Set();for(const kind of [null,'egg','food','soil1','soil2','soil','waste','cookie'])for(let h=0;h<16;h++){const t=cache.tag(h,kind);assert(!tags.has(t));tags.add(t);cache.set(10.25,20.75,t,h);assert.equal(cache.get(10.25,20.75,t),h);}
 cache.clear();assert.equal(cache.size,0);assert.equal(cache.get(other,y,tag),undefined);return {slots:cache.mask+1,payloadBytes:[cache.x,cache.y,cache.tags,cache.answers].reduce((n,v)=>n+v.byteLength,0)};
});
test('poses-loads-heading-boundaries-and-bypasses-match-reference',()=>{
 const bytes=fs.readFileSync(path.join(__dirname,'qa/world-512.json')),p=JSON.parse(bytes),a=Old.Simulation.restore(p),b=G.Simulation.restore(p);let checked=0;
 const points=[...a.ants.filter((v,k)=>k%12===0).map(v=>({x:v.x,y:v.y})),...Array.from({length:24},(_,k)=>({x:4.25+(k*17)%87,y:9.25+(k*13)%77}))];
 const angles=Array.from({length:16},(_,h)=>[h*Math.PI/8,(h+.5)*Math.PI/8-1e-8,(h+.5)*Math.PI/8+1e-8]).flat();
 for(const point of points)for(const kind of [null,'egg','food','soil1','soil2','soil','waste','cookie'])for(const angle of angles){
  const pose={...point,angle};for(const margin of [.045,.025,.09]){const old=a.poseClear(pose,kind,-1,margin),now=b.poseClear(pose,kind,-1,margin);assert.equal(now,old);if(!old)assert.equal(b._block,a._block);checked++;}
 }
 const before=b._poseChecks.size;for(const margin of [.025,.09])b.poseClear({x:48.25,y:24.25,angle:0},null,-1,margin);b.poseClear({x:48.25,y:24.25,angle:0},null,0,.045);assert.equal(b._poseChecks.size,before);
 assert.deepEqual(a.dump(),b.dump());assert.equal(sha(fs.readFileSync(path.join(__dirname,'qa/world-512.json'))),sha(bytes));return {checked,inputSha256:sha(bytes)};
});
test('blocked-grains-retry-after-excavation-and-caches-are-not-saved',()=>{
 const p=new Old.Simulation(24014).dump(),a=Old.Simulation.restore(p),b=G.Simulation.restore(p),pose={x:12.25,y:40.25,angle:Math.PI/8};let opened=0;
 while(opened<256){const old=a.poseClear(pose,'egg'),now=b.poseClear(pose,'egg');assert.equal(now,old);if(old)break;assert.equal(b._block,a._block);assert(a._block>=0&&a.grains[a._block]);const g=a._block;a.grains[g]=b.grains[g]=0;a.revision++;b.revision++;opened++;}
 assert(opened>0&&opened<256);assert(b.poseClear(pose,'egg'));assert.deepEqual(a.dump(),b.dump());
 const restored=G.Simulation.restore(new G.Simulation(24014).dump());assert(restored._poseChecks instanceof G.PoseAnswerCache);assert(!JSON.stringify(restored.dump()).includes('_poseChecks'));return {opened};
});
fs.writeFileSync(path.join(__dirname,'qa/pose-cache-results.json'),JSON.stringify({pass:true,results,source:Object.fromEntries(['core.js','game.js','build-pose-cache.cjs'].map(n=>[n,sha(fs.readFileSync(path.join(__dirname,n)))]))},null,2)+'\n');
