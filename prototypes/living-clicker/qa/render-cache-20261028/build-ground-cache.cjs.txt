const fs=require('node:fs'),path=require('node:path');
module.exports=function(source){const from='  function rebuildGround() {';if(source.split(from).length!==2)throw Error('ground cache: expected one hook');return source.replace(from,fs.readFileSync(path.join(__dirname,'ground-cache.js'),'utf8')+'\n  function rebuildGroundFull() {');};
