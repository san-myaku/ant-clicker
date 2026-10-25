/* Derive the integrated main game from its canonical source, with checked hooks. */
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=__dirname,source=path.join(root,'../../index.html');let html=fs.readFileSync(source,'utf8').replace(/\r\n/g,'\n');const patches=[];
function replace(from,to,label){if(!html.includes(from))throw new Error('Missing integration hook: '+label);html=html.replace(from,to);patches.push(label);}
for(const key of ['antSimV23_0','antSimV22_2','antResearchMeta','ant_render_settings_v1','ant_research_view_v1','antPrestige'])html=html.split(key).join('grainClicker_1_'+key);
replace('<title>Ant Colony</title>','<title>ありクリッカー — 掘る巣</title>','title');
replace('</style>',`@media(min-width:960px){#control-panel{backdrop-filter:none;-webkit-backdrop-filter:none;}}
  </style>`,'keep growth display outside the tap button');
const modelScripts=['world-plan.js','geology.js','exploration.js','persistence.js'].map(name=>'<script>'+fs.readFileSync(path.join(root,name),'utf8')+'</script>').join('\n');
replace('<script>','<script src="core.js"></script>\n<script src="sprites.js"></script>\n<script src="nest.js"></script>\n'+modelScripts+'\n<script>','modules');
replace('return generateMeshNest({ growth: true, production: true, transient: false, toast: false });','return initGrainClickerWorld();','compact initial plan with stable geology');
replace('globalBuffs: S.globalBuffs,','globalBuffs: S.globalBuffs, timeScale:S.timeScale,','persist chosen play speed');
replace('        this.raidTimer = (typeof d.raidTimer === "number") ? d.raidTimer : -1;','        this.raidTimer = (typeof d.raidTimer === "number") ? d.raidTimer : -1;\n        S.timeScale=Number.isFinite(d.timeScale)?Math.max(1,Math.min(10,d.timeScale)):1;','restore speed up to ten');
replace('      update(dt);\n      const t1 = performance.now();','      advanceRealTime(dt);\n      const t1 = performance.now();','fixed simulation ticks at every speed');
for(const k of ['x','y','scale'])replace('S.cam.'+k+' += (S.cam.'+(k==='scale'?'tScale':'t'+k)+' - S.cam.'+k+')*10*dt;','S.cam.'+k+' += (S.cam.'+(k==='scale'?'tScale':'t'+k)+' - S.cam.'+k+')*10*dtRaw;','unscaled camera '+k);
replace('setText(el.depth, `第${(S.band.index || 0) + 1}層`);','setText(el.depth, `第${grainNest.reached}層`);','show physical arrival instead of planning depth');
replace('const depthOk = (S.band && S.band.index >= INVADER_MIN_DEPTH);','const depthOk = grainNest.reached - 1 >= INVADER_MIN_DEPTH;','invaders require arrival');
replace('&& (S.band && S.band.index >= MOLE_MIN_DEPTH)','&& grainNest.reached - 1 >= MOLE_MIN_DEPTH','moles require arrival');
replace("const _depth = (typeof G.getDepthUnlocked === 'function') ? G.getDepthUnlocked() : 0;","const _depth = 0;",'disable old research-only mineral income');
replace('    // Food production\n    let fRate',`    grainNest.mine(sec * OFFLINE_EFF);
    // Food production\n    let fRate`,'same discovered mineral ledger during offline income');
replace("desc: '深部の鉱脈から資源を採掘する。巣が深いほどクッキーが少しずつ自然に湧き出す（深度に比例）。'","desc: '見つけて到達した鉱脈から、クッキーを少しずつ採掘する。'",'mineral effect follows discovery');
const loadStart=html.indexOf('        let raw = localStorage.getItem(SAVE_KEY);'),loadEnd=html.indexOf('        const d = pack.g;',loadStart);
if(loadStart<0||loadEnd<0)throw new Error('Validated load hook missing');
replace(html.slice(loadStart,loadEnd),`        const pack = loadedSnapshot;
        if(!pack)return {pendingOfflineSec:0,loaded:false};

`,'use the validated snapshot; no obsolete key fallback');
const exportStart=html.indexOf('  async function doExport() {'),exportEnd=html.indexOf('  // ===== Phase 4: 開発者モード =====',exportStart);
if(exportStart<0||exportEnd<0)throw new Error('Persistence UI hook missing');
replace(html.slice(exportStart,exportEnd),`  async function doExport() { return exportCurrentSave(); }
  function doImport() { return importCurrentSave(); }

`,'validated current-state backup UI');
replace('  loadResearchMeta();      // 段階3: 転生メタ通貨「知見」と恒久メタ層を恒久ストアから復元\n  applyPrestigeBonus();','  afterSaveInit();','permanent state loaded before initial recalculation');
replace('  function update(dt) {','  function update(dt) { if(saveSystem.blocked)return;','protect unreadable or transitioning save');
replace('    checkMilestones(dt);\n    updateUI();',`    checkMilestones(dt);
    checkCookieDiscovery();
    if(performance.now()>=(S._nextUiAt||0)){S._nextUiAt=performance.now()+(S._uiIntervalMs??100);updateUI();}`,'keep simulation independent of expensive panel refresh');
