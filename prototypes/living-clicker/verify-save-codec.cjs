const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto'),zlib=require('node:zlib'),C=require('./save-codec.js'),G=require('./game.js');
const qa=path.join(__dirname,'qa'),manifest=JSON.parse(fs.readFileSync(path.join(qa,'growth-20261027/verification.json'))),results=[],sha=b=>crypto.createHash('sha256').update(b).digest('hex');
for(const name of ['before-512.json','world-512.json','housing-512-pressure.json','surface-airborne-512.json','surface-stance-512.json','surface-walk-512.json'])manifest.inputsAfter['prototypes/living-clicker/qa/'+name]=sha(fs.readFileSync(path.join(qa,name)));
const sourceNames=['save-codec.js','build-view.cjs','view.js','game.js','core.js','lifecycle.js','verify-save-codec.cjs','../../package.json','../../package-lock.json'],hashes=()=>Object.fromEntries(sourceNames.map(n=>[n,sha(fs.readFileSync(path.join(__dirname,n)))])),source=hashes();
const inputHashes={};let fixtureCount=0;
for(const [rel,h]of Object.entries(manifest.inputsAfter)){
 const file=path.resolve(__dirname,'../..',rel),bytes=fs.readFileSync(file);assert.equal(sha(bytes),h);inputHashes[rel]=h;
 const data=JSON.parse(bytes),p=data.state||data;if(p?.format!=='living-clicker-2')continue;
 const json=JSON.stringify(p),start=performance.now(),encoded=C.encode(p),mid=performance.now(),decoded=C.decode(encoded),end=performance.now();
 assert.equal(JSON.stringify(decoded),json);assert.deepEqual(G.Simulation.restore(decoded).dump(),G.Simulation.restore(p).dump());
 const envelope=JSON.parse(encoded),external=zlib.gunzipSync(Buffer.from(envelope.data,'base64'));assert.equal(external.toString('utf8'),json);
 assert.equal(JSON.stringify(C.decode(json)),json);assert.equal(C.encode(p),encoded,'deterministic storage bytes');
 results.push({name:path.basename(rel),pass:true,rawCharacters:json.length,storedCharacters:encoded.length,ratio:encoded.length/json.length,encodeMs:mid-start,decodeMs:end-mid,decodedSha256:sha(Buffer.from(json))});fixtureCount++;
}
assert.equal(fixtureCount,26);
const fresh=new G.Simulation(24014),freshJson=JSON.stringify(fresh.dump());assert.equal(JSON.stringify(C.decode(C.encode(fresh.dump()))),freshJson);
const p=JSON.parse(fs.readFileSync(path.join(qa,'world-256.json'))),valid=C.encode(p),base=JSON.parse(valid),bad=[];
for(const value of ['', 'null','[]','{}','CORRUPTED_BYTES',JSON.stringify({...p,format:'living-clicker-1'})])bad.push(value);
for(const [key,value]of [['format','unknown'],['encoding','deflate'],['bytes',0],['bytes',C.MAX_BYTES+1],['bytes',base.bytes+1],['crc32',base.crc32^1],['crc32',-1],['data',base.data.slice(0,-4)],['data','!!!!'],['extra',true]])bad.push(JSON.stringify({...base,[key]:value}));
for(const offset of [0,3,18,Math.floor(base.data.length*.3),-8,-4]){const data=Buffer.from(base.data,'base64');data[offset<0?data.length+offset:offset]^=1;bad.push(JSON.stringify({...base,data:data.toString('base64')}));}
for(const value of bad)assert.throws(()=>C.decode(value));
assert.throws(()=>C.encode({format:'living-clicker-2',padding:'x'.repeat(C.MAX_BYTES)}));
const malformed=structuredClone(p);malformed.world.ants[0].id=0;assert.throws(()=>G.Simulation.restore(C.decode(C.encode(malformed))),'compression never bypasses model validation');
for(const file of ['world-900.json','before-256.json','world-256.json','world-512.json','surface-airborne-512.json','surface-stance-512.json','surface-walk-512.json']){
 const fixture=JSON.parse(fs.readFileSync(path.join(qa,file))),p=fixture.state||fixture,a=G.Simulation.restore(p),b=G.Simulation.restore(C.decode(C.encode(p)));
 for(let k=0;k<600;k++){a.step(G.STEP);b.step(G.STEP);if(k%60===0)assert.equal(JSON.stringify(a.dump()),JSON.stringify(b.dump()));}
 assert.equal(JSON.stringify(a.dump()),JSON.stringify(b.dump()));
}
assert.deepEqual(hashes(),source);
for(const [rel,h]of Object.entries(inputHashes))assert.equal(sha(fs.readFileSync(path.resolve(__dirname,'../..',rel))),h);
fs.writeFileSync(path.join(qa,'save-codec-results.json'),JSON.stringify({pass:true,fixtureCount,invalidCases:bad.length+2,continuationCases:7,source,inputs:inputHashes,results},null,2)+'\n');
console.log('PASS lossless storage codec '+JSON.stringify({fixtureCount,invalidCases:bad.length+2,largest:results.find(r=>r.name==='world-256.json')}));
