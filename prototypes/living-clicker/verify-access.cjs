const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {createServer}=require('../living-nest/server.cjs');const root=__dirname,qa=path.join(root,'qa');fs.mkdirSync(qa,{recursive:true});
const sha=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
(async()=>{const server=process.env.LIVING_DELIVERY?null:createServer();try{
 if(server)await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const origins=server?['http://127.0.0.1:'+server.address().port]:['http://127.0.0.1:5189',process.env.LIVING_TAILNET_ORIGIN].filter(Boolean);const reports=[];
 for(const origin of origins){const paths={
  '/clicker/':'index.html','/clicker/core.js':'core.js','/clicker/lifecycle.js':'lifecycle.js','/clicker/game.js':'game.js','/clicker/view.js':'view.js',
  '/clicker-previous/':'../clicker-integration/index.html','/clicker-previous/core.js':'../colony-game/core.js','/clicker-previous/nest.js':'../clicker-integration/nest.js','/clicker-previous/sprites.js':'../clicker-integration/sprites.js',
  '/play/':'../colony-game/index.html','/play/game.js':'../colony-game/game.js','/':'../living-nest/index.html'};
  const files=[];for(const [url,file]of Object.entries(paths)){const r=await fetch(origin+url);assert.equal(r.status,200,url);const body=Buffer.from(await r.arrayBuffer()),hash=sha(body);assert.equal(hash,sha(fs.readFileSync(path.join(root,file))),url);files.push({url,hash});}
  for(const p of ['/clicker/qa/world-900.json','/clicker/build.cjs','/clicker/DESIGN.md','/clicker/diagnostics.js','/clicker/view-diagnostics.js','/clicker/route-network.js','/clicker/build-actors.cjs','/clicker/qa/reencode-v2-fixtures.cjs','/clicker-previous/qa/journey-save.json','/play/qa/loop1/fifteen-minutes.json','/server.cjs','/AGENTS.md','/../AGENTS.md'])assert.equal((await fetch(origin+p)).status,404,p);
  for(const p of ['/clicker','/clicker-previous','/play'])assert.equal((await fetch(origin+p,{redirect:'manual'})).status,302,p);
  reports.push({origin,pass:true,files,privateFiles404:13,redirects:3});console.log('PASS '+origin);
 }
 assert.equal(sha(fs.readFileSync(path.resolve(root,'../../index.html'))),'c5a0fddf222e50b21d94275114a5b6d14a241858d387a2f4147c7ab4ff3edd02');
 fs.writeFileSync(path.join(qa,server?'routing-results.json':'delivery-results.json'),JSON.stringify(reports,null,2));
 }finally{if(server)await new Promise(r=>server.close(r));}})().catch(e=>{console.error(e);process.exitCode=1;});
