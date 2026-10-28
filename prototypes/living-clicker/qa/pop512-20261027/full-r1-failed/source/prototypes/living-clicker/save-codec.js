/* Browser storage only. Simulation dumps and exported JSON stay unchanged.
   Gzip is lossless: no pose/history rounding, resampling, or removal. */
(function(root,factory){
  if(typeof module==='object'&&module.exports)module.exports=factory(require('fflate'));
  else root.LivingSaveCodec=factory(root.fflate);
})(typeof globalThis==='object'?globalThis:this,function(zip){
  'use strict';
  const FORMAT='living-clicker-storage-1',MAX_BYTES=16000000,MAX_CHARS=Math.ceil(MAX_BYTES*4/3)+256;
  const table=new Uint32Array(256);
  for(let i=0;i<256;i++){let c=i;for(let k=0;k<8;k++)c=c&1?0xedb88320^(c>>>1):c>>>1;table[i]=c;}
  function crc32(bytes){let c=0xffffffff;for(const b of bytes)c=table[(c^b)&255]^(c>>>8);return (c^0xffffffff)>>>0;}
  function fail(){throw Error('保存データを開けませんでした');}
  function base64(bytes){let s='';for(let k=0;k<bytes.length;k+=8192)s+=String.fromCharCode(...bytes.subarray(k,k+8192));return btoa(s);}
  function encode(pack){
    if(pack?.format!=='living-clicker-2')fail();
    const bytes=new TextEncoder().encode(JSON.stringify(pack));if(!bytes.length||bytes.length>MAX_BYTES)fail();
    const data=zip.gzipSync(bytes,{level:1,mtime:0});
    return JSON.stringify({format:FORMAT,encoding:'gzip-base64',bytes:bytes.length,crc32:crc32(bytes),data:base64(data)});
  }
  function decode(text){
    if(typeof text!=='string'||!text.length||text.length>MAX_CHARS)fail();
    const p=JSON.parse(text);
    // The same current game format may already exist as plain JSON. Reading
    // it does not rewrite storage; game validation still runs before adoption.
    if(p?.format==='living-clicker-2'){if(new TextEncoder().encode(text).length>MAX_BYTES)fail();return p;}
    if(p?.format!==FORMAT||Object.keys(p).sort().join(',')!=='bytes,crc32,data,encoding,format'||p.encoding!=='gzip-base64'||!Number.isInteger(p.bytes)||p.bytes<1||p.bytes>MAX_BYTES||!Number.isInteger(p.crc32)||p.crc32<0||p.crc32>0xffffffff||typeof p.data!=='string'||p.data.length%4||/[^A-Za-z0-9+/=]/.test(p.data))fail();
    const raw=atob(p.data);if(btoa(raw)!==p.data)fail();const data=Uint8Array.from(raw,c=>c.charCodeAt(0)),n=data.length;
    // Check bounded output size before allocating. Our writer emits one gzip
    // member without optional headers; reject unsupported headers explicitly.
    if(n<18||data[0]!==31||data[1]!==139||data[2]!==8||data[3]!==0)fail();
    const tail=new DataView(data.buffer,data.byteOffset+n-8,8);
    if(tail.getUint32(0,true)!==p.crc32||tail.getUint32(4,true)!==p.bytes)fail();
    const bytes=zip.gunzipSync(data,{out:new Uint8Array(p.bytes+1)});
    if(bytes.length!==p.bytes||crc32(bytes)!==p.crc32)fail();
    const pack=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));
    if(pack?.format!=='living-clicker-2')fail();return pack;
  }
  return {encode,decode,FORMAT,MAX_BYTES};
});
