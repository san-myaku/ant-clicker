/* Exact coordinates are stored alongside a bounded direct-mapped hash.
   A collision evicts an answer; it can never supply another pose's answer. */
module.exports=function poseCache(source){
 function replace(from,to,label){if(source.split(from).length!==2)throw Error('pose cache hook: '+label);source=source.replace(from,to);}
 const helper=`  class PoseAnswerCache{
    constructor(){this.mask=(1<<17)-1;const length=this.mask+1;this.x=new Float64Array(length);this.y=new Float64Array(length);this.tags=new Uint32Array(length);this.answers=new Int32Array(length);this.kinds=new Map();this.size=0;}
    tag(h,kind){const key=String(kind||'body');let base=this.kinds.get(key);if(base===undefined){base=(this.kinds.size+1)*16;this.kinds.set(key,base);}return base+h;}
    slot(x,y,tag){let h=Math.imul(Math.floor(x*1e6),0x9e3779b1)^Math.imul(Math.floor(y*1e6),0x85ebca6b)^Math.imul(tag,0xc2b2ae35);h^=h>>>16;h=Math.imul(h,0x85ebca6b);h^=h>>>13;return h&this.mask;}
    get(x,y,tag){const i=this.slot(x,y,tag);return this.tags[i]===tag&&this.x[i]===x&&this.y[i]===y?this.answers[i]:undefined;}
    set(x,y,tag,value){const i=this.slot(x,y,tag);if(!this.tags[i])this.size++;this.x[i]=x;this.y[i]=y;this.tags[i]=tag;this.answers[i]=value;}
    clear(){this.tags.fill(0);this.size=0;}
  }
`;
 replace('  class Simulation {',helper+'  class Simulation {','numeric answer cache');
 replace("cache=this._poseChecks||(this._poseChecks=new Map());key=[p.x,p.y,h,kind||'body'].join(':');const old=cache.get(key);","cache=this._poseChecks||(this._poseChecks=new PoseAnswerCache());key=cache.tag(h,kind);const old=cache.get(p.x,p.y,key);",'exact numeric lookup');
 replace('if(cache.size>100000)cache.clear();cache.set(key,ok?-1:block);','cache.set(p.x,p.y,key,ok?-1:block);','bounded numeric writes');
 replace('return { Simulation, AntTrafficIndex, RouteNetwork, ACTOR_MAX, MAX_ACTORS, Physics,','return { Simulation, AntTrafficIndex, RouteNetwork, ACTOR_MAX, MAX_ACTORS, PoseAnswerCache, Physics,','cache inspection for verification');
 return source;
};
