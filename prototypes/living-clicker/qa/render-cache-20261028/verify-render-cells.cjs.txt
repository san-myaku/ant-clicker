const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto'),G=require('./game.js'),Old=require('./qa/render-reference/game.js'),sha=b=>crypto.createHash('sha256').update(b).digest('hex'),results=[];
const meta=JSON.parse(fs.readFileSync(path.join(__dirname,'qa/render-reference/source.json')));assert.equal(meta.baseCommit,'05fb0e2');for(const[n,h]of Object.entries(meta.source))assert.equal(sha(fs.readFileSync(path.join(__dirname,'qa/render-reference',n))),h);
for(const file of ['world-900.json','world-256.json','world-512.json']){
 const bytes=fs.readFileSync(path.join(__dirname,'qa',file)),p=JSON.parse(bytes),a=Old.Simulation.restore(p),b=G.Simulation.restore(p),rids=[-1,0,1,2,3,254,255,'1',null,NaN,...a.rooms.slice(1).map(r=>r.id)];let checks=0;
 const same=()=>{for(const rid of rids){assert.deepEqual(b.cells(rid),a.cells(rid));assert.equal(b.cells(rid),b.cells(rid));checks++;}assert.deepEqual(b.dump(),a.dump());};same();
 const cell=a.cells(1)[0];assert(Number.isInteger(cell));a.loose[cell]++;b.loose[cell]++;a.revision++;b.revision++;same();
 for(const g of a.grainCells(cell).slice(0,8)){a.grains[g]=b.grains[g]=0;a.grainRoom[g]=b.grainRoom[g]=254;}a.loose[cell]=b.loose[cell]=0;a.revision++;b.revision++;same();assert(b.cells(254).includes(cell));results.push({file,pass:true,checks,inputSha256:sha(bytes)});
}
fs.writeFileSync(path.join(__dirname,'qa/render-cells-results.json'),JSON.stringify({pass:true,results,source:Object.fromEntries(['core.js','game.js','build-room-cells.cjs'].map(n=>[n,sha(fs.readFileSync(path.join(__dirname,n)))]))},null,2)+'\n');console.log('PASS room cells preserve exact order, empty identity, counts, loose cells and revision');
