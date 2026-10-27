/* Additional real-browser storage check. The existing earlier-key bytes are
   opaque; they must never be removed to fit the current world's backup. */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto'),G=require('../game.js'),{createServer}=require('../../living-nest/server.cjs'),{chromium,launchOptions}=require('../qa-runtime.cjs');
const root=path.resolve(__dirname,'..'),bytes=fs.readFileSync(path.join(__dirname,'world-256.json')),pack=JSON.parse(bytes),old=fs.readFileSync(path.join(__dirname,'before-256.json'),'utf8'),sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const names=['index.html','core.js','lifecycle.js','game.js','view.js','qa/check-persisted-capacity.cjs'],hashes=()=>Object.fromEntries(names.map(n=>[n,sha(fs.readFileSync(path.join(root,n)))]));
const sourceBefore=hashes(),server=createServer(),results=[];let browser;
(async()=>{try{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));browser=await chromium.launch(launchOptions);const origin='http://127.0.0.1:'+server.address().port;
 assert.equal((await fetch(origin+'/clicker/qa/check-persisted-capacity.cjs')).status,404);
 for(const legacy of [false,true]){
  const context=await browser.newContext({viewport:{width:393,height:852},acceptDownloads:true});await context.addInitScript(({legacy,old})=>{requestAnimationFrame=()=>1;if(legacy)localStorage.setItem('livingClicker_1',old);},{legacy,old});
  const page=await context.newPage();await page.goto(origin+'/clicker/');await page.evaluate(p=>colonyGame.load(p),pack);await page.locator('#settings>summary').click();await page.locator('#save').click();
  const exact=await page.evaluate(()=>JSON.stringify(colonyGame.dump()));assert.equal(await page.evaluate(()=>localStorage.getItem('livingClicker_2')),exact);
  const sizes=await page.evaluate(()=>Object.fromEntries(Object.keys(localStorage).map(k=>[k,localStorage.getItem(k).length])));await page.locator('#reset').click();
  const after=await page.evaluate(()=>({ants:colonyGame.sim.ants.length,message:document.getElementById('message').textContent,old:localStorage.getItem('livingClicker_1')}));assert.equal(after.old,legacy?old:null);
  let outcome;
  if(after.ants===12){await page.locator('#undo').click();assert.equal(await page.evaluate(()=>JSON.stringify(colonyGame.dump())),exact);outcome='backup-and-undo-exact';}
  else{assert(legacy,'normal backup must fit');assert.equal(after.ants,256);assert.equal(await page.evaluate(()=>JSON.stringify(colonyGame.dump())),exact);assert.equal(await page.evaluate(()=>localStorage.getItem('livingClicker_2')),exact);assert.match(after.message,/書き出/);outcome='quota-refused-no-data-changed';}
  const [download]=await Promise.all([page.waitForEvent('download'),page.locator('#export').click()]);const exported=JSON.parse(fs.readFileSync(await download.path(),'utf8'));
  assert.equal(sha(Buffer.from(JSON.stringify(G.Simulation.restore(exported).dump()))),sha(Buffer.from(exact)));
  await page.reload();await page.evaluate(()=>colonyGame.pause(true));assert.equal(await page.evaluate(()=>JSON.stringify(colonyGame.dump())),exact);
  assert.equal(await page.evaluate(()=>localStorage.getItem('livingClicker_1')),legacy?old:null);
  results.push({legacy,outcome,sizes,exportSha256:sha(Buffer.from(JSON.stringify(exported))),currentSha256:sha(Buffer.from(exact)),message:after.message});await context.close();
 }
 const sourceAfter=hashes();assert.deepEqual(sourceAfter,sourceBefore);assert.equal(sha(fs.readFileSync(path.join(__dirname,'world-256.json'))),sha(bytes));
 const report={pass:true,node:process.version,sourceBefore,sourceAfter,inputSha256:sha(bytes),earlierKeyBytesSha256:sha(Buffer.from(old)),setup:'通常の保存ボタンで256匹を永続化した後にリセットを実行。旧キーの内容は以前の保存相当の不透明なバイト列として保持する。',results};
 fs.writeFileSync(path.join(__dirname,'growth-20261027/persisted-capacity-results.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
}finally{if(browser)await browser.close();await new Promise(r=>server.close(r));}})().catch(e=>{console.error(e);process.exitCode=1;});
