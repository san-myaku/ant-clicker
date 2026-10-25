(function () {
  'use strict';
  const { Simulation, W, H, SIZE, SURFACE, KEY, STEP, PICKUP_SECONDS, GRAIN, GRID, FW, FH, ANT_SIZE, ANT_BODY, renderAngle, names, xy, idx, hash } = LivingNest;
  const $ = id => document.getElementById(id);
  const canvas = $('nest'), ctx = canvas.getContext('2d');
  const layer = document.createElement('canvas'), ground = layer.getContext('2d');
  // Two backing pixels per physical grain, at any shared grain resolution.
  layer.width = FW * 2; layer.height = FH * 2;
  ground.scale(2, 2);
  const floorLayer = document.createElement('canvas'), floor = floorLayer.getContext('2d');
  floorLayer.width = layer.width; floorLayer.height = layer.height; floor.scale(2,2);
  const earthLayer = document.createElement('canvas'), earth = earthLayer.getContext('2d');
  earthLayer.width = layer.width; earthLayer.height = layer.height; earth.scale(2,2);
  let earthSimulation = null;
  let sim, paused = false, speed = 1, last = performance.now(), accumulator = 0, lastUI = -1, lastSave = 0;
  let objectMode=false;
  let cachedRevision = -1, selected = null, pointers = new Map(), gesture = null, storageBlocked = false;
  const cam = { x: W / 2, y: H / 2, zoom: 1, scale: 1, width: 0, height: 0, dpr: 1 };
  const tasks = { idle: '休憩・巣内の移動', travel: '掘削面へ移動', dig: '土を掘削', haul: '土を地上へ運搬', unload: '地上で土を下ろす' };
  const formatTime = t => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;
  function message(text) { $('message').textContent = text; }
  function persist(announce = false) {
    try { localStorage.setItem(KEY, JSON.stringify(sim.dump())); storageBlocked = false; lastSave = sim.time; if (announce) message('いまの地形とアリの仕事を保存しました。'); return true; }
    catch (e) { storageBlocked = true; message('保存できませんでした。書き出して保管できます。'); return false; }
  }
  function reset(seed) {
    sim = new Simulation(seed); selected = null; cachedRevision = -1; accumulator = 0; lastSave = sim.time;
    $('scenario').value = ''; $('seed').value = seed; $('hard-dig').checked = sim.hardDig; focusView(); updateUI();
  }
  function adopt(candidate) {
    sim = candidate; selected = null; cachedRevision = -1; accumulator = 0; lastSave = sim.time;
    $('seed').value = sim.seed; $('hard-dig').checked = sim.hardDig;
    $('scenario').value = ''; focusView(); updateUI();
  }
  try {
    const saved = localStorage.getItem(KEY);
    sim = saved ? Simulation.restore(JSON.parse(saved)) : new Simulation(24014);
    if (saved) { message('前回の試作を再開しました。'); $('scenario').value = ''; }
  } catch (e) { sim = new Simulation(24014); message('保存データを読み込めませんでした。保存から再開・書き出し操作は保留しています。'); paused = true; }
  let invalidStored = paused;
  function resize() {
    const r = canvas.getBoundingClientRect(); cam.width = r.width; cam.height = r.height; cam.dpr = Math.min(3, window.devicePixelRatio || 1);
    canvas.width = Math.round(r.width * cam.dpr); canvas.height = Math.round(r.height * cam.dpr);
    cam.scale = Math.min(r.width / W, r.height / H) * cam.zoom;
    render();
  }
  function fit() {
    cam.x = W / 2; cam.y = H / 2; cam.zoom = .95;
    cam.scale = Math.min(cam.width / W, cam.height / H) * cam.zoom;
  }
  function focusView() {
    cam.x = W / 2; cam.y = 33; cam.zoom = cam.width < 600 ? 1.5 : 1.35;
    cam.scale = Math.min(cam.width / W, cam.height / H) * cam.zoom;
  }
  function screen(x, y) { return { x: (x - cam.x) * cam.scale + cam.width / 2, y: (y - cam.y) * cam.scale + cam.height / 2 }; }
  function world(x, y) { return { x: (x - cam.width / 2) / cam.scale + cam.x, y: (y - cam.height / 2) / cam.scale + cam.y }; }
  function zoom(factor, x = cam.width / 2, y = cam.height / 2) {
    const old = world(x, y); cam.zoom = Math.max(.65, Math.min(4.5, cam.zoom * factor));
    cam.scale = Math.min(cam.width / W, cam.height / H) * cam.zoom;
    const next = world(x, y); cam.x += old.x - next.x; cam.y += old.y - next.y;
  }
  function soilColor(type,g){
    const gx=g%FW,gy=Math.floor(g/FW),variation=hash(gx,gy,sim.seed)%9,depth=Math.min(12,Math.floor(gy/GRID/8));
    const base=type===2?[115,94,72]:[141,122,99];
    return `rgb(${base[0]+variation-depth},${base[1]+variation-depth},${base[2]+variation-depth})`;
  }
  function rebuildEarth() {
    const c=earth;c.clearRect(0,0,FW,FH);
    for(let y=0;y<SURFACE;y++)for(let x=0;x<W;x++){
      const v=hash(x,y,sim.seed);
      c.fillStyle=y>SURFACE-3?'#c5c4ad':'#dcded5';c.fillRect(x*GRID,y*GRID,GRID,GRID);
      if(y===SURFACE-1&&v%4===0){c.fillStyle='#84886a';c.fillRect(x*GRID+GRID/8,y*GRID+GRID*3/8,GRID/8,GRID*5/8);}
    }
    for(let gy=SURFACE*GRID;gy<FH;gy++)for(let gx=0;gx<FW;gx++){
      const i=gy*FW+gx,type=sim.grains[i];if(!type)continue;
      const v=hash(gx,gy,sim.seed),depth=Math.min(12,Math.floor(gy/GRID/8)),variation=v%9;
      if(type===3){
        const light=(sim.grains[i-FW]!==3?10:0)+(gx&&sim.grains[i-1]!==3?5:0)-(sim.grains[i+FW]!==3?10:0);
        c.fillStyle=`rgb(${86+variation+light-depth/2},${84+variation+light-depth/2},${76+variation+light-depth/2})`;
      }else{
        c.fillStyle=soilColor(type,i);
      }
      c.fillRect(gx,gy,1,1);
    }
    earthSimulation=sim;
  }
  function rebuildGround() {
    if(earthSimulation!==sim)rebuildEarth();
    const c=ground;c.clearRect(0,0,FW,FH);c.imageSmoothingEnabled=false;c.drawImage(earthLayer,0,0,FW,FH);
    floor.clearRect(0,0,FW,FH);
    for(let gy=SURFACE*GRID;gy<FH;gy++)for(let gx=0;gx<FW;gx++){
      const i=gy*FW+gx;
      if(!sim.grains[i]){
        const rid=sim.grainRoom[i];
        floor.fillStyle=rid===1?'#e2d1a9':rid===2?'#e5d7bc':rid===3?'#dcccab':'#d7c7ab';
        floor.fillRect(gx,gy,1,1);
      }else if((gx&&!sim.grains[i-1])||(gx<FW-1&&!sim.grains[i+1])||!sim.grains[i-FW]||(gy<FH-1&&!sim.grains[i+FW])){
        c.fillStyle='#46372133';c.fillRect(gx,gy,1,1);
      }
    }
    c.drawImage(floorLayer,0,0,FW,FH);
    cachedRevision=sim.revision;
  }
  function drawBody(b){
    const shape=LivingNest.Physics.SHAPES[b.kind],p=screen(b.x-shape.hx,b.y-shape.hy);
    if(p.x<-8||p.x>cam.width+8||p.y<-8||p.y>cam.height+8)return;
    if(b.kind==='soil'){
      ctx.fillStyle=soilColor(b.material,b.source>=0?b.source:GRAIN.at(b.x,b.y));ctx.fillRect(p.x,p.y,GRAIN.size*cam.scale,GRAIN.size*cam.scale);return;
    }
    const pattern=b.kind==='egg'?['00111100','01111110','11111111','01111110','00111100']:['001100','011110','111111','111111','011110','001100'];
    const dot=shape.hx*2/pattern[0].length*cam.scale;
    for(let y=0;y<pattern.length;y++)for(let x=0;x<pattern[y].length;x++)if(pattern[y][x]==='1'){
      ctx.fillStyle=b.kind==='egg'?(y<2?'#fff3d7':y<4?'#e8d5ae':'#b8a581'):(y<2?'#9b843b':y<4?'#7b622e':'#574626');
      ctx.fillRect(p.x+x*dot,p.y+y*dot,dot,dot);
    }
  }
  const pixelAntCache = new Map();
  function rememberAntFrame(key,frame) {
    if(pixelAntCache.size>=256)pixelAntCache.delete(pixelAntCache.keys().next().value);
    pixelAntCache.set(key,frame);return frame;
  }
  function antFrame(angle, step, queen = false, action = 'walk') {
    const direction = (Math.round(renderAngle(angle) / (Math.PI / 8)) + 16) % 16;
    const key = `${direction}:${step}:${+queen}:${action}`;
    if (pixelAntCache.has(key)) return pixelAntCache.get(key);
    const frame = document.createElement('canvas'); frame.width = frame.height = 32;
    const c = frame.getContext('2d'), pivot = 16, unit = 16, theta = direction * Math.PI / 8;
    const cos = Math.cos(theta), sin = Math.sin(theta);
    const point = (x, y) => ({ x: Math.round(pivot + (x * cos - y * sin) * unit), y: Math.round(pivot + (x * sin + y * cos) * unit) });
    function line(from, to, color) {
      let x = from.x, y = from.y;
      const dx = Math.abs(to.x - x), dy = Math.abs(to.y - y), sx = x < to.x ? 1 : -1, sy = y < to.y ? 1 : -1;
      let error = dx - dy; c.fillStyle = color;
      while (true) {
        c.fillRect(x, y, 1, 1); if (x === to.x && y === to.y) break;
        const twice = error * 2;
        if (twice > -dy) { error -= dy; x += sx; }
        if (twice < dx) { error += dx; y += sy; }
      }
    }
    const legs = queen ? '#493325' : '#3a3025', gait = [0,.045,0,-.045][step%4];
    for (let k = -1; k <= 1; k++) for (const side of [-1, 1]) {
      const sway = gait * side * (k === 0 ? -1 : 1), reach=(action==='dig'||action==='gather')&&k===1?.055:0,knee = point(k * .15 + sway*.5+reach, side * .15);
      line(point(k * .14, side * .08), knee, legs); line(knee, point(k * .18 + sway+reach, side * (action==='carry'?.20:.22)), legs);
    }
    for (const side of [-1, 1]) {
      const twitch=(action==='idle'&&step===1||action==='dig'&&step%2? .025:0),knee = point(.40, side * (.105+twitch)); line(point(.33, side * .05), knee, legs); line(knee, point(.44, side * .07), legs);
    }
    for (let py = 3; py < 29; py++) for (let px = 3; px < 29; px++) {
      // Whole pixel squares stay inside the physical body, including the 16 facings.
      const inside = ANT_BODY.some(([cx, rx, ry]) => [[0, 0], [1, 0], [0, 1], [1, 1]].every(([ox, oy]) => {
        const wx = (px + ox - pivot) / unit, wy = (py + oy - pivot) / unit;
        const bx = wx * cos + wy * sin, by = -wx * sin + wy * cos;
        return ((bx - cx) / rx) ** 2 + (by / ry) ** 2 <= 1;
      }));
      if(!inside)continue;
      const wx=(px+.5-pivot)/unit,wy=(py+.5-pivot)/unit,bx=wx*cos+wy*sin,by=-wx*sin+wy*cos,gx=Math.floor(bx*unit),gy=Math.floor(by*unit);
      // Small authored pixel clusters keep the waist and head readable at the
      // game's normal scale. The physical body still clips every pixel square.
      const abdomen=gx>=-7&&gx<=-2&&gy>=-2&&gy<=1&&(gy===-1||gy===0||gx>=-6&&gx<=-3),waist=gx>=-1&&gx<=1&&gy>=-1&&gy<=0,head=gx>=2&&gx<=5&&gy>=-2&&gy<=1&&(gy===-1||gy===0||gx>=3&&gx<=4);
      if(!abdomen&&!waist&&!head)continue;
      const edge=gy===-2||gy===1||gx===-7;
      c.fillStyle=edge?'#251e19':abdomen?(queen?'#68452f':'#51402c'):waist?'#453326':queen?'#81583a':'#71543a';
      if(abdomen&&gy===-1&&gx>=-5&&gx<=-3)c.fillStyle=queen?'#a27a4c':'#8b714b';
      if(head&&gx===4&&gy===-1)c.fillStyle='#181714';
      c.fillRect(px,py,1,1);
    }
    return rememberAntFrame(key,frame);
  }
  function antShape(c, x, y, size, angle, phase, queen = false, action = 'walk') {
    const step = Math.floor(Math.abs(phase)) % 4, frame = antFrame(angle, step, queen,action);
    c.save(); c.imageSmoothingEnabled = false;
    c.drawImage(frame, x - size, y - size, size * 2, size * 2); c.restore();
  }
  // Side art uses the actual surface and the same body anchor / heading as
  // the carried objects. It never moves ants or cargo to decorate the view.
  function surfaceFloor(x) {
    if(x<0||x>=W)return null;
    const gx=Math.floor(x*GRID);
    for(let gy=0;gy<SURFACE*GRID;gy++)if(sim.physics.soilCells.has(gy*FW+gx))return gy/GRID;
    return sim.soilAt(x,SURFACE+.01)?SURFACE:null;
  }
  function antView(ant) {
    return Math.floor(ant.cell/W)<SURFACE&&surfaceFloor(ant.x)!==null?'surface':'nest';
  }
  function surfaceAntFrame(ant,step,action='walk') {
    const direction=(Math.round(renderAngle(ant.angle)/(Math.PI/8))+16)%16;
    const facing=Math.cos(direction*Math.PI/8)<0?-1:1;
    const theta=direction*Math.PI/8-(facing<0?Math.PI:0),cos=Math.cos(theta),sin=Math.sin(theta),unit=16,pivot=16;
    const point=(x,y)=>({x:Math.round(pivot+(x*facing*cos-y*sin)*unit),y:Math.round(pivot+(x*facing*sin+y*cos)*unit)});
    const gait=[0,.045,0,-.045][step%4],legs=[];
    for(const far of [true,false])for(let k=-1;k<=1;k++){
      const sway=gait*(k===0?-1:1)*(far?-1:1),hip=point(k*.11,.20),knee=point(k*.16+sway*.5,.32);
      const foot=point(k*.22+sway,.44),wx=ant.x+(foot.x-pivot)/unit*ANT_SIZE,floor=surfaceFloor(wx);
      if(floor!==null)foot.y=Math.round(pivot+(floor-ant.y)/ANT_SIZE*unit);
      // A leg crossing an edge lifts instead of stretching down a tall step.
      const dx=foot.x-hip.x,dy=foot.y-hip.y,length=Math.hypot(dx,dy);
      if(length>5){foot.x=Math.round(hip.x+dx/length*5);foot.y=Math.round(hip.y+dy/length*5);}
      legs.push({hip,knee,foot,far});
    }
    const key=`surface:${direction}:${step}:${action}:${legs.map(l=>l.foot.x+','+l.foot.y).join(';')}`;
    if(pixelAntCache.has(key))return pixelAntCache.get(key);
    const frame=document.createElement('canvas');frame.width=frame.height=32;const c=frame.getContext('2d');
    function line(a,b,color){
      let x=a.x,y=a.y,dx=Math.abs(b.x-x),dy=Math.abs(b.y-y),sx=x<b.x?1:-1,sy=y<b.y?1:-1,error=dx-dy;c.fillStyle=color;
      while(true){c.fillRect(x,y,1,1);if(x===b.x&&y===b.y)break;const twice=error*2;if(twice>-dy){error-=dy;x+=sx;}if(twice<dx){error+=dx;y+=sy;}}
    }
    for(const l of legs){const color=l.far?'#665a48':'#322c25';line(l.hip,l.knee,color);line(l.knee,l.foot,color);}
    for(const offset of [0,.045]){const knee=point(.37,-.105+offset+(action==='idle'&&step===1?-.02:0));line(point(.32,-.04+offset),knee,'#3a3025');line(knee,point(.41,-.08+offset),'#3a3025');}
    line(point(.065,.11),point(.19,.055),'#251e19');
    const drop=action==='unload'&&step%2?.035:0,body=[[-.25,.15,.24,.16],[0,.15,.14,.12],[.24,.025+drop,.16,.14]];
    for(let py=2;py<30;py++)for(let px=2;px<30;px++)if(body.some(([cx,cy,rx,ry])=>[[0,0],[1,0],[0,1],[1,1]].every(([ox,oy])=>{
      const wx=(px+ox-pivot)/unit,wy=(py+oy-pivot)/unit,bx=(wx*cos+wy*sin)*facing,by=-wx*sin+wy*cos;
      return ((bx-cx)/rx)**2+((by-cy)/ry)**2<=1;
    }))){const wx=(px+.5-pivot)/unit,wy=(py+.5-pivot)/unit,bx=(wx*cos+wy*sin)*facing,by=-wx*sin+wy*cos;
      c.fillStyle=by>.22?'#251e19':bx<-.10?'#51402c':bx>.13?'#71543a':'#453326';if(bx<-.15&&by<.12)c.fillStyle='#8b714b';c.fillRect(px,py,1,1);
    }
    const eye=point(.29,.005+drop);c.fillStyle='#181714';c.fillRect(eye.x,eye.y,1,1);
    return rememberAntFrame(key,frame);
  }
  function drawWorker(ant,reduced) {
    const p=screen(ant.x,ant.y),size=cam.scale*ANT_SIZE,job=sim.jobs.find(j=>j.id===ant.job),action=ant.task==='dig'?(job?.pickup?'gather':'dig'):ant.task==='unload'?'unload':sim.carriedKind(ant)?'carry':ant.path.length&&!ant.waitingFor?'walk':'idle',phase=reduced?0:action==='dig'?sim.digMotion(ant):action==='idle'?((sim.time+ant.id*.71)%7<.6?1:0):action==='gather'||action==='unload'?sim.time*6:ant.walked*3;
    if(antView(ant)==='nest'){antShape(ctx,p.x,p.y,size,ant.angle,phase,false,action);return;}
    const step=Math.floor(Math.abs(phase))%4,frame=surfaceAntFrame(ant,step,action);
    ctx.save();ctx.imageSmoothingEnabled=false;ctx.drawImage(frame,p.x-size,p.y-size,size*2,size*2);ctx.restore();
  }
  function render() {
    if (!cam.width || !sim) return;
    if (cachedRevision !== sim.revision) rebuildGround();
    ctx.setTransform(cam.dpr, 0, 0, cam.dpr, 0, 0); ctx.fillStyle = '#b4a48b'; ctx.fillRect(0, 0, cam.width, cam.height);
    ctx.imageSmoothingEnabled = false;
    const origin = screen(0, 0); ctx.drawImage(layer, origin.x, origin.y, W * cam.scale, H * cam.scale);
    for(const b of sim.physics.bodies)if(!b.carrier)drawBody(b);
    const focus = selected?.kind === 'ant' ? sim.ants.find(a => a.id === selected.id) : null;
    if (focus?.path.length) {
      ctx.strokeStyle = '#f4e6bfa6'; ctx.lineWidth = 1.5; ctx.beginPath(); const start = screen(focus.x, focus.y); ctx.moveTo(start.x, start.y);
      for (const i of focus.path.slice(focus.next)) { const p = (typeof i==='object'?i:sim.walkPoint(i)), v = screen(p.x, p.y); ctx.lineTo(v.x, v.y); } ctx.stroke();
    }
    const queen = screen(48, 24); antShape(ctx, queen.x, queen.y, cam.scale * 6.4, -.14, 0, true);
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    for (const a of sim.ants) {
      const s = screen(a.x, a.y);
      if (s.x < -10 || s.x > cam.width + 10 || s.y < -10 || s.y > cam.height + 10) continue;
      drawWorker(a,reduced);
      if (a.task === 'dig') {
        const job = sim.jobs.find(j => j.id === a.job), g = job.grains[job.cursor];
        if(g!==undefined&&job.pickup===null){const p=GRAIN.origin(g),at=screen(p.x,p.y);ctx.strokeStyle='#ead9a7';ctx.lineWidth=Math.max(.5,cam.scale*GRAIN.size*.12);ctx.strokeRect(at.x,at.y,GRAIN.size*cam.scale,GRAIN.size*cam.scale);}
      }
    }
    for(const b of sim.physics.bodies)if(b.carrier)drawBody(b);
    if (selected) {
      ctx.strokeStyle = '#fff7de'; ctx.lineWidth = 1;
      if (selected.kind === 'ant' && focus) { const s = screen(focus.x,focus.y); ctx.beginPath(); ctx.arc(s.x,s.y,Math.max(7,cam.scale),0,Math.PI*2); ctx.stroke(); }
      else if(selected.kind==='body'){const b=sim.physics.byId.get(selected.id);if(b){const p=screen(b.x,b.y);ctx.strokeRect(p.x-5,p.y-5,10,10);}}
      else if (selected.kind === 'cell') { const p=GRAIN.origin(selected.grain),s=screen(p.x,p.y);ctx.strokeRect(s.x,s.y,cam.scale*GRAIN.size,cam.scale*GRAIN.size); }
    }
    for (const r of sim.rooms.slice(1)) {
      const roomCells = sim.cells(r.id);if(!roomCells.length)continue;const top = Math.min(...roomCells.map(i => Math.floor(i / W)));
      const p = screen(r.x, top - 1.3);
      if (p.y < 10 || p.y > cam.height - 38 || p.x < 28 || p.x > cam.width - 28) continue;
      ctx.font = '12px "Yu Gothic UI",Meiryo,sans-serif'; ctx.textAlign = 'center';
      const width = ctx.measureText(names[r.id]).width;
      ctx.fillStyle = '#3a3024c9'; ctx.fillRect(p.x - width / 2 - 5, p.y - 13, width + 10, 19);
      ctx.fillStyle = '#f2eee3'; ctx.fillText(names[r.id], p.x, p.y);
    }
    const entrance = screen(sim.entrance.x, 4.5), dump = xy(sim.drop), above = screen(dump.x + 2, 3);
    ctx.font = '11px "Yu Gothic UI",Meiryo,sans-serif'; ctx.fillStyle = '#5c554a'; ctx.textAlign = 'center';
    if (entrance.y > 18) ctx.fillText('入口', entrance.x, entrance.y);
    if (above.y > 18) ctx.fillText('土捨て場', above.x, above.y);
  }
  function selectionUI() {
    const el = $('selection'); el.replaceChildren();
    function text(content, tag = 'div', cls) { const n = document.createElement(tag); n.textContent = content; if (cls) n.className = cls; el.append(n); return n; }
    if (!selected) { text('アリや物を選べます。「つまむ」で土・卵・餌を動かせます。'); return; }
    if (selected.kind === 'ant') {
      const a = sim.ants.find(a => a.id === selected.id);
      text(`アリ ${String(a.id).padStart(2, '0')}`, 'b'); text(a.itemTask?(a.itemTask.phase==='fetch'?'卵・餌を取りに行く':'卵・餌を部屋へ運搬'):tasks[a.task], 'div', 'line');
      const j = sim.jobs.find(j => j.id === a.job), carried = a.cargo ? j.grains.length : a.task === 'dig' ? j.cursor : 0;
      text(`荷物：${a.itemTask?.phase==='store'?(sim.physics.byId.get(a.itemTask.body).kind==='egg'?'卵 1個':'餌 1個'):carried ? '掘った砂 ' + carried + '粒' : 'なし'}`, 'div', 'line');
      if (j) text(`目的：${j.build?(j.rid?names[j.build]+'を掘る':names[j.build]+'への通路を掘る'):j.rid ? names[j.rid] + 'を広げる' : '通路の混雑を減らす'}`, 'div', 'line');
    } else if(selected.kind==='body'){
      const b=sim.physics.byId.get(selected.id);if(!b){selected=null;return;}
      text(({soil:'砂粒',egg:'卵・幼虫',food:'餌'})[b.kind]+' '+b.id,'b');
      text(b.carrier?`アリ ${b.carrier} が運搬中`:b.state==='incoming'?'部屋への運搬待ち':b.rest>=30?'床に静止': '落下・移動中','div','line');
      text(`位置：${b.x.toFixed(2)}, ${b.y.toFixed(2)}`,'div','line');
    } else {
      const g = selected.grain, type = sim.grains[g];
      text(type ? ['', '土', '硬い土', '岩'][type] : names[sim.grainRoom[g]], 'b');
      text(`位置：${(g%FW)/GRID}, ${Math.floor(g/FW)/GRID}`, 'div', 'line');
      const j = sim.jobs.find(j => j.grains.includes(g));
      text(j ? `アリ ${j.ant} が${tasks[j.phase]}` : sim.grainPending[g] ? '土の運搬が済むと使えます' : type === 2 && !sim.hardDig ? '現在のアリには掘れません' : type === 3 ? '掘れない岩です' : type ? 'まだ掘っていない土です' : '通れる空間です', 'div', 'line');
    }
  }
  function updateUI() {
    const s = sim.status();
    for (const kind of ['larvae', 'food']) {
      $(kind).textContent = sim.demands[kind]; $(kind + '-cap').textContent = s.capacity[kind];
      $(kind + '-need').textContent = s.shortages[kind] ? `${s.shortages[kind]}${kind === 'larvae' ? '匹分' : '分'}不足` : '十分な広さ';
      const meter = $(kind + '-meter'); meter.classList.toggle('over', !!s.shortages[kind]); meter.firstElementChild.style.width = `${Math.min(100, sim.demands[kind] / Math.max(1, s.capacity[kind]) * 100)}%`;
    }
    let cause;
    if (s.blocked.length) cause = `${s.blocked.join('と')}の周りは硬い土や岩です。掘削設定を確認してください。`;
    else if(s.building.length)cause=s.building.map(b=>b.stage==='passage'?b.name+'への通路を掘っています':b.name+'を掘り広げています').join('。')+'。';
    else if (s.shortages.larvae && s.shortages.food) cause = '育児と貯蔵の空間が不足しています。優先度に応じて壁を掘ります。';
    else if (s.shortages.larvae) cause = '育児室が手狭です。壁を削り、土を運び出して広げています。';
    else if (s.shortages.food) cause = '食料庫が手狭です。壁を削り、土を運び出して広げています。';
    else if (s.jobs) cause = '必要な分の作業を仕上げています。土を運び出したら休憩します。';
    else if (sim.ants.some(a=>a.itemTask)) cause = '卵や食料を部屋へ運び入れています。';
    else cause = 'いまは十分な広さがあります。アリは掘削を終えて休憩しています。';
    if ($('cause').textContent !== cause) $('cause').textContent = cause;
    $('ant-count').textContent = s.ants; $('travel-count').textContent = s.activity.travel;
    $('dig-count').textContent = s.activity.dig; $('haul-count').textContent = s.activity.haul+s.activity.unload;
    $('idle-count').textContent = s.activity.idle; $('delivered').textContent = s.grainDelivered; $('elapsed').textContent = formatTime(sim.time);
    document.querySelectorAll('[data-priority]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.priority === sim.priority)));
    $('play').textContent = paused ? '再開' : '一時停止'; $('play').setAttribute('aria-pressed', String(paused));
    selectionUI();
    const journal = $('journal'), texts = sim.events.slice(-3).reverse(); journal.replaceChildren();
    for (const e of texts) { const li = document.createElement('li'), t = document.createElement('time'); t.textContent = formatTime(e.time); li.append(t, document.createTextNode(e.text)); journal.append(li); }
  }
  $('play').onclick = () => { paused = !paused; accumulator = 0; updateUI(); };
  $('speed').onchange = () => { speed = +$('speed').value; };
  $('scenario').onchange = () => { sim.scenario($('scenario').value); updateUI(); };
  $('add-larvae').onclick = () => { sim.add('larvae'); updateUI(); };
  $('add-food').onclick = () => { sim.add('food'); updateUI(); };
  document.querySelectorAll('[data-priority]').forEach(b => b.onclick = () => { sim.priority = b.dataset.priority; sim.planAt = sim.time; updateUI(); });
  $('hard-dig').onchange = () => { sim.hardDig = $('hard-dig').checked; sim.planAt = sim.time; updateUI(); };
  $('object-mode').onclick=()=>{objectMode=!objectMode;$('object-mode').setAttribute('aria-pressed',String(objectMode));$('canvas-help').textContent=objectMode?'物をドラッグして離すと落下します':'ドラッグで移動 / ピンチ・ホイールで拡大';};
  $('zoom-in').onclick = () => zoom(1.25); $('zoom-out').onclick = () => zoom(1 / 1.25); $('fit').onclick = fit;
  $('save').onclick = () => { invalidStored = false; persist(true); };
  $('restore').onclick = () => {
    try { const data = localStorage.getItem(KEY); if (!data) { message('保存データはまだありません。'); return; } const next = Simulation.restore(JSON.parse(data)); adopt(next); invalidStored = false; message('保存した地形と仕事を再開しました。'); }
    catch (e) { message('保存データを読み込めませんでした。いまの巣はそのままです。'); }
  };
  $('export').onclick = () => {
    const blob = new Blob([JSON.stringify(sim.dump())], { type: 'application/json' }), url = URL.createObjectURL(blob), a = document.createElement('a');
    a.href = url; a.download = `living-nest-14-${sim.seed}.json`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); message('いまの状態を書き出しました。');
  };
  $('import').onchange = async () => {
    const f = $('import').files[0]; if (!f) return;
    try { if (f.size > 16000000) throw new Error('large'); const next = Simulation.restore(JSON.parse(await f.text())); adopt(next); invalidStored = false; persist(); message('保存データを開きました。'); }
    catch (e) { message('有効な保存データではありません。いまの巣はそのままです。'); }
    $('import').value = '';
  };
  $('reset').onclick = () => {
    const seed = Number($('seed').value);
    if (!Number.isInteger(seed) || seed < 1 || seed > 4294967295) { message('地形の種は1〜4294967295の整数です。'); return; }
    reset(seed); invalidStored = false; persist(); message('この地形で最初から始めました。');
  };
  $('new-seed').onclick = () => { reset(crypto.getRandomValues(new Uint32Array(1))[0] || 1); invalidStored = false; persist(); message('別の地形で始めました。'); };
  canvas.addEventListener('wheel', e => { e.preventDefault(); const r = canvas.getBoundingClientRect(); zoom(Math.exp(-e.deltaY * .001), e.clientX - r.left, e.clientY - r.top); }, { passive: false });
  canvas.addEventListener('pointerdown', e => {
    canvas.setPointerCapture(e.pointerId); const r = canvas.getBoundingClientRect(); pointers.set(e.pointerId, { x: e.clientX - r.left, y: e.clientY - r.top });
    if(pointers.size>1)sim.physics.drop();
    gesture = { start: [...pointers.values()].map(p => ({ ...p })), cam: { ...cam }, moved: false, at: performance.now() };
    if(objectMode&&pointers.size===1){const p=pointers.get(e.pointerId),w=world(p.x,p.y),b=sim.physics.hit(w.x,w.y,Math.max(.4,9/cam.scale));if(b){sim.physics.grab(b.id,w.x,w.y);gesture.body=b.id;selected={kind:'body',id:b.id};}}
  });
  canvas.addEventListener('pointermove', e => {
    if (!pointers.has(e.pointerId)) return; const r = canvas.getBoundingClientRect(); pointers.set(e.pointerId, { x: e.clientX - r.left, y: e.clientY - r.top });
    const ps = [...pointers.values()]; if (!gesture) return;
    if(gesture.body&&ps.length===1){const w=world(ps[0].x,ps[0].y);if(sim.physics.drag)Object.assign(sim.physics.drag,w);gesture.moved=true;return;}
    if (ps.length === 2 && gesture.start.length === 2) {
      const base = Math.hypot(gesture.start[0].x - gesture.start[1].x, gesture.start[0].y - gesture.start[1].y), now = Math.hypot(ps[0].x - ps[1].x, ps[0].y - ps[1].y);
      Object.assign(cam, gesture.cam); const mid = { x: (ps[0].x + ps[1].x) / 2, y: (ps[0].y + ps[1].y) / 2 }; zoom(now / Math.max(1, base), mid.x, mid.y); gesture.moved = true;
    } else if (ps.length === 1) {
      const dx = ps[0].x - gesture.start[0].x, dy = ps[0].y - gesture.start[0].y;
      cam.x = gesture.cam.x - dx / cam.scale; cam.y = gesture.cam.y - dy / cam.scale; if (Math.hypot(dx, dy) > 5) gesture.moved = true;
    }
  });
  function pointerEnd(e) {
    const p = pointers.get(e.pointerId); if (!p) return;
    const dragged=gesture?.body;if(dragged)sim.physics.drop();
    if (!dragged&&gesture && !gesture.moved && pointers.size === 1 && e.type !== 'pointercancel') {
      const w = world(p.x, p.y), nearest = sim.ants.slice().sort((a, b) => Math.hypot(a.x - w.x, a.y - w.y) - Math.hypot(b.x - w.x, b.y - w.y))[0];
      const object=sim.physics.hit(w.x,w.y,Math.max(.3,4/cam.scale));
      if(object)selected={kind:'body',id:object.id};
      else if (Math.hypot(nearest.x - w.x, nearest.y - w.y) < Math.max(1, 9 / cam.scale)) selected = { kind: 'ant', id: nearest.id };
      else if (w.x >= 0 && w.x < W && w.y >= 0 && w.y < H) selected = { kind: 'cell', cell: idx(Math.floor(w.x), Math.floor(w.y)), grain: GRAIN.at(w.x,w.y) };
      else selected = null;
      selectionUI();
    }
    pointers.delete(e.pointerId); gesture = null;
    if (pointers.size) gesture = { start: [...pointers.values()].map(p => ({ ...p })), cam: { ...cam }, moved: true, at: performance.now() };
  }
  canvas.addEventListener('pointerup', pointerEnd); canvas.addEventListener('pointercancel', pointerEnd);
  canvas.addEventListener('keydown', e => {
    const actions = { '+': () => zoom(1.25), '=': () => zoom(1.25), '-': () => zoom(1 / 1.25), '0': fit,
      ArrowLeft: () => cam.x -= 4, ArrowRight: () => cam.x += 4, ArrowUp: () => cam.y -= 4, ArrowDown: () => cam.y += 4,
      Escape: () => { selected = null; updateUI(); } };
    if (actions[e.key]) { e.preventDefault(); actions[e.key](); }
  });
  window.addEventListener('resize', resize);
  document.addEventListener('visibilitychange', () => { last = performance.now(); accumulator = 0; if (document.hidden && !invalidStored && !storageBlocked) persist(); });
  window.addEventListener('pagehide', () => { if (!invalidStored && !storageBlocked) persist(); });
  function frame(now) {
    const elapsed = Math.min(.1, Math.max(0, (now - last) / 1000)); last = now;
    if (!paused && !document.hidden) {
      accumulator += elapsed * speed;
      let count = 0;
      while (accumulator >= STEP && count++ < 60) { sim.step(STEP); accumulator -= STEP; }
      if (!invalidStored && !storageBlocked && sim.time - lastSave >= 30) persist();
    }
    if (now - lastUI > 220) { updateUI(); lastUI = now; }
    render(); requestAnimationFrame(frame);
  }
  $('seed').value = sim.seed; $('hard-dig').checked = sim.hardDig;
  resize(); focusView(); updateUI(); render(); requestAnimationFrame(frame);
  // The prototype has a public inspection API. The production HTML is never instrumented.
  window.nestPrototype = { get sim() { return sim; }, get paused() { return paused; }, get camera() { return { ...cam }; },
    pause(value = true) { paused = value; accumulator = 0; updateUI(); }, advance(seconds) { sim.advance(seconds); updateUI(); render(); },
    reset, render, screen, dump: () => sim.dump(), load(pack) { adopt(Simulation.restore(pack)); render(); }, selectAnt(id) { selected = { kind: 'ant', id }; updateUI(); render(); } };
})();
