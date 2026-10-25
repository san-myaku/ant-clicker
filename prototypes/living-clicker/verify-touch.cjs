const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {chromium,launchOptions}=require('./qa-runtime.cjs');
const root=__dirname,qa=path.join(root,'qa/mobile-touch-confirmation'),files=['index.html','core.js','lifecycle.js','game.js','view.js'];fs.mkdirSync(qa,{recursive:true});
const result={source:Object.fromEntries(files.map(n=>[n,crypto.createHash('sha256').update(fs.readFileSync(path.join(root,n))).digest('hex')])),cases:[]};
const server=http.createServer((req,res)=>{const name=new URL(req.url,'http://localhost').pathname.slice(1)||'index.html';if(!files.includes(name)){res.writeHead(404);return res.end();}res.setHeader('Content-Type',name.endsWith('.js')?'text/javascript; charset=utf-8':'text/html; charset=utf-8');res.end(fs.readFileSync(path.join(root,name)));});
let browser;
async function test(name,fn){try{result.cases.push({name,pass:true,...await fn()});console.log(name+' PASS');}catch(e){result.cases.push({name,pass:false,error:e.stack});throw e;}finally{fs.writeFileSync(path.join(qa,'touch-results.json'),JSON.stringify(result,null,2));}}
async function touch(cdp,type,points){await cdp.send('Input.dispatchTouchEvent',{type,touchPoints:points.map(([x,y,id])=>({x,y,id,radiusX:5,radiusY:5,force:1}))});}
async function pinch(cdp,x,y){await touch(cdp,'touchStart',[[x-25,y,1],[x+25,y,2]]);for(let d=30;d<=65;d+=5)await touch(cdp,'touchMove',[[x-d,y,1],[x+d,y,2]]);await touch(cdp,'touchEnd',[]);}
async function rapidTaps(cdp,page,x,y,count=2){for(let k=0;k<count;k++){await touch(cdp,'touchStart',[[x,y,1]]);await page.waitForTimeout(25);await touch(cdp,'touchEnd',[]);await page.waitForTimeout(70);}}
(async()=>{try{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));browser=await chromium.launch(launchOptions);
 for(const width of [393,320])await test('mobile-taps-selection-scroll-and-nest-pinch-'+width,async()=>{
  const context=await browser.newContext({viewport:{width,height:852},isMobile:true,hasTouch:true,deviceScaleFactor:2}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(String(e)));
  await page.goto('http://127.0.0.1:'+server.address().port);await page.evaluate(()=>colonyGame.pause(true));const cdp=await context.newCDPSession(page);
  const plus=page.locator('[data-role="forage"][data-delta="1"]');await plus.scrollIntoViewIfNeeded();const initial=await page.evaluate(()=>colonyGame.sim.roleCounts(true).forage);
  const button=await plus.boundingBox();await rapidTaps(cdp,page,button.x+button.width/2,button.y+button.height/2,4);assert.equal(await page.evaluate(()=>colonyGame.sim.roleCounts(true).forage),initial+4);assert.equal(await page.evaluate(()=>visualViewport.scale),1);
  await page.locator('#open-research').tap();const detail=await page.locator('#research-effect').boundingBox();await rapidTaps(cdp,page,detail.x+detail.width/2,detail.y+detail.height/2);assert.equal(await page.evaluate(()=>visualViewport.scale),1);assert.equal(await page.evaluate(()=>getSelection().toString()),'');await page.locator('#close-research').tap();await page.locator('.roles h2').scrollIntoViewIfNeeded();
  const long=await page.locator('.roles h2').boundingBox();await touch(cdp,'touchStart',[[long.x+12,long.y+8,1]]);await page.waitForTimeout(750);await touch(cdp,'touchEnd',[]);
  const selected=await page.evaluate(()=>getSelection().toString());assert.equal(selected,'');assert.equal(await page.evaluate(()=>visualViewport.scale),1);
  await page.locator('#settings>summary').tap();await page.locator('#seed').fill('12345');assert.equal(await page.locator('#seed').inputValue(),'12345');
  const editable=await page.locator('#seed').evaluate(e=>({select:getComputedStyle(e).userSelect,font:parseFloat(getComputedStyle(e).fontSize)}));assert.equal(editable.select,'text');assert(editable.font>=16);
  assert(!await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth));await page.screenshot({path:path.join(qa,'settings-'+width+'.png'),fullPage:true,scale:'css'});
  await page.locator('#speed').selectOption('10');assert.equal(await page.locator('#speed').inputValue(),'10');
  await page.locator('#settings>summary').tap();await page.evaluate(()=>scrollTo(0,0));await page.waitForTimeout(120);
  // The integrated view starts much closer than /play/. Make room below its
  // real zoom limit before checking a further pinch through native touch.
  await page.locator('#zoom-out').tap();await page.locator('#zoom-out').tap();
  const canvas=await page.locator('#nest').boundingBox(),camera=await page.evaluate(()=>colonyGame.camera),x=width/2,y=canvas.y+canvas.height/2;
  await rapidTaps(cdp,page,x,y);assert.equal(await page.evaluate(()=>visualViewport.scale),1);assert.equal(await page.evaluate(()=>colonyGame.camera.zoom),camera.zoom);
  await pinch(cdp,x,y);const afterPinch=await page.evaluate(()=>({camera:colonyGame.camera,scale:visualViewport.scale}));assert(afterPinch.camera.zoom>camera.zoom*1.5);assert.equal(afterPinch.scale,1);
  await touch(cdp,'touchStart',[[x,y,1]]);await touch(cdp,'touchMove',[[x+40,y+20,1]]);await touch(cdp,'touchEnd',[]);assert(Math.abs(await page.evaluate(()=>colonyGame.camera.x)-afterPinch.camera.x)>1);
  // A page swipe still scrolls outside the canvas, while its pinch stays at 1x.
  await page.locator('.roles h2').scrollIntoViewIfNeeded();await page.waitForTimeout(100);const role=await page.locator('.roles h2').boundingBox(),outsideY=Math.max(100,Math.min(650,role.y+20));
  await pinch(cdp,width/2,outsideY);assert.equal(await page.evaluate(()=>visualViewport.scale),1);
  await page.evaluate(()=>scrollTo(0,0));const c=await page.locator('.resources').boundingBox(),scrollY=Math.min(800,c.y+60);await touch(cdp,'touchStart',[[width/2,scrollY,1]]);for(let d=20;d<=140;d+=20)await touch(cdp,'touchMove',[[width/2,scrollY-d,1]]);await touch(cdp,'touchEnd',[]);await page.waitForTimeout(150);assert(await page.evaluate(()=>scrollY)>20);
  const data=await page.evaluate(()=>({scale:visualViewport.scale,overflow:document.documentElement.scrollWidth>innerWidth,selection:getSelection().toString(),bodyTouch:getComputedStyle(document.body).touchAction,buttonTouch:getComputedStyle(document.querySelector('[data-role]')).touchAction,canvasTouch:getComputedStyle(document.getElementById('nest')).touchAction}));assert(!data.overflow);assert.equal(data.selection,'');assert.equal(data.bodyTouch,'pan-y');assert.equal(data.canvasTouch,'none');assert.deepEqual(errors,[]);
  await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:path.join(qa,'touch-'+width+'.png'),fullPage:true,scale:'css'});await context.close();return {...data,rapidTaps:4,roleIncrease:4,researchDoubleTapScale:1,nestDoubleTapZoomChanged:false,editable,customPinchFactor:afterPinch.camera.zoom/camera.zoom,errors};
 });
 await test('safari-gesture-cancellation-and-native-input-exception',async()=>{
  const page=await browser.newPage();await page.goto('http://127.0.0.1:'+server.address().port);const data=await page.evaluate(()=>{
   const fire=(node,type)=>{const e=new Event(type,{bubbles:true,cancelable:true});node.dispatchEvent(e);return e.defaultPrevented;};
   return {gestureStart:fire(document,'gesturestart'),gestureChange:fire(document,'gesturechange'),buttonDouble:fire(document.getElementById('lay'),'dblclick'),inputDouble:fire(document.getElementById('seed'),'dblclick')};
  });assert.deepEqual(data,{gestureStart:true,gestureChange:true,buttonDouble:true,inputDouble:false});await page.close();return data;
 });
 for(const [name,expected]of Object.entries(result.source))assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(root,name))).digest('hex'),expected,'source changed during verification');
 }finally{if(browser)await browser.close();server.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
