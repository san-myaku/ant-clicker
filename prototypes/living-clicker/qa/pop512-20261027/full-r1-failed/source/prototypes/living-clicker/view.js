/* fflate 0.8.3 — MIT License

Copyright (c) 2026 Arjun Barrett

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE. */
!function(f){typeof module!='undefined'&&typeof exports=='object'?module.exports=f():typeof define!='undefined'&&define.amd?define(f):(typeof self!='undefined'?self:this).fflate=f()}(function(){var _e={};"use strict";_e.deflate=zt,_e.deflateSync=kt,_e.inflate=At,_e.inflateSync=Tt,_e.gzip=It,_e.compress=It,_e.gzipSync=Ut,_e.compressSync=Ut,_e.gunzip=Zt,_e.gunzipSync=qt,_e.zlib=Lt,_e.zlibSync=Bt,_e.unzlib=Nt,_e.unzlibSync=Pt,_e.gzip=It,_e.compress=It,_e.decompress=Jt,_e.decompressSync=Kt,_e.strToU8=nn,_e.strFromU8=rn,_e.zip=dn,_e.zipSync=gn,_e.unzip=zn,_e.unzipSync=kn;var t=(typeof module!='undefined'&&typeof exports=='object'?function(_f){"use strict";var e,r,t,n=";var __w=require('worker_threads');__w.parentPort.on('message',function(m){onmessage({data:m})}),postMessage=function(m,t){__w.parentPort.postMessage(m,t)},close=process.exit;self=global";try{e=require("worker_threads"),r=e.Worker,t=e.isMarkedAsUntransferable}catch(e){}exports.default=r?function(e,o,a,s,u){var i=!1,l=new r(e+n,{eval:!0}).on("error",function(e){return u(e,null)}).on("message",function(e){return u(null,e)}).on("exit",function(e){e&&!i&&u(Error("exited with code "+e),null)});return t&&(s=s.filter(function(e){return!t(e)})),l.postMessage(a,s),l.terminate=function(){return i=!0,r.prototype.terminate.call(l)},l}:function(e,r,t,n,o){setImmediate(function(){return o(Error("async operations unsupported - update to Node 12+ (or Node 10-11 with the --experimental-worker CLI flag)"),null)});var a=function(){};return{terminate:a,postMessage:a}};return _f}:function(_f){"use strict";var e={};_f.default=function(r,t,s,a,n){var o=new Worker(e[t]||(e[t]=URL.createObjectURL(new Blob([r+';addEventListener("error",function(e){e=e.error;postMessage({$e$:[e.message,e.code,e.stack]})})'],{type:"text/javascript"}))));return o.onmessage=function(e){var r=e.data,t=r.$e$;if(t){var s=Error(t[0]);s.code=t[1],s.stack=t[2],n(s,null)}else n(null,r)},o.postMessage(s,a),o};return _f})({}),n=Uint8Array,r=Uint16Array,i=Int32Array,e=new n([0,0,0,0,0,0,0,0,1,1,1,1,2,2,2,2,3,3,3,3,4,4,4,4,5,5,5,5,0,0,0,0]),o=new n([0,0,0,0,1,1,2,2,3,3,4,4,5,5,6,6,7,7,8,8,9,9,10,10,11,11,12,12,13,13,0,0]),s=new n([16,17,18,0,8,7,9,6,10,5,11,4,12,3,13,2,14,1,15]),a=function(t,n){for(var e=new r(31),o=0;o<31;++o)e[o]=n+=1<<t[o-1];var s=new i(e[30]);for(o=1;o<30;++o)for(var a=e[o];a<e[o+1];++a)s[a]=a-e[o]<<5|o;return{b:e,r:s}},u=a(e,2),h=u.b,f=u.r;h[28]=258,f[258]=28;for(var c=a(o,0),l=c.b,p=c.r,v=new r(32768),d=0;d<32768;++d){var g=(43690&d)>>1|(21845&d)<<1;v[d]=((65280&(g=(61680&(g=(52428&g)>>2|(13107&g)<<2))>>4|(3855&g)<<4))>>8|(255&g)<<8)>>1}var y=function(t,n,i){for(var e=t.length,o=0,s=new r(n);o<e;++o)t[o]&&++s[t[o]-1];var a,u=new r(n);for(o=1;o<n;++o)u[o]=u[o-1]+s[o-1]<<1;if(i){a=new r(1<<n);var h=15-n;for(o=0;o<e;++o)if(t[o])for(var f=o<<4|t[o],c=n-t[o],l=u[t[o]-1]++<<c,p=l|(1<<c)-1;l<=p;++l)a[v[l]>>h]=f}else for(a=new r(e),o=0;o<e;++o)t[o]&&(a[o]=v[u[t[o]-1]++]>>15-t[o]);return a},m=new n(288);for(d=0;d<144;++d)m[d]=8;for(d=144;d<256;++d)m[d]=9;for(d=256;d<280;++d)m[d]=7;for(d=280;d<288;++d)m[d]=8;var b=new n(32);for(d=0;d<32;++d)b[d]=5;var w=y(m,9,0),x=y(m,9,1),z=y(b,5,0),k=y(b,5,1),M=function(t){for(var n=t[0],r=1;r<t.length;++r)t[r]>n&&(n=t[r]);return n},S=function(t,n,r){var i=n/8|0;return(t[i]|t[i+1]<<8)>>(7&n)&r},A=function(t,n){var r=n/8|0;return(t[r]|t[r+1]<<8|t[r+2]<<16)>>(7&n)},T=function(t){return(t+7)/8|0},D=function(t,r,i){return(null==r||r<0)&&(r=0),(null==i||i>t.length)&&(i=t.length),new n(t.subarray(r,i))};_e.FlateErrorCode={UnexpectedEOF:0,InvalidBlockType:1,InvalidLengthLiteral:2,InvalidDistance:3,StreamFinished:4,NoStreamHandler:5,InvalidHeader:6,NoCallback:7,InvalidUTF8:8,ExtraFieldTooLong:9,InvalidDate:10,FilenameTooLong:11,StreamFinishing:12,InvalidZipData:13,UnknownCompressionMethod:14};var C=["unexpected EOF","invalid block type","invalid length/literal","invalid distance","stream finished","no stream handler",,"no callback","invalid UTF-8 data","extra field too long","date not in range 1980-2099","filename too long","stream finishing","invalid zip data"],I=function(t,n,r){var i=Error(n||C[t]);if(i.code=t,Error.captureStackTrace&&Error.captureStackTrace(i,I),!r)throw i;return i},U=function(t,r,i,a){var u=t.length,f=a?a.length:0;if(!u||r.f&&!r.l)return i||new n(0);var c=!i,p=c||2!=r.i,v=r.i;c&&(i=new n(3*u));var d=function(t){var r=i.length;if(t>r){var e=new n(Math.max(2*r,t));e.set(i),i=e}},g=r.f||0,m=r.p||0,b=r.b||0,w=r.l,z=r.d,C=r.m,U=r.n,F=8*u;do{if(!w){g=S(t,m,1);var E=S(t,m+1,3);if(m+=3,!E){var Z=t[(Y=T(m)+4)-4]|t[Y-3]<<8,q=Y+Z;if(q>u){v&&I(0);break}p&&d(b+Z),i.set(t.subarray(Y,q),b),r.b=b+=Z,r.p=m=8*q,r.f=g;continue}if(1==E)w=x,z=k,C=9,U=5;else if(2==E){var O=S(t,m,31)+257,G=S(t,m+10,15)+4,L=O+S(t,m+5,31)+1;m+=14;for(var B=new n(L),H=new n(19),j=0;j<G;++j)H[s[j]]=S(t,m+3*j,7);m+=3*G;var N=M(H),P=(1<<N)-1,V=y(H,N,1);for(j=0;j<L;){var Y,J=V[S(t,m,P)];if(m+=15&J,(Y=J>>4)<16)B[j++]=Y;else{var K=0,Q=0;for(16==Y?(Q=3+S(t,m,3),m+=2,K=B[j-1]):17==Y?(Q=3+S(t,m,7),m+=3):18==Y&&(Q=11+S(t,m,127),m+=7);Q--;)B[j++]=K}}var R=B.subarray(0,O),W=B.subarray(O);C=M(R),U=M(W),w=y(R,C,1),z=y(W,U,1)}else I(1);if(m>F){v&&I(0);break}}p&&d(b+131072);for(var X=(1<<C)-1,$=(1<<U)-1,_=m;;_=m){var tt=(K=w[A(t,m)&X])>>4;if((m+=15&K)>F){v&&I(0);break}if(K||I(2),tt<256)i[b++]=tt;else{if(256==tt){_=m,w=null;break}var nt=tt-254;tt>264&&(nt=S(t,m,(1<<(et=e[j=tt-257]))-1)+h[j],m+=et);var rt=z[A(t,m)&$],it=rt>>4;if(rt||I(3),m+=15&rt,W=l[it],it>3){var et=o[it];W+=A(t,m)&(1<<et)-1,m+=et}if(m>F){v&&I(0);break}p&&d(b+131072);var ot=b+nt;if(b<W){var st=f-W,at=Math.min(W,ot);for(st+b<0&&I(3);b<at;++b)i[b]=a[st+b]}for(;b<ot;++b)i[b]=i[b-W]}}r.l=w,r.p=_,r.b=b,r.f=g,w&&(g=1,r.m=C,r.d=z,r.n=U)}while(!g);return b!=i.length&&c?D(i,0,b):i.subarray(0,b)},F=function(t,n,r){var i=n/8|0;t[i]|=r<<=7&n,t[i+1]|=r>>8},E=function(t,n,r){var i=n/8|0;t[i]|=r<<=7&n,t[i+1]|=r>>8,t[i+2]|=r>>16},Z=function(t,i){for(var e=[],o=0;o<t.length;++o)t[o]&&e.push({s:o,f:t[o]});var s=e.length,a=e.slice();if(!s)return{t:j,l:0};if(1==s){var u=new n(e[0].s+1);return u[e[0].s]=1,{t:u,l:1}}e.sort(function(t,n){return t.f-n.f}),e.push({s:-1,f:25001});var h=e[0],f=e[1],c=0,l=1,p=2;for(e[0]={s:-1,f:h.f+f.f,l:h,r:f};l!=s-1;)h=e[e[c].f<e[p].f?c++:p++],f=e[c!=l&&e[c].f<e[p].f?c++:p++],e[l++]={s:-1,f:h.f+f.f,l:h,r:f};var v=a[0].s;for(o=1;o<s;++o)a[o].s>v&&(v=a[o].s);var d=new r(v+1),g=q(e[l-1],d,0);if(g>i){o=0;var y=0,m=g-i,b=1<<m;for(a.sort(function(t,n){return d[n.s]-d[t.s]||t.f-n.f});o<s;++o){var w=a[o].s;if(!(d[w]>i))break;y+=b-(1<<g-d[w]),d[w]=i}for(y>>=m;y>0;){var x=a[o].s;d[x]<i?y-=1<<i-d[x]++-1:++o}for(;o>=0&&y;--o){var z=a[o].s;d[z]==i&&(--d[z],++y)}g=i}return{t:new n(d),l:g}},q=function(t,n,r){return-1==t.s?Math.max(q(t.l,n,r+1),q(t.r,n,r+1)):n[t.s]=r},O=function(t){for(var n=t.length;n&&!t[--n];);for(var i=new r(++n),e=0,o=t[0],s=1,a=function(t){i[e++]=t},u=1;u<=n;++u)if(t[u]==o&&u!=n)++s;else{if(!o&&s>2){for(;s>138;s-=138)a(32754);s>2&&(a(s>10?s-11<<5|28690:s-3<<5|12305),s=0)}else if(s>3){for(a(o),--s;s>6;s-=6)a(8304);s>2&&(a(s-3<<5|8208),s=0)}for(;s--;)a(o);s=1,o=t[u]}return{c:i.subarray(0,e),n:n}},G=function(t,n){for(var r=0,i=0;i<n.length;++i)r+=t[i]*n[i];return r},L=function(t,n,r){var i=r.length,e=T(n+2);t[e]=255&i,t[e+1]=i>>8,t[e+2]=255^t[e],t[e+3]=255^t[e+1];for(var o=0;o<i;++o)t[e+o+4]=r[o];return 8*(e+4+i)},B=function(t,n,i,a,u,h,f,c,l,p,v){F(n,v++,i),++u[256];for(var d=Z(u,15),g=d.t,x=d.l,k=Z(h,15),M=k.t,S=k.l,A=O(g),T=A.c,D=A.n,C=O(M),I=C.c,U=C.n,q=new r(19),B=0;B<T.length;++B)++q[31&T[B]];for(B=0;B<I.length;++B)++q[31&I[B]];for(var H=Z(q,7),j=H.t,N=H.l,P=19;P>4&&!j[s[P-1]];--P);var V,Y,J,K,Q=p+5<<3,R=G(u,m)+G(h,b)+f,W=G(u,g)+G(h,M)+f+14+3*P+G(q,j)+2*q[16]+3*q[17]+7*q[18];if(l>=0&&Q<=R&&Q<=W)return L(n,v,t.subarray(l,l+p));if(F(n,v,1+(W<R)),v+=2,W<R){V=y(g,x,0),Y=g,J=y(M,S,0),K=M;var X=y(j,N,0);for(F(n,v,D-257),F(n,v+5,U-1),F(n,v+10,P-4),v+=14,B=0;B<P;++B)F(n,v+3*B,j[s[B]]);v+=3*P;for(var $=[T,I],_=0;_<2;++_){var tt=$[_];for(B=0;B<tt.length;++B)F(n,v,X[rt=31&tt[B]]),v+=j[rt],rt>15&&(F(n,v,tt[B]>>5&127),v+=tt[B]>>12)}}else V=w,Y=m,J=z,K=b;for(B=0;B<c;++B){var nt=a[B];if(nt>255){var rt;E(n,v,V[257+(rt=nt>>18&31)]),v+=Y[rt+257],rt>7&&(F(n,v,nt>>23&31),v+=e[rt]);var it=31&nt;E(n,v,J[it]),v+=K[it],it>3&&(E(n,v,nt>>5&8191),v+=o[it])}else E(n,v,V[nt]),v+=Y[nt]}return E(n,v,V[256]),v+Y[256]},H=new i([65540,131080,131088,131104,262176,1048704,1048832,2114560,2117632]),j=new n(0),N=function(t,s,a,u,h,c){var l=c.z||t.length,v=new n(u+l+5*(1+Math.ceil(l/7e3))+h),d=v.subarray(u,v.length-h),g=c.l,y=7&(c.r||0);if(s){y&&(d[0]=c.r>>3);for(var m=H[s-1],b=m>>13,w=8191&m,x=(1<<a)-1,z=c.p||new r(32768),k=c.h||new r(x+1),M=Math.ceil(a/3),S=2*M,A=function(n){return(t[n]^t[n+1]<<M^t[n+2]<<S)&x},C=new i(25e3),I=new r(288),U=new r(32),F=0,E=0,Z=c.i||0,q=0,O=c.w||0,G=0;Z+2<l;++Z){var j=A(Z),N=32767&Z,P=k[j];if(z[N]=P,k[j]=N,O<=Z){var V=l-Z;if((F>7e3||q>24576)&&(V>423||!g)){y=B(t,d,0,C,I,U,E,q,G,Z-G,y),q=F=E=0,G=Z;for(var Y=0;Y<286;++Y)I[Y]=0;for(Y=0;Y<30;++Y)U[Y]=0}var J=2,K=0,Q=w,R=N-P&32767;if(V>2&&j==A(Z-R))for(var W=Math.min(b,V)-1,X=Math.min(32767,Z),$=Math.min(258,V);R<=X&&--Q&&N!=P;){if(t[Z+J]==t[Z+J-R]){for(var _=0;_<$&&t[Z+_]==t[Z+_-R];++_);if(_>J){if(J=_,K=R,_>W)break;var tt=Math.min(R,_-2),nt=0;for(Y=0;Y<tt;++Y){var rt=Z-R+Y&32767,it=rt-z[rt]&32767;it>nt&&(nt=it,P=rt)}}}R+=(N=P)-(P=z[N])&32767}if(K){C[q++]=268435456|f[J]<<18|p[K];var et=31&f[J],ot=31&p[K];E+=e[et]+o[ot],++I[257+et],++U[ot],O=Z+J,++F}else C[q++]=t[Z],++I[t[Z]]}}for(Z=Math.max(Z,O);Z<l;++Z)C[q++]=t[Z],++I[t[Z]];y=B(t,d,g,C,I,U,E,q,G,Z-G,y),g||(c.r=7&y|d[y/8|0]<<3,y-=7,c.h=k,c.p=z,c.i=Z,c.w=O)}else{for(Z=c.w||0;Z<l+g;Z+=65535){var st=Z+65535;st>=l&&(d[y/8|0]=g,st=l),y=L(d,y+1,t.subarray(Z,st))}c.i=l}return D(v,0,u+T(y)+h)},P=function(){for(var t=new Int32Array(256),n=0;n<256;++n){for(var r=n,i=9;--i;)r=(1&r&&-306674912)^r>>>1;t[n]=r}return t}(),V=function(){var t=-1;return{p:function(n){for(var r=t,i=0;i<n.length;++i)r=P[255&r^n[i]]^r>>>8;t=r},d:function(){return~t}}},Y=function(){var t=1,n=0;return{p:function(r){for(var i=t,e=n,o=0|r.length,s=0;s!=o;){for(var a=Math.min(s+2655,o);s<a;++s)e+=i+=r[s];i=(65535&i)+15*(i>>16),e=(65535&e)+15*(e>>16)}t=i,n=e},d:function(){return(255&(t%=65521))<<24|(65280&t)<<8|(255&(n%=65521))<<8|n>>8}}},J=function(t,r,i,e,o){if(!o&&(o={l:1},r.dictionary)){var s=r.dictionary.subarray(-32768),a=new n(s.length+t.length);a.set(s),a.set(t,s.length),t=a,o.w=s.length}return N(t,null==r.level?6:r.level,null==r.mem?o.l?Math.ceil(1.5*Math.max(8,Math.min(13,Math.log(t.length)))):20:12+r.mem,i,e,o)},K=function(t,n){var r={};for(var i in t)r[i]=t[i];for(var i in n)r[i]=n[i];return r},Q=function(t,n,r){for(var i=t(),e=""+t,o=e.slice(e.indexOf("[")+1,e.lastIndexOf("]")).replace(/\s+/g,"").split(","),s=0;s<i.length;++s){var a=i[s],u=o[s];if("function"==typeof a){n+=";"+u+"=";var h=""+a;if(a.prototype)if(-1!=h.indexOf("[native code]")){var f=h.indexOf(" ",8)+1;n+=h.slice(f,h.indexOf("(",f))}else for(var c in n+=h,a.prototype)n+=";"+u+".prototype."+c+"="+a.prototype[c];else n+=h}else r[u]=a}return n},R=[],W=function(t){var n=[];for(var r in t)t[r].buffer&&n.push((t[r]=new t[r].constructor(t[r])).buffer);return n},X=function(n,r,i,e){if(!R[i]){for(var o="",s={},a=n.length-1,u=0;u<a;++u)o=Q(n[u],o,s);R[i]={c:Q(n[a],o,s),e:s}}var h=K({},R[i].e);return(0,t.default)(R[i].c+";onmessage=function(e){for(var k in e.data)self[k]=e.data[k];onmessage="+r+"}",i,h,W(h),e)},$=function(){return[n,r,i,e,o,s,h,l,x,k,v,C,y,M,S,A,T,D,I,U,Tt,et,ot]},_=function(){return[n,r,i,e,o,s,f,p,w,m,z,b,v,H,j,y,F,E,Z,q,O,G,L,B,T,D,N,J,kt,et]},tt=function(){return[pt,gt,lt,V,P]},nt=function(){return[vt,dt]},rt=function(){return[yt,lt,Y]},it=function(){return[mt]},et=function(t){return postMessage(t,[t.buffer])},ot=function(t){return t&&{out:t.size&&new n(t.size),dictionary:t.dictionary}},st=function(t,n,r,i,e,o){var s=X(r,i,e,function(t,n){s.terminate(),o(t,n)});return s.postMessage([t,n],n.consume?[t.buffer]:[]),function(){s.terminate()}},at=function(t){return t.ondata=function(t,n){return postMessage([t,n],[t.buffer])},function(n){n.data[0]?(t.push(n.data[0],n.data[1]),postMessage([n.data[0].length])):t.flush(n.data[1])}},ut=function(t,n,r,i,e,o,s){var a,u=X(t,i,e,function(t,r){t?(u.terminate(),n.ondata.call(n,t)):Array.isArray(r)?1==r.length?(n.queuedSize-=r[0],n.ondrain&&n.ondrain(r[0])):(r[1]&&u.terminate(),n.ondata.call(n,t,r[0],r[1])):s(r)});u.postMessage(r),n.queuedSize=0,n.push=function(t,r){n.ondata||I(5),a&&n.ondata(I(4,0,1),null,!!r),n.queuedSize+=t.length,u.postMessage([t,a=r],t.buffer instanceof ArrayBuffer?[t.buffer]:[])},n.terminate=function(){u.terminate()},o&&(n.flush=function(t){u.postMessage([0,t])})},ht=function(t,n){return t[n]|t[n+1]<<8},ft=function(t,n){return(t[n]|t[n+1]<<8|t[n+2]<<16|t[n+3]<<24)>>>0},ct=function(t,n){return ft(t,n)+4294967296*ft(t,n+4)},lt=function(t,n,r){for(;r;++n)t[n]=r,r>>>=8},pt=function(t,n){var r=n.filename;if(t[0]=31,t[1]=139,t[2]=8,t[8]=n.level<2?4:9==n.level?2:0,t[9]=3,0!=n.mtime&&lt(t,4,Math.floor(new Date(n.mtime||Date.now())/1e3)),r){t[3]=8;for(var i=0;i<=r.length;++i)t[i+10]=r.charCodeAt(i)}},vt=function(t){31==t[0]&&139==t[1]&&8==t[2]||I(6,"invalid gzip data");var n=t[3],r=10;4&n&&(r+=2+(t[10]|t[11]<<8));for(var i=(n>>3&1)+(n>>4&1);i>0;i-=!t[r++]);return r+(2&n)},dt=function(t){var n=t.length;return(t[n-4]|t[n-3]<<8|t[n-2]<<16|t[n-1]<<24)>>>0},gt=function(t){return 10+(t.filename?t.filename.length+1:0)},yt=function(t,n){var r=n.level,i=0==r?0:r<6?1:9==r?3:2;if(t[0]=120,t[1]=i<<6|(n.dictionary&&32),t[1]|=31-(t[0]<<8|t[1])%31,n.dictionary){var e=Y();e.p(n.dictionary),lt(t,2,e.d())}},mt=function(t,n){return(8!=(15&t[0])||t[0]>>4>7||(t[0]<<8|t[1])%31)&&I(6,"invalid zlib data"),(t[1]>>5&1)==+!n&&I(6,"invalid zlib data: "+(32&t[1]?"need":"unexpected")+" dictionary"),2+(t[1]>>3&4)};function bt(t,n){return"function"==typeof t&&(n=t,t={}),this.ondata=n,t}var wt=function(){function t(t,r){if("function"==typeof t&&(r=t,t={}),this.ondata=r,this.o=t||{},this.s={l:0,i:32768,w:32768,z:32768},this.b=new n(98304),this.o.dictionary){var i=this.o.dictionary.subarray(-32768);this.b.set(i,32768-i.length),this.s.i=32768-i.length}}return t.prototype.p=function(t,n){this.ondata(J(t,this.o,0,0,this.s),n)},t.prototype.push=function(t,r){this.ondata||I(5),this.s.l&&I(4);var i=t.length+this.s.z;if(i>this.b.length){if(i>2*this.b.length-32768){var e=new n(-32768&i);e.set(this.b.subarray(0,this.s.z)),this.b=e}var o=this.b.length-this.s.z;this.b.set(t.subarray(0,o),this.s.z),this.s.z=this.b.length,this.p(this.b,!1),this.b.set(this.b.subarray(-32768)),this.b.set(t.subarray(o),32768),this.s.z=t.length-o+32768,this.s.i=32766,this.s.w=32768}else this.b.set(t,this.s.z),this.s.z+=t.length;this.s.l=1&r,(this.s.z>this.s.w+8191||r)&&(this.p(this.b,r||!1),this.s.w=this.s.i,this.s.i-=2),r&&(this.s=this.o={},this.b=j)},t.prototype.flush=function(t){if(this.ondata||I(5),this.s.l&&I(4),this.p(this.b,!1),this.s.w=this.s.i,this.s.i-=2,t){var r=new n(6);r[0]=this.s.r>>3;var i=L(r,this.s.r,j);this.s.r=0,this.ondata(r.subarray(0,i>>3),!1)}},t}();_e.Deflate=wt;var xt=function(){return function(t,n){ut([_,function(){return[at,wt]}],this,bt.call(this,t,n),function(t){var n=new wt(t.data);onmessage=at(n)},6,1)}}();function zt(t,n,r){return r||(r=n,n={}),"function"!=typeof r&&I(7),st(t,n,[_],function(t){return et(kt(t.data[0],t.data[1]))},0,r)}function kt(t,n){return J(t,n||{},0,0)}_e.AsyncDeflate=xt;var Mt=function(){function t(t,r){"function"==typeof t&&(r=t,t={}),this.ondata=r;var i=t&&t.dictionary&&t.dictionary.subarray(-32768);this.s={i:0,b:i?i.length:0},this.o=new n(32768),this.p=new n(0),i&&this.o.set(i)}return t.prototype.e=function(t){if(this.ondata||I(5),this.d&&I(4),this.p.length){if(t.length){var r=new n(this.p.length+t.length);r.set(this.p),r.set(t,this.p.length),this.p=r}}else this.p=t},t.prototype.c=function(t){this.s.i=+(this.d=t||!1);var n=this.s.b,r=U(this.p,this.s,this.o);this.ondata(D(r,n,this.s.b),this.d),this.o=D(r,this.s.b-32768),this.s.b=this.o.length,this.p=D(this.p,this.s.p/8|0),this.s.p&=7},t.prototype.push=function(t,n){this.e(t),this.c(n)},t}();_e.Inflate=Mt;var St=function(){return function(t,n){ut([$,function(){return[at,Mt]}],this,bt.call(this,t,n),function(t){var n=new Mt(t.data);onmessage=at(n)},7,0)}}();function At(t,n,r){return r||(r=n,n={}),"function"!=typeof r&&I(7),st(t,n,[$],function(t){return et(Tt(t.data[0],ot(t.data[1])))},1,r)}function Tt(t,n){return U(t,{i:2},n&&n.out,n&&n.dictionary)}_e.AsyncInflate=St;var Dt=function(){function t(t,n){this.c=V(),this.l=0,this.v=1,wt.call(this,t,n)}return t.prototype.push=function(t,n){this.c.p(t),this.l+=t.length,wt.prototype.push.call(this,t,n)},t.prototype.p=function(t,n){var r=J(t,this.o,this.v&&gt(this.o),n&&8,this.s);this.v&&(pt(r,this.o),this.v=0),n&&(lt(r,r.length-8,this.c.d()),lt(r,r.length-4,this.l)),this.ondata(r,n)},t.prototype.flush=function(t){wt.prototype.flush.call(this,t)},t}();_e.Gzip=Dt,_e.Compress=Dt;var Ct=function(){return function(t,n){ut([_,tt,function(){return[at,wt,Dt]}],this,bt.call(this,t,n),function(t){var n=new Dt(t.data);onmessage=at(n)},8,1)}}();function It(t,n,r){return r||(r=n,n={}),"function"!=typeof r&&I(7),st(t,n,[_,tt,function(){return[Ut]}],function(t){return et(Ut(t.data[0],t.data[1]))},2,r)}function Ut(t,n){n||(n={});var r=V(),i=t.length;r.p(t);var e=J(t,n,gt(n),8),o=e.length;return pt(e,n),lt(e,o-8,r.d()),lt(e,o-4,i),e}_e.AsyncGzip=Ct,_e.AsyncCompress=Ct;var Ft=function(){function t(t,n){this.v=1,this.r=0,Mt.call(this,t,n)}return t.prototype.push=function(t,r){if(Mt.prototype.e.call(this,t),this.r+=t.length,this.v){var i=this.p.subarray(this.v-1),e=i.length>3?vt(i):4;if(e>i.length){if(!r)return}else this.v>1&&this.onmember&&this.onmember(this.r-i.length);this.p=i.subarray(e),this.v=0}Mt.prototype.c.call(this,0),this.s.f&&!this.s.l?(this.v=T(this.s.p)+9,this.s={i:0},this.o=new n(0),this.push(new n(0),r)):r&&Mt.prototype.c.call(this,r)},t}();_e.Gunzip=Ft;var Et=function(){return function(t,n){var r=this;ut([$,nt,function(){return[at,Mt,Ft]}],this,bt.call(this,t,n),function(t){var n=new Ft(t.data);n.onmember=function(t){return postMessage(t)},onmessage=at(n)},9,0,function(t){return r.onmember&&r.onmember(t)})}}();function Zt(t,n,r){return r||(r=n,n={}),"function"!=typeof r&&I(7),st(t,n,[$,nt,function(){return[qt]}],function(t){return et(qt(t.data[0],t.data[1]))},3,r)}function qt(t,r){var i=vt(t);return i+8>t.length&&I(6,"invalid gzip data"),U(t.subarray(i,-8),{i:2},r&&r.out||new n(dt(t)),r&&r.dictionary)}_e.AsyncGunzip=Et;var Ot=function(){function t(t,n){this.c=Y(),this.v=1,wt.call(this,t,n)}return t.prototype.push=function(t,n){this.c.p(t),wt.prototype.push.call(this,t,n)},t.prototype.p=function(t,n){var r=J(t,this.o,this.v&&(this.o.dictionary?6:2),n&&4,this.s);this.v&&(yt(r,this.o),this.v=0),n&&lt(r,r.length-4,this.c.d()),this.ondata(r,n)},t.prototype.flush=function(t){wt.prototype.flush.call(this,t)},t}();_e.Zlib=Ot;var Gt=function(){return function(t,n){ut([_,rt,function(){return[at,wt,Ot]}],this,bt.call(this,t,n),function(t){var n=new Ot(t.data);onmessage=at(n)},10,1)}}();function Lt(t,n,r){return r||(r=n,n={}),"function"!=typeof r&&I(7),st(t,n,[_,rt,function(){return[Bt]}],function(t){return et(Bt(t.data[0],t.data[1]))},4,r)}function Bt(t,n){n||(n={});var r=Y();r.p(t);var i=J(t,n,n.dictionary?6:2,4);return yt(i,n),lt(i,i.length-4,r.d()),i}_e.AsyncZlib=Gt;var Ht=function(){function t(t,n){Mt.call(this,t,n),this.v=t&&t.dictionary?2:1}return t.prototype.push=function(t,n){if(Mt.prototype.e.call(this,t),this.v){if(this.p.length<6&&!n)return;this.p=this.p.subarray(mt(this.p,this.v-1)),this.v=0}n&&(this.p.length<4&&I(6,"invalid zlib data"),this.p=this.p.subarray(0,-4)),Mt.prototype.c.call(this,n)},t}();_e.Unzlib=Ht;var jt=function(){return function(t,n){ut([$,it,function(){return[at,Mt,Ht]}],this,bt.call(this,t,n),function(t){var n=new Ht(t.data);onmessage=at(n)},11,0)}}();function Nt(t,n,r){return r||(r=n,n={}),"function"!=typeof r&&I(7),st(t,n,[$,it,function(){return[Pt]}],function(t){return et(Pt(t.data[0],ot(t.data[1])))},5,r)}function Pt(t,n){return U(t.subarray(mt(t,n&&n.dictionary),-4),{i:2},n&&n.out,n&&n.dictionary)}_e.AsyncUnzlib=jt;var Vt=function(){function t(t,n){this.o=bt.call(this,t,n)||{},this.G=Ft,this.I=Mt,this.Z=Ht}return t.prototype.i=function(){var t=this;this.s.ondata=function(n,r){t.ondata(n,r)}},t.prototype.push=function(t,r){if(this.ondata||I(5),this.s)this.s.push(t,r);else{if(this.p&&this.p.length){var i=new n(this.p.length+t.length);i.set(this.p),i.set(t,this.p.length)}else this.p=t;this.p.length>2&&(this.s=31==this.p[0]&&139==this.p[1]&&8==this.p[2]?new this.G(this.o):8!=(15&this.p[0])||this.p[0]>>4>7||(this.p[0]<<8|this.p[1])%31?new this.I(this.o):new this.Z(this.o),this.i(),this.s.push(this.p,r),this.p=null)}},t}();_e.Decompress=Vt;var Yt=function(){function t(t,n){Vt.call(this,t,n),this.queuedSize=0,this.G=Et,this.I=St,this.Z=jt}return t.prototype.i=function(){var t=this;this.s.ondata=function(n,r,i){t.ondata(n,r,i)},this.s.ondrain=function(n){t.queuedSize-=n,t.ondrain&&t.ondrain(n)}},t.prototype.push=function(t,n){this.queuedSize+=t.length,Vt.prototype.push.call(this,t,n)},t}();function Jt(t,n,r){return r||(r=n,n={}),"function"!=typeof r&&I(7),31==t[0]&&139==t[1]&&8==t[2]?Zt(t,n,r):8!=(15&t[0])||t[0]>>4>7||(t[0]<<8|t[1])%31?At(t,n,r):Nt(t,n,r)}function Kt(t,n){return 31==t[0]&&139==t[1]&&8==t[2]?qt(t,n):8!=(15&t[0])||t[0]>>4>7||(t[0]<<8|t[1])%31?Tt(t,n):Pt(t,n)}_e.AsyncDecompress=Yt;var Qt=function(t,r,i,e){for(var o in t){var s=t[o],a=r+o,u=e;Array.isArray(s)&&(u=K(e,s[1]),s=s[0]),ArrayBuffer.isView(s)?i[a]=[s,u]:(i[a+="/"]=[new n(0),u],Qt(s,a,i,e))}},Rt="undefined"!=typeof TextEncoder&&new TextEncoder,Wt="undefined"!=typeof TextDecoder&&new TextDecoder,Xt=0;try{Wt.decode(j,{stream:!0}),Xt=1}catch(t){}var $t=function(t){for(var n="",r=0;;){var i=t[r++],e=(i>127)+(i>223)+(i>239);if(r+e>t.length)return{s:n,r:D(t,r-1)};e?3==e?(i=((15&i)<<18|(63&t[r++])<<12|(63&t[r++])<<6|63&t[r++])-65536,n+=String.fromCharCode(55296|i>>10,56320|1023&i)):n+=String.fromCharCode(1&e?(31&i)<<6|63&t[r++]:(15&i)<<12|(63&t[r++])<<6|63&t[r++]):n+=String.fromCharCode(i)}},_t=function(){function t(t){this.ondata=t,Xt?this.t=new TextDecoder:this.p=j}return t.prototype.push=function(t,r){if(this.ondata||I(5),r=!!r,this.t)return this.ondata(this.t.decode(t,{stream:!0}),r),void(r&&(this.t.decode().length&&I(8),this.t=null));this.p||I(4);var i=new n(this.p.length+t.length);i.set(this.p),i.set(t,this.p.length);var e=$t(i),o=e.s,s=e.r;r?(s.length&&I(8),this.p=null):this.p=s,this.ondata(o,r)},t}();_e.DecodeUTF8=_t;var tn=function(){function t(t){this.ondata=t}return t.prototype.push=function(t,n){this.ondata||I(5),this.d&&I(4),this.ondata(nn(t),this.d=n||!1)},t}();function nn(t,r){if(r){for(var i=new n(t.length),e=0;e<t.length;++e)i[e]=t.charCodeAt(e);return i}if(Rt)return Rt.encode(t);var o=t.length,s=new n(t.length+(t.length>>1)),a=0,u=function(t){s[a++]=t};for(e=0;e<o;++e){if(a+5>s.length){var h=new n(a+8+(o-e<<1));h.set(s),s=h}var f=t.charCodeAt(e);f<128||r?u(f):f<2048?(u(192|f>>6),u(128|63&f)):f>55295&&f<57344?(u(240|(f=65536+(1047552&f)|1023&t.charCodeAt(++e))>>18),u(128|f>>12&63),u(128|f>>6&63),u(128|63&f)):(u(224|f>>12),u(128|f>>6&63),u(128|63&f))}return D(s,0,a)}function rn(t,n){if(n){for(var r="",i=0;i<t.length;i+=16384)r+=String.fromCharCode.apply(null,t.subarray(i,i+16384));return r}if(Wt)return Wt.decode(t);var e=$t(t),o=e.s;return(r=e.r).length&&I(8),o}_e.EncodeUTF8=tn;var en=function(t){return 1==t?3:t<6?2:9==t?1:0},on=function(t,n){return n+30+ht(t,n+26)+ht(t,n+28)},sn=function(t,n,r){var i=ht(t,n+28),e=ht(t,n+30),o=rn(t.subarray(n+46,n+46+i),!(2048&ht(t,n+8))),s=n+46+i,a=an(t,s,e,r,ft(t,n+20),ft(t,n+24),ft(t,n+42)),u=a[0],h=a[1],f=a[2];return[ht(t,n+10),u,h,o,s+e+ht(t,n+32),f]},an=function(t,n,r,i,e,o,s){var a=4294967295==e,u=4294967295==o,h=4294967295==s,f=n+r;if(i&&a+u+h){for(;n+4<f;n+=4+ht(t,n+2))if(1==ht(t,n))return[a?ct(t,n+4+8*u):e,u?ct(t,n+4):o,h?ct(t,n+4+8*(u+a)):s,1];i<2&&I(13)}return[e,o,s,0]},un=function(t){var n=0;if(t)for(var r in t){var i=t[r].length;i>65535&&I(9),n+=i+4}return n},hn=function(t,n,r,i,e,o,s,a){var u=i.length,h=r.extra,f=a&&a.length,c=un(h);lt(t,n,null!=s?33639248:67324752),n+=4,null!=s&&(t[n++]=20,t[n++]=r.os),t[n]=20,n+=2,t[n++]=r.flag<<1|(o<0&&8),t[n++]=e&&8,t[n++]=255&r.compression,t[n++]=r.compression>>8;var l=new Date(null==r.mtime?Date.now():r.mtime),p=l.getFullYear()-1980;if((p<0||p>119)&&I(10),lt(t,n,p<<25|l.getMonth()+1<<21|l.getDate()<<16|l.getHours()<<11|l.getMinutes()<<5|l.getSeconds()>>1),n+=4,-1!=o&&(lt(t,n,r.crc),lt(t,n+4,o<0?-o-2:o),lt(t,n+8,r.size)),lt(t,n+12,u),lt(t,n+14,c),n+=16,null!=s&&(lt(t,n,f),lt(t,n+6,r.attrs),lt(t,n+10,s),n+=14),t.set(i,n),n+=u,c)for(var v in h){var d=h[v],g=d.length;lt(t,n,+v),lt(t,n+2,g),t.set(d,n+4),n+=4+g}return f&&(t.set(a,n),n+=f),n},fn=function(t,n,r,i,e){lt(t,n,101010256),lt(t,n+8,r),lt(t,n+10,r),lt(t,n+12,i),lt(t,n+16,e)},cn=function(){function t(t){this.filename=t,this.c=V(),this.size=0,this.compression=0}return t.prototype.process=function(t,n){this.ondata(null,t,n)},t.prototype.push=function(t,n){this.ondata||I(5),this.c.p(t),this.size+=t.length,n&&(this.crc=this.c.d()),this.process(t,n||!1)},t}();_e.ZipPassThrough=cn;var ln=function(){function t(t,n){var r=this;n||(n={}),cn.call(this,t),this.d=new wt(n,function(t,n){r.ondata(null,t,n)}),this.compression=8,this.flag=en(n.level)}return t.prototype.process=function(t,n){try{this.d.push(t,n)}catch(t){this.ondata(t,null,n)}},t.prototype.push=function(t,n){cn.prototype.push.call(this,t,n)},t}();_e.ZipDeflate=ln;var pn=function(){function t(t,n){var r=this;n||(n={}),cn.call(this,t),this.d=new xt(n,function(t,n,i){r.ondata(t,n,i)}),this.compression=8,this.flag=en(n.level),this.terminate=this.d.terminate}return t.prototype.process=function(t,n){this.d.push(t,n)},t.prototype.push=function(t,n){cn.prototype.push.call(this,t,n)},t}();_e.AsyncZipDeflate=pn;var vn=function(){function t(t){this.ondata=t,this.u=[],this.d=1}return t.prototype.add=function(t){var r=this;if(this.ondata||I(5),2&this.d)this.ondata(I(4+8*(1&this.d),0,1),null,!1);else{var i=nn(t.filename),e=i.length,o=t.comment,s=o&&nn(o),a=e!=t.filename.length||s&&o.length!=s.length,u=e+un(t.extra)+30;e>65535&&this.ondata(I(11,0,1),null,!1);var h=new n(u);hn(h,0,t,i,a,-1);var f=[h],c=function(){for(var t=0,n=f;t<n.length;t++)r.ondata(null,n[t],!1);f=[]},l=this.d;this.d=0;var p=this.u.length,v=K(t,{f:i,u:a,o:s,t:function(){t.terminate&&t.terminate()},r:function(){if(c(),l){var t=r.u[p+1];t?t.r():r.d=1}l=1}}),d=0;t.ondata=function(i,e,o){if(i)r.ondata(i,e,o),r.terminate();else if(d+=e.length,f.push(e),o){var s=new n(16);lt(s,0,134695760),lt(s,4,t.crc),lt(s,8,d),lt(s,12,t.size),f.push(s),v.c=d,v.b=u+d+16,v.crc=t.crc,v.size=t.size,l&&v.r(),l=1}else l&&c()},this.u.push(v)}},t.prototype.end=function(){var t=this;2&this.d?this.ondata(I(4+8*(1&this.d),0,1),null,!0):(this.d?this.e():this.u.push({r:function(){1&t.d&&(t.u.splice(-1,1),t.e())},t:function(){}}),this.d=3)},t.prototype.e=function(){for(var t=0,r=0,i=0,e=0,o=this.u;e<o.length;e++)i+=46+(h=o[e]).f.length+un(h.extra)+(h.o?h.o.length:0);for(var s=new n(i+22),a=0,u=this.u;a<u.length;a++){var h;hn(s,t,h=u[a],h.f,h.u,-h.c-2,r,h.o),t+=46+h.f.length+un(h.extra)+(h.o?h.o.length:0),r+=h.b}fn(s,t,this.u.length,i,r),this.ondata(null,s,!0),this.d=2},t.prototype.terminate=function(){for(var t=0,n=this.u;t<n.length;t++)n[t].t();this.d=2},t}();function dn(t,r,i){i||(i=r,r={}),"function"!=typeof i&&I(7);var e={};Qt(t,"",e,r);var o=Object.keys(e),s=o.length,a=0,u=0,h=s,f=Array(s),c=[],l=function(){for(var t=0;t<c.length;++t)c[t]()},p=function(t,n){xn(function(){i(t,n)})};xn(function(){p=i});var v=function(){var t=new n(u+22),r=a,i=u-a;u=0;for(var e=0;e<h;++e){var o=f[e];try{var s=o.c.length;hn(t,u,o,o.f,o.u,s);var c=30+o.f.length+un(o.extra),l=u+c;t.set(o.c,l),hn(t,a,o,o.f,o.u,s,u,o.m),a+=16+c+(o.m?o.m.length:0),u=l+s}catch(t){return p(t,null)}}fn(t,a,f.length,i,r),p(null,t)};s||v();for(var d=function(t){var n=o[t],r=e[n],i=r[0],h=r[1],d=V(),g=i.length;d.p(i);var y=nn(n),m=y.length,b=h.comment,w=b&&nn(b),x=w&&w.length,z=un(h.extra),k=0==h.level?0:8,M=function(r,i){if(r)l(),p(r,null);else{var e=i.length;f[t]=K(h,{size:g,crc:d.d(),c:i,f:y,m:w,u:m!=n.length||w&&b.length!=x,compression:k}),a+=30+m+z+e,u+=76+2*(m+z)+(x||0)+e,--s||v()}};if(m>65535&&M(I(11,0,1),null),k)if(g<16e4)try{M(null,kt(i,h))}catch(t){M(t,null)}else c.push(zt(i,h,M));else M(null,i)},g=0;g<h;++g)d(g);return l}function gn(t,r){r||(r={});var i={},e=[];Qt(t,"",i,r);var o=0,s=0;for(var a in i){var u=i[a],h=u[0],f=u[1],c=0==f.level?0:8,l=(M=nn(a)).length,p=f.comment,v=p&&nn(p),d=v&&v.length,g=un(f.extra);l>65535&&I(11);var y=c?kt(h,f):h,m=y.length,b=V();b.p(h),e.push(K(f,{size:h.length,crc:b.d(),c:y,f:M,m:v,u:l!=a.length||v&&p.length!=d,o:o,compression:c})),o+=30+l+g+m,s+=76+2*(l+g)+(d||0)+m}for(var w=new n(s+22),x=o,z=s-o,k=0;k<e.length;++k){var M;hn(w,(M=e[k]).o,M,M.f,M.u,M.c.length);var S=30+M.f.length+un(M.extra);w.set(M.c,M.o+S),hn(w,o,M,M.f,M.u,M.c.length,M.o,M.m),o+=16+S+(M.m?M.m.length:0)}return fn(w,o,e.length,z,x),w}_e.Zip=vn;var yn=function(){function t(){}return t.prototype.push=function(t,n){this.ondata(null,t,n)},t.compression=0,t}();_e.UnzipPassThrough=yn;var mn=function(){function t(){var t=this;this.i=new Mt(function(n,r){t.ondata(null,n,r)})}return t.prototype.push=function(t,n){try{this.i.push(t,n)}catch(t){this.ondata(t,null,n)}},t.compression=8,t}();_e.UnzipInflate=mn;var bn=function(){function t(t,n){var r=this;n<32e4?this.i=new Mt(function(t,n){r.ondata(null,t,n)}):(this.i=new St(function(t,n,i){r.ondata(t,n,i)}),this.terminate=this.i.terminate)}return t.prototype.push=function(t,n){this.i.terminate&&(t=D(t,0)),this.i.push(t,n)},t.compression=8,t}();_e.AsyncUnzipInflate=bn;var wn=function(){function t(t){this.onfile=t,this.k=[],this.o={0:yn},this.p=j}return t.prototype.push=function(t,r){var i=this;if(this.onfile||I(5),this.p||I(4),this.c>0){var e=Math.min(this.c,t.length),o=t.subarray(0,e);if(this.c-=e,this.d?this.d.push(o,!this.c):this.k[0].push(o),(t=t.subarray(e)).length)return this.push(t,r)}else{var s=0,a=0,u=void 0,h=void 0;this.p.length?t.length?((h=new n(this.p.length+t.length)).set(this.p),h.set(t,this.p.length)):h=this.p:h=t;for(var f=h.length,c=this.c,l=c&&this.d,p=function(){var t=ft(h,a);if(67324752==t){s=1,u=a,v.d=null,v.c=0;var n=ht(h,a+6),r=ht(h,a+8),e=2048&n,o=8&n,l=ht(h,a+26),p=ht(h,a+28);if(f>a+30+l+p){var d=[];v.k.unshift(d),s=2;var g,y=ft(h,a+18),m=ft(h,a+22),b=rn(h.subarray(a+30,a+=30+l),!e),w=an(h,a,p,2,y,m,0),x=w[0],z=w[1];o&&(x=-1-w[3]),a+=p,v.c=x;var k={name:b,compression:r,start:function(){if(k.ondata||I(5),x){var t=i.o[r];t||k.ondata(I(14,"unknown compression type "+r,1),null,!1),(g=x<0?new t(b):new t(b,x,z)).ondata=function(t,n,r){k.ondata(t,n,r)};for(var n=0,e=d;n<e.length;n++)g.push(e[n],!1);i.k[0]==d&&i.c?i.d=g:g.push(j,!0)}else k.ondata(null,j,!0)},terminate:function(){g&&g.terminate&&g.terminate()}};x>=0&&(k.size=x,k.originalSize=z),v.onfile(k)}return"break"}if(c){if(134695760==t)return u=a+=12+(-2==c&&8),s=3,v.c=0,"break";if(33639248==t)return u=a-=4,s=3,v.c=0,"break"}},v=this;a<f-4&&"break"!==p();++a);if(this.p=j,c<0){var d=h.subarray(0,s?u-12-(-2==c&&8)-(134695760==ft(h,u-16)&&4):a);l?l.push(d,!!s):this.k[+(2==s)].push(d)}if(2&s)return this.push(h.subarray(a),r);this.p=h.subarray(a)}r&&(this.c&&I(13),this.p=null)},t.prototype.register=function(t){this.o[t.compression]=t},t}();_e.Unzip=wn;var xn="function"==typeof queueMicrotask?queueMicrotask:"function"==typeof setTimeout?setTimeout:function(t){t()};function zn(t,r,i){i||(i=r,r={}),"function"!=typeof i&&I(7);var e=[],o=function(){for(var t=0;t<e.length;++t)e[t]()},s={},a=function(t,n){xn(function(){i(t,n)})};xn(function(){a=i});for(var u=t.length-22;101010256!=ft(t,u);--u)if(!u||t.length-u>65558)return a(I(13,0,1),null),o;var h=ht(t,u+8);if(h){var f=h,c=ft(t,u+16),l=117853008==ft(t,u-20);if(l){var p=ft(t,u-12);(l=101075792==ft(t,p))&&(f=h=ft(t,p+32),c=ft(t,p+48))}for(var v=r&&r.filter,d=function(r){var i=sn(t,c,l),u=i[0],f=i[1],p=i[2],d=i[3],g=i[4],y=on(t,i[5]);c=g;var m=function(t,n){t?(o(),a(t,null)):(n&&(s[d]=n),--h||a(null,s))};if(!v||v({name:d,size:f,originalSize:p,compression:u}))if(u)if(8==u){var b=t.subarray(y,y+f);if(p<524288||f>.8*p)try{m(null,Tt(b,{out:new n(p)}))}catch(t){m(t,null)}else e.push(At(b,{size:p},m))}else m(I(14,"unknown compression type "+u,1),null);else m(null,D(t,y,y+f));else m(null,null)},g=0;g<f;++g)d()}else a(null,{});return o}function kn(t,r){for(var i={},e=t.length-22;101010256!=ft(t,e);--e)(!e||t.length-e>65558)&&I(13);var o=ht(t,e+8);if(!o)return{};var s=ft(t,e+16),a=117853008==ft(t,e-20);if(a){var u=ft(t,e-12);(a=101075792==ft(t,u))&&(o=ft(t,u+32),s=ft(t,u+48))}for(var h=r&&r.filter,f=0;f<o;++f){var c=sn(t,s,a),l=c[0],p=c[1],v=c[2],d=c[3],g=c[4],y=on(t,c[5]);s=g,h&&!h({name:d,size:p,originalSize:v,compression:l})||(l?8==l?i[d]=Tt(t.subarray(y,y+p),{out:new n(v)}):I(14,"unknown compression type "+l):i[d]=D(t,y,y+p))}return i}return _e});;
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

