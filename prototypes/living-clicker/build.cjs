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
    roomKind(rid){return rid%2===0?'egg':'food';}
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
replace('if (this.grainRoom[g] === 2) larvae++; else if (this.grainRoom[g] === 3) food++;','if (this.grainRoom[g]>=2) {if(this.roomKind(this.grainRoom[g])===\'egg\')larvae++;else food++;}','physical capacity');
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
replace("['room',3,true]","['room',13,true]",'saved room tags');
replace('pack.ants.length>64','pack.ants.length>128','saved ants');
replace('pack.jobs.length>64','pack.jobs.length>128','saved jobs');
replace('pack.rooms.length!==4','pack.rooms.length<4||pack.rooms.length>14','saved room count');
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
replace("food:{hx:3/16,hy:3/16,density:.8}};","food:{hx:3/16,hy:3/16,density:.8},waste:{hx:5/32,hy:1/8,density:.7}};",'waste pellet shape');
replace("const KINDS=['soil','egg','food'],STATES=['cargo','delivered','incoming','stored','pickup'];","const KINDS=['soil','egg','food','waste'],STATES=['cargo','delivered','incoming','stored','pickup','refuse'];",'waste kind and refuse state');
replace("const counts={soil:0,egg:0,food:0};","const counts={soil:0,egg:0,food:0,waste:0};",'waste body count');
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
fs.writeFileSync(path.join(root,'lifecycle.js'),source);
console.log('Organic core and lifecycle generated with checked hooks.');
