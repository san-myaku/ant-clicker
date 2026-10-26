  // Developer inspection only: no player-facing controls or persistent data.
  let diagnostics=null,lastDiagnostics=null;
  function stopDiagnostics(){
    if(diagnostics){lastDiagnostics=diagnostics.detach();diagnostics=null;}
    return lastDiagnostics&&structuredClone(lastDiagnostics);
  }
  async function startDiagnostics(options={}){
    const target=sim,hashes={};
    for(const name of ['index.html','core.js','lifecycle.js','game.js','view.js']){
      const response=await fetch(new URL(name,location.href));if(!response.ok)throw Error('診断のソースを確認できません: '+name);
      hashes[name]=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',await response.arrayBuffer())),n=>n.toString(16).padStart(2,'0')).join('');
    }
    if(target!==sim)throw Error('診断の準備中に巣が切り替わりました');
    stopDiagnostics();lastDiagnostics=null;
    diagnostics=new LivingDiagnostics.Observer({config:options.config,metadata:{sourceSha256:hashes,origin:location.origin,step:STEP}}).attach(sim);
    return {sourceSha256:hashes,tick:sim.ticks};
  }
