const fs=require('node:fs'),path=require('node:path'),root=__dirname;
let source=fs.readFileSync(path.resolve(root,'../colony-game/view.js'),'utf8').replace(/\r\n/g,'\n');
function replace(from,to,label){const n=source.split(from).length-1;if(n!==1)throw Error(label+': expected one hook, got '+n);source=source.replace(from,to);}
replace('  function antFrame(angle, step, queen = false, action = \'walk\') {',fs.readFileSync(path.join(root,'queen-art.js'),'utf8')+'\n  function antFrame(angle, step, queen = false, action = \'walk\') {','queen art at worker pixel density');
replace("    const queen = screen(48, 24); antShape(ctx, queen.x, queen.y, cam.scale * 6.4, -.14, 0, true);\n    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;", "    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;\n    const queen = screen(48, 24); drawQueen(ctx,queen.x,queen.y,cam.scale,reduced);", 'render the dedicated queen');
replace('  let cachedRevision = -1, selected = null,','  let visibleGrains=null;\n  let cachedRevision = -1, selected = null,','shared visible soil');
replace('  function persist(announce = false) {',`  function checkpoint(){const bytes=invalidStored?localStorage.getItem(KEY):JSON.stringify(sim.dump());if(bytes)localStorage.setItem(KEY+'_recovery',bytes);}
  function persist(announce = false) {
    if(invalidStored){message('保存データを開けないため、上書きを止めています。');return false;}
    sim.progress.speed=speed;`,'protect saved bytes and speed');
replace('sim = new Simulation(seed); selected = null;', 'const candidate=new Simulation(seed);checkpoint();sim = candidate; selected = null;','checkpoint before reset');
replace('sim = candidate; selected = null; cachedRevision = -1; accumulator = 0; lastSave = sim.time;\n    $(\'seed\').value = sim.seed;', 'checkpoint();sim = candidate; selected = null; cachedRevision = -1; accumulator = 0; lastSave = sim.time;\n    speed=sim.progress.speed;$(\'speed\').value=String(speed);\n    $(\'seed\').value = sim.seed;','atomic adoption');
replace("  let invalidStored = paused;","  let invalidStored = paused;\n  speed=sim.progress.speed;$('speed').value=String(speed);",'restore speed');
replace(`    cam.x = W / 2; cam.y = H / 2; cam.zoom = .95;
    cam.scale = Math.min(cam.width / W, cam.height / H) * cam.zoom;`,`    const points=[...sim.ants,...sim.physics.bodies.filter(b=>b.kind!=='soil'||!b.carrier&&b.y<SURFACE)];
    for(let g=0;g<sim.grains.length;g++)if(!sim.grains[g]&&sim.grainRoom[g])points.push(GRAIN.center(g));
    const minX=Math.max(0,Math.min(...points.map(p=>p.x))-4),maxX=Math.min(W,Math.max(...points.map(p=>p.x),sim.entrance.x+9)+4),minY=0,maxY=Math.max(34,...points.map(p=>p.y))+4;
    cam.x=(minX+maxX)/2;cam.scale=Math.min(cam.width/(maxX-minX),cam.height/(maxY-minY))*.92;cam.y=Math.max((minY+maxY)/2,cam.height/(2*cam.scale));cam.zoom=cam.scale/Math.min(cam.width/W,cam.height/H);`,'fit the living nest, not empty future world');
replace(`    cam.x = W / 2; cam.y = 26; cam.zoom = cam.width < 600 ? 2.4 : 1.9;
    cam.scale = Math.min(cam.width / W, cam.height / H) * cam.zoom;`,`    cam.x=46;cam.y=21.5;cam.scale=cam.width<600?Math.min(15,cam.width/25):Math.min(24,cam.height/31);cam.zoom=cam.scale/Math.min(cam.width/W,cam.height/H);`,'observation scale');
