/* Pixel art ported from the living-nest prototype; main-game coordinates are adapted by the caller. */
window.makeClickerPixelArt=function({surfaceFloor}){
const {ANT_SIZE,ANT_BODY,renderAngle}=LivingNest;
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

return {antShape,surfaceAntFrame};
};
