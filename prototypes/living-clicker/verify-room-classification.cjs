const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto'),G=require('./game.js'),results=[];
function test(name,fn){const detail=fn();results.push({name,pass:true,...detail});console.log('PASS '+name);}
function model(){const s=Object.create(G.Simulation.prototype);s.rooms=[null,{id:1},{id:2},{id:3},{id:4,kind:'food'}];s.colony={};return s;}
test('append-and-replacement-refresh-only-the-classification',()=>{
 const s=model(),first=s.roomsOfKind('food');assert.deepEqual(first,[3,4]);assert(Object.isFrozen(first));assert.equal(s.roomsOfKind('food'),first);
 s.rooms.push({id:5,kind:'food'});const appended=s.roomsOfKind('food');assert.deepEqual(appended,[3,4,5]);assert.notEqual(appended,first);assert.deepEqual(first,[3,4]);
 s.rooms=s.rooms.slice(0,4);assert.deepEqual(s.roomsOfKind('food'),[3]);return {appended:true,replaced:true};
});
test('passage-capacity-and-reservations-stay-live',()=>{
 const s=model(),ready=new Set([3]),list=s.roomsOfKind('food');s.transportReady=rid=>ready.has(rid);assert.equal(s.destinationRoom('food'),3);ready.delete(3);ready.add(4);assert.equal(s.destinationRoom('food'),4);assert.equal(s.roomsOfKind('food'),list);
 ready.add(3);s.grainRoom=new Uint8Array(G.GRAIN.count).fill(1);s.fermentReady=()=>undefined;s.roomCapacity=()=>10;s._storageLedger={stored:{3:0,4:0},reserved:{3:0,4:0},available:{}};const body={id:1,kind:'food',x:48,y:24};assert.equal(s.receivingRoom(body),3);
 s._storageLedger.reserved[3]=10;assert.equal(s.receivingRoom(body),4);s._storageLedger.available[4]=false;assert.equal(s.receivingRoom(body),null);s._storageLedger.available[4]=true;s._storageLedger.reserved[3]=0;s._storageLedger.stored[3]=10;assert.equal(s.receivingRoom(body),4);return {readiness:true,reserved:true,availability:true,stored:true};
});
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');fs.writeFileSync(path.join(__dirname,'qa/room-classification-results.json'),JSON.stringify({pass:true,results,gameSha256:sha(fs.readFileSync(path.join(__dirname,'game.js')))},null,2)+'\n');
