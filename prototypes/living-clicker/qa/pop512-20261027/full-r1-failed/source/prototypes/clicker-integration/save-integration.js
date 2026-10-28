/* Injected inside the original game's scope, after the grain adapter exists. */
  const initialColony=structuredClone(G.toSave());
  function currentPermanent(){return {insight:G.insight||0,meta:structuredClone(getResearchMeta())};}
  function downloadSave(text,name='ant-colony-backup.json'){
    const a=document.createElement('a'),url=URL.createObjectURL(new Blob([text],{type:'application/json;charset=utf-8'}));
    a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  let saveAlert=null,saveBlockedPanel=null;
  function saveError(){
    if(saveAlert)return;
    saveAlert=document.createElement('div');saveAlert.id='save-warning';saveAlert.setAttribute('role','alert');
    saveAlert.style.cssText='position:fixed;z-index:20001;top:8px;left:8px;right:8px;max-width:440px;margin:auto;padding:12px;background:#281f19;color:#fff0d2;border:1px solid #e9a35b;border-radius:8px;font-size:14px;';
    const text=document.createElement('span');text.textContent='保存できていません。閉じる前にデータを書き出してください。';saveAlert.append(text);
    for(const [name,fn]of [['再試行',()=>G.save()],['書き出す',()=>exportCurrentSave()]]){const b=document.createElement('button');b.textContent=name;b.style.cssText='font:inherit;margin:8px 8px 0 0;padding:8px;';b.onclick=fn;saveAlert.append(b);}
    document.body.append(saveAlert);
  }
  function saveBlocked(){queueMicrotask(()=>{
    if(saveBlockedPanel)return;
    const panel=document.createElement('div');saveBlockedPanel=panel;panel.id='save-blocked';panel.setAttribute('role','alertdialog');panel.setAttribute('aria-modal','true');panel.setAttribute('aria-labelledby','save-blocked-title');
    panel.style.cssText='position:fixed;inset:0;z-index:20000;display:grid;place-items:center;background:#0c0a08ef;padding:20px;color:#fff0d2;';
    const box=document.createElement('div');box.style.cssText='max-width:420px;';panel.append(box);
    const h=document.createElement('h2');h.id='save-blocked-title';h.textContent='保存データを読み込めませんでした';box.append(h);
    const p=document.createElement('p');p.textContent='元のデータは残っています。書き出して保管するか、バックアップを読み込んでください。';box.append(p);
    for(const [name,fn]of [['元のデータを書き出す',()=>downloadSave(saveSystem.raw||'','ant-colony-recovery.txt')],['バックアップを読み込む',()=>importCurrentSave()],['最初から始める',()=>{if(confirm('巣・知見・恒久研究を初期化して始めますか？元のデータは保管して残します。'))saveSystem.recoverFresh(freshColony());}]]){
      const b=document.createElement('button');b.textContent=name;b.style.cssText='display:block;min-height:44px;font:inherit;margin-top:12px;padding:10px;';b.onclick=fn;box.append(b);
    }
    document.body.append(panel);box.querySelector('button').focus();
  });}
  const saveSystem=ClickerPersistence.create({
    key:SAVE_KEY,storage:localStorage,
    rules:{researchDefs:RESEARCH_NODE_DEFS.map(d=>({id:d.id,max:getResearchNodeMaxLevel(d)})),branchIds:RESEARCH_BRANCH_DEFS.map(d=>d.id),expeditionIds:EXPEDITION_DEFS.map(d=>d.id)},
    capture:()=>({g:G.toSave(),world:S.serializeWorld(),permanent:currentPermanent()}),
    legacyPermanent:()=>{
      const raw=localStorage.getItem(RESEARCH_META_KEY);return raw?JSON.parse(raw):{insight:0,meta:{costDown:0,effUp:0}};
    },
    applyPermanent:p=>{G.insight=p.insight;G.researchMeta=structuredClone(p.meta);invalidateResearchBonuses();},
    onError:()=>saveError(),onBlocked:()=>saveBlocked(),
    onSaved:p=>{G.lastSave=p.g.lastSave;S.lastAutoSaveAt=Date.now();if(saveAlert){saveAlert.remove();saveAlert=null;}},
    onReload:()=>location.reload()
  });
  const loadOriginal=G.load.bind(G);let loadedSnapshot=null;
  G.load=()=>{loadedSnapshot=saveSystem.load();if(!loadedSnapshot)return {pendingOfflineSec:0,loaded:false};return loadOriginal();};
  G.save=(options={})=>{
    if(S._devTransientWorld)return false;
    const ok=saveSystem.save();if(ok&&options.showToast!==false)toast(options.toastText||'保存完了');return ok;
  };
  // The canonical snapshot owns permanent upgrades. Do not write a second store mid-purchase.
  saveResearchMeta=()=>{};
  maybeAutoSave=()=>{if(!S._devTransientWorld&&Date.now()-S.lastAutoSaveAt>=30000){
    S.lastAutoSaveAt=Date.now();
    // The legacy caller runs mid-update. Commit after this complete simulation turn.
    queueMicrotask(()=>{if(!saveSystem.blocked&&!S._devTransientWorld)G.save({showToast:false});});
  }};
  window.addEventListener('pagehide',()=>{if(!saveSystem.blocked)G.save({showToast:false});});
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden'&&!saveSystem.blocked)G.save({showToast:false});});
  async function exportCurrentSave(){
    if(saveSystem.blocked){downloadSave(saveSystem.raw||'','ant-colony-recovery.txt');return false;}
    try{
      const p=saveSystem.capture(),code=saveSystem.encode(p);
      // Export remains available when quota prevents local saves.
      if(navigator.clipboard?.writeText){try{await navigator.clipboard.writeText(code);toast('現在のデータをコピーしました');return code;}catch(_){}}
      downloadSave(JSON.stringify(p));toast('現在のデータを書き出しました');return code;
    }catch(e){toast('データを書き出せませんでした',true);return false;}
  }
  function importCurrentSave(){
    const code=prompt('この確認版で書き出したデータを貼り付けてください。今の巣・知見・恒久研究を置き換えます。');
    if(!code)return false;
    // Decode before confirmation or any write; old production/prototype saves are different games.
    try{saveSystem.decode(code);}catch(_){toast('この確認版の有効なバックアップではありません',true);return false;}
    if(!confirm('バックアップの巣・知見・恒久研究へ戻しますか？'))return false;
    return saveSystem.importCode(code);
  }
  function freshColony(prestige=false){
    const g=structuredClone(initialColony),p=currentPermanent();g.lastSave=Date.now();
    if(prestige){
      g.prestigeCount=(G.prestigeCount||0)+1;g.legacyBonus=(G.legacyBonus||0)+.1;
      g.raidWins=G.raidWins||0;g.raidTotal=G.raidTotal||0;g.trophies=structuredClone(G.trophies||{});
      g.queenLog=[...(G.queenLog||[]),{text:'転生して新しい巣を始めた。',t:0}].slice(-50);g.tutorialDone=true;
      g.ants.worker=Math.min(8+2*g.prestigeCount,20);p.insight+=computePrestigeInsight();
    }
    return {format:ClickerPersistence.FORMAT,schema:ClickerPersistence.SCHEMA,v:'23.0',start:'new-colony',g,world:null,permanent:p};
  }
  if(btnPrestige)btnPrestige.onclick=()=>{
    if(saveSystem.blocked)return false;
    if(!confirm('転生して新しい巣を始めますか？\n食料生産+10%、初期働きアリ+2匹、知見+'+computePrestigeInsight()+'。\n知見・恒久研究・日記・トロフィー・戦歴を引き継ぎます。'))return false;
    return saveSystem.replace(freshColony(true));
  };
  if(btnReset)btnReset.onclick=()=>{if(confirm('知見と恒久研究を残して、巣を最初から始めますか？'))return saveSystem.replace(freshColony());};
  const undoSave=document.createElement('button');undoSave.id='btn-save-undo';undoSave.className='res-box';undoSave.textContent='一つ前に戻す';undoSave.setAttribute('aria-label','一つ前のデータに戻す');undoSave.style.cssText='cursor:pointer;display:none;font-size:12px;';
  undoSave.onclick=()=>{if(confirm('前回の読込・転生・やり直しの直前に戻しますか？巣と知見を一緒に戻します。'))saveSystem.undo();};
  if(btnSaveImport)btnSaveImport.after(undoSave);
  function mutationStamp(){const g=G.toSave();g.lastSave=0;return JSON.stringify({...g,permanent:currentPermanent()});}
  function saveAfter(fn){return function(...args){
    if(saveSystem.blocked)return false;const before=mutationStamp(),result=fn.apply(this,args);
    if(before!==mutationStamp()){checkGoalAchievements();checkTrophies(false);G.save({showToast:false});}return result;
  };}
  buyResearchNode=saveAfter(buyResearchNode);buyMetaUpgrade=saveAfter(buyMetaUpgrade);hire=saveAfter(hire);
  startExpedition=saveAfter(startExpedition);adjustCasteRatio=saveAfter(adjustCasteRatio);lureSpider=saveAfter(lureSpider);
  for(const id of ['act-up-queen','btn-major-golden2x','btn-major-worker-bigcarry','btn-major-barracks','btn-up-worker','btn-up-nurse','btn-up-builder','btn-up-soldier','btn-unlock-waste','btn-build-ferment','btn-build-cookieroom']){
    const b=document.getElementById(id);if(b?.onclick)b.onclick=saveAfter(b.onclick);
  }
  // Manual tap bursts are coalesced, and pagehide/visibilitychange flush synchronously.
  let tapSaveTimer=null;
  for(const type of ['pointerdown','click'])if(btnTap)btnTap.addEventListener(type,()=>{clearTimeout(tapSaveTimer);tapSaveTimer=setTimeout(()=>{if(!saveSystem.blocked)G.save({showToast:false});},250);});
  function afterSaveInit(){
    setSpeed(S.timeScale);
    if(saveSystem.recovery)undoSave.style.display='inline-flex';
    if((saveSystem.legacy||loadedSnapshot?.world?.grain?.format==='clicker-grain-1')&&!saveSystem.blocked)G.save({showToast:false});
  }
