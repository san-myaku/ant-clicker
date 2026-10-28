module.exports=function(source){
 const from=`      if(!this._roomCells)this._roomCells=new Map();const hit=this._roomCells.get(rid);if(hit?.revision===this.revision)return hit.out;
      const out=[];for(let i=0;i<SIZE;i++)if(!this.loose[i]&&this.grainCells(i).filter(g=>!this.grains[g]&&this.grainRoom[g]===rid).length>=4)out.push(i);this._roomCells.set(rid,{revision:this.revision,out});return out;`;
 const to=`      if(this._allRoomCells?.revision!==this.revision){
        const groups=new Map(),counts=new Uint8Array(256),touched=[];
        for(let i=0;i<SIZE;i++)if(!this.loose[i]){
          for(const g of this.grainCells(i))if(!this.grains[g]){
            const room=this.grainRoom[g];if(!counts[room])touched.push(room);
            if(++counts[room]===4){let cells=groups.get(room);if(!cells)groups.set(room,cells=[]);cells.push(i);}
          }
          for(const room of touched)counts[room]=0;touched.length=0;
        }
        this._allRoomCells={revision:this.revision,groups};
      }
      const groups=this._allRoomCells.groups;if(!groups.has(rid))groups.set(rid,[]);return groups.get(rid);`;
 if(source.split(from).length!==2)throw Error('room cells: expected one hook');return source.replace(from,to);
};
