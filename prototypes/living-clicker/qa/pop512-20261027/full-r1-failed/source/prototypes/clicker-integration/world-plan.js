/* Initial room purposes and a compact bootstrap. Coordinates are CSS pixels. */
(function(root){
  function random(seed){let z=seed>>>0;return ()=>((z=(Math.imul(z,1664525)+1013904223)>>>0)/4294967296);}
  function inside(poly,x,y){let odd=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const a=poly[i],b=poly[j];if((a.y>y)!==(b.y>y)&&x<(b.x-a.x)*(y-a.y)/(b.y-a.y)+a.x)odd=!odd;}return odd;}
  function create(seed){
    const rand=random(seed),nodes=[],edges=[],byNode=[];
    function node(x,y,r,type,band=null){
      const id=nodes.length,n={id,x,y,r,type,band,main:type==='shaft',branch:false,invEgg:0,invGoldenEgg:0,invFood:0,invCookie:0,invLarva:0,invGoldenLarva:0,invLarvaFood:0,invWaste:0,waste:0,fermentState:'idle',fermentProgress:0,fermentInputFood:0,blobScaleX:1.15,blobScaleY:.88,floorFlat:.2,blob:[],slots:[]};
      const phase=rand()*Math.PI*2;
      for(let i=0;i<28;i++){const t=i/28*Math.PI*2,noise=1+.07*Math.sin(t*3+phase)+.045*Math.sin(t*5-phase);n.blob.push({x:x+Math.cos(t)*r*1.15*noise,y:y+Math.sin(t)*r*.88*noise});}
      for(let yy=y-r*.7;yy<=y+r*.7;yy+=5)for(let xx=x-r;xx<=x+r;xx+=5)if(inside(n.blob,xx,yy))n.slots.push({x:xx,y:yy});
      if(n.slots.length<3)n.slots=[{x,y},{x:x-1,y},{x:x+1,y}];
      nodes.push(n);byNode.push([]);return id;
    }
    function edge(u,v){
      const a=nodes[u],b=nodes[v],dx=b.x-a.x,dy=b.y-a.y,len=Math.hypot(dx,dy),sway=(rand()-.5)*Math.min(24,len*.22),nx=-dy/len,ny=dx/len,id=edges.length;
      edges.push({id,u,v,p0:{x:a.x,y:a.y},p1:{x:a.x+dx*.34+nx*sway,y:a.y+dy*.34+ny*sway},p2:{x:a.x+dx*.69-nx*sway*.6,y:a.y+dy*.69-ny*sway*.6},p3:{x:b.x,y:b.y},kind:'branch'});byNode[u].push(id);byNode[v].push(id);return id;
    }
    const eid=node(600,170,12,'entrance'),qid=node(600,270,60,'queen'),entry=edge(eid,qid),trunk=node(600,345,5,'shaft',0),stem=edge(qid,trunk);
    const firstNursery=node(680,365,24,'nursery',0),firstFood=node(520,365,24,'food',0),en=edge(trunk,firstNursery),ef=edge(trunk,firstFood);
    let previous=trunk;
    const nurseryIds=[],deposits=[];
    for(let band=0;band<6;band++){
      const y=435+band*260;
      const shaft=node(600+(band%2?12:-8),y,5,'shaft',band);edge(previous,shaft);
      const nursery=node(band===0?680:690,y+(band===0?-5:3),band===0?20:22,'nursery',band),food=node(510,y-3,22,'food',band);edge(band===0?firstNursery:shaft,nursery);edge(shaft,food);nurseryIds.push(nursery);
      const nr2=node(band===0?735:760,y-58,band===0?18:22,'nursery',band),store=node(440,y+56,22,'storage',band);edge(band===0?firstNursery:nursery,nr2);edge(food,store);
      for(const [dx,dy,type,parent]of [[-75,65,'rest',food],[75,65,'cookieroom',nursery],[-150,-60,'waste',food],[150,60,'ferment',nursery],[0,100,'soldier',shaft]])edge(parent,node(600+dx,y+dy,22,type,band));
      deposits.push({id:'vein-'+band,layer:band+1,x:Math.round(nodes[nursery].x/2)*2+1,y:Math.round((nodes[nursery].y-5)/2)*2+1,r:5,reward:12+band*8});
      previous=shaft;
    }
    const nodeVis=nodes.map(()=>false),edgeFrac=edges.map(()=>0);for(const id of [eid,qid,trunk,firstNursery,firstFood])nodeVis[id]=true;for(const id of [entry,stem,en,ef])edgeFrac[id]=1;
    return {seed,w:1200,h:2150,sy:160,eid,qid,mainTipId:trunk,nodes,edges,byNode,nodeVis,edgeFrac,deposits,
      band:{top:320,bottom:535,height:215,step:260,index:0,targetFill:7,targetSpan:.68,needSide:false,forceShaft:0,depthLock:false},boundaries:[550,810,1070,1330,1590]};
  }
  root.ClickerWorldPlan={create,inside};if(typeof module!=='undefined')module.exports=root.ClickerWorldPlan;
})(globalThis);
