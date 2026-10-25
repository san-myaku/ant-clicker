/* Reuse the verified organic prototype, with checked extension points. */
const fs=require('node:fs'),path=require('node:path');
const root=__dirname,base=path.resolve(root,'../colony-game');
const read=name=>fs.readFileSync(path.join(base,name),'utf8').replace(/\r\n/g,'\n');
let source=read('core.js');
function replace(from,to,label){const n=source.split(from).length-1;if(n!==1)throw Error(label+': expected one hook, got '+n);source=source.replace(from,to);}
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
replace('![0,2,3].includes(j.rid)','![0,...s.roomIds()].includes(j.rid)','saved work room');
replace('![1,2,3].includes(t.rid)','![1,...s.roomIds()].includes(t.rid)','saved item destination');
fs.writeFileSync(path.join(root,'core.js'),source);
source=read('game.js');
replace("FORMAT='ant-colony-1',KEY='antColonyGame_1',LIMIT=64","FORMAT='living-clicker-life-1',KEY='livingClicker_1',LIMIT=128",'independent lifecycle save');
replace("else root.ColonyGame=factory(root.LivingNest);","else root.ColonyLife=factory(root.LivingNest);",'base lifecycle namespace');
replace("const rate=1+this.colony.upgrades.brood*.2;","const rate=this.broodRate?.()||1+this.colony.upgrades.brood*.2;",'actual development research');
replace('this.colony.queen+dt)','this.colony.queen+dt*(this.layRate?.()||1))','actual queen research');
replace('this.physics.remove(b);this.colony.brood=this.colony.brood.filter(a=>a!==e);','this.physics.remove(b);this.afterBirth?.(this.ants.at(-1));this.colony.brood=this.colony.brood.filter(a=>a!==e);','newborn chooses an actual free resting place');
fs.writeFileSync(path.join(root,'lifecycle.js'),source);
console.log('Organic core and lifecycle generated with checked hooks.');
