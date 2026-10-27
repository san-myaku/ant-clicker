/* QA only. Re-encode the fixed regression states from the recorded Git base.
   Never imported by the game; does not convert player saves. */
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process'),os=require('node:os'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'../../..'),base='7d95df6ad116dd015408b9cbee2d7d97d44994b9',temp=fs.mkdtempSync(path.join(os.tmpdir(),'living-v1-qa-'));
for(const n of ['core.js','lifecycle.js','game.js'])fs.writeFileSync(path.join(temp,n),cp.execFileSync('git',['show',base+':prototypes/living-clicker/'+n],{cwd:root,maxBuffer:8e6}));
const Old=require(path.join(temp,'game.js')),New=require('../game.js'),sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const names=Object.keys(JSON.parse(fs.readFileSync(path.join(__dirname,'routes-20261027-r2/verification.json'))).inputsAfter).filter(n=>n.startsWith('prototypes/living-clicker/qa/')&&!n.endsWith('research-catalog.json'));
const pending=[],records=[];
for(const name of names){
  const bytes=cp.execFileSync('git',['show',base+':'+name],{cwd:root,maxBuffer:12e6}),container=JSON.parse(bytes),key=container.state?'state':container.save?'save':null,input=key?container[key]:container;
  assert.equal(input.format,'living-clicker-1');const old=Old.Simulation.restore(input),state=old.dump();
  state.format='living-clicker-2';state.world.format='living-clicker-core-2';
  const c=state.colony;c.nextActor=Math.max(13+c.stats.born,...state.world.ants.map(a=>a.id+1),...c.raid.enemies.map(e=>e.id+1));delete c.nextAnt;
  for(const a of state.world.ants)if(!a.yielding)delete a.yieldFor;
  const physics=state.world.physics,data=Buffer.from(physics.data,'base64');assert.equal(physics.encoding,'bodies50le');
  for(let at=0;at<data.length;at+=50){const carrier=data[at+6];assert.equal(data.readUInt32LE(at+46),0);data[at+6]=0;data.writeUInt32LE(carrier,at+46);}
  physics.version=3;physics.encoding='bodies50u32le';physics.data=data.toString('base64');
  const fresh=New.Simulation.restore(state);assert.deepEqual(fresh.dump(),state);assert.deepEqual(fresh.physics.bodies,old.physics.bodies);
  assert.deepEqual(fresh.grains,old.grains);assert.deepEqual(fresh.grainRoom,old.grainRoom);assert.equal(fresh.stats.grainDelivered,old.stats.grainDelivered);
  const output=key?{...container,[key]:state}:state,encoded=Buffer.from(JSON.stringify(output));pending.push([path.join(root,name),encoded]);
  records.push({file:name,beforeSha256:sha(bytes),afterSha256:sha(encoded),ants:fresh.ants.length,enemies:c.raid.enemies.length,nextActor:c.nextActor,obsoleteYieldRefsRemoved:input.world.ants.filter(a=>!a.yielding&&a.yieldFor!==undefined).length});
}
// Validate every state before replacing any fixed input. Geometry, bodies and
// work are unchanged. Past derived evidence directories remain untouched.
for(const [file,bytes]of pending)fs.writeFileSync(file,bytes);
const report={base,method:'QA固定保存のみを新版へ再エンコード。旧読込器で既存の省略項目を明示化し、番号の上限メタデータと50バイト内の運び手位置を更新。終了済み譲りの未使用参照だけを削除。個体/空洞/物体/運搬の実状態は保持。ゲーム内に旧版変換はない。',records};
fs.writeFileSync(path.join(__dirname,'actors-v2-fixtures.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
