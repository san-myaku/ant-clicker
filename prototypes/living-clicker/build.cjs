/* Reuse the verified organic prototype, with checked extension points. */
const fs=require('node:fs'),path=require('node:path');
const root=__dirname,base=path.resolve(root,'../colony-game');
const read=name=>fs.readFileSync(path.join(base,name),'utf8').replace(/\r\n/g,'\n');
let source=read('core.js');
function replace(from,to,label){const n=source.split(from).length-1;if(n!==1)throw Error(label+': expected one hook, got '+n);source=source.replace(from,to);}
function replaceEach(from,to,count,label){const n=source.split(from).length-1;if(n!==count)throw Error(label+': expected '+count+' hooks, got '+n);source=source.split(from).join(to);}
replace("const KEY = 'antColonyGame_1';","const KEY = 'livingClicker_1';",'separate storage');
replace("const names = ['通路', '女王房', '育児室', '食料庫'];","const names = ['通路', '女王房', ...Array.from({length:12},(_,k)=>(k%2?'食料庫':'育児室')+(k<2?'':' '+(Math.floor(k/2)+1)))];",'room labels');
replace('nextTip(p,target,radius=.5,history=[],twoWay=false,allChoices=false){','nextTip(p,target,radius=.5,history=[],twoWay=false,allChoices=false,turns=[-1,0,1]){','explicit local steering options');
replace('for(const turn of [-1,0,1]){','for(const turn of turns){','local steering survey');
replace("const escape=this.path(p,{x:48.25,y:24.25,angle:0},'soil1');if(!escape)continue;", "const home={x:48.25,y:24.25,angle:0},escape=this.path(p,home,'soil1');if(!escape||!this.path(home,p,null))continue;", 'digging pose must have an actual inbound route too');
replace('const bases=[21.5,28.5,51.5,61,73.5];','const bases=[36,46,56,66,76];','first layer includes the initial rooms');
replace('    grainCells(cell) { return GRAIN.cells(cell); }',`    roomIds(){return this.rooms.slice(2).map(r=>r.id);}
    roomKind(rid){return this.rooms?.[rid]?.kind??(rid%2===0?'egg':'food');}
    buildNeeds(){return [{rid:2,d:this.demands.larvae-this.rawCapacities().larvae,wanted:this.demands.larvae},{rid:3,d:(this.demands.food-this.rawCapacities().food)/2,wanted:this.demands.food}];}
    canExcavate(g){return this.grains[g]===SOIL||this.grains[g]===HARD&&this.hardDig;}
    grainCells(cell) { return GRAIN.cells(cell); }`,'extensible living world');
replace('      let previous=null;\n      for(let k=0;k<=n;k++){const t=k/n,p={x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,angle:a.angle+da*t};if(!this.poseClear(p,kind,ignore,margin))return answer(false);',`      // The sprite/body changes discretely at 16 heading boundaries. Test both
      // silhouettes at each exact change, even when regular samples skip it.
      if(Math.abs(da)>1e-10){const lo=Math.min(a.angle,a.angle+da),hi=Math.max(a.angle,a.angle+da),unit=Math.PI/8;
        for(let h=Math.floor(lo/unit-.5);h<=Math.ceil(hi/unit-.5);h++){const angle=(h+.5)*unit,t=(angle-a.angle)/da;if(t<=0||t>=1)continue;const p={x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t};
          if(!this.poseClear({...p,angle:angle-1e-8},kind,ignore,margin)||!this.poseClear({...p,angle:angle+1e-8},kind,ignore,margin))return answer(false);
        }
      }
      let previous=null;
      for(let k=0;k<=n;k++){const t=k/n,p={x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,angle:a.angle+da*t};if(!this.poseClear(p,kind,ignore,margin))return answer(false);`,'sweep discrete heading changes');
replace(`      let previous=null;
      for(let k=0;k<=n;k++){const t=k/n,p={x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,angle:a.angle+da*t};if(!this.poseClear(p,kind,ignore,margin))return answer(false);
        if(kind){const h=renderAngle(p.angle),q={x:p.x+Math.cos(h)*ANT_SIZE*.55,y:p.y+Math.sin(h)*ANT_SIZE*.55};if(previous&&!this.cargoSweep(previous,q,kind,ignore))return answer(false);previous=q;}
      }return answer(true);`, `      // Cargo translates at a fixed rendered heading, then changes heading
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
      }return answer(true);`, 'exact cargo heading sweep');