replace('    floor.clearRect(0,0,FW,FH);',`    floor.clearRect(0,0,FW,FH);
    const light=new Uint8Array(FW*FH),queue=new Int32Array(FW*FH);let start=0,end=0;
    for(let g=SURFACE*GRID*FW;g<light.length;g++)if(!sim.grains[g]){light[g]=13;queue[end++]=g;}
    while(start<end){const g=queue[start++],value=light[g]-1;if(value<=0)continue;for(const n of GRAIN.neighbors(g))if(light[n]<value){light[n]=value;queue[end++]=n;}}
    visibleGrains=light;
    // Hidden rock has precisely the surrounding layer's soil pixels.
    for(let gy=SURFACE*GRID;gy<FH;gy++)for(let gx=0;gx<FW;gx++){
      const g=gy*FW+gx;if(!sim.grains[g])continue;
      if(!light[g]){const p=GRAIN.center(g),type=(sim.layerAt(p.x,p.y)-1)%2?2:1;c.fillStyle=soilColor(type,g);c.fillRect(gx,gy,1,1);}
      c.fillStyle='rgba(21,20,17,'+(light[g]?(.6*(1-light[g]/13)):.68)+')';c.fillRect(gx,gy,1,1);
    }`,'real-air lighting and hidden geology');
replace("floor.fillStyle=rid===1?'#e2d1a9':rid===2?'#e5d7bc':rid===3?'#dcccab':'#d7c7ab';","floor.fillStyle=rid===1?'#e2d1a9':rid>=2?(sim.roomKind(rid)==='egg'?'#e5d7bc':'#dcccab'):'#d7c7ab';",'shared room purpose colors');
replace("else{const g=selected.grain,t=sim.grains[g];line(t?['','土','硬い土','岩'][t]:names[sim.grainRoom[g]],true);line(t===3?'掘れない岩です':t?'まだ掘っていない土です':'アリが通れる空間です');}","else{const g=selected.grain,t=sim.grains[g],p=GRAIN.center(g),known=visibleGrains?.[g]>0;line(t?(known?['','土','硬い土','岩'][t]:'第'+sim.layerAt(p.x,p.y)+'層の土'):names[sim.grainRoom[g]],true);line(t?(known&&t===3?'掘れない岩です':sim.layerAt(p.x,p.y)>sim.depthAbility()?'深度研究で掘れるようになります。':'まだ掘っていない場所です。'):'アリが通れる空間です');}",'do not disclose buried rock by selection');
// Spoil now rings the entrance on both sides; the mound itself shows where.
replace("    if (above.y > 18) ctx.fillText('土捨て場', above.x, above.y);\n","",'no fixed dump label');
replace("s.ants+sim.colony.brood.length>=ColonyGame.LIMIT?", "s.ants+sim.colony.brood.length>=sim.populationLimit()?",'live population cap');
replace("Math.ceil((1-s.queen)*40)", "Math.ceil((1-s.queen)*40/sim.layRate())", 'remaining laying time follows the queen research');
replace("if(s.ants===64)cause='64匹のコロニーに育ちました。この区画の目標達成です。';","if(s.ants+sim.colony.brood.length>=sim.populationLimit())cause='コロニーが育ちました。女王と地質の研究で、次の成長へ。';",'growth continues through research');
replace("    if($('cause').textContent!==cause)","    if(s.births&&s.allocation.forage&&s.allocation.nurse&&s.allocation.build&&s.food>=2)cause=s.reached<sim.depthAbility()?'新しい地層へ、通路を掘り進めています。':s.ants<32?'働き手を育てて、巣を広げよう。':'研究と仕事の配分で、コロニーを育てよう。';\n    if(sim.colony.disease?.active)cause='育児室にゴミがたまり、病気が広がっています。掃除の手を増やそう。';\n    $('cookies').textContent=s.cookie;$('depth').textContent='第'+s.reached+'層';updateResearch();\n    if($('cause').textContent!==cause)",'show physical progression');
replace("  $('lay').onclick=()=>{sim.tap();updateUI();};",`${fs.readFileSync(path.join(root,'view-research.js'),'utf8')}
  let tapSave=null;
  $('lay').onclick=()=>{if(sim.tap()){clearTimeout(tapSave);tapSave=setTimeout(()=>persist(),250);}updateUI();};`,'readable research and action save');
