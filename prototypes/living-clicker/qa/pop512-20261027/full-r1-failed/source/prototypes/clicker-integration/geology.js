/* Immutable, saved geology. One cell query serves digging, rendering and discovery. */
(function(root){
  const STRIDE=65536;
  const hash=(a,b,s=0)=>{let v=Math.imul(a+317,374761393)^Math.imul(b+719,668265263)^s;v=Math.imul(v^(v>>>13),1274126177);return (v^(v>>>16))>>>0;};
  function create({config,width,height,nodes,protectedCells}){
    const cache=new Map(),g=structuredClone(config),blocked=protectedCells||new Set();
    const offsets=g.boundaries.map((_,i)=>(hash(i,1,g.seed)%628)/100);
    function boundary(i,x){return g.boundaries[i]+Math.sin(x*.012+offsets[i])*8+Math.sin(x*.027-offsets[i])*3;}
    function layerAt(x,y){let layer=1;while(layer<=g.boundaries.length&&y>=boundary(layer-1,x))layer++;return layer;}
    if(!g.rocks){
      g.rocks=[];
      for(let i=0;i<48;i++){
        const x=90+hash(i,2,g.seed)%Math.max(1,Math.floor(width-180)),y=315+hash(i,3,g.seed)%Math.max(1,Math.floor(height-400)),rx=10+hash(i,4,g.seed)%20,ry=7+hash(i,5,g.seed)%13;
        let intersects=false;
        for(let yy=Math.floor((y-ry-16)/2);yy<=Math.ceil((y+ry+16)/2)&&!intersects;yy++)for(let xx=Math.floor((x-rx-16)/2);xx<=Math.ceil((x+rx+16)/2);xx++)if(blocked.has(xx+yy*STRIDE)){intersects=true;break;}
        if(!intersects)g.rocks.push({x,y,rx,ry,phase:(hash(i,6,g.seed)%628)/100});
      }
    }
    function depositAt(x,y){return g.deposits.find(d=>(x-d.x)**2+(y-d.y)**2<=d.r*d.r)||null;}
    function sample(k){
      let v=cache.get(k);if(v)return v;
      const cy=Math.floor(k/STRIDE),cx=k-cy*STRIDE,x=cx*2+1,y=cy*2+1,layer=layerAt(x,y);
      const rock=g.rocks.some(r=>{const dx=(x-r.x)/r.rx,dy=(y-r.y)/r.ry,t=Math.atan2(dy,dx);return dx*dx+dy*dy<1+.12*Math.sin(t*3+r.phase);});
      const deposit=depositAt(x,y);v={layer,required:Math.min(4,layer),material:rock?3:layer%2?1:2,hardness:[.16,.23,.32,.4,.45,.5][layer-1],deposit:deposit?.id||null};cache.set(k,v);return v;
    }
    return {sample,layerAt,boundary,config:g,depositAt,canDig:(k,depth)=>{const v=sample(k);return v.material!==3&&v.required<=depth;}};
  }
  function legacyConfig(world,dpr,mask){
    const nodes=world.nodes,ys=[];let last=0;
    for(let b=0;b<5;b++){
      const group=nodes.filter(n=>n.band===b),max=group.length?Math.max(...group.map(n=>Math.max(n.y+n.r,...(n.blob||[]).map(p=>p.y))/dpr)):550+b*260;
      const y=Math.max(last+120,max+35);ys.push(y);last=y;
    }
    const seed=hash(Math.round(world.w/dpr),Math.round(world.nodes[world.qid].x/dpr),nodes.length);
    const deposits=[];for(let b=0;b<6;b++){
      const n=nodes.find(n=>n.band===b&&n.type==='nursery'&&!world.nodeVis?.[n.id])||nodes.find(n=>n.band===b&&n.type==='nursery');
      if(n)deposits.push({id:'vein-'+b,layer:b+1,x:Math.round(n.x/dpr/2)*2+1,y:Math.round((n.y/dpr-5)/2)*2+1,r:5,reward:12+b*8});
    }
    return {format:'geology-1',seed,boundaries:ys,deposits,tunnelRadius:15,layout:'retained'};
  }
  root.ClickerGeology={create,legacyConfig,hash};if(typeof module!=='undefined')module.exports=root.ClickerGeology;
})(globalThis);