replace('if (this.grainRoom[g] === 2) larvae++; else if (this.grainRoom[g] === 3) food++;','if (this.grainRoom[g]>=2) {const kind=this.roomKind(this.grainRoom[g]);if(kind===\'egg\')larvae++;else if(kind===\'food\')food++;}','physical capacity');
replace("const kind=rid===2?'egg':'food',stock=","const kind=this.roomKind(rid),stock=",'room pressure');
replace("if(footprint.some(g=>this.grains[g]&&(this.grains[g]===ROCK||this.grains[g]===HARD&&!this.hardDig||this.supportsStock(g))))continue;","if(footprint.some(g=>this.grains[g]&&(!this.canExcavate(g)||this.supportsStock(g))))continue;",'tip depth guard');
replace("if(![SOIL,HARD].includes(this.grains[g])||this.grains[g]===HARD&&!this.hardDig||this.supportsStock(g)||this.jobs.some(j=>j.grains.includes(g))||!this.grainNeighbors(g).some(n=>!this.grains[n]))continue;","if(!this.canExcavate(g)||this.supportsStock(g)||this.jobs.some(j=>j.grains.includes(g))||!this.grainNeighbors(g).some(n=>!this.grains[n]))continue;",'load depth guard');
replace("if(this.grains[g]!==SOIL&&(this.grains[g]!==HARD||!this.hardDig)||!this.grainNeighbors(g).some(n=>!this.grains[n])||this.jobs.some(j=>j.grains.includes(g)))return null;","if(!this.canExcavate(g)||!this.grainNeighbors(g).some(n=>!this.grains[n])||this.jobs.some(j=>j.grains.includes(g)))return null;",'all excavation guard');
replace('if(Math.hypot(b.tip.x-b.history[0].x,b.tip.y-b.history[0].y)>5&&b.length>=6){','if(Math.hypot(b.tip.x-b.history[0].x,b.tip.y-b.history[0].y)>5&&b.length>=(b.minLength||6)&&b.tip.y>=(b.minDepth||0)){','deep chamber only after actual passage');
replace('for(const rid of [2,3]){const b=this.builds[rid];if(b&&!b.complete','for(const rid of this.roomIds()){const b=this.builds[rid];if(b&&!b.complete','room completion');
replace('for(const rid of [2,3]){const b=this.builds[rid];if(!b||b.history.length<5)','for(const rid of this.roomIds()){const b=this.builds[rid];if(!b||b.history.length<5)','all real branch routes');
replace('const c=this.rawCapacities(),needs=[{rid:2,d:this.demands.larvae-c.larvae},{rid:3,d:(this.demands.food-c.food)/2}];','const needs=this.buildNeeds();','actual per-room demand');
replace("const kind=n.rid===2?'egg':'food';","const kind=this.roomKind(n.rid);",'storage shortage');
replace("const required=needs.filter(n=>(n.rid===2?this.demands.larvae:this.demands.food)>0&&(n.d>0||this.builds[n.rid]&&!this.transportReady(n.rid)));","const required=needs.filter(n=>n.wanted>0&&(n.d>0||this.builds[n.rid]&&!this.transportReady(n.rid)));",'demand filter');
replace("required.sort((a,b)=>(b.d/(b.rid===2?this.demands.larvae:this.demands.food)* (this.priority===(b.rid===2?'nursery':'food')?3:1))-(a.d/(a.rid===2?this.demands.larvae:this.demands.food)*(this.priority===(a.rid===2?'nursery':'food')?3:1)));","required.sort((a,b)=>(b.d/b.wanted*(this.priority===(this.roomKind(b.rid)==='egg'?'nursery':'food')?3:1))-(a.d/a.wanted*(this.priority===(this.roomKind(a.rid)==='egg'?'nursery':'food')?3:1)));",'demand ranking');
replace('this.destinationRoom(b.kind);if(this.grainRoom','this.destinationRoom(b.kind,b);if(this.grainRoom','keep stock in its actual room');
replace("this.grainRoom[GRAIN.at(b.x,b.y)]===(b.kind==='egg'?2:3)","this.grainRoom[GRAIN.at(b.x,b.y)]>=2&&this.roomKind(this.grainRoom[GRAIN.at(b.x,b.y)])===b.kind",'delivered room classification');
replace('this._storageLedger={tick:this.ticks,stored:{2:0,3:0},reserved:{2:0,3:0},available:{},busy:{}};','this._storageLedger={tick:this.ticks,stored:Object.fromEntries(this.roomIds().map(r=>[r,0])),reserved:Object.fromEntries(this.roomIds().map(r=>[r,0])),available:{},busy:{}};','real storage ledger');
replace("const rid=b.kind==='egg'?2:3;if(this.grainRoom[GRAIN.at(b.x,b.y)]===rid)this._storageLedger.stored[rid]++;","const rid=this.grainRoom[GRAIN.at(b.x,b.y)];if(rid>=2&&this.roomKind(rid)===b.kind)this._storageLedger.stored[rid]++;",'stock location');
replace("const building=[2,3].filter(rid=>this.demands[rid===2?'larvae':'food']>0", "const building=this.roomIds().filter(rid=>this.demands[this.roomKind(rid)==='egg'?'larvae':'food']>0",'construction status');
replace("if(a.y<SURFACE||this.grainRoom[GRAIN.at(a.x,a.y)]===1)return false;const k=nearest(a),q=b.history[k];return k>=first-1&&Math.hypot(q.x-a.x,q.y-a.y)<2;", "if(a.y<SURFACE||this.grainRoom[GRAIN.at(a.x,a.y)]>0||!this.singleFileSection(a))return false;const k=nearest(a),q=b.history[k];return k>=first-1&&Math.hypot(q.x-a.x,q.y-a.y)<2;",'room residents do not reserve a narrow passage');
replace("const a=this.ants.find(a=>a.id===j.ant);if(this.grainRoom[GRAIN.at(a.x,a.y)]===1)return false;", "const a=this.ants.find(a=>a.id===j.ant),room=this.grainRoom[GRAIN.at(a.x,a.y)];if(room>0&&room!==rid)return false;",'release child branch when carrier reaches its parent room');
replace("this.stats[job.rid === 2 ? 'nursery' : job.rid === 3 ? 'food' : 'passage']++;", "this.stats[job.rid>=2?(this.roomKind(job.rid)==='egg'?'nursery':'food'):'passage']++;",'all room work accounting');
replace("['room',3,true]","['room',254,true]",'saved room tags');
replace('pack.ants.length>64','pack.ants.length>128','saved ants');
replace('pack.jobs.length>64','pack.jobs.length>128','saved jobs');
replace('pack.rooms.length!==4','pack.rooms.length<4||pack.rooms.length>254','saved room count');
replace('pack.builds.length!==4','pack.builds.length!==pack.rooms.length','saved builds');
replace('for(const rid of [2,3]){const b=pack.builds[rid];','for(const rid of pack.rooms.slice(2).map(r=>r.id)){const b=pack.builds[rid];','saved real branches');
replace("['grainRoom',3]","['grainRoom',13]",'grain room tags');
replace('!integer(a.id,1,64)','!integer(a.id,1,128)','stable ant ids');
replace('material>2||carrier>64||','material>2||carrier>128||','bodies carried by stable ant ids');
// Spoil lands on both sides of the entrance: face and throw away from it.
replace("job.phase = 'unload'; ant.task = 'unload'; ant.wait = .65; ant.angle = 0;","job.phase = 'unload'; ant.task = 'unload'; ant.wait = .65; ant.angle = job.drop%W<this.entrance.x?Math.PI:0;",'face outward at the dump');
replace("this.physics.release(b,1.4+(b.id%5)*.1,-1.3);","this.physics.release(b,(job.drop%W<this.entrance.x?-1:1)*(1.4+(b.id%5)*.1),-1.3);",'throw spoil outward');
// Delivered grains that compacted into the ground leave the body ledger but
// stay counted: dug = loose bodies + settled, delivered = resting + settled.
replace("this.stats.grainDug=0;this.stats.grainDelivered=0;","this.stats.grainDug=0;this.stats.grainDelivered=0;this.stats.grainSettled=0;",'settled spoil ledger');
replace("if(!s.stats||['dug','delivered','nursery','food','passage','grainDug','grainDelivered','yields']","if(s.stats&&s.stats.grainSettled===undefined)s.stats.grainSettled=0;\n      if(!s.stats||['dug','delivered','nursery','food','passage','grainDug','grainDelivered','grainSettled','yields']",'saved settled spoil');
replace("if(counts.soil!==s.stats.grainDug||delivered!==s.stats.grainDelivered)fail();","if(counts.soil+s.stats.grainSettled!==s.stats.grainDug||delivered+s.stats.grainSettled!==s.stats.grainDelivered)fail();",'settled spoil balances the soil ledger');
replace('![0,2,3].includes(j.rid)','![0,...s.roomIds()].includes(j.rid)','saved work room');
replace('![1,2,3].includes(t.rid)','![1,...s.roomIds()].includes(t.rid)','saved item destination');
replace('    tipFootprint(a,b){',`    // A footprint is pure geometry of its poses: no terrain, stock or actor
    // state. Planning re-derives the same lane footprints on every pass as
    // the colony grows, so reuse each result. Callers only read the grains.
    footprintMemo(key,make){if(!this._footprints)this._footprints=new Map();let out=this._footprints.get(key);if(!out){if(this._footprints.size>=FOOTPRINT_MEMO)this._footprints.clear();out=make();this._footprints.set(key,out);}return out;}
    tipFootprint(a,b){return this.footprintMemo('t:'+a.x+':'+a.y+':'+a.angle+':'+b.x+':'+b.y+':'+b.angle,()=>this.sweptTipFootprint(a,b));}
    sweptTipFootprint(a,b){`,'reuse pure tip footprints');