replace('  function updateBuilderLogic(dt) {','  function updateBuilderLogic(dt) { grainNest.update(dt); return;','physical construction authority');
replace("    S.ants.forEach((a, antIdx) => {","    S.ants.forEach((a, antIdx) => {\n      if(a.role==='builder'){ grainNest.stepBuilder(a,dt); return; }",'builder actions');
replace('  function runOfflineBuilding(offlineSec){','  function runOfflineBuilding(offlineSec){ return 0;','no formula-only offline excavation');
replace('function getResearchStatus(def){',`function getResearchStatus(def){
  if(def&&['offline_build','offline_build_speed'].includes(def.id))return 'locked';`,'defer unsupported offline construction purchase');
replace("desc: 'ゲームを閉じている間も建築アリが1/3の効率で部屋の拡張を進める。'","desc: '準備中。ゲームを閉じている間の建築は、今後対応予定です。'",'offline availability');
replace("desc: 'オフライン建築の効率 +20%/Lv（無限。最大でオンライン相当まで）'","desc: '準備中。ゲームを閉じている間の建築は、今後対応予定です。'",'offline upgrade availability');
replace("    S.builderState = builderState;","    S.builderState = grainNest.jobs.size ? '土を掘って運搬中' : builderState;",'builder status');
replace('  function drawCachedStaticNestLayer(view, soilTop, soilBottom, shakeX, shakeY) {','  function drawCachedStaticNestLayer(view, soilTop, soilBottom, shakeX, shakeY) { grainNest.ground(view,soilTop,soilBottom); return;','physical terrain');
replace('  function drawCachedFogLayer(view, soilTop, soilBottom, shakeX, shakeY) {','  function drawCachedFogLayer(view, soilTop, soilBottom, shakeX, shakeY) { return;','terrain visibility');
replace('  function drawRoomForegroundRims(ctx, view) {','  function drawRoomForegroundRims(ctx, view) { return;','grain rims');
const shadowStart=html.indexOf('    // ===== 部屋の奥行きインナーシャドウ ====='),shadowEnd=html.indexOf('    // ===== フォグオブウォー（未掘削エリアを暗闇で覆う） =====',shadowStart);
if(shadowStart<0||shadowEnd<0)throw new Error('Room shadow hook missing');
replace(html.slice(shadowStart,shadowEnd),'','remove smooth overlay outside grain floor');
const highlightStart=html.indexOf('    // ===== 掘削中のエッジを光らせる ====='),highlightEnd=html.indexOf('    drawSurfaceDebris(ctx, view);',highlightStart);
if(highlightStart<0||highlightEnd<0)throw new Error('Planned edge highlight hook missing');
replace(html.slice(highlightStart,highlightEnd),'','show the excavated terrain instead of the future edge');
replace('  function drawAntSprite(a) {','  function drawAntSprite(a) { return grainNest.drawAnt(a);','worker pixels');
replace('  function drawRealisticQueen(ctx, x, y, t, scale){','  function drawRealisticQueen(ctx, x, y, t, scale){ return grainNest.drawAnt({x,y,rot:0},true);','queen pixels');
replace('  function drawCrowdAntAtlasFrame(g, roleIdx, frameIdx, dirIdx, frameW, frameH) {','  function drawCrowdAntAtlasFrame(g, roleIdx, frameIdx, dirIdx, frameW, frameH) { return grainNest.drawAtlas(g,roleIdx,frameIdx,dirIdx,frameW,frameH);','crowd pixels');
replace('    return { mode, lodUsed };',"    return { mode:mode==='vector'||mode==='dot'?'sprite':mode, lodUsed };",'pixel LOD');
replace('    drawRoomForegroundRims(ctx, view);','    grainNest.drawSoil();\n    drawRoomForegroundRims(ctx, view);','actual loose grains');
replace('const shrinkWorldX = savedWorldW > WORLD_W_BASE * 1.05;','const shrinkWorldX = false;','preserve saved grain coordinate system');
replace('if(nodes.length) {\n        let minX = Infinity, maxX = -Infinity;','if(nodes.length && !savedWorld.grain) {\n        let minX = Infinity, maxX = -Infinity;','no independent saved geometry shift');
replace('  function buildSurfaceProfile(){',`  function buildSurfaceProfile(){
    if(S.full?._grainSurface?.pts?.at(-1)?.x===S.full.w){S.surfacePts=S.full._grainSurface.pts;S.surfaceStep=S.full._grainSurface.step;return;}`,'stable physical surface');
replace('    S.surfaceStep = step;','    S.surfaceStep = step;\n    S.full._grainSurface={pts,step};','retain surface');
replace('      rebuildAllEdgeStamps();\n      buildBackgroundAssets();',`      if(savedWorld.grainSurface)this.full._grainSurface=savedWorld.grainSurface;
      rebuildAllEdgeStamps();\n      buildBackgroundAssets();`,'restore physical surface');
