/* New colony core, based on frozen living-nest-14. Original prototype remains unchanged. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.LivingNest = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const W = 96, H = 90, SIZE = W * H, SURFACE = 8;
  // One physical soil unit for generation, rendering, excavation and objects.
  function grainUnit(perUnit) {
    const size = 1 / perUnit, width = W * perUnit, height = H * perUnit;
    return Object.freeze({ perUnit, size, area: size * size, width, height, count: width * height,
      at(x,y) { return Math.floor(y*perUnit)*width + Math.floor(x*perUnit); },
      origin(i) { return {x:(i%width)*size,y:Math.floor(i/width)*size}; },
      center(i) { return {x:(i%width+.5)*size,y:(Math.floor(i/width)+.5)*size}; },
      cells(cell) {
        const out=[],x=(cell%W)*perUnit,y=Math.floor(cell/W)*perUnit;
        for(let dy=0;dy<perUnit;dy++)for(let dx=0;dx<perUnit;dx++)out.push((y+dy)*width+x+dx);
        return out;
      },
      neighbors(i) {
        const out=[],x=i%width,y=Math.floor(i/width);
        if(x)out.push(i-1);if(x<width-1)out.push(i+1);if(y)out.push(i-width);if(y<height-1)out.push(i+width);
        return out;
      }
    });
  }
  const GRAIN = grainUnit(4);
  const GRID = GRAIN.perUnit, FW = GRAIN.width, FH = GRAIN.height, FINE_SIZE = GRAIN.count, GRAIN_AREA = GRAIN.area;
  const FOOTPRINT_MEMO=60000,KNOWN_ROUTES=20000,DROP_KINDS={soil:0,egg:1,food:2,waste:3,cookie:4};
  const STEP=1/60, PICKUP_SECONDS=.2, SAVE_FORMAT='ant-colony-core-1', WALK_SPEED=9, MAX_LOAD=4, LANE_OFFSET=.35, CURVE_LANE_EXTRA=.18;
  const Physics = (function(){

  const SHAPES={soil:{hx:GRAIN.size/2,hy:GRAIN.size/2,density:1},egg:{hx:1/4,hy:5/32,density:.65},food:{hx:3/16,hy:3/16,density:.8},waste:{hx:5/32,hy:1/8,density:.7},cookie:{hx:5/32,hy:5/32,density:.6}};
  const KINDS=['soil','egg','food','waste','cookie'],STATES=['cargo','delivered','incoming','stored','pickup','refuse'];
  const BIN=.75,EPS=1e-7,STRIDE=50;
  class World {
    constructor(terrain,width,height,grain){
      this.terrain=terrain;this.width=width;this.height=height;this.grain=grain;this.columns=Math.round(width/grain);
      this.bodies=[];this.moving=new Set();this.byId=new Map();this.bins=new Map();this.soilCells=new Map();this.nextId=1;this.clock=0;this.remainder=0;this.drag=null;
    }
    key(x,y){return Math.floor(y/BIN)*256+Math.floor(x/BIN);}
    index(b){
      if(!b.carrier&&b.rest<30)this.moving.add(b);else this.moving.delete(b);
      if(b.kind==='soil'){
        if(b.soilCell!==undefined&&this.soilCells.get(b.soilCell)===b)this.soilCells.delete(b.soilCell);
        delete b.soilCell;
        if(!b.carrier){b.soilCell=Math.floor(b.y/this.grain)*this.columns+Math.floor(b.x/this.grain);this.soilCells.set(b.soilCell,b);}
      }
      const key=this.key(b.x,b.y);if(key===b.bin)return;
      if(b.bin!==undefined){const old=this.bins.get(b.bin);old.delete(b);if(!old.size)this.bins.delete(b.bin);}
      let bin=this.bins.get(key);if(!bin)this.bins.set(key,bin=new Set());bin.add(b);b.bin=key;
    }
    spawn(kind,x,y,extra={}){
      if(!SHAPES[kind])throw new Error('不明な物体です');
      const b={id:this.nextId++,kind,x,y,vx:0,vy:0,carrier:0,state:kind==='soil'?'cargo':'stored',material:1,rest:0,source:-1,...extra};
      this.bodies.push(b);this.byId.set(b.id,b);this.index(b);return b;
    }
    remove(b){
      const bin=this.bins.get(b.bin);bin.delete(b);if(!bin.size)this.bins.delete(b.bin);
      if(b.soilCell!==undefined)this.soilCells.delete(b.soilCell);
      this.moving.delete(b);this.byId.delete(b.id);this.bodies.splice(this.bodies.indexOf(b),1);if(this.drag?.id===b.id)this.drag=null;
    }
    near(x,y){
      const out=[],cx=Math.floor(x/BIN),cy=Math.floor(y/BIN);
      for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
        const bin=this.bins.get((cy+dy)*256+cx+dx);if(bin)for(const b of bin)out.push(b);
      }
      return out.sort((a,b)=>a.id-b.id);
    }
    hit(x,y,radius=.6){
      let found=null,distance=radius;
      // Pointer tolerance may exceed a bin when zoomed out.
      for(const b of this.bodies)if(!b.carrier){const d=Math.hypot(x-b.x,y-b.y);if(d<distance){distance=d;found=b;}}
      return found;
    }
    terrainOverlap(b){
      const {hx,hy}=SHAPES[b.kind],u=this.grain;
      if(b.x<hx-EPS||b.x>this.width-hx+EPS||b.y<hy-EPS||b.y>this.height-hy+EPS)return true;
      for(let y=Math.floor((b.y-hy+EPS)/u);y<=Math.floor((b.y+hy-EPS)/u);y++)
        for(let x=Math.floor((b.x-hx+EPS)/u);x<=Math.floor((b.x+hx-EPS)/u);x++)if(this.terrain((x+.5)*u,(y+.5)*u))return true;
      return false;
    }
    projectTerrain(b){
      const {hx,hy}=SHAPES[b.kind],u=this.grain;
      b.x=Math.max(hx,Math.min(this.width-hx,b.x));b.y=Math.max(hy,Math.min(this.height-hy,b.y));
      // Resolve exact grain rectangles; repeated minimum translations handle corners.
      for(let pass=0;pass<6;pass++){
        let best=null;
        for(let y=Math.floor((b.y-hy+EPS)/u);y<=Math.floor((b.y+hy-EPS)/u);y++)for(let x=Math.floor((b.x-hx+EPS)/u);x<=Math.floor((b.x+hx-EPS)/u);x++){
          if(!this.terrain((x+.5)*u,(y+.5)*u))continue;
          const moves=[{dx:x*u-hx-b.x,dy:0},{dx:(x+1)*u+hx-b.x,dy:0},{dx:0,dy:y*u-hy-b.y},{dx:0,dy:(y+1)*u+hy-b.y}];
          for(const m of moves)if(!best||Math.abs(m.dx+m.dy)<Math.abs(best.dx+best.dy))best=m;
        }
        if(!best)break;
        b.x+=best.dx;b.y+=best.dy;
        if(best.dx)b.vx=0;if(best.dy){b.vy=0;if(best.dy<0)b.vx*=.72;}
      }
    }
    moveAxis(b,amount,axis){
      if(!amount)return;
      const {hx,hy}=SHAPES[b.kind],u=this.grain;
      b[axis]+=amount;
      let limit=b[axis];
      for(let y=Math.floor((b.y-hy+EPS)/u);y<=Math.floor((b.y+hy-EPS)/u);y++)for(let x=Math.floor((b.x-hx+EPS)/u);x<=Math.floor((b.x+hx-EPS)/u);x++){
        if(!this.terrain((x+.5)*u,(y+.5)*u))continue;
        const edge=axis==='x'?(amount>0?x*u-hx:(x+1)*u+hx):(amount>0?y*u-hy:(y+1)*u+hy);
        limit=amount>0?Math.min(limit,edge):Math.max(limit,edge);
      }
      // Sweep against actual objects as well as terrain. Sleeping objects keep a
      // collider; contacts are clamped before overlap, rather than corrected later.
      for(const other of this.near(b.x,b.y)){
        if(other===b||other.carrier)continue;
        const t=SHAPES[other.kind],ox=hx+t.hx-Math.abs(b.x-other.x),oy=hy+t.hy-Math.abs(b.y-other.y);
        if(ox<=EPS||oy<=EPS)continue;
        const edge=axis==='x'?other.x+(amount>0?-t.hx-hx:t.hx+hx):other.y+(amount>0?-t.hy-hy:t.hy+hy);
        limit=amount>0?Math.min(limit,edge):Math.max(limit,edge);
        if(axis==='x'&&other.kind!=='soil'&&Math.abs(b.vx)>1){other.rest=0;this.index(other);other.vx=Math.max(-8,Math.min(8,other.vx+b.vx*.3));}
      }
      const half=axis==='x'?hx:hy,max=axis==='x'?this.width:this.height;
      limit=Math.max(half,Math.min(max-half,limit));
      if(Math.abs(limit-b[axis])>EPS){b[axis]=limit;if(axis==='x')b.vx=0;else{b.vy=0;if(amount>0)b.vx*=.82;}}
    }
    supported(b){
      const s=SHAPES[b.kind],y=b.y+s.hy+.003;
      for(let gx=Math.floor((b.x-s.hx+EPS)/this.grain);gx<=Math.floor((b.x+s.hx-EPS)/this.grain);gx++)if(this.terrain((gx+.5)*this.grain,y))return true;
      return this.near(b.x,y).some(p=>{
        if(p===b||p.carrier)return false;const t=SHAPES[p.kind];
        return Math.abs(p.x-b.x)<s.hx+t.hx-EPS&&Math.abs(p.y-t.hy-(b.y+s.hy))<.006;
      });
    }
    penetration(b){
      const s=SHAPES[b.kind];let depth=0;
      for(const p of this.near(b.x,b.y))if(p!==b&&!p.carrier){
        const t=SHAPES[p.kind],x=s.hx+t.hx-Math.abs(b.x-p.x),y=s.hy+t.hy-Math.abs(b.y-p.y);
        if(x>EPS&&y>EPS)depth=Math.max(depth,Math.min(x,y));
      }
      return depth;
    }
    placeObject(b){
      if(!this.terrainOverlap(b)&&this.penetration(b)<EPS)return;
      const original={x:b.x,y:b.y},u=this.grain;
      for(let r=1;r<100;r++)for(let dy=-r;dy<=r;dy++)for(let dx=-r;dx<=r;dx++){
        if(Math.max(Math.abs(dx),Math.abs(dy))!==r)continue;
        b.x=original.x+dx*u;b.y=original.y+dy*u;
        if(!this.terrainOverlap(b)&&this.penetration(b)<EPS){this.index(b);return;}
      }
      throw new Error('荷物を下ろす空間がありません');
    }
    grainFree(x,y,except=null){
      const u=this.grain;
      if(x<0||y<0||x>=this.width/u||y>=this.height/u||this.terrain((x+.5)*u,(y+.5)*u))return false;
      const occupied=this.soilCells.get(y*this.columns+x);if(occupied&&occupied!==except)return false;
      return !this.near((x+.5)*u,(y+.5)*u).some(b=>b!==except&&!b.carrier&&b.kind!=='soil'&&Math.abs(b.x-(x+.5)*u)<SHAPES[b.kind].hx+u/2-EPS&&Math.abs(b.y-(y+.5)*u)<SHAPES[b.kind].hy+u/2-EPS);
    }
    placeGrain(b){
      const u=this.grain,cx=Math.floor(b.x/u),cy=Math.floor(b.y/u);
      for(let r=0;r<160;r++)for(let dy=-r;dy<=r;dy++)for(let dx=-r;dx<=r;dx++){
        if(Math.max(Math.abs(dx),Math.abs(dy))!==r||!this.grainFree(cx+dx,cy+dy,b))continue;
        b.x=(cx+dx+.5)*u;b.y=(cy+dy+.5)*u;this.index(b);return;
      }
      throw new Error('砂を置く空間がありません');
    }
    stepSand(dt){
      const u=this.grain,active=[...this.moving].filter(b=>b.kind==='soil'&&!b.carrier&&b.rest<30).sort((a,b)=>b.y-a.y||a.id-b.id);
      for(const b of active){
        const x=Math.floor(b.x/u),y=Math.floor(b.y/u);let nx=x,ny=y;
        if(this.drag?.id===b.id){
          const dx=Math.sign(this.drag.x-b.x),dy=Math.sign(this.drag.y-b.y);
          if(this.grainFree(x+dx,y+dy,b)){nx+=dx;ny+=dy;}
          else if(this.grainFree(x+dx,y,b))nx+=dx;
        }else{
          const direction=b.vx?Math.sign(b.vx):(b.id%2?1:-1),period=Math.max(1,Math.round(u/Math.max(.01,Math.abs(b.vx)*dt)));
          if(Math.abs(b.vx)>.1&&this.clock%period===b.id%period&&this.grainFree(x+direction,y,b))nx+=direction;
          if(this.grainFree(nx,y+1,b))ny++;
          else if(this.grainFree(nx+direction,y+1,b)&&this.grainFree(nx+direction,y,b)){nx+=direction;ny++;}
          else if(this.grainFree(nx-direction,y+1,b)&&this.grainFree(nx-direction,y,b)){nx-=direction;ny++;}
          b.vx*=.93;
        }
        if(nx===x&&ny===y&&this.drag?.id!==b.id){b.rest=30;b.vx=b.vy=0;this.index(b);}
        else {b.x=(nx+.5)*u;b.y=(ny+.5)*u;b.vy=(ny-y)*u/dt;this.index(b);}
      }
    }
    substep(dt){
      this.clock++;
      if(this.clock%12===0)for(const b of this.bodies)if(!b.carrier&&b.rest>=30){
        if(b.kind==='soil'){const x=Math.floor(b.x/this.grain),y=Math.floor(b.y/this.grain);if(this.grainFree(x,y+1,b)||[-1,1].some(d=>this.grainFree(x+d,y,b)&&this.grainFree(x+d,y+1,b))||this.drag?.id===b.id)b.rest=0;}
        else if(!this.supported(b))b.rest=0;
        if(!b.rest)this.index(b);
      }
      const active=[];
      for(const b of [...this.moving].sort((a,b)=>a.id-b.id)){
        if(b.kind==='soil'||b.carrier||b.rest>=30)continue;
        b.oldX=b.x;b.oldY=b.y;
        if(this.drag?.id===b.id){
          b.vx=Math.max(-8,Math.min(8,(this.drag.x-b.x)*15));b.vy=Math.max(-8,Math.min(8,(this.drag.y-b.y)*15));b.rest=0;
        }else b.vy=Math.min(b.kind==='soil'?4:8,b.vy+12*dt);
        b.vx*=Math.exp(-dt*.5);
        // Displacements stay below one grain: no tunnelling through the fine terrain.
        this.moveAxis(b,b.vx*dt,'x');this.moveAxis(b,b.vy*dt,'y');this.index(b);active.push(b);
      }
      for(const b of active){
        const motion=Math.hypot(b.x-b.oldX,b.y-b.oldY);
        if(this.drag?.id!==b.id&&motion<.0006&&this.penetration(b)<.00001&&this.supported(b)){b.rest++;if(b.rest>=30){b.vx=b.vy=0;this.index(b);}}
        else b.rest=0;
      }
      const sandTicks=Math.max(1,Math.round(this.grain/(7.5*STEP)));
      if(this.clock%sandTicks===0)this.stepSand(dt*sandTicks);
    }
    step(dt){
      this.remainder+=dt;const n=Math.floor((this.remainder+1e-12)*60);this.remainder-=n/60;
      if(Math.abs(this.remainder)<1e-12)this.remainder=0;
      for(let i=0;i<n;i++)this.substep(1/60);
    }
    release(b,vx=0,vy=0){b.carrier=0;b.rest=0;b.vx=vx;b.vy=vy;if(b.kind==='soil')this.placeGrain(b);else this.placeObject(b);this.index(b);}
    grab(id,x,y){const b=this.byId.get(id);if(!b||b.carrier)return false;b.rest=0;this.index(b);this.drag={id,x,y};return true;}
    drop(){this.drag=null;}
    dump(){
      const buffer=new ArrayBuffer(this.bodies.length*STRIDE),v=new DataView(buffer);
      for(let i=0;i<this.bodies.length;i++){
        const b=this.bodies[i],at=i*STRIDE;
        v.setUint32(at,b.id,true);v.setUint8(at+4,KINDS.indexOf(b.kind));v.setUint8(at+5,b.material);v.setUint8(at+6,b.carrier);v.setUint8(at+7,STATES.indexOf(b.state));
        for(const [k,key] of ['x','y','vx','vy'].entries())v.setFloat64(at+8+k*8,b[key],true);
        v.setUint16(at+40,b.rest,true);v.setInt32(at+42,b.source,true);v.setUint32(at+46,0,true);
      }
      const bytes=new Uint8Array(buffer);let binary='';for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));
      return {version:2,encoding:'bodies50le',count:this.bodies.length,nextId:this.nextId,clock:this.clock,remainder:this.remainder,data:typeof btoa==='function'?btoa(binary):Buffer.from(bytes).toString('base64')};
    }
    restore(pack){
      const fail=()=>{throw new Error('不正な物体の保存データです');};
      if(!pack||pack.version!==2||pack.encoding!=='bodies50le'||!Number.isInteger(pack.count)||pack.count<0||pack.count>GRAIN.count+2400||!Number.isInteger(pack.nextId)||pack.nextId<1||pack.nextId>1e9||!Number.isSafeInteger(pack.clock)||pack.clock<0||typeof pack.data!=='string'||pack.data.length!==Math.ceil(pack.count*STRIDE/3)*4||!/^[A-Za-z0-9+/]*={0,2}$/.test(pack.data))fail();
      const binary=typeof atob==='function'?atob(pack.data):Buffer.from(pack.data,'base64').toString('binary');
      if(binary.length!==pack.count*STRIDE)fail();const bytes=Uint8Array.from(binary,c=>c.charCodeAt(0)),v=new DataView(bytes.buffer);
      for(let i=0;i<pack.count;i++){
        const at=i*STRIDE,id=v.getUint32(at,true),kind=KINDS[v.getUint8(at+4)],material=v.getUint8(at+5),carrier=v.getUint8(at+6),state=STATES[v.getUint8(at+7)],values=['x','y','vx','vy'].map((_,k)=>v.getFloat64(at+8+k*8,true)),rest=v.getUint16(at+40,true),source=v.getInt32(at+42,true);
        if(!id||id>=pack.nextId||this.byId.has(id)||!kind||material<1||material>4||carrier>128&&(carrier<200||carrier>249)||!state||values.some(n=>!Number.isFinite(n))||Math.abs(values[2])>20||Math.abs(values[3])>20||rest>30||v.getUint32(at+46,true)!==0)fail();
        const [x,y,vx,vy]=values,s=SHAPES[kind];
        if(x<s.hx-EPS||x>this.width-s.hx+EPS||y<s.hy-EPS||y>this.height-s.hy+EPS||(kind!=='soil'&&source!==-1))fail();
        this.spawn(kind,x,y,{id,material,carrier,state,vx,vy,rest,source});
      }
      const remainder=pack.remainder;if(!Number.isFinite(remainder)||remainder<0||remainder>=1/60)fail();
      this.nextId=pack.nextId;this.clock=pack.clock;this.remainder=remainder;
    }
  }
  return {World,SHAPES};
  })();
  function encodeGrains(values) {
    const runs=[];let start=0;
    for(let i=1;i<=values.length;i++)if(i===values.length||values[i]!==values[start]){runs.push(i-start,values[start]);start=i;}
    return {encoding:'rle8',runs};
  }
  function decodeGrains(pack, count, max) {
    const fail=()=>{throw new Error('不正な砂粒の保存データです');};
    if(!pack||pack.encoding!=='rle8'||!Array.isArray(pack.runs)||!pack.runs.length||pack.runs.length%2||pack.runs.length>count*2)fail();
    const values=new Uint8Array(count);let offset=0,previous=-1;
    for(let i=0;i<pack.runs.length;i+=2){
      const n=pack.runs[i],v=pack.runs[i+1];
      if(!Number.isInteger(n)||n<1||n>count-offset||!Number.isInteger(v)||v<0||v>max||v===previous)fail();
      values.fill(v,offset,offset+n);offset+=n;previous=v;
    }
    if(offset!==count)fail();return values;
  }
  const SOIL = 1, HARD = 2, ROCK = 3, PEBBLE = 4;
  const KEY = 'livingClicker_1';
  const ANT_SIZE = 1.8;
  const ANT_BODY = [[-.25, .24, .17], [0, .14, .12], [.24, .16, .14]];
  // The four real square grains form an axis-aligned 2x2 load at the mouth.
  // Their individual physics shapes remain one grain each.
  const LOAD_OFFSETS=[[-.125,-.125],[.125,-.125],[-.125,.125],[.125,.125]];
  const soilNavKind=count=>count===1?'soil1':count===2?'soil2':'soil';
  const loadOffsets=count=>count===1?[[0,0]]:count===2?[[-.125,0],[.125,0]]:count===3?[[-.125,-.125],[.125,-.125],[0,.125]]:LOAD_OFFSETS;
  const carryShape=kind=>kind==='soil1'?Physics.SHAPES.soil:kind==='soil2'?{hx:GRAIN.size,hy:GRAIN.size/2}:kind==='soil'?{hx:GRAIN.size,hy:GRAIN.size}:Physics.SHAPES[kind];
  const names = ['通路', '女王房', ...Array.from({length:12},(_,k)=>(k%2?'食料庫':'育児室')+(k<2?'':' '+(Math.floor(k/2)+1)))];
  const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
  const xy = i => ({ x: i % W, y: Math.floor(i / W) });
  const idx = (x, y) => y * W + x;
  const DUMP_CELL = idx(55, SURFACE - 1);
  const renderAngle = angle => Math.round(angle / (Math.PI / 8)) * Math.PI / 8;
  const distance = (a, b) => Math.abs(a % W - b % W) + Math.abs(Math.floor(a / W) - Math.floor(b / W));
  function neighbors(i) {
    const x = i % W, y = Math.floor(i / W), out = [];
    if (x > 0) out.push(i - 1);
    if (x < W - 1) out.push(i + 1);
    if (y > 0) out.push(i - W);
    if (y < H - 1) out.push(i + W);
    return out;
  }
  function hash(x, y, seed) {
    let n = Math.imul(x + 17, 374761393) ^ Math.imul(y + 31, 668265263) ^ seed;
    n = Math.imul(n ^ (n >>> 13), 1274126177);
    return (n ^ (n >>> 16)) >>> 0;
  }
  const grainCost=type=>type===HARD?.56:type===PEBBLE?.4:.28;
  function soilResistance(x,y,seed) {
    const sample=(scale,salt)=>{
      const u=x/scale,v=y/scale,ix=Math.floor(u),iy=Math.floor(v),tx=u-ix,ty=v-iy,sx=tx*tx*(3-2*tx),sy=ty*ty*(3-2*ty);
      const value=(dx,dy)=>hash(ix+dx,iy+dy,seed^salt)/4294967295;
      return (value(0,0)*(1-sx)+value(1,0)*sx)*(1-sy)+(value(0,1)*(1-sx)+value(1,1)*sx)*sy;
    };
    return .65*sample(3.5,0x19a2f47b)+.35*sample(7,0x57ab319f);
  }
  function workCost(type,g,seed) {const p=GRAIN.center(g);return grainCost(type)*(.85+.45*soilResistance(p.x,p.y,seed));}
  function layerBoundaries(seed,x) {
    const bases=[36,46,56,66,76];
    return bases.map((base,k)=>{
      const phase=hash(k,91,seed)/4294967296*Math.PI*2;
      return base+1.25*Math.sin(x/15+phase)+.5*Math.sin(x/5.7+phase*1.7)+(hash(k,92,seed)/4294967296-.5)*.7;
    });
  }
  function geologyGrains(seed,air) {
    const values=new Uint8Array(FINE_SIZE);
    for(let x=0;x<FW;x++){
      const boundaries=layerBoundaries(seed,(x+.5)/GRID);
      for(let y=SURFACE*GRID;y<FH;y++){
        const depth=(y+.5)/GRID;let band=0;while(band<boundaries.length&&depth>=boundaries[band])band++;
        // A few loose pebbles lie in the soil, more in the deeper layers.
        values[y*FW+x]=hash(x,y,seed^0x51ab)%1000<(band?25:15)?PEBBLE:band%2?HARD:SOIL;
      }
    }
    const rocks=[],wanted=16+hash(6,9,seed)%3;
    for(let attempt=0;attempt<320&&rocks.length<wanted;attempt++){
      const random=k=>hash(attempt,k,seed^0x7a43b91f)/4294967296;
      const r={x:4+random(1)*(W-8),y:SURFACE+5+random(2)*(H-SURFACE-10),rx:1.5+random(3)*2.7,ry:1.1+random(4)*2.0,angle:random(5)*Math.PI,phase:random(6)*Math.PI*2};
      const extent=Math.max(r.rx,r.ry)+.7;
      if(r.x-extent<1||r.x+extent>W-1||r.y-extent<SURFACE+.5||r.y+extent>H-1)continue;
      if(rocks.some(p=>Math.hypot(p.x-r.x,p.y-r.y)<Math.max(p.rx,p.ry)+Math.max(r.rx,r.ry)+.9))continue;
      const cos=Math.cos(r.angle),sin=Math.sin(r.angle),cells=[];let clear=true;
      const minX=Math.floor((r.x-extent)*GRID),maxX=Math.ceil((r.x+extent)*GRID),minY=Math.floor((r.y-extent)*GRID),maxY=Math.ceil((r.y+extent)*GRID);
      for(let y=minY;y<=maxY&&clear;y++)for(let x=minX;x<=maxX;x++){
        const dx=(x+.5)/GRID-r.x,dy=(y+.5)/GRID-r.y,u=dx*cos+dy*sin,v=-dx*sin+dy*cos;
        const theta=Math.atan2(v/r.ry,u/r.rx),edge=1+.09*Math.sin(theta*3+r.phase)+.04*Math.sin(theta*5-r.phase);
        const near=(u/(r.rx+.6))**2+(v/(r.ry+.6))**2<=edge*edge,g=y*FW+x;
        if(near&&air[g]){clear=false;break;}
        if((u/r.rx)**2+(v/r.ry)**2<=edge*edge)cells.push(g);
      }
      if(!clear)continue;
      for(const g of cells)values[g]=ROCK;rocks.push(r);
    }
    return values;
  }
  class Simulation {
    constructor(seed = 24014) {
      this.seed = seed >>> 0;
      this.rng = this.seed || 1;
      this.time = 0; this.ticks = 0; this.remainder=0; this.planAt = 0; this.revision = 1;
      this.terrain = new Uint8Array(SIZE);
      this.room = new Uint8Array(SIZE);
      this.loose = new Uint8Array(SIZE);
      this.traffic = new Float64Array(SIZE);this.jam = new Float64Array(SIZE);
      this.demands = { larvae: 3, food: 6 };
      this.priority = 'balanced'; this.hardDig = true;
      this.rooms = [null, { id: 1, x: 48, y: 24 }, { id: 2, x: 32, y: 43 }, { id: 3, x: 64, y: 43 }];
      this.builds = [null, null, null, null];
      this.drop = DUMP_CELL;
      this.jobs = []; this.ants = []; this.nextJob = 1;
      this.stats = { dug: 0, delivered: 0, nursery: 0, food: 0, passage: 0, distance: 0, yields:0, waitSeconds:0, backwardDistance:0 };
      this.events = [];
      for(let y=0;y<H;y++)this.terrain.fill(y<SURFACE?0:SOIL,y*W,(y+1)*W);
      this.initGrains();
      this.applyGeology();
      this.growInitialQueen();
      this.growEntrance();
      this._entryHistory=this.entranceHistory;
      const parking=[];for(let y=17.25;y<32;y+=.5)for(let x=37.25;x<59;x+=.5)for(const angle of [0,Math.PI/2]){
        const p={x,y,angle,cell:idx(Math.floor(x),Math.floor(y))};if(this.grainRoom[GRAIN.at(x,y)]!==1||Math.hypot(x-this._entryHistory[0].x,y-this._entryHistory[0].y)<3||!this.poseClear(p)||ANT_BODY.some(([cx,rx,ry])=>((x-48-cx*6.4)/(rx*6.4+.65))**2+((y-24)/(ry*6.4+.5))**2<1))continue;parking.push(p);
      }
      for (let k = 0; k < 12; k++) {
        parking.sort((a,b)=>{const score=p=>this.ants.length?Math.min(...this.ants.map(a=>Math.hypot(a.x-p.x,a.y-p.y))):Math.hypot(p.x-48,p.y-24);return score(b)-score(a)||a.cell-b.cell;});
        const chosen=parking.findIndex(p=>this.ants.every(a=>!this.workersOverlap(p,a,null,null)));if(chosen<0)throw new Error('働きアリの待機場所が不足しています');const p=parking.splice(chosen,1)[0],cell=p.cell;
        this.ants.push({ id: k + 1, cell, x: p.x, y: p.y, task: 'idle', job: null, cargo: null,
          path: [], next: 0, wait: this.random() * 3, walked: 0, angle: p.angle,home:{x:p.x,y:p.y,angle:p.angle} });
      }
      this.initObjects();
      this.ensureBuild(2);this.ensureBuild(3);
      this.log('女王室から出発します。育児室と食料庫へ、通路を掘り進めます。');
    }
    random() {
      this.rng = (Math.imul(this.rng, 1664525) + 1013904223) >>> 0;
      return this.rng / 4294967296;
    }
    log(text) {
      this.events.push({ time: this.time, text });
      if (this.events.length > 30) this.events.shift();
    }
    roomIds(){return this.rooms.slice(2).map(r=>r.id);}
    roomKind(rid){return this.rooms?.[rid]?.kind??(rid%2===0?'egg':'food');}
    buildNeeds(){return [{rid:2,d:this.demands.larvae-this.rawCapacities().larvae,wanted:this.demands.larvae},{rid:3,d:(this.demands.food-this.rawCapacities().food)/2,wanted:this.demands.food}];}
    canExcavate(g){return this.grains[g]===SOIL||this.grains[g]===PEBBLE||this.grains[g]===HARD&&this.hardDig;}
    grainCells(cell) { return GRAIN.cells(cell); }
    grainNeighbors(i) { return GRAIN.neighbors(i); }
    soilAt(x, y) {
      if (x < 0 || x >= W || y < 0 || y >= H) return ROCK;
      return this.grains[GRAIN.at(x,y)];
    }
    applyGeology() {
      const air=Uint8Array.from(this.grains,v=>v===0?1:0),materials=geologyGrains(this.seed,air);
      for(let g=SURFACE*GRID*FW;g<FINE_SIZE;g++)if(this.grains[g])this.grains[g]=materials[g];
      for(let cell=0;cell<SIZE;cell++)this.syncCell(cell);
      this.revision++;
    }
    syncCell(cell) {
      const grains=this.grainCells(cell),material=grains.reduce((type,g)=>Math.max(type,this.grains[g]===PEBBLE?SOIL:this.grains[g]),0);
      this.terrain[cell]=material;
      this.room[cell]=material?0:this.grainRoom[grains[Math.floor(grains.length/2)]];
    }
    initGrains() {
      this.grains=new Uint8Array(FINE_SIZE);this.grainRoom=new Uint8Array(FINE_SIZE);this.grainPending=new Uint8Array(FINE_SIZE);
      for(let gy=SURFACE*GRID;gy<FH;gy++)for(let gx=0;gx<FW;gx++){
        const i=gy*FW+gx,{x,y}=GRAIN.center(i);this.grains[i]=SOIL;
        const cos=Math.cos(-.14),sin=Math.sin(-.14),bx=(x-48)*cos+(y-24)*sin,by=-(x-48)*sin+(y-24)*cos;
        if(ANT_BODY.some(([cx,rx,ry])=>((bx-cx*6.4)/(rx*6.4+.95))**2+(by/(ry*6.4+.95))**2<=1)){this.grains[i]=0;this.grainRoom[i]=1;}
      }
      for(let i=0;i<SIZE;i++)this.syncCell(i);
      this.stats.grainDug=0;this.stats.grainDelivered=0;this.stats.grainSettled=0;
    }
    strength(g,type=this.grains[g]) {
      if(!this._soilEffort)this._soilEffort=new Float64Array(FINE_SIZE);
      if(!this._soilEffort[g]){const p=GRAIN.center(g);this._soilEffort[g]=.85+.45*soilResistance(p.x,p.y,this.seed);}
      return grainCost(type)*this._soilEffort[g];
    }
    growInitialQueen() {
      const wanted=Math.ceil((72+this.demands.larvae*.6+this.demands.food*.35)/GRAIN_AREA),front=new Set(),potential=new Float64Array(FINE_SIZE);potential.fill(NaN);
      let count=0;
      const offer=g=>{if(this.grains[g]&&this.grains[g]!==ROCK){const p=GRAIN.center(g);if(Math.abs(p.x-48)<11&&Math.abs(p.y-24)<9)front.add(g);}};
      for(let g=0;g<FINE_SIZE;g++)if(this.grainRoom[g]===1){count++;for(const n of this.grainNeighbors(g))offer(n);}
      while(count<wanted&&front.size){
        let chosen=-1,best=Infinity;
        for(const g of front){
          const p=GRAIN.center(g),cell=idx(Math.floor(p.x),Math.floor(p.y));
          if(Number.isNaN(potential[g])){
            const bodyDistance=Math.min(...ANT_BODY.map(([cx,rx,ry])=>Math.hypot((p.x-48-cx*6.4)/(rx*6.4+1.2),(p.y-24)/(ry*6.4+1.2))));
            potential[g]=bodyDistance+this.strength(g)/grainCost(1)*.85;
          }
          const contacts=this.grainNeighbors(g).filter(n=>this.grainRoom[n]===1).length,score=potential[g]-contacts*.12;
          if(score<best){best=score;chosen=g;}
        }
        if(chosen<0)break;front.delete(chosen);this.grains[chosen]=0;this.grainRoom[chosen]=1;count++;
        const p=GRAIN.center(chosen);this.syncCell(idx(Math.floor(p.x),Math.floor(p.y)));
        for(const n of this.grainNeighbors(chosen))offer(n);
      }
      this.revision++;
    }
    destinationRoom(kind) {const rid=kind==='egg'?2:3;return this.builds[rid]?.complete?rid:1;}
    chisel(job) {
      if(job.pickup!==null||job.cursor>=job.grains.length)return false;
      const g=job.grains[job.cursor],type=job.materials[job.cursor];
      if(job.stroke+1e-9<job.costs[job.cursor])return false;
      if(this.grains[g]!==type||!this.grainNeighbors(g).some(n=>!this.grains[n]))throw new Error('露出した砂粒だけを掘れます');
      this.grains[g]=0;this.grainRoom[g]=job.rid;this.grainPending[g]=1;
      const p=GRAIN.center(g),body=this.physics.spawn('soil',p.x,p.y,{carrier:job.ant,source:g,material:type,state:'pickup'});
      job.cursor++;job.pickup=body.id;job.stroke=0;
      const cell=idx(Math.floor(p.x),Math.floor(p.y));
      this.stats.grainDug++;this.revision++;this.syncCell(cell);this.invalidateNavigation(cell);
      return true;
    }
    finishDig(job,ant) {
      this.loose[job.target]++;this.stats.dug++;this.revision++;
      ant.cargo={kind:'soil',source:job.target};
      const route=job.escape;if(!route)throw new Error('帰路を予約していない掘削です');
      ant.path=route;ant.next=0;ant.task='haul';job.phase='haul';
    }
    dumpSite() {
      // Extend the actual dumping area outwards before a tall heap can slide
      // back into the entrance. The carrier walks to the selected place.
      for(let x=this.drop%W;x<W-5;x++)if(this.surfacePoint(x+.5).y>=SURFACE-3.5)return idx(x,SURFACE-1);
      let best=this.drop;
      for(let x=this.drop%W;x<W-5;x++)if(this.surfacePoint(x+.5).y>this.surfacePoint(best%W+.5).y)best=idx(x,SURFACE-1);
      return best;
    }
    digMotion(ant) {
      const job=this.jobs.find(j=>j.id===ant.job);
      if(!job||job.phase!=='dig'||job.pickup!==null)return 0;
      const progress=clamp(job.stroke/job.costs[job.cursor],0,1);
      return progress<.25?0:progress<.75?1.9:3.7;
    }
    capacities() {
      const c = this.rawCapacities(); return { larvae: Math.floor(c.larvae), food: Math.floor(c.food) };
    }
    rawCapacities() {
      if (this._capacityRevision !== this.revision) {
        let larvae = 0, food = 0;
        for (let g = 0; g < FINE_SIZE; g++) if (!this.grains[g] && !this.grainPending[g]) {
          if (this.grainRoom[g]>=2) {const kind=this.roomKind(this.grainRoom[g]);if(kind==='egg')larvae++;else if(kind==='food')food++;}
        }
        this._capacity = { larvae: larvae * GRAIN_AREA, food: food * 2 * GRAIN_AREA }; this._capacityRevision = this.revision;
      }
      return this._capacity;
    }
    // loose tracks pending capacity credit, not a second pile left on the floor.
    passable(i) { return i >= 0 && i < SIZE && this.terrain[i] === 0; }
    surfacePoint(x){
      if(!this.physics)return {x,y:SURFACE-.9};
      let top=SURFACE;
      const halfBody=ANT_SIZE*.5;
      for(let gx=Math.floor((x-halfBody)*GRID);gx<=Math.floor((x+halfBody)*GRID);gx++)for(let gy=0;gy<SURFACE*GRID;gy++){
        if(this.physics.soilCells.has(gy*FW+gx)){top=Math.min(top,gy/GRID);break;}
      }
      return {x,y:top<SURFACE?Math.max(.8,top-.9):SURFACE-.9};
    }
    clearance(x,y) {
      let best=.9;
      for(let gy=Math.floor((y-.9)*GRID);gy<=Math.floor((y+.9)*GRID);gy++)for(let gx=Math.floor((x-.9)*GRID);gx<=Math.floor((x+.9)*GRID);gx++){
        if(gx>=0&&gx<FW&&gy>=0&&gy<FH&&!this.grains[gy*FW+gx])continue;
        const dx=Math.max(gx/GRID-x,0,x-(gx+1)/GRID),dy=Math.max(gy/GRID-y,0,y-(gy+1)/GRID);
        best=Math.min(best,Math.hypot(dx,dy));
      }
      return best;
    }
    initObjects(saved) {
      this.physics=new Physics.World((x,y)=>this.soilAt(x,y),W,H,GRAIN.size);
      if(saved!==undefined)this.physics.restore(saved);else this.syncContents(false);
    }
    contentSite(kind,k,rid=this.destinationRoom(kind)) {
      const shape=Physics.SHAPES[kind],key=kind+':'+rid;
      if(!this._contentSlots)this._contentSlots=new Map();
      if(!this._contentSlots.has(key)){
        let minX=W,maxX=0,minY=H,maxY=0;
        for(let g=0;g<FINE_SIZE;g++)if(!this.grains[g]&&this.grainRoom[g]===rid){const p=GRAIN.origin(g);minX=Math.min(minX,p.x);maxX=Math.max(maxX,p.x+GRAIN.size);minY=Math.min(minY,p.y);maxY=Math.max(maxY,p.y+GRAIN.size);}
        const slots=[],stepX=shape.hx*2+.015,stepY=shape.hy*2+.015;
        for(let y=minY+shape.hy;y<maxY-shape.hy;y+=stepY)for(let x=minX+shape.hx;x<maxX-shape.hx;x+=stepX){
          const test={kind,x,y};if(this.grainRoom[GRAIN.at(x,y)]===rid&&!this.physics.terrainOverlap(test))slots.push({x,y});
        }
        this._contentSlots.set(key,slots);
      }
      return this._contentSlots.get(key).find(p=>!this.physics.terrainOverlap({kind,...p})&&!this.physics.penetration({kind,...p}))||null;
    }
    syncContents(incoming=true) {
      if(!this._arrivalSites){
        this._arrivalSites=[];
        for(let y=.5;y<SURFACE-.2;y+=.4375)for(let x=.5;x<W-.3;x+=.5625)this._arrivalSites.push({x,y});
        this._arrivalSites.sort((a,b)=>Math.abs(a.x-50.5)+Math.abs(a.y-4.5)*.5-Math.abs(b.x-50.5)-Math.abs(b.y-4.5)*.5||a.y-b.y||a.x-b.x);
      }
      let arrival=0;
      const arrivalSite=kind=>{
        while(arrival<this._arrivalSites.length){const p=this._arrivalSites[arrival++],test={kind,...p};if(!this.physics.terrainOverlap(test)&&!this.physics.penetration(test))return p;}
        return {x:50.5,y:1};
      };
      for(const [kind,count] of [['egg',this.demands.larvae],['food',this.demands.food]]){
        const current=this.physics.bodies.filter(b=>b.kind===kind);
        // Scenario controls remove actual items as well as demand; never leave hidden duplicates.
        for(const b of current.slice(count)){
          for(const a of this.ants)if(a.itemTask?.body===b.id){delete a.itemTask;a.path=[];a.next=0;}
          this.physics.remove(b);
        }
        for(let k=current.length;k<count;k++){
          const site=incoming?null:this.contentSite(kind,k),waiting=incoming||!site;
          const p=site||arrivalSite(kind);
          const b=this.physics.spawn(kind,p.x,p.y,{state:waiting?'incoming':'stored'});
          if(waiting)this.physics.placeObject(b);
        }
      }
    }
    updateCarriers() {
      for(const b of this.physics.bodies)if(b.carrier){
        const a=this.ants.find(a=>a.id===b.carrier)??this.enemyById?.(b.carrier),owner=this.jobs.find(j=>j.id===a.job),slot=b.kind==='soil'?owner.grains.indexOf(b.source):0,end=this.cargoPoint(a,b.kind,slot);
        const job=b.state==='pickup'?this.jobs.find(j=>j.id===a.job):null;
        if(job){const route=[GRAIN.center(b.source),...job.pickupRoutes[slot],end],lengths=route.slice(1).map((p,k)=>Math.hypot(p.x-route[k].x,p.y-route[k].y));let remaining=lengths.reduce((a,b)=>a+b,0)*clamp(job.stroke/PICKUP_SECONDS,0,1),k=0;
          while(k<lengths.length-1&&remaining>lengths[k])remaining-=lengths[k++];const t=lengths[k]?remaining/lengths[k]:1;b.x=route[k].x+(route[k+1].x-route[k].x)*t;b.y=route[k].y+(route[k+1].y-route[k].y)*t;
        }else{b.x=end.x;b.y=end.y;}
        b.vx=b.vy=0;b.rest=0;this.physics.index(b);
      }
    }
    mouthPoint(a){const theta=renderAngle(a.angle);return {x:a.x+Math.cos(theta)*ANT_SIZE*.55,y:a.y+Math.sin(theta)*ANT_SIZE*.55};}
    cargoPoint(a,kind,slot=0,count=this.jobs.find(j=>j.id===a.job)?.grains.length||4){const p=this.mouthPoint(a),offset=kind==='soil'?loadOffsets(count)[slot]:[0,0];return {x:p.x+offset[0],y:p.y+offset[1]};}
    itemAccess(body) {
      const out=[];
      for(let h=0;h<16;h++){const angle=h*Math.PI/8,pose={x:body.x-Math.cos(angle)*ANT_SIZE*.55,y:body.y-Math.sin(angle)*ANT_SIZE*.55,angle};
        if(pose.y<SURFACE&&this.soilAt(pose.x,SURFACE+.01)&&pose.y>this.surfacePoint(pose.x).y+.02)continue;
        if(this.poseClear(pose,body.kind))out.push({cell:idx(Math.floor(pose.x),Math.floor(pose.y)),pose,d:0});}
      return out;
    }
    receivingRoom(body) {
      const rid=body.kind==='egg'?2:3,key=body.kind==='egg'?'larvae':'food',ready=this.destinationRoom(body.kind)===rid&&this.transportReady(rid)&&this.capacities()[key]>=this.demands[key];
      if(ready){
        const capacity=this.capacities()[key];
        const stored=this._storageLedger?.tick===this.ticks?this._storageLedger.stored[rid]:this.physics.bodies.filter(b=>b.kind===body.kind&&!b.carrier&&this.grainRoom[GRAIN.at(b.x,b.y)]===rid).length;
        const reserved=this._storageLedger?.tick===this.ticks?this._storageLedger.reserved[rid]:this.ants.filter(a=>a.itemTask?.rid===rid).length;
        if(stored+reserved<capacity)return rid;
      }
      return this.grainRoom[GRAIN.at(body.x,body.y)]===1?null:1;
    }
    dropMemo(){
      // A landing depends on terrain and on the resting objects only. Reuse
      // answers until a grain, a room tag or any free object changes.
      let m=this._dropMemo,same=m?.revision===this.revision;
      if(same){const s=m.snap;let k=0;for(const b of this.physics.bodies)if(!b.carrier){if(s[k]!==b.id||s[k+1]!==b.x||s[k+2]!==b.y||s[k+3]!==b.bin||s[k+4]!==b.kind){same=false;break;}k+=5;}if(same&&k!==s.length)same=false;}
      if(!same){const snap=[];for(const b of this.physics.bodies)if(!b.carrier)snap.push(b.id,b.x,b.y,b.bin,b.kind);m=this._dropMemo={revision:this.revision,snap,drops:new Map()};}
      return m.drops;
    }
    reachOutAt(i,point,kind){
      let m=this._reachOut;if(m?.revision!==this.revision)m=this._reachOut={revision:this.revision,at:new Map()};
      const key=i*8+DROP_KINDS[kind];let out=m.at.get(key);if(!out)m.at.set(key,out=this.storageReachOut(point,kind));return out;
    }
    storageReachOut(point,kind){
      // The swing of the mouth and the floor beneath it are terrain alone.
      const {hy,hx}=Physics.SHAPES[kind],out=[];
      for(let d=0;d<16;d++){
        const angle=d*Math.PI/8,x=point.x+Math.cos(angle)*ANT_SIZE*.55,y=point.y+Math.sin(angle)*ANT_SIZE*.55;
        if(!this.sweptClear({...point,angle:point.angle??angle},{...point,angle},kind)||this.physics.terrainOverlap({kind,x,y}))continue;
        let floor=-1;
        for(let gy=Math.ceil((y+hy-1e-7)*GRID);gy<FH&&floor<0;gy++)for(let gx=Math.floor((x-hx+1e-7)*GRID);gx<=Math.floor((x+hx-1e-7)*GRID);gx++)if(this.grains[gy*FW+gx]){floor=gy;break;}
        out.push({angle,x,y,floor});
      }
      return out;
    }
    storageDrop(rid,point,kind,reach=this.storageReachOut(point,kind)) {
      const {hx,hy}=Physics.SHAPES[kind],stock=this.physics.bodies.filter(b=>b.kind===kind&&!b.carrier),choices=[];
      // Only objects in the columns under the mouth can raise the landing.
      const under=this.physics.bodies.filter(b=>!b.carrier&&Math.abs(point.x-b.x)<hx+Physics.SHAPES[b.kind].hx+ANT_SIZE*.55+.01);
      for(const {angle,x,y,floor} of reach){
        if(this.physics.penetration({kind,x,y})>1e-7||floor<0)continue;
        let landing=floor*GRAIN.size-hy;
        // The first support can be an existing egg or food pile, above the
        // bare floor. Judge the actual resting place, including other kinds.
        for(const b of under){const shape=Physics.SHAPES[b.kind],top=b.y-shape.hy;
          if(Math.abs(x-b.x)<hx+shape.hx-1e-7&&top>=y+hy-1e-7)landing=Math.min(landing,top-hy);
        }
        if(this.grainRoom[GRAIN.at(x,landing)]===rid&&!this.physics.terrainOverlap({kind,x,y:landing})&&this.physics.penetration({kind,x,y:landing})<=1e-7){
          const density=stock.reduce((sum,b)=>sum+Math.exp(-((x-b.x)**2+(landing-b.y)**2)/1.5),0);
          choices.push({angle,x,y,landing,score:density+(landing-y)*.03});
        }
      }
      return choices.sort((a,b)=>a.score-b.score||a.angle-b.angle)[0]||null;
    }
    storageDestination(rid,ant,kind) {
      // Other carriers' destinations are read once per search, not per cell.
      const memo=this.dropMemo(),others=[],storing=new Map();for(const a of this.ants)if(a.itemTask?.phase==='store'){const d=a.itemTask.destination;storing.set(d,(storing.get(d)||0)+1);if(a.id!==ant.id)others.push(this.walkPoint(d));}
      const cells=[];for(const i of this.cells(rid)){if(!this.walkable(i))continue;const p=this.walkPoint(i);if(others.some(q=>Math.hypot(p.x-q.x,p.y-q.y)<.9))continue;const key=(i*256+rid)*8+DROP_KINDS[kind];let drop=memo.get(key);if(drop===undefined)memo.set(key,drop=this.storageDrop(rid,p,kind,this.reachOutAt(i,p,kind)));if(drop)cells.push({i,drop,score:drop.score+(storing.get(i)||0)*2+distance(ant.cell,i)*.015+this.traffic[i]*.015});}
      const score=c=>c.score;
      if(!this._storageReach)this._storageReach=new Map();
      for(const c of cells.sort((a,b)=>score(a)-score(b)||a.i-b.i)){
        const p=this.walkPoint(c.i),key=[kind,p.x,p.y,p.angle].join(':'),cached=this._storageReach.get(key);
        // A local standing pose is insufficient: a carried egg must reach it
        // through the actual throat of the chamber. Removed soil cannot make
        // a successful route invalid; unsuccessful checks retry after digging.
        const reachable=cached?.ok||cached?.revision===this.revision?cached.ok:!!this.path({x:48.25,y:24.25,angle:0},p,kind);
        this._storageReach.set(key,{ok:reachable,revision:this.revision});if(reachable)return c.i;
      }return undefined;
    }
    storageRoute(ant,destination,kind){
      return this.path(ant,destination,kind);
    }
    stepItemTask(ant,dt,occupancy) {
      if(!ant.itemTask){
        // Finish the current walking step before assigning another destination.
        if(ant.path.length&&!ant.returning||this.ticks%30!==0)return false;
        const owned=new Set(this.ants.filter(a=>a.itemTask).map(a=>a.itemTask.body));
        const body=(this._incoming||[]).find(b=>{if(b.state!=='incoming'||b.carrier||b.rest<30||owned.has(b.id)||this.physics.drag?.id===b.id)return false;const rid=this.receivingRoom(b);if(rid===null)return false;
          if(rid>1){const {available}=this._storageLedger;if(available[rid]===undefined)available[rid]=this.storageDestination(rid,ant,b.kind)!==undefined;if(!available[rid])return false;}return true;});
        if(!body)return false;
        for(const p of this.itemAccess(body)){
          const route=this.path(ant,p.pose);if(route===null)continue;
          ant.itemTask={body:body.id,phase:'fetch',destination:p.cell,rid:this.receivingRoom(body)};ant.path=route;ant.next=0;delete ant.returning;break;
        }
        if(!ant.itemTask)return false;
        if(this._storageLedger?.tick===this.ticks&&ant.itemTask.rid>1){this._storageLedger.reserved[ant.itemTask.rid]++;this._storageLedger.busy[ant.itemTask.rid]=true;}
      }
      const task=ant.itemTask,body=this.physics.byId.get(task.body);ant.task=task.phase==='fetch'?'travel':'haul';
      if(!body){delete ant.itemTask;return false;}
      if(task.phase==='fetch'){
        if(this.move(ant,dt,occupancy)){
          if(Math.hypot(ant.x-body.x,ant.y-body.y)>1.6||this.physics.drag?.id===body.id){delete ant.itemTask;return true;}
          body.carrier=ant.id;body.state='cargo';body.rest=0;
          const dest=this.storageDestination(task.rid,ant,body.kind),route=dest===undefined?null:this.storageRoute(ant,dest,body.kind);
          if(route===null){this.physics.release(body);body.state='incoming';delete ant.itemTask;return true;}
          task.phase='store';task.destination=dest;ant.path=route;ant.next=0;
        }
      }else if(this.move(ant,dt,occupancy)){
        // Release at the actual mouth, then gravity places it on the room floor.
        const drop=this.storageDrop(task.rid,ant,body.kind);
        if(!drop){
          const dest=this.storageDestination(task.rid,ant,body.kind);
          if(dest!==undefined){const route=this.storageRoute(ant,dest,body.kind);if(route){task.destination=dest;ant.path=route;ant.next=0;}}
          else if(task.rid>1){
            // A changing pile can occupy the planned landing spot. Carry the
            // same item back to staging instead of blocking every nearby dig
            // face while waiting for that chamber to become larger.
            const staging=this.storageDestination(1,ant,body.kind),route=staging===undefined?null:this.storageRoute(ant,staging,body.kind);
            if(route){task.rid=1;task.destination=staging;ant.path=route;ant.next=0;}
          }
          return true;
        }
        ant.angle=drop.angle;
        this.updateCarriers();this.physics.release(body,0,0);body.state='stored';delete ant.itemTask;ant.wait=.3;
      }
      return true;
    }
    scenario(name) {
      const c = this.capacities();
      if (name === 'nursery') this.demands = { larvae: c.larvae + 42, food: Math.min(100, c.food) };
      else if (name === 'food') this.demands = { larvae: Math.min(45, c.larvae), food: c.food + 100 };
      else if (name === 'both') this.demands = { larvae: c.larvae + 42, food: c.food + 100 };
      else throw new Error('不明な状況です');
      this.log(name === 'nursery' ? '幼虫が増えました。育児室に余裕が必要です。' : name === 'food' ? '食料が増えました。貯蔵スペースが必要です。' : '幼虫と食料が増えました。両方の空間が必要です。');
      this.syncContents(true);this.planAt = this.time;
    }
    add(kind) {
      if (kind === 'larvae') this.demands.larvae = Math.min(800, this.demands.larvae + 24);
      else if (kind === 'food') this.demands.food = Math.min(1600, this.demands.food + 40);
      else throw new Error('不明な資源です');
      this.syncContents(true);this.planAt = this.time;
      this.log(kind === 'larvae' ? '幼虫が24匹増えました。' : '食料が40増えました。');
    }
    storagePressure(rid) {
      const kind=this.roomKind(rid),stock=this.physics.bodies.filter(b=>b.kind===kind&&!b.carrier&&this.grainRoom[GRAIN.at(b.x,b.y)]===rid);
      const floor=stock.length?stock.map(b=>b.y+Physics.SHAPES[b.kind].hy).sort((a,b)=>a-b)[Math.floor((stock.length-1)*.8)]:this.rooms[rid].y+1.5;
      return {stock,floor};
    }
    // A pose includes the visible body and the actual object at the mouth.
    // The sampled outline has a safety margin larger than its sampling gaps.
    poseClear(p,kind=null,ignore=-1,margin=.045) {
      const h=((Math.round(p.angle/(Math.PI/8))%16)+16)%16;
      // A result records either clear air or the exact grain blocking this
      // immutable pose. Terrain only loses grains, so unrelated excavation
      // cannot change either answer. Cache booleans, never a chosen route.
      let cache=null,key=null;
      if(ignore===-1&&margin===.045){
        cache=this._poseChecks||(this._poseChecks=new Map());key=[p.x,p.y,h,kind||'body'].join(':');const old=cache.get(key);
        if(old===-1)return true;if(old===-2||old>=0&&this.grains[old]){this._block=old;return false;}
      }
      const answer=(ok,block=-2)=>{if(!ok)this._block=block;if(cache){if(cache.size>100000)cache.clear();cache.set(key,ok?-1:block);}return ok;};
      if(kind){const shape=carryShape(kind),a=h*Math.PI/8,x=p.x+Math.cos(a)*ANT_SIZE*.55,y=p.y+Math.sin(a)*ANT_SIZE*.55;
        for(let gy=Math.floor((y-shape.hy+1e-7)*GRID);gy<=Math.floor((y+shape.hy-1e-7)*GRID);gy++)for(let gx=Math.floor((x-shape.hx+1e-7)*GRID);gx<=Math.floor((x+shape.hx-1e-7)*GRID);gx++){const g=gy*FW+gx;if(g!==ignore&&(gx<0||gx>=FW||gy<0||gy>=FH||this.grains[g]))return answer(false,gx<0||gx>=FW||gy<0||gy>=FH?-2:g);}
      }
      if(!this._poseSamples)this._poseSamples=new Map();
      const sampleKey=h+':'+margin;let samples=this._poseSamples.get(sampleKey);
      if(!samples){
        const a=h*Math.PI/8,c=Math.cos(a),s=Math.sin(a);samples=[];
        for(const [cx,rx,ry] of ANT_BODY){
          const ax=rx*ANT_SIZE+margin,ay=ry*ANT_SIZE+margin;
          for(let y=-ay;y<=ay+.001;y+=.055)for(let x=-ax;x<=ax+.001;x+=.055)if(x*x/(ax*ax)+y*y/(ay*ay)<=1)samples.push([(x+cx*ANT_SIZE)*c-y*s,(x+cx*ANT_SIZE)*s+y*c]);
          for(let k=0;k<64;k++){const t=k*Math.PI/32,x=cx*ANT_SIZE+Math.cos(t)*ax,y=Math.sin(t)*ay;samples.push([x*c-y*s,x*s+y*c]);}
        }
        this._poseSamples.set(sampleKey,samples);
      }
      // Broad phase: most clear poses need only the occupied grain cells in
      // three small ellipse bounds, rather than every dense outline sample.
      // An analytic ellipse/cell intersection can only request the original
      // check below; it never replaces a possible collision with clear air.
      if(!this._bodyBounds)this._bodyBounds=new Map();let bounds=this._bodyBounds.get(sampleKey);
      if(!bounds){const a=h*Math.PI/8,c=Math.cos(a),s=Math.sin(a);bounds=ANT_BODY.map(([cx,rx,ry])=>{const ax=rx*ANT_SIZE+margin,ay=ry*ANT_SIZE+margin,A=c*c/(ax*ax)+s*s/(ay*ay),B=c*s*(1/(ax*ax)-1/(ay*ay)),C=s*s/(ax*ax)+c*c/(ay*ay);return {x:cx*ANT_SIZE*c,y:cx*ANT_SIZE*s,ex:Math.hypot(ax*c,ay*s),ey:Math.hypot(ax*s,ay*c),A,B,C};});this._bodyBounds.set(sampleKey,bounds);}
      let possible=false;
      for(const e of bounds){const cx=p.x+e.x,cy=p.y+e.y;
        if(cx-e.ex<.15||cx+e.ex>W-.15||cy-e.ey<.15||cy+e.ey>H-.15){possible=true;break;}
        for(let gy=Math.floor((cy-e.ey)*GRID);gy<=Math.floor((cy+e.ey)*GRID)&&!possible;gy++)for(let gx=Math.floor((cx-e.ex)*GRID);gx<=Math.floor((cx+e.ex)*GRID);gx++){
          const g=gy*FW+gx;if(g===ignore||!this.grains[g])continue;
          const x0=gx/GRID-cx,x1=x0+GRAIN.size,y0=gy/GRID-cy,y1=y0+GRAIN.size,{A,B,C}=e;
          if(x0<=0&&x1>=0&&y0<=0&&y1>=0){possible=true;break;}
          let q=Infinity;for(const x of [x0,x1]){const y=clamp(-B*x/C,y0,y1);q=Math.min(q,A*x*x+2*B*x*y+C*y*y);}for(const y of [y0,y1]){const x=clamp(-B*y/A,x0,x1);q=Math.min(q,A*x*x+2*B*x*y+C*y*y);}
          if(q<=1+1e-9){possible=true;break;}
        }if(possible)break;
      }
      if(!possible)return answer(true);
      for(const [dx,dy] of samples){const x=p.x+dx,y=p.y+dy;if(x<.15||x>W-.15||y<.15||y>H-.15)return answer(false);const g=GRAIN.at(x,y);if(g!==ignore&&this.grains[g])return answer(false,g);}
      return answer(true);
    }
    surfaceFlip(a,b){return Math.hypot(a.x-b.x,a.y-b.y)<1e-7&&a.y<SURFACE&&b.y<SURFACE&&Math.abs(a.x-this.entrance.x)>2&&this.soilAt(a.x,SURFACE+.01)&&Math.abs(Math.sin(a.angle))<.7&&Math.abs(Math.sin(b.angle))<.7&&Math.cos(a.angle)*Math.cos(b.angle)<0;}
    sweptClear(a,b,kind=null,ignore=-1,margin=.045){
      let cache=null,key=null;if(ignore===-1&&margin===.045){cache=this._sweepChecks||(this._sweepChecks=new Map());key=[a.x,a.y,a.angle,b.x,b.y,b.angle,kind||'body'].join(':');const old=cache.get(key);if(old===1)return true;if(old===0){this._block=-2;return false;}if(old>=2&&this.grains[old-2]){this._block=old-2;return false;}if(old===-this.revision){this._block=undefined;return false;}}
      this._block=undefined;
      const answer=ok=>{const block=this._block;if(cache){if(cache.size>40000)cache.clear();cache.set(key,ok?1:block===-2?0:block>=0?block+2:-this.revision);}return ok;};
      // A side-view worker turns left/right around the ground normal, rather
      // than rotating its head through the floor of this 2D cross-section.
      if(this.surfaceFlip(a,b))return answer(this.poseClear(a,kind,ignore,margin)&&this.poseClear(b,kind,ignore,margin)&&(!kind||this.cargoSweep(this.mouthPoint(a),this.mouthPoint(b),kind,ignore)));
      const da=Math.atan2(Math.sin(b.angle-a.angle),Math.cos(b.angle-a.angle)),n=Math.max(1,Math.ceil(Math.hypot(b.x-a.x,b.y-a.y)/.04),Math.ceil(Math.abs(da)/(Math.PI/32)));
      // The sprite/body changes discretely at 16 heading boundaries. Test both
      // silhouettes at each exact change, even when regular samples skip it.
      if(Math.abs(da)>1e-10){const lo=Math.min(a.angle,a.angle+da),hi=Math.max(a.angle,a.angle+da),unit=Math.PI/8;
        for(let h=Math.floor(lo/unit-.5);h<=Math.ceil(hi/unit-.5);h++){const angle=(h+.5)*unit,t=(angle-a.angle)/da;if(t<=0||t>=1)continue;const p={x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t};
          if(!this.poseClear({...p,angle:angle-1e-8},kind,ignore,margin)||!this.poseClear({...p,angle:angle+1e-8},kind,ignore,margin))return answer(false);
        }
      }
      // Cargo translates at a fixed rendered heading, then changes heading
      // exactly at its boundary. Sample-to-sample chords depend on step size
      // and can miss the jump, so sweep each whole interval and each jump.
      if(kind){const cuts=[0,1],unit=Math.PI/8;
        if(Math.abs(da)>1e-10){const lo=Math.min(a.angle,a.angle+da),hi=Math.max(a.angle,a.angle+da);
          for(let h=Math.floor(lo/unit-.5);h<=Math.ceil(hi/unit-.5);h++){const t=((h+.5)*unit-a.angle)/da;if(t>0&&t<1)cuts.push(t);}
        }cuts.sort((x,y)=>x-y);let previous=this.mouthPoint(a);
        for(let i=1;i<cuts.length;i++){const lo=cuts[i-1],hi=cuts[i],h=renderAngle(a.angle+da*(lo+hi)/2),mouth=t=>({x:a.x+(b.x-a.x)*t+Math.cos(h)*ANT_SIZE*.55,y:a.y+(b.y-a.y)*t+Math.sin(h)*ANT_SIZE*.55}),start=mouth(lo),end=mouth(hi);
          if(!this.cargoSweep(previous,start,kind,ignore)||!this.cargoSweep(start,end,kind,ignore))return answer(false);previous=end;
        }if(!this.cargoSweep(previous,this.mouthPoint(b),kind,ignore))return answer(false);
      }
      for(let k=0;k<=n;k++){const t=k/n,p={x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,angle:a.angle+da*t};if(!this.poseClear(p,kind,ignore,margin))return answer(false);
      }return answer(true);
    }
    cargoSweep(a,b,kind,ignore=-1,single=false){
      const block=this.sweptCargoCells(a,b,kind,single).find(g=>g!==ignore&&this.grains[g]);if(block===undefined)return true;this._block=block;return false;
    }
    sweptCargoCells(a,b,kind,single=false){
      const {hx,hy}=single?Physics.SHAPES[kind]:carryShape(kind),dx=b.x-a.x,dy=b.y-a.y;
      const out=[];
      for(let gy=Math.floor((Math.min(a.y,b.y)-hy+1e-7)*GRID);gy<=Math.floor((Math.max(a.y,b.y)+hy-1e-7)*GRID);gy++)for(let gx=Math.floor((Math.min(a.x,b.x)-hx+1e-7)*GRID);gx<=Math.floor((Math.max(a.x,b.x)+hx-1e-7)*GRID);gx++){
        const g=gy*FW+gx;
        let lo=0,hi=1;for(const [v,d,min,max] of [[a.x,dx,gx/GRID-hx+1e-7,(gx+1)/GRID+hx-1e-7],[a.y,dy,gy/GRID-hy+1e-7,(gy+1)/GRID+hy-1e-7]]){
          if(Math.abs(d)<1e-12){if(v<min||v>max){hi=-1;break;}}else{const p=(min-v)/d,q=(max-v)/d;lo=Math.max(lo,Math.min(p,q));hi=Math.min(hi,Math.max(p,q));}
        }if(hi>=lo)out.push(g);
      }return out;
    }
    carriedKind(a){const j=this.jobs.find(j=>j.id===a.job);return a.cargo||j?.cursor?soilNavKind(j?.grains.length||4):a.itemTask?.phase==='store'?this.physics.byId.get(a.itemTask.body)?.kind:null;}
    invalidateNavigation(cell){
      if(this._walkCache){const p=xy(cell);for(let y=p.y-2;y<=p.y+2;y++)for(let x=p.x-2;x<=p.x+2;x++)this._walkCache.delete(idx(x,y));}
      // Terrain only loses grains. Successful configuration checks stay valid.
    }
    walkPoint(i){
      if(!this._walkCache)this._walkCache=new Map();if(this._walkCache.has(i))return this._walkCache.get(i);
      const c=xy(i);let best={x:c.x+.5,y:c.y+.5,angle:0,clearance:0},score=-Infinity;
      for(const oy of [.25,.75])for(const ox of [.25,.75]){const x=c.x+ox,y=c.y+oy,clearance=this.clearance(x,y);
        for(let h=0;h<8;h++){const p={x,y,angle:h*Math.PI/4,clearance};if(this.poseClear(p,'egg')&&clearance>score){best=p;score=clearance;}}
      }
      best.valid=score>-Infinity;this._walkCache.set(i,best);return best;
    }
    walkable(i){return i>=0&&i<SIZE&&this.walkPoint(i).valid;}
    laneWidth(history,k){const a=history[k].angle;let turn=0;for(let n=Math.max(0,k-4);n<=Math.min(history.length-1,k+4);n++)turn=Math.max(turn,Math.abs(Math.atan2(Math.sin(history[n].angle-a),Math.cos(history[n].angle-a))));return LANE_OFFSET+CURVE_LANE_EXTRA*Math.min(1,turn/(Math.PI/4));}
    transportProfile(history){
      if(history===this._entryHistory||history===this.entranceHistory)return null;
      // Histories only grow by push, rock never opens and a lane width looks
      // four poses along. Rows before the last four of a shorter solution are
      // unchanged, so resume the same DP there rather than from the shaft.
      if(!this._transportProfiles)this._transportProfiles=new WeakMap();const old=this._transportProfiles.get(history);if(old?.length===history.length)return old.shifts;
      const resume=old&&old.length<history.length&&history[old.length-1]===old.last?Math.min(old.rows.length,Math.max(0,old.length-4)):0;
      const rows=resume?old.rows.slice(0,resume):[],blocked=grains=>grains.some(g=>this.grains[g]===ROCK),keep=shifts=>{this._transportProfiles.set(history,{length:history.length,shifts,rows,last:history.at(-1)});return shifts;};
      for(let k=resume;k<history.length;k++){const p=history[k],w=this.laneWidth(history,k),row=[];
        for(const shift of [0,.25,-.25,.5,-.5,.75,-.75,1,-1]){if(blocked(this.transportFootprint(p,p,w,w,shift,shift)))continue;let cost=Math.abs(shift)*.2,parent=-1;
          if(k){let best=Infinity;for(let n=0;n<rows[k-1].length;n++){const prev=rows[k-1][n];if(Math.abs(prev.shift-shift)>.251||blocked(this.transportFootprint(history[k-1],p,this.laneWidth(history,k-1),w,prev.shift,shift)))continue;const score=prev.cost+cost+Math.abs(prev.shift-shift);if(score<best){best=score;parent=n;}}if(parent<0)continue;cost=best;}
          row.push({shift,cost,parent});
        }if(!row.length)return keep(null);rows.push(row);
      }
      let n=rows.at(-1).reduce((best,v,k,a)=>v.cost<a[best].cost?k:best,0);const shifts=[];for(let k=rows.length-1;k>=0;k--){const q=rows[k][n];shifts.push(q.shift);n=q.parent;}shifts.reverse();return keep(shifts);
    }
    laneSpine(history,reverse,kind,lo=0,hi=history.length-1,backward=false){
      if(!this._lanes)this._lanes=new WeakMap();let cache=this._lanes.get(history);if(!cache)this._lanes.set(history,cache=new Map());
      const key=[history.length,lo,hi,reverse,kind,backward,history===this._entryHistory?'shaft':'lane'].join(':'),old=cache.get(key);if(old&&(history===this._entryHistory||old.deps.every(g=>g===-2||g>=0&&this.grains[g])))return old.out;const deps=[];
      const indices=Array.from({length:hi-lo+1},(_,k)=>lo+k);if(reverse)indices.reverse();const points=indices.map(k=>history[k]),rows=[],profile=this.transportProfile(history);
      for(let k=0;k<points.length;k++){
        const p=points[k],width=this.laneWidth(history,indices[k]),travel=renderAngle(Math.atan2(Math.sin(p.angle+(reverse?Math.PI:0)),Math.cos(p.angle+(reverse?Math.PI:0)))),angle=backward?p.angle:travel,row=[];
        for(const offset of [...new Set([width,Math.max(LANE_OFFSET,width-.1),LANE_OFFSET,.3,.2,.1,0])]){
          const shift=profile?.[indices[k]]||0,q={x:p.x-Math.sin(p.angle)*shift-Math.sin(travel)*offset,y:p.y+Math.cos(p.angle)*shift+Math.cos(travel)*offset,angle};if(!this.poseClear(q,kind)){deps.push(this._block);continue;}
          let cost=(width-offset)*.2,parent=-1;
          if(k){let best=Infinity;for(let n=0;n<rows[k-1].length;n++){const prev=rows[k-1][n];if(!this.sweptClear(prev.q,q,kind)){deps.push(this._block);continue;}const score=prev.cost+cost+Math.hypot(prev.q.x-q.x,prev.q.y-q.y)*.01;if(score<best){best=score;parent=n;}}if(parent<0)continue;cost=best;}
          row.push({q,cost,parent});
        }
        if(!row.length){cache.set(key,{out:null,deps});return null;}rows.push(row);
      }
      let n=rows.at(-1).reduce((best,v,k,a)=>v.cost<a[best].cost?k:best,0);const out=[];
      for(let k=rows.length-1;k>=0;k--){const v=rows[k][n];out.push(v.q);n=v.parent;}out.reverse();
      if(cache.size>12)cache.clear();cache.set(key,{out,deps});return out;
    }
    alongHistory(a,p,history,fromIndex,toIndex,kind){
      const reverse=fromIndex>toIndex;
      // At a fresh face the head already points into the branch. Withdraw in
      // the outbound lane before turning in a room; do not plan a 180-degree
      // loop through a narrow lane merely to face the direction of travel.
      const withdraw=reverse&&history!==this._entryHistory&&Math.cos(a.angle-history[fromIndex].angle)>.5;
      for(const backward of reverse&&history!==this._entryHistory?(withdraw?[true,false]:[false,true]):[false]){
      const spine=this.laneSpine(history,reverse,kind,Math.min(fromIndex,toIndex),Math.max(fromIndex,toIndex),backward);
      if(spine){let points=spine,left;
        if(history===this._entryHistory&&reverse&&fromIndex===history.length-1&&a.y<SURFACE){const first=points[0],distance=Math.max(.8,(first.y-(SURFACE-1.3))/Math.max(.2,Math.sin(first.angle))),approach={x:first.x-Math.cos(first.angle)*distance,y:first.y-Math.sin(first.angle)*distance,angle:first.angle};
          const prefix=this.path(a,approach,kind,true);left=prefix&&this.sweptClear(approach,first,kind)?[...prefix,first]:null;
        }else if(history!==this._entryHistory){for(let skip=Math.min(4,points.length-1);skip>=0;skip--){left=this.path(a,points[skip],kind,true);if(left){points=points.slice(skip);break;}}}
        else left=this.path(a,points[0],kind,true);
        const right=this.path(points.at(-1),p,kind,true);
        if(left&&right)return [...left,...points.slice(1),...right];
      }}
      // A worker facing a fresh wall may withdraw without turning. This is
      // confined to the excavated branch; the surface/shaft trip stays forward.
      if(reverse&&history!==this._entryHistory){const points=history.slice(toIndex,fromIndex+1).reverse();let previous=a;const left=this.path(a,points[0],kind,true),right=this.path(points.at(-1),p,kind,true);if(left&&right){for(const q of [...left,...points.slice(1),...right]){if(!this.sweptClear(previous,q,kind))return null;previous=q;}return [...left,...points.slice(1),...right];}}
      return null;
    }
    // Sparse configuration search: half-unit positions, eight headings,
    // forward/backward steps and swept turns. Air is tested at grain resolution.
    path(from,to,kind=undefined,raw=false,depth=0){
      const route=this.planPath(from,to,kind,raw,depth);
      if(!route||raw||depth)return route;
      const start=typeof from==='number'?this.walkPoint(from):from;
      return this.shortenQueenCrossing(start,route,kind===undefined?this.carriedKind(start):kind);
    }
    shortenQueenCrossing(start,route,kind){
      // Corridor history keeps directional traffic in an excavated neck. Its
      // founding point inside the queen chamber is not a mandatory waypoint.
      // Pull only chamber runs taut, with the very same body/payload sweeps.
      const inRoom=p=>p&&this.grainRoom[GRAIN.at(p.x,p.y)]===1;
      const points=[start,...route],out=[];
      for(let i=0;i<points.length-1;){
        let end=i;
        if(inRoom(points[i]))while(end+1<points.length&&inRoom(points[end+1]))end++;
        let cut=null,target=i+1;
        for(let j=end;j>i+1;j--){
          const a=points[i],b=points[j],distance=Math.hypot(b.x-a.x,b.y-a.y),angle=renderAngle(Math.atan2(b.y-a.y,b.x-a.x));
          let old=0;for(let k=i+1;k<=j;k++)old+=Math.hypot(points[k].x-points[k-1].x,points[k].y-points[k-1].y);
          if(old-distance<.08)continue;
          let inside=true;for(let k=1,n=Math.ceil(distance/.125);k<n;k++)if(!inRoom({x:a.x+(b.x-a.x)*k/n,y:a.y+(b.y-a.y)*k/n})){inside=false;break;}
          if(!inside)continue;
          const turned={x:a.x,y:a.y,angle},arrived={x:b.x,y:b.y,angle};
          if(this.sweptClear(a,turned,kind)&&this.sweptClear(turned,arrived,kind)&&this.sweptClear(arrived,b,kind)){cut=[turned,arrived,b];target=j;break;}
        }
        if(cut)out.push(...cut);else out.push(points[target]);i=target;
      }
      return out;
    }
    planPath(from,to,kind=undefined,raw=false,depth=0){
      const a=typeof from==='number'?this.walkPoint(from):from,p=typeof to==='number'?this.walkPoint(to):to;
      if(!a||!p||p.valid===false)return null;if(kind===undefined)kind=typeof from==='object'?this.carriedKind(from):null;
      const roomWander=typeof from==='object'&&from.job===null&&!from.itemTask&&!from.surfaceTrip&&p.valid&&p.clearance>.8&&this.grainRoom[GRAIN.at(a.x,a.y)]===1;
      if(!raw&&depth<3){
        const shaft=this._entryHistory||(this._entryHistory=this.entranceHistory),onShaft=q=>{if(q.y<SURFACE||this.grainRoom[GRAIN.at(q.x,q.y)]!==0)return null;let index=0,d=Infinity;for(let k=0;k<shaft.length;k++){const distance=Math.hypot(q.x-shaft[k].x,q.y-shaft[k].y);if(distance<d){d=distance;index=k;}}return d<1.1?index:null;},sourceShaft=onShaft(a),targetShaft=onShaft(p);
        if(sourceShaft!==null&&targetShaft!==null)return this.alongHistory(a,p,shaft,sourceShaft,targetShaft,kind);
        if(sourceShaft!==null){const end=p.y<SURFACE?shaft.length-1:0,left=this.alongHistory(a,shaft[end],shaft,sourceShaft,end,kind),right=this.path(shaft[end],p,kind,false,depth+1);return left&&right?[...left,...right]:null;}
        if(targetShaft!==null){const start=a.y<SURFACE?shaft.length-1:0,left=this.path(a,shaft[start],kind,false,depth+1),right=this.alongHistory(shaft[start],p,shaft,start,targetShaft,kind);return left&&right?[...left,...right]:null;}
        const locate=q=>{const tag=this.grainRoom[GRAIN.at(q.x,q.y)];if(tag===1||q.y<SURFACE)return null;let best=null;
          for(const rid of this.roomIds()){const b=this.builds[rid];if(!b||b.history.length<5)continue;let k=0,d=Infinity;for(let n=0;n<b.history.length;n++){const z=b.history[n],v=Math.hypot(q.x-z.x,q.y-z.y);if(v<d){d=v;k=n;}}
            if(k>3&&(d<3||tag===rid)&&(!best||d<best.d))best={b,k,d};}return best;};
        const source=locate(a),destination=locate(p);
        if(source&&destination&&source.b===destination.b){const route=this.alongHistory(a,p,source.b.history,source.k,destination.k,kind);if(route)return route;}
        else if(source||destination){const left=source?this.alongHistory(a,source.b.history[0],source.b.history,source.k,0,kind):[],right=destination?this.alongHistory(destination.b.history[0],p,destination.b.history,0,destination.k,kind):[];
          if(left&&right){const middle=this.path(source?source.b.history[0]:a,destination?destination.b.history[0]:p,kind,false,depth+1);if(middle)return [...left,...middle,...right];}
        }
      }
      if(!raw&&this.entranceHistory?.length&&(a.y<SURFACE)!==(p.y<SURFACE)){
        const history=this._entryHistory||(this._entryHistory=this.entranceHistory),outward=a.y>=SURFACE,route=this.alongHistory(a,p,history,outward?0:history.length-1,outward?history.length-1:0,kind);
        return route;
      }
      const distanceToGoal=Math.hypot(a.x-p.x,a.y-p.y),heading=renderAngle(Math.atan2(p.y-a.y,p.x-a.x));
      let roomStraight=true;if(roomWander)for(let k=0;k<=Math.ceil(distanceToGoal/.2);k++){const t=k/Math.max(1,Math.ceil(distanceToGoal/.2)),x=a.x+(p.x-a.x)*t,y=a.y+(p.y-a.y)*t;if(this.grainRoom[GRAIN.at(x,y)]!==1||this.clearance(x,y)<.82){roomStraight=false;break;}}
      for(const angle of [heading,renderAngle(heading+Math.PI),...(distanceToGoal<1.5?[a.angle]:[])]){
        const turned={x:a.x,y:a.y,angle},arrived={x:p.x,y:p.y,angle},end={x:p.x,y:p.y,angle:p.angle??angle};
        if(roomStraight&&this.sweptClear(a,turned,kind)&&this.sweptClear(turned,arrived,kind)&&this.sweptClear(arrived,end,kind))return [turned,arrived,end];
      }
      const dirs=[[1,0],[1,1],[0,1],[-1,1],[-1,0],[-1,-1],[0,-1],[1,-1]],nw=W*2;
      const encode=(x,y,h)=>((y*nw+x)*16+h),decode=id=>{const h=id%16,q=(id-h)/16,x=q%nw,y=Math.floor(q/nw);return {x:x*.5+.25,y:y*.5+.25,angle:h*Math.PI/8,ix:x,iy:y,h};};
      const goalH=p.angle===undefined?null:((Math.round(p.angle/(Math.PI/8))%16)+16)%16;
      const entries=[];
      for(let k=0;k<=6;k++){const q={x:p.x-Math.cos(p.angle||0)*k*.25,y:p.y-Math.sin(p.angle||0)*k*.25,angle:p.angle??0};if(this.sweptClear(q,{...p,angle:p.angle??0},kind))entries.push(q);}
      if(!entries.length)return null;
      const cacheKey=kind||'body';if(!this._navSafe)this._navSafe={};const safeCache=this._navSafe[cacheKey]||(this._navSafe[cacheKey]=new Int32Array(nw*H*2*16));
      const safe=id=>{const z=decode(id);if(roomWander&&(this.clearance(z.x,z.y)<.82||this.grainRoom[GRAIN.at(z.x,z.y)]!==1))return false;const c=safeCache[id];if(c===1)return true;if(c===2||c>=3&&this.grains[c-3]||c===-this.revision)return false;const ok=this.poseClear(z,kind),block=this._block;safeCache[id]=ok?1:block===-2?2:block>=0?block+3:-this.revision;return ok;};
      if(!this._navEdges)this._navEdges={};const edges=this._navEdges[cacheKey]||(this._navEdges[cacheKey]=new Map());
      const edge=(id,z,q,action)=>{const key=id*8+action,old=edges.get(key);if(old===1)return true;if(old===0||old>=2&&this.grains[old-2]||old===-this.revision)return false;const ok=this.sweptClear(z,q,kind),block=this._block;edges.set(key,ok?1:block===-2?0:block>=0?block+2:-this.revision);return ok;};
      const cells=nw*H*2*16;if(this._navCost?.length!==cells){this._navCost=new Float64Array(cells);this._navPrev=new Int32Array(cells);this._navStamp=new Uint32Array(cells);this._navGen=0;}
      const heap=[],costs=this._navCost,prevs=this._navPrev,stamp=this._navStamp,gen=this._navGen=(this._navGen+1)>>>0||1;
      const push=(id,g)=>{const z=decode(id),f=g+Math.hypot(z.x-p.x,z.y-p.y),v={id,g,f};let k=heap.length;heap.push(v);while(k){const n=(k-1)>>1;if(heap[n].f<=f)break;heap[k]=heap[n];k=n;}heap[k]=v;};
      const pop=()=>{const t=heap[0],v=heap.pop();if(heap.length){let k=0;while(k*2+1<heap.length){let n=k*2+1;if(n+1<heap.length&&heap[n+1].f<heap[n].f)n++;if(heap[n].f>=v.f)break;heap[k]=heap[n];k=n;}heap[k]=v;}return t;};
      const ah=((Math.round(a.angle/(Math.PI/8))%16)+16)%16,prefixes=new Map(),starts=[{...a,prefix:[],travel:0}];
      for(const sign of [-1,1])for(let k=1;k<=6;k++){const q={x:a.x+Math.cos(a.angle)*k*.25*sign,y:a.y+Math.sin(a.angle)*k*.25*sign,angle:a.angle};if(this.sweptClear(a,q,kind))starts.push({...q,prefix:[q],travel:k*.25});else break;}
      // A square grain in a one-grain notch first withdraws along that exposed
      // face. Starting only along the body's heading traps diagonal carriers.
      for(const [dx,dy] of dirs)for(const d of [.125,.25,.5,.75,1]){const q={x:a.x+dx*d,y:a.y+dy*d,angle:a.angle};if(this.sweptClear(a,q,kind))starts.push({...q,prefix:[q],travel:Math.hypot(dx,dy)*d});else break;}
      for(const start of starts){const cx=Math.round((start.x-.25)*2),cy=Math.round((start.y-.25)*2);
      for(let oy=-1;oy<=1;oy++)for(let ox=-1;ox<=1;ox++){
        const x=cx+ox,y=cy+oy;if(x<1||x>=nw-1||y<1||y>=H*2-1)continue;
        const id=encode(x,y,ah),z=decode(id);if(safe(id)&&this.sweptClear(start,z,kind)){const g=start.travel+Math.hypot(start.x-z.x,start.y-z.y);if(g<((stamp[id]===gen?costs[id]:Infinity))){stamp[id]=gen;costs[id]=g;prevs[id]=-1;prefixes.set(id,start.prefix);push(id,g);}}
      }}
      let end=-1,entry=null,visits=0;const limit=raw&&Math.hypot(a.x-p.x,a.y-p.y)<5?4000:24000;
      while(heap.length&&visits++<limit){const v=pop();if(v.g!==costs[v.id])continue;const z=decode(v.id);
        if(Math.hypot(z.x-p.x,z.y-p.y)<2.25&&(goalH===null||z.h===goalH))for(const q of entries)if(Math.hypot(z.x-q.x,z.y-q.y)<.8&&this.sweptClear(z,q,kind)){end=v.id;entry=q;break;}
        if(end>=0)break;
        for(const turn of [-1,1]){const h=(z.h+turn+16)%16,id=encode(z.ix,z.iy,h),q=decode(id),g=v.g+.18;
          if(g<((stamp[id]===gen?costs[id]:Infinity))&&safe(id)&&edge(v.id,z,q,turn<0?0:1)){stamp[id]=gen;costs[id]=g;prevs[id]=v.id;push(id,g);}}
        for(const sign of [1,-1])for(let k=0;k<(z.h%2?2:1);k++){const d=dirs[(Math.floor(z.h/2)+k)%8],x=z.ix+d[0]*sign,y=z.iy+d[1]*sign;if(x<1||x>=nw-1||y<1||y>=H*2-1)continue;
          const id=encode(x,y,z.h),g=v.g+Math.hypot(...d)*.5*(sign===1?1:1.08);
          if(g<((stamp[id]===gen?costs[id]:Infinity))&&safe(id)&&edge(v.id,z,decode(id),2+(sign===1?0:2)+k)){stamp[id]=gen;costs[id]=g;prevs[id]=v.id;push(id,g);}}
      }
      if(end<0)return null;const out=[];let first=end;for(let n=end;n!==-1;n=prevs[n]){first=n;const q=decode(n);out.push({x:q.x,y:q.y,angle:q.angle});}out.reverse();out.unshift(...(prefixes.get(first)||[]));
      if(entry)out.push(entry);out.push({x:p.x,y:p.y,angle:goalH===null?out.at(-1).angle:p.angle});return out;
    }
    nextTip(p,target,radius=.5,history=[],twoWay=false,allChoices=false,turns=[-1,0,1]){
      let best=null;const choices=[];
      for(const turn of turns){
        const angle=renderAngle(p.angle+turn*Math.PI/8),c=Math.cos(angle),s=Math.sin(angle);let effort=0,blocked=false;
        if(target.y<SURFACE&&s>-.3)continue;
        for(const d of (twoWay?[.5,.75,1,1.25,1.5,1.75,2,2.5,3,3.5,4,4.5]:[.5,1,1.75,2.5]))for(const side of (twoWay?[-radius,-radius*.5,0,radius*.5,radius]:[-radius,0,radius])){
          const x=p.x+c*d-s*side,y=p.y+s*d+c*side,type=this.soilAt(x,y);
          if(x<5||x>W-5||y<(target.y<SURFACE?.5:SURFACE+.5)||y>H-5){blocked=true;break;}
          if(type===ROCK||type===HARD&&!this.hardDig){if(d<=1&&!twoWay)blocked=true;effort+=8*((twoWay?5:3)-d);continue;}
          effort+=type?this.strength(GRAIN.at(x,y))*(type===HARD?1.2:1):.8;
        }
        if(blocked)continue;
        const step=.5,x=p.x+c*step,y=p.y+s*step,old=history.slice(0,-5),nearest=old.length?Math.min(...old.map(z=>Math.hypot(z.x-x,z.y-y))):Infinity;
        if(nearest<.6)continue;
        const score=Math.hypot(target.x-x,target.y-y)*1.15+effort*.35+Math.abs(turn)*.045+Math.max(0,1.5-nearest)*4;
        const footprint=twoWay?this.transportFootprint(p,{x,y,angle},LANE_OFFSET+CURVE_LANE_EXTRA,LANE_OFFSET+CURVE_LANE_EXTRA):this.tipFootprint(p,{x,y,angle});
        if(footprint.some(g=>this.grains[g]&&(!this.canExcavate(g)||this.supportsStock(g))))continue;
        const choice={x,y,angle,score};choices.push(choice);if(!best||score<best.score)best=choice;
      }
      return allChoices?choices.sort((a,b)=>a.score-b.score):best;
    }
    growEntrance(){
      // This is excavated history, never a future route mask. The founding
      // passage uses the same short look-ahead and material field as a live tip.
      const target={x:41+(hash(this.seed,19,this.seed)%6),y:SURFACE-1},history=[];
      let p={x:48,y:23,angle:-Math.PI/2};
      // Initial terrain is a constraint problem before actors exist. Remember
      // alternatives at a local dead end; never cut through rock or reseed it.
      const stack=[{pose:p,next:0,choices:null}];let visits=0;
      while(stack.length&&visits++<12000){const node=stack.at(-1);p=node.pose;if(p.y<=SURFACE+.8)break;
        if(!node.choices)node.choices=this.nextTip(p,target,.9,stack.map(n=>n.pose),true,true);
        if(node.next>=node.choices.length){stack.pop();continue;}stack.push({pose:node.choices[node.next++],next:0,choices:null});
      }
      if(!stack.length||p.y>SURFACE+.8)throw new Error('入口を作れる地形が見つかりません');history.push(...stack.map(n=>({...n.pose})));p=history.at(-1);
      // Cross the ground surface using the last heading, with no sealed cap.
      while(p.y>SURFACE-1){const q={x:p.x+Math.cos(p.angle)*.25,y:p.y+Math.sin(p.angle)*.25,angle:p.angle};for(const g of this.transportFootprint(p,q))this.grains[g]=0;p=q;history.push({...p});}
      this.entrance={x:p.x,y:SURFACE-1};this.entranceHistory=history;
      // The founding worker made the same turning and payload clearance that
      // live workers need. Widen only the actual swept grains at each bend.
      for(let k=1;k<history.length;k++)for(const g of this.transportFootprint(history[k-1],history[k],this.laneWidth(history,k-1),this.laneWidth(history,k))){
        if(this.grains[g]===ROCK)throw new Error('入口が岩と重なっています');this.grains[g]=0;
        // Existing queen-chamber air remains chamber air, including where
        // the entrance overlaps it. A height cutoff is not a chamber wall.
      }
      for(let i=0;i<SIZE;i++)this.syncCell(i);this.revision++;
    }
    ensureBuild(rid){
      if(this.builds[rid])return this.builds[rid];
      const side=(this.seed%2?1:-1)*(rid===2?1:-1),angle=rid===2?Math.PI/2-side*.65:-Math.PI/2+side*.9;
      const direction={x:Math.cos(angle),y:Math.sin(angle)},home=[];
      for(const cell of this.cells(1)){const p=this.walkPoint(cell);if(p.valid&&this.clearance(p.x,p.y)>.86){const a=rid===2?(side<0?Math.PI:0):renderAngle(angle);if(this.poseClear({...p,angle:a},'egg'))home.push({...p,angle:a,score:rid===2?(p.x-48)*side*1.5+(p.y-24)*.2:(p.x-48)*direction.x+(p.y-24)*direction.y});}}
      home.sort((a,b)=>b.score-a.score);if(!home.length)return null;
      const root=home[0],target={x:root.x+direction.x*(rid===2?9:11),y:Math.max(SURFACE+4,root.y+direction.y*(rid===2?9:11))};
      this.rooms[rid]={id:rid,x:target.x,y:target.y};
      return this.builds[rid]={tip:{x:root.x,y:root.y,angle:root.angle},target,history:[{x:root.x,y:root.y,angle:root.angle}],length:0,mode:'passage',complete:false,next:null};
    }
    // A footprint is pure geometry of its poses: no terrain, stock or actor
    // state. Planning re-derives the same lane footprints on every pass as
    // the colony grows, so reuse each result. Callers only read the grains.
    footprintMemo(key,make){if(!this._footprints)this._footprints=new Map();let out=this._footprints.get(key);if(!out){if(this._footprints.size>=FOOTPRINT_MEMO)this._footprints.clear();out=make();this._footprints.set(key,out);}return out;}
    tipFootprint(a,b){return this.footprintMemo('t:'+a.x+':'+a.y+':'+a.angle+':'+b.x+':'+b.y+':'+b.angle,()=>this.sweptTipFootprint(a,b));}
    sweptTipFootprint(a,b){
      const grains=new Set(),da=Math.atan2(Math.sin(b.angle-a.angle),Math.cos(b.angle-a.angle));
      let previous=null;
      const steps=a.x===b.x&&a.y===b.y&&da===0?0:16;
      for(let k=0;k<=steps;k++){const t=steps?k/steps:0,p={x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,angle:a.angle+da*t};
        // The short advance includes the turning sweep and mouth, with a small
        // working margin. It does not prescribe any later part of the tunnel.
        this.poseClear(p,null,-1,.09);const h=((Math.round(p.angle/(Math.PI/8))%16)+16)%16;
        for(const [x,y] of this._poseSamples.get(h+':'+.09))grains.add(GRAIN.at(p.x+x,p.y+y));
        const c=Math.cos(renderAngle(p.angle)),s=Math.sin(renderAngle(p.angle)),x=p.x+c*ANT_SIZE*.55,y=p.y+s*ANT_SIZE*.55;
        for(let gy=Math.floor((y-.28)*GRID);gy<=Math.floor((y+.28)*GRID);gy++)for(let gx=Math.floor((x-.28)*GRID);gx<=Math.floor((x+.28)*GRID);gx++)grains.add(gy*FW+gx);
        if(previous)for(const g of this.sweptCargoCells(previous,{x,y},'soil'))grains.add(g);previous={x,y};
      }return [...grains];
    }
    transportFootprint(a,b,widthA=null,widthB=null,shiftA=0,shiftB=0){return this.footprintMemo('l:'+a.x+':'+a.y+':'+a.angle+':'+b.x+':'+b.y+':'+b.angle+':'+widthA+':'+widthB+':'+shiftA+':'+shiftB,()=>this.sweptTransportFootprint(a,b,widthA,widthB,shiftA,shiftB));}
    sweptTransportFootprint(a,b,widthA,widthB,shiftA,shiftB){const turn=Math.abs(Math.atan2(Math.sin(b.angle-a.angle),Math.cos(b.angle-a.angle))),width=LANE_OFFSET+CURVE_LANE_EXTRA*Math.min(1,turn/(Math.PI/4)),grains=new Set();for(const [reverse,backward] of [[false,false],[true,false],[true,true]]){
      const offset=(p,w,shift)=>{const travel=renderAngle(p.angle+(reverse?Math.PI:0)),angle=backward?p.angle:travel;return {x:p.x-Math.sin(p.angle)*shift-Math.sin(travel)*w,y:p.y+Math.cos(p.angle)*shift+Math.cos(travel)*w,angle};};
      for(const g of this.tipFootprint(offset(a,widthA??width,shiftA),offset(b,widthB??width,shiftB)))if(g>=0&&g<FINE_SIZE)grains.add(g);
    }return [...grains];}
    pickupPath(g,pose,slot,count=1){
      const start=GRAIN.center(g),end=this.cargoPoint(pose,'soil',slot,count),routes=[[]];for(const n of this.grainNeighbors(g))if(!this.grains[n])routes.push([GRAIN.center(n)]);
      for(const route of routes){let previous=start,clear=true;for(const q of [...route,end]){if(!this.cargoSweep(previous,q,'soil',g,true)){clear=false;break;}previous=q;}if(clear)return route;}return null;
    }
    batchCandidate(candidate,drop=this.dumpSite()){
      const first=GRAIN.center(candidate.grains[0]),possible=new Set(candidate.grains);
      for(let gy=Math.floor((first.y-.65)*GRID);gy<=Math.floor((first.y+.65)*GRID);gy++)for(let gx=Math.floor((first.x-.65)*GRID);gx<=Math.floor((first.x+.65)*GRID);gx++)possible.add(gy*FW+gx);
      const candidates=[...possible].filter(g=>g>=0&&g<FINE_SIZE).sort((a,b)=>{const score=g=>g===candidate.grains[0]?-1:Math.hypot(GRAIN.center(g).x-first.x,GRAIN.center(g).y-first.y);return score(a)-score(b)||a-b;});
      for(let count=MAX_LOAD;count>=1;count--){
      if(!this.poseClear(candidate.pose,soilNavKind(count)))continue;
      const chosen=[],routes=[];
      for(const g of candidates){
        if(!this.canExcavate(g)||count>1&&this.grains[g]===PEBBLE||this.supportsStock(g)||this.jobs.some(j=>j.grains.includes(g))||!this.grainNeighbors(g).some(n=>!this.grains[n]))continue;
        if(chosen.length&&!this.grainNeighbors(g).some(n=>chosen.includes(n)))continue;
        const p=GRAIN.center(g),dx=p.x-candidate.pose.x,dy=p.y-candidate.pose.y;if(Math.hypot(dx,dy)>1.55||dx*Math.cos(candidate.pose.angle)+dy*Math.sin(candidate.pose.angle)<.6)continue;
        const route=this.pickupPath(g,candidate.pose,chosen.length,count);if(route===null)continue;chosen.push(g);routes.push(route);if(chosen.length===count)break;
      }
      if(chosen.length===count){const escape=this.path(candidate.pose,drop,soilNavKind(count));if(escape)return {...candidate,grains:chosen,pickupRoutes:routes,drop,escape};}
      }return null;
    }
    knownRoute(from,to,kind){
      if(!this._knownRoutes)this._knownRoutes=new Map();const key=from.x+':'+from.y+':'+from.angle+':'+to.x+':'+to.y+':'+to.angle+':'+kind;
      let route=this._knownRoutes.get(key);if(route)return route;route=this.path(from,to,kind);
      if(route){if(this._knownRoutes.size>=KNOWN_ROUTES)this._knownRoutes.clear();this._knownRoutes.set(key,route);}return route;
    }
    digPoseFor(g,preferred=null){
      if(!this._digPoses)this._digPoses=new Map();const preferredKey=preferred?[preferred.x,preferred.y,preferred.angle].join(':'):'',cached=this._digPoses.get(g);if(cached&&cached.revision===this.revision&&cached.preferred===preferredKey)return cached.pose;
      const z=GRAIN.center(g),candidates=[];if(!this._stands)this._stands=new Map();
      for(let iy=Math.floor((z.y-1.55)*GRID);iy<=Math.ceil((z.y+1.55)*GRID);iy++)for(let ix=Math.floor((z.x-1.55)*GRID);ix<=Math.ceil((z.x+1.55)*GRID);ix++){
        const x=ix/GRID,y=iy/GRID,dx=z.x-x,dy=z.y-y,d=Math.hypot(dx,dy);if(d<.9||d>1.55||this.soilAt(x,y))continue;
        for(let h=0;h<16;h++){const angle=h*Math.PI/8,c=Math.cos(angle),s=Math.sin(angle),along=dx*c+dy*s,side=Math.abs(dx*s-dy*c);if(along<.8||side>.75)continue;
          const key=(iy*W*GRID+ix)*16+h,old=this._stands.get(key);if(old===-this.revision)continue;
          const p={x,y,angle};if(old!==1){if(!this.poseClear(p,'soil1')||!this.sweptClear(p,{x:x-c*.25,y:y-s*.25,angle},'soil1')){this._stands.set(key,-this.revision);continue;}this._stands.set(key,1);}
          candidates.push({p,score:d+side*.3,c,s});
        }
      }
      if(preferred){const c=Math.cos(preferred.angle),s=Math.sin(preferred.angle);for(const advance of [0,-.125,.125,-.25,.25,-.375,.375,-.5,.5]){
        const p={x:preferred.x+c*advance,y:preferred.y+s*advance,angle:preferred.angle},dx=z.x-p.x,dy=z.y-p.y;
        if(Math.hypot(dx,dy)<=1.55&&dx*c+dy*s>.6&&Math.abs(dx*s-dy*c)<.8&&this.poseClear(p,'soil1')&&this.sweptClear(p,{x:p.x-c*.25,y:p.y-s*.25,angle:p.angle},'soil1'))candidates.push({p,score:-1+Math.abs(advance)*.1,c,s});
      }}
      candidates.sort((a,b)=>a.score-b.score);
      for(const {p} of candidates.slice(0,24)){
        const pickup=this.pickupPath(g,p,0);if(pickup===null)continue;const home={x:48.25,y:24.25,angle:0},escape=this.knownRoute(p,home,'soil1');if(!escape||!this.knownRoute(home,p,null))continue;
        p.pickupRoute=pickup;p.escapeHome=escape;this._digPoses.set(g,{pose:p,revision:this.revision,preferred:preferredKey});return p;
      }
      this._digPoses.set(g,{pose:null,revision:this.revision,preferred:preferredKey});return null;
    }
    grainCandidate(g,rid,build){
      if(!this.canExcavate(g)||!this.grainNeighbors(g).some(n=>!this.grains[n])||this.jobs.some(j=>j.grains.includes(g)))return null;
      const p=GRAIN.center(g),target=idx(Math.floor(p.x),Math.floor(p.y));
      if(this.supportsStock(g))return null;
      const pose=this.digPoseFor(g,this.builds[build||rid]?.tip);if(!pose)return null;
      return {target,stand:idx(Math.floor(pose.x),Math.floor(pose.y)),pose,rid,build,grains:[g],score:0};
    }
    supportsStock(g){const p=GRAIN.center(g);return !!this.physics?.bodies.some(b=>b.kind!=='soil'&&!b.carrier&&Math.abs(p.x-b.x)<Physics.SHAPES[b.kind].hx+.14&&p.y>=b.y+Physics.SHAPES[b.kind].hy-.01&&p.y<b.y+Physics.SHAPES[b.kind].hy+.35);}
    construction(rid){
      const b=this.builds[rid];if(!b||b.complete)return [];
      if(this.branchBusy(rid))return [];
      if(this.jobs.some(j=>j.build===rid&&['travel','dig'].includes(j.phase)))return [];
      for(let k=0;k<6&&b.mode==='passage';k++){
        if(b.next&&this.tipFootprint(b.tip,b.next).some(g=>this.grains[g]&&this.supportsStock(g)))b.next=null;
        if(!b.next)b.next=this.nextTip(b.tip,b.target,.5,b.history);
        if(!b.next)return [];
        const remaining=this.tipFootprint(b.tip,b.next).filter(g=>this.grains[g]);
        if(remaining.length&&!this.sweptClear(b.tip,b.next,'soil')){
          const direct=[];for(const g of remaining.sort((a,c)=>this.strength(a)-this.strength(c))){const candidate=this.grainCandidate(g,0,rid);if(candidate){direct.push(candidate);if(direct.length===4)break;}}
          if(direct.length)return direct;
          // Open a local working/turning bay only when the existing face gives
          // no safe extraction pose. This does not widen the whole route.
          const repair=[];
          for(let gy=Math.floor((b.tip.y-1.6)*GRID);gy<=Math.ceil((b.tip.y+1.6)*GRID);gy++)for(let gx=Math.floor((b.tip.x-1.6)*GRID);gx<=Math.ceil((b.tip.x+1.6)*GRID);gx++){
            const g=gy*FW+gx,p=GRAIN.center(g);if(Math.hypot(p.x-b.tip.x,p.y-b.tip.y)>1.6||!this.grains[g])continue;
            const cand=this.grainCandidate(g,0,rid);if(cand){cand.score=-Math.min(...remaining.map(n=>{const q=GRAIN.center(n);return Math.hypot(p.x-q.x,p.y-q.y);}));repair.push(cand);}
          }return repair.sort((a,c)=>c.score-a.score).slice(0,4);
        }
        b.length+=Math.hypot(b.tip.x-b.next.x,b.tip.y-b.next.y);b.tip={x:b.next.x,y:b.next.y,angle:b.next.angle};b.history.push({...b.tip});b.next=null;
        if(Math.hypot(b.tip.x-b.history[0].x,b.tip.y-b.history[0].y)>5&&b.length>=(b.minLength||6)&&b.tip.y>=(b.minDepth||0)){
          b.mode='chamber';this.rooms[rid]={...this.rooms[rid],id:rid,x:b.tip.x,y:b.tip.y};
          for(let g=0;g<FINE_SIZE;g++){const p=GRAIN.center(g);if(!this.grains[g]&&!this.grainRoom[g]&&Math.hypot(p.x-b.tip.x,p.y-b.tip.y)<1.1)this.grainRoom[g]=rid;}
          for(let i=0;i<SIZE;i++)this.syncCell(i);this.revision++;
        }
      }
      return b.mode==='chamber'?this.frontier(rid):[];
    }
    finishConstruction(){
      for(const rid of this.roomIds()){const b=this.builds[rid];if(b&&!b.complete&&b.mode==='chamber'&&this.cells(rid).filter(i=>this.walkable(i)).length>=3){b.complete=true;this.log((this.roomName?.(rid)??names[rid])+(this.roomKind(rid)==='rest'?'で休めるようになりました。':'に荷物を運び入れられるようになりました。'));}}
    }
    branchBusy(rid,owner=0){
      const b=this.builds[rid];return this.jobs.some(j=>{
        if(j.ant===owner||j.build!==rid||j.widen)return false;if(['travel','dig'].includes(j.phase))return true;if(j.phase!=='haul')return false;
        const a=this.ants.find(a=>a.id===j.ant),room=this.grainRoom[GRAIN.at(a.x,a.y)];if(room>0&&room!==rid)return false;
        let k=0;for(let n=1;n<b.history.length;n++)if(Math.hypot(b.history[n].x-a.x,b.history[n].y-a.y)<Math.hypot(b.history[k].x-a.x,b.history[k].y-a.y))k=n;
        const p=b.history[k],left={x:p.x-Math.sin(p.angle)*LANE_OFFSET,y:p.y+Math.cos(p.angle)*LANE_OFFSET,angle:p.angle},right={x:p.x+Math.sin(p.angle)*LANE_OFFSET,y:p.y-Math.cos(p.angle)*LANE_OFFSET,angle:p.angle+Math.PI};
        return !this.poseClear(left,'soil')||!this.poseClear(right);
      });
    }
    passingIndex(b,k){
      const profile=this.transportProfile(b.history);if(!profile)return false;const q=b.history[k],shift=profile[k],width=this.laneWidth(b.history,k),c=Math.cos(q.angle),s=Math.sin(q.angle),left={x:q.x-s*(shift+width),y:q.y+c*(shift+width),angle:q.angle},right={x:q.x-s*(shift-width),y:q.y+c*(shift-width),angle:q.angle};
      return this.poseClear(left,'soil')&&this.poseClear(right,'soil')&&this.poseClear({...right,angle:right.angle+Math.PI},'soil');
    }
    transportReady(rid){const b=this.builds[rid];if(!b?.complete)return false;for(let k=0;k<b.history.length;k++)if(!this.passingIndex(b,k))return false;return true;}
    narrowSiteReserved(rid,pose){
      const b=this.builds[rid];if(!b)return false;const nearest=p=>{let k=0;for(let n=1;n<b.history.length;n++)if(Math.hypot(b.history[n].x-p.x,b.history[n].y-p.y)<Math.hypot(b.history[k].x-p.x,b.history[k].y-p.y))k=n;return k;},end=nearest(pose);
      let first=-1;for(let k=0;k<=end;k++)if(!this.passingIndex(b,k)){first=k;break;}if(first<0)return false;
      // Reserve only the still-single-file part between this site and the
      // queen room. Once a carrier has passed it, its surface trip is unrelated.
      return this.jobs.some(j=>(j.build===rid||j.rid===rid)&&['travel','dig'].includes(j.phase)&&nearest(j.pose)>=first-1)||this.ants.some(a=>{
        if(a.y<SURFACE||this.grainRoom[GRAIN.at(a.x,a.y)]>0||!this.singleFileSection(a))return false;const k=nearest(a),q=b.history[k];return k>=first-1&&Math.hypot(q.x-a.x,q.y-a.y)<2;
      });
    }
    workSiteBusy(pose,owner=0){
      const root=(this._entryHistory||(this._entryHistory=this.entranceHistory))[0];if(Math.hypot(pose.x-root.x,pose.y-root.y)<2.2)return true;
      return this.ants.some(a=>a.id!==owner&&(a.job!==null||a.itemTask)&&Math.hypot(a.x-pose.x,a.y-pose.y)<1.55)||this.jobs.some(j=>j.ant!==owner&&['travel','dig'].includes(j.phase)&&Math.hypot(j.pose.x-pose.x,j.pose.y-pose.y)<1.7);
    }
    transportCandidates(rid){
      const b=this.builds[rid];if(!b||b.history.length<6)return [];const last=b.complete?b.history.length:Math.max(1,b.history.length-4);if(!this._transportSets)this._transportSets={};let cached=this._transportSets[rid];
      if(!cached||cached.length!==b.history.length||cached.complete!==b.complete){const profile=this.transportProfile(b.history);if(!profile)return [];const grains=new Set();for(let k=1;k<last;k++)for(const g of this.transportFootprint(b.history[k-1],b.history[k],this.laneWidth(b.history,k-1),this.laneWidth(b.history,k),profile[k-1],profile[k]))grains.add(g);cached=this._transportSets[rid]={length:b.history.length,complete:b.complete,grains};}
      const grains=new Set([...cached.grains].filter(g=>this.grains[g]));
      const out=[];
      for(const g of [...grains].sort((a,b)=>this.strength(a)-this.strength(b))){const c=this.grainCandidate(g,0,rid);if(c&&!this.workSiteBusy(c.pose)&&!this.narrowSiteReserved(rid,c.pose)){c.widen=true;out.push(c);if(out.length===4)break;}}
      return out;
    }
    frontier(rid){
      const boundary=new Set(),pressure=this.storagePressure(rid),r=this.rooms[rid];
      for(let g=0;g<FINE_SIZE;g++)if(!this.grains[g]&&this.grainRoom[g]===rid)for(const n of this.grainNeighbors(g))if(this.grains[n]&&this.grains[n]!==ROCK)boundary.add(n);
      const ranked=[];
      for(const g of boundary){const p=GRAIN.center(g);if(p.x<5||p.x>W-5||p.y<SURFACE+1||p.y>H-5)continue;
        if(pressure.stock.some(b=>Math.abs(p.x-b.x)<Physics.SHAPES[b.kind].hx+.14&&p.y>=b.y+Physics.SHAPES[b.kind].hy-.01&&p.y<b.y+Physics.SHAPES[b.kind].hy+.35))continue;
        if(this.grainNeighbors(g).some(n=>this.grainRoom[n]&&this.grainRoom[n]!==rid))continue;
        const contacts=this.grainNeighbors(g).filter(n=>!this.grains[n]&&this.grainRoom[n]===rid).length;
        const density=pressure.stock.reduce((v,b)=>v+Math.exp(-((p.x-b.x)**2+(p.y-b.y)**2)/6),0)/Math.max(1,Math.sqrt(pressure.stock.length));
        const score=contacts*.18+density*.4-this.strength(g)*1.8-Math.abs(p.y-(r.y+.4))*.12-Math.abs(p.x-r.x)*.035;
        ranked.push({g,score});
      }
      ranked.sort((a,b)=>b.score-a.score);const out=[];
      for(const v of ranked.slice(0,64)){const c=this.grainCandidate(v.g,rid,this.builds[rid]?.complete?undefined:rid);if(c){c.score=v.score;out.push(c);if(out.length===4)break;}}
      return out;
    }
    cells(rid){
      // Room cells change only with dug grains, settled loads or reassigned
      // grains, and each of those bumps the terrain revision.
      if(!this._roomCells)this._roomCells=new Map();const hit=this._roomCells.get(rid);if(hit?.revision===this.revision)return hit.out;
      const out=[];for(let i=0;i<SIZE;i++)if(!this.loose[i]&&this.grainCells(i).filter(g=>!this.grains[g]&&this.grainRoom[g]===rid).length>=4)out.push(i);this._roomCells.set(rid,{revision:this.revision,out});return out;
    }
    plan(){
      this.finishConstruction();
      const needs=this.buildNeeds();
      for(const n of needs){
        n.d-=this.jobs.filter(j=>j.rid===n.rid).reduce((sum,j)=>sum+j.grains.length*GRAIN_AREA,0);
        if(n.d<=0&&this.builds[n.rid]?.complete&&!this.jobs.some(j=>j.rid===n.rid)){const kind=this.roomKind(n.rid);if(this.physics.bodies.some(b=>b.kind===kind&&!b.carrier&&this.grainRoom[GRAIN.at(b.x,b.y)]!==n.rid)&&this.storageDestination(n.rid,{cell:idx(48,24)},kind)===undefined)n.d=1;}
      }
      const required=needs.filter(n=>n.wanted>0&&(n.d>0||this.builds[n.rid]&&!this.transportReady(n.rid)));
      required.sort((a,b)=>(b.d/b.wanted*(b.weight??1)*(this.priority===(this.roomKind(b.rid)==='egg'?'nursery':'food')?3:1))-(a.d/a.wanted*(a.weight??1)*(this.priority===(this.roomKind(a.rid)==='egg'?'nursery':'food')?3:1)));
      const idle=this.ants.filter(a=>a.role==='build'&&a.desiredRole==='build'&&a.job===null&&!a.itemTask&&!a.yielding&&!a.yieldHold&&!a.fight&&!a.alarm);this._blocked=[];
      for(const n of required){this.ensureBuild(n.rid);const primary=this.builds[n.rid]?.complete?this.frontier(n.rid):this.construction(n.rid),candidates=[...this.transportCandidates(n.rid),...primary];
        for(const initial of candidates){if(!idle.length)break;if(n.d<=0&&this.builds[n.rid]?.complete&&!initial.widen)continue;if(this.workSiteBusy(initial.pose)||this.narrowSiteReserved(n.rid,initial.pose))continue;
          const cand=this.batchCandidate(initial);if(!cand)continue;
          for(const ant of idle.slice().sort((a,b)=>Math.hypot(a.x-cand.pose.x,a.y-cand.pose.y)-Math.hypot(b.x-cand.pose.x,b.y-cand.pose.y))){
            const route=this.path(ant,cand.pose,null);if(route===null)continue;
            const {drop,escape}=cand;
            const job={id:this.nextJob++,...cand,ant:ant.id,phase:'travel',cursor:0,stroke:0,pickup:null,drop,escape};delete job.score;
            job.materials=job.grains.map(g=>this.grains[g]);job.costs=job.grains.map((g,k)=>this.strength(g,job.materials[k]));this.jobs.push(job);
            ant.job=job.id;ant.path=route;ant.next=0;ant.task='travel';ant.wait=0;delete ant.returning;idle.splice(idle.indexOf(ant),1);if(job.rid)n.d-=job.grains.length*GRAIN_AREA;break;
          }
        }
      }
    }
    retreat(ant,other=null){
      if(ant.yielding||!ant.trail?.length)return false;
      const path=[],kind=this.carriedKind(ant);let previous=ant;
      for(const p of ant.trail.slice().reverse()){
        if(!this.sweptClear(previous,p,kind,-1,.025))break;if(Math.hypot(p.x-previous.x,p.y-previous.y)<.01&&Math.abs(p.angle-previous.angle)<.01)continue;path.push({...p});previous=p;
        if(path.length>3&&(this.grainRoom[GRAIN.at(p.x,p.y)]===1&&this.clearance(p.x,p.y)>.87||p.y<SURFACE)&&(!other||Math.hypot(p.x-other.x,p.y-other.y)>2.6))break;
      }
      const retreatDistance=path.reduce((d,p,k)=>{const q=k?path[k-1]:ant;return d+Math.hypot(p.x-q.x,p.y-q.y);},0);
      if(path.length<2||retreatDistance<.8)return false;
      if(other){let previous=ant;const limit=Math.min(.67,Math.hypot(other.x-ant.x,other.y-ant.y));for(const p of path){const dx=p.x-previous.x,dy=p.y-previous.y,t=clamp(((other.x-previous.x)*dx+(other.y-previous.y)*dy)/(dx*dx+dy*dy||1),0,1);if(Math.hypot(other.x-previous.x-dx*t,other.y-previous.y-dy*t)<limit-1e-6)return false;previous=p;}}
      ant.resume={path:ant.path.slice(ant.next)};ant.path=path;ant.next=0;ant.yielding=true;ant.yieldFor=other?.id;ant.trail=[];ant.detourTime=0;this.stats.yields++;return true;
    }
    workerShapes(p,kind=null){
      const a=renderAngle(p.angle),c=Math.cos(a),s=Math.sin(a),shapes=ANT_BODY.map(([x,rx,ry])=>({x:p.x+x*ANT_SIZE*c,y:p.y+x*ANT_SIZE*s,rx:rx*ANT_SIZE,ry:ry*ANT_SIZE,c,s}));
      if(kind){const shape=carryShape(kind);shapes.push({x:p.x+c*ANT_SIZE*.55,y:p.y+s*ANT_SIZE*.55,rx:shape.hx,ry:shape.hy,rect:true,c:1,s:0});}return shapes;
    }
    shapeSetsOverlap(left,right,margin=.018){
      for(const p of left)for(const q of right){const dx=q.x-p.x,dy=q.y-p.y,axes=[[1,0],[0,1],[p.c,p.s],[-p.s,p.c],[q.c,q.s],[-q.s,q.c],[dx,dy]],radius=(v,x,y)=>v.rect?v.rx*Math.abs(x)+v.ry*Math.abs(y):Math.hypot(v.rx*(v.c*x+v.s*y),v.ry*(-v.s*x+v.c*y));
        if(axes.filter(([x,y])=>Math.hypot(x,y)>1e-9).every(([x,y])=>Math.abs(dx*x+dy*y)<radius(p,x,y)+radius(q,x,y)+margin*Math.hypot(x,y)))return true;
      }return false;
    }
    workersOverlap(a,b,kindA=this.carriedKind(a),kindB=this.carriedKind(b)){
      return Math.hypot(a.x-b.x,a.y-b.y)<=2.7&&this.shapeSetsOverlap(this.workerShapes(a,kindA),this.workerShapes(b,kindB));
    }
    makeSpace(ant,requester){
      if(ant.job!==null||ant.itemTask||ant.path.length)return false;
      const away=Math.atan2(ant.y-requester.y,ant.x-requester.x);
      for(const radius of [1,1.5,2,2.5])for(const turn of [0,Math.PI/4,-Math.PI/4,Math.PI/2,-Math.PI/2,Math.PI]){
        const angle=away+turn,p={x:ant.x+Math.cos(angle)*radius,y:ant.y+Math.sin(angle)*radius,angle:ant.angle};
        if(this.grainRoom[GRAIN.at(p.x,p.y)]!==1||!this.sweptClear(ant,p)||this.ants.some(b=>b!==ant&&this.workersOverlap(p,b,null,this.carriedKind(b))))continue;
        ant.home={...p};ant.path=[p];ant.next=0;ant.returning=true;ant.wait=2;return true;
      }return false;
    }
    passingSpace(p){
      if(this.grainRoom[GRAIN.at(p.x,p.y)]>0&&this.clearance(p.x,p.y)>.67)return true;
      for(const b of this.builds.slice(2)){if(!b)continue;let k=0;for(let n=1;n<b.history.length;n++)if(Math.hypot(b.history[n].x-p.x,b.history[n].y-p.y)<Math.hypot(b.history[k].x-p.x,b.history[k].y-p.y))k=n;
        const q=b.history[k];if(Math.hypot(q.x-p.x,q.y-p.y)>1.3)continue;if(this.passingIndex(b,k))return true;
      }return false;
    }
    singleFileSection(p){
      if(p.y<SURFACE||this.grainRoom[GRAIN.at(p.x,p.y)]>0)return false;
      // Room lips and turning/landing poses are not single-file tunnels just
      // because their centers fall outside the chamber's tagged floor.
      for(const b of this.builds.slice(2)){if(!b)continue;let k=0;for(let n=1;n<b.history.length;n++)if(Math.hypot(b.history[n].x-p.x,b.history[n].y-p.y)<Math.hypot(b.history[k].x-p.x,b.history[k].y-p.y))k=n;
        if(Math.hypot(b.history[k].x-p.x,b.history[k].y-p.y)<1.2&&!this.passingIndex(b,k))return true;
      }return false;
    }
    move(ant,dt,occupancy,goal=null){
      if(!ant.path.length)return true;
      if(ant.yieldHold){const other=this.ants.find(a=>a.id===ant.yieldHold);// Two workers can each have stepped aside for the other. Then the one
        // with the load or the work goes first, as in a head-on meeting.
        const rank=a=>(this.carriedKind(a)?100:0)+(a.job!==null?10:0)-a.id*.01,mutual=other?.yieldHold===ant.id&&rank(ant)>rank(other);
        if(other&&!mutual&&Math.hypot(other.x-ant.x,other.y-ant.y)<2.4&&this.grainRoom[GRAIN.at(ant.x,ant.y)]!==1&&other.path.length)return false;delete ant.yieldHold;}
      const target=ant.path[ant.next],grounded=ant.y<SURFACE&&target.y<SURFACE&&Math.abs(Math.sin(ant.angle))<.7&&Math.abs(Math.sin(target.angle))<.7&&Math.abs(ant.x-this.entrance.x)>2&&Math.abs(target.x-this.entrance.x)>2&&this.soilAt(ant.x,SURFACE+.01)&&this.soilAt(target.x,SURFACE+.01);
      // Walking follows the heap, including its last stationary waypoint.
      // A raised pickup/turning pose must never be pushed down into the floor.
      const q=grounded?{...target,y:Math.min(target.y,this.surfacePoint(target.x).y)}:target,da=Math.atan2(Math.sin(q.angle-ant.angle),Math.cos(q.angle-ant.angle)),d=Math.hypot(q.x-ant.x,q.y-ant.y),duration=Math.max(d/(this.walkSpeed?.(ant)||WALK_SPEED),Math.abs(da)/5),fraction=duration?Math.min(1,dt/duration):1,step=d*fraction,flip=this.surfaceFlip(ant,q);
      if(flip){ant.turnWait=(ant.turnWait||0)+dt;if(ant.turnWait<.18)return false;ant.turnWait=0;}const rotation=flip?da:da*fraction;
      const p={x:ant.x+(d?((q.x-ant.x)/d*step):0),y:ant.y+(d?((q.y-ant.y)/d*step):0),angle:ant.angle+rotation};
      if(grounded){const y=this.surfacePoint(p.x).y;p.y=Math.abs(target.x-ant.x)>1.2||target.y>=y?y:Math.min(p.y,y);}
      // Ant traffic uses lateral lanes and longitudinal spacing; ants are not
      // rigid physics bodies. Terrain clearance still sweeps every body/load.
      if(p.y>SURFACE-1){let following=false;const ownRoom=this.grainRoom[GRAIN.at(p.x,p.y)],kind=this.carriedKind(ant),flow=a=>{const z=a.path.slice(a.next).find(p=>Math.hypot(p.x-a.x,p.y-a.y)>.25);return z?Math.atan2(z.y-a.y,z.x-a.x):a.angle;},ownFlow=flow(ant),block=ant.enemy?undefined:this.ants.find(b=>{
        if(b===ant||p.y<SURFACE&&b.y<SURFACE||Math.hypot(p.x-b.x,p.y-b.y)>2.6)return false;
        // Two workers in one stream measure ahead/behind on the same axis, their
        // mean heading, so exactly one of them is ahead of the other.
        const otherFlow=flow(b),sameFlow=Math.cos(ownFlow-otherFlow)>.96,axis=sameFlow?Math.atan2(Math.sin(ownFlow)+Math.sin(otherFlow),Math.cos(ownFlow)+Math.cos(otherFlow)):ownFlow;
        const dx=b.x-ant.x,dy=b.y-ant.y,along=dx*Math.cos(axis)+dy*Math.sin(axis),side=Math.abs(dx*Math.sin(axis)-dy*Math.cos(axis)),room=this.grainRoom[GRAIN.at(b.x,b.y)];
        if(ownRoom>0&&room===ownRoom)return false;
        // Following limits translation toward the worker ahead. A stationary
        // turn, or a step opening the gap at a merge, must finish even when
        // nearby queue headings project each other as being in front.
        const closing=Math.hypot(p.x-b.x,p.y-b.y)<Math.hypot(ant.x-b.x,ant.y-b.y)-1e-6;
        if(!ant.yielding&&!b.yielding&&sameFlow&&side<.55&&b.path.length&&closing){
          if(along<-.15)return false;
          if((along>.15||Math.abs(along)<=.15&&b.id<ant.id)&&Math.hypot(p.x-b.x,p.y-b.y)<(kind?2.3:1.8)){following=true;return true;}
          // Side by side in one stream the lower id leads; the leader is not
          // held back by its follower under any other rule.
          if(Math.abs(along)<=.15)return false;
        }
        // The founding shaft has two swept lanes. Crossing its open apron or
        // a curved lane merge must not send a returning queue backwards into
        // its followers; spacing above handles workers in the same lane.
        const shaft=this._entryHistory||this.entranceHistory,nearShaft=q=>q.y<SURFACE+1.5||shaft.some(z=>Math.hypot(z.x-q.x,z.y-q.y)<1.15);
        if(nearShaft(p)&&nearShaft(b))return false;
        if(Math.hypot(p.x-b.x,p.y-b.y)>=.67)return false;
        // At a verified two-way section, workers can merge across its open
        // width. A center-distance stop belongs to an actual single-file neck.
        if(!this.singleFileSection(p)||!this.singleFileSection(b))return false;
        return !(Math.hypot(ant.x-b.x,ant.y-b.y)<.67&&Math.hypot(p.x-b.x,p.y-b.y)>Math.hypot(ant.x-b.x,ant.y-b.y)+.0001);
      });
        if(block){ant.waitingFor=block.id;ant.blocked=(ant.blocked||0)+dt;this.stats.waitSeconds+=dt;this.makeSpace(block,ant);
          if(!following&&ant.blocked>.25&&!ant.yielding){const rank=a=>(this.carriedKind(a)?100:0)+(a.job!==null?10:0)-a.id*.01,next=block.path[block.next];
            if(block.yielding){if(next&&(next.x-block.x)*(ant.x-block.x)+(next.y-block.y)*(ant.y-block.y)>0)this.retreat(ant,block);}
            else {const pair=rank(ant)<rank(block)?[ant,block]:[block,ant];for(const yielding of pair){if(yielding.task==='dig')continue;const passing=yielding===ant?block:ant;if(this.retreat(yielding,passing))break;}}
          }return false;
        }
      }
      ant.blocked=0;
      ant.detourTime=0;
      delete ant.waitingFor;
      if(!this.sweptClear(ant,p,this.carriedKind(ant),-1,.025)){this.collision={id:ant.id,from:{x:ant.x,y:ant.y,angle:ant.angle},proposed:p,target:q,kind:this.carriedKind(ant)};throw new Error('身体または荷物が土に触れる移動を停止しました');}
      ant.x=p.x;ant.y=p.y;ant.angle=p.angle;ant.cell=idx(Math.floor(p.x),Math.floor(p.y));ant.walked+=step;if(!ant.enemy)this.stats.distance+=step;
      if(!ant.enemy&&step&&Math.cos(Math.atan2(q.y-ant.y,q.x-ant.x)-ant.angle)<-.5)this.stats.backwardDistance+=step;
      if(!ant.yielding&&(!ant.trail?.length||Math.hypot(ant.x-ant.trail.at(-1).x,ant.y-ant.trail.at(-1).y)>.12||Math.abs(ant.angle-ant.trail.at(-1).angle)>.08)){if(!ant.trail)ant.trail=[];ant.trail.push({x:ant.x,y:ant.y,angle:ant.angle});if(ant.trail.length>100)ant.trail.shift();}
      if(!ant.enemy){this.traffic[ant.cell]+=step*.2;this._flowCells?.add(ant.cell);}
      if(d<=step+1e-8&&Math.abs(da-rotation)<1e-7){ant.angle=q.angle;ant.next++;}
      if(ant.next>=ant.path.length){ant.path=[];ant.next=0;
        if(ant.yielding){ant.yielding=false;ant.yieldHold=ant.yieldFor;delete ant.yieldPriority;const target=ant.resume.path.at(-1);delete ant.resume;ant.path=target?(this.path(ant,target)||[]):[];ant.wait=.6;return false;}
        return true;
      }return false;
    }

    step(dt=STEP) {
      if(!Number.isFinite(dt)||dt<=0||dt>.2)throw new Error('時間刻みは0〜0.2秒です');
      this.remainder+=dt;const ticks=Math.floor((this.remainder+1e-12)/STEP);this.remainder-=ticks*STEP;
      if(Math.abs(this.remainder)<1e-12)this.remainder=0;
      for(let k=0;k<ticks;k++)this.tick(STEP);
    }
    tick(dt) {
      if (!Number.isFinite(dt) || dt <= 0 || dt > .2) throw new Error('時間刻みは0〜0.2秒です');
      this.time += dt; this.ticks++;
      const occupancy=null,previousX=this.ants.map(a=>a.x),trafficDecay=Math.exp(-dt/14),jamDecay=Math.exp(-dt/10);
      if(!this._flowCells)this._flowCells=new Set(Array.from({length:SIZE},(_,i)=>i).filter(i=>this.traffic[i]||this.jam[i]));
      for(const i of this._flowCells){this.traffic[i]*=trafficDecay;this.jam[i]*=jamDecay;if(this.traffic[i]<1e-8&&this.jam[i]<1e-8){this.traffic[i]=this.jam[i]=0;this._flowCells.delete(i);}}
      if (this.time >= this.planAt) { this.planAt = this.time + .3; this.plan(); }
      for(const b of this.physics.bodies)if(b.kind!=='soil'&&!b.carrier&&b.state==='stored'&&b.rest>=30&&this.physics.drag?.id!==b.id){
        const rid=this.destinationRoom(b.kind,b);if(this.grainRoom[GRAIN.at(b.x,b.y)]!==rid)b.state='incoming';
      }
      for(const b of this.physics.bodies)if(b.kind!=='soil'&&!b.carrier&&b.state==='incoming'&&b.rest>=30&&this.grainRoom[GRAIN.at(b.x,b.y)]>=2&&this.roomKind(this.grainRoom[GRAIN.at(b.x,b.y)])===b.kind&&!this.keepIncoming?.(b))b.state='stored';
      this._incoming=this.physics.bodies.filter(b=>b.state==='incoming');
      this._storageLedger={tick:this.ticks,stored:Object.fromEntries(this.roomIds().map(r=>[r,0])),reserved:Object.fromEntries(this.roomIds().map(r=>[r,0])),available:{},busy:{}};
      for(const b of this.physics.bodies)if(b.kind!=='soil'&&!b.carrier){const rid=this.grainRoom[GRAIN.at(b.x,b.y)];if(rid>=2&&this.roomKind(rid)===b.kind)this._storageLedger.stored[rid]++;}
      for(const a of this.ants)if(a.itemTask?.rid>1)this._storageLedger.reserved[a.itemTask.rid]++;
      for (const ant of this.ants) {
        const job = ant.job === null ? null : this.jobs.find(j => j.id === ant.job);
        if (!job) {
          if(this.stepItemTask(ant,dt,occupancy))continue;
          ant.task = 'idle';
          ant.wait=Math.max(0,ant.wait-dt);
          if (ant.path.length) this.move(ant, dt, occupancy);
          else if (ant.wait <= 0&&Math.hypot(ant.x-ant.home.x,ant.y-ant.home.y)>.35) {
            ant.path = this.path(ant, ant.home) || []; ant.next = 0; ant.wait = 1;ant.returning=true;
          }
          continue;
        }
        if (job.phase === 'travel') {
          if (this.move(ant, dt, occupancy, job.pose)) { job.phase = 'dig'; ant.task = 'dig'; }
        } else if (job.phase === 'dig') {
          if (Math.hypot(ant.x-job.pose.x,ant.y-job.pose.y)>.01) throw new Error('現場に到着していない掘削');
          ant.angle=job.pose.angle;
          job.stroke+=dt*(this.digRate?.(ant)||1);
          if(job.pickup!==null){
            if(job.stroke+1e-9>=PICKUP_SECONDS){
              this.physics.byId.get(job.pickup).state='cargo';job.pickup=null;job.stroke=0;
              if(job.cursor===job.grains.length)this.finishDig(job,ant);
            }
          }else this.chisel(job);
        } else if (job.phase === 'haul') {
          if (this.move(ant, dt, occupancy)) { job.phase = 'unload'; ant.task = 'unload'; ant.wait = .65; ant.angle = job.drop%W<this.entrance.x?Math.PI:0; }
        } else if (job.phase === 'unload') {
          if ((ant.wait -= dt) <= 0) {
            if (Math.floor(ant.x)!==job.drop%W || ant.y>=SURFACE || !ant.cargo || ant.cargo.source !== job.target) throw new Error('地上での土の受渡しが不正です');
            for(const b of this.physics.bodies)if(b.carrier===ant.id){b.state='delivered';this.physics.release(b,(job.drop%W<this.entrance.x?-1:1)*(1.4+(b.id%5)*.1),-1.3);}
            this.loose[job.target]--; ant.cargo = null; this.stats.delivered++;
            for (const g of job.grains) this.grainPending[g] = 0;
            this.stats.grainDelivered += job.grains.length;
            this.stats[job.rid>=2?(this.roomKind(job.rid)==='egg'?'nursery':'food'):'passage']++;
            this.jobs = this.jobs.filter(j => j.id !== job.id);
            ant.job = null; ant.task = 'idle'; ant.wait = .3; this.revision++;
          }
        }
      }
      this.updateCarriers();this.physics.step(dt);
      let surfaceChanged=false;
      for(const [k,ant] of this.ants.entries())if(ant.y<SURFACE&&Math.abs(ant.x-this.entrance.x)>2&&this.soilAt(ant.x,SURFACE+.01)){
        const next=ant.path[ant.next];
        // Follow the current heap on both ascent and descent. Leaving this row
        // into the shaft remains ordinary walking, so the entrance stays usable.
        const groundY=this.surfacePoint(ant.x).y,walking=next&&next.y<SURFACE&&Math.abs(next.x-ant.x)>.001&&(Math.abs(next.x-ant.x)>1.2||next.y>=groundY)&&Math.abs(Math.sin(ant.angle))<.7&&Math.abs(Math.sin(next.angle))<.7&&this.soilAt(next.x,SURFACE+.01);
        if(!next&&Math.abs(Math.sin(ant.angle))<.7||walking||groundY<ant.y){
          const oldY=ant.y,oldAngle=ant.angle;ant.y=walking||!next?groundY:Math.min(ant.y,groundY);
          const dx=ant.x-previousX[k];
          if(Math.abs(dx)>1e-8){const slope=clamp(this.surfacePoint(ant.x+.5).y-this.surfacePoint(ant.x-.5).y,-1,1),direction=Math.sign(Math.cos(oldAngle))||Math.sign(dx);ant.angle=Math.atan2(slope*direction,direction);}
          if(oldY!==ant.y||oldAngle!==ant.angle)surfaceChanged=true;
        }
      }
      if(surfaceChanged)this.updateCarriers();
    }
    advance(seconds) {
      if(!Number.isFinite(seconds)||seconds<0||seconds>3600)throw new Error('進める時間は0〜3600秒です');
      const ticks=Math.floor(seconds/.1);for(let k=0;k<ticks;k++)this.step(.1);
      const tail=seconds-ticks*.1;if(tail>1e-12)this.step(tail);
    }
    status() {
      const capacity = this.capacities();
      const activity = { idle: 0, travel: 0, dig: 0, haul: 0, unload: 0 };
      for (const a of this.ants) activity[a.itemTask?(a.itemTask.phase==='fetch'?'travel':'haul'):a.task]++;
      const shortages = { larvae: Math.max(0, this.demands.larvae - capacity.larvae), food: Math.max(0, this.demands.food - capacity.food) };
      const blocked = [];
      const building=this.roomIds().filter(rid=>this.demands[this.roomKind(rid)==='egg'?'larvae':'food']>0&&this.builds[rid]&&!this.builds[rid].complete).map(rid=>({rid,name:this.roomName?.(rid)??names[rid],stage:this.cells(rid).length?'room':'passage'}));
      return { capacity, activity, shortages, blocked, building, ants: this.ants.length, jobs: this.jobs.length, ...this.stats };
    }
    dump() {
      return { format:SAVE_FORMAT,remainder:this.remainder, w: W, h: H, grid: GRID, grains: encodeGrains(this.grains), grainRoom: encodeGrains(this.grainRoom), grainPending: encodeGrains(this.grainPending), seed: this.seed, rng: this.rng, time: this.time, ticks: this.ticks, planAt: this.planAt,
        revision: this.revision, terrain: [...this.terrain], room: [...this.room], loose: [...this.loose],
        traffic: [...this.traffic], jam:[...this.jam], demands: { ...this.demands }, priority: this.priority, hardDig: this.hardDig,
        entrance:this.entrance,entranceHistory:this.entranceHistory,builds:structuredClone(this.builds), rooms: this.rooms.map(r => r && { ...r }), drop: this.drop, nextJob: this.nextJob,
        ants: JSON.parse(JSON.stringify(this.ants)), jobs: JSON.parse(JSON.stringify(this.jobs)), stats: { ...this.stats },
        events: this.events.map(e => ({ ...e })), physics:this.physics.dump() };
    }
    static restore(pack) {
      const fail=()=>{throw new Error('この試作の有効な保存データではありません');};
      const finite=(n,min=0,max=1e9)=>typeof n==='number'&&Number.isFinite(n)&&n>=min&&n<=max;
      const integer=(n,min,max)=>Number.isInteger(n)&&finite(n,min,max);
      if(!pack||pack.format!==SAVE_FORMAT||pack.w!==W||pack.h!==H||pack.grid!==GRID||!pack.physics)fail();
      for(const [key,max,ints] of [['terrain',3,true],['room',254,true],['loose',64,true],['traffic',1e6,false],['jam',1e6,false]])if(!Array.isArray(pack[key])||pack[key].length!==SIZE||pack[key].some(n=>!(ints?integer(n,0,max):finite(n,0,max))))fail();
      if(!integer(pack.seed,0,4294967295)||!integer(pack.rng,0,4294967295)||!integer(pack.ticks,0,1e9)||!finite(pack.time)||!finite(pack.planAt)||!finite(pack.remainder,0,STEP)||!integer(pack.revision,1,1e9)||!integer(pack.nextJob,1,1e9)||pack.drop!==DUMP_CELL||!['balanced','nursery','food'].includes(pack.priority)||typeof pack.hardDig!=='boolean')fail();
      if(!pack.demands||!integer(pack.demands.larvae,0,800)||!integer(pack.demands.food,0,1600)||!Array.isArray(pack.ants)||(pack.ants.length<1||pack.ants.length>128)||!Array.isArray(pack.jobs)||pack.jobs.length>128)fail();
      if(!Array.isArray(pack.rooms)||pack.rooms.length<4||pack.rooms.length>254||pack.rooms.slice(1).some((r,k)=>r?.id!==k+1||!finite(r.x,1,W-1)||!finite(r.y,SURFACE,H-1)))fail();
      if(!Array.isArray(pack.builds)||pack.builds.length!==pack.rooms.length)fail();
      const pose=p=>p&&finite(p.x,.1,W-.1)&&finite(p.y,.1,H-.1)&&finite(p.angle,-Math.PI*4,Math.PI*4);
      const poses=(p,max=2000)=>Array.isArray(p)&&p.length<=max&&p.every(pose);
      if(!pack.entrance||!finite(pack.entrance.x,1,W-1)||pack.entrance.y!==SURFACE-1||!poses(pack.entranceHistory,250)||pack.entranceHistory.length<2)fail();
      for(const rid of pack.rooms.slice(2).map(r=>r.id)){const b=pack.builds[rid];if(b&&(!['passage','chamber'].includes(b.mode)||typeof b.complete!=='boolean'||!poses(b.history,150)||!b.history.length||!pose(b.tip)||!finite(b.target?.x,1,W-1)||!finite(b.target?.y,SURFACE,H-1)||b.next&&!pose(b.next)||!finite(b.length,0,100)))fail();}
      const s=Object.create(Simulation.prototype);
      for(const key of ['seed','rng','time','ticks','remainder','planAt','revision','demands','priority','hardDig','rooms','builds','drop','nextJob','ants','jobs','stats','events','entrance','entranceHistory'])s[key]=structuredClone(pack[key]);
      s.terrain=Uint8Array.from(pack.terrain);s.room=Uint8Array.from(pack.room);s.loose=Uint8Array.from(pack.loose);s.traffic=Float64Array.from(pack.traffic);s.jam=Float64Array.from(pack.jam);
      for(const [key,max] of [['grains',4],['grainRoom',254],['grainPending',1]])s[key]=decodeGrains(pack[key],FINE_SIZE,max);
      const ids=new Set(),jobs=new Set(),pending=new Set(),reserved=new Set(),targets=new Set();
      for(const a of s.ants){
        if(!integer(a.id,1,128)||ids.has(a.id)||!pose(a)||!pose(a.home)||!integer(a.cell,0,SIZE-1)||!['idle','travel','dig','haul','unload'].includes(a.task)||!finite(a.walked)||!finite(a.wait,-2,100)||!poses(a.path)||!integer(a.next,0,Math.max(0,a.path.length-1))||a.trail&&!poses(a.trail,100)||a.resume&&!poses(a.resume.path))fail();ids.add(a.id);
      }
      for(const j of s.jobs){
        const a=s.ants.find(a=>a.id===j.ant);
        if(!a||a.job!==j.id||!integer(j.id,1,s.nextJob-1)||jobs.has(j.id)||!integer(j.target,0,SIZE-1)||!pose(j.pose)||![0,...s.roomIds()].includes(j.rid)||!['travel','dig','haul','unload'].includes(j.phase)||!Array.isArray(j.grains)||!integer(j.grains.length,1,MAX_LOAD)||!j.grains.every(g=>integer(g,0,FINE_SIZE-1))||!integer(j.cursor,0,j.grains.length)||!Array.isArray(j.materials)||j.materials.length!==j.grains.length||j.materials.some(t=>![SOIL,HARD,PEBBLE].includes(t))||!Array.isArray(j.costs)||j.costs.length!==j.grains.length||j.costs.some((v,k)=>Math.abs(v-workCost(j.materials[k],j.grains[k],s.seed))>1e-9)||!finite(j.stroke,0,2))fail();
        if(!poses(j.escape)||!j.escape.length||!poses(j.pose.escapeHome)||!integer(j.drop,0,W*SURFACE-1)||!Array.isArray(j.pickupRoutes)||j.pickupRoutes.length!==j.grains.length||j.pickupRoutes.some(route=>!Array.isArray(route)||route.length>1||route.some(p=>!finite(p.x,0,W)||!finite(p.y,0,H))))fail();
        if(j.phase==='travel'&&(j.cursor!==0||j.pickup!==null)||['haul','unload'].includes(j.phase)&&(j.cursor!==j.grains.length||j.pickup!==null||!a.cargo||a.cargo.source!==j.target))fail();
        jobs.add(j.id);targets.add(j.target);
        for(const [k,g] of j.grains.entries()){if(reserved.has(g))fail();reserved.add(g);
          if(k<j.cursor){const tagged=s.grainRoom[g]===j.rid||j.rid===0&&s.grainRoom[g]===j.build&&s.builds[j.build]?.mode==='chamber';if(s.grains[g]||!s.grainPending[g]||!tagged||pending.has(g))fail();pending.add(g);}else if(s.grains[g]!==j.materials[k])fail();
        }
      }
      for(const a of s.ants)if(a.job!==null&&!jobs.has(a.job))fail();
      for(let i=0;i<SIZE;i++)if(s.loose[i]!==s.jobs.filter(j=>j.target===i&&['haul','unload'].includes(j.phase)).length)fail();
      if(s.stats&&s.stats.grainSettled===undefined)s.stats.grainSettled=0;
      if(!s.stats||['dug','delivered','nursery','food','passage','grainDug','grainDelivered','grainSettled','yields'].some(k=>!integer(s.stats[k],0,FINE_SIZE))||!finite(s.stats.distance)||s.stats.grainDug-s.stats.grainDelivered!==pending.size||s.stats.dug-s.stats.delivered!==s.jobs.filter(j=>j.phase==='haul'||j.phase==='unload').length)fail();
      if(!Array.isArray(s.events)||s.events.length>30||s.events.some(e=>!finite(e.time)||typeof e.text!=='string'||e.text.length>200))fail();
      for(let i=0;i<SIZE;i++){
        const cells=GRAIN.cells(i);if(s.terrain[i]!==cells.reduce((n,g)=>Math.max(n,s.grains[g]===PEBBLE?SOIL:s.grains[g]),0))fail();
        for(const g of cells)if(s.grains[g]&&(s.grainRoom[g]||s.grainPending[g])||!!s.grainPending[g]!==pending.has(g))fail();
      }
      s.initObjects(pack.physics);
      const counts={soil:0,egg:0,food:0,waste:0,cookie:0};let delivered=0;
      for(const b of s.physics.bodies){counts[b.kind]++;if(b.carrier){const a=s.ants.find(a=>a.id===b.carrier);if(!a&&b.carrier>=200)continue;if(!a||(b.kind==='soil'?!s.jobs.some(j=>j.ant===a.id&&j.grains.includes(b.source)):a.itemTask?.body!==b.id))fail();}else if(s.physics.terrainOverlap(b)||s.physics.penetration(b)>1e-5)fail();if(b.state==='delivered')delivered++;}
      if(counts.soil+s.stats.grainSettled!==s.stats.grainDug||delivered+s.stats.grainSettled!==s.stats.grainDelivered)fail();
      const itemOwners=new Set();
      for(const a of s.ants){
        if(a.y>=SURFACE&&!s.poseClear(a,s.carriedKind(a)))fail();
        if(a.itemTask){const t=a.itemTask,b=s.physics.byId.get(t.body);if(a.job!==null||!b||b.kind==='soil'||itemOwners.has(b.id)||!['fetch','store'].includes(t.phase)||![1,...s.roomIds()].includes(t.rid)||!integer(t.destination,0,SIZE-1)||(t.phase==='store'?b.carrier!==a.id:!!b.carrier))fail();itemOwners.add(b.id);}
      }
      return s;
    }
  }
  return { Simulation, Physics, W, H, SIZE, SURFACE, PEBBLE, KEY, STEP, PICKUP_SECONDS, SAVE_FORMAT, WALK_SPEED, MAX_LOAD, LANE_OFFSET, LOAD_OFFSETS, carryShape, GRAIN, GRID, FW, FH, FINE_SIZE, GRAIN_AREA, ANT_SIZE, ANT_BODY, DUMP_CELL, renderAngle, names, xy, idx, neighbors, hash, encodeGrains, decodeGrains, layerBoundaries, grainCost, workCost, soilResistance };
});