replace('    transportFootprint(a,b,widthA=null,widthB=null,shiftA=0,shiftB=0){const turn=',`    transportFootprint(a,b,widthA=null,widthB=null,shiftA=0,shiftB=0){return this.footprintMemo('l:'+a.x+':'+a.y+':'+a.angle+':'+b.x+':'+b.y+':'+b.angle+':'+widthA+':'+widthB+':'+shiftA+':'+shiftB,()=>this.sweptTransportFootprint(a,b,widthA,widthB,shiftA,shiftB));}
    sweptTransportFootprint(a,b,widthA,widthB,shiftA,shiftB){const turn=`,'reuse pure lane footprints');
replace("  const STEP=1/60, PICKUP_SECONDS","  const FOOTPRINT_MEMO=60000;\n  const STEP=1/60, PICKUP_SECONDS",'footprint memo bound');
// Terrain only loses grains during play. A refusal caused by grain g stays a
// refusal while g remains, so navigation keeps it until g is dug, instead of
// discarding every refusal at each excavation. _block names the grain behind
// the last refusal (-2: world edge, permanent; undefined: unknown).
replace("if(old===-1)return true;if(old===-2||old>=0&&this.grains[old])return false;","if(old===-1)return true;if(old===-2||old>=0&&this.grains[old]){this._block=old;return false;}",'cached pose refusal names its grain');
replace("const answer=(ok,block=-2)=>{if(cache){if(cache.size>100000)cache.clear();cache.set(key,ok?-1:block);}return ok;};","const answer=(ok,block=-2)=>{if(!ok)this._block=block;if(cache){if(cache.size>100000)cache.clear();cache.set(key,ok?-1:block);}return ok;};",'pose refusal names its grain');
replace("return !this.sweptCargoCells(a,b,kind,single).some(g=>g!==ignore&&this.grains[g]);","const block=this.sweptCargoCells(a,b,kind,single).find(g=>g!==ignore&&this.grains[g]);if(block===undefined)return true;this._block=block;return false;",'cargo refusal names its grain');
replace("const old=cache.get(key);if(old===1)return true;if(old===-this.revision)return false;}","const old=cache.get(key);if(old===1)return true;if(old===0){this._block=-2;return false;}if(old>=2&&this.grains[old-2]){this._block=old-2;return false;}if(old===-this.revision){this._block=undefined;return false;}}\n      this._block=undefined;",'cached sweep refusal holds while its grain remains');
replace("const answer=ok=>{if(cache){if(cache.size>40000)cache.clear();cache.set(key,ok?1:-this.revision);}return ok;};","const answer=ok=>{const block=this._block;if(cache){if(cache.size>40000)cache.clear();cache.set(key,ok?1:block===-2?0:block>=0?block+2:-this.revision);}return ok;};",'sweep refusal keeps its grain');
replace("if(safeCache[id]===1)return true;if(safeCache[id]===-this.revision)return false;const ok=this.poseClear(z,kind);safeCache[id]=ok?1:-this.revision;return ok;","const c=safeCache[id];if(c===1)return true;if(c===2||c>=3&&this.grains[c-3]||c===-this.revision)return false;const ok=this.poseClear(z,kind),block=this._block;safeCache[id]=ok?1:block===-2?2:block>=0?block+3:-this.revision;return ok;",'search pose refusals hold while their grain remains');
replace("const key=id*8+action,old=edges.get(key);if(old===1)return true;if(old===-this.revision)return false;const ok=this.sweptClear(z,q,kind);edges.set(key,ok?1:-this.revision);return ok;","const key=id*8+action,old=edges.get(key);if(old===1)return true;if(old===0||old>=2&&this.grains[old-2]||old===-this.revision)return false;const ok=this.sweptClear(z,q,kind),block=this._block;edges.set(key,ok?1:block===-2?0:block>=0?block+2:-this.revision);return ok;",'search move refusals hold while their grain remains');
// Lane profile: see the comment in the generated function.
replace("      if(!this._transportProfiles)this._transportProfiles=new WeakMap();const old=this._transportProfiles.get(history);if(old?.length===history.length)return old.shifts;\n      const rows=[],blocked=grains=>grains.some(g=>this.grains[g]===ROCK);\n      for(let k=0;k<history.length;k++){const p=history[k],w=this.laneWidth(history,k),row=[];\n        for(const shift of [0,.25,-.25,.5,-.5,.75,-.75,1,-1]){if(blocked(this.transportFootprint(p,p,w,w,shift,shift)))continue;let cost=Math.abs(shift)*.2,parent=-1;\n          if(k){let best=Infinity;for(let n=0;n<rows[k-1].length;n++){const prev=rows[k-1][n];if(Math.abs(prev.shift-shift)>.251||blocked(this.transportFootprint(history[k-1],p,this.laneWidth(history,k-1),w,prev.shift,shift)))continue;const score=prev.cost+cost+Math.abs(prev.shift-shift);if(score<best){best=score;parent=n;}}if(parent<0)continue;cost=best;}\n          row.push({shift,cost,parent});\n        }if(!row.length){this._transportProfiles.set(history,{length:history.length,shifts:null});return null;}rows.push(row);\n      }\n      let n=rows.at(-1).reduce((best,v,k,a)=>v.cost<a[best].cost?k:best,0);const shifts=[];for(let k=rows.length-1;k>=0;k--){const q=rows[k][n];shifts.push(q.shift);n=q.parent;}shifts.reverse();this._transportProfiles.set(history,{length:history.length,shifts});return shifts;","      // Histories only grow by push, rock never opens and a lane width looks\n      // four poses along. Rows before the last four of a shorter solution are\n      // unchanged, so resume the same DP there rather than from the shaft.\n      if(!this._transportProfiles)this._transportProfiles=new WeakMap();const old=this._transportProfiles.get(history);if(old?.length===history.length)return old.shifts;\n      const resume=old&&old.length<history.length&&history[old.length-1]===old.last?Math.min(old.rows.length,Math.max(0,old.length-4)):0;\n      const rows=resume?old.rows.slice(0,resume):[],blocked=grains=>grains.some(g=>this.grains[g]===ROCK),keep=shifts=>{this._transportProfiles.set(history,{length:history.length,shifts,rows,last:history.at(-1)});return shifts;};\n      for(let k=resume;k<history.length;k++){const p=history[k],w=this.laneWidth(history,k),row=[];\n        for(const shift of [0,.25,-.25,.5,-.5,.75,-.75,1,-1]){if(blocked(this.transportFootprint(p,p,w,w,shift,shift)))continue;let cost=Math.abs(shift)*.2,parent=-1;\n          if(k){let best=Infinity;for(let n=0;n<rows[k-1].length;n++){const prev=rows[k-1][n];if(Math.abs(prev.shift-shift)>.251||blocked(this.transportFootprint(history[k-1],p,this.laneWidth(history,k-1),w,prev.shift,shift)))continue;const score=prev.cost+cost+Math.abs(prev.shift-shift);if(score<best){best=score;parent=n;}}if(parent<0)continue;cost=best;}\n          row.push({shift,cost,parent});\n        }if(!row.length)return keep(null);rows.push(row);\n      }\n      let n=rows.at(-1).reduce((best,v,k,a)=>v.cost<a[best].cost?k:best,0);const shifts=[];for(let k=rows.length-1;k>=0;k--){const q=rows[k][n];shifts.push(q.shift);n=q.parent;}shifts.reverse();return keep(shifts);",'resume lane profile from unchanged rows');
// A lane is recomputed only when a grain behind one of its refusals is dug.
// Its clear checks stay clear as terrain opens. The shaft keeps its old reuse.
replace("history===this._entryHistory?'shaft':this.revision].join(':');if(cache.has(key))return cache.get(key);","history===this._entryHistory?'shaft':'lane'].join(':'),old=cache.get(key);if(old&&(history===this._entryHistory||old.deps.every(g=>g===-2||g>=0&&this.grains[g])))return old.out;const deps=[];",'lane reuse while its refusals hold');
replace("angle};if(!this.poseClear(q,kind))continue;","angle};if(!this.poseClear(q,kind)){deps.push(this._block);continue;}",'lane pose refusal');
replace("if(!this.sweptClear(prev.q,q,kind))continue;const score=prev.cost+cost+Math.hypot(prev.q.x-q.x,prev.q.y-q.y)*.01;","if(!this.sweptClear(prev.q,q,kind)){deps.push(this._block);continue;}const score=prev.cost+cost+Math.hypot(prev.q.x-q.x,prev.q.y-q.y)*.01;",'lane sweep refusal');
replace("if(!row.length){cache.set(key,null);return null;}rows.push(row);","if(!row.length){cache.set(key,{out:null,deps});return null;}rows.push(row);",'lane failure reuse');
replace("if(cache.size>12)cache.clear();cache.set(key,out);return out;","if(cache.size>12)cache.clear();cache.set(key,{out,deps});return out;",'lane result reuse');
// Search bookkeeping in reused typed arrays: one generation stamp per search
// replaces fresh Maps. Same costs, same heap order, so the same routes. A
// search never starts another one while running, so the arrays are shared.
replace("const heap=[],cost=new Map(),prev=new Map();","const cells=nw*H*2*16;if(this._navCost?.length!==cells){this._navCost=new Float64Array(cells);this._navPrev=new Int32Array(cells);this._navStamp=new Uint32Array(cells);this._navGen=0;}\n      const heap=[],costs=this._navCost,prevs=this._navPrev,stamp=this._navStamp,gen=this._navGen=(this._navGen+1)>>>0||1;",'search arrays');
replaceEach("cost.get(id)??Infinity","(stamp[id]===gen?costs[id]:Infinity)",3,'search cost lookup');
replace("cost.set(id,g);prev.set(id,-1);","stamp[id]=gen;costs[id]=g;prevs[id]=-1;",'search start');
replaceEach("cost.set(id,g);prev.set(id,v.id);","stamp[id]=gen;costs[id]=g;prevs[id]=v.id;",2,'search relax');
replace("if(v.g!==cost.get(v.id))continue;","if(v.g!==costs[v.id])continue;",'search stale entry');
replace("for(let n=end;n!==-1;n=prev.get(n))","for(let n=end;n!==-1;n=prevs[n])",'search route');
// Terrain only opens during play, so a route once proven stays passable. The
// dig-stand check only needs to know both trips exist (hauling plans its own
// route), so it reuses proven routes; a failed check is searched again later.
replace("const home={x:48.25,y:24.25,angle:0},escape=this.path(p,home,'soil1');if(!escape||!this.path(home,p,null))continue;","const home={x:48.25,y:24.25,angle:0},escape=this.knownRoute(p,home,'soil1');if(!escape||!this.knownRoute(home,p,null))continue;",'dig stand reuses proven trips');
replace("    digPoseFor(g,preferred=null){",`    knownRoute(from,to,kind){
      if(!this._knownRoutes)this._knownRoutes=new Map();const key=from.x+':'+from.y+':'+from.angle+':'+to.x+':'+to.y+':'+to.angle+':'+kind;
      let route=this._knownRoutes.get(key);if(route)return route;route=this.path(from,to,kind);
      if(route){if(this._knownRoutes.size>=KNOWN_ROUTES)this._knownRoutes.clear();this._knownRoutes.set(key,route);}return route;
    }
    digPoseFor(g,preferred=null){`,'proven route memory');