replace("sim.colony.laying=!sim.colony.laying;updateUI();","sim.colony.laying=!sim.colony.laying;persist();updateUI();",'laying preference save');
replace("sim.shiftRole(b.dataset.role,+b.dataset.delta);updateUI();","sim.shiftRole(b.dataset.role,+b.dataset.delta);persist();updateUI();",'allocation save');
replace("$('speed').onchange = () => { speed = +$('speed').value; };","$('speed').onchange = () => { speed = +$('speed').value;persist(); };",'speed save');
replace("$('save').onclick = () => { invalidStored = false; persist(true); };","$('save').onclick = () => { persist(true); };",'explicit save does not bypass corrupt protection');
replace("$('zoom-in').onclick = () => zoom(1.25);","$('focus').onclick=focusView;\n  $('undo').onclick=()=>{try{const bytes=localStorage.getItem(KEY+'_recovery');if(!bytes){message('一つ前の巣はまだありません。');return;}const candidate=Simulation.restore(JSON.parse(bytes));adopt(candidate);invalidStored=false;persist();message('一つ前の巣に戻りました。');}catch{message('一つ前の巣を開けませんでした。いまの巣はそのままです。');}};\n  $('zoom-in').onclick = () => zoom(1.25);",'recovery action');
replace('      selectionUI();','      selectionUI();if(selected)$(\'selection-detail\').open=true;','selection disclosure');
replace('`ant-colony-1-${sim.seed}.json`','`living-clicker-1-${sim.seed}.json`','current file name');
replace("adopt(next); invalidStored = false; persist(); message('保存データを開きました。');", "adopt(next); invalidStored = false; if(persist())message('保存データを開きました。');",'keep import write-failure warning');
replace("catch (e) { message('有効な保存データではありません。いまの巣はそのままです。'); }", "catch (e) { message('保存データを開けませんでした。いまの巣はそのままです。'); }",'import validation and checkpoint errors');
replace("reset(seed); invalidStored = false; persist(); message('この地形で最初から始めました。');", "try{reset(seed); invalidStored = false; if(persist())message('この地形で最初から始めました。');}catch{message('新しい巣を保存できませんでした。いまの巣を書き出して保管できます。');}",'atomic reset checkpoint failure');
replace("$('new-seed').onclick = () => { reset(crypto.getRandomValues(new Uint32Array(1))[0] || 1); invalidStored = false; persist(); message('別の地形で始めました。'); };", "$('new-seed').onclick = () => {try{reset(crypto.getRandomValues(new Uint32Array(1))[0] || 1);invalidStored=false;if(persist())message('別の地形で始めました。');}catch{message('新しい巣を始められませんでした。いまの巣を書き出して保管できます。');}};",'new terrain checkpoint errors');
replace('  window.colonyGame = {','  window.colonyGame = {','inspection api');
// Waste pellets: small, dark and irregular, readable apart from food and soil.
replace("const pattern=b.kind==='egg'?","const pattern=b.kind==='cookie'?['0110','1111','1111','0110']:b.kind==='waste'?['0110','1111','1110','0110']:b.kind==='egg'?",'waste pellet pixels');
replace("ctx.fillStyle=b.kind==='egg'?(","ctx.fillStyle=b.kind==='cookie'?(y<1?'#f6d9a0':x>2?'#c98b43':'#e4ae63'):b.kind==='waste'?(y<1?'#5d5649':x>2?'#2c2924':'#433e35'):b.kind==='egg'?(",'waste pellet colors');
replace("line(e?stageNames[e.stage]:b.kind==='soil'?'砂粒':'餌',true);","line(e?stageNames[e.stage]:b.kind==='soil'?'砂粒':b.kind==='waste'?'ゴミ':b.kind==='cookie'?'甘い粒':'餌',true);",'waste selection name');
replace("line(b.carrier?'アリ '+b.carrier+' が運搬中':sim.colony.wild.includes(b.id)?","line(b.carrier?'アリ '+b.carrier+' が運搬中':b.kind==='waste'?(b.y<SURFACE?'地表で土に還っていく':'巣の中に残っている'):sim.colony.wild.includes(b.id)?",'waste selection place');
replace("bodies[0].kind==='food'?'餌 1個':","bodies[0].kind==='food'?'餌 1個':bodies[0].kind==='waste'?'ゴミ 1個':bodies[0].kind==='cookie'?'甘い粒 1個':",'carried waste');
// Room labels come from each room's purpose and its order among the same kind.
replace("ctx.measureText(names[r.id])","ctx.measureText(sim.roomName(r.id))",'room label width');
replace("ctx.fillText(names[r.id], p.x, p.y)","ctx.fillText(sim.roomName(r.id), p.x, p.y)",'room label');
replace("):names[sim.grainRoom[g]],true)","):sim.roomName(sim.grainRoom[g]),true)",'selected air room name');
fs.writeFileSync(path.join(root,'view.js'),source);console.log('Observation view generated with checked hooks.');