const hooks=`
  let pendingGrain=null;
  const grainNest=createClickerGrainNest({G,S,ctx,dp,cubic,pointInPolygon,surfaceY,rebuildBuilderAssignments:()=>rebuildBuilderAssignments(),getResearchBonus,onDigChunk:rollDigTreasure,
    canRoom:(n,t)=>physicalRoomAllowed(n,t),beginTarget:t=>beginPhysicalTarget(t),
    reservable:t=>originalReservable(t.eid,t.to,t.reason),mineralEnabled:()=>hasResearchUnlock('mineralVein'),addCookie,
    onDiscovery:(amount,p)=>{addCookie(amount);toast('鉱脈を発見：クッキー +'+amount);},onReach:n=>toast('第'+n+'層に到達'),
    finishTarget:t=>{advanceDigEdge(t);markRoomCacheDirty();}});
  const legacySerialize=S.serializeWorld.bind(S),legacyDeserialize=S.deserializeWorld.bind(S),legacySync=syncAntVisuals;
  S.serializeWorld=()=>{const pack=legacySerialize();if(!pack)return null;
    pack.nodes.forEach((n,i)=>{n.blob=structuredClone(S.full.nodes[i].blob);n.slots=structuredClone(S.full.nodes[i].slots);});
    return {...pack,grain:grainNest.dump(),grainDpr:dp(1),grainSurface:structuredClone(S.full._grainSurface)};};
  S.deserializeWorld=pack=>{
    if(pack?.grain&&pack.grainDpr!==dp(1)){
      pack=structuredClone(pack);const factor=dp(1)/pack.grainDpr;
      for(const n of pack.nodes){n.x*=factor;n.y*=factor;n.r*=factor;for(const p of [...(n.blob||[]),...(n.slots||[])]){p.x*=factor;p.y*=factor;}}
      for(const e of pack.edges)for(const p of [e.p0,e.p1,e.p2,e.p3]){p.x*=factor;p.y*=factor;}
      for(const k of ['w','h','sy'])pack[k]*=factor;
      if(pack.band)for(const k of ['top','bottom','height','step'])pack.band[k]*=factor;
      if(pack.grainSurface){pack.grainSurface.step*=factor;for(const p of pack.grainSurface.pts){p.x*=factor;p.y*=factor;}}
    }
    const ok=legacyDeserialize(pack);if(ok&&pack.grain){
      for(let i=0;i<pack.nodes.length;i++){const n=S.full.nodes[i],saved=pack.nodes[i];if(saved.blob){n.blob=structuredClone(saved.blob);n.slots=structuredClone(saved.slots);n._blobPath=null;n._blobPathLen=0;}}
      pendingGrain=pack.grain;
    }return ok;
  };
  syncAntVisuals=()=>{
    const active=S.ants.filter(a=>grainNest.jobs.has(a.vid));
    legacySync();
    for(const a of active)if(!S.ants.some(b=>b.vid===a.vid))S.ants.push(a);
    if(pendingGrain){
      S.ants=S.ants.filter(a=>a.role!=='builder');
      antVisualSeq=Math.max(antVisualSeq,...pendingGrain.actors.map(a=>a.vid+1));
      const ids=new Set(pendingGrain.actors.map(a=>a.vid));for(const a of S.ants)if(ids.has(a.vid))a.vid=antVisualSeq++;
      grainNest.restoreActors(pendingGrain);grainNest.restore(pendingGrain);pendingGrain=null;
    }
  };
  ${fs.readFileSync(path.join(root,'depth-integration.js'),'utf8')}
  ${fs.readFileSync(path.join(root,'save-integration.js'),'utf8')}
  window.clickerIntegration={G,S,nest:grainNest,persistence:saveSystem,exportSave:exportCurrentSave,importSave:importCurrentSave,buyMeta:buyMetaUpgrade,freshColony,save:()=>G.save({showToast:false}),
    step:seconds=>{for(let t=0;t<Math.round(seconds*60);t++)update(1/60);updateUI();render();},render,
    simulate:(seconds,tick=1/60)=>{if(tick>0.1||tick<=0)throw new Error('tick');for(let t=0;t<Math.round(seconds/tick);t++)update(tick);},
    buyResearch:buyResearchNode,unlockResearchSystem,hire:(role)=>hire(role),getResearchBonus,openDepthResearch,
    researchCost:id=>getResearchNodeCost(getResearchNodeDef(id),researchLevel(id)),researchStatus:id=>getResearchStatus(getResearchNodeDef(id)),refreshUI:()=>updateUI(),advanceRealTime,
    roomCosts:()=>({waste:getWasteRoomCost(),ferment:getFermentRoomCost(),cookie:getCookieRoomCost()})};
`;
replace('  function initGame() {',hooks+'\n  function initGame() {','main-world integration hooks');
fs.writeFileSync(path.join(root,'index.html'),html);
fs.mkdirSync(path.join(root,'qa'),{recursive:true});fs.writeFileSync(path.join(root,'qa/build.json'),JSON.stringify({sourceSHA256:crypto.createHash('sha256').update(fs.readFileSync(source)).digest('hex'),patches,format:'clicker-grain-1'},null,2));
console.log('Built integrated main game: '+patches.length+' checked hooks');
