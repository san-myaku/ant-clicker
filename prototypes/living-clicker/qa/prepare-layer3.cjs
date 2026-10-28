/* Reproduce before-512 from the exact prior committed simulation, in a new
   temporary directory. Never overwrite fixed inputs or a player's save. */
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),cp=require('node:child_process'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'../../..'),temp=fs.mkdtempSync(path.join(os.tmpdir(),'living-layer3-source-')),out=fs.mkdtempSync(path.join(os.tmpdir(),'living-layer3-result-')),sha=b=>crypto.createHash('sha256').update(b).digest('hex'),base='05ffd149799370bb7ec3b461ca54f7d594735a98',source={};
for(const name of ['game.js','core.js','lifecycle.js','diagnostics.js']){const bytes=cp.execFileSync('git',['show',base+':prototypes/living-clicker/'+name],{cwd:root,maxBuffer:8e6});source[name]=sha(bytes);fs.writeFileSync(path.join(temp,name),bytes);}
const G=require(path.join(temp,'game.js')),{Observer}=require(path.join(temp,'diagnostics.js')),input=fs.readFileSync(path.join(__dirname,'world-256.json')),s=G.Simulation.restore(JSON.parse(input)),began=s.time;
assert.equal(s.ants.length,256);assert(s.buyResearch('geo_depth_3'));const observer=new Observer({metadata:{source},config:{maxIncidents:4}}).attach(s);
for(let sec=0;sec<6000&&s.progress.reached<3;sec++){for(let k=0;k<60;k++)s.step(G.STEP);}
assert.equal(s.progress.reached,3);assert.equal(s.ants.length,256);assert.deepEqual(observer.incidents,[]);s.assertLedger();s.assertProgress();
const bytes=Buffer.from(JSON.stringify(s.dump())),expected=JSON.parse(fs.readFileSync(path.join(__dirname,'before-512-provenance.json')));assert.equal(sha(input),expected.inputSha256);assert.equal(sha(bytes),expected.sha256);assert.deepEqual(G.Simulation.restore(JSON.parse(bytes)).dump(),s.dump());
fs.writeFileSync(path.join(out,'before-512.json'),bytes);fs.writeFileSync(path.join(out,'provenance.json'),JSON.stringify({base,source,inputSha256:sha(input),sha256:sha(bytes),began,finished:s.time,ants:s.ants.length,reached:s.progress.reached},null,2)+'\n');console.log('PASS exact layer3 input '+JSON.stringify({out,sha256:sha(bytes)}));
