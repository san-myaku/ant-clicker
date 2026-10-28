/* Add only the current physical surface generator to a frozen old model.
   Other traffic, item selection and growth rules stay in that old source. */
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),surface=require('../build-surface.cjs');
module.exports=function reference(folder){const copy=fs.mkdtempSync(path.join(os.tmpdir(),'living-surface-ref-'));for(const n of ['game.js','core.js','lifecycle.js']){let bytes=fs.readFileSync(path.join(folder,n));if(n==='core.js')bytes=Buffer.from(surface(bytes.toString('utf8')));fs.writeFileSync(path.join(copy,n),bytes);}return require(path.join(copy,'game.js'));};
