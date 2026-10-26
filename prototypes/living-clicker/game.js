/* Research and depth operate on the organic, physical colony. */
(function(root,factory){
  if(typeof module==='object'&&module.exports)module.exports=factory(require('./lifecycle.js'));
  else root.ColonyGame=factory(root.ColonyLife);
})(typeof globalThis!=='undefined'?globalThis:this,function(Base){
  'use strict';
  const {GRAIN,GRAIN_AREA,GRID,FW,FINE_SIZE,SURFACE,W,H,idx,layerBoundaries,hash}=Base;
  const FORMAT='living-clicker-1';
  const RESEARCH=[
    {id:'gather_1',name:'採集効率I',branch:'採集',desc:'採集係の歩く速さ +15%',food:8,cookie:0,max:3},
    {id:'brood_1',name:'育児効率I',branch:'育児',desc:'卵・幼虫・蛹の育つ速さ +20%',food:6,cookie:0,max:3},
    {id:'dig_speed',name:'掘削促進',branch:'地質',desc:'一粒を掘る速さ +25%',food:6,cookie:0,max:3},
    {id:'queen_fertile',name:'多産の系譜',branch:'女王',desc:'次の卵を産むまでの速さ +15%',food:10,cookie:2,max:3},
    {id:'queen_embrace',name:'女王の包容力',branch:'女王',desc:'コロニーを128匹まで育てられる',food:20,cookie:6,max:1,minAnts:24},
    {id:'geo_depth_2',name:'深度II解放',branch:'地質',desc:'第2層を掘り、深い育児室と食料庫を作れる',food:12,cookie:6,max:1,minAnts:20},
    {id:'geo_depth_3',name:'深度III解放',branch:'地質',desc:'第3・4層を掘り進められる',food:24,cookie:16,max:1,prereq:'geo_depth_2',reached:2},
    {id:'geo_depth_4',name:'深度IV解放',branch:'地質',desc:'第5・6層を掘り進められる',food:40,cookie:32,max:1,prereq:'geo_depth_3',reached:3}
  ];
  const BY_ID=Object.fromEntries(RESEARCH.map(d=>[d.id,d]));
  // Spoil: keep the entrance apron clear, dump below this height, and let a
  // column taller than this many grains compact into the ground.
  // Food appears at x 15-20; spoil columns start past its slope reach.
  const SPOIL_CLEAR=7,SPOIL_DUMP=2,SPOIL_SETTLE=5,SPOIL_LEFT=23;
  const UPGRADE_IDS={walk:'gather_1',brood:'brood_1',dig:'dig_speed'};
  class Simulation extends Base.Simulation{
    constructor(seed=24014){
      super(seed);
      this.progress={research:Object.fromEntries(RESEARCH.map(d=>[d.id,0])),cookie:0,earned:0,spentCookie:0,haulAwards:0,reached:1,claims:[1],speed:1};
      this.events=[];this.log('女王室から、巣づくりを始めます。');
    }
    level(id){return this.progress?.research[id]||0;}
    populationLimit(){return this.level('queen_embrace')?128:64;}
    canLay(){return super.canLay()&&this.ants.length+this.colony.brood.length<this.populationLimit();}
    walkSpeed(ant){return Base.WALK_SPEED*(1+(ant?.role==='forage'?this.level('gather_1')*.15:0));}
    broodRate(){return 1+this.level('brood_1')*.2;}
    layRate(){return 1+this.level('queen_fertile')*.15;}
    digRate(){return 1+this.level('dig_speed')*.25;}
    afterBirth(ant){
      // Every previous newborn inherited ant 1's home: (id-1)%population is
      // always zero at birth. Pick a real reachable free place instead.
      const candidates=[],others=this.ants.filter(a=>a!==ant),homes=others.map(a=>a.home),stock=this.physics.bodies.filter(b=>b.kind!=='soil'&&!b.carrier);
      for(const rid of [1,...this.roomIds().filter(r=>this.builds[r]?.complete)])for(const cell of this.cells(rid)){
        const p=this.walkPoint(cell);if(!p.valid||p.clearance<.8||this.grainRoom[GRAIN.at(p.x,p.y)]!==rid||Math.hypot(p.x-this.entranceHistory[0].x,p.y-this.entranceHistory[0].y)<2)continue;
        if(homes.some(q=>Math.hypot(q.x-p.x,q.y-p.y)<1)||stock.some(b=>Math.hypot(b.x-p.x,b.y-p.y)<.7))continue;
        if(Base.ANT_BODY.some(([cx,rx,ry])=>((p.x-48-cx*6.4)/(rx*6.4+.7))**2+((p.y-24)/(ry*6.4+.6))**2<1))continue;
        for(const angle of [0,Math.PI/2])if(this.poseClear({...p,angle})&&!others.some(a=>a.job===null&&!a.itemTask&&this.workersOverlap({...p,angle},a,null,this.carriedKind(a))))candidates.push({...p,angle,score:Math.hypot(p.x-ant.x,p.y-ant.y)+this.traffic[cell]*2});
      }
      // The founding chamber is a shared rest area when private places fill.
      // Its original homes are clear of the single-file passages.
      for(const a of others.filter(a=>a.id<=12)){const p=a.home;if(this.grainRoom[GRAIN.at(p.x,p.y)]===1)candidates.push({...p,score:100+homes.filter(q=>Math.hypot(q.x-p.x,q.y-p.y)<.8).length*3});}
      for(const p of candidates.sort((a,b)=>a.score-b.score).slice(0,24)){
        const route=this.path(ant,p,null);if(route===null)continue;ant.home={x:p.x,y:p.y,angle:p.angle};ant.path=route;ant.next=0;ant.returning=true;return;
      }
      // If no free place is reachable, wait at the real emergence position.
      // Future work allocation is still allowed; no actor is repositioned.
      ant.home={x:ant.x,y:ant.y,angle:ant.angle};
    }
    depthAbility(){return this.level('geo_depth_4')?6:this.level('geo_depth_3')?4:this.level('geo_depth_2')?2:1;}
    layerAt(x,y){return 1+layerBoundaries(this.seed,x).filter(v=>y>=v).length;}
    canExcavate(g){const p=GRAIN.center(g);return super.canExcavate(g)&&this.layerAt(p.x,p.y)<=this.depthAbility();}
    nextTip(p,target,radius=.5,history=[],twoWay=false,allChoices=false,avoid=null){
      const deep=this.layerAt(target.x,target.y)>1;
      // A deliberate deep expansion must eventually cross the harder stratum.
      // Keep local rock/stock/body constraints, with stronger progress toward
      // the requested depth rather than following soft soil along it forever.
      const blocked=avoid||this.builds?.find(b=>b?.history===history)?.avoided||[],eligible=c=>!blocked.some(p=>Math.hypot(c.x-p.x,c.y-p.y)<.35);
      let choices=super.nextTip(p,target,radius,history,twoWay,true).filter(eligible);
      // Softer soil along the stratum boundary must not outweigh reaching the
      // room: when a step can approach the target, steps away are not taken.
      // Soil effort still ranks the approaching steps, so the shape follows geology.
      if(deep){const gap=Math.hypot(target.x-p.x,target.y-p.y),closer=choices.filter(c=>Math.hypot(target.x-c.x,target.y-c.y)<gap);if(closer.length)choices=closer;}
      // At a rock face, inspect other walls from this actual working pose.
      // The full turn/body/load footprint must be excavatable before adoption.
      if(!choices.length&&deep)choices=super.nextTip(p,target,radius,history,twoWay,true,[-4,-3,-2,-1,0,1,2,3,4]).filter(eligible);
      if(deep)choices.sort((a,b)=>(a.score+Math.hypot(target.x-a.x,target.y-a.y)*1.7)-(b.score+Math.hypot(target.x-b.x,target.y-b.y)*1.7));
      return allChoices?choices:choices[0]||null;
    }
    construction(rid){
      const first=super.construction(rid),b=this.builds[rid];
      if(first.length||rid<4||!b||b.mode!=='passage'||b.next||this.jobs.some(j=>j.build===rid)||this.nextTip(b.tip,b.target,.5,b.history))return first;
      // A blocked face leaves its excavated stub in the world. Move only the
      // planner's head back along real air and choose another exposed wall;
      // workers keep their positions and walk there through verified routes.
      if(!b.avoided)b.avoided=[];if(!b.avoided.some(p=>Math.hypot(p.x-b.tip.x,p.y-b.tip.y)<.1))b.avoided.push({...b.tip});
      for(let k=b.history.length-2;k>=0;k--){
        const history=b.history.slice(0,k+1),tip=history.at(-1),next=this.nextTip(tip,b.target,.5,history,false,false,b.avoided);if(!next)continue;
        b.history=history;b.tip={...tip};b.next=next;b.length=history.slice(1).reduce((n,p,i)=>n+Math.hypot(p.x-history[i].x,p.y-history[i].y),0);
        if(this._transportSets)delete this._transportSets[rid];this.log('岩のそばで向きを変え、別の壁を掘り進めます。');return super.construction(rid);
      }return first;
    }
    roomCapacity(rid){
      if(this._roomCapacityRevision!==this.revision){
        this._roomCapacities={};for(let g=0;g<FINE_SIZE;g++)if(!this.grains[g]&&!this.grainPending[g]&&this.grainRoom[g]>=2){const id=this.grainRoom[g];this._roomCapacities[id]=(this._roomCapacities[id]||0)+GRAIN_AREA*(this.roomKind(id)==='food'?2:1);}
        this._roomCapacityRevision=this.revision;
      }return this._roomCapacities[rid]||0;
    }
    transportReady(rid){
      const b=this.builds[rid];if(!b?.complete)return false;
      if(!this._readyRooms)this._readyRooms=new Map();const old=this._readyRooms.get(rid);
      // Terrain only opens. A proven two-way passage stays usable; failed
      // checks are valid until excavation or the tip history changes.
      if(old?.ok||old?.revision===this.revision&&old?.length===b.history.length)return old.ok;
      const ok=super.transportReady(rid);this._readyRooms.set(rid,{ok,revision:this.revision,length:b.history.length});return ok;
    }
    destinationRoom(kind,body=null){
      if(!this.colony)return super.destinationRoom(kind);
      if(body){const rid=this.grainRoom[GRAIN.at(body.x,body.y)];if(rid>=2&&this.roomKind(rid)===kind&&this.transportReady(rid))return rid;}
      return this.roomIds().filter(r=>this.roomKind(r)===kind&&this.transportReady(r)).sort((a,b)=>a-b)[0]||1;
    }
    receivingRoom(body){
      if(!this.colony)return super.receivingRoom(body);
      const current=this.grainRoom[GRAIN.at(body.x,body.y)];
      if(current>=2&&this.roomKind(current)===body.kind&&this.transportReady(current))return null;
      for(const rid of this.roomIds().filter(r=>this.roomKind(r)===body.kind&&this.transportReady(r))){
        const stored=this._storageLedger?.stored[rid]||0,reserved=this._storageLedger?.reserved[rid]||0;
        // The task allocator checks and shares physical storage availability
        // for this tick. Do not rescan every drop pose for every waiting item.
        if(stored+reserved<this.roomCapacity(rid)&&this._storageLedger?.available[rid]!==false)return rid;
      }return current===1?null:1;
    }
    finishConstruction(){
      super.finishConstruction();if(this._labelRevision===this.revision)return;
      const changed=new Set(),reach=Base.ANT_SIZE+GRAIN.size*2;
      for(const rid of this.roomIds()){
        const b=this.builds[rid];if(b?.mode!=='chamber')continue;
        // Widening at the working head creates real air. Keep that contiguous
        // floor part of the chamber, instead of surrounding it with a ring of
        // corridor tags that disconnects its frontier from the next soil wall.
        // This only labels existing air; it never opens or credits pending soil.
        const queue=[],seen=new Set();
        for(let gy=Math.floor((b.tip.y-reach)*GRID);gy<=Math.ceil((b.tip.y+reach)*GRID);gy++)for(let gx=Math.floor((b.tip.x-reach)*GRID);gx<=Math.ceil((b.tip.x+reach)*GRID);gx++){
          const g=gy*FW+gx;if(this.grainRoom[g]===rid&&!this.grains[g]){queue.push(g);seen.add(g);}
        }
        for(let at=0;at<queue.length;at++)for(const g of this.grainNeighbors(queue[at])){
          if(seen.has(g)||this.grains[g]||this.grainRoom[g])continue;seen.add(g);const p=GRAIN.center(g);
          if(Math.hypot(p.x-b.tip.x,p.y-b.tip.y)>reach)continue;
          if(this.grainPending[g]&&this.jobs.some(j=>j.grains.includes(g)&&j.build!==rid))continue;
          this.grainRoom[g]=rid;queue.push(g);changed.add(idx(Math.floor(p.x),Math.floor(p.y)));
        }
      }
      if(changed.size){for(const cell of changed){this.syncCell(cell);this.invalidateNavigation(cell);}this.revision++;}
      this._labelRevision=this.revision;
    }
    buildNeeds(){
      if(!this.progress)return super.buildNeeds();
      // Allocate real need across available rooms. The newest deep room gets a
      // small initial need; no empty fixed mask is stamped into the ground.
      const result=[];
      for(const kind of ['egg','food']){
        const rooms=this.roomIds().filter(id=>this.roomKind(id)===kind),total=kind==='egg'?this.demands.larvae:this.demands.food;
        let left=total;
        for(const rid of rooms){const newest=rid===rooms.at(-1),share=newest?Math.max(5,left):Math.min(left,Math.max(kind==='egg'?18:24,this.roomCapacity(rid)));
          result.push({rid,wanted:Math.max(0,share),d:(share-this.roomCapacity(rid))/(kind==='food'?2:1)});left=Math.max(0,left-share);
        }
      }return result;
    }
    ensureDepthRooms(){
      const ability=this.depthAbility();
      for(let layer=2;layer<=ability;layer++)for(const kind of ['egg','food']){
        const rid=layer*2+(kind==='food'?1:0);if(this.rooms[rid])continue;
        // A purpose and a direction, with a near-wall starting pose. Only the
        // current tip chooses the next excavated grains around soil and rocks.
        const parent=rid-2,anchor=this.rooms[parent];if(!anchor||!this.builds[parent]?.complete)continue;
        const side=kind==='egg'?-1:1,angle=kind==='food'?0:Math.PI/2-side*.35,poses=[],stock=this.physics.bodies.filter(b=>!b.carrier&&b.kind!=='soil');
        for(const cell of this.cells(parent)){const p=this.walkPoint(cell);if(p.valid&&this.grainRoom[GRAIN.at(p.x,p.y)]===parent&&this.poseClear({...p,angle})){
          const density=stock.reduce((n,b)=>n+Math.exp(-((b.x-p.x)**2+(b.y-p.y)**2)/2),0),score=kind==='food'?(p.x-anchor.x)*1.4+(p.y-anchor.y)*.15-density*2:p.y*.9+(p.x-anchor.x)*side*.4;
          poses.push({...p,angle,score});
        }}
        poses.sort((a,b)=>b.score-a.score);let chosen=null;
        for(const origin of poses){
          const boundary=layerBoundaries(this.seed,origin.x)[layer-2],target={x:Math.max(8,Math.min(W-8,origin.x+side*(7+hash(layer,rid,this.seed)%4))),y:Math.min(H-6,boundary+4)};
          // Survey a short exit at the wall. No future route is stored or dug.
          // Food already on a floor must not seal the first turning step.
          let probe=origin;const recent=[];let open=true;
          for(let n=0;n<6;n++){const next=this.nextTip(probe,target,.5,recent);if(!next){open=false;break;}recent.push(probe);probe=next;}
          if(open){chosen={origin,boundary,target};break;}
        }
        if(!chosen)continue;const {origin,boundary,target}=chosen;
        // Keep ids contiguous: both members of a preceding pair must exist.
        if(rid!==this.rooms.length)continue;
        this.rooms.push({id:rid,...target});
        this.builds.push({tip:{x:origin.x,y:origin.y,angle:origin.angle},target,history:[{x:origin.x,y:origin.y,angle:origin.angle}],length:0,mode:'passage',complete:false,next:null,minDepth:boundary+2.2,minLength:Math.max(6,boundary-origin.y+2.2)});
        this.log('深い'+(kind==='egg'?'育児室':'食料庫')+'へ、掘り進めます。');
      }
    }
    researchCost(id){const d=BY_ID[id];if(!d)return null;const n=this.level(id)+1;return {food:d.food*n,cookie:d.cookie*n};}
    availableFood(){const claimed=new Set(this.ants.filter(a=>a.itemTask).map(a=>a.itemTask.body));return this.foodBodies(true).filter(b=>!claimed.has(b.id));}
    researchStatus(id){
      const d=BY_ID[id];if(!d)return 'unknown';if(this.level(id)>=d.max)return 'done';
      if(d.prereq&&!this.level(d.prereq)||d.minAnts&&this.ants.length<d.minAnts||d.reached&&this.progress.reached<d.reached)return 'locked';
      const c=this.researchCost(id);return this.availableFood().length>=c.food&&this.progress.cookie>=c.cookie?'ready':'cost';
    }
    buyResearch(id){
      if(this.researchStatus(id)!=='ready')return false;
      const cost=this.researchCost(id),food=this.availableFood().slice(0,cost.food);
      for(const b of food)this.physics.remove(b);
      this.colony.stats.spent+=cost.food;this.progress.cookie-=cost.cookie;this.progress.spentCookie+=cost.cookie;this.progress.research[id]++;
      for(const [key,rid]of Object.entries(UPGRADE_IDS))this.colony.upgrades[key]=this.level(rid);
      // Purchase never opens a grain. A subsequent ordinary plan/tick starts work.
      this.planAt=this.time;this.refreshDemand();this.log(BY_ID[id].name+'を研究しました。');return true;
    }
    buy(key){return this.buyResearch(UPGRADE_IDS[key]);}
    upgradeCost(key){return this.researchCost(UPGRADE_IDS[key])?.food??Infinity;}
    // Real colonies drop spoil as a low ring on both sides of the entrance.
    // Fill the nearest low ground first, outward from a clear apron.
    dumpSite(){
      const ex=this.entrance.x,height=x=>SURFACE-.9-this.surfacePoint(x+.5).y,all=[];
      // At each distance take the lower side; level sides alternate per load.
      const left=this.stats.delivered%2===0,preferred=x=>(x<ex)===left?1:0;
      for(let d=SPOIL_CLEAR;d<W;d++){
        const pair=[Math.floor(ex-d),Math.floor(ex+d)].filter(x=>x>=SPOIL_LEFT&&x<W-6&&!all.includes(x));all.push(...pair);
        const open=pair.filter(x=>height(x)<SPOIL_DUMP).sort((a,b)=>height(a)-height(b)||preferred(b)-preferred(a));
        if(open.length)return idx(open[0],SURFACE-1);
      }
      return idx(all.reduce((best,x)=>height(x)<height(best)?x:best),SURFACE-1);
    }
    // A loaded mound compacts into the ground beneath it, as rain and weight
    // do to real spoil. Only a resting delivered grain pressed on the ground
    // under a tall column joins the ground; the grains above slide down.
    settleSpoil(){
      const u=GRAIN.size,columns=new Map();
      for(const b of this.physics.bodies)if(b.kind==='soil'&&b.state==='delivered'&&!b.carrier&&b.rest>=30&&b.y<SURFACE&&this.physics.drag?.id!==b.id){
        const c=Math.floor(b.x/u),column=columns.get(c);if(column)column.push(b);else columns.set(c,[b]);
      }
      for(const column of columns.values()){
        if(column.length<=SPOIL_SETTLE)continue;const bottom=column.reduce((a,b)=>b.y>a.y?b:a);
        if(bottom.y<SURFACE-u)continue;this.physics.remove(bottom);this.stats.grainSettled++;
      }
    }
    tick(dt){
      if(this.progress&&this.ticks%30===0)this.ensureDepthRooms();
      super.tick(dt);if(!this.progress)return;
      if(this.ticks%60===0)this.settleSpoil();
      const awards=Math.floor(this.stats.grainDelivered/80);
      if(awards>this.progress.haulAwards){const delta=awards-this.progress.haulAwards;this.progress.haulAwards=awards;this.progress.cookie+=delta;this.progress.earned+=delta;}
      if(this.ticks%30===0)for(const a of this.ants){if(a.y<SURFACE)continue;const layer=this.layerAt(a.x,a.y);if(layer>this.progress.reached){this.progress.reached=layer;if(!this.progress.claims.includes(layer)){this.progress.claims.push(layer);const amount=layer*3;this.progress.cookie+=amount;this.progress.earned+=amount;this.log('第'+layer+'層に到達。クッキーを'+amount+'個見つけました。');}}}
    }
    status(){return {...super.status(),cookie:this.progress.cookie,reached:this.progress.reached,depthAbility:this.depthAbility(),populationLimit:this.populationLimit()};}
    dump(){this.assertProgress();return {...super.dump(),format:FORMAT,progress:structuredClone(this.progress)};}
    assertProgress(){
      const p=this.progress,int=(v,lo=0,hi=1e9)=>Number.isInteger(v)&&v>=lo&&v<=hi,fail=()=>{throw Error('研究と巣の記録が一致しません');};
      if(!p||!p.research||Object.keys(p.research).length!==RESEARCH.length||RESEARCH.some(d=>!int(p.research[d.id],0,d.max))||!int(p.cookie)||!int(p.earned)||!int(p.spentCookie)||p.cookie+p.spentCookie!==p.earned||!int(p.haulAwards)||p.haulAwards!==Math.floor(this.stats.grainDelivered/80)||!int(p.reached,1,6)||!Array.isArray(p.claims)||p.claims.length>6||new Set(p.claims).size!==p.claims.length||p.claims.some(v=>!int(v,1,p.reached))||!p.claims.includes(1)||!int(p.speed,1,10))fail();
      for(const d of RESEARCH)if(p.research[d.id]&&d.prereq&&!p.research[d.prereq])fail();
      for(const [key,id]of Object.entries(UPGRADE_IDS))if(this.colony.upgrades[key]!==this.level(id))fail();
      const earned=p.haulAwards+p.claims.filter(v=>v>1).reduce((n,v)=>n+v*3,0),cookieSpent=RESEARCH.reduce((n,d)=>n+d.cookie*this.level(d.id)*(this.level(d.id)+1)/2,0),foodSpent=RESEARCH.reduce((n,d)=>n+d.food*this.level(d.id)*(this.level(d.id)+1)/2,0);
      if(p.earned!==earned||p.spentCookie!==cookieSpent||this.colony.stats.spent!==foodSpent||p.reached>this.depthAbility()||Math.max(...p.claims)!==p.reached)fail();
      if(this.ants.length+this.colony.brood.length>this.populationLimit())fail();return true;
    }
    static restore(pack){
      if(pack?.format!==FORMAT||!pack.progress)throw Error('この巣の保存データではありません');
      const life={...pack,format:'living-clicker-life-1'},s=Base.Simulation.restore(life);Object.setPrototypeOf(s,Simulation.prototype);s.progress=structuredClone(pack.progress);s.assertProgress();
      for(const [id,b]of s.builds.entries())if(id>=4&&b&&(!Number.isFinite(b.minLength)||b.minLength<6||b.minLength>80||!Number.isFinite(b.minDepth)||b.minDepth<SURFACE||b.minDepth>H))throw Error('深い部屋の記録が正しくありません');
      for(const b of s.builds)if(b?.avoided&&(!Array.isArray(b.avoided)||b.avoided.length>512||b.avoided.some(p=>!Number.isFinite(p.x)||!Number.isFinite(p.y)||!Number.isFinite(p.angle)||p.x<0||p.x>W||p.y<SURFACE||p.y>H)))throw Error('掘削の方向の記録が正しくありません');
      for(const job of s.jobs)for(const g of job.grains.slice(job.cursor))if(s.layerAt(GRAIN.center(g).x,GRAIN.center(g).y)>s.depthAbility())throw Error('未解放の地層を掘る仕事があります');
      return s;
    }
  }
  return {...Base,Simulation,KEY:'livingClicker_1',SAVE_FORMAT:FORMAT,RESEARCH,BY_ID};
});
