const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{createServer}=require('../living-nest/server.cjs');
const {chromium,launchOptions}=require('./qa-runtime.cjs');
const fixture=JSON.parse(fs.readFileSync(path.join(__dirname,'../clicker-integration/qa/journey-save.json'))),server=process.env.LIVING_DELIVERY?null:createServer();let browser;
(async()=>{try{
 if(server)await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin=server?'http://127.0.0.1:'+server.address().port:'http://127.0.0.1:5189';
 browser=await chromium.launch(launchOptions);const context=await browser.newContext({viewport:{width:1440,height:950}});
 await context.addInitScript(pack=>{requestAnimationFrame=()=>1;Date.now=()=>pack.g.lastSave;localStorage.setItem('grainClicker_1_antSimV23_0',JSON.stringify(pack));localStorage.setItem('livingClicker_1','NEW_WORLD_PROTECTED');},fixture);
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(String(e)));await page.goto(origin+'/clicker-previous/');await page.waitForFunction(()=>window.clickerIntegration?.nest);
 const result=await page.evaluate(()=>({ants:{...clickerIntegration.G.ants},grain:clickerIntegration.nest.dump(),newKey:localStorage.getItem('livingClicker_1')}));
 assert.deepEqual(result.ants,fixture.g.ants);assert.deepEqual(result.grain,fixture.world.grain);assert.equal(result.newKey,'NEW_WORLD_PROTECTED');assert.deepEqual(errors,[]);
 fs.writeFileSync(path.join(__dirname,'qa/previous-save-results.json'),JSON.stringify({pass:true,origin,population:Object.values(result.ants).reduce((n,v)=>n+v,0),delivered:result.grain.stats.delivered,exactGrain:true,newKeyProtected:true,errors},null,2));console.log('PASS previous route restores the same 600 ants and 5957 delivered grains; new save untouched');
 }finally{if(browser)await browser.close();if(server)await new Promise(r=>server.close(r));}})().catch(e=>{console.error(e);process.exitCode=1;});
