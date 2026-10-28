/* Storage evidence uses real save/import/reset controls and persisted bytes. */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto'),C=require('./save-codec.js'),G=require('./game.js'),{createServer}=require('../living-nest/server.cjs'),{chromium,launchOptions}=require('./qa-runtime.cjs');
const qa=path.join(__dirname,'qa'),sha=b=>crypto.createHash('sha256').update(b).digest('hex'),files=['index.html','core.js','lifecycle.js','game.js','view.js','save-codec.js','build-view.cjs','verify-save-browser.cjs'],hashes=()=>Object.fromEntries(files.map(n=>[n,sha(fs.readFileSync(path.join(__dirname,n)))])),source=hashes();
const raw=fs.readFileSync(path.join(qa,'world-256.json'),'utf8'),before=fs.readFileSync(path.join(qa,'before-256.json'),'utf8'),inputs={world256:sha(Buffer.from(raw)),before256:sha(Buffer.from(before))},results=[],server=createServer();let browser;
const dump=page=>page.evaluate(()=>JSON.stringify(colonyGame.dump()));
const storage=page=>page.evaluate(()=>Object.fromEntries(Object.keys(localStorage).map(k=>[k,localStorage.getItem(k)])));
async function session(url,seed,width=393){
 const context=await browser.newContext({viewport:{width,height:852},acceptDownloads:true});
 await context.addInitScript(seed=>{requestAnimationFrame=()=>1;if(!sessionStorage.getItem('seeded')){for(const [k,v]of Object.entries(seed))localStorage.setItem(k,v);sessionStorage.setItem('seeded','yes');}},seed);
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(String(e)));await page.goto(url);return {context,page,errors};
}
async function exportExact(page,expected){const [download]=await Promise.all([page.waitForEvent('download'),page.locator('#export').click()]);const bytes=fs.readFileSync(await download.path()),p=JSON.parse(bytes);assert.equal(JSON.stringify(G.Simulation.restore(p).dump()),expected);assert.equal(bytes.toString('utf8'),expected);return sha(bytes);}
(async()=>{try{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));browser=await chromium.launch(launchOptions);const origin='http://127.0.0.1:'+server.address().port,url=origin+'/clicker/';
 for(const name of ['save-codec.js','verify-save-codec.cjs','verify-save-browser.cjs'])assert.equal((await fetch(origin+'/clicker/'+name)).status,404);
 for(const width of [1440,393]){
  const seed={livingClicker_1:before,livingClicker_1_recovery:'PROTECTED_OLD_RECOVERY',livingClicker_2:raw},s=await session(url,seed,width),{page,context,errors}=s;
  assert.equal(await dump(page),raw);assert.equal((await storage(page)).livingClicker_2,raw,'startup reading does not overwrite existing plain current-format bytes');
  await page.locator('#settings>summary').click();const start=performance.now();await page.locator('#save').click();const saved=(await storage(page)).livingClicker_2,saveWallMs=performance.now()-start;
  assert.equal(JSON.stringify(C.decode(saved)),raw);assert.equal(JSON.parse(saved).format,C.FORMAT);assert(saved.length<raw.length*.35);
  await page.reload();assert.equal(await dump(page),raw);await page.locator('#settings>summary').click();
  await page.locator('#reset').click();assert.equal(await page.evaluate(()=>colonyGame.sim.ants.length),12);let keys=await storage(page);assert.equal(JSON.stringify(C.decode(keys.livingClicker_2_recovery)),raw);
  await page.locator('#undo').click();assert.equal(await dump(page),raw);await page.reload();assert.equal(await dump(page),raw);await page.locator('#settings>summary').click();await page.locator('#restore').click();assert.equal(await dump(page),raw);
  const exportSha256=await exportExact(page,raw);
  await page.locator('#import').setInputFiles({name:'128.json',mimeType:'application/json',buffer:Buffer.from(before)});await page.waitForFunction(()=>colonyGame.sim.ants.length===128);assert.equal(await dump(page),before);
  assert.equal(JSON.stringify(C.decode((await storage(page)).livingClicker_2)),before);await page.locator('#undo').click();assert.equal(await dump(page),raw);
  keys=await storage(page);assert.equal(keys.livingClicker_1,seed.livingClicker_1);assert.equal(keys.livingClicker_1_recovery,seed.livingClicker_1_recovery);
  assert.deepEqual(errors,[]);results.push({name:'persisted-256-with-earlier-key',width,pass:true,rawCharacters:raw.length,storedCharacters:saved.length,saveWallMs,resetUndoReload:true,restoreImportExport:true,oldBytesUnchanged:true,exportSha256});await context.close();
 }
 // Corrupted compressed data must remain byte-for-byte available. A valid
 // recovery is adopted only through the user's actual Undo action.
 const bad=JSON.parse(C.encode(JSON.parse(raw)));bad.crc32^=1;const broken=JSON.stringify(bad),recovery=C.encode(JSON.parse(before));
 const damaged=await session(url,{livingClicker_2:broken,livingClicker_2_recovery:recovery}),dp=damaged.page;
 assert.equal(await dp.evaluate(()=>colonyGame.paused),true);await dp.locator('#settings>summary').click();await dp.locator('#save').click();assert.equal((await storage(dp)).livingClicker_2,broken);
 await dp.locator('#undo').click();assert.equal(await dump(dp),before);assert.equal((await storage(dp)).livingClicker_2_recovery,broken);await dp.reload();assert.equal(await dump(dp),before);assert.deepEqual(damaged.errors,[]);results.push({name:'compressed-corruption-protected-and-manually-recovered',pass:true});await damaged.context.close();
 // Fill the real browser quota, rather than substituting a mocked setItem.
 const full=await session(url,{livingClicker_1:before,livingClicker_2:C.encode(JSON.parse(raw))}),fp=full.page;await fp.locator('#settings>summary').click();
 const fill=await fp.evaluate(()=>{let low=0,high=6*1024*1024;while(high-low>1){const mid=Math.floor((low+high)/2);try{localStorage.setItem('QA_CAPACITY_FILL','x'.repeat(mid));low=mid;}catch(e){if(e.name!=='QuotaExceededError')throw e;high=mid;}}return low;});
 const protectedBefore=await storage(fp);await fp.locator('#reset').click();assert.equal(await dump(fp),raw);assert.deepEqual(await storage(fp),protectedBefore);assert.match(await fp.locator('#message').textContent(),/書き出/);const exported=await exportExact(fp,raw);
 await fp.reload();assert.equal(await dump(fp),raw);assert.deepEqual(await storage(fp),protectedBefore);assert.deepEqual(full.errors,[]);results.push({name:'actual-quota-refusal-keeps-current-recovery-and-earlier-keys',pass:true,fillerCharacters:fill,exportSha256:exported});await full.context.close();
 assert.deepEqual(hashes(),source);assert.equal(sha(fs.readFileSync(path.join(qa,'world-256.json'))),inputs.world256);assert.equal(sha(fs.readFileSync(path.join(qa,'before-256.json'))),inputs.before256);
 fs.writeFileSync(path.join(qa,'save-browser-results.json'),JSON.stringify({pass:true,source,inputs,results},null,2)+'\n');console.log('PASS real compressed storage '+JSON.stringify(results));
}finally{if(browser)await browser.close();await new Promise(r=>server.close(r));}})().catch(e=>{console.error(e);process.exitCode=1;});