replace("  const FOOTPRINT_MEMO=60000;","  const FOOTPRINT_MEMO=60000,KNOWN_ROUTES=20000;",'proven route bound');
// Waste is a real pellet. It rests as refuse until a nurse carries it out.
// Appended kind/state indices keep earlier saves' encoded bodies valid.
replace("food:{hx:3/16,hy:3/16,density:.8}};","food:{hx:3/16,hy:3/16,density:.8},waste:{hx:5/32,hy:1/8,density:.7},cookie:{hx:5/32,hy:5/32,density:.6}};",'waste pellet shape');
replace("const KINDS=['soil','egg','food'],STATES=['cargo','delivered','incoming','stored','pickup'];","const KINDS=['soil','egg','food','waste','cookie'],STATES=['cargo','delivered','incoming','stored','pickup','refuse'];",'waste kind and refuse state');
replace("const counts={soil:0,egg:0,food:0};","const counts={soil:0,egg:0,food:0,waste:0,cookie:0};",'waste body count');
// Rooms carry their purpose; a passage turning into its chamber keeps it.
replace("b.mode='chamber';this.rooms[rid]={id:rid,x:b.tip.x,y:b.tip.y};","b.mode='chamber';this.rooms[rid]={...this.rooms[rid],id:rid,x:b.tip.x,y:b.tip.y};",'chamber keeps its purpose');
replace("this.log(names[rid]+'に荷物を","this.log((this.roomName?.(rid)??names[rid])+'に荷物を",'room name in log');
replace("name:names[rid],","name:this.roomName?.(rid)??names[rid],",'room name in status');
// An item deliberately picked to move (to fermentation, or off a lane that
// must open) stays incoming in its own kind of room until a worker takes it.
replace("this.roomKind(this.grainRoom[GRAIN.at(b.x,b.y)])===b.kind)b.state='stored';","this.roomKind(this.grainRoom[GRAIN.at(b.x,b.y)])===b.kind&&!this.keepIncoming?.(b))b.state='stored';",'picked items stay incoming');
replace("      const cells=this.cells(rid).filter(i=>this.walkable(i)&&!this.ants.some(a=>a.id!==ant.id&&a.itemTask?.phase==='store'&&Math.hypot(this.walkPoint(i).x-this.walkPoint(a.itemTask.destination).x,this.walkPoint(i).y-this.walkPoint(a.itemTask.destination).y)<.9)).map(i=>({i,drop:this.storageDrop(rid,this.walkPoint(i),kind)})).filter(c=>c.drop);\n      const score=c=>c.drop.score+this.ants.filter(a=>a.itemTask?.phase==='store'&&a.itemTask.destination===c.i).length*2+distance(ant.cell,c.i)*.015+this.traffic[c.i]*.015;",`      // Other carriers' destinations are read once per search, not per cell.
      const memo=this.dropMemo(),others=[],storing=new Map();for(const a of this.ants)if(a.itemTask?.phase==='store'){const d=a.itemTask.destination;storing.set(d,(storing.get(d)||0)+1);if(a.id!==ant.id)others.push(this.walkPoint(d));}
      const cells=[];for(const i of this.cells(rid)){if(!this.walkable(i))continue;const p=this.walkPoint(i);if(others.some(q=>Math.hypot(p.x-q.x,p.y-q.y)<.9))continue;const key=(i*256+rid)*8+DROP_KINDS[kind];let drop=memo.get(key);if(drop===undefined)memo.set(key,drop=this.storageDrop(rid,p,kind,this.reachOutAt(i,p,kind)));if(drop)cells.push({i,drop,score:drop.score+(storing.get(i)||0)*2+distance(ant.cell,i)*.015+this.traffic[i]*.015});}
      const score=c=>c.score;`,'storage search reads carriers once');