/* Opt-in observer. Reads completed steps, never plans routes or repairs state.
   build-view embeds this source; it is not a separately served public file. */
(function(root,factory){
  if(typeof module==='object'&&module.exports)module.exports=factory();
  else root.LivingDiagnostics=factory();
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const copy=value=>structuredClone(value);

  // Iterative strongly connected components: no recursion limit at large N.
  function cyclesOf(ids,edges){
    const forward=new Map(ids.map(id=>[id,[]])),reverse=new Map(ids.map(id=>[id,[]]));
    for(const e of edges)if(forward.has(e.from)&&forward.has(e.to)){
      forward.get(e.from).push(e.to);reverse.get(e.to).push(e.from);
    }
    const seen=new Set(),order=[];
    for(const id of ids){
      if(seen.has(id))continue;
      const stack=[[id,false]];
      while(stack.length){const [n,exit]=stack.pop();if(exit){order.push(n);continue;}if(seen.has(n))continue;
        seen.add(n);stack.push([n,true]);for(const to of forward.get(n))if(!seen.has(to))stack.push([to,false]);}
    }
    seen.clear();const result=[];
    for(const id of order.reverse()){
      if(seen.has(id))continue;
      const group=[],stack=[id];seen.add(id);
      while(stack.length){const n=stack.pop();group.push(n);for(const to of reverse.get(n))if(!seen.has(to)){seen.add(to);stack.push(to);}}
      if(group.length>1||forward.get(id).includes(id))result.push(group.sort((a,b)=>a-b));
    }
    return result;
  }

  class Observer{
    constructor(options={}){
      this.config={sampleTicks:30,cycleSeconds:20,workSeconds:60,referenceSeconds:1,checkpointSeconds:30,maxIncidents:4,maxSamples:120,maxOperations:256,...options.config};
      for(const [key,value]of Object.entries(this.config))if(!Number.isFinite(value)||value<=0||(/^(sampleTicks|max)/.test(key)&&!Number.isInteger(value)))throw Error('診断設定が正しくありません: '+key);
      this.metadata=copy(options.metadata||{});this.incidents=[];this.samples=[];this.checkpoints=[];
      this.history=new Map();this.conditions=new Map();this.restores=[];this.sequence=0;this.lastTick=-Infinity;this.droppedIncidents=0;
    }
    snapshot(sim){
      try{return {state:copy(sim.dump())};}
      catch(error){return {captureError:String(error.message||error)};}
    }
    checkpoint(sim){
      this.checkpoints.push({tick:sim.ticks,time:sim.time,sequence:this.sequence,...this.snapshot(sim),operations:[]});
      if(this.checkpoints.length>2)this.checkpoints.shift();
    }
    operation(op){
      const sim=this.sim;if(!sim)return;
      // If the bounded action buffer fills, start from a new complete state.
      if(this.checkpoints.some(c=>c.operations.length>=this.config.maxOperations)){
        this.checkpoints=this.checkpoints.filter(c=>c.operations.length<this.config.maxOperations);this.checkpoint(sim);
      }
      this.sequence++;
      for(const c of this.checkpoints){const last=c.operations.at(-1);
        if(op.type==='step'&&last?.type==='step'&&last.dt===op.dt){last.count++;last.lastSequence=this.sequence;}
        else c.operations.push({...copy(op),tick:sim.ticks,sequence:this.sequence,lastSequence:this.sequence});
      }
    }
    recordSetting(path,value){
      if(!['colony.laying','progress.speed','priority','hardDig'].includes(path))throw Error('記録対象外の設定です');
      this.operation({type:'setting',path,value:copy(value)});
    }
    attach(sim){
      if(this.sim)throw Error('診断はすでに開始しています');
      this.sim=sim;this.checkpoint(sim);this.observe(sim,true);
      const wrap=(name,around)=>{const own=Object.getOwnPropertyDescriptor(sim,name),original=sim[name],observer=this;
        if(typeof original!=='function')return;
        const wrapper=function(...args){return around.call(observer,original,this,args);};
        Object.defineProperty(sim,name,{value:wrapper,writable:true,configurable:true});
        this.restores.push(()=>{if(sim[name]===wrapper){if(own)Object.defineProperty(sim,name,own);else delete sim[name];}});
      };
      wrap('step',function(original,receiver,args){
        this.operation({type:'step',dt:args[0]??1/60,count:1});
        let result;try{result=original.apply(receiver,args);}catch(error){this.capture(receiver,'simulation-error',[],receiver.time,{error:String(error.message||error)});throw error;}
        this.observe(receiver);return result;
      });
      for(const method of ['tap','shiftRole','buyResearch','alarmAt'])wrap(method,function(original,receiver,args){
        this.operation({type:'call',method,args:copy(args)});return original.apply(receiver,args);
      });
      return this;
    }
    detach(){for(const restore of this.restores.reverse())restore();this.restores=[];this.sim=null;return this.export();}
    capture(sim,type,ids,since,detail={}){
      const before=this.checkpoints.findLast(c=>c.time<=since)||this.checkpoints[0];
      const incident={type,tick:sim.ticks,time:sim.time,since,ids:[...ids],...copy(detail),checkpoint:copy(before),current:this.snapshot(sim)};
      this.incidents.push(incident);if(this.incidents.length>this.config.maxIncidents){this.incidents.shift();this.droppedIncidents++;}
    }
    condition(sim,key,type,ids,seconds,detail){
      const previous=this.conditions.get(key)||{since:sim.time,emitted:false};
      this.conditions.set(key,previous);this.liveConditions.add(key);
      // A condition must persist; a transient wait or a single completed-step
      // invalid reference is evidence to watch, not an immediate stall claim.
      if(!previous.emitted&&sim.time-previous.since+1e-8>=seconds){
        this.capture(sim,type,ids,previous.since,detail);previous.emitted=true;
      }
    }
    observe(sim,force=false){
      if(!force&&sim.ticks-this.lastTick<this.config.sampleTicks)return;
      if(sim.ticks<this.lastTick)throw Error('別時点の巣へ同じ診断を持ち越せません');
      this.lastTick=sim.ticks;this.liveConditions=new Set();
      const actors=[...sim.ants,...(sim.colony.raid?.enemies||[])],byId=new Map(actors.map(a=>[a.id,a])),jobs=new Map(sim.jobs.map(j=>[j.id,j])),bodies=sim.physics.byId,broodIds=new Set(sim.colony.brood.map(e=>e.id));
      const carried=new Map();for(const b of sim.physics.bodies)if(b.carrier){if(!carried.has(b.carrier))carried.set(b.carrier,[]);carried.get(b.carrier).push(b.id);}
      const edges=[],rows=[],pending=[];
      for(const a of actors){
        const job=jobs.get(a.job),task=a.itemTask,hasPath=a.next<a.path.length;
        const signature=JSON.stringify([a.job,job?.phase,job?.cursor,job?.stroke,task?.body,task?.target,task?.phase,task?.chew,a.next,a.yielding,a.task]);
        let h=this.history.get(a.id);
        if(!h||h.signature!==signature||Math.hypot(a.x-h.x,a.y-h.y)>.03||Math.abs(a.angle-h.angle)>.02){h={signature,x:a.x,y:a.y,angle:a.angle,at:sim.time};this.history.set(a.id,h);}
        const work=!!(job||task||hasPath||carried.has(a.id)),expected=!!(a.fight||a.stun>sim.time||a.wait>0);
        if(work&&!expected)pending.push(a.id);
        const row={id:a.id,x:a.x,y:a.y,angle:a.angle,task:a.task,job:a.job,itemTask:task?copy(task):null,carried:carried.get(a.id)||[],next:a.next,pathLength:a.path.length,wait:a.wait||0,blocked:a.blocked||0,yielding:!!a.yielding,yieldFor:a.yieldFor??null,waitingFor:a.waitingFor??null,yieldHold:a.yieldHold??null,fight:!!a.fight,stun:a.stun??null,work,expectedWait:expected,unchangedFor:sim.time-h.at};
        rows.push(row);
        if(hasPath)for(const field of ['waitingFor','yieldHold'])if(a[field]){
          if(!expected)edges.push({from:a.id,to:a[field],reason:field});
          if(!byId.has(a[field]))this.condition(sim,'actor-ref:'+a.id+':'+field,'missing-actor',[a.id],this.config.referenceSeconds,{field,target:a[field]});
        }
        if(a.job!=null&&!job)this.condition(sim,'job:'+a.id,'missing-job',[a.id],this.config.referenceSeconds,{job:a.job});
        if(task&&!bodies.has(task.body))this.condition(sim,'body:'+a.id,'missing-task-body',[a.id],this.config.referenceSeconds,{body:task.body});
        if(task?.purpose==='feed'&&(!bodies.has(task.target)||!broodIds.has(task.target)))this.condition(sim,'feed:'+a.id,'missing-feed-target',[a.id],this.config.referenceSeconds,{target:task.target});
        if(work&&!expected&&sim.time-h.at>=this.config.workSeconds)this.condition(sim,'work:'+a.id,'work-stall',[a.id],this.config.sampleTicks/60,{actor:row});
      }
      for(const id of this.history.keys())if(!byId.has(id))this.history.delete(id);
      for(const b of sim.physics.bodies){
        if(b.carrier&&!byId.has(b.carrier))this.condition(sim,'carrier:'+b.id,'missing-carrier',[],this.config.referenceSeconds,{body:b.id,carrier:b.carrier});
        if(!b.carrier&&b.rest<30&&sim.physics.moving&&!sim.physics.moving.has(b))this.condition(sim,'moving:'+b.id,'unsimulated-body',[],this.config.referenceSeconds,{body:b.id,kind:b.kind,rest:b.rest});
      }
      const cycles=cyclesOf(actors.map(a=>a.id),edges);
      for(const ids of cycles){
        if(ids.some(id=>this.history.get(id).at===sim.time))continue;
        this.condition(sim,'cycle:'+ids.join(','),'wait-cycle',ids,this.config.cycleSeconds,{edges:edges.filter(e=>ids.includes(e.from)&&ids.includes(e.to))});
      }
      if(pending.length&&pending.every(id=>sim.time-this.history.get(id).at>=this.config.workSeconds))this.condition(sim,'global','no-work-progress',pending,this.config.cycleSeconds,{pending:pending.length});
      for(const key of this.conditions.keys())if(!this.liveConditions.has(key))this.conditions.delete(key);
      this.samples.push({tick:sim.ticks,time:sim.time,pending:pending.length,resting:rows.filter(a=>!a.work&&!a.expectedWait).length,expectedWaits:rows.filter(a=>a.expectedWait).length,edges,cycles,actors:rows,branches:sim.jobs.map(j=>({job:j.id,ant:j.ant,build:j.build,phase:j.phase,widen:!!j.widen})),counters:{dug:sim.stats.grainDug,delivered:sim.stats.grainDelivered,meals:sim.colony.stats.eaten,births:sim.colony.stats.born}});
      if(this.samples.length>this.config.maxSamples)this.samples.shift();
      if(sim.time-this.checkpoints.at(-1).time>=this.config.checkpointSeconds)this.checkpoint(sim);
    }
    export(){return copy({format:'living-clicker-diagnostics-1',metadata:this.metadata,config:this.config,incidents:this.incidents,droppedIncidents:this.droppedIncidents,samples:this.samples,checkpoints:this.checkpoints});}
  }
  return {Observer,cyclesOf};
});

