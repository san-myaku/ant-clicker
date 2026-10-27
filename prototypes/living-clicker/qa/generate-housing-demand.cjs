const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict'),G=require('../game.js');
const here=path.resolve(__dirname,'..'),qa=path.join(here,'qa'),input=fs.readFileSync(path.join(qa,'before-depth.json')),s=G.Simulation.restore(JSON.parse(input)),sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const names=['core.js','lifecycle.js','game.js','route-network.js'],hashes=Object.fromEntries(names.map(n=>[n,sha(fs.readFileSync(path.join(here,n)))])),initial=s.roomIds().filter(r=>s.roomKind(r)==='rest');
// Writes to a fresh destination, never over the fixed QA inputs.
const out=path.resolve(process.argv[2]||path.join(require('node:os').tmpdir(),'living-housing-'+Date.now()));assert(!fs.existsSync(out),'output directory must be new');fs.mkdirSync(out,{recursive:true});
const beginning=s.time;let state=null;
for(let k=0;k<1200*60;k++){
 // Save only a completed-step state, just before the real planner actually
 // starts the next chamber. This uses its rule, not a duplicated threshold.
 const before=s.ticks%30===0?s.dump():null;
 s.step(G.STEP);
 if(s.roomIds().filter(r=>s.roomKind(r)==='rest').length>initial.length){assert(before);state=before;break;}
 if(k%12000===0)console.log(JSON.stringify({time:s.time,ants:s.ants.length,crowded:s.crowding().length}));
}
assert(state,'a naturally crowded state before the next rest chamber is planned');s.assertLedger();s.assertProgress();const saved=G.Simulation.restore(state);assert.deepEqual(saved.dump(),state);assert(saved.crowding().length>=6);
const replay=G.Simulation.restore(state);replay.step(G.STEP);assert.equal(replay.roomIds().filter(r=>replay.roomKind(r)==='rest').length,initial.length+1,'the same real planning decision follows the saved state');
const bytes=Buffer.from(JSON.stringify(state));fs.writeFileSync(path.join(out,'housing-demand.json'),bytes);
for(const n of names)assert.equal(sha(fs.readFileSync(path.join(here,n))),hashes[n]);
const report={input:'before-depth.json',inputSha256:sha(input),began:beginning,finished:saved.time,ants:saved.ants.length,crowded:saved.crowding().length,rest:initial,fixtureSha256:sha(bytes),sourceSha256:hashes,method:'既存の自然保存から固定1/60秒で進行。個体・餌・空洞・家の注入なし。実際に次の居室が計画される直前の完了ステップを保存し、復元した次の1ステップで同じ計画の発生を確認。元の入力保存は置き換えない。'};
fs.writeFileSync(path.join(out,'housing-demand-provenance.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));
