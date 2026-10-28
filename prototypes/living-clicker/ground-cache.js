  let groundSnapshot=null;
  function groundPalette(){
    const colors=[];for(let rid=0;rid<256;rid++)colors[rid]=rid===1?'#e2d1a9':rid>=2?(sim.roomKind(rid)==='egg'?'#e5d7bc':sim.roomKind(rid)==='rest'?'#e0d3b6':'#dcccab'):'#d7c7ab';return colors;
  }
  function rebuildGround(){
    const colors=groundPalette(),begin=SURFACE*GRID*FW;
    if(!groundSnapshot||groundSnapshot.sim!==sim||groundSnapshot.seed!==sim.seed){
      rebuildGroundFull();groundSnapshot={sim,seed:sim.seed,grains:sim.grains.slice(),rooms:sim.grainRoom.slice(),colors};return;
    }
    const old=groundSnapshot,changed=[],dirty=new Uint8Array(FW*FH),queue=[];
    const mark=g=>{if(g>=begin&&g<dirty.length)dirty[g]=1;};
    // 追加された固体は光を遮るため、単調増加の更新を使わず従来の全再生成へ戻す。
    for(let g=0;g<sim.grains.length;g++)if(sim.grains[g]&&!old.grains[g]){
      rebuildGroundFull();groundSnapshot={sim,seed:sim.seed,grains:sim.grains.slice(),rooms:sim.grainRoom.slice(),colors};return;
    }
    for(let g=0;g<sim.grains.length;g++){
      if(sim.grains[g]!==old.grains[g]){
        changed.push(g);mark(g);for(const n of GRAIN.neighbors(g))mark(n);
        if(g>=begin&&!sim.grains[g]&&visibleGrains[g]<13){visibleGrains[g]=13;queue.push(g);}
      }
      if(sim.grainRoom[g]!==old.rooms[g]||colors[sim.grainRoom[g]]!==old.colors[old.rooms[g]])mark(g);
    }
    // 空洞の追加で増える光だけを伝播する。光の値と13粒の範囲は従来と同じ。
    for(let at=0;at<queue.length;at++){
      const g=queue[at],value=visibleGrains[g]-1;mark(g);if(value<=0)continue;
      for(const n of GRAIN.neighbors(g))if(visibleGrains[n]<value){visibleGrains[n]=value;queue.push(n);}
    }
    const c=ground;c.imageSmoothingEnabled=false;
    for(let gy=SURFACE*GRID;gy<FH;gy++)for(let gx=0;gx<FW;){
      if(!dirty[gy*FW+gx]){gx++;continue;}
      const start=gx;while(gx<FW&&dirty[gy*FW+gx])gx++;const width=gx-start;
      c.clearRect(start,gy,width,1);c.drawImage(earthLayer,start*2,gy*2,width*2,2,start,gy,width,1);
      for(let x=start;x<gx;x++){
        const g=gy*FW+x;
        if(!sim.grains[g]){c.fillStyle=colors[sim.grainRoom[g]];c.fillRect(x,gy,1,1);continue;}
        const light=visibleGrains[g];
        if(!light){const p=GRAIN.center(g),type=(sim.layerAt(p.x,p.y)-1)%2?2:1;c.fillStyle=soilColor(type,g);c.fillRect(x,gy,1,1);}
        c.fillStyle='rgba(21,20,17,'+(light?(.6*(1-light/13)):.68)+')';c.fillRect(x,gy,1,1);
        if((x&&!sim.grains[g-1])||(x<FW-1&&!sim.grains[g+1])||!sim.grains[g-FW]||(gy<FH-1&&!sim.grains[g+FW])){c.fillStyle='#46372133';c.fillRect(x,gy,1,1);}
      }
    }
    old.grains.set(sim.grains);old.rooms.set(sim.grainRoom);old.colors=colors;cachedRevision=sim.revision;
  }
