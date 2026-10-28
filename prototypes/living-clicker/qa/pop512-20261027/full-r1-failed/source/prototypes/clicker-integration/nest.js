/* Main-game adapter. Existing economy and room purposes remain authoritative.
   Construction is credited only after the same physical grains are delivered. */
window.createClickerGrainNest=function(api){
  'use strict';
  const {S,G,ctx,dp,cubic,pointInPolygon,surfaceY,rebuildBuilderAssignments,finishTarget,onDigChunk=()=>{},getResearchBonus}=api;
  const STRIDE=65536,TILE=64,Physics=LivingNest.Physics;
  let world=null,air=new Map(),targets=new Map(),jobs=new Map(),tiles=new Map(),walkCache=new Map(),routeHistory=new Map(),physics=null,nextAt=0,revision=0;
  let stats={dug:0,delivered:0,completed:0},nextBody=1;
  let geology=null,exploration=null,legalCache=new Map();
  const size=()=>dp(2),scale=()=>size()/.25,key=(x,y)=>x+y*STRIDE;
  const decode=k=>{const y=Math.floor(k/STRIDE);return {x:k-y*STRIDE,y};};
  const center=k=>{const p=decode(k),g=size();return {x:(p.x+.5)*g,y:(p.y+.5)*g};};
  const at=(x,y)=>key(Math.floor(x/size()),Math.floor(y/size()));
  function invalidate(k){if(!tiles.size)return;const p=decode(k),x=Math.floor(p.x/TILE),y=Math.floor(p.y/TILE);for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++)tiles.delete(key(x+dx,y+dy));}
  function clear(k,rid=0){if(air.has(k))return;air.set(k,rid);invalidate(k);exploration?.reveal(k);const p=decode(k);for(const [radius,cache]of walkCache){const reach=Math.ceil(radius/2)+2;for(let dy=-reach;dy<=reach;dy++)for(let dx=-reach;dx<=reach;dx++)cache.delete(key(p.x+dx,p.y+dy));}revision++;}
  const material=k=>geology?.sample(k).material||1;
  const depth=()=>G.getDepthUnlocked?G.getDepthUnlocked():4;
  const hash=(x,y)=>{let z=Math.imul(x+317,374761393)^Math.imul(y+719,668265263);z=Math.imul(z^(z>>>13),1274126177);return (z^(z>>>16))>>>0;};
  function solid(x,y){return x<0||x>S.full.w||y<0||y>S.full.h||y>=surfaceY(x)&&!air.has(at(x,y));}
  function disk(out,x,y,r,rid){const g=size();for(let gy=Math.floor((y-r)/g);gy<=Math.floor((y+r)/g);gy++)for(let gx=Math.floor((x-r)/g);gx<=Math.floor((x+r)/g);gx++)if(gx>=0&&gy>=0&&((gx+.5)*g-x)**2+((gy+.5)*g-y)**2<r*r)out.set(key(gx,gy),rid);}
  function roomMask(out,n){
    if(n.type==='shaft'||n.type==='entrance'){disk(out,n.x,n.y,dp(15),n.id);return;}
    const g=size(),blob=n.blob||[],r=(n.r||dp(30))*2;
    const minX=blob.length?Math.min(...blob.map(p=>p.x)):n.x-r,maxX=blob.length?Math.max(...blob.map(p=>p.x)):n.x+r;
    const minY=blob.length?Math.min(...blob.map(p=>p.y)):n.y-r,maxY=blob.length?Math.max(...blob.map(p=>p.y)):n.y+r;
    for(let y=Math.floor(minY/g);y<=Math.ceil(maxY/g);y++)for(let x=Math.floor(minX/g);x<=Math.ceil(maxX/g);x++){
      const wx=(x+.5)*g,wy=(y+.5)*g;if(blob.length?pointInPolygon(blob,wx,wy):(wx-n.x)**2+(wy-n.y)**2<r*r)out.set(key(x,y),n.id);
    }
  }
  function edgeMask(out,e,f=1,dir=1){
    const length=Math.hypot(e.p3.x-e.p0.x,e.p3.y-e.p0.y),steps=Math.max(2,Math.ceil(length/size()*1.5));
    for(let k=0;k<=steps*f;k++){const t=dir===1?k/steps:1-k/steps,p=cubic(e.p0,e.p1,e.p2,e.p3,t);disk(out,p.x,p.y,dp(world?._grainGeology?.tunnelRadius||15),0);}
  }
  function makePhysics(){physics=new Physics.World((x,y)=>solid(x*scale(),y*scale())?1:0,Math.ceil(S.full.w/scale()),Math.ceil(S.full.h/scale()),.25);}
  function ensure(){
    if(world===S.full&&physics)return;
    world=S.full;air=new Map();targets=new Map();jobs=new Map();tiles=new Map();walkCache=new Map();routeHistory=new Map();legalCache=new Map();geology=null;exploration=null;stats={dug:0,delivered:0,completed:0};nextAt=0;revision=0;
    if(!world)return;
    const initial=new Map();world.nodes.forEach((n,i)=>{if(S.nodeVis[i])roomMask(initial,n);});
    world.edges.forEach((e,i)=>{const f=S.edgeFrac[i]||0;if(f>0)edgeMask(initial,e,f,S.nodeVis[e.u]?1:-1);});
    // The initial entrance opens onto the generated surface, including high ridges.
    // This is initial geometry only: restore() replaces it with the saved real air.
    const entrance=world.nodes[world.eid],mouth=surfaceY(entrance.x)-dp(12);
    for(let y=Math.min(mouth,entrance.y);y<=Math.max(mouth,entrance.y)+size();y+=size())disk(initial,entrance.x,y,dp(15),entrance.id);
    for(const [k,rid]of initial)clear(k,rid);makePhysics();initGeology();
  }
  function initGeology(saved=null,sight=null){
    const protectedCells=new Map();for(const n of world.nodes)roomMask(protectedCells,n);for(const e of world.edges)edgeMask(protectedCells,e);
    const config=saved||world._grainGeology||ClickerGeology.legacyConfig({...world,nodeVis:S.nodeVis},dp(1));
    geology=ClickerGeology.create({config,width:world.w/dp(1),height:world.h/dp(1),nodes:world.nodes,protectedCells});world._grainGeology=geology.config;
    exploration=ClickerExploration.create({air,geology,invalidate,award:(n,p)=>api.onDiscovery?.(n,p),onReach:n=>api.onReach?.(n)},sight);
    legalCache.clear();
    if(!sight){const q=world.nodes[world.qid];for(const n of world.nodes)if(S.nodeVis[n.id]&&geology.layerAt(n.x/dp(1),n.y/dp(1))>exploration.reached&&path(n,q,dp(11)))exploration.visit(n.x/dp(1),n.y/dp(1));}
  }
  function mask(t){const out=new Map();edgeMask(out,world.edges[t.eid],1,t.dir);roomMask(out,world.nodes[t.to]);return out;}
  function requirement(t){ensure();let info=legalCache.get(t.eid);if(info)return info;let required=1,rock=false;for(const k of mask(t).keys())if(!air.has(k)){const v=geology.sample(k);required=Math.max(required,v.required);rock||=v.material===3;}info={required,rock};legalCache.set(t.eid,info);return info;}
  function canTarget(t){ensure();if(!t||!world.edges[t.eid])return false;const info=requirement(t);return !info.rock&&info.required<=depth()&&(!api.canRoom||api.canRoom(world.nodes[t.to],targets.get(t.eid)||t));}
  function chooseTarget(){
    ensure();const candidates=[];
    for(const e of world.edges){if(S.edgeFrac[e.id]>=1)continue;const a=!!S.nodeVis[e.u],b=!!S.nodeVis[e.v];if(!a&&!b)continue;
      const to=a?e.v:e.u,dir=a?1:-1,n=world.nodes[to],t={eid:e.id,to,dir,score:0,reason:'grain-demand'};
      if(!canTarget(t)||api.reservable&&!api.reservable(t))continue;
      const layer=geology.layerAt(n.x/dp(1),n.y/dp(1)),needNursery=G.caps.pop<500||G.tot>G.caps.pop*.65;
      let score=1000-(layer-1)*80-Math.hypot(n.x-world.nodes[world.qid].x,n.y-world.nodes[world.qid].y)/dp(20);
      if(a&&b)score-=700;
      if(n.type==='nursery'&&needNursery)score+=800;
      if(n.type==='food'&&G.food>G.caps.food*.65)score+=500;
      if(!['shaft','nursery','food','storage','rest'].includes(n.type))score+=1600;
      if(layer>exploration.reached&&layer<=depth())score+=1700;
      if(n.type==='nursery'&&layer===exploration.reached&&layer>1&&!world.nodes.some(o=>o.type==='nursery'&&S.nodeVis[o.id]&&geology.layerAt(o.x/dp(1),o.y/dp(1))===layer))score+=1800;
      t.score=score;candidates.push(t);
    }
    candidates.sort((a,b)=>b.score-a.score||a.eid-b.eid);const chosen=candidates[0]||null;
    if(chosen){const n=world.nodes[chosen.to],layer=geology.layerAt(n.x/dp(1),n.y/dp(1));S.band.index=layer-1;}return chosen;
  }
  function pass(p,r=dp(5.5)){
    if(p.x<r||p.x>S.full.w-r||p.y<r||p.y>S.full.h-r)return false;
    if(p.y<surfaceY(p.x)&&p.y<=Math.min(surfaceY(p.x-r),surfaceY(p.x+r))-dp(6))return true;
    for(let y=-r;y<=r+.01;y+=size())for(let x=-r;x<=r+.01;x+=size())if(x*x+y*y<=r*r&&solid(p.x+x,p.y+y))return false;
    return true;
  }
  function segment(a,b,r){const n=Math.ceil(Math.hypot(b.x-a.x,b.y-a.y)/size());for(let k=0;k<=n;k++){const t=n?k/n:0;if(!pass({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t},r))return false;}return true;}
  function path(start,end,r=dp(5.5)){
    if(segment(start,end,r))return [{x:end.x,y:end.y}];
    // Excavation only opens terrain: the interior of a verified route remains
    // valid. Connect both ends through newly checked segments before reusing it.
    const radius=r/dp(1),history=routeHistory.get(radius)||[];
    for(let h=history.length-1;h>=0;h--){const route=history[h],last=route.at(-1);if(Math.hypot(last.x-end.x,last.y-end.y)>dp(40)||!segment(last,end,r))continue;
      for(let k=route.length-1;k>=0;k--)if(Math.hypot(route[k].x-start.x,route[k].y-start.y)<dp(80)&&segment(start,route[k],r))return [...route.slice(k).map(p=>({...p})),{x:end.x,y:end.y}];
    }
    const g=size(),near=p=>{const x=Math.round(p.x/g),y=Math.round(p.y/g);for(let d=0;d<=4;d++)for(let dy=-d;dy<=d;dy++)for(let dx=-d;dx<=d;dx++){if(Math.max(Math.abs(dx),Math.abs(dy))!==d)continue;const q={x:(x+dx)*g,y:(y+dy)*g};if(segment(p,q,r))return {x:x+dx,y:y+dy};}return null;};
    const a=near(start),b=near(end);if(!a||!b)return null;
    if(!walkCache.has(radius))walkCache.set(radius,new Map());const valid=walkCache.get(radius);
    const begin=key(a.x,a.y),goal=key(b.x,b.y),dist=new Map([[begin,0]]),prev=new Map(),heap=[];
    const push=(id,cost)=>{heap.push({id,cost});let k=heap.length-1;while(k){const p=(k-1)>>1;if(heap[p].cost<=cost)break;[heap[p],heap[k]]=[heap[k],heap[p]];k=p;}};
    const pop=()=>{const v=heap[0],z=heap.pop();if(heap.length){heap[0]=z;let k=0;while(true){let n=k,l=k*2+1;if(l<heap.length&&heap[l].cost<heap[n].cost)n=l;if(l+1<heap.length&&heap[l+1].cost<heap[n].cost)n=l+1;if(n===k)break;[heap[n],heap[k]]=[heap[k],heap[n]];k=n;}}return v;};
    push(begin,0);let count=0,found=false;const visited=new Set();
    while(heap.length&&count<70000){const v=pop();if(visited.has(v.id))continue;visited.add(v.id);count++;if(v.id===goal){found=true;break;}const p=decode(v.id),d=dist.get(v.id);
      for(const [dx,dy]of [[1,0],[-1,0],[0,1],[0,-1]]){const x=p.x+dx,y=p.y+dy,id=key(x,y),n=d+1;if(x<0||y<0||x*g>S.full.w||y*g>S.full.h||n>=(dist.get(id)??Infinity))continue;
        if(!valid.has(id))valid.set(id,pass({x:x*g,y:y*g},r));if(!valid.get(id))continue;
        dist.set(id,n);prev.set(id,v.id);push(id,n+Math.abs(x-b.x)+Math.abs(y-b.y));}
    }
    if(!found)return null;const points=[{x:end.x,y:end.y}];for(let id=goal;id!==begin;id=prev.get(id)){const p=decode(id);points.push({x:p.x*g,y:p.y*g});}points.push({x:a.x*g,y:a.y*g});points.reverse();
    const out=[];let last=start;for(let k=0;k<points.length;){let n=k;while(n+1<points.length&&segment(last,points[n+1],r))n++;out.push(points[n]);last=points[n];k=n+1;}history.push(out);if(history.length>32)history.shift();routeHistory.set(radius,history);return out;
  }
  function target(t){
    let v=targets.get(t.eid);if(v)return v;
    if(!canTarget(t))return null;const reservation=api.beginTarget?.(t);if(reservation===false)return null;
    const e=world.edges[t.eid],n=world.nodes[t.to],source=world.nodes[t.dir===1?e.u:e.v],mask=new Map();edgeMask(mask,e,1,t.dir);roomMask(mask,n);
    const grains=[...mask.keys()].filter(k=>!air.has(k));grains.sort((a,b)=>{const p=center(a),q=center(b);return Math.hypot(p.x-source.x,p.y-source.y)-Math.hypot(q.x-source.x,q.y-source.y);});
    v={...t,reservation:reservation||null,grains,total:grains.length,delivered:0,cleared:0,mask:[...mask.entries()],base:S.edgeFrac[t.eid]||0,rewarded:Math.floor((S.edgeFrac[t.eid]||0)*50)};targets.set(t.eid,v);return v;
  }
  function pickupClear(k,pose,opened){
    const p=center(k),end={x:pose.x+Math.cos(pose.rot)*dp(9),y:pose.y+Math.sin(pose.rot)*dp(9)},g=size();
    const steps=Math.max(1,Math.ceil(Math.hypot(p.x-end.x,p.y-end.y)/(g/2)));
    for(let n=0;n<=steps;n++){const t=n/steps,x=p.x+(end.x-p.x)*t,y=p.y+(end.y-p.y)*t;
      for(const dx of [-g*.45,g*.45])for(const dy of [-g*.45,g*.45])if(solid(x+dx,y+dy)&&!opened.has(at(x+dx,y+dy)))return false;
    }return true;
  }
  function workPose(a,k){
    const c=center(k);
    for(let h=0;h<48;h++){const angle=(h%16)*Math.PI/8,reach=[10,12,14][Math.floor(h/16)],pose={x:c.x-Math.cos(angle)*dp(reach),y:c.y-Math.sin(angle)*dp(reach),rot:angle};
      if(!pass(pose)||!pickupClear(k,pose,new Set([k]))||[...jobs.values()].some(j=>['travel','dig'].includes(j.phase)&&Math.hypot(j.pose.x-pose.x,j.pose.y-pose.y)<dp(9)))continue;
      const route=path(a,pose);if(!route)continue;
      // A narrow side wall can support a loaded turn without a full 12px retreat.
      // Every alternative still fits the complete load and has a verified return route.
      for(const distance of [12,8,4,0]){const back={x:pose.x-Math.cos(angle)*dp(distance),y:pose.y-Math.sin(angle)*dp(distance)};
        if(!pass(back,dp(11))||!segment(pose,back))continue;const dump=dropPoint(a),haul=path(back,dump,dp(11));if(haul)return {pose,route,back};
      }
    }return null;
  }
  function assignJob(a,v,grains,chosen){
    const job={id:a.vid,eid:v.eid,to:v.to,dir:v.dir,grains,pose:chosen.pose,back:chosen.back,route:chosen.route,next:0,phase:'travel',cursor:0,stroke:0,cargo:[],credited:false};jobs.set(a.vid,job);a.digT={eid:v.eid,to:v.to,dir:v.dir};return job;
  }
  function plan(a){
    const choices=Object.values(S.buildAssignments?.targets||{}).filter(t=>S.edgeFrac[t.eid]<1&&canTarget(t));
    const reserved=new Set([...jobs.values()].flatMap(j=>j.grains));
    const crew=S.ants.filter(a=>a.role==='builder').length;
    for(const t of choices){const v=target(t);if(!v)continue;if([...jobs.values()].filter(j=>j.eid===v.eid).length>=Math.max(1,t.assigned||1,Math.ceil(crew/Math.max(1,choices.length))))continue;
      let attempts=0;const start=v.scanIndex||0;
      for(let offset=0;offset<v.grains.length;offset++){const index=(start+offset)%v.grains.length,k=v.grains[index];if(air.has(k)||reserved.has(k)||!geology.canDig(k,depth()))continue;const p=decode(k);if(![[1,0],[-1,0],[0,1],[0,-1]].some(([x,y])=>air.has(key(p.x+x,p.y+y))))continue;
        const chosen=workPose(a,k);
        if(!chosen){if(++attempts>=12){v.scanIndex=(index+1)%v.grains.length;v.scanned=(v.scanned||0)+offset+1;break;}continue;}
        const grains=[k];for(const n of v.grains){if(grains.length>=4)break;if(n===k||air.has(n)||reserved.has(n)||!geology.canDig(n,depth()))continue;const q=decode(n);if(Math.abs(q.x-p.x)>1||Math.abs(q.y-p.y)>1||!grains.some(id=>{const b=decode(id);return Math.abs(b.x-q.x)+Math.abs(b.y-q.y)===1;})||!pickupClear(n,chosen.pose,new Set([...grains,n])))continue;grains.push(n);}
        v.scanned=0;return assignJob(a,v,grains,chosen);
      }
      if(attempts<12)v.scanned=(v.scanned||0)+v.grains.length;
      // Tight corners of the old mathematical room can leave a narrow lip that
      // has no safe stance. Widen locally by digging and hauling additional real
      // grains, never by clearing the lip or crediting it without a worker.
      const remaining=v.grains.filter(k=>!air.has(k));
      if((remaining.length<=64||v.scanned>=v.grains.length)&&!jobs.size){const owned=new Set(v.grains),relief=new Map();
        const frontier=remaining.filter(k=>[1,-1,STRIDE,-STRIDE].some(d=>air.has(k+d)));
        for(const k of frontier){const p=decode(k);for(let dy=-6;dy<=6;dy++)for(let dx=-6;dx<=6;dx++){const id=key(p.x+dx,p.y+dy);if(dx*dx+dy*dy>36||air.has(id)||owned.has(id)||reserved.has(id)||![[1,0],[-1,0],[0,1],[0,-1]].some(([x,y])=>air.has(key(p.x+dx+x,p.y+dy+y))))continue;relief.set(id,Math.min(relief.get(id)??Infinity,dx*dx+dy*dy));}}
        for(const [k]of [...relief].sort((a,b)=>a[1]-b[1])){if(!geology.canDig(k,depth()))continue;const chosen=workPose(a,k);if(!chosen)continue;v.grains.push(k);v.total++;v.relief=(v.relief||0)+1;return assignJob(a,v,[k],chosen);}
      }
    }return null;
  }
  function walk(a,j,dt){
    let remaining=dp(200)*getResearchBonus('antSpeed')*dt;
    while(j.next<j.route.length){const p=j.route[j.next],dx=p.x-a.x,dy=p.y-a.y,d=Math.hypot(dx,dy),n=Math.min(d,remaining);if(d){a.x+=dx/d*n;a.y+=dy/d*n;if(!j.backing)a.rot=Math.atan2(dy,dx);}remaining-=n;if(d<=n+1e-7)j.next++;else break;if(remaining<=0)break;}
    return j.next>=j.route.length;
  }
  function cargo(a,j){
    const c=Math.cos(a.rot||0),s=Math.sin(a.rot||0),g=size();for(let k=0;k<j.cargo.length;k++){const b=physics.byId.get(j.cargo[k]);if(!b)throw new Error('運搬中の粒がありません');const x=(k%2-.5)*g,y=(Math.floor(k/2)-.5)*g;let end={x:a.x+c*(dp(9)+x)-s*y,y:a.y+s*(dp(9)+x)+c*y};if(j.pickup?.id===b.id){const p=center(b.source),t=Math.min(1,j.pickup.t/.12);end={x:p.x+(end.x-p.x)*t,y:p.y+(end.y-p.y)*t};}b.x=end.x/scale();b.y=end.y/scale();b.vx=b.vy=0;b.rest=0;physics.index(b);}
  }
  function dropPoint(a){
    const entrance=world.nodes[world.eid],g=size();let x=Math.min(world.w-dp(28),entrance.x+dp(45)+(a.vid%14)*g*2),floor=Math.min(surfaceY(x-dp(11)),surfaceY(x),surfaceY(x+dp(11)));
    // Use the whole worker width when walking onto its actual loose-soil heap.
    for(let gx=Math.floor((x-dp(11))/scale()/.25);gx<=Math.floor((x+dp(11))/scale()/.25);gx++)for(let gy=Math.floor((floor-dp(65))/scale()/.25);gy<=Math.floor(floor/scale()/.25);gy++)if(physics.soilCells.has(gy*physics.columns+gx))floor=Math.min(floor,gy*.25*scale());
    return {x,y:floor-dp(8)};
  }
  function stepBuilder(a,dt){
    ensure();let j=jobs.get(a.vid);if(!j&&S.t>=(a._grainPlanAt||0)){a._grainPlanAt=S.t+.7;j=plan(a);}if(!j){a.task='idle';return;}
    if(['travel','dig'].includes(j.phase)&&j.cursor<j.grains.length&&!j.pickup&&(!geology.canDig(j.grains[j.cursor],depth())||api.canRoom&&!api.canRoom(world.nodes[j.to],targets.get(j.eid)||j))){
      if(j.cargo.length){j.grains=j.grains.slice(0,j.cursor);j.route=[j.back];j.next=0;j.phase='back';j.backing=true;}
      else{jobs.delete(a.vid);a.digT=null;a.task='idle';return;}
    }
    if(j.phase==='travel'){a.task='go_dig';if(walk(a,j,dt)){a.rot=j.pose.rot;j.phase='dig';}}
    else if(j.phase==='dig'){
      if(j.pickup){j.pickup.t+=dt;if(j.pickup.t<.12){cargo(a,j);return;}j.pickup=null;
        if(j.cursor===j.grains.length){j.route=[j.back];j.next=0;j.phase='back';j.backing=true;cargo(a,j);return;}}
      a.task='dig_pick';a.rot=j.pose.rot;const k=j.grains[j.cursor];j.stroke+=dt*(1+Math.max(0,G.bLv||0)*.15)*getResearchBonus('digSpeed');
      if(j.stroke>=geology.sample(k).hardness){
        j.stroke=0;if(air.has(k))throw new Error('同じ粒を二度掘ろうとしました');const q=decode(k);if(![[1,0],[-1,0],[0,1],[0,-1]].some(([x,y])=>air.has(key(q.x+x,q.y+y))))throw new Error('露出していない粒です');clear(k,j.to);stats.dug++;const p=center(k),b=physics.spawn('soil',p.x/scale(),p.y/scale(),{carrier:a.vid,source:k,material:material(k),state:'cargo'});j.cargo.push(b.id);j.pickup={id:b.id,t:0};j.cursor++;
      }
    }else if(j.phase==='back'){
      a.task='haul_out';if(walk(a,j,dt)&&S.t>=(j.retryAt||0)){j.backing=false;j.retryAt=S.t+.5;const dump=dropPoint(a),route=path(a,dump,dp(11));if(route){j.route=route;j.next=0;j.phase='haul';j.dump=dump;}}
    }else if(j.phase==='haul'){
      a.task='haul_out';if(walk(a,j,dt)){j.phase='unload';j.stroke=0;a.rot=0;}
    }else if(j.phase==='unload'){
      a.task='haul_out';j.stroke+=dt;if(j.stroke>=.5){
        if(Math.hypot(a.x-j.dump.x,a.y-j.dump.y)>.1||a.y>=surfaceY(a.x))throw new Error('地上に着く前の荷下ろしです');cargo(a,j);
        for(const id of j.cargo){const b=physics.byId.get(id);b.state='delivered';physics.release(b,1,-1);exploration.delivered(b);}stats.delivered+=j.cargo.length;
        const v=targets.get(j.eid);v.delivered+=j.grains.length;v.cleared+=j.grains.length;
        S.edgeFrac[j.eid]=Math.min(.98,v.base+(1-v.base)*v.delivered/Math.max(1,v.total));
        const earned=Math.min(49,Math.floor(S.edgeFrac[j.eid]*50));v.rewarded=v.rewarded||0;while(v.rewarded<earned){v.rewarded++;onDigChunk(v);}
        if(v.grains.every(k=>air.has(k))&&![...jobs.values()].some(o=>o!==j&&o.eid===j.eid)&&canTarget(v)){
          S.edgeFrac[j.eid]=.999999;finishTarget(v);S.edgeFrac[j.eid]=1;stats.completed++;targets.delete(j.eid);
        }
        jobs.delete(a.vid);a.task='idle';a.cargo=null;a.digT=null;a.node=world.eid;
      }
    }
    if(jobs.has(a.vid)){a.cargo=j.cargo.length?'soil':null;cargo(a,j);}
    exploration.visit(a.x/dp(1),a.y/dp(1),pass(a));
  }
  function update(dt){
    ensure();physics.width=Math.max(physics.width,Math.ceil(world.w/scale()));physics.height=Math.max(physics.height,Math.ceil(world.h/scale()));
    if(S.t>=nextAt){rebuildBuilderAssignments();nextAt=S.t+.5;}
    for(const a of S.ants){const j=jobs.get(a.vid);if(j)cargo(a,j);}
    for(const v of targets.values())if(v.total>0&&v.delivered===v.total&&v.grains.every(k=>air.has(k))&&![...jobs.values()].some(j=>j.eid===v.eid)&&canTarget(v)){
      S.edgeFrac[v.eid]=.999999;finishTarget(v);S.edgeFrac[v.eid]=1;stats.completed++;targets.delete(v.eid);
    }
    physics.step(Math.min(.2,dt));mine(dt);
    S.builderState=jobs.size?'土を掘って運搬中':!Object.keys(S.buildAssignments?.targets||{}).length&&depth()<4?'深度'+['II','III','IV'][depth()-1]+'の研究待ち':'次の部屋の準備待ち';
  }
  function mine(dt){ensure();const n=exploration.mine(dt,api.mineralEnabled?.());if(n)api.addCookie?.(n);return n;}
  function ground(view,top,bottom){
    ensure();const g=size(),unit=TILE*g;
    ctx.save();ctx.imageSmoothingEnabled=false;ctx.shadowBlur=0;ctx.shadowOffsetX=ctx.shadowOffsetY=0;ctx.shadowColor='transparent';
    for(let y=Math.floor(top/unit);y<=Math.floor(bottom/unit);y++)for(let x=Math.floor(view.x/unit);x<=Math.floor((view.x+view.w)/unit);x++){
      if(x<0||y<0)continue;const id=key(x,y);let tile=tiles.get(id);
      if(!tile){tile=document.createElement('canvas');tile.width=tile.height=TILE+2;const c=tile.getContext('2d');
        for(let ly=-1;ly<=TILE;ly++)for(let lx=-1;lx<=TILE;lx++){const gx=x*TILE+lx,gy=y*TILE+ly,k=key(gx,gy),v=hash(gx,gy)%9,depth=Math.min(18,Math.floor(gy/80));if((gy+.5)*g<surfaceY((gx+.5)*g))continue;
          if(air.has(k)){const n=world.nodes[air.get(k)];c.fillStyle=n?.type==='food'?'#dcccab':n?.type==='nursery'?'#e5d7bc':'#deceaf';}
          else{const info=geology.sample(k),seen=exploration.seen.get(k),lit=seen!=null?1-seen*.085:0,soil=info.layer%2?[151,122,84]:[116,88,59],base=info.material===3&&seen!=null?[108,110,105]:soil,shade=seen==null?.13:lit;
            const b=info.deposit&&seen!=null?[183,146,68]:base;c.fillStyle=`rgb(${Math.round((b[0]+v-depth)*shade)},${Math.round((b[1]+v-depth)*shade)},${Math.round((b[2]+v-depth)*shade)})`;}
          c.fillRect(lx+1,ly+1,1,1);
        }tiles.set(id,tile);
      }
      ctx.drawImage(tile,x*unit-g,y*unit-g,unit+g*2,unit+g*2);
    }ctx.restore();
  }
  const art=makeClickerPixelArt({surfaceFloor:x=>{if(!world)return null;return surfaceY(x*scale())/scale();}});
  function drawAnt(a,queen=false){
    const sizeAnt=queen?dp(65):dp(16),angle=a.rot||0,action=a.cargo||a.carryType?'carry':a.task==='dig_pick'?'dig':a.task==='idle'?'idle':'walk';
    const phase=a.task==='dig_pick'?S.t*8:Math.hypot(a.x||0,a.y||0)/dp(2)+(a.anim||0);
    if(!queen&&a.y<=surfaceY(a.x)-dp(4)){
      const y=jobs.has(a.vid)?a.y:surfaceY(a.x)-dp(7);
      const ant={x:a.x/scale(),y:y/scale(),angle},frame=art.surfaceAntFrame(ant,Math.floor(phase)%4,action);ctx.save();ctx.imageSmoothingEnabled=false;ctx.drawImage(frame,a.x-sizeAnt,y-sizeAnt,sizeAnt*2,sizeAnt*2);ctx.restore();
    }else if(!queen&&jobs.get(a.vid)?.phase==='unload'){
      const frame=art.surfaceAntFrame({x:a.x/scale(),y:a.y/scale(),angle},Math.floor(phase)%4,'unload');ctx.save();ctx.imageSmoothingEnabled=false;ctx.drawImage(frame,a.x-sizeAnt,a.y-sizeAnt,sizeAnt*2,sizeAnt*2);ctx.restore();
    }else art.antShape(ctx,a.x,a.y,sizeAnt,angle,phase,queen,action);
    if(!queen&&a.golden){ctx.strokeStyle='#c89832';ctx.lineWidth=dp(1);ctx.strokeRect(a.x-dp(8),a.y-dp(5),dp(16),dp(10));}
    if(!queen&&a.cargo!=='soil'&&(a.cargo||a.carryType)){const s=dp(3),x=a.x+Math.cos(angle)*dp(10),y=a.y+Math.sin(angle)*dp(10);ctx.fillStyle=(a.cargo||a.carryType)==='egg'?'#f8e8bd':'#8c713b';ctx.fillRect(x-s/2,y-s/2,s,s);}
  }
  function drawSoil(){ensure();for(const b of physics.bodies){const x=b.x*scale(),y=b.y*scale(),g=size();ctx.fillStyle=b.material===2?'#806c51':'#a68b62';ctx.fillRect(x-g/2,y-g/2,g,g);}}
  function drawAtlas(g,role,frame,dir,w,h){art.antShape(g,w/2,h/2,Math.min(w,h)*.62,dir*Math.PI/4,frame,false,'walk');}
  function dump(){
    ensure();const packedJobs=structuredClone([...jobs]);for(const [,j]of packedJobs)for(const p of [...j.route,j.pose,...(j.back?[j.back]:[]),...(j.dump?[j.dump]:[])]){p.x/=dp(1);p.y/=dp(1);}
    return {format:'clicker-grain-2',geology:structuredClone(geology.config),exploration:exploration.dump(),time:S.t,nextAt,assignments:structuredClone(S.buildAssignments),air:[...air],targets:structuredClone([...targets]),jobs:packedJobs,stats:{...stats},bodies:physics.bodies.map(b=>Object.fromEntries(['id','kind','x','y','vx','vy','carrier','state','material','rest','source'].map(k=>[k,b[k]]))),nextBody:physics.nextId,clock:physics.clock,remainder:physics.remainder,
      actors:S.ants.filter(a=>a.role==='builder').map(a=>({vid:a.vid,x:a.x/dp(1),y:a.y/dp(1),rot:a.rot||0,node:a.node,task:a.task,digT:a.digT||null,cargo:a.cargo||null,_grainPlanAt:a._grainPlanAt||0})),revision};
  }
  function restore(pack){
    ensure();if(!pack||!['clicker-grain-1','clicker-grain-2'].includes(pack.format)||!Array.isArray(pack.air)||pack.air.length>2000000||!Array.isArray(pack.jobs)||!Array.isArray(pack.bodies))throw new Error('粒の巣を読み込めません');
    S.t=pack.time;nextAt=pack.nextAt;S.buildAssignments=structuredClone(pack.assignments);
    air=new Map(pack.air);targets=new Map(structuredClone(pack.targets));jobs=new Map(structuredClone(pack.jobs));stats={...pack.stats};revision=pack.revision;tiles.clear();walkCache.clear();routeHistory.clear();makePhysics();
    for(const data of pack.bodies){if(!Number.isFinite(data.x)||!Number.isFinite(data.y)||!Number.isInteger(data.id)||data.kind!=='soil')throw new Error('不正な運搬物です');physics.spawn('soil',data.x,data.y,data);}physics.nextId=pack.nextBody;physics.clock=pack.clock;physics.remainder=pack.remainder;
    const dpr=dp(1);for(const [,j]of jobs){for(const p of [...j.route,j.pose,...(j.back?[j.back]:[]),...(j.dump?[j.dump]:[])]){p.x*=dpr;p.y*=dpr;}}
    // Actor IDs are restored before the main-game visual synchronizer runs.
    for(const data of pack.actors||[]){const a=S.ants.find(a=>a.vid===data.vid);if(a)Object.assign(a,{...data,x:data.x*dpr,y:data.y*dpr});}
    for(const j of jobs.values())if(!S.ants.some(a=>a.vid===j.id))throw new Error('運搬する建築アリがいません');
    if(stats.dug!==physics.bodies.length||stats.delivered!==physics.bodies.filter(b=>b.state==='delivered').length)throw new Error('砂粒の数が一致しません');
    initGeology(pack.geology,pack.exploration);
  }
  function restoreActors(pack){
    for(const data of pack?.actors||[]){let a=S.ants.find(a=>a.vid===data.vid);if(!a){a={role:'builder',anim:0,path:[],pIdx:0,sp:1};S.ants.push(a);}Object.assign(a,{...data,x:data.x*dp(1),y:data.y*dp(1)});}
  }
  return {ensure,update,stepBuilder,ground,drawAnt,drawAtlas,drawSoil,dump,restore,restoreActors,path,pass,canTarget,chooseTarget,requirement,debug:{workPose,segment,pickupClear,dropPoint},
    mine,
    get geology(){ensure();return geology;},get exploration(){ensure();return exploration;},
    get reached(){ensure();return exploration.reached;},get stats(){return {...stats};},get jobs(){return jobs;},get air(){return air;},get physics(){return physics;},get revision(){return revision;},get targets(){return targets;}};
};
