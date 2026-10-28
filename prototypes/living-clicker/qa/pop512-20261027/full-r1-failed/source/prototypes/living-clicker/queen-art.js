  // One queen pixel occupies the same world distance as one worker pixel.
  // A larger body gets more pixels, rather than magnifying the worker sprite.
  const QUEEN_DOT=ANT_SIZE/16,QUEEN_PIXELS=128,QUEEN_UNIT=6.4/QUEEN_DOT;
  function queenFrame(phase){
    const key='queen-detail:'+phase;if(pixelAntCache.has(key))return pixelAntCache.get(key);
    const frame=document.createElement('canvas');frame.width=frame.height=QUEEN_PIXELS;
    const c=frame.getContext('2d'),pivot=QUEEN_PIXELS/2,unit=QUEEN_UNIT;
    const point=(x,y)=>({x:Math.round(pivot+x*unit),y:Math.round(pivot+y*unit)});
    function line(a,b,color){
      let x=a.x,y=a.y;const dx=Math.abs(b.x-x),dy=Math.abs(b.y-y),sx=x<b.x?1:-1,sy=y<b.y?1:-1;let error=dx-dy;c.fillStyle=color;
      while(true){c.fillRect(x,y,1,1);if(x===b.x&&y===b.y)break;const twice=error*2;if(twice>-dy){error-=dy;x+=sx;}if(twice<dx){error+=dx;y+=sy;}}
    }
    const legs='#493325',twitch=(phase===1?1:phase===3?-1:0)/unit;
    // Six short articulated legs, attached to the thorax, behind the body.
    for(const side of [-1,1])for(const [hip,knee,foot,reach]of [[-.065,-.14,-.20,.205],[.015,-.015,-.045,.22],[.085,.16,.20,.205]]){
      const sway=twitch*(hip>0?1:-1)*side;
      line(point(hip,side*.055),point(knee+sway,side*.145),legs);
      line(point(knee+sway,side*.145),point(foot+sway,side*reach),legs);
      line(point(foot+sway,side*reach),point(foot+sway+.025,side*(reach-.006)),legs);
    }
    for(const side of [-1,1]){
      const knee=point(.40,side*(.10+twitch));
      line(point(.345,side*.055),knee,legs);line(knee,point(.445,side*(.070+twitch)),legs);
    }
    const parts=[
      {name:'gaster',x:-.28,rx:.205,ry:.156},
      {name:'waist',x:-.085,rx:.045,ry:.039},
      {name:'thorax',x:.025,rx:.125,ry:.113},
      {name:'head',x:.255,rx:.125,ry:.105}
    ];
    const within=(part,x,y)=>((x-part.x)/part.rx)**2+(y/part.ry)**2<=1;
    const physical=(x,y)=>ANT_BODY.some(([cx,rx,ry])=>((x-cx)/rx)**2+(y/ry)**2<=1);
    for(let py=0;py<QUEEN_PIXELS;py++)for(let px=0;px<QUEEN_PIXELS;px++){
      const x=(px+.5-pivot)/unit,y=(py+.5-pivot)/unit,part=parts.findLast(p=>within(p,x,y));
      if(!part||![[0,0],[1,0],[0,1],[1,1]].every(([ox,oy])=>physical((px+ox-pivot)/unit,(py+oy-pivot)/unit)))continue;
      const edge=!within(part,x-1/unit,y)||!within(part,x+1/unit,y)||!within(part,x,y-1/unit)||!within(part,x,y+1/unit);
      let color=edge?'#251e19':y>part.ry*.35?'#4e3727':y<-.025?'#8a6342':'#6e4d32';
      if(part.name==='gaster'&&!edge){
        if(((x+.31)/.105)**2+((y+.045)/.052)**2<1)color='#9c7752';
        // Curved tergite seams follow the abdomen, in a quiet shell shade.
        const seam=x+(y/part.ry)**2*.023;
        if([-.40,-.325,-.25,-.175].some(v=>Math.abs(seam-v)<.48/unit))color=y<-.02?'#755133':'#503727';
      }else if(part.name==='waist'&&!edge)color=y<0?'#946a43':'#553b29';
      else if(part.name==='thorax'&&!edge){
        color=y<-.025?'#a17a52':y>.035?'#5a3f2b':'#815b3b';
        if(Math.abs(x+.025)<.7/unit&&Math.abs(y)<.07)color='#60432c';
        // Small paired wing scars on the queen's enlarged thorax.
        if(((x-.015)/.043)**2+((Math.abs(y)-.070)/.018)**2<1)color='#513928';
      }else if(part.name==='head'&&!edge)color=y<-.02?'#9a744d':y>.04?'#543a28':'#795335';
      c.fillStyle=color;c.fillRect(px,py,1,1);
    }
    for(const side of [-1,1]){
      const eye=point(.278,side*.073);c.fillStyle='#181714';c.fillRect(eye.x,eye.y,2,1);
      line(point(.358,side*.027),point(.394,side*.035),'#39291e');
      line(point(.394,side*.035),point(.395,side*.009),'#39291e');
    }
    return rememberAntFrame(key,frame);
  }
  function drawQueen(c,x,y,scale,reduced){
    const frame=queenFrame(reduced?0:Math.floor(sim.time*1.2)%4),span=QUEEN_PIXELS*QUEEN_DOT*scale;
    c.save();c.imageSmoothingEnabled=false;c.drawImage(frame,x-span/2,y-span/2,span,span);c.restore();
  }
