/* Exploration is independent of excavation. Revealing a wall never removes it. */
(function(root){
  const STRIDE=65536,RADIUS=6,offsets=[];
  for(let y=-RADIUS;y<=RADIUS;y++)for(let x=-RADIUS;x<=RADIUS;x++){const d=Math.ceil(Math.hypot(x,y));if(d<=RADIUS)offsets.push([x,y,d]);}
  function create({air,geology,invalidate,award,onReach},saved=null){
    const seen=new Map(saved?.seen||[]),discovered=new Set(saved?.discovered||[]),active=new Set(saved?.active||[]),claimed=new Set(saved?.claimed||[]);
    let reached=saved?.reached||1,mineAcc=saved?.mineAcc||0;
    function reveal(k){
      const y=Math.floor(k/STRIDE),x=k-y*STRIDE;
      for(const [dx,dy,d]of offsets){if(x+dx<0||y+dy<0)continue;const n=k+dx+dy*STRIDE;if(d<(seen.get(n)??99)){seen.set(n,d);invalidate(n);}}
      for(const p of geology.config.deposits)if(!discovered.has(p.id)){
        const cx=x*2+1,cy=y*2+1;if((cx-p.x)**2+(cy-p.y)**2<=(p.r+2)**2)discovered.add(p.id);
      }
    }
    function visit(x,y,safe=true){
      if(!safe)return;const layer=geology.layerAt(x,y);if(layer>reached){reached=layer;onReach?.(layer);}
      for(const p of geology.config.deposits)if(discovered.has(p.id)&&(x-p.x)**2+(y-p.y)**2<=(p.r+20)**2)active.add(p.id);
    }
    function delivered(b){const id=geology.sample(b.source).deposit;if(id&&!claimed.has(id)){
      const p=geology.config.deposits.find(p=>p.id===id);claimed.add(id);discovered.add(id);active.add(id);award?.(p.reward,p);
    }}
    function mine(dt,enabled){if(!enabled)return 0;mineAcc+=active.size*.3*dt;const n=Math.floor(mineAcc);mineAcc-=n;return n;}
    // A pre-geology save has no exploration layer. Initialize from its real air only.
    if(!saved)for(const k of air.keys())reveal(k);
    return {reveal,visit,delivered,mine,seen,discovered,active,claimed,get reached(){return reached;},dump:()=>({format:'exploration-1',seen:[...seen],reached,discovered:[...discovered],active:[...active],claimed:[...claimed],mineAcc})};
  }
  root.ClickerExploration={create};if(typeof module!=='undefined')module.exports=root.ClickerExploration;
})(globalThis);
