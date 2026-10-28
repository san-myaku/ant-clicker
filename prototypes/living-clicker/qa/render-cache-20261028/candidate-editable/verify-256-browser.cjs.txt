const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto'),{createServer}=require('../living-nest/server.cjs'),{chromium,launchOptions}=require('./qa-runtime.cjs');
const SaveCodec=require('./save-codec.js');
const qa=path.join(__dirname,'qa'),bytes=fs.readFileSync(path.join(qa,'world-256.json')),pack=JSON.parse(bytes),legacy=fs.readFileSync(path.join(qa,'before-256.json'),'utf8'),sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const source=Object.fromEntries(['index.html','core.js','lifecycle.js','game.js','view.js','verify-256-browser.cjs'].map(n=>[n,sha(fs.readFileSync(path.join(__dirname,n)))])),results=[],server=createServer();let browser;
(async()=>{try{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));browser=await chromium.launch(launchOptions);const url='http://127.0.0.1:'+server.address().port+'/clicker/';
 for(const width of [1440,393]){
  const context=await browser.newContext({viewport:{width,height:width<600?852:950},isMobile:width<600,hasTouch:width<600});await context.addInitScript(()=>requestAnimationFrame=()=>1);
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(String(e)));await page.goto(url);await page.evaluate(p=>colonyGame.load(p),pack);await page.evaluate(()=>colonyGame.pause(true));await page.locator('#fit').click();
  await page.screenshot({path:path.join(qa,`colony-256-${width}.png`),fullPage:true,scale:'css'});
  const exact=await page.evaluate(()=>JSON.stringify(colonyGame.dump()));await page.locator('#settings>summary').click();await page.locator('#save').click();assert.equal(JSON.stringify(SaveCodec.decode(await page.evaluate(()=>localStorage.getItem('livingClicker_2')))),exact);
  await page.locator('#reset').click();assert.equal(await page.evaluate(()=>colonyGame.sim.ants.length),12);await page.locator('#undo').click();assert.equal(await page.evaluate(()=>JSON.stringify(colonyGame.dump())),exact);
  await page.reload();await page.evaluate(()=>colonyGame.pause(true));assert.equal(await page.evaluate(()=>JSON.stringify(colonyGame.dump())),exact);assert(!await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth));
  results.push({name:'real-256-save-reset-undo-reload',width,pass:true,saveCharacters:exact.length,errors});assert.deepEqual(errors,[]);await context.close();
 }
 // Large data under an earlier key must not be deleted to make a backup fit.
 const context=await browser.newContext({viewport:{width:393,height:852},acceptDownloads:true});await context.addInitScript(old=>{requestAnimationFrame=()=>1;localStorage.setItem('livingClicker_1',old);},legacy);
 const page=await context.newPage();await page.goto(url);await page.evaluate(p=>colonyGame.load(p),pack);await page.locator('#settings>summary').click();const exact=await page.evaluate(()=>JSON.stringify(colonyGame.dump()));await page.locator('#reset').click();
 const after=await page.evaluate(()=>({ants:colonyGame.sim.ants.length,message:document.getElementById('message').textContent,old:localStorage.getItem('livingClicker_1')}));assert.equal(after.old,legacy);
 if(after.ants===12){await page.locator('#undo').click();assert.equal(await page.evaluate(()=>JSON.stringify(colonyGame.dump())),exact);results.push({name:'large-previous-save',pass:true,outcome:'backup-fits-and-undo-is-exact'});}
 else{assert.equal(after.ants,256);assert.equal(await page.evaluate(()=>JSON.stringify(colonyGame.dump())),exact);assert.match(after.message,/書き出/);assert.equal(JSON.stringify(SaveCodec.decode(await page.evaluate(()=>localStorage.getItem('livingClicker_2')))),exact);results.push({name:'large-previous-save',pass:true,outcome:'backup-refused-current-and-previous-bytes-kept',message:after.message});}
 await context.close();
 // Actual 256-ant live rendering, measured separately from model load tests.
 const live=await browser.newContext({viewport:{width:393,height:852},isMobile:true,hasTouch:true}),lp=await live.newPage(),errors=[];lp.on('pageerror',e=>errors.push(String(e)));await lp.goto(url);await lp.evaluate(p=>colonyGame.load(p),pack);await lp.locator('#speed').selectOption('10');
 const before=await lp.evaluate(()=>({time:colonyGame.sim.time,distance:colonyGame.sim.stats.distance,wall:performance.now()}));await lp.waitForTimeout(6000);await lp.evaluate(()=>colonyGame.pause(true));const afterLive=await lp.evaluate(()=>({time:colonyGame.sim.time,distance:colonyGame.sim.stats.distance,wall:performance.now()}));
 assert(afterLive.time>before.time+1,'live-256: '+JSON.stringify({before,after:afterLive,errors}));assert(afterLive.distance>before.distance);assert.deepEqual(errors,[]);results.push({name:'live-256',pass:true,gameSeconds:afterLive.time-before.time,wallSeconds:(afterLive.wall-before.wall)/1000,errors});await live.close();
 for(const [n,h]of Object.entries(source))assert.equal(sha(fs.readFileSync(path.join(__dirname,n))),h);assert.equal(sha(fs.readFileSync(path.join(qa,'world-256.json'))),sha(bytes));
 fs.writeFileSync(path.join(qa,'browser-256-results.json'),JSON.stringify({results,source,inputSha256:sha(bytes)},null,2)+'\n');console.log('PASS 256 browser '+JSON.stringify(results));
}finally{if(browser)await browser.close();await new Promise(r=>server.close(r));}})().catch(e=>{console.error(e);process.exitCode=1;});
