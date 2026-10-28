/* Reuse object inputs only inside one synchronous destination query.
   No body mutation can be hidden between queries, including mid-tick pickup. */
module.exports=function storageInputs(source){
 function replace(from,to,label){if(source.split(from).length!==2)throw Error('storage inputs hook: '+label);source=source.replace(from,to);}
 replace('    storageDrop(rid,point,kind,reach=this.storageReachOut(point,kind)) {',`    storageDropInputs(rid,kind){
      const bodies=this.physics.bodies,stock=[],columns=new Map(),pad=ANT_SIZE*.55+1;let minY=Infinity;
      // Every mouth starts within its walkPoint's coarse cell plus this pad.
      // Bodies above all mouths can neither overlap a load nor support it.
      // Keep all lower supports, even beyond the room floor or room tags.
      for(const i of this.cells(rid))minY=Math.min(minY,xy(i).y-pad);
      let widest=0;for(const shape of Object.values(Physics.SHAPES))widest=Math.max(widest,shape.hx);
      for(let k=0;k<bodies.length;k++){const b=bodies[k];if(b.carrier)continue;
        if(b.kind===kind)stock.push(b); // Global density retains original order.
        if(b.y<minY)continue;const x=Math.floor(b.x);if(!columns.has(x))columns.set(x,[]);columns.get(x).push(k);
      }
      const memo=new Map(),radius=Physics.SHAPES[kind].hx+widest+ANT_SIZE*.55+.01;
      return {stock,under:x=>{let out=memo.get(x);if(out)return out;const indices=[];
        for(let c=Math.floor(x-radius);c<=Math.floor(x+radius);c++)if(columns.has(c))indices.push(...columns.get(c));
        indices.sort((a,b)=>a-b);out=[];for(const k of indices){const b=bodies[k];if(Math.abs(x-b.x)<Physics.SHAPES[kind].hx+Physics.SHAPES[b.kind].hx+ANT_SIZE*.55+.01)out.push(b);}
        memo.set(x,out);return out;
      }};
    }
    storageDrop(rid,point,kind,reach=this.storageReachOut(point,kind),inputs=null) {`,'query-local inputs');
 replace("const {hx,hy}=Physics.SHAPES[kind],stock=this.physics.bodies.filter(b=>b.kind===kind&&!b.carrier),choices=[];","const {hx,hy}=Physics.SHAPES[kind],stock=inputs?inputs.stock:this.physics.bodies.filter(b=>b.kind===kind&&!b.carrier),choices=[];",'same-kind list');
 replace("const under=this.physics.bodies.filter(b=>!b.carrier&&Math.abs(point.x-b.x)<hx+Physics.SHAPES[b.kind].hx+ANT_SIZE*.55+.01);","const under=inputs?inputs.under(point.x):this.physics.bodies.filter(b=>!b.carrier&&Math.abs(point.x-b.x)<hx+Physics.SHAPES[b.kind].hx+ANT_SIZE*.55+.01);",'ordered column query');
 replace('const memo=this.dropMemo(),others=[],storing=new Map();','const memo=this.dropMemo(),others=[],storing=new Map();let inputs=null;','one query lifetime');
 replace('if(drop===undefined)memo.set(key,drop=this.storageDrop(rid,p,kind,this.reachOutAt(i,p,kind)));','if(drop===undefined){if(!inputs)inputs=this.storageDropInputs(rid,kind);memo.set(key,drop=this.storageDrop(rid,p,kind,this.reachOutAt(i,p,kind),inputs));}','lazy input construction');
 return source;
};
