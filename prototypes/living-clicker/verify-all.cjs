/* Runs the living-clicker checks in parallel, one per CPU core, longest
   first, and prints how long each took. `--browser` adds the smoke, touch and
   browser checks. `--chain` also runs the full chain (verify-world ->
   verify-depth -> verify-scale, about 8 minutes) on a copy, because the chain
   rewrites the saves the other checks read; its outputs stay in that copy.
   Names (e.g. `raid waste`) run only those checks. */
const {spawn}=require('node:child_process'),os=require('node:os'),path=require('node:path'),fs=require('node:fs');
const root=path.resolve(__dirname,'../..'),here=__dirname;
const suites=['waste','raid','ferment','housing','disease','approach','rock','research','cargo-turn','storage','reservation','headon','turn'].map(n=>({name:n,cmd:['node',[path.join(here,'verify-'+n+'.cjs')]]}));
if(process.argv.includes('--chain')){const copy=fs.mkdtempSync(path.join(os.tmpdir(),'living-chain-'));fs.cpSync(here,copy,{recursive:true});
  suites.unshift({name:'chain',cmd:['sh',['-c','node verify-world.cjs && node verify-depth.cjs && node verify-scale.cjs']],cwd:copy});console.log('chain copy: '+copy);}
if(process.argv.includes('--browser'))suites.push({name:'smoke',cmd:['node',[path.join(root,'scripts/verify-cloud.cjs')]]},{name:'touch',cmd:['node',[path.join(here,'verify-touch.cjs')]]},{name:'browser',cmd:['node',[path.join(here,'verify-browser.cjs')]]});
const only=process.argv.slice(2).filter(a=>!a.startsWith('--'));const todo=only.length?suites.filter(s=>only.includes(s.name)):suites;
const width=Math.max(1,os.cpus().length),results=[],t0=Date.now();let next=0,running=0;
function start(){
  while(running<width&&next<todo.length){const s=todo[next++],began=Date.now();running++;let log='';
    const p=spawn(s.cmd[0],s.cmd[1],{cwd:s.cwd||root});p.stdout.on('data',d=>log+=d);p.stderr.on('data',d=>log+=d);
    p.on('close',code=>{running--;results.push({name:s.name,code,seconds:(Date.now()-began)/1000,log});console.log((code?'FAIL ':'PASS ')+s.name.padEnd(12)+((Date.now()-began)/1000).toFixed(0).padStart(5)+' s');if(code)console.log(log.split('\n').filter(l=>!/^\s+at /.test(l)).slice(-12).join('\n'));start();});}
  if(!running&&next>=todo.length){const failed=results.filter(r=>r.code);console.log((failed.length?'FAILED '+failed.map(r=>r.name).join(', '):'ALL PASS')+' in '+((Date.now()-t0)/1000).toFixed(0)+' s on '+width+' cores');process.exitCode=failed.length?1:0;}
}
start();
