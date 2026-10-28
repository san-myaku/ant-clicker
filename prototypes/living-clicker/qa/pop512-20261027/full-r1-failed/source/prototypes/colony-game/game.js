/* Authoritative colony lifecycle. All food and brood are physical core bodies. */
(function(root,factory){
  if(typeof module==='object'&&module.exports)module.exports=factory(require('./core.js'));
  else root.ColonyGame=factory(root.LivingNest);
})(typeof globalThis!=='undefined'?globalThis:this,function(Core){
  'use strict';
  const {Simulation:TerrainSimulation,Physics,GRAIN,SURFACE,WALK_SPEED,idx,STEP}=Core;
  const FORMAT='ant-colony-1',KEY='antColonyGame_1',LIMIT=64;
  const ROLES=['forage','nurse','build'];
  const UPGRADES={walk:{name:'足どりを軽く',cost:8,max:3},brood:{name:'育児の手ほどき',cost:6,max:3},dig:{name:'掘削の手ほどき',cost:6,max:3}};
  class Simulation extends TerrainSimulation{
    constructor(seed=24014){
      super(seed);
      this.colony={nextAnt:13,brood:this.physics.bodies.filter(b=>b.kind==='egg').map(b=>({id:b.id,stage:'egg',age:0,feeds:0,lastFed:-100})),
        wild:[],queen:0,laying:true,lastTap:-10,nextFood:0,roleWeights:{forage:1,nurse:1,build:1},upgrades:{walk:0,brood:0,dig:0},
        stats:{initialAnts:12,initialBrood:3,initialFood:6,laid:0,born:0,generated:0,gathered:0,eaten:0,spent:0}};
      this.ants.forEach((a,k)=>{a.role=a.desiredRole=ROLES[Math.floor(k/4)];});
      this.events=[];this.log('女王室から、12匹の働き手と3個の卵で出発します。');
      this.refreshDemand();this.refreshForage();
    }
    walkSpeed(){return WALK_SPEED*(1+this.colony.upgrades.walk*.15);}
    digRate(){return 1+this.colony.upgrades.dig*.25;}
    roleCounts(desired=false){const c={forage:0,nurse:0,build:0};for(const a of this.ants)c[desired?a.desiredRole:a.role]++;return c;}
    setRoles(counts){
      if(ROLES.some(r=>!Number.isInteger(counts[r])||counts[r]<0)||ROLES.reduce((n,r)=>n+counts[r],0)!==this.ants.length)throw new Error('人数が一致しません');
      this.colony.roleWeights={...counts};
      const left={...counts},free=[];
      for(const a of this.ants){if(left[a.desiredRole]>0)left[a.desiredRole]--;else free.push(a);}
      for(const r of ROLES)while(left[r]-->0){const a=free.shift();a.desiredRole=r;}
      for(const a of this.ants)this.applyRole(a);
      this.planAt=this.time;return true;
    }
    shiftRole(role,delta){
      if(!ROLES.includes(role)||![-1,1].includes(delta))return false;
      const counts=this.roleCounts(true),others=ROLES.filter(r=>r!==role).sort((a,b)=>counts[b]-counts[a]||ROLES.indexOf(a)-ROLES.indexOf(b));
      if(delta>0){const donor=others.find(r=>counts[r]>0);if(!donor)return false;counts[donor]--;counts[role]++;}
      else{if(!counts[role])return false;counts[role]--;counts[others.at(-1)]++;}
      return this.setRoles(counts);
    }
    applyRole(a){
      if(a.role===a.desiredRole||a.job!==null||a.itemTask||a.yielding||a.yieldHold)return;
      a.role=a.desiredRole;a.path=[];a.next=0;delete a.returning;a.wait=0;
    }
    foodBodies(usable=false){return this.physics.bodies.filter(b=>b.kind==='food'&&!this.colony.wild.includes(b.id)&&(!usable||!b.carrier&&b.rest>=30));}
    upgradeCost(key){return UPGRADES[key]?UPGRADES[key].cost*(this.colony.upgrades[key]+1):Infinity;}
    buy(key){
      const def=UPGRADES[key];if(!def||this.colony.upgrades[key]>=def.max)return false;
      const cost=this.upgradeCost(key),owned=new Set(this.ants.filter(a=>a.itemTask).map(a=>a.itemTask.body)),food=this.foodBodies(true).filter(b=>!owned.has(b.id));
      if(food.length<cost)return false;
      for(const b of food.slice(0,cost))this.physics.remove(b);
      this.colony.stats.spent+=cost;this.colony.upgrades[key]++;this.refreshDemand();this.log(def.name+'を覚えました。');return true;
    }
    tap(){
      if(this.time-this.colony.lastTap<.35||!this.canLay())return false;
      this.colony.lastTap=this.time;this.colony.queen=Math.min(40,this.colony.queen+4);return true;
    }
    canLay(){return this.colony.laying&&this.ants.length+this.colony.brood.length<LIMIT&&this.colony.brood.length<Math.max(4,Math.min(20,Math.ceil(this.ants.length*.65)))&&this.foodBodies().length>=2;}
    refreshDemand(){
      // Reserve grows with actual population, but cannot manufacture inventory.
      this.demands.larvae=Math.max(5,this.colony.brood.length+Math.ceil(this.ants.length/3));
      this.demands.food=Math.max(10,this.foodBodies().length,Math.ceil(this.ants.length*1.2));
    }
    refreshForage(){
      if(this.time+1e-9<this.colony.nextFood)return;
      this.colony.nextFood=this.time+8;
      if(this.colony.wild.length>=5)return;
      // Renewable food appears only at the visible surface patch. It is never
      // credited as colony stock until a particular worker collects that body.
      const x=15+(this.colony.stats.generated%10)*.53;
      const b=this.physics.spawn('food',x,SURFACE-.4,{state:'incoming'});
      this.physics.release(b);this.colony.wild.push(b.id);this.colony.stats.generated++;
    }
    receivingRoom(body){
      if(!this.colony)return super.receivingRoom(body);
      const rid=body.kind==='egg'?2:3,key=body.kind==='egg'?'larvae':'food';
      if(this.builds[rid]?.complete&&this.transportReady(rid)){
        const capacity=this.capacities()[key],stored=this._storageLedger?.stored[rid]||0,reserved=this._storageLedger?.reserved[rid]||0;
        if(stored+reserved<capacity&&this.storageDestination(rid,{cell:idx(48,24)},body.kind)!==undefined)return rid;
      }
      return this.grainRoom[GRAIN.at(body.x,body.y)]===1?null:1;
    }
    startFeed(ant){
      if(this.ticks%30!==0||ant.yielding||ant.yieldHold)return false;
      const claimed=new Set(this.ants.filter(a=>a.itemTask).map(a=>a.itemTask.body)),targets=new Set(this.ants.filter(a=>a.itemTask?.purpose==='feed').map(a=>a.itemTask.target));
      const brood=this.colony.brood.find(e=>e.stage==='larva'&&e.feeds<2&&this.time-e.lastFed>=20&&!targets.has(e.id)&&!claimed.has(e.id)&&this.physics.byId.get(e.id)?.rest>=30&&!this.physics.byId.get(e.id)?.carrier&&this.feedAccess(this.physics.byId.get(e.id)).length);
      if(!brood)return false;
      for(const b of this.foodBodies(true).filter(b=>!claimed.has(b.id)).sort((a,b)=>Math.hypot(a.x-ant.x,a.y-ant.y)-Math.hypot(b.x-ant.x,b.y-ant.y))){
        for(const p of this.itemAccess(b)){
          const route=this.path(ant,p.pose);if(route===null)continue;
          ant.itemTask={purpose:'feed',body:b.id,target:brood.id,phase:'fetch',destination:p.cell,rid:1};ant.path=route;ant.next=0;delete ant.returning;return true;
        }
      }return false;
    }
    feedAccess(target){
      // A food pellet is taller than a brood body. Deliver just above it,
      // keeping the real pellet clear of the floor throughout the approach.
      return this.itemAccess({kind:'food',x:target.x,y:target.y-.25});
    }
    feedRoute(ant,target){
      for(const p of this.feedAccess(target)){
        const route=this.path(ant,p.pose,'food');if(route!==null)return {route,cell:p.cell};
      }return null;
    }
    cancelFeed(ant){
      const b=this.physics.byId.get(ant.itemTask?.body);if(b?.carrier===ant.id){this.updateCarriers();this.physics.release(b);b.state='stored';}
      delete ant.itemTask;ant.path=[];ant.next=0;ant.wait=.3;
    }
    feedStep(ant,dt,occupancy){
      const task=ant.itemTask,b=this.physics.byId.get(task.body),e=this.colony.brood.find(e=>e.id===task.target),target=this.physics.byId.get(task.target);
      if(!b||!target||!e||e.stage!=='larva'||e.feeds>=2){this.cancelFeed(ant);return true;}
      ant.task=task.phase==='fetch'?'travel':'haul';
      if(task.phase==='fetch'){
        if(this.move(ant,dt,occupancy)){
          if(b.carrier||Math.hypot(ant.x-b.x,ant.y-b.y)>1.6){this.cancelFeed(ant);return true;}
          b.carrier=ant.id;b.state='cargo';b.rest=0;
          const to=this.feedRoute(ant,target);if(!to){this.cancelFeed(ant);return true;}
          task.phase='store';task.destination=to.cell;ant.path=to.route;ant.next=0;
        }
      }else if(this.move(ant,dt,occupancy)){
        if(target.carrier||Math.hypot(ant.x-target.x,ant.y-target.y)>1.65){
          const to=this.feedRoute(ant,target);if(to){ant.path=to.route;ant.next=0;}else this.cancelFeed(ant);return true;
        }
        task.chew=(task.chew||0)+dt;
        if(task.chew>=1.2){this.physics.remove(b);e.feeds++;e.lastFed=this.time;this.colony.stats.eaten++;delete ant.itemTask;ant.wait=.3;}
      }return true;
    }
    stepItemTask(ant,dt,occupancy){
      this.applyRole(ant);
      if(ant.itemTask?.purpose==='feed')return this.feedStep(ant,dt,occupancy);
      if(!ant.itemTask){
        if(ant.role==='build')return false;
        if(ant.role==='nurse'&&this.startFeed(ant))return this.feedStep(ant,dt,occupancy);
      }
      const all=this._incoming,feeding=new Set(this.ants.filter(a=>a.itemTask?.purpose==='feed').map(a=>a.itemTask.target));
      const maximum=Math.max(10,Math.ceil(this.ants.length*1.2));
      this._incoming=(all||[]).filter(b=>!feeding.has(b.id)&&(ant.role==='nurse'?b.kind==='egg':b.kind==='food'&&(!this.colony.wild.includes(b.id)||this.foodBodies().length<maximum)));
      let result;try{result=super.stepItemTask(ant,dt,occupancy);}finally{this._incoming=all;}
      if(ant.itemTask?.phase==='store'&&this.colony.wild.includes(ant.itemTask.body)){
        this.colony.wild=this.colony.wild.filter(id=>id!==ant.itemTask.body);this.colony.stats.gathered++;
      }
      return result;
    }
    hatch(e,b){
      if(this.ants.length>=LIMIT||b.carrier||b.rest<30||this.ants.some(a=>a.itemTask?.body===b.id))return false;
      const pose=this.itemAccess(b).map(p=>p.pose).find(p=>this.poseClear(p));if(!pose)return false;
      const counts=this.roleCounts(true),weights=this.colony.roleWeights,total=ROLES.reduce((n,r)=>n+weights[r],0),score=r=>(this.ants.length+1)*weights[r]/total-counts[r];
      const role=ROLES.filter(r=>weights[r]>0).sort((a,b)=>score(b)-score(a)||ROLES.indexOf(a)-ROLES.indexOf(b))[0],id=this.colony.nextAnt++;
      const home=this.ants[(id-1)%this.ants.length].home;
      this.ants.push({id,cell:idx(Math.floor(pose.x),Math.floor(pose.y)),...pose,home:{...home},role,desiredRole:role,task:'idle',job:null,cargo:null,path:[],next:0,wait:0,walked:0,broodId:e.id});
      this.physics.remove(b);this.colony.brood=this.colony.brood.filter(a=>a!==e);this.colony.stats.born++;this.log('働き手が羽化しました。'+this.ants.length+'匹になりました。');return true;
    }
    biology(dt){
      const rate=1+this.colony.upgrades.brood*.2;
      for(const e of this.colony.brood.slice()){
        const b=this.physics.byId.get(e.id);if(!b)throw new Error('育児の実体がありません');
        if(e.stage==='egg'){e.age+=dt*rate;if(e.age>=35){e.stage='larva';e.age=0;}}
        else if(e.stage==='larva'){if(e.feeds>=2){e.age+=dt*rate;if(e.age>=50){e.stage='pupa';e.age=0;}}}
        else{e.age+=dt*rate;if(e.age>=50)this.hatch(e,b);}
      }
      if(this.canLay())this.colony.queen=Math.min(40,this.colony.queen+dt);
      if(this.colony.queen>=40&&this.canLay()){
        const p=this.contentSite('egg',0,1);if(p){const b=this.physics.spawn('egg',p.x,p.y,{state:'incoming'});this.physics.release(b);this.colony.brood.push({id:b.id,stage:'egg',age:0,feeds:0,lastFed:-100});this.colony.stats.laid++;this.colony.queen=0;}
      }
    }
    tick(dt){
      for(const a of this.ants)this.applyRole(a);
      if(this.ticks%30===0){this.refreshDemand();this.refreshForage();}
      super.tick(dt);this.biology(dt);this.refreshDemand();
    }
    status(){
      const s=super.status(),brood={egg:0,larva:0,pupa:0};for(const e of this.colony.brood)brood[e.stage]++;
      const reserved=new Set(this.ants.filter(a=>a.itemTask).map(a=>a.itemTask.body));
      return {...s,brood,food:this.foodBodies().length,stock:this.foodBodies(true).length,available:this.foodBodies(true).filter(b=>!reserved.has(b.id)).length,roles:this.roleCounts(),allocation:this.roleCounts(true),pendingRoles:this.ants.filter(a=>a.role!==a.desiredRole).length,
        queen:this.colony.queen/40,canLay:this.canLay(),births:this.colony.stats.born,meals:this.colony.stats.eaten,harvest:this.colony.stats.gathered};
    }
    assertLedger(){
      const fail=()=>{throw new Error('コロニーの数が一致しません');},c=this.colony,stats=c.stats,eggs=this.physics.bodies.filter(b=>b.kind==='egg'),food=this.physics.bodies.filter(b=>b.kind==='food');
      if(this.ants.length!==stats.initialAnts+stats.born||c.brood.length+stats.born!==stats.initialBrood+stats.laid||food.length+stats.eaten+stats.spent!==stats.initialFood+stats.generated||eggs.length!==c.brood.length)fail();
      if(new Set(c.brood.map(e=>e.id)).size!==eggs.length||c.brood.some(e=>this.physics.byId.get(e.id)?.kind!=='egg')||new Set(c.wild).size!==c.wild.length||c.wild.some(id=>this.physics.byId.get(id)?.kind!=='food'))fail();
      return true;
    }
    dump(){this.assertLedger();return {format:FORMAT,world:super.dump(),colony:structuredClone(this.colony)};}
    static restore(pack){
      const fail=()=>{throw new Error('このコロニーの有効な保存データではありません');};
      if(pack?.format!==FORMAT||!pack.colony)fail();
      const c=structuredClone(pack.colony),finite=(n,min=0,max=1e9)=>Number.isFinite(n)&&n>=min&&n<=max,int=(n,min=0,max=1e9)=>Number.isInteger(n)&&finite(n,min,max);
      if(!int(c.nextAnt,13,LIMIT+1)||!finite(c.queen,0,40)||typeof c.laying!=='boolean'||!finite(c.lastTap,-10)||!finite(c.nextFood)||!Array.isArray(c.brood)||c.brood.length>LIMIT||!Array.isArray(c.wild)||c.wild.length>5||!c.stats||!c.upgrades)fail();
      if(!c.roleWeights||ROLES.some(r=>!int(c.roleWeights[r],0,LIMIT))||ROLES.reduce((n,r)=>n+c.roleWeights[r],0)<1)fail();
      if(c.brood.some(e=>!int(e.id,1)||!['egg','larva','pupa'].includes(e.stage)||!finite(e.age,0,1e8)||!int(e.feeds,0,2)||!finite(e.lastFed,-100)))fail();
      for(const k of Object.keys(UPGRADES))if(!int(c.upgrades[k],0,3))fail();
      for(const k of ['initialAnts','initialBrood','initialFood','laid','born','generated','gathered','eaten','spent'])if(!int(c.stats[k]))fail();
      if(c.stats.initialAnts!==12||c.stats.initialBrood!==3||c.stats.initialFood!==6)fail();
      const s=TerrainSimulation.restore(pack.world);Object.setPrototypeOf(s,Simulation.prototype);s.colony=c;
      if(c.nextAnt!==s.ants.length+1||s.ants.length+c.brood.length>LIMIT||s.ants.some(a=>!ROLES.includes(a.role)||!ROLES.includes(a.desiredRole)||a.id>=c.nextAnt))fail();
      const targets=new Set();
      for(const a of s.ants)if(a.itemTask?.purpose){const t=a.itemTask,e=c.brood.find(e=>e.id===t.target);if(t.purpose!=='feed'||a.role!=='nurse'||s.physics.byId.get(t.body)?.kind!=='food'||!e||e.stage!=='larva'||targets.has(t.target)||t.chew!==undefined&&!finite(t.chew,0,1.3))fail();targets.add(t.target);}
      s.assertLedger();return s;
    }
  }
  return {...Core,Simulation,KEY,SAVE_FORMAT:FORMAT,ROLES,UPGRADES,LIMIT};
});
