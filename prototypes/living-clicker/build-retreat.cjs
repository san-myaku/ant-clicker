/* Same active-retreat correction for the generated core and QA comparisons.
   Historical bug reproducers must keep their unmodified source. */
module.exports=function activeRetreat(source){
  const from='if(!following&&ant.blocked>.25&&!ant.yielding){const next=block.path[block.next];';
  if(source.split(from).length!==2)throw Error('active retreat hook must match once');
  return source.replace(from,`if(!following&&ant.blocked>.25&&ant.yielding){
            if(ant.yieldFor===block.id&&block.waitingFor===ant.id)this.retreat(ant,block);
          }
          if(!following&&ant.blocked>.25&&!ant.yielding){const next=block.path[block.next];`);
};
