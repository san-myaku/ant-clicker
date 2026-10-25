const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto'),{createServer}=require('../living-nest/server.cjs');
const {chromium,launchOptions}=require('./qa-runtime.cjs');
const qa=path.join(__dirname,'qa/queen-detail'),before=fs.readFileSync(path.join(qa,'before-view.js'),'utf8'),after=fs.readFileSync(path.join(__dirname,'view.js'),'utf8'),server=createServer(),reports=[];let browser;
const hash=v=>crypto.createHash('sha256').update(v).digest('hex');
(async()=>{try{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));browser=await chromium.launch(launchOptions);
 for(const width of [1440,393])for(const state of ['initial','grown']){
  const pack=state==='grown'?JSON.parse(fs.readFileSync(path.join(__dirname,'qa/world-900.json'))):null,shots={};
  for(const version of ['before','after']){
   const context=await browser.newContext({viewport:{width,height:width<600?852:950},deviceScaleFactor:1,isMobile:width<600,hasTouch:width<600,reducedMotion:'reduce'});
   await context.addInitScript(p=>{requestAnimationFrame=()=>1;if(p)localStorage.setItem('livingClicker_1',JSON.stringify(p));window.qaDraws=[];const draw=CanvasRenderingContext2D.prototype.drawImage;CanvasRenderingContext2D.prototype.drawImage=function(src,...args){if(this.canvas.id==='nest'&&[32,128].includes(src.width)&&args.length===4)window.qaDraws.push({sourceWidth:src.width,args,png:src.toDataURL()});return draw.call(this,src,...args);};},pack);
   const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(String(e)));await page.route('**/view.js',r=>r.fulfill({contentType:'text/javascript; charset=utf-8',body:version==='before'?before:after}));await page.goto('http://127.0.0.1:'+server.address().port+'/clicker/');await page.evaluate(()=>colonyGame.pause(true));
   const result=await page.evaluate(()=>{window.qaDraws=[];const saved=JSON.stringify(colonyGame.dump());colonyGame.render();const c=document.getElementById('nest');return {beforeRender:saved,afterRender:JSON.stringify(colonyGame.dump()),camera:colonyGame.camera,queen:colonyGame.screen(48,24),draws:window.qaDraws,pixels:Array.from(c.getContext('2d').getImageData(0,0,c.width,c.height).data),w:c.width,h:c.height,overflow:document.documentElement.scrollWidth>innerWidth};});
   assert.equal(result.beforeRender,result.afterRender);assert(!result.overflow);assert.deepEqual(errors,[]);const queen=result.draws.find(d=>d.sourceWidth===128||d.args[2]>result.camera.scale*10),workers=result.draws.filter(d=>d.sourceWidth===32&&d.args[2]<result.camera.scale*5);assert(queen);assert(workers.length);
   result.queenDraw=queen;result.workerHashes=workers.map(d=>hash(d.png));result.dotRatio=(queen.args[2]/queen.sourceWidth)/(workers[0].args[2]/32);result.errors=errors;shots[version]=result;
   await page.screenshot({path:path.join(qa,`${state}-${width}-${version}.png`),fullPage:true,scale:'css'});const box=await page.locator('#nest').boundingBox(),radius=Math.min(width<600?88:145,box.width/2),height=width<600?120:175;
   await page.screenshot({path:path.join(qa,`${state}-${width}-${version}-queen.png`),clip:{x:Math.max(box.x,box.x+result.queen.x-radius),y:box.y+result.queen.y-height/2,width:radius*2,height},scale:'css'});await context.close();
  }
  const a=shots.before,b=shots.after;assert.equal(a.beforeRender,b.beforeRender);assert.deepEqual(a.camera,b.camera);assert.deepEqual(a.workerHashes,b.workerHashes);assert(Math.abs(a.dotRatio-6.4/1.8)<1e-10);assert(Math.abs(b.dotRatio-1)<1e-10);
  const q=b.queenDraw.args;let changed=0,outside=0;for(let y=0;y<b.h;y++)for(let x=0;x<b.w;x++){const i=(y*b.w+x)*4;if(a.pixels.slice(i,i+4).some((v,k)=>v!==b.pixels[i+k])){changed++;if(x<q[0]||x>q[0]+q[2]||y<q[1]||y>q[1]+q[3])outside++;}}
  assert(changed>100);assert.equal(outside,0);reports.push({width,state,pass:true,beforeDotRatio:a.dotRatio,afterDotRatio:b.dotRatio,workerFramesUnchanged:true,savedWorldUnchanged:true,changedPixels:changed,outsideQueenFrame:outside,errors:b.errors});console.log('PASS '+width+' '+state);
 }
 const files=['core.js','lifecycle.js','game.js','view.js','queen-art.js','build-view.cjs'];fs.writeFileSync(path.join(qa,'results.json'),JSON.stringify({reports,beforeView:hash(before),afterView:hash(after),hashes:Object.fromEntries(files.map(n=>[n,hash(fs.readFileSync(path.join(__dirname,n)))]))},null,2));
 }finally{if(browser)await browser.close();await new Promise(r=>server.close(r));}})().catch(e=>{console.error(e);process.exitCode=1;});
