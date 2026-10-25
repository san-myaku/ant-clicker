/* Main-game policy around the physical world; no second economy. */
  function initGrainClickerWorld(){
    const plan=ClickerWorldPlan.create(Math.floor(Math.random()*4294967296)),d=dp(1);
    for(const n of plan.nodes){for(const k of ['x','y','r'])n[k]*=d;for(const p of [...n.blob,...n.slots]){p.x*=d;p.y*=d;}}
    for(const e of plan.edges)for(const p of [e.p0,e.p1,e.p2,e.p3]){p.x*=d;p.y*=d;}
    S.full={nodes:plan.nodes,edges:plan.edges,byNode:plan.byNode,w:plan.w*d,h:plan.h*d,sy:plan.sy*d,eid:plan.eid,qid:plan.qid,
      _grainGeology:{format:'geology-1',seed:plan.seed,boundaries:plan.boundaries,deposits:plan.deposits,tunnelRadius:14,layout:'compact-1'}};
    S.mainTipId=plan.mainTipId;S.nodeVis=plan.nodeVis;S.edgeFrac=plan.edgeFrac;S.band={...S.band,...plan.band};for(const k of ['top','bottom','height','step'])S.band[k]*=d;
    S._meshNest=true;S._meshGrowth=true;S._devTransientWorld=false;S.ants=[];S.enemies=[];S.invaders=[];S.effects=[];S.dust=[];S.trails=[];S.antCrowd=null;S.buildAssignments=null;
    rebuildAllEdgeStamps();buildBackgroundAssets();G.recalc();updateCameraLimits();return {growth:true};
  }
  const reservationField={ferment:'fermentRoomPending',cookieroom:'cookieRoomPending',soldier:'barracksPending',waste:'wasteRoomPending'};
  function occupiedRoomCount(type){return (S.full?.nodes||[]).filter(n=>n.type===type&&S.nodeVis[n.id]).length+[...grainNest.targets.values()].filter(t=>t.reservation&&S.full.nodes[t.to].type===type&&!S.nodeVis[t.to]).length;}
  function committedRoomCount(type){return occupiedRoomCount(type)+(G[reservationField[type]]||0);}
  getFermentRoomCost=()=>Math.round(FERMENT_ROOM_COST*Math.pow(FERMENT_ROOM_COST_GROWTH,committedRoomCount('ferment')));
  getCookieRoomCost=()=>Math.round(COOKIE_ROOM_COST_BASE*Math.pow(COOKIE_ROOM_COST_GROWTH,committedRoomCount('cookieroom')));
  getWasteRoomCost=()=>Math.round(WASTE_ROOM_COST_BASE*Math.pow(WASTE_ROOM_COST_GROWTH,committedRoomCount('waste')));
  getBarracksCost=()=>Math.round(MAJOR_BARRACKS_COST*Math.pow(BARRACKS_COST_GROWTH,committedRoomCount('soldier')));
  canBuildMoreWasteRooms=()=>committedRoomCount('waste')<WASTE_ROOM_MAX;
  function physicalRoomAllowed(n,t){
    if(['shaft','nursery','food'].includes(n.type))return true;
    if(n.type==='storage')return false; // no capacity/effect in the current original economy
    if(n.type==='rest')return G.bLv>=2&&(S.restCount||0)<(S.restLimit||0);
    const field=reservationField[n.type];if(!field)return false;
    const unlocked=n.type==='ferment'?isFermentRoomUnlocked():n.type==='cookieroom'?isCookieRoomUnlocked():n.type==='soldier'?hasBarracksBlueprint()&&G.bLv>=3:!!G.unlockWasteRoom;
    if(!unlocked)return false;
    if(n.type==='waste'&&!t.reservation&&occupiedRoomCount('waste')>=WASTE_ROOM_MAX)return false;
    return (G[field]||0)>0||t.reservation===field;
  }
  function beginPhysicalTarget(t){
    const n=S.full.nodes[t.to],field=reservationField[n.type];if(!field)return null;
    if(!physicalRoomAllowed(n,t)||(G[field]||0)<=0)return false;
    G[field]--;return field;
  }
  const originalReservable=isDigTargetReservable,originalRebuild=rebuildBuilderAssignments;
  isDigTargetReservable=(eid,to,reason)=>originalReservable(eid,to,reason)&&grainNest.canTarget({eid,to,dir:S.nodeVis[S.full.edges[eid].u]?1:-1});
  getDigTarget=()=>{const t=grainNest.chooseTarget();return t?decorateDigTarget(t):null;};
  rebuildBuilderAssignments=()=>{
    if(S.buildAssignments?.targets)for(const [k,t]of Object.entries(S.buildAssignments.targets))if(!grainNest.canTarget(t))delete S.buildAssignments.targets[k];
    return originalRebuild();
  };
  // A readable path to the actual depth research, using the same costs and purchase.
  const depthAction=document.createElement('button');depthAction.id='nest-depth-action';depthAction.className='btn';depthAction.style.cssText='display:none;width:100%;font-size:13px;min-height:36px;margin:6px 0;';
  document.getElementById('control-growth-bars').after(depthAction);
  const depthDialog=document.createElement('dialog');depthDialog.id='nest-depth-research';depthDialog.setAttribute('aria-labelledby','nest-depth-title');
  depthDialog.style.cssText='box-sizing:border-box;width:min(380px,calc(100vw - 24px));max-height:calc(100dvh - 30px);overflow:auto;padding:20px;background:#151c1a;color:#efeadb;border:1px solid #8e774d;border-radius:12px;';
  depthDialog.innerHTML='<h2 id="nest-depth-title" style="margin:0 0 12px;font-size:20px"></h2><p id="nest-depth-effect"></p><p id="nest-depth-cost"></p><p id="nest-depth-condition"></p><div style="display:flex;gap:10px;margin-top:18px"><button id="nest-depth-buy" class="btn" style="flex:1">研究する</button><button id="nest-depth-close" class="btn">閉じる</button></div>';
  document.body.append(depthDialog);let selectedDepth=null;
  document.getElementById('nest-depth-close').onclick=()=>depthDialog.close();
  function updateDepthDetail(){
    if(!selectedDepth)return;const def=getResearchNodeDef(selectedDepth),cost=getResearchNodeCost(def,researchLevel(def.id)),status=getResearchStatus(def);
    document.getElementById('nest-depth-title').textContent=def.name;
    document.getElementById('nest-depth-effect').textContent=def.desc;
    document.getElementById('nest-depth-cost').textContent=[cost.cookie?'クッキー '+cost.cookie:null,cost.food?'食料 '+cost.food:null].filter(Boolean).join('・');
    const condition=document.getElementById('nest-depth-condition');condition.textContent=!isResearchSystemUnlocked()?`研究の解放：${RESEARCH_UNLOCK_POP}匹・女王Lv${RESEARCH_UNLOCK_QLV}`:status==='done'?'':!isResearchNodeConditionMet(def)?getResearchNodeConditionText(def):G.cookie<cost.cookie?'クッキーがあと'+(cost.cookie-G.cookie)+'必要':G.food<cost.food?'食料があと'+Math.ceil(cost.food-G.food)+'必要':'';condition.hidden=!condition.textContent;
    const b=document.getElementById('nest-depth-buy');b.disabled=status!=='ready';b.textContent=status==='done'?'研究済み':'研究する';
  }
  function openDepthResearch(id){selectedDepth=id;updateDepthDetail();if(!depthDialog.open)depthDialog.showModal();}
  document.getElementById('nest-depth-buy').onclick=()=>{if(selectedDepth)buyResearchNode(selectedDepth);updateDepthDetail();updateDepthAction();};
  function updateDepthAction(){
    if(!S.full)return;const level=G.getDepthUnlocked(),ids=[null,GEO_DEPTH_2_NODE,GEO_DEPTH_3_NODE,GEO_DEPTH_4_NODE],id=ids[level];
    depthAction.style.display=id&&(G.bLv>=2||isResearchSystemUnlocked())?'block':'none';if(id){depthAction.textContent=getResearchNodeDef(id).name+'へ';depthAction.onclick=()=>openDepthResearch(id);}
    if(depthDialog.open)updateDepthDetail();
  }
  const originalUI=updateUI;updateUI=()=>{originalUI();updateDepthAction();};
  const speedRow=document.createElement('label');speedRow.style.cssText='display:flex;align-items:center;justify-content:space-between;gap:12px;width:100%;padding:10px;box-sizing:border-box;font-size:14px;';speedRow.textContent='速度';
  const speedChoice=document.createElement('select');speedChoice.id='nest-speed';speedChoice.setAttribute('aria-label','ゲームの速度');speedChoice.style.cssText='font-size:16px;min-height:40px;background:#15201b;color:#eee8dc;border:1px solid #88734d;border-radius:6px;padding:4px 10px;';
  for(let n=1;n<=10;n++){const option=document.createElement('option');option.value=n;option.textContent=n+'倍';speedChoice.append(option);}speedRow.append(speedChoice);document.getElementById('mobile-menu-actions').append(speedRow);
  const originalSetSpeed=setSpeed;setSpeed=n=>{originalSetSpeed(Math.max(1,Math.min(10,Math.round(Number(n)||1))));speedChoice.value=String(S.timeScale);};
  speedChoice.onchange=()=>{setSpeed(speedChoice.value);G.save({showToast:false});};
  let simulationDebt=0;
  function advanceRealTime(elapsed){
    if(saveSystem.blocked){simulationDebt=0;return 0;}
    simulationDebt+=Math.min(1,Math.max(0,elapsed));const count=Math.min(60,Math.floor((simulationDebt+1e-10)*60));
    for(let i=0;i<count;i++)update(1/60);simulationDebt=Math.max(0,simulationDebt-count/60);return count;
  }
