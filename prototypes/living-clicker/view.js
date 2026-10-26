(function () {
  'use strict';
  const { Simulation, W, H, SIZE, SURFACE, KEY, STEP, PICKUP_SECONDS, GRAIN, GRID, FW, FH, ANT_SIZE, ANT_BODY, renderAngle, names, xy, idx, hash } = ColonyGame;
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
  let visibleGrains=null;
  let cachedRevision = -1, selected = null, pointers = new Map(), gesture = null, storageBlocked = false;
  const cam = { x: W / 2, y: H / 2, zoom: 1, scale: 1, width: 0, height: 0, dpr: 1 };
  const tasks = { idle: '休憩・巣内の移動', travel: '掘削面へ移動', dig: '土を掘削', haul: '土を地上へ運搬', unload: '地上で土を下ろす' };
  const formatTime = t => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;
  function message(text) { $('message').textContent = text; }
  function checkpoint(){const bytes=invalidStored?localStorage.getItem(KEY):JSON.stringify(sim.dump());if(bytes)localStorage.setItem(KEY+'_recovery',bytes);}
  function persist(announce = false) {
    if(invalidStored){message('保存データを開けないため、上書きを止めています。');return false;}
    sim.progress.speed=speed;
    try { localStorage.setItem(KEY, JSON.stringify(sim.dump())); storageBlocked = false; lastSave = sim.time; if (announce) message('いまの地形とアリの仕事を保存しました。'); return true; }
    catch (e) { storageBlocked = true; message('保存できませんでした。書き出して保管できます。'); return false; }
  }
  function reset(seed) {
    const candidate=new Simulation(seed);checkpoint();sim = candidate; selected = null; cachedRevision = -1; accumulator = 0; lastSave = sim.time;
    $('seed').value = seed;  focusView(); updateUI();
  }
  function adopt(candidate) {
    checkpoint();sim = candidate; selected = null; cachedRevision = -1; accumulator = 0; lastSave = sim.time;
    speed=sim.progress.speed;$('speed').value=String(speed);
    $('seed').value = sim.seed; 
    focusView(); updateUI();
  }
  try {
    const saved = localStorage.getItem(KEY);
    sim = saved ? Simulation.restore(JSON.parse(saved)) : new Simulation(24014);
    if (saved) { message('前回の巣を再開しました。'); }
  } catch (e) { sim = new Simulation(24014); message('保存データを開けませんでした。別の保存を開くか、新しい巣を始めてください。'); paused = true; }
  let invalidStored = paused;
  speed=sim.progress.speed;$('speed').value=String(speed);
  function resize() {
    const r = canvas.getBoundingClientRect(); cam.width = r.width; cam.height = r.height; cam.dpr = Math.min(3, window.devicePixelRatio || 1);
    canvas.width = Math.round(r.width * cam.dpr); canvas.height = Math.round(r.height * cam.dpr);
    cam.scale = Math.min(r.width / W, r.height / H) * cam.zoom;
    render();
  }
  function fit() {
    const points=[...sim.ants,...sim.physics.bodies.filter(b=>b.kind!=='soil'||!b.carrier&&b.y<SURFACE)];
    for(let g=0;g<sim.grains.length;g++)if(!sim.grains[g]&&sim.grainRoom[g])points.push(GRAIN.center(g));
    const minX=Math.max(0,Math.min(...points.map(p=>p.x))-4),maxX=Math.min(W,Math.max(...points.map(p=>p.x),sim.entrance.x+9)+4),minY=0,maxY=Math.max(34,...points.map(p=>p.y))+4;
    cam.x=(minX+maxX)/2;cam.scale=Math.min(cam.width/(maxX-minX),cam.height/(maxY-minY))*.92;cam.y=Math.max((minY+maxY)/2,cam.height/(2*cam.scale));cam.zoom=cam.scale/Math.min(cam.width/W,cam.height/H);
  }
  function focusView() {
    cam.x=46;cam.y=21.5;cam.scale=cam.width<600?Math.min(15,cam.width/25):Math.min(24,cam.height/31);cam.zoom=cam.scale/Math.min(cam.width/W,cam.height/H);
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
    const light=new Uint8Array(FW*FH),queue=new Int32Array(FW*FH);let start=0,end=0;
    for(let g=SURFACE*GRID*FW;g<light.length;g++)if(!sim.grains[g]){light[g]=13;queue[end++]=g;}
    while(start<end){const g=queue[start++],value=light[g]-1;if(value<=0)continue;for(const n of GRAIN.neighbors(g))if(light[n]<value){light[n]=value;queue[end++]=n;}}
    visibleGrains=light;
    // Hidden rock has precisely the surrounding layer's soil pixels.
    for(let gy=SURFACE*GRID;gy<FH;gy++)for(let gx=0;gx<FW;gx++){
      const g=gy*FW+gx;if(!sim.grains[g])continue;
      if(!light[g]){const p=GRAIN.center(g),type=(sim.layerAt(p.x,p.y)-1)%2?2:1;c.fillStyle=soilColor(type,g);c.fillRect(gx,gy,1,1);}
      c.fillStyle='rgba(21,20,17,'+(light[g]?(.6*(1-light[g]/13)):.68)+')';c.fillRect(gx,gy,1,1);
    }
    for(let gy=SURFACE*GRID;gy<FH;gy++)for(let gx=0;gx<FW;gx++){
      const i=gy*FW+gx;
      if(!sim.grains[i]){
        const rid=sim.grainRoom[i];
        floor.fillStyle=rid===1?'#e2d1a9':rid>=2?(sim.roomKind(rid)==='egg'?'#e5d7bc':'#dcccab'):'#d7c7ab';
        floor.fillRect(gx,gy,1,1);
      }else if((gx&&!sim.grains[i-1])||(gx<FW-1&&!sim.grains[i+1])||!sim.grains[i-FW]||(gy<FH-1&&!sim.grains[i+FW])){
        c.fillStyle='#46372133';c.fillRect(gx,gy,1,1);
      }
    }
    c.drawImage(floorLayer,0,0,FW,FH);
    cachedRevision=sim.revision;
  }
  function drawBody(b){
    const shape=ColonyGame.Physics.SHAPES[b.kind],p=screen(b.x-shape.hx,b.y-shape.hy);
    if(p.x<-8||p.x>cam.width+8||p.y<-8||p.y>cam.height+8)return;
    if(b.kind==='soil'){
      ctx.fillStyle=soilColor(b.material,b.source>=0?b.source:GRAIN.at(b.x,b.y));ctx.fillRect(p.x,p.y,GRAIN.size*cam.scale,GRAIN.size*cam.scale);return;
    }
    const brood=sim.colony.brood.find(e=>e.id===b.id);
    const pattern=b.kind==='egg'?['00111100','01111110','11111111','01111110','00111100']:['001100','011110','111111','111111','011110','001100'];
    const dot=shape.hx*2/pattern[0].length*cam.scale;
    for(let y=0;y<pattern.length;y++)for(let x=0;x<pattern[y].length;x++)if(pattern[y][x]==='1'){
      ctx.fillStyle=b.kind==='egg'?(brood?.stage==='larva'?(x<2?'#bfa76e':y<2?'#f3dda1':'#cdb77e'):brood?.stage==='pupa'?(y<2?'#d6b688':'#98764f'):(y<2?'#fff3d7':y<4?'#e8d5ae':'#b8a581')):(y<2?'#9b843b':y<4?'#7b622e':'#574626');
      ctx.fillRect(p.x+x*dot,p.y+y*dot,dot,dot);
    }
  }
  const pixelAntCache = new Map();
  function rememberAntFrame(key,frame) {
    if(pixelAntCache.size>=256)pixelAntCache.delete(pixelAntCache.keys().next().value);
    pixelAntCache.set(key,frame);return frame;
  }
  // One queen pixel occupies the same world distance as one worker pixel.
  // A larger body gets more pixels, rather than magnifying the worker sprite.
  const QUEEN_DOT=ANT_SIZE/16,QUEEN_PIXELS=128,QUEEN_UNIT=6.4/QUEEN_DOT;
  function queenFrame(phase){
    const key='queen-detail:'+phase;if(pixelAntCache.has(key))return pixelAntCache.get(key);
    const frame=document.createElement('canvas');frame.width=frame.height=QUEEN_PIXELS;
    const c=frame.getContext('2d'),pivot=QUEEN_PIXELS/2,unit=QUEEN_UNIT;
    const point=(x,y)=>({x:Math.round(pivot+x*unit),y:Math.round(pivot+y*unit)});
    function line(a,b,color){
      let x=a.x,y=a.y;const dx=Math.abs(b.x-x),dy=Math.abs(b.y-y),sx=x<b.x?1:-1,sy=y<b.y?1:-1;let error=dx-dy;c.fillStyle=color;
      while(true){c.fillRect(x,y,1,1);if(x===b.x&&y===b.y)break;const twice=error*2;if(twice>-dy){error-=dy;x+=sx;}if(twice<dx){error+=dx;y+=sy;}}
    }
    const legs='#493325',twitch=(phase===1?1:phase===3?-1:0)/unit;
    // Six short articulated legs, attached to the thorax, behind the body.
    for(const side of [-1,1])for(const [hip,knee,foot,reach]of [[-.065,-.14,-.20,.205],[.015,-.015,-.045,.22],[.085,.16,.20,.205]]){
      const sway=twitch*(hip>0?1:-1)*side;
      line(point(hip,side*.055),point(knee+sway,side*.145),legs);
      line(point(knee+sway,side*.145),point(foot+sway,side*reach),legs);
      line(point(foot+sway,side*reach),point(foot+sway+.025,side*(reach-.006)),legs);
    }
    for(const side of [-1,1]){
      const knee=point(.40,side*(.10+twitch));
      line(point(.345,side*.055),knee,legs);line(knee,point(.445,side*(.070+twitch)),legs);
    }
    const parts=[
      {name:'gaster',x:-.28,rx:.205,ry:.156},
      {name:'waist',x:-.085,rx:.045,ry:.039},
      {name:'thorax',x:.025,rx:.125,ry:.113},
      {name:'head',x:.255,rx:.125,ry:.105}
    ];
    const within=(part,x,y)=>((x-part.x)/part.rx)**2+(y/part.ry)**2<=1;
    const physical=(x,y)=>ANT_BODY.some(([cx,rx,ry])=>((x-cx)/rx)**2+(y/ry)**2<=1);
    for(let py=0;py<QUEEN_PIXELS;py++)for(let px=0;px<QUEEN_PIXELS;px++){
      const x=(px+.5-pivot)/unit,y=(py+.5-pivot)/unit,part=parts.findLast(p=>within(p,x,y));
      if(!part||![[0,0],[1,0],[0,1],[1,1]].every(([ox,oy])=>physical((px+ox-pivot)/unit,(py+oy-pivot)/unit)))continue;
      const edge=!within(part,x-1/unit,y)||!within(part,x+1/unit,y)||!within(part,x,y-1/unit)||!within(part,x,y+1/unit);
      let color=edge?'#251e19':y>part.ry*.35?'#4e3727':y<-.025?'#8a6342':'#6e4d32';
      if(part.name==='gaster'&&!edge){
        if(((x+.31)/.105)**2+((y+.045)/.052)**2<1)color='#9c7752';
        // Curved tergite seams follow the abdomen, in a quiet shell shade.
        const seam=x+(y/part.ry)**2*.023;
        if([-.40,-.325,-.25,-.175].some(v=>Math.abs(seam-v)<.48/unit))color=y<-.02?'#755133':'#503727';
      }else if(part.name==='waist'&&!edge)color=y<0?'#946a43':'#553b29';
      else if(part.name==='thorax'&&!edge){
        color=y<-.025?'#a17a52':y>.035?'#5a3f2b':'#815b3b';
        if(Math.abs(x+.025)<.7/unit&&Math.abs(y)<.07)color='#60432c';
        // Small paired wing scars on the queen's enlarged thorax.
        if(((x-.015)/.043)**2+((Math.abs(y)-.070)/.018)**2<1)color='#513928';
      }else if(part.name==='head'&&!edge)color=y<-.02?'#9a744d':y>.04?'#543a28':'#795335';
      c.fillStyle=color;c.fillRect(px,py,1,1);
    }
    for(const side of [-1,1]){
      const eye=point(.278,side*.073);c.fillStyle='#181714';c.fillRect(eye.x,eye.y,2,1);
      line(point(.358,side*.027),point(.394,side*.035),'#39291e');
      line(point(.394,side*.035),point(.395,side*.009),'#39291e');
    }
    return rememberAntFrame(key,frame);
  }
  function drawQueen(c,x,y,scale,reduced){
    const frame=queenFrame(reduced?0:Math.floor(sim.time*1.2)%4),span=QUEEN_PIXELS*QUEEN_DOT*scale;
    c.save();c.imageSmoothingEnabled=false;c.drawImage(frame,x-span/2,y-span/2,span,span);c.restore();
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
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const queen = screen(48, 24); drawQueen(ctx,queen.x,queen.y,cam.scale,reduced);
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
    const forage=screen(17.5,4.5);if(forage.y>18)ctx.fillText('採集場所',forage.x,forage.y);
  }
  const roleNames={forage:'採集係',nurse:'育児係',build:'掘削係'},stageNames={egg:'卵',larva:'幼虫',pupa:'蛹'};
  function selectionUI(){
    const el=$('selection');el.replaceChildren();
    const line=(text,strong=false)=>{const n=document.createElement(strong?'b':'div');n.textContent=text;if(!strong)n.className='line';el.append(n);};
    if(!selected){line('アリ・卵・餌を選ぶと様子が見られます。');return;}
    if(selected.kind==='ant'){
      const a=sim.ants.find(a=>a.id===selected.id);if(!a){selected=null;return;}
      line('アリ '+a.id+' / '+roleNames[a.role],true);
      if(a.itemTask?.purpose==='feed')line(a.itemTask.phase==='fetch'?'給餌する餌を取りに行く':'幼虫へ餌を届ける');
      else if(a.itemTask)line(a.itemTask.phase==='fetch'?(a.role==='forage'?'地表の餌へ向かう':'卵・幼虫を迎えに行く'):'荷物を部屋へ届ける');
      else line(a.job!==null?tasks[a.task]:a.path.length?'巣内を移動':'次の仕事を待つ');
      const bodies=sim.physics.bodies.filter(b=>b.carrier===a.id);line('荷物：'+(bodies.length?bodies[0].kind==='soil'?'砂 '+bodies.length+'粒':bodies[0].kind==='food'?'餌 1個':'卵・幼虫 1個':'なし'));
      if(a.desiredRole!==a.role)line(roleNames[a.desiredRole]+'へ交代予定');
    }else if(selected.kind==='body'){
      const b=sim.physics.byId.get(selected.id);if(!b){selected=null;return;}
      const e=sim.colony.brood.find(e=>e.id===b.id);line(e?stageNames[e.stage]:b.kind==='soil'?'砂粒':'餌',true);
      line(b.carrier?'アリ '+b.carrier+' が運搬中':sim.colony.wild.includes(b.id)?'地表の採集場所':b.rest>=30?'部屋で保管中':'落下・移動中');
      if(e?.stage==='larva')line('給餌 '+e.feeds+' / 2回');
      if(e?.stage==='pupa')line('羽化まで あと約'+Math.max(0,Math.ceil((50-e.age)/(1+sim.colony.upgrades.brood*.2)))+'秒');
    }else{const g=selected.grain,t=sim.grains[g],p=GRAIN.center(g),known=visibleGrains?.[g]>0;line(t?(known?['','土','硬い土','岩'][t]:'第'+sim.layerAt(p.x,p.y)+'層の土'):names[sim.grainRoom[g]],true);line(t?(known&&t===3?'掘れない岩です':sim.layerAt(p.x,p.y)>sim.depthAbility()?'深度研究で掘れるようになります。':'まだ掘っていない場所です。'):'アリが通れる空間です');}
  }
  function updateUI(){
    const s=sim.status();
    for(const [id,value] of Object.entries({'ant-count':s.ants,food:s.food,births:s.births,'egg-count':s.brood.egg,'larva-count':s.brood.larva,'pupa-count':s.brood.pupa,meals:s.meals,harvest:s.harvest,'dig-count':s.activity.dig,'haul-count':s.activity.haul+s.activity.unload,delivered:s.grainDelivered}))$(id).textContent=value;
    $('elapsed').textContent=formatTime(sim.time);
    $('food-note').textContent='保管中 '+s.stock+'個 / 移動中 '+(s.food-s.stock)+'個。幼虫1匹に餌2個。';
    $('queen-progress').style.width=(s.queen*100)+'%';
    $('lay').disabled=!s.canLay;
    $('laying').textContent=sim.colony.laying?'産卵中':'産卵を再開';$('laying').setAttribute('aria-pressed',String(sim.colony.laying));
    $('queen-note').textContent=!sim.colony.laying?'産卵をお休み中':s.ants+sim.colony.brood.length>=sim.populationLimit()?'この区画の定員です':s.food<2?'餌が届くのを待っています':!s.canLay?'いまの卵・幼虫を育てています':'次の卵まで 約'+Math.ceil((1-s.queen)*40/sim.layRate())+'秒';
    for(const r of ColonyGame.ROLES)$('role-'+r).textContent=s.allocation[r];
    document.querySelectorAll('[data-role]').forEach(b=>b.disabled=b.dataset.delta==='-1'?s.allocation[b.dataset.role]===0:s.allocation[b.dataset.role]===s.ants);
    $('role-note').textContent=s.pendingRoles?s.pendingRoles+'匹が、荷物を届けてから交代します。':'＋−で担当を振り替え。荷物は届けてから交代。';
    $('space-note').textContent='育児室 '+s.capacity.larvae+' / 必要 '+sim.demands.larvae+'匹分 · 食料庫 '+s.capacity.food+' / 必要 '+sim.demands.food+'個分';
    const effects={walk:'歩く速さ +15%',brood:'育つ速さ +20%',dig:'掘る速さ +25%'};
    document.querySelectorAll('[data-upgrade]').forEach(b=>{const k=b.dataset.upgrade,level=sim.colony.upgrades[k],def=ColonyGame.UPGRADES[k],cost=sim.upgradeCost(k);b.replaceChildren(document.createTextNode(def.name+' '+level+'/'+def.max));const note=document.createElement('span');note.textContent=level>=def.max?'習得済み':effects[k]+' / 餌 '+cost+'個';b.append(note);b.disabled=level>=def.max||s.available<cost;});
    let cause=s.births===0?'目標：最初の働き手を育てよう。':s.ants<20?'目標：働き手20匹のコロニーへ。':s.ants<32?'目標：働き手32匹のコロニーへ。':'目標：この区画で64匹まで育てよう。';
    if(!s.allocation.forage)cause+=' 採集係を増やすと餌を集めます。';else if(!s.allocation.nurse)cause+=' 育児係を増やすと給餌を始めます。';else if(s.food<2)cause+=' 地表から餌が届くのを待っています。';else if(!s.allocation.build&&(s.shortages.larvae||s.shortages.food))cause+=' 掘削係を増やすと巣を広げます。';else if(s.brood.pupa)cause+=' 蛹が羽化を待っています。';else if(s.brood.larva)cause+=' 育児係が幼虫に餌を届けています。';else cause+=' 採集と掘削を始めています。';
    if(s.ants+sim.colony.brood.length>=sim.populationLimit())cause='コロニーが育ちました。女王と地質の研究で、次の成長へ。';
    if(s.births&&s.allocation.forage&&s.allocation.nurse&&s.allocation.build&&s.food>=2)cause=s.reached<sim.depthAbility()?'新しい地層へ、通路を掘り進めています。':s.ants<32?'働き手を育てて、巣を広げよう。':'研究と仕事の配分で、コロニーを育てよう。';
    $('cookies').textContent=s.cookie;$('depth').textContent='第'+s.reached+'層';updateResearch();
    if($('cause').textContent!==cause)$('cause').textContent=cause;
    $('play').textContent=paused?'再開':'一時停止';$('play').setAttribute('aria-pressed',String(paused));selectionUI();
    const journal=$('journal');journal.replaceChildren();for(const e of sim.events.slice(-3).reverse()){const li=document.createElement('li');li.textContent=formatTime(e.time)+' '+e.text;journal.append(li);}
  }
  let selectedResearch='dig_speed';
  const researchDialog=$('research-dialog');
  for(const branch of ['採集','育児','衛生','発酵','地質','防衛','黄金','女王','遠征']){
    const h=document.createElement('div');h.className='research-branch';h.textContent=branch;$('research-list').append(h);
    for(const def of ColonyGame.RESEARCH.filter(d=>d.branch===branch)){
      const b=document.createElement('button');b.className='research-item'+(def.planned?' planned':'');b.dataset.research=def.id;b.setAttribute('aria-pressed','false');
      const title=document.createElement('span');title.textContent=def.name;const level=document.createElement('small');b.append(title,level);
      b.onclick=()=>{selectedResearch=def.id;updateResearch();};$('research-list').append(b);
    }
  }
  function updateResearch(){
    let ready=0;
    for(const b of document.querySelectorAll('[data-research]')){
      const id=b.dataset.research,d=ColonyGame.BY_ID[id],status=sim.researchStatus(id);if(status==='ready')ready++;
      b.setAttribute('aria-pressed',String(id===selectedResearch));b.querySelector('small').textContent=status==='planned'?'準備中':status==='done'?'研究済み':d.max===Infinity?'Lv '+sim.level(id):sim.level(id)+' / '+d.max;
    }
    $('research-summary').textContent=ready?ready+'件を研究できる':'';
    if(!researchDialog.open)return;
    const d=ColonyGame.BY_ID[selectedResearch],cost=sim.researchCost(d.id),status=sim.researchStatus(d.id);
    $('research-name').textContent=d.name;$('research-effect').textContent=d.desc;
    $('research-cost').textContent=status==='planned'?'':status==='done'?'研究済み':[cost.food?'餌 '+cost.food+'個':null,cost.cookie?'クッキー '+cost.cookie+'個':null].filter(Boolean).join('・');
    const condition=status==='planned'?'まだ研究できません。':d.prereq&&!sim.level(d.prereq)?ColonyGame.BY_ID[d.prereq].name+'が必要':d.minAnts&&sim.ants.length<d.minAnts?'働き手 '+d.minAnts+'匹から':d.reached&&sim.progress.reached<d.reached?'第'+d.reached+'層への到達が必要':status==='cost'?sim.availableFood().length<cost.food?'保管中の餌があと'+(cost.food-sim.availableFood().length)+'個必要':'クッキーがあと'+(cost.cookie-sim.progress.cookie)+'個必要':'';
    $('research-condition').textContent=condition;$('research-condition').hidden=!condition;
    $('research-buy').disabled=status!=='ready';$('research-buy').textContent=status==='planned'?'準備中':status==='done'?'研究済み':'研究する';
  }
  $('open-research').onclick=()=>{researchDialog.showModal();updateResearch();};
  $('close-research').onclick=()=>researchDialog.close();
  $('research-buy').onclick=()=>{if(sim.buyResearch(selectedResearch)){persist();updateUI();}};

  let tapSave=null;
  $('lay').onclick=()=>{if(sim.tap()){clearTimeout(tapSave);tapSave=setTimeout(()=>persist(),250);}updateUI();};
  $('laying').onclick=()=>{sim.colony.laying=!sim.colony.laying;persist();updateUI();};
  document.querySelectorAll('[data-role]').forEach(b=>b.onclick=()=>{sim.shiftRole(b.dataset.role,+b.dataset.delta);persist();updateUI();});
  document.querySelectorAll('[data-upgrade]').forEach(b=>b.onclick=()=>{sim.buy(b.dataset.upgrade);updateUI();});
  $('play').onclick = () => { paused = !paused; accumulator = 0; updateUI(); };
  $('speed').onchange = () => { speed = +$('speed').value;persist(); };
  
  
  
  document.querySelectorAll('[data-priority]').forEach(b => b.onclick = () => { sim.priority = b.dataset.priority; sim.planAt = sim.time; updateUI(); });
  
  $('focus').onclick=focusView;
  $('undo').onclick=()=>{try{const bytes=localStorage.getItem(KEY+'_recovery');if(!bytes){message('一つ前の巣はまだありません。');return;}const candidate=Simulation.restore(JSON.parse(bytes));adopt(candidate);invalidStored=false;persist();message('一つ前の巣に戻りました。');}catch{message('一つ前の巣を開けませんでした。いまの巣はそのままです。');}};
  $('zoom-in').onclick = () => zoom(1.25); $('zoom-out').onclick = () => zoom(1 / 1.25); $('fit').onclick = fit;
  $('save').onclick = () => { persist(true); };
  $('restore').onclick = () => {
    try { const data = localStorage.getItem(KEY); if (!data) { message('保存データはまだありません。'); return; } const next = Simulation.restore(JSON.parse(data)); adopt(next); invalidStored = false; message('保存した地形と仕事を再開しました。'); }
    catch (e) { message('保存データを読み込めませんでした。いまの巣はそのままです。'); }
  };
  $('export').onclick = () => {
    const blob = new Blob([JSON.stringify(sim.dump())], { type: 'application/json' }), url = URL.createObjectURL(blob), a = document.createElement('a');
    a.href = url; a.download = `living-clicker-1-${sim.seed}.json`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); message('いまの状態を書き出しました。');
  };
  $('import').onchange = async () => {
    const f = $('import').files[0]; if (!f) return;
    try { if (f.size > 16000000) throw new Error('large'); const next = Simulation.restore(JSON.parse(await f.text())); adopt(next); invalidStored = false; if(persist())message('保存データを開きました。'); }
    catch (e) { message('保存データを開けませんでした。いまの巣はそのままです。'); }
    $('import').value = '';
  };
  $('reset').onclick = () => {
    const seed = Number($('seed').value);
    if (!Number.isInteger(seed) || seed < 1 || seed > 4294967295) { message('地形の種は1〜4294967295の整数です。'); return; }
    try{reset(seed); invalidStored = false; if(persist())message('この地形で最初から始めました。');}catch{message('新しい巣を保存できませんでした。いまの巣を書き出して保管できます。');}
  };
  $('new-seed').onclick = () => {try{reset(crypto.getRandomValues(new Uint32Array(1))[0] || 1);invalidStored=false;if(persist())message('別の地形で始めました。');}catch{message('新しい巣を始められませんでした。いまの巣を書き出して保管できます。');}};
  // Safari can ignore viewport zoom limits. Cancel its page gesture without
  // cancelling touchend/click, so rapid taps still reach the game controls.
  for(const type of ['gesturestart','gesturechange'])document.addEventListener(type,e=>e.preventDefault(),{passive:false});
  document.querySelector('.app').addEventListener('dblclick',e=>{
    if(!e.target.closest('input,textarea,select,[contenteditable="true"]'))e.preventDefault();
  });
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
      selectionUI();if(selected)$('selection-detail').open=true;
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
  $('seed').value = sim.seed; 
  resize(); focusView(); updateUI(); render(); requestAnimationFrame(frame);
  // Readable inspection API for verifying the independent game loop.
  window.colonyGame = { get sim() { return sim; }, get paused() { return paused; }, get camera() { return { ...cam }; },
    pause(value = true) { paused = value; accumulator = 0; updateUI(); }, advance(seconds) { sim.advance(seconds); updateUI(); render(); },
    reset, render, screen, dump: () => sim.dump(), load(pack) { adopt(Simulation.restore(pack)); render(); }, selectAnt(id) { selected = { kind: 'ant', id }; updateUI(); render(); } };
})();