replace("    cells(rid){\n      const out=[];for(let i=0;i<SIZE;i++)if(!this.loose[i]&&this.grainCells(i).filter(g=>!this.grains[g]&&this.grainRoom[g]===rid).length>=4)out.push(i);return out;",`    cells(rid){
      // Room cells change only with dug grains, settled loads or reassigned
      // grains, and each of those bumps the terrain revision.
      if(!this._roomCells)this._roomCells=new Map();const hit=this._roomCells.get(rid);if(hit?.revision===this.revision)return hit.out;
      const out=[];for(let i=0;i<SIZE;i++)if(!this.loose[i]&&this.grainCells(i).filter(g=>!this.grains[g]&&this.grainRoom[g]===rid).length>=4)out.push(i);this._roomCells.set(rid,{revision:this.revision,out});return out;`,'room cells per terrain revision');
replace("    storageDrop(rid,point,kind) {\n      const {hx,hy}=Physics.SHAPES[kind],stock=this.physics.bodies.filter(b=>b.kind===kind&&!b.carrier),choices=[];\n      for(let d=0;d<16;d++){\n        const angle=d*Math.PI/8,x=point.x+Math.cos(angle)*ANT_SIZE*.55,y=point.y+Math.sin(angle)*ANT_SIZE*.55;\n        if(!this.sweptClear({...point,angle:point.angle??angle},{...point,angle},kind)||this.physics.terrainOverlap({kind,x,y})||this.physics.penetration({kind,x,y})>1e-7)continue;\n        for(let gy=Math.ceil((y+hy-1e-7)*GRID);gy<FH;gy++){\n          let support=false;\n          for(let gx=Math.floor((x-hx+1e-7)*GRID);gx<=Math.floor((x+hx-1e-7)*GRID);gx++)if(this.grains[gy*FW+gx]){support=true;break;}\n          if(!support)continue;\n          let landing=gy*GRAIN.size-hy;\n          // The first support can be an existing egg or food pile, above the\n          // bare floor. Judge the actual resting place, including other kinds.\n          for(const b of this.physics.bodies)if(!b.carrier){const shape=Physics.SHAPES[b.kind],top=b.y-shape.hy;\n            if(Math.abs(x-b.x)<hx+shape.hx-1e-7&&top>=y+hy-1e-7)landing=Math.min(landing,top-hy);\n          }\n          if(this.grainRoom[GRAIN.at(x,landing)]===rid&&!this.physics.terrainOverlap({kind,x,y:landing})&&this.physics.penetration({kind,x,y:landing})<=1e-7){\n            const density=stock.reduce((sum,b)=>sum+Math.exp(-((x-b.x)**2+(landing-b.y)**2)/1.5),0);\n            choices.push({angle,x,y,landing,score:density+(landing-y)*.03});\n          }\n          break;\n        }\n      }\n      return choices.sort((a,b)=>a.score-b.score||a.angle-b.angle)[0]||null;\n    }\n",`    dropMemo(){
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
`,'storage landing per resting world');
replace("  const FOOTPRINT_MEMO=60000,KNOWN_ROUTES=20000;","  const FOOTPRINT_MEMO=60000,KNOWN_ROUTES=20000,DROP_KINDS={soil:0,egg:1,food:2,waste:3,cookie:4};",'storage landing keys');
replace("ownFlow=flow(ant),block=this.ants.find(b=>{","ownFlow=flow(ant),block=ant.enemy?undefined:this.ants.find(b=>{",'raiders follow their own contact rules');
replace("ant.walked+=step;this.stats.distance+=step;","ant.walked+=step;if(!ant.enemy)this.stats.distance+=step;",'raider walking is not colony distance');
replace("if(step&&Math.cos(Math.atan2(q.y-ant.y,q.x-ant.x)-ant.angle)<-.5)this.stats.backwardDistance+=step;","if(!ant.enemy&&step&&Math.cos(Math.atan2(q.y-ant.y,q.x-ant.x)-ant.angle)<-.5)this.stats.backwardDistance+=step;",'raider walking is not colony backing');
replace("this.traffic[ant.cell]+=step*.2;this._flowCells?.add(ant.cell);","if(!ant.enemy){this.traffic[ant.cell]+=step*.2;this._flowCells?.add(ant.cell);}",'raiders leave no colony traffic');
replace("const a=this.ants.find(a=>a.id===b.carrier),owner=","const a=this.ants.find(a=>a.id===b.carrier)??this.enemyById?.(b.carrier),owner=",'raiders carry what they take');
replace("if(b.carrier){const a=s.ants.find(a=>a.id===b.carrier);if(!a||","if(b.carrier){const a=s.ants.find(a=>a.id===b.carrier);if(!a&&b.carrier>=200)continue;if(!a||",'raider loads are checked with the raid');
replace("carrier>128","carrier>128&&(carrier<200||carrier>249)",'raider ids in saves');
replace("const idle=this.ants.filter(a=>a.role==='build'&&a.desiredRole==='build'&&a.job===null&&!a.itemTask&&!a.yielding&&!a.yieldHold);","const idle=this.ants.filter(a=>a.role==='build'&&a.desiredRole==='build'&&a.job===null&&!a.itemTask&&!a.yielding&&!a.yieldHold&&!a.fight&&!a.alarm);",'a fighting or alarmed worker takes no dig');
// A worker backing over the ground keeps facing the way it faces; only
// its tilt follows the slope.
replace("if(Math.abs(dx)>1e-8){const slope=clamp(this.surfacePoint(ant.x+.5).y-this.surfacePoint(ant.x-.5).y,-1,1),direction=Math.sign(dx);ant.angle=Math.atan2(slope*direction,direction);}","if(Math.abs(dx)>1e-8){const slope=clamp(this.surfacePoint(ant.x+.5).y-this.surfacePoint(ant.x-.5).y,-1,1),direction=Math.sign(Math.cos(oldAngle))||Math.sign(dx);ant.angle=Math.atan2(slope*direction,direction);}",'backing on the surface keeps its facing');
replace("['grainRoom',13]","['grainRoom',254]",'saved grain room tags');
replace("required.sort((a,b)=>(b.d/b.wanted*(","required.sort((a,b)=>(b.d/b.wanted*(b.weight??1)*(",'room need weight b');
replace("-(a.d/a.wanted*(this.priority","-(a.d/a.wanted*(a.weight??1)*(this.priority",'room need weight a');
replace("+'\u306b\u8377\u7269\u3092\u904b\u3073\u5165\u308c\u3089\u308c\u308b\u3088\u3046\u306b\u306a\u308a\u307e\u3057\u305f\u3002');}}","+(this.roomKind(rid)==='rest'?'\u3067\u4f11\u3081\u308b\u3088\u3046\u306b\u306a\u308a\u307e\u3057\u305f\u3002':'\u306b\u8377\u7269\u3092\u904b\u3073\u5165\u308c\u3089\u308c\u308b\u3088\u3046\u306b\u306a\u308a\u307e\u3057\u305f\u3002'));}}",'a finished rest chamber is for resting');
// A pebble is heavy: one per trip, carried at a slower pace (game.js).
replace("const SOIL = 1, HARD = 2, ROCK = 3;","const SOIL = 1, HARD = 2, ROCK = 3, PEBBLE = 4;",'pebble grain');
replace("values[y*FW+x]=band%2?HARD:SOIL;","// A few loose pebbles lie in the soil, more in the deeper layers.\n        values[y*FW+x]=hash(x,y,seed^0x51ab)%1000<(band?25:15)?PEBBLE:band%2?HARD:SOIL;",'pebbles in the soil');
replace("canExcavate(g){return this.grains[g]===SOIL||this.grains[g]===HARD&&this.hardDig;}","canExcavate(g){return this.grains[g]===SOIL||this.grains[g]===PEBBLE||this.grains[g]===HARD&&this.hardDig;}",'pebbles are dug out');
replace("const grainCost=type=>type===HARD?.56:.28;","const grainCost=type=>type===HARD?.56:type===PEBBLE?.4:.28;",'prying a pebble loose');
replace("material=grains.reduce((type,g)=>Math.max(type,this.grains[g]),0);","material=grains.reduce((type,g)=>Math.max(type,this.grains[g]===PEBBLE?SOIL:this.grains[g]),0);",'a pebble cell is soil for the coarse terrain');
replace("['grains',3]","['grains',4]",'saved pebbles');
replace("materials.some(t=>![SOIL,HARD].includes(t))","materials.some(t=>![SOIL,HARD,PEBBLE].includes(t))",'saved pebble jobs');
replace("if(s.terrain[i]!==cells.reduce((n,g)=>Math.max(n,s.grains[g]),0))fail();","if(s.terrain[i]!==cells.reduce((n,g)=>Math.max(n,s.grains[g]===PEBBLE?SOIL:s.grains[g]),0))fail();",'saved coarse terrain with pebbles');
replace("material<1||material>2","material<1||material>4",'saved pebble loads');
replace("if(!this.canExcavate(g)||this.supportsStock(g)||this.jobs.some(j=>j.grains.includes(g))||!this.grainNeighbors(g).some(n=>!this.grains[n]))continue;","if(!this.canExcavate(g)||count>1&&this.grains[g]===PEBBLE||this.supportsStock(g)||this.jobs.some(j=>j.grains.includes(g))||!this.grainNeighbors(g).some(n=>!this.grains[n]))continue;",'a pebble is carried alone');
replace("return { Simulation, Physics, W, H, SIZE, SURFACE,","return { Simulation, Physics, W, H, SIZE, SURFACE, PEBBLE,",'export pebble');
replace("if((along>.15||Math.abs(along)<=.15&&b.id<ant.id)&&Math.hypot(p.x-b.x,p.y-b.y)<(kind?2.3:1.8)){following=true;return true;}","if((along>.15||Math.abs(along)<=.15&&b.id<ant.id)&&Math.hypot(p.x-b.x,p.y-b.y)<(kind?2.3:1.8)){following=true;return true;}\n          // Side by side in one stream the lower id leads; the leader is not\n          // held back by its follower under any other rule.\n          if(Math.abs(along)<=.15)return false;",'one leader for two workers side by side');
replace("const dx=b.x-ant.x,dy=b.y-ant.y,along=dx*Math.cos(ownFlow)+dy*Math.sin(ownFlow),side=Math.abs(dx*Math.sin(ownFlow)-dy*Math.cos(ownFlow)),room=this.grainRoom[GRAIN.at(b.x,b.y)],sameFlow=Math.cos(ownFlow-flow(b))>.96;","// Two workers in one stream measure ahead/behind on the same axis, their\n        // mean heading, so exactly one of them is ahead of the other.\n        const otherFlow=flow(b),sameFlow=Math.cos(ownFlow-otherFlow)>.96,axis=sameFlow?Math.atan2(Math.sin(ownFlow)+Math.sin(otherFlow),Math.cos(ownFlow)+Math.cos(otherFlow)):ownFlow;\n        const dx=b.x-ant.x,dy=b.y-ant.y,along=dx*Math.cos(axis)+dy*Math.sin(axis),side=Math.abs(dx*Math.sin(axis)-dy*Math.cos(axis)),room=this.grainRoom[GRAIN.at(b.x,b.y)];",'a shared axis for ahead and behind');
replace("if(other&&Math.hypot(other.x-ant.x,other.y-ant.y)<2.4&&this.grainRoom[GRAIN.at(ant.x,ant.y)]!==1&&other.path.length)return false;delete ant.yieldHold;","// Two workers can each have stepped aside for the other. Then the one\n        // with the load or the work goes first, as in a head-on meeting.\n        const rank=a=>(this.carriedKind(a)?100:0)+(a.job!==null?10:0)-a.id*.01,mutual=other?.yieldHold===ant.id&&rank(ant)>rank(other);\n        if(other&&!mutual&&Math.hypot(other.x-ant.x,other.y-ant.y)<2.4&&this.grainRoom[GRAIN.at(ant.x,ant.y)]!==1&&other.path.length)return false;delete ant.yieldHold;",'no mutual stepping aside');
replace('  class Simulation {',fs.readFileSync(path.join(root,'traffic-index.js'),'utf8')+'\n  class Simulation {','traffic index source');
replace('    move(ant,dt,occupancy,goal=null){',`    trafficIndex(){
      if(!this._trafficIndex||this._trafficIndex.ants!==this.ants||this._trafficIndex.count!==this.ants.length)this._trafficIndex=new AntTrafficIndex(this.ants);
      return this._trafficIndex;
    }
    trafficCandidates(p){return this.trafficIndex().query(p);}
    move(ant,dt,occupancy,goal=null){`,'nearby traffic candidates');
