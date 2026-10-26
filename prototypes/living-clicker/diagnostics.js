/* Opt-in observer. Reads completed steps, never plans routes or repairs state.
   build-view embeds this source; it is not a separately served public file. */
(function(root,factory){
  if(typeof module==='object'&&module.exports)module.exports=factory();
  else root.LivingDiagnostics=factory();
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const copy=value=>structuredClone(value);

  // Iterative strongly connected components: no recursion limit at large N.
  function cyclesOf(ids,edges){
    const forward=new Map(ids.map(id=>[id,[]])),reverse=new Map(ids.map(id=>[id,[]]));
    for(const e of edges)if(forward.has(e.from)&&forward.has(e.to)){
      forward.get(e.from).push(e.to);reverse.get(e.to).push(e.from);
    }
    const seen=new Set(),order=[];
    for(const id of ids){
      if(seen.has(id))continue;
      const stack=[[id,false]];
      while(stack.length){const [n,exit]=stack.pop();if(exit){order.push(n);continue;}if(seen.has(n))continue;
        seen.add(n);stack.push([n,true]);for(const to of forward.get(n))if(!seen.has(to))stack.push([to,false]);}
    }
    seen.clear();const result=[];
    for(const id of order.reverse()){
      if(seen.has(id))continue;
      const group=[],stack=[id];seen.add(id);
      while(stack.length){const n=stack.pop();group.push(n);for(const to of reverse.get(n))if(!seen.has(to)){seen.add(to);stack.push(to);}}
      if(group.length>1||forward.get(id).includes(id))result.push(group.sort((a,b)=>a-b));
    }
    return result;
  }

  class Observer{
    constructor(options={}){
      this.config={sampleTicks:30,cycleSeconds:20,workSeconds:60,referenceSeconds:1,checkpointSeconds:30,maxIncidents:4,maxSamples:120,maxOperations:256,...options.config};
      for(const [key,value]of Object.entries(this.config))if(!Number.isFinite(value)||value<=0||(/^(sampleTicks|max)/.test(key)&&!Number.isInteger(value)))throw Error('診断設定が正しくありません: '+key);
      this.metadata=copy(options.metadata||{});this.incidents=[];this.samples=[];this.checkpoints=[];
      this.history=new Map();this.conditions=new Map();this.restores=[];this.sequence=0;this.lastTick=-Infinity;this.droppedIncidents=0;
    }
    snapshot(sim){
      try{return {state:copy(sim.dump())};}
      catch(error){return {captureError:String(error.message||error)};}
    }
    checkpoint(sim){
      this.checkpoints.push({tick:sim.ticks,time:sim.time,sequence:this.sequence,...this.snapshot(sim),operations:[]});
      if(this.checkpoints.length>2)this.checkpoints.shift();
    }
    operation(op){
      const sim=this.sim;if(!sim)return;
      // If the bounded action buffer fills, start from a new complete state.
      if(this.checkpoints.some(c=>c.operations.length>=this.config.maxOperations)){
        this.checkpoints=this.checkpoints.filter(c=>c.operations.length<this.config.maxOperations);this.checkpoint(sim);
      }
      this.sequence++;
      for(const c of this.checkpoints){const last=c.operations.at(-1);
        if(op.type==='step'&&last?.type==='step'&&last.dt===op.dt){last.count++;last.lastSequence=this.sequence;}
        else c.operations.push({...copy(op),tick:sim.ticks,sequence:this.sequence,lastSequence:this.sequence});
      }
    }
    recordSetting(path,value){
      if(!['colony.laying','progress.speed','priority','hardDig'].includes(path))throw Error('記録対象外の設定です');
      this.operation({type:'setting',path,value:copy(value)});
    }
    attach(sim){
      if(this.sim)throw Error('診断はすでに開始しています');
      this.sim=sim;this.checkpoint(sim);this.observe(sim,true);
      const wrap=(name,around)=>{const own=Object.getOwnPropertyDescriptor(sim,name),original=sim[name],observer=this;
        if(typeof original!=='function')return;
        const wrapper=function(...args){return around.call(observer,original,this,args);};
        Object.defineProperty(sim,name,{value:wrapper,writable:true,configurable:true});
        this.restores.push(()=>{if(sim[name]===wrapper){if(own)Object.defineProperty(sim,name,own);else delete sim[name];}});
      };
      wrap('step',function(original,receiver,args){
        this.operation({type:'step',dt:args[0]??1/60,count:1});
        let result;try{result=original.apply(receiver,args);}catch(error){this.capture(receiver,'simulation-error',[],receiver.time,{error:String(error.message||error)});throw error;}
        this.observe(receiver);return result;
      });
      for(const method of ['tap','shiftRole','buyResearch','alarmAt'])wrap(method,function(original,receiver,args){
        this.operation({type:'call',method,args:copy(args)});return original.apply(receiver,args);
      });
      return this;
    }
    detach(){for(const restore of this.restores.reverse())restore();this.restores=[];this.sim=null;return this.export();}
    capture(sim,type,ids,since,detail={}){
      const before=this.checkpoints.findLast(c=>c.time<=since)||this.checkpoints[0];
      const incident={type,tick:sim.ticks,time:sim.time,since,ids:[...ids],...copy(detail),checkpoint:copy(before),current:this.snapshot(sim)};
      this.incidents.push(incident);if(this.incidents.length>this.config.maxIncidents){this.incidents.shift();this.droppedIncidents++;}
    }
    condition(sim,key,type,ids,seconds,detail){
      const previous=this.conditions.get(key)||{since:sim.time,emitted:false};
      this.conditions.set(key,previous);this.liveConditions.add(key);
      // A condition must persist; a transient wait or a single completed-step
      // invalid reference is evidence to watch, not an immediate stall claim.
      if(!previous.emitted&&sim.time-previous.since+1e-8>=seconds){
        this.capture(sim,type,ids,previous.since,detail);previous.emitted=true;
      }
    }
    observe(sim,force=false){
      if(!force&&sim.ticks-this.lastTick<this.config.sampleTicks)return;
      if(sim.ticks<this.lastTick)throw Error('別時点の巣へ同じ診断を持ち越せません');
      this.lastTick=sim.ticks;this.liveConditions=new Set();
      const actors=[...sim.ants,...(sim.colony.raid?.enemies||[])],byId=new Map(actors.map(a=>[a.id,a])),jobs=new Map(sim.jobs.map(j=>[j.id,j])),bodies=sim.physics.byId,broodIds=new Set(sim.colony.brood.map(e=>e.id));
      const carried=new Map();for(const b of sim.physics.bodies)if(b.carrier){if(!carried.has(b.carrier))carried.set(b.carrier,[]);carried.get(b.carrier).push(b.id);}
      const edges=[],rows=[],pending=[];
      for(const a of actors){
        const job=jobs.get(a.job),task=a.itemTask,hasPath=a.next<a.path.length;
        const signature=JSON.stringify([a.job,job?.phase,job?.cursor,job?.stroke,task?.body,task?.target,task?.phase,task?.chew,a.next,a.yielding,a.task]);
        let h=this.history.get(a.id);
        if(!h||h.signature!==signature||Math.hypot(a.x-h.x,a.y-h.y)>.03||Math.abs(a.angle-h.angle)>.02){h={signature,x:a.x,y:a.y,angle:a.angle,at:sim.time};this.history.set(a.id,h);}
        const work=!!(job||task||hasPath||carried.has(a.id)),expected=!!(a.fight||a.stun>sim.time||a.wait>0);
        if(work&&!expected)pending.push(a.id);
        const row={id:a.id,x:a.x,y:a.y,angle:a.angle,task:a.task,job:a.job,itemTask:task?copy(task):null,carried:carried.get(a.id)||[],next:a.next,pathLength:a.path.length,wait:a.wait||0,blocked:a.blocked||0,yielding:!!a.yielding,yieldFor:a.yieldFor??null,waitingFor:a.waitingFor??null,yieldHold:a.yieldHold??null,fight:!!a.fight,stun:a.stun??null,work,expectedWait:expected,unchangedFor:sim.time-h.at};
        rows.push(row);
        if(hasPath)for(const field of ['waitingFor','yieldHold'])if(a[field]){
          if(!expected)edges.push({from:a.id,to:a[field],reason:field});
          if(!byId.has(a[field]))this.condition(sim,'actor-ref:'+a.id+':'+field,'missing-actor',[a.id],this.config.referenceSeconds,{field,target:a[field]});
        }
        if(a.job!=null&&!job)this.condition(sim,'job:'+a.id,'missing-job',[a.id],this.config.referenceSeconds,{job:a.job});
        if(task&&!bodies.has(task.body))this.condition(sim,'body:'+a.id,'missing-task-body',[a.id],this.config.referenceSeconds,{body:task.body});
        if(task?.purpose==='feed'&&(!bodies.has(task.target)||!broodIds.has(task.target)))this.condition(sim,'feed:'+a.id,'missing-feed-target',[a.id],this.config.referenceSeconds,{target:task.target});
        if(work&&!expected&&sim.time-h.at>=this.config.workSeconds)this.condition(sim,'work:'+a.id,'work-stall',[a.id],this.config.sampleTicks/60,{actor:row});
      }
      for(const id of this.history.keys())if(!byId.has(id))this.history.delete(id);
      for(const b of sim.physics.bodies){
        if(b.carrier&&!byId.has(b.carrier))this.condition(sim,'carrier:'+b.id,'missing-carrier',[],this.config.referenceSeconds,{body:b.id,carrier:b.carrier});
        if(!b.carrier&&b.rest<30&&sim.physics.moving&&!sim.physics.moving.has(b))this.condition(sim,'moving:'+b.id,'unsimulated-body',[],this.config.referenceSeconds,{body:b.id,kind:b.kind,rest:b.rest});
      }
      const cycles=cyclesOf(actors.map(a=>a.id),edges);
      for(const ids of cycles){
        if(ids.some(id=>this.history.get(id).at===sim.time))continue;
        this.condition(sim,'cycle:'+ids.join(','),'wait-cycle',ids,this.config.cycleSeconds,{edges:edges.filter(e=>ids.includes(e.from)&&ids.includes(e.to))});
      }
      if(pending.length&&pending.every(id=>sim.time-this.history.get(id).at>=this.config.workSeconds))this.condition(sim,'global','no-work-progress',pending,this.config.cycleSeconds,{pending:pending.length});
      for(const key of this.conditions.keys())if(!this.liveConditions.has(key))this.conditions.delete(key);
      this.samples.push({tick:sim.ticks,time:sim.time,pending:pending.length,resting:rows.filter(a=>!a.work&&!a.expectedWait).length,expectedWaits:rows.filter(a=>a.expectedWait).length,edges,cycles,actors:rows,branches:sim.jobs.map(j=>({job:j.id,ant:j.ant,build:j.build,phase:j.phase,widen:!!j.widen})),counters:{dug:sim.stats.grainDug,delivered:sim.stats.grainDelivered,meals:sim.colony.stats.eaten,births:sim.colony.stats.born}});
      if(this.samples.length>this.config.maxSamples)this.samples.shift();
      if(sim.time-this.checkpoints.at(-1).time>=this.config.checkpointSeconds)this.checkpoint(sim);
    }
    export(){return copy({format:'living-clicker-diagnostics-1',metadata:this.metadata,config:this.config,incidents:this.incidents,droppedIncidents:this.droppedIncidents,samples:this.samples,checkpoints:this.checkpoints});}
  }
  return {Observer,cyclesOf};
});