(function () {
  'use strict';
  const { Simulation, W, H, SIZE, SURFACE, KEY, STEP, PICKUP_SECONDS, GRAIN, GRID, FW, FH, ANT_SIZE, ANT_BODY, renderAngle, names, xy, idx, hash } = ColonyGame;
  const $ = id => document.getElementById(id);
  const canvas = $('nest'), ctx = canvas.getContext('2d');
  const layer = document.createElement('canvas'), ground = layer.getContext('2d');
  // Two backing pixels per physical grain, at any shared grain resolution.
  layer.width = FW * 2; layer.height = FH * 2;
  ground.scale(2, 2);
  const floorLayer = document.createElement('canvas'), floor = floorLayer.getContext('2d');
  floorLayer.width = layer.width; floorLayer.height = layer.height; floor.scale(2,2);
  const earthLayer = document.createElement('canvas'), earth = earthLayer.getContext('2d');
  earthLayer.width = layer.width; earthLayer.height = layer.height; earth.scale(2,2);
  let earthSimulation = null;
  let sim, paused = false, speed = 1, last = performance.now(), accumulator = 0, lastUI = -1, lastSave = 0;
  let objectMode=false;
  let visibleGrains=null;
  let alarmPuff=null;
  let cachedRevision = -1, selected = null, pointers = new Map(), gesture = null, storageBlocked = false;
  const cam = { x: W / 2, y: H / 2, zoom: 1, scale: 1, width: 0, height: 0, dpr: 1 };
  const tasks = { idle: '休憩・巣内の移動', travel: '掘削面へ移動', dig: '土を掘削', haul: '土を地上へ運搬', unload: '地上で土を下ろす' };
  const formatTime = t => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;
  function message(text) { $('message').textContent = text; }
  function checkpoint(){const bytes=invalidStored?localStorage.getItem(KEY):LivingSaveCodec.encode(sim.dump());if(bytes)localStorage.setItem(KEY+'_recovery',bytes);}
  function persist(announce = false) {
    if(invalidStored){message('保存データを開けないため、上書きを止めています。');return false;}
    sim.progress.speed=speed;
    try { localStorage.setItem(KEY, LivingSaveCodec.encode(sim.dump())); storageBlocked = false; lastSave = sim.time; if (announce) message('いまの地形とアリの仕事を保存しました。'); return true; }
    catch (e) { storageBlocked = true; message('保存できませんでした。書き出して保管できます。'); return false; }
  }
  function reset(seed) {
    const candidate=new Simulation(seed);checkpoint();stopDiagnostics();sim = candidate; selected = null; cachedRevision = -1; accumulator = 0; lastSave = sim.time;
    $('seed').value = seed;  focusView(); updateUI();
  }
  function adopt(candidate) {
    checkpoint();stopDiagnostics();sim = candidate; selected = null; cachedRevision = -1; accumulator = 0; lastSave = sim.time;
    speed=sim.progress.speed;$('speed').value=String(speed);
    $('seed').value = sim.seed; 
    focusView(); updateUI();
  }
  try {
    const saved = localStorage.getItem(KEY);
    sim = saved ? Simulation.restore(LivingSaveCodec.decode(saved)) : new Simulation(24014);
    if (saved) { message('前回の巣を再開しました。'); }
  } catch (e) { sim = new Simulation(24014); message('保存データを開けませんでした。別の保存を開くか、新しい巣を始めてください。'); paused = true; }
  let invalidStored = paused;
  speed=sim.progress.speed;$('speed').value=String(speed);
  function resize() {
    const r = canvas.getBoundingClientRect(); cam.width = r.width; cam.height = r.height; cam.dpr = Math.min(3, window.devicePixelRatio || 1);
    canvas.width = Math.round(r.width * cam.dpr); canvas.height = Math.round(r.height * cam.dpr);
    cam.scale = Math.min(r.width / W, r.height / H) * cam.zoom;
    render();
  }
  function fit() {
    const points=[...sim.ants,...sim.physics.bodies.filter(b=>b.kind!=='soil'||!b.carrier&&b.y<SURFACE)];
    for(let g=0;g<sim.grains.length;g++)if(!sim.grains[g]&&sim.grainRoom[g])points.push(GRAIN.center(g));
    const minX=Math.max(0,Math.min(...points.map(p=>p.x))-4),maxX=Math.min(W,Math.max(...points.map(p=>p.x),sim.entrance.x+9)+4),minY=0,maxY=Math.max(34,...points.map(p=>p.y))+4;
    cam.x=(minX+maxX)/2;cam.scale=Math.min(cam.width/(maxX-minX),cam.height/(maxY-minY))*.92;cam.y=Math.max((minY+maxY)/2,cam.height/(2*cam.scale));cam.zoom=cam.scale/Math.min(cam.width/W,cam.height/H);
  }
  function focusView() {
    cam.x=46;cam.y=21.5;cam.scale=cam.width<600?Math.min(15,cam.width/25):Math.min(24,cam.height/31);cam.zoom=cam.scale/Math.min(cam.width/W,cam.height/H);
  }
  function screen(x, y) { return { x: (x - cam.x) * cam.scale + cam.width / 2, y: (y - cam.y) * cam.scale + cam.height / 2 }; }
  function world(x, y) { return { x: (x - cam.width / 2) / cam.scale + cam.x, y: (y - cam.height / 2) / cam.scale + cam.y }; }
  function zoom(factor, x = cam.width / 2, y = cam.height / 2) {
    const old = world(x, y); cam.zoom = Math.max(.65, Math.min(4.5, cam.zoom * factor));
    cam.scale = Math.min(cam.width / W, cam.height / H) * cam.zoom;
    const next = world(x, y); cam.x += old.x - next.x; cam.y += old.y - next.y;
  }
  function soilColor(type,g){
    const gx=g%FW,gy=Math.floor(g/FW),variation=hash(gx,gy,sim.seed)%9,depth=Math.min(12,Math.floor(gy/GRID/8));
    const base=type===4?[164,158,144]:type===2?[115,94,72]:[141,122,99];
    return `rgb(${base[0]+variation-depth},${base[1]+variation-depth},${base[2]+variation-depth})`;
  }
  function rebuildEarth() {
    const c=earth;c.clearRect(0,0,FW,FH);
    for(let y=0;y<SURFACE;y++)for(let x=0;x<W;x++){
      const v=hash(x,y,sim.seed);
      c.fillStyle=y>SURFACE-3?'#c5c4ad':'#dcded5';c.fillRect(x*GRID,y*GRID,GRID,GRID);
      if(y===SURFACE-1&&v%4===0){c.fillStyle='#84886a';c.fillRect(x*GRID+GRID/8,y*GRID+GRID*3/8,GRID/8,GRID*5/8);}
    }
    for(let gy=SURFACE*GRID;gy<FH;gy++)for(let gx=0;gx<FW;gx++){
      const i=gy*FW+gx,type=sim.grains[i];if(!type)continue;
      const v=hash(gx,gy,sim.seed),depth=Math.min(12,Math.floor(gy/GRID/8)),variation=v%9;
      if(type===3){
        const light=(sim.grains[i-FW]!==3?10:0)+(gx&&sim.grains[i-1]!==3?5:0)-(sim.grains[i+FW]!==3?10:0);
        c.fillStyle=`rgb(${86+variation+light-depth/2},${84+variation+light-depth/2},${76+variation+light-depth/2})`;
      }else{
        c.fillStyle=soilColor(type,i);
      }
      c.fillRect(gx,gy,1,1);
    }
    earthSimulation=sim;
  }
  function rebuildGround() {
    if(earthSimulation!==sim)rebuildEarth();
    const c=ground;c.clearRect(0,0,FW,FH);c.imageSmoothingEnabled=false;c.drawImage(earthLayer,0,0,FW,FH);
    floor.clearRect(0,0,FW,FH);
    const light=new Uint8Array(FW*FH),queue=new Int32Array(FW*FH);let start=0,end=0;
    for(let g=SURFACE*GRID*FW;g<light.length;g++)if(!sim.grains[g]){light[g]=13;queue[end++]=g;}
    while(start<end){const g=queue[start++],value=light[g]-1;if(value<=0)continue;for(const n of GRAIN.neighbors(g))if(light[n]<value){light[n]=value;queue[end++]=n;}}
    visibleGrains=light;
    // Hidden rock has precisely the surrounding layer's soil pixels.
    for(let gy=SURFACE*GRID;gy<FH;gy++)for(let gx=0;gx<FW;gx++){
      const g=gy*FW+gx;if(!sim.grains[g])continue;
      if(!light[g]){const p=GRAIN.center(g),type=(sim.layerAt(p.x,p.y)-1)%2?2:1;c.fillStyle=soilColor(type,g);c.fillRect(gx,gy,1,1);}
      c.fillStyle='rgba(21,20,17,'+(light[g]?(.6*(1-light[g]/13)):.68)+')';c.fillRect(gx,gy,1,1);
    }
    for(let gy=SURFACE*GRID;gy<FH;gy++)for(let gx=0;gx<FW;gx++){
      const i=gy*FW+gx;
      if(!sim.grains[i]){
        const rid=sim.grainRoom[i];
        floor.fillStyle=rid===1?'#e2d1a9':rid>=2?(sim.roomKind(rid)==='egg'?'#e5d7bc':sim.roomKind(rid)==='rest'?'#e0d3b6':'#dcccab'):'#d7c7ab';
        floor.fillRect(gx,gy,1,1);
      }else if((gx&&!sim.grains[i-1])||(gx<FW-1&&!sim.grains[i+1])||!sim.grains[i-FW]||(gy<FH-1&&!sim.grains[i+FW])){
        c.fillStyle='#46372133';c.fillRect(gx,gy,1,1);
      }
    }
    c.drawImage(floorLayer,0,0,FW,FH);
    cachedRevision=sim.revision;
  }
  function drawBody(b){
    const shape=ColonyGame.Physics.SHAPES[b.kind],p=screen(b.x-shape.hx,b.y-shape.hy);
    if(p.x<-8||p.x>cam.width+8||p.y<-8||p.y>cam.height+8)return;
    if(b.kind==='soil'){
      ctx.fillStyle=soilColor(b.material,b.source>=0?b.source:GRAIN.at(b.x,b.y));ctx.fillRect(p.x,p.y,GRAIN.size*cam.scale,GRAIN.size*cam.scale);return;
    }
    const brood=sim.colony.brood.find(e=>e.id===b.id);
    const pattern=b.kind==='cookie'?['0110','1111','1111','0110']:b.kind==='waste'?['0110','1111','1110','0110']:b.kind==='egg'?['00111100','01111110','11111111','01111110','00111100']:['001100','011110','111111','111111','011110','001100'];
    const dot=shape.hx*2/pattern[0].length*cam.scale;
    for(let y=0;y<pattern.length;y++)for(let x=0;x<pattern[y].length;x++)if(pattern[y][x]==='1'){
      ctx.fillStyle=b.kind==='cookie'?(y<1?'#f6d9a0':x>2?'#c98b43':'#e4ae63'):b.kind==='waste'?(y<1?'#5d5649':x>2?'#2c2924':'#433e35'):b.kind==='egg'?(brood?.stage==='larva'?(x<2?'#bfa76e':y<2?'#f3dda1':'#cdb77e'):brood?.stage==='pupa'?(y<2?'#d6b688':'#98764f'):(y<2?'#fff3d7':y<4?'#e8d5ae':'#b8a581')):(y<2?'#9b843b':y<4?'#7b622e':'#574626');
      ctx.fillRect(p.x+x*dot,p.y+y*dot,dot,dot);
    }
  }
  const pixelAntCache = new Map();
  function rememberAntFrame(key,frame) {
    if(pixelAntCache.size>=256)pixelAntCache.delete(pixelAntCache.keys().next().value);
    pixelAntCache.set(key,frame);return frame;
  }
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

  function antFrame(angle, step, queen = false, action = 'walk', enemy = false) {
    const direction = (Math.round(renderAngle(angle) / (Math.PI / 8)) + 16) % 16;
    const key = `${direction}:${step}:${+queen}:${action}:${+enemy}`;
    if (pixelAntCache.has(key)) return pixelAntCache.get(key);
    const frame = document.createElement('canvas'); frame.width = frame.height = 32;
    const c = frame.getContext('2d'), pivot = 16, unit = 16, theta = direction * Math.PI / 8;
    const cos = Math.cos(theta), sin = Math.sin(theta);
    const point = (x, y) => ({ x: Math.round(pivot + (x * cos - y * sin) * unit), y: Math.round(pivot + (x * sin + y * cos) * unit) });
    function line(from, to, color) {
      let x = from.x, y = from.y;
      const dx = Math.abs(to.x - x), dy = Math.abs(to.y - y), sx = x < to.x ? 1 : -1, sy = y < to.y ? 1 : -1;
      let error = dx - dy; c.fillStyle = color;
      while (true) {
        c.fillRect(x, y, 1, 1); if (x === to.x && y === to.y) break;
        const twice = error * 2;
        if (twice > -dy) { error -= dy; x += sx; }
        if (twice < dx) { error += dx; y += sy; }
      }
    }
    const legs = enemy ? '#3b1812' : queen ? '#493325' : '#3a3025', gait = [0,.045,0,-.045][step%4];
    for (let k = -1; k <= 1; k++) for (const side of [-1, 1]) {
      const sway = gait * side * (k === 0 ? -1 : 1), reach=(action==='dig'||action==='gather')&&k===1?.055:0,knee = point(k * .15 + sway*.5+reach, side * .15);
      line(point(k * .14, side * .08), knee, legs); line(knee, point(k * .18 + sway+reach, side * (action==='carry'?.20:.22)), legs);
    }
    for (const side of [-1, 1]) {
      const twitch=(action==='idle'&&step===1||action==='dig'&&step%2? .025:0),knee = point(.40, side * (.105+twitch)); line(point(.33, side * .05), knee, legs); line(knee, point(.44, side * .07), legs);
    }
    for (let py = 3; py < 29; py++) for (let px = 3; px < 29; px++) {
      // Whole pixel squares stay inside the physical body, including the 16 facings.
      const inside = ANT_BODY.some(([cx, rx, ry]) => [[0, 0], [1, 0], [0, 1], [1, 1]].every(([ox, oy]) => {
        const wx = (px + ox - pivot) / unit, wy = (py + oy - pivot) / unit;
        const bx = wx * cos + wy * sin, by = -wx * sin + wy * cos;
        return ((bx - cx) / rx) ** 2 + (by / ry) ** 2 <= 1;
      }));
      if(!inside)continue;
      const wx=(px+.5-pivot)/unit,wy=(py+.5-pivot)/unit,bx=wx*cos+wy*sin,by=-wx*sin+wy*cos,gx=Math.floor(bx*unit),gy=Math.floor(by*unit);
      // Small authored pixel clusters keep the waist and head readable at the
      // game's normal scale. The physical body still clips every pixel square.
      const abdomen=gx>=-7&&gx<=-2&&gy>=-2&&gy<=1&&(gy===-1||gy===0||gx>=-6&&gx<=-3),waist=gx>=-1&&gx<=1&&gy>=-1&&gy<=0,head=gx>=2&&gx<=5&&gy>=-2&&gy<=1&&(gy===-1||gy===0||gx>=3&&gx<=4);
      if(!abdomen&&!waist&&!head)continue;
      const edge=gy===-2||gy===1||gx===-7;
      c.fillStyle=edge?(enemy?'#2a120e':'#251e19'):abdomen?(queen?'#68452f':enemy?'#6b2a1d':'#51402c'):waist?(enemy?'#561f16':'#453326'):queen?'#81583a':enemy?'#8c3a25':'#71543a';
      if(abdomen&&gy===-1&&gx>=-5&&gx<=-3)c.fillStyle=queen?'#a27a4c':enemy?'#a8553b':'#8b714b';
      if(head&&gx===4&&gy===-1)c.fillStyle='#181714';
      c.fillRect(px,py,1,1);
    }
    return rememberAntFrame(key,frame);
  }
  function antShape(c, x, y, size, angle, phase, queen = false, action = 'walk', enemy = false) {
    const step = Math.floor(Math.abs(phase)) % 4, frame = antFrame(angle, step, queen,action,enemy);
    c.save(); c.imageSmoothingEnabled = false;
    c.drawImage(frame, x - size, y - size, size * 2, size * 2); c.restore();
  }
  // Side art uses the actual surface and the same body anchor / heading as
  // the carried objects. It never moves ants or cargo to decorate the view.
  function surfaceFloor(x) {
    if(x<0||x>=W)return null;
    const gx=Math.floor(x*GRID);
    for(let gy=0;gy<SURFACE*GRID;gy++)if(sim.physics.soilCells.has(gy*FW+gx))return gy/GRID;
    return sim.soilAt(x,SURFACE+.01)?SURFACE:null;
  }
  function antView(ant) {
    return Math.floor(ant.cell/W)<SURFACE&&surfaceFloor(ant.x)!==null?'surface':'nest';
  }
  function surfaceAntFrame(ant,step,action='walk') {
    const direction=(Math.round(renderAngle(ant.angle)/(Math.PI/8))+16)%16;
    const facing=Math.cos(direction*Math.PI/8)<0?-1:1;
    const theta=direction*Math.PI/8-(facing<0?Math.PI:0),cos=Math.cos(theta),sin=Math.sin(theta),unit=16,pivot=16;
    const point=(x,y)=>({x:Math.round(pivot+(x*facing*cos-y*sin)*unit),y:Math.round(pivot+(x*facing*sin+y*cos)*unit)});
    const gait=[0,.045,0,-.045][step%4],legs=[];
    for(const far of [true,false])for(let k=-1;k<=1;k++){
      const sway=gait*(k===0?-1:1)*(far?-1:1),hip=point(k*.11,.20),knee=point(k*.16+sway*.5,.32);
      const foot=point(k*.22+sway,.44),wx=ant.x+(foot.x-pivot)/unit*ANT_SIZE,floor=surfaceFloor(wx);
      if(floor!==null)foot.y=Math.round(pivot+(floor-ant.y)/ANT_SIZE*unit);
      // A leg crossing an edge lifts instead of stretching down a tall step.
      const dx=foot.x-hip.x,dy=foot.y-hip.y,length=Math.hypot(dx,dy);
      if(length>5){foot.x=Math.round(hip.x+dx/length*5);foot.y=Math.round(hip.y+dy/length*5);}
      legs.push({hip,knee,foot,far});
    }
    const key=`surface:${direction}:${step}:${action}:${+!!ant.enemy}:${legs.map(l=>l.foot.x+','+l.foot.y).join(';')}`;
    if(pixelAntCache.has(key))return pixelAntCache.get(key);
    const frame=document.createElement('canvas');frame.width=frame.height=32;const c=frame.getContext('2d');
    function line(a,b,color){
      let x=a.x,y=a.y,dx=Math.abs(b.x-x),dy=Math.abs(b.y-y),sx=x<b.x?1:-1,sy=y<b.y?1:-1,error=dx-dy;c.fillStyle=color;
      while(true){c.fillRect(x,y,1,1);if(x===b.x&&y===b.y)break;const twice=error*2;if(twice>-dy){error-=dy;x+=sx;}if(twice<dx){error+=dx;y+=sy;}}
    }
    for(const l of legs){const color=ant.enemy?(l.far?'#6a3a2e':'#3b1812'):l.far?'#665a48':'#322c25';line(l.hip,l.knee,color);line(l.knee,l.foot,color);}
    for(const offset of [0,.045]){const knee=point(.37,-.105+offset+(action==='idle'&&step===1?-.02:0));line(point(.32,-.04+offset),knee,'#3a3025');line(knee,point(.41,-.08+offset),'#3a3025');}
    line(point(.065,.11),point(.19,.055),'#251e19');
    const drop=action==='unload'&&step%2?.035:0,body=[[-.25,.15,.24,.16],[0,.15,.14,.12],[.24,.025+drop,.16,.14]];
    for(let py=2;py<30;py++)for(let px=2;px<30;px++)if(body.some(([cx,cy,rx,ry])=>[[0,0],[1,0],[0,1],[1,1]].every(([ox,oy])=>{
      const wx=(px+ox-pivot)/unit,wy=(py+oy-pivot)/unit,bx=(wx*cos+wy*sin)*facing,by=-wx*sin+wy*cos;
      return ((bx-cx)/rx)**2+((by-cy)/ry)**2<=1;
    }))){const wx=(px+.5-pivot)/unit,wy=(py+.5-pivot)/unit,bx=(wx*cos+wy*sin)*facing,by=-wx*sin+wy*cos;
      c.fillStyle=ant.enemy?(by>.22?'#2a120e':bx<-.10?'#6b2a1d':bx>.13?'#8c3a25':'#561f16'):by>.22?'#251e19':bx<-.10?'#51402c':bx>.13?'#71543a':'#453326';if(bx<-.15&&by<.12)c.fillStyle=ant.enemy?'#a8553b':'#8b714b';c.fillRect(px,py,1,1);
    }
    const eye=point(.29,.005+drop);c.fillStyle='#181714';c.fillRect(eye.x,eye.y,1,1);
    return rememberAntFrame(key,frame);
  }
  function drawWorker(ant,reduced) {
    const p=screen(ant.x,ant.y),size=cam.scale*ANT_SIZE,job=sim.jobs.find(j=>j.id===ant.job),action=ant.fight?'dig':ant.task==='dig'?(job?.pickup?'gather':'dig'):ant.task==='unload'?'unload':sim.carriedKind(ant)?'carry':ant.path.length&&!ant.waitingFor?'walk':'idle',phase=reduced?0:ant.fight?sim.time*8:action==='dig'?sim.digMotion(ant):action==='idle'?((sim.time+ant.id*.71)%7<.6?1:0):action==='gather'||action==='unload'?sim.time*6:ant.walked*3;
    if(antView(ant)==='nest'){antShape(ctx,p.x,p.y,size,ant.angle,phase,false,action,!!ant.enemy);return;}
    const step=Math.floor(Math.abs(phase))%4,frame=surfaceAntFrame(ant,step,action);
    ctx.save();ctx.imageSmoothingEnabled=false;ctx.drawImage(frame,p.x-size,p.y-size,size*2,size*2);ctx.restore();
  }
  function render() {
    if (!cam.width || !sim) return;
    if (cachedRevision !== sim.revision) rebuildGround();
    ctx.setTransform(cam.dpr, 0, 0, cam.dpr, 0, 0); ctx.fillStyle = '#b4a48b'; ctx.fillRect(0, 0, cam.width, cam.height);
    ctx.imageSmoothingEnabled = false;
    const origin = screen(0, 0); ctx.drawImage(layer, origin.x, origin.y, W * cam.scale, H * cam.scale);
    for(const b of sim.physics.bodies)if(!b.carrier)drawBody(b);
    const focus = selected?.kind === 'ant' ? sim.ants.find(a => a.id === selected.id) : null;
    if (focus?.path.length) {
      ctx.strokeStyle = '#f4e6bfa6'; ctx.lineWidth = 1.5; ctx.beginPath(); const start = screen(focus.x, focus.y); ctx.moveTo(start.x, start.y);
      for (const i of focus.path.slice(focus.next)) { const p = (typeof i==='object'?i:sim.walkPoint(i)), v = screen(p.x, p.y); ctx.lineTo(v.x, v.y); } ctx.stroke();
    }
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const queen = screen(48, 24); drawQueen(ctx,queen.x,queen.y,cam.scale,reduced);
    for (const a of sim.ants) {
      const s = screen(a.x, a.y);
      if (s.x < -10 || s.x > cam.width + 10 || s.y < -10 || s.y > cam.height + 10) continue;
      drawWorker(a,reduced);
      if (a.task === 'dig') {
        const job = sim.jobs.find(j => j.id === a.job), g = job.grains[job.cursor];
        if(g!==undefined&&job.pickup===null){const p=GRAIN.origin(g),at=screen(p.x,p.y);ctx.strokeStyle='#ead9a7';ctx.lineWidth=Math.max(.5,cam.scale*GRAIN.size*.12);ctx.strokeRect(at.x,at.y,GRAIN.size*cam.scale,GRAIN.size*cam.scale);}
      }
    }
    for(const e of sim.colony.raid?.enemies||[])drawWorker(e,reduced);
    if(alarmPuff){const age=(performance.now()-alarmPuff.at)/900;if(age>=1)alarmPuff=null;else{const c=screen(alarmPuff.x,alarmPuff.y);ctx.strokeStyle=`rgba(236,196,120,${(1-age)*.9})`;ctx.lineWidth=2;ctx.beginPath();ctx.arc(c.x,c.y,cam.scale*(1+age*3),0,Math.PI*2);ctx.stroke();}}
    for(const b of sim.physics.bodies)if(b.carrier)drawBody(b);
    if (selected) {
      ctx.strokeStyle = '#fff7de'; ctx.lineWidth = 1;
      if (selected.kind === 'ant' && focus) { const s = screen(focus.x,focus.y); ctx.beginPath(); ctx.arc(s.x,s.y,Math.max(7,cam.scale),0,Math.PI*2); ctx.stroke(); }
      else if(selected.kind==='body'){const b=sim.physics.byId.get(selected.id);if(b){const p=screen(b.x,b.y);ctx.strokeRect(p.x-5,p.y-5,10,10);}}
      else if (selected.kind === 'cell') { const p=GRAIN.origin(selected.grain),s=screen(p.x,p.y);ctx.strokeRect(s.x,s.y,cam.scale*GRAIN.size,cam.scale*GRAIN.size); }
    }
    for (const r of sim.rooms.slice(1)) {
      const roomCells = sim.cells(r.id);if(!roomCells.length)continue;const top = Math.min(...roomCells.map(i => Math.floor(i / W)));
      const p = screen(r.x, top - 1.3);
      if (p.y < 10 || p.y > cam.height - 38 || p.x < 28 || p.x > cam.width - 28) continue;
      ctx.font = '12px "Yu Gothic UI",Meiryo,sans-serif'; ctx.textAlign = 'center';
      const width = ctx.measureText(sim.roomName(r.id)).width;
      ctx.fillStyle = '#3a3024c9'; ctx.fillRect(p.x - width / 2 - 5, p.y - 13, width + 10, 19);
      ctx.fillStyle = '#f2eee3'; ctx.fillText(sim.roomName(r.id), p.x, p.y);
    }
    const entrance = screen(sim.entrance.x, 4.5), dump = xy(sim.drop), above = screen(dump.x + 2, 3);
    ctx.font = '11px "Yu Gothic UI",Meiryo,sans-serif'; ctx.fillStyle = '#5c554a'; ctx.textAlign = 'center';
    if (entrance.y > 18) ctx.fillText('入口', entrance.x, entrance.y);
    const forage=screen(17.5,4.5);if(forage.y>18)ctx.fillText('採集場所',forage.x,forage.y);
  }
  const roleNames={forage:'採集係',nurse:'育児係',build:'掘削係',guard:'見張り'},stageNames={egg:'卵',larva:'幼虫',pupa:'蛹'};
  function selectionUI(){
    const el=$('selection');el.replaceChildren();
    const line=(text,strong=false)=>{const n=document.createElement(strong?'b':'div');n.textContent=text;if(!strong)n.className='line';el.append(n);};
    if(!selected){line('アリ・卵・餌を選ぶと様子が見られます。');return;}
    if(selected.kind==='ant'){
      const a=sim.ants.find(a=>a.id===selected.id);if(!a){selected=null;return;}
      line('アリ '+a.id+' / '+roleNames[a.role],true);
      if(a.itemTask?.purpose==='feed')line(a.itemTask.phase==='fetch'?'給餌する餌を取りに行く':'幼虫へ餌を届ける');
      else if(a.itemTask)line(a.itemTask.phase==='fetch'?(a.role==='forage'?'地表の餌へ向かう':'卵・幼虫を迎えに行く'):'荷物を部屋へ届ける');
      else line(a.job!==null?tasks[a.task]:a.path.length?'巣内を移動':'次の仕事を待つ');
      const bodies=sim.physics.bodies.filter(b=>b.carrier===a.id);line('荷物：'+(bodies.length?bodies[0].kind==='soil'?'砂 '+bodies.length+'粒':bodies[0].kind==='food'?'餌 1個':bodies[0].kind==='waste'?'ゴミ 1個':bodies[0].kind==='cookie'?'甘い粒 1個':'卵・幼虫 1個':'なし'));
      if(a.desiredRole!==a.role)line(roleNames[a.desiredRole]+'へ交代予定');
    }else if(selected.kind==='body'){
      const b=sim.physics.byId.get(selected.id);if(!b){selected=null;return;}
      const e=sim.colony.brood.find(e=>e.id===b.id);line(e?stageNames[e.stage]:b.kind==='soil'?(b.material===4?'小石':'砂粒'):b.kind==='waste'?'ゴミ':b.kind==='cookie'?'甘い粒':'餌',true);
      line(b.carrier?'アリ '+b.carrier+' が運搬中':b.kind==='waste'?(b.y<SURFACE?'地表で土に還っていく':'巣の中に残っている'):sim.colony.wild.includes(b.id)?'地表の採集場所':b.rest>=30?'部屋で保管中':'落下・移動中');
      if(e?.stage==='larva')line('給餌 '+e.feeds+' / 2回');
      if(e?.stage==='pupa')line('羽化まで あと約'+Math.max(0,Math.ceil((50-e.age)/(1+sim.colony.upgrades.brood*.2)))+'秒');
    }else{const g=selected.grain,t=sim.grains[g],p=GRAIN.center(g),known=visibleGrains?.[g]>0;line(t?(known?['','土','硬い土','岩','小石'][t]:'第'+sim.layerAt(p.x,p.y)+'層の土'):sim.roomName(sim.grainRoom[g]),true);line(t?(known&&t===3?'掘れない岩です':sim.layerAt(p.x,p.y)>sim.depthAbility()?'深度研究で掘れるようになります。':'まだ掘っていない場所です。'):'アリが通れる空間です');}
  }
  function updateUI(){
    const s=sim.status();
    for(const [id,value] of Object.entries({'ant-count':s.ants,food:s.food,births:s.births,'egg-count':s.brood.egg,'larva-count':s.brood.larva,'pupa-count':s.brood.pupa,meals:s.meals,harvest:s.harvest,'dig-count':s.activity.dig,'haul-count':s.activity.haul+s.activity.unload,delivered:s.grainDelivered}))$(id).textContent=value;
    $('elapsed').textContent=formatTime(sim.time);
    $('food-note').textContent='保管中 '+s.stock+'個 / 移動中 '+(s.food-s.stock)+'個。幼虫1匹に餌2個。';
    $('queen-progress').style.width=(s.queen*100)+'%';
    $('lay').disabled=!s.canLay;
    $('laying').textContent=sim.colony.laying?'産卵中':'産卵を再開';$('laying').setAttribute('aria-pressed',String(sim.colony.laying));
    $('queen-note').textContent=!sim.colony.laying?'産卵をお休み中':s.ants+sim.colony.brood.length>=sim.populationLimit()?'この区画の定員です':s.food<2||sim.expandedGrowth()&&sim.growthCare().food<sim.growthCare().meals+2?'餌が届くのを待っています':sim.expandedGrowth()&&!sim.growthCare().nurses?'育児係を増やしてください':sim.expandedGrowth()&&sim.colony.brood.length>=Math.floor(sim.growthCare().nursery)?'育児室が広がるのを待っています':!s.canLay?'いまの卵・幼虫を育てています':'次の卵まで 約'+Math.ceil((1-s.queen)*40/sim.layRate())+'秒';
    for(const r of ColonyGame.ROLES)$('role-'+r).textContent=s.allocation[r];
    document.querySelectorAll('[data-role]').forEach(b=>b.disabled=b.dataset.delta==='-1'?s.allocation[b.dataset.role]===0:s.allocation[b.dataset.role]===s.ants);
    $('role-note').textContent=s.pendingRoles?s.pendingRoles+'匹が、荷物を届けてから交代します。':'＋−で担当を振り替え。荷物は届けてから交代。';
    {const crowded=sim.crowding?.().length||0;$('space-note').textContent='育児室 '+s.capacity.larvae+' / 必要 '+sim.demands.larvae+'匹分 · 食料庫 '+s.capacity.food+' / 必要 '+sim.demands.food+'個分'+(crowded?' · 休む場所のない働き手 '+crowded+'匹':'');}
    const effects={walk:'歩く速さ +15%',brood:'育つ速さ +20%',dig:'掘る速さ +25%'};
    document.querySelectorAll('[data-upgrade]').forEach(b=>{const k=b.dataset.upgrade,level=sim.colony.upgrades[k],def=ColonyGame.UPGRADES[k],cost=sim.upgradeCost(k);b.replaceChildren(document.createTextNode(def.name+' '+level+'/'+def.max));const note=document.createElement('span');note.textContent=level>=def.max?'習得済み':effects[k]+' / 餌 '+cost+'個';b.append(note);b.disabled=level>=def.max||s.available<cost;});
    let cause=s.births===0?'目標：最初の働き手を育てよう。':s.ants<20?'目標：働き手20匹のコロニーへ。':s.ants<32?'目標：働き手32匹のコロニーへ。':'目標：この区画で64匹まで育てよう。';
    if(!s.allocation.forage)cause+=' 採集係を増やすと餌を集めます。';else if(!s.allocation.nurse)cause+=' 育児係を増やすと給餌を始めます。';else if(s.food<2)cause+=' 地表から餌が届くのを待っています。';else if(!s.allocation.build&&(s.shortages.larvae||s.shortages.food))cause+=' 掘削係を増やすと巣を広げます。';else if(s.brood.pupa)cause+=' 蛹が羽化を待っています。';else if(s.brood.larva)cause+=' 育児係が幼虫に餌を届けています。';else cause+=' 採集と掘削を始めています。';
    if(s.ants+sim.colony.brood.length>=sim.populationLimit())cause='コロニーが育ちました。女王と地質の研究で、次の成長へ。';
    if(s.births&&s.allocation.forage&&s.allocation.nurse&&s.allocation.build&&s.food>=2)cause=s.reached<sim.depthAbility()?'新しい地層へ、通路を掘り進めています。':s.ants<32?'働き手を育てて、巣を広げよう。':'研究と仕事の配分で、コロニーを育てよう。';
    if(sim.colony.disease?.active)cause='育児室にゴミがたまり、病気が広がっています。掃除の手を増やそう。';
    {const r=sim.colony.raid;if(r?.phase==='scout')cause=s.allocation.guard?'見知らぬアリが巣を探っています。見張りが入口で待ち構えます。':'見知らぬアリが巣を探っています。見張りを置くと入口で追い払えます。';else if(r?.phase==='coming')cause=s.allocation.guard?'襲撃隊が来ます。見張りが入口で迎え撃ちます。':'襲撃隊が来ます。見張りを置くと入口で防げます。';else if(r?.phase==='attack')cause='襲撃中。侵入者をタップすると、近くの働きアリが駆けつけます。';}
    $('cookies').textContent=s.cookie;$('depth').textContent='第'+s.reached+'層';updateResearch();
    if($('cause').textContent!==cause)$('cause').textContent=cause;
    $('play').textContent=paused?'再開':'一時停止';$('play').setAttribute('aria-pressed',String(paused));selectionUI();
    const journal=$('journal');journal.replaceChildren();for(const e of sim.events.slice(-3).reverse()){const li=document.createElement('li');li.textContent=formatTime(e.time)+' '+e.text;journal.append(li);}
  }
  let selectedResearch='dig_speed';
  const researchDialog=$('research-dialog');
  for(const branch of ['採集','育児','衛生','発酵','地質','防衛','黄金','女王','遠征']){
    const h=document.createElement('div');h.className='research-branch';h.textContent=branch;$('research-list').append(h);
    for(const def of ColonyGame.RESEARCH.filter(d=>d.branch===branch)){
      const b=document.createElement('button');b.className='research-item'+(def.planned?' planned':'');b.dataset.research=def.id;b.setAttribute('aria-pressed','false');
      const title=document.createElement('span');title.textContent=def.name;const level=document.createElement('small');b.append(title,level);
      b.onclick=()=>{selectedResearch=def.id;updateResearch();};$('research-list').append(b);
    }
  }
  function updateResearch(){
    let ready=0;
    for(const b of document.querySelectorAll('[data-research]')){
      const id=b.dataset.research,d=ColonyGame.BY_ID[id],status=sim.researchStatus(id);if(status==='ready')ready++;
      b.setAttribute('aria-pressed',String(id===selectedResearch));b.querySelector('small').textContent=status==='planned'?'準備中':status==='done'?'研究済み':d.max===Infinity?'Lv '+sim.level(id):sim.level(id)+' / '+d.max;
    }
    $('research-summary').textContent=ready?ready+'件を研究できる':'';
    if(!researchDialog.open)return;
    const d=ColonyGame.BY_ID[selectedResearch],cost=sim.researchCost(d.id),status=sim.researchStatus(d.id);
    $('research-name').textContent=d.name;$('research-effect').textContent=sim.researchDescription(d.id);
    $('research-cost').textContent=status==='planned'?'':status==='done'?'研究済み':[cost.food?'餌 '+cost.food+'個':null,cost.cookie?'クッキー '+cost.cookie+'個':null].filter(Boolean).join('・');
    const need=sim.researchRequirements(d.id);
    const condition=status==='planned'?'まだ研究できません。':need.prereq&&!sim.level(need.prereq)?ColonyGame.BY_ID[need.prereq].name+'が必要':need.minAnts&&sim.ants.length<need.minAnts?'働き手 '+need.minAnts+'匹から':need.reached&&sim.progress.reached<need.reached?'第'+need.reached+'層への到達が必要':status==='cost'?sim.availableFood().length<cost.food?'保管中の餌があと'+(cost.food-sim.availableFood().length)+'個必要':'クッキーがあと'+(cost.cookie-sim.progress.cookie)+'個必要':'';
    $('research-condition').textContent=condition;$('research-condition').hidden=!condition;
    $('research-buy').disabled=status!=='ready';$('research-buy').textContent=status==='planned'?'準備中':status==='done'?'研究済み':'研究する';
  }
  $('open-research').onclick=()=>{researchDialog.showModal();updateResearch();};
  $('close-research').onclick=()=>researchDialog.close();
  $('research-buy').onclick=()=>{if(sim.buyResearch(selectedResearch)){persist();updateUI();}};

  let tapSave=null;
  $('lay').onclick=()=>{if(sim.tap()){clearTimeout(tapSave);tapSave=setTimeout(()=>persist(),250);}updateUI();};
  $('laying').onclick=()=>{diagnostics?.recordSetting('colony.laying',!sim.colony.laying);sim.colony.laying=!sim.colony.laying;persist();updateUI();};
  document.querySelectorAll('[data-role]').forEach(b=>b.onclick=()=>{sim.shiftRole(b.dataset.role,+b.dataset.delta);persist();updateUI();});
  document.querySelectorAll('[data-upgrade]').forEach(b=>b.onclick=()=>{sim.buy(b.dataset.upgrade);updateUI();});
  $('play').onclick = () => { paused = !paused; accumulator = 0; updateUI(); };
  $('speed').onchange = () => { speed = +$('speed').value;diagnostics?.recordSetting('progress.speed',speed);persist(); };
  
  
  
  document.querySelectorAll('[data-priority]').forEach(b => b.onclick = () => { sim.priority = b.dataset.priority; sim.planAt = sim.time; updateUI(); });
  
  $('focus').onclick=focusView;
  $('undo').onclick=()=>{try{const bytes=localStorage.getItem(KEY+'_recovery');if(!bytes){message('一つ前の巣はまだありません。');return;}const candidate=Simulation.restore(LivingSaveCodec.decode(bytes));adopt(candidate);invalidStored=false;persist();message('一つ前の巣に戻りました。');}catch{message('一つ前の巣を開けませんでした。いまの巣はそのままです。');}};
  $('zoom-in').onclick = () => zoom(1.25); $('zoom-out').onclick = () => zoom(1 / 1.25); $('fit').onclick = fit;
  $('save').onclick = () => { persist(true); };
  $('restore').onclick = () => {
    try { const data = localStorage.getItem(KEY); if (!data) { message('保存データはまだありません。'); return; } const next = Simulation.restore(LivingSaveCodec.decode(data)); adopt(next); invalidStored = false; message('保存した地形と仕事を再開しました。'); }
    catch (e) { message('保存データを読み込めませんでした。いまの巣はそのままです。'); }
  };
  $('export').onclick = () => {
    const blob = new Blob([JSON.stringify(sim.dump())], { type: 'application/json' }), url = URL.createObjectURL(blob), a = document.createElement('a');
    a.href = url; a.download = `living-clicker-2-${sim.seed}.json`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); message('いまの状態を書き出しました。');
  };
  $('import').onchange = async () => {
    const f = $('import').files[0]; if (!f) return;
    try { if (f.size > 16000000) throw new Error('large'); const next = Simulation.restore(JSON.parse(await f.text())); adopt(next); invalidStored = false; if(persist())message('保存データを開きました。'); }
    catch (e) { message('保存データを開けませんでした。いまの巣はそのままです。'); }
    $('import').value = '';
  };
  $('reset').onclick = () => {
    const seed = Number($('seed').value);
    if (!Number.isInteger(seed) || seed < 1 || seed > 4294967295) { message('地形の種は1〜4294967295の整数です。'); return; }
    try{reset(seed); invalidStored = false; if(persist())message('この地形で最初から始めました。');}catch{message('新しい巣を保存できませんでした。いまの巣を書き出して保管できます。');}
  };
  $('new-seed').onclick = () => {try{reset(crypto.getRandomValues(new Uint32Array(1))[0] || 1);invalidStored=false;if(persist())message('別の地形で始めました。');}catch{message('新しい巣を始められませんでした。いまの巣を書き出して保管できます。');}};
  // Safari can ignore viewport zoom limits. Cancel its page gesture without
  // cancelling touchend/click, so rapid taps still reach the game controls.
  for(const type of ['gesturestart','gesturechange'])document.addEventListener(type,e=>e.preventDefault(),{passive:false});
  document.querySelector('.app').addEventListener('dblclick',e=>{
    if(!e.target.closest('input,textarea,select,[contenteditable="true"]'))e.preventDefault();
  });
  canvas.addEventListener('wheel', e => { e.preventDefault(); const r = canvas.getBoundingClientRect(); zoom(Math.exp(-e.deltaY * .001), e.clientX - r.left, e.clientY - r.top); }, { passive: false });
  canvas.addEventListener('pointerdown', e => {
    canvas.setPointerCapture(e.pointerId); const r = canvas.getBoundingClientRect(); pointers.set(e.pointerId, { x: e.clientX - r.left, y: e.clientY - r.top });
    if(pointers.size>1)sim.physics.drop();
    gesture = { start: [...pointers.values()].map(p => ({ ...p })), cam: { ...cam }, moved: false, at: performance.now() };
    if(objectMode&&pointers.size===1){const p=pointers.get(e.pointerId),w=world(p.x,p.y),b=sim.physics.hit(w.x,w.y,Math.max(.4,9/cam.scale));if(b){sim.physics.grab(b.id,w.x,w.y);gesture.body=b.id;selected={kind:'body',id:b.id};}}
  });
  canvas.addEventListener('pointermove', e => {
    if (!pointers.has(e.pointerId)) return; const r = canvas.getBoundingClientRect(); pointers.set(e.pointerId, { x: e.clientX - r.left, y: e.clientY - r.top });
    const ps = [...pointers.values()]; if (!gesture) return;
    if(gesture.body&&ps.length===1){const w=world(ps[0].x,ps[0].y);if(sim.physics.drag)Object.assign(sim.physics.drag,w);gesture.moved=true;return;}
    if (ps.length === 2 && gesture.start.length === 2) {
      const base = Math.hypot(gesture.start[0].x - gesture.start[1].x, gesture.start[0].y - gesture.start[1].y), now = Math.hypot(ps[0].x - ps[1].x, ps[0].y - ps[1].y);
      Object.assign(cam, gesture.cam); const mid = { x: (ps[0].x + ps[1].x) / 2, y: (ps[0].y + ps[1].y) / 2 }; zoom(now / Math.max(1, base), mid.x, mid.y); gesture.moved = true;
    } else if (ps.length === 1) {
      const dx = ps[0].x - gesture.start[0].x, dy = ps[0].y - gesture.start[0].y;
      cam.x = gesture.cam.x - dx / cam.scale; cam.y = gesture.cam.y - dy / cam.scale; if (Math.hypot(dx, dy) > 5) gesture.moved = true;
    }
  });
  function pointerEnd(e) {
    const p = pointers.get(e.pointerId); if (!p) return;
    const dragged=gesture?.body;if(dragged)sim.physics.drop();
    if (!dragged&&gesture && !gesture.moved && pointers.size === 1 && e.type !== 'pointercancel') {
      const w = world(p.x, p.y), nearest = sim.ants.slice().sort((a, b) => Math.hypot(a.x - w.x, a.y - w.y) - Math.hypot(b.x - w.x, b.y - w.y))[0];
      // A tap on an intruder releases alarm pheromone instead of selecting.
      const raised=sim.alarmAt?.(w.x,w.y,Math.max(2,14/cam.scale)),object=raised?null:sim.physics.hit(w.x,w.y,Math.max(.3,4/cam.scale));
      if(raised){alarmPuff={x:w.x,y:w.y,at:performance.now()};persist();}
      else if(object)selected={kind:'body',id:object.id};
      else if (Math.hypot(nearest.x - w.x, nearest.y - w.y) < Math.max(1, 9 / cam.scale)) selected = { kind: 'ant', id: nearest.id };
      else if (w.x >= 0 && w.x < W && w.y >= 0 && w.y < H) selected = { kind: 'cell', cell: idx(Math.floor(w.x), Math.floor(w.y)), grain: GRAIN.at(w.x,w.y) };
      else selected = null;
      selectionUI();if(selected)$('selection-detail').open=true;
    }
    pointers.delete(e.pointerId); gesture = null;
    if (pointers.size) gesture = { start: [...pointers.values()].map(p => ({ ...p })), cam: { ...cam }, moved: true, at: performance.now() };
  }
  canvas.addEventListener('pointerup', pointerEnd); canvas.addEventListener('pointercancel', pointerEnd);
  canvas.addEventListener('keydown', e => {
    const actions = { '+': () => zoom(1.25), '=': () => zoom(1.25), '-': () => zoom(1 / 1.25), '0': fit,
      ArrowLeft: () => cam.x -= 4, ArrowRight: () => cam.x += 4, ArrowUp: () => cam.y -= 4, ArrowDown: () => cam.y += 4,
      Escape: () => { selected = null; updateUI(); } };
    if (actions[e.key]) { e.preventDefault(); actions[e.key](); }
  });
  window.addEventListener('resize', resize);
  document.addEventListener('visibilitychange', () => { last = performance.now(); accumulator = 0; if (document.hidden && !invalidStored && !storageBlocked) persist(); });
  window.addEventListener('pagehide', () => { if (!invalidStored && !storageBlocked) persist(); });
  function frame(now) {
    const elapsed = Math.min(.1, Math.max(0, (now - last) / 1000)); last = now;
    if (!paused && !document.hidden) {
      accumulator += elapsed * speed;
      let count = 0;
      while (accumulator >= STEP && count++ < 60) { sim.step(STEP); accumulator -= STEP; }
      if (!invalidStored && !storageBlocked && sim.time - lastSave >= 30) persist();
    }
    if (now - lastUI > 220) { updateUI(); lastUI = now; }
    render(); requestAnimationFrame(frame);
  }
  $('seed').value = sim.seed; 
  resize(); focusView(); updateUI(); render(); requestAnimationFrame(frame);
  // Readable inspection API for verifying the independent game loop.
  // Developer inspection only: no player-facing controls or persistent data.
  let diagnostics=null,lastDiagnostics=null;
  function stopDiagnostics(){
    if(diagnostics){lastDiagnostics=diagnostics.detach();diagnostics=null;}
    return lastDiagnostics&&structuredClone(lastDiagnostics);
  }
  async function startDiagnostics(options={}){
    const target=sim,hashes={};
    for(const name of ['index.html','core.js','lifecycle.js','game.js','view.js']){
      const response=await fetch(new URL(name,location.href));if(!response.ok)throw Error('診断のソースを確認できません: '+name);
      hashes[name]=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',await response.arrayBuffer())),n=>n.toString(16).padStart(2,'0')).join('');
    }
    if(target!==sim)throw Error('診断の準備中に巣が切り替わりました');
    stopDiagnostics();lastDiagnostics=null;
    diagnostics=new LivingDiagnostics.Observer({config:options.config,metadata:{sourceSha256:hashes,origin:location.origin,step:STEP}}).attach(sim);
    return {sourceSha256:hashes,tick:sim.ticks};
  }

  window.colonyGame = { get sim() { return sim; }, get paused() { return paused; }, get camera() { return { ...cam }; },
    pause(value = true) { paused = value; accumulator = 0; updateUI(); }, advance(seconds) { sim.advance(seconds); updateUI(); render(); },
    startDiagnostics, stopDiagnostics, diagnostics:()=>diagnostics?.export()||lastDiagnostics, reset, render, screen, dump: () => sim.dump(), load(pack) { adopt(Simulation.restore(pack)); render(); }, selectAnt(id) { selected = { kind: 'ant', id }; updateUI(); render(); } };
})();