replace('block=ant.enemy?undefined:this.ants.find(b=>{','block=ant.enemy?undefined:this.trafficCandidates(p).find(b=>{','traffic broad phase only');
replace('const other=this.ants.find(a=>a.id===ant.yieldHold);','const other=this.trafficIndex().byId.get(ant.yieldHold);','traffic hold id lookup');
replace('ant.x=p.x;ant.y=p.y;ant.angle=p.angle;', 'ant.x=p.x;ant.y=p.y;ant.angle=p.angle;this._trafficIndex?.update(ant);','update index before next worker moves');
replace('if(oldY!==ant.y||oldAngle!==ant.angle)surfaceChanged=true;', 'if(oldY!==ant.y||oldAngle!==ant.angle){surfaceChanged=true;this._trafficIndex?.update(ant);}','update index after surface settling');
replace('this.time += dt; this.ticks++;', 'this.time += dt; this.ticks++;this._trafficIndex=null;','rebuild traffic snapshot each completed tick');
replace('return { Simulation, Physics,', 'return { Simulation, AntTrafficIndex, Physics,','traffic index for verification');
replace('  class Simulation {',fs.readFileSync(path.join(root,'route-network.js'),'utf8')+'\n  class Simulation {','shared route network source');
replace('    path(from,to,kind=undefined,raw=false,depth=0){\n      const route=this.planPath(from,to,kind,raw,depth);',`    sharedNetworkPath(from,to,kind){
      if(!this.builds?.some(b=>b?.complete))return null;
      const a=typeof from==='number'?this.walkPoint(from):from,p=typeof to==='number'?this.walkPoint(to):to;
      if(!a||!p||p.valid===false||a.yielding)return null;
      if(kind===undefined)kind=typeof from==='object'?this.carriedKind(from):null;
      if(!this._routeNetwork)this._routeNetwork=new RouteNetwork(this);
      return this._routeNetwork.route(a,p,kind);
    }
    path(from,to,kind=undefined,raw=false,depth=0){
      const route=(!raw&&!depth?this.sharedNetworkPath(from,to,kind):null)||this.planPath(from,to,kind,raw,depth);`,'use the shared underground network');
