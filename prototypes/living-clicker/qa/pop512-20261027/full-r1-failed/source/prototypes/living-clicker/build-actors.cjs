/* Checked source transformations. No runtime save conversion. */
function editor(source){
  return {replace(from,to,label,count=1){const n=source.split(from).length-1;if(n!==count)throw Error(label+': expected '+count+' hooks, got '+n);source=source.split(from).join(to);},result(){return source;}};
}
exports.core=source=>{
  const e=editor(source),r=e.replace;
  r("SAVE_FORMAT='ant-colony-core-1'","SAVE_FORMAT='living-clicker-core-2'",'world format');
  r("const KEY = 'livingClicker_1';","const KEY = 'livingClicker_2';",'world key');
  r('  const STEP=1/60,','  const ACTOR_MAX=4294967295,MAX_ACTORS=1000;\n  const STEP=1/60,','actor bounds');
  r('v.setUint8(at+6,b.carrier);','v.setUint8(at+6,0);','reserved old carrier byte');
  r('v.setUint32(at+46,0,true);','v.setUint32(at+46,b.carrier,true);','wide carrier in reserved word');
  r("const b=this.bodies[i],at=i*STRIDE;","const b=this.bodies[i],at=i*STRIDE;if(!Number.isInteger(b.carrier)||b.carrier<0||b.carrier>ACTOR_MAX)throw Error('運び手の番号が正しくありません');",'do not truncate carrier');
  r("version:2,encoding:'bodies50le'","version:3,encoding:'bodies50u32le'",'body encoding output');
  r("pack.version!==2||pack.encoding!=='bodies50le'","pack.version!==3||pack.encoding!=='bodies50u32le'",'body encoding input');
  r('carrier=v.getUint8(at+6)','carrier=v.getUint32(at+46,true)','wide carrier input');
  r('carrier>128&&(carrier<200||carrier>249)||','carrier>ACTOR_MAX||','carrier domain');
  r('v.getUint32(at+46,true)!==0','v.getUint8(at+6)!==0','reserved byte validation');
  r('pack.ants.length>128','pack.ants.length>MAX_ACTORS','worker count bound');
  r('pack.jobs.length>128','pack.jobs.length>MAX_ACTORS','job count bound');
  r('!integer(a.id,1,128)','!integer(a.id,1,ACTOR_MAX)','worker id bound');
  r('    static restore(pack) {','    static restore(pack,externalActors=[]) {','explicit foreign owners');
  r('const ids=new Set(),jobs=new Set(),pending=new Set(),reserved=new Set(),targets=new Set();',`const ids=new Set(),jobs=new Set(),pending=new Set(),reserved=new Set(),targets=new Set();
      if(!Array.isArray(externalActors)||externalActors.length>50||externalActors.some(a=>!a||!integer(a.id,1,ACTOR_MAX)))fail();
      const externalIds=new Set(externalActors.map(a=>a.id));if(externalIds.size!==externalActors.length)fail();`,'validate foreign id set');
  r('ids.has(a.id)||!pose(a)','ids.has(a.id)||externalIds.has(a.id)||!pose(a)','actor ids are globally unique');
  r('if(!a&&b.carrier>=200)continue;','if(!a&&externalIds.has(b.carrier))continue;','foreign membership not numeric band');
  r('    trafficIndex(){',`    trafficPriority(a,b){
      // Compare separate criteria; large ids cannot outweigh loads/work.
      return Number(!!this.carriedKind(a))-Number(!!this.carriedKind(b))||Number(a.job!==null)-Number(b.job!==null)||b.id-a.id;
    }
    trafficIndex(){`,'lexicographic right of way');
  r('const rank=a=>(this.carriedKind(a)?100:0)+(a.job!==null?10:0)-a.id*.01,mutual=other?.yieldHold===ant.id&&rank(ant)>rank(other);','const mutual=other?.yieldHold===ant.id&&this.trafficPriority(ant,other)>0;','mutual yield priority');
  r('const rank=a=>(this.carriedKind(a)?100:0)+(a.job!==null?10:0)-a.id*.01,next=block.path[block.next];','const next=block.path[block.next];','head-on priority declaration');
  r('rank(ant)<rank(block)','this.trafficPriority(ant,block)<0','head-on priority comparison');
  r('ant.yieldHold=ant.yieldFor;delete ant.yieldPriority;','ant.yieldHold=ant.yieldFor;delete ant.yieldFor;delete ant.yieldPriority;','retire completed yield reference');
  r('return { Simulation, AntTrafficIndex, RouteNetwork, Physics,','return { Simulation, AntTrafficIndex, RouteNetwork, ACTOR_MAX, MAX_ACTORS, Physics,','export actor contract');
  return e.result();
};
exports.life=source=>{
  const e=editor(source),r=e.replace;
  r("FORMAT='living-clicker-life-1',KEY='livingClicker_1',LIMIT=128","FORMAT='living-clicker-life-2',KEY='livingClicker_2',LIMIT=Core.MAX_ACTORS",'lifecycle version and structural count');
  r('this.colony={nextAnt:13,','this.colony={nextActor:13,','common serial');
  r('    hatch(e,b){',`    allocateActorId(){
      const id=this.colony.nextActor;if(!Number.isInteger(id)||id<13||id>Core.ACTOR_MAX)throw Error('個体の番号を発行できません');
      this.colony.nextActor++;return id;
    }
    hatch(e,b){`,'shared allocator');
  r('id=this.freeAntId?.()??this.colony.nextAnt++;','id=this.allocateActorId();','birth uses shared allocator');
  r('!int(c.nextAnt,13,LIMIT+1)','!int(c.nextActor,13,Core.ACTOR_MAX+1)','serial bound');
  r('TerrainSimulation.restore(pack.world)','TerrainSimulation.restore(pack.world,c.raid?.enemies||[])','explicit enemy membership at terrain restore');
  r('c.nextAnt<s.ants.length+1||c.nextAnt-1-s.ants.length>(c.stats.died||0)','c.nextActor<13+c.stats.born','allocation ledger');
  r('a.id>=c.nextAnt','a.id>=c.nextActor','live workers below serial');
  return e.result();
};
