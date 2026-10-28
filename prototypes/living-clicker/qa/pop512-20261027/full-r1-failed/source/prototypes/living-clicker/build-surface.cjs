/* Apply the same physical surface rules to production and QA references. */
module.exports=function surface(source){
 function replace(from,to,label){if(source.split(from).length!==2)throw Error('surface hook: '+label);source=source.replace(from,to);}
 replace('for(let gx=Math.floor((x-halfBody)*GRID);gx<=Math.floor((x+halfBody)*GRID);gx++)for(let gy=0;gy<SURFACE*GRID;gy++){\n        if(this.physics.soilCells.has(gy*FW+gx)){top=Math.min(top,gy/GRID);break;}\n      }',`for(let gx=Math.floor((x-halfBody)*GRID);gx<=Math.floor((x+halfBody)*GRID);gx++){
        let supported=true;
        for(let gy=SURFACE*GRID-1;gy>=0;gy--){
          const grain=this.physics.soilCells.get(gy*FW+gx);
          if(!grain){supported=false;continue;}
          supported=supported||grain.rest>=30;
          if(supported)top=Math.min(top,gy/GRID);
        }
      }`,'airborne spoil is not a walking surface');
 replace('    surfacePoint(x){',`    // Follow the support without rotating the body or its load outside the
    // physical space. Prefer the slope, then progressively flatten the tilt
    // with the same facing. Every accepted leg keeps the normal sweep guard.
    surfaceHeading(angle){return Math.abs(Math.sin(angle))<=Math.SQRT1_2+1e-12;}
    surfacePose(ant,x,y,angle,kind=this.carriedKind(ant)){
      const flat=Math.cos(angle)<0?Math.PI:0,turn=Math.atan2(Math.sin(flat-angle),Math.cos(flat-angle)),steps=Math.max(1,Math.ceil(Math.abs(turn)/(Math.PI/16)));
      const same=(a,b)=>a.x===b.x&&a.y===b.y&&a.angle===b.angle,safe=(a,b)=>same(a,b)||this.sweptClear(a,b,kind,-1,.025);
      for(let k=0;k<=steps;k++){
        const pose={x,y,angle:angle+turn*k/steps};
        if(same(ant,pose))return {pose,via:pose};
        if(!this.poseClear(pose,kind,-1,.025))continue;
        if(safe(ant,pose))return {pose,via:pose};
        // Raising before rotating and rotating before raising are different
        // physical paths near the top border or a loaded downward-facing head.
        const rotated={x:ant.x,y:ant.y,angle:pose.angle};
        if(safe(ant,rotated)&&safe(rotated,pose))return {pose,via:rotated};
        const lifted={x,y,angle:ant.angle};
        if(safe(ant,lifted)&&safe(lifted,pose))return {pose,via:lifted};
      }
      this.collision={id:ant.id,from:{x:ant.x,y:ant.y,angle:ant.angle},proposed:{x,y,angle},kind,surface:true};
      throw new Error('地表で身体と荷物が収まる姿勢を選べませんでした');
    }
    surfacePoint(x){`,'constrained surface stance');
 replace('const oldY=ant.y,oldAngle=ant.angle;ant.y=walking||!next?groundY:Math.min(ant.y,groundY);\n          const dx=ant.x-previousX[k];\n          if(Math.abs(dx)>1e-8){const slope=clamp(this.surfacePoint(ant.x+.5).y-this.surfacePoint(ant.x-.5).y,-1,1),direction=Math.sign(Math.cos(oldAngle))||Math.sign(dx);ant.angle=Math.atan2(slope*direction,direction);}',`const oldY=ant.y,oldAngle=ant.angle,y=walking||!next?groundY:Math.min(ant.y,groundY),dx=ant.x-previousX[k];let angle=oldAngle;
          if(Math.abs(dx)>1e-8){const slope=clamp(this.surfacePoint(ant.x+.5).y-this.surfacePoint(ant.x-.5).y,-1,1),direction=Math.sign(Math.cos(oldAngle))||Math.sign(dx);angle=Math.atan2(slope*direction,direction);}
          const stance=this.surfacePose(ant,ant.x,y,angle);ant.y=stance.pose.y;ant.angle=stance.pose.angle;`,'validate the projection before changing the actor');
 replace('if(grounded){const y=this.surfacePoint(p.x).y;p.y=Math.abs(target.x-ant.x)>1.2||target.y>=y?y:Math.min(p.y,y);}',`let surfaceVia=null;
      if(grounded){const y=this.surfacePoint(p.x).y;p.y=Math.abs(target.x-ant.x)>1.2||target.y>=y?y:Math.min(p.y,y);
        const advance=this.surfacePose(ant,p.x,p.y,p.angle);Object.assign(p,advance.pose);surfaceVia=advance.via;
      }`,'surface walking follows a swept pose path');
 replace('if(!this.sweptClear(ant,p,this.carriedKind(ant),-1,.025))', 'if(!(surfaceVia?this.sweptClear(ant,surfaceVia,this.carriedKind(ant),-1,.025)&&this.sweptClear(surfaceVia,p,this.carriedKind(ant),-1,.025):this.sweptClear(ant,p,this.carriedKind(ant),-1,.025)))','keep the movement guard on every accepted leg');
 replace('if(d<=step+1e-8&&Math.abs(da-rotation)<1e-7){ant.angle=q.angle;ant.next++;}', 'if(d<=step+1e-8&&Math.abs(da-rotation)<1e-7){if(!grounded)ant.angle=q.angle;ant.next++;}','retain the validated surface tilt at a waypoint');
 // The terrain alignment above permits slopes through exactly 45 degrees.
 // Use that same category for walking, mirroring and following a settled heap.
 replace('Math.abs(Math.sin(a.angle))<.7&&Math.abs(Math.sin(b.angle))<.7','this.surfaceHeading(a.angle)&&this.surfaceHeading(b.angle)','surface turns include the maximum supported slope');
 replace('Math.abs(Math.sin(ant.angle))<.7&&Math.abs(Math.sin(target.angle))<.7','this.surfaceHeading(ant.angle)&&this.surfaceHeading(target.angle)','surface walking includes the maximum supported slope');
 replace('Math.abs(Math.sin(ant.angle))<.7&&Math.abs(Math.sin(next.angle))<.7','this.surfaceHeading(ant.angle)&&this.surfaceHeading(next.angle)','surface following includes the maximum supported slope');
 replace('if(!next&&Math.abs(Math.sin(ant.angle))<.7||walking||groundY<ant.y)','if(!next&&this.surfaceHeading(ant.angle)||walking||groundY<ant.y)','resting inclined workers follow settling support');
 return source;
};