replace('    invalidateNavigation(cell){','    invalidateNavigation(cell){\n      this._routeNetwork?.invalidate(cell);','local network invalidation');
replace('const roomWander=typeof from',"const networkRoom=a._networkRoom,networkInside=q=>networkRoom===-1?q.y<SURFACE:this.grainRoom[GRAIN.at(q.x,q.y)]===networkRoom;\n      const roomWander=typeof from",'constrain local room connectors');
replace('      for(const angle of [heading,',`      if(networkRoom!==undefined)for(let k=0,n=Math.max(1,Math.ceil(distanceToGoal/.125));k<=n;k++)if(!networkInside({x:a.x+(p.x-a.x)*k/n,y:a.y+(p.y-a.y)*k/n})){roomStraight=false;break;}
      for(const angle of [heading,`,'local room straight-line boundary');
replace('const safe=id=>{const z=decode(id);if(roomWander', 'const safe=id=>{const z=decode(id);if(networkRoom!==undefined&&!networkInside(z))return false;if(roomWander','local room search boundary');
replace('return { Simulation, AntTrafficIndex, Physics,','return { Simulation, AntTrafficIndex, RouteNetwork, Physics,','network inspection for verification');
fs.writeFileSync(path.join(root,'core.js'),source);
source=read('game.js');
replace("FORMAT='ant-colony-1',KEY='antColonyGame_1',LIMIT=64","FORMAT='living-clicker-life-1',KEY='livingClicker_1',LIMIT=128",'independent lifecycle save');
replace("else root.ColonyGame=factory(root.LivingNest);","else root.ColonyLife=factory(root.LivingNest);",'base lifecycle namespace');
replace("const rate=1+this.colony.upgrades.brood*.2;","const rate=this.broodRate?.()||1+this.colony.upgrades.brood*.2;",'actual development research');
replace('this.colony.queen+dt)','this.colony.queen+dt*(this.layRate?.()||1))','actual queen research');
replace('this.physics.remove(b);this.colony.brood=this.colony.brood.filter(a=>a!==e);','this.physics.remove(b);this.afterBirth?.(this.ants.at(-1));this.colony.brood=this.colony.brood.filter(a=>a!==e);','newborn chooses an actual free resting place');
// The stock count is fixed during one ant's filter. Count it once when a wild
// item asks, not by rescanning every body for every incoming item.
replace("this._incoming=(all||[]).filter(b=>!feeding.has(b.id)&&(ant.role==='nurse'?b.kind==='egg':b.kind==='food'&&(!this.colony.wild.includes(b.id)||this.foodBodies().length<maximum)));","let stocked=null;\n      this._incoming=(all||[]).filter(b=>!feeding.has(b.id)&&(ant.role==='nurse'?b.kind==='egg':b.kind==='food'&&(!this.colony.wild.includes(b.id)||(stocked??=this.foodBodies().length)<maximum)));",'count stock once per filter');
// Stage-specific brood studies and the tap study scale the same real timers.
replace("if(e.stage==='egg'){e.age+=dt*rate;","if(e.stage==='egg'){e.age+=dt*rate*(this.stageRate?.('egg')??1);",'egg stage research');
replace("if(e.feeds>=2){e.age+=dt*rate;","if(e.feeds>=2){e.age+=dt*rate*(this.stageRate?.('larva')??1);",'larva stage research');
replace("this.colony.queen=Math.min(40,this.colony.queen+4);return true;","this.colony.queen=Math.min(40,this.colony.queen+4*(this.tapPower?.()??1));return true;",'tap research');
// A fed larva leaves waste; waste lying near a larva slows its growth.
replace("if(e.feeds>=2){e.age+=dt*rate*(this.stageRate?.('larva')??1);","if(e.feeds>=2){e.age+=dt*rate*(this.stageRate?.('larva')??1)*(this.wasteFactor?.(b)??1);",'waste slows a larva');
replace("this.physics.remove(b);e.feeds++;e.lastFed=this.time;this.colony.stats.eaten++;","this.physics.remove(b);e.feeds++;e.lastFed=this.time;this.colony.stats.eaten++;this.afterMeal?.(e,target);",'meal leaves waste');
replace("for(const a of s.ants)if(a.itemTask?.purpose){","for(const a of s.ants)if(a.itemTask?.purpose&&a.itemTask.purpose!=='clean'){",'cleaning is checked by its own rules');
// Recycled waste is a real source of food, counted next to forage.
replace("food.length+stats.eaten+stats.spent!==stats.initialFood+stats.generated","food.length+stats.eaten+stats.spent+(c.ferment?.used||0)!==stats.initialFood+stats.generated+(c.waste?.recycled||0)",'recycled food ledger');
// Deaths from disease: a birth takes the smallest free id, and the ant ledger
// and save check count the dead. Without deaths nothing changes.
replace("id=this.colony.nextAnt++;","id=this.freeAntId?.()??this.colony.nextAnt++;",'reuse a free ant id');
replace("c.nextAnt!==s.ants.length+1","c.nextAnt<s.ants.length+1||c.nextAnt-1-s.ants.length>(c.stats.died||0)",'ids freed by deaths');
replace("this.ants.length!==stats.initialAnts+stats.born","this.ants.length!==stats.initialAnts+stats.born-(stats.died||0)",'ant ledger with deaths');
// A real larva expels its gut contents (meconium) once, as it pupates.
replace("if(e.age>=50){e.stage='pupa';e.age=0;}","if(e.age>=50){e.stage='pupa';e.age=0;this.afterPupate?.(e,b);}",'meconium at pupation');
// Foragers also carry a finished sweet grain to the queen chamber.
replace("b.kind==='food'&&(!this.colony.wild.includes(b.id)||(stocked??=this.foodBodies().length)<maximum)","(b.kind==='food'&&(!this.colony.wild.includes(b.id)||(stocked??=this.foodBodies().length)<maximum)||b.kind==='cookie')",'foragers carry sweet grains');
replace("const ROLES=['forage','nurse','build'];","const ROLES=['forage','nurse','build','guard'];",'guard role');
replace("const c={forage:0,nurse:0,build:0};","const c={forage:0,nurse:0,build:0,guard:0};",'guard count');
replace("roleWeights:{forage:1,nurse:1,build:1}","roleWeights:{forage:1,nurse:1,build:1,guard:0}",'no guards at start');
replace("c.brood.length+stats.born!==stats.initialBrood+stats.laid","c.brood.length+stats.born+(c.raid?.stolenBrood||0)!==stats.initialBrood+stats.laid",'stolen brood ledger');
replace("food.length+stats.eaten+stats.spent+(c.ferment?.used||0)!==stats.initialFood+stats.generated+(c.waste?.recycled||0)","food.length+stats.eaten+stats.spent+(c.ferment?.used||0)+(c.raid?.stolenFood||0)!==stats.initialFood+stats.generated+(c.waste?.recycled||0)+(c.raid?.prey||0)",'stolen food and prey ledger');
replace("      const all=this._incoming,feeding=new Set(this.ants.filter(a=>a.itemTask?.purpose==='feed').map(a=>a.itemTask.target));","      // Only a worker about to take a task reads the incoming list: the core\n      // assigns tasks on every 30th step to a worker that is not walking.\n      if(!ant.itemTask&&(ant.path.length&&!ant.returning||this.ticks%30!==0))return false;\n      const all=this._incoming,feeding=new Set(this.ants.filter(a=>a.itemTask?.purpose==='feed').map(a=>a.itemTask.target));",'incoming list only for a worker taking a task');
fs.writeFileSync(path.join(root,'lifecycle.js'),source);
console.log('Organic core and lifecycle generated with checked hooks.');
