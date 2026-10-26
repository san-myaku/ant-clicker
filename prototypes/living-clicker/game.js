/* Research and depth operate on the organic, physical colony. */
(function(root,factory){
  if(typeof module==='object'&&module.exports)module.exports=factory(require('./lifecycle.js'));
  else root.ColonyGame=factory(root.ColonyLife);
})(typeof globalThis!=='undefined'?globalThis:this,function(Base){
  'use strict';
  const {GRAIN,GRAIN_AREA,GRID,FW,FINE_SIZE,SURFACE,W,H,idx,layerBoundaries,hash}=Base;
  const FORMAT='living-clicker-1';
  // All 61 original studies in their original order. Entries marked planned
  // are shown and selectable but cannot be bought until their system exists.
  const RESEARCH=[
    {id:'gather_1',name:'採集効率I',branch:'採集',desc:'採集係の歩く速さ +15%',food:8,cookie:0,max:3},
    {id:'gather_2',name:'採集効率II',branch:'採集',desc:'採集係の歩く速さ +15%',food:12,cookie:2,max:1,prereq:'gather_1'},
    {id:'gather_inf',name:'採集強化',branch:'採集',desc:'採集係の歩く速さ +5%（くり返し研究できる）',food:6,cookie:2,max:Infinity,growth:1.5,prereq:'gather_2'},
    {id:'brood_1',name:'育児効率I',branch:'育児',desc:'卵・幼虫・蛹の育つ速さ +20%',food:6,cookie:0,max:3},
    {id:'brood_2',name:'幼虫給餌改善',branch:'育児',desc:'幼虫の育つ速さ +15%',food:10,cookie:2,max:1,prereq:'brood_1'},
    {id:'brood_egg_inf',name:'孵化強化',branch:'育児',desc:'卵の育つ速さ +4%（くり返し研究できる）',food:6,cookie:2,max:Infinity,growth:1.5,prereq:'brood_1'},
    {id:'brood_larva_inf',name:'成長強化',branch:'育児',desc:'幼虫の育つ速さ +3%（くり返し研究できる）',food:6,cookie:2,max:Infinity,growth:1.5,prereq:'brood_2'},
    {id:'golden_brood',name:'英才教育',branch:'育児',desc:'黄金卵・黄金幼虫を全室で最優先に育て、さらに黄金の成長を加速する。(通常時の黄金優先は控えめになる)',planned:true},
    {id:'hygiene_1',name:'衛生基礎',branch:'衛生',desc:'幼虫が出すゴミ -10%',food:6,cookie:1,max:1},
    {id:'hygiene_2',name:'清掃効率I',branch:'衛生',desc:'ゴミを運ぶ育児係の歩く速さ +20%',food:8,cookie:2,max:1,prereq:'hygiene_1'},
    {id:'hygiene_3',name:'お掃除はおまかせ',branch:'衛生',desc:'ゴミ室を掘る。手の空いた採集係も掃除を手伝う',food:10,cookie:4,max:1,prereq:'hygiene_2'},
    {id:'hygiene_clean_bonus',name:'清潔なコロニー',branch:'衛生',desc:'育児室にゴミがない間、採集係の歩く速さ +20%',food:14,cookie:6,max:1,prereq:'hygiene_2'},
    {id:'hygiene_recycle',name:'廃棄物リサイクル',branch:'衛生',desc:'ゴミ室のゴミが少しずつ餌に戻る',food:16,cookie:8,max:1,prereq:'hygiene_3'},
    {id:'ferment_unlock',name:'発酵室解放',branch:'発酵',desc:'発酵室を建設可能にする突破研究',planned:true},
    {id:'ferment_1',name:'発酵短縮I',branch:'発酵',desc:'発酵時間 45秒 → 38秒',planned:true},
    {id:'ferment_2',name:'甘味濃縮',branch:'発酵',desc:'発酵完了時 10%でクッキー+1',planned:true},
    {id:'ferment_3',name:'原料節約',branch:'発酵',desc:'発酵に必要な食料 100 → 90',planned:true},
    {id:'ferment_worker_unlock',name:'発酵アリ解放',branch:'発酵',desc:'発酵室を2室建設し、巣内に出現させると発酵アリを雇用可能にする突破研究',planned:true},
    {id:'cookie_find_2x',name:'甘味探索',branch:'発酵',desc:'働きアリが甘い匂いを見つけやすくなり、クッキー発見の機会が増える。',planned:true},
    {id:'ferment_mature',name:'熟成',branch:'発酵',desc:'蓄えたクッキーがゆっくり熟成し、所持量に応じて少しずつ増える。√所持で頭打ち＝貯めるほどお得だが暴走はしない、貯蓄の楽しみ。',planned:true},
    {id:'ferment_offline',name:'自動発酵',branch:'発酵',desc:'ゲームを閉じている間も発酵室がクッキーを作り続ける（食料がある限り、オフライン効率で稼働）。',planned:true},
    {id:'ferment_surplus',name:'余り物の甘味',branch:'発酵',desc:'【交差: 採集×発酵】食料庫が満杯なら、あふれた食料生産を無駄にせずクッキーへ変換する。採集が発酵を支える。',planned:true},
    {id:'geo_depth_2',name:'深度II解放',branch:'地質',desc:'第2層を掘り、深い育児室と食料庫を作れる',food:12,cookie:6,max:1,minAnts:20},
    {id:'geo_depth_3',name:'深度III解放',branch:'地質',desc:'第3・4層を掘り進められる',food:24,cookie:16,max:1,prereq:'geo_depth_2',reached:2},
    {id:'geo_depth_4',name:'深度IV解放',branch:'地質',desc:'第5・6層を掘り進められる',food:40,cookie:32,max:1,prereq:'geo_depth_3',reached:3},
    {id:'build_multitask',name:'マルチタスク',branch:'地質',desc:'建築アリが複数の部屋を同時に建築できるようになる。並行サイト数 1→2→3→4（Lvごと+1）。',planned:true},
    {id:'offline_build',name:'鬼の居ぬ間も！',branch:'地質',desc:'ゲームを閉じている間も建築アリが1/3の効率で部屋の拡張を進める。',planned:true},
    {id:'offline_build_speed',name:'夜なべ建築',branch:'地質',desc:'オフライン建築の効率 +20%/Lv（無限。最大でオンライン相当まで）',planned:true},
    {id:'room_expand',name:'増築',branch:'地質',desc:'建築済みの育児室・食料庫の容量 +5%/Lv（無限）',planned:true},
    {id:'dig_speed',name:'掘削促進',branch:'地質',desc:'一粒を掘る速さ +25%',food:6,cookie:0,max:3},
    {id:'mineral_vein',name:'鉱脈',branch:'地質',desc:'深部の鉱脈から資源を採掘する。巣が深いほどクッキーが少しずつ自然に湧き出す（深度に比例）。',planned:true},
    {id:'soldier_jaw_2x',name:'顎強化',branch:'防衛',desc:'兵隊アリの大顎を鍛え、レイドや害虫への攻撃力を高める。',planned:true},
    {id:'poison_jaw',name:'毒顎',branch:'防衛',desc:'兵隊アリの大顎に毒を仕込む。接敵した敵に毎秒「体力の2%」の毒ダメージ（継続）。',planned:true},
    {id:'poison_conc',name:'毒の濃度',branch:'防衛',desc:'毒ダメージ +15%/Lv（無限）',planned:true},
    {id:'oshiai',name:'おしあいへしあい',branch:'防衛',desc:'兵隊が敵をより広く押さえ込む。足止め範囲 +50%、以後 +20%/Lv（無限）。',planned:true},
    {id:'numbers_win',name:'数は何にも勝る',branch:'防衛',desc:'兵隊アリの雇用コスト -40%、以後 -10%/Lv。ただし各兵隊の兵力 -20%、以後 -5%/Lv（無限）。',planned:true},
    {id:'raid_spoils',name:'戦果',branch:'防衛',desc:'撃退した襲撃者から奪う戦果が増える。防衛勝利時の食料・クッキー報酬 +30%/Lv（無限）。守りが収入源になる。',planned:true},
    {id:'early_warning',name:'早期警戒',branch:'防衛',desc:'偵察と備えで奇襲に強くなる。襲撃で失う働きアリを40%減らす。',planned:true},
    {id:'formic_acid',name:'ギ酸噴射',branch:'防衛',desc:'兵隊が腹部からギ酸を噴射する（実在のヤマアリの防御）。交戦中の敵全体に定期的な範囲ダメージ。',planned:true},
    {id:'formic_conc',name:'ギ酸の濃縮',branch:'防衛',desc:'ギ酸の濃度を高める。範囲ダメージ +20%/Lv（無限）。',planned:true},
    {id:'caste_unlock',name:'兵種分化',branch:'防衛',desc:'兵隊アリを多型化し、コロニーの兵種比率を設定できるようにする。比率は防衛と遠征の両方に影響する。',planned:true},
    {id:'caste_scout',name:'斥候兵の分化',branch:'防衛',desc:'小型で俊敏な斥候兵を編成可能に。遠征の成功率を大きく上げるが、前線の火力・耐久は低い。',planned:true},
    {id:'caste_heavy',name:'重装兵の分化',branch:'防衛',desc:'大型の大顎を持つ重装兵を編成可能に。防衛の火力・耐久が高いが、遠征には不向き。',planned:true},
    {id:'venom_fang',name:'毒牙',branch:'防衛',desc:'クモから採取した毒嚢を兵隊の武器に転用する。接敵した敵への毒ダメージを大幅に強化する。',planned:true},
    {id:'venom_fang_refine',name:'毒牙の精製',branch:'防衛',desc:'毒嚢を精製し、毒ダメージ +30%/Lv（無限）。毒嚢を消費する。',planned:true},
    {id:'lure_spider',name:'捕食者誘引フェロモン',branch:'防衛',desc:'クモをおびき寄せるフェロモンを合成する。遠征パネルからクモの襲撃を任意で誘発し、毒嚢を狙って採取できる（食料コスト＋クールダウン）。',planned:true},
    {id:'golden_1',name:'黄金の輝きI',branch:'黄金',desc:'タップ産卵で黄金卵が生まれる確率 ×1.5。',planned:true},
    {id:'golden_shine_inf',name:'黄金の輝き',branch:'黄金',desc:'黄金卵の確率 +15%/Lv（無限）',planned:true},
    {id:'golden_blessing',name:'黄金の祝福',branch:'黄金',desc:'黄金アリのバフ効果（食料/産卵/クッキー）を ×1.5 に強める。',planned:true},
    {id:'golden_blessing_inf',name:'豊穣の祝福',branch:'黄金',desc:'黄金バフ効果 +20%/Lv（無限）',planned:true},
    {id:'golden_auto',name:'黄金の自動産卵',branch:'黄金',desc:'女王の自動産卵でも黄金卵が生まれるようになる（確率はタップ時の半分）。',planned:true},
    {id:'golden_queen_synergy',name:'黄金の女王',branch:'黄金',desc:'【交差: 女王×黄金】女王の威光が黄金を呼ぶ。女王枝の自動産卵への投資が大きいほど、黄金卵の生まれる確率が上がる。',planned:true},
    {id:'queen_vitality',name:'女王の活力',branch:'女王',desc:'次の卵を産むまでの速さ +25%',food:16,cookie:4,max:1},
    {id:'queen_fertile',name:'多産の系譜',branch:'女王',desc:'次の卵を産むまでの速さ +15%',food:10,cookie:2,max:3},
    {id:'queen_double_lay',name:'重ね産み',branch:'女王',desc:'「産卵を助ける」1回の後押し +100%',food:12,cookie:4,max:3,growth:2.2,prereq:'queen_vitality'},
    {id:'queen_embrace',name:'女王の包容力',branch:'女王',desc:'コロニーを128匹まで育てられる',food:20,cookie:6,max:1,minAnts:24},
    {id:'queen_majesty',name:'女王の威厳',branch:'女王',desc:'季節による自動産卵の落ち込みを無効化する（どの季節でも産卵速度は最低でも等倍）。',planned:true},
    {id:'queen_pheromone',name:'女王フェロモン',branch:'女王',desc:'採集係の歩く速さ +20%',food:30,cookie:12,max:1,prereq:'queen_embrace'},
    {id:'exped_party',name:'遠征編成',branch:'遠征',desc:'遠征に送り出す規模を自分で決められるようになる。多めに送るほど成功率が上がる。',planned:true},
    {id:'exped_lore',name:'遠征の心得',branch:'遠征',desc:'遠征隊の経験が蓄積し、成功率 +4%/Lv（無限）。',planned:true},
    {id:'exped_supply',name:'補給路',branch:'遠征',desc:'遠征先との補給路を確立し、持ち帰る報酬 +20%/Lv（無限）。',planned:true}
  ];
  const BY_ID=Object.fromEntries(RESEARCH.map(d=>[d.id,d])),ACTIVE=RESEARCH.filter(d=>!d.planned);
  // Spoil: keep the entrance apron clear, dump below this height, and let a
  // column taller than this many grains compact into the ground.
  // Food appears at x 15-20; spoil columns start past its slope reach.
  const SPOIL_CLEAR=7,SPOIL_DUMP=2,SPOIL_SETTLE=5,SPOIL_LEFT=23;
  // Waste: leftovers of each real meal, and the meconium a larva expels once
  // as it pupates. Each pellet within reach of a larva slows it; refuse on
  // the surface decays after REFUSE_LIFE seconds.
  const WASTE_PER_MEAL=1,WASTE_PER_PUPA=1,WASTE_REACH=1.5,WASTE_SLOW=.35,REFUSE_LIFE=180;
  // A waste chamber holds a little more than its waste; recycling turns a
  // pellet that has lain there this long back into one real food item.
  // Disease: nursery waste at or above tolerance starts it, below 70% ends it;
  // while it lasts an idle worker dies every DISEASE_INTERVAL seconds.
  const DISEASE_ON=1,DISEASE_OFF=.7,DISEASE_INTERVAL=60;
  const WASTE_ROOM_BASE=6,RECYCLE_AFTER=60,LABELS={egg:'育児室',food:'食料庫',waste:'ゴミ室'};
  const UPGRADE_IDS={walk:'gather_1',brood:'brood_1',dig:'dig_speed'};
  class Simulation extends Base.Simulation{
    constructor(seed=24014){
      super(seed);
      this.progress={research:Object.fromEntries(ACTIVE.map(d=>[d.id,0])),cookie:0,earned:0,spentCookie:0,haulAwards:0,reached:1,claims:[1],speed:1};
      this.colony.waste={due:0,made:0,decayed:0,recycled:0};this.colony.refuse=[];this.colony.disease={active:false,next:0};this.colony.stats.died=0;
      this.events=[];this.log('女王室から、巣づくりを始めます。');
    }
    level(id){return this.progress?.research[id]||0;}
    populationLimit(){return this.level('queen_embrace')?128:64;}
    canLay(){return super.canLay()&&this.ants.length+this.colony.brood.length<this.populationLimit();}
    walkSpeed(ant){return Base.WALK_SPEED*(1+(ant?.role==='forage'?this.level('gather_1')*.15+this.level('gather_2')*.15+this.level('gather_inf')*.05+this.level('queen_pheromone')*.2+(this.level('hygiene_clean_bonus')&&!this.nurseryWaste()?.2:0):0))*(ant?.itemTask?.purpose==='clean'?1+this.level('hygiene_2')*.2:1);}
    broodRate(){return 1+this.level('brood_1')*.2;}
    stageRate(stage){return stage==='egg'?1+this.level('brood_egg_inf')*.04:stage==='larva'?1+this.level('brood_2')*.15+this.level('brood_larva_inf')*.03:1;}
    layRate(){return (1+this.level('queen_fertile')*.15)*(1+this.level('queen_vitality')*.25);}
    tapPower(){return 1+this.level('queen_double_lay');}
    digRate(){return 1+this.level('dig_speed')*.25;}
    afterBirth(ant){
      // Every previous newborn inherited ant 1's home: (id-1)%population is
      // always zero at birth. Pick a real reachable free place instead.
      const candidates=[],others=this.ants.filter(a=>a!==ant),homes=others.map(a=>a.home),stock=this.physics.bodies.filter(b=>b.kind!=='soil'&&!b.carrier);
      for(const rid of [1,...this.roomIds().filter(r=>this.builds[r]?.complete)])for(const cell of this.cells(rid)){
        const p=this.walkPoint(cell);if(!p.valid||p.clearance<.8||this.grainRoom[GRAIN.at(p.x,p.y)]!==rid||Math.hypot(p.x-this.entranceHistory[0].x,p.y-this.entranceHistory[0].y)<2)continue;
        if(homes.some(q=>Math.hypot(q.x-p.x,q.y-p.y)<1)||stock.some(b=>Math.hypot(b.x-p.x,b.y-p.y)<.7))continue;
        if(Base.ANT_BODY.some(([cx,rx,ry])=>((p.x-48-cx*6.4)/(rx*6.4+.7))**2+((p.y-24)/(ry*6.4+.6))**2<1))continue;
        for(const angle of [0,Math.PI/2])if(this.poseClear({...p,angle})&&!others.some(a=>a.job===null&&!a.itemTask&&this.workersOverlap({...p,angle},a,null,this.carriedKind(a))))candidates.push({...p,angle,score:Math.hypot(p.x-ant.x,p.y-ant.y)+this.traffic[cell]*2});
      }
      // The founding chamber is a shared rest area when private places fill.
      // Its original homes are clear of the single-file passages.
      for(const a of others.filter(a=>a.id<=12)){const p=a.home;if(this.grainRoom[GRAIN.at(p.x,p.y)]===1)candidates.push({...p,score:100+homes.filter(q=>Math.hypot(q.x-p.x,q.y-p.y)<.8).length*3});}
      for(const p of candidates.sort((a,b)=>a.score-b.score).slice(0,24)){
        const route=this.path(ant,p,null);if(route===null)continue;ant.home={x:p.x,y:p.y,angle:p.angle};ant.path=route;ant.next=0;ant.returning=true;return;
      }
      // If no free place is reachable, wait at the real emergence position.
      // Future work allocation is still allowed; no actor is repositioned.
      ant.home={x:ant.x,y:ant.y,angle:ant.angle};
    }
    depthAbility(){return this.level('geo_depth_4')?6:this.level('geo_depth_3')?4:this.level('geo_depth_2')?2:1;}
    layerAt(x,y){return 1+layerBoundaries(this.seed,x).filter(v=>y>=v).length;}
    canExcavate(g){const p=GRAIN.center(g);return super.canExcavate(g)&&this.layerAt(p.x,p.y)<=this.depthAbility();}
    nextTip(p,target,radius=.5,history=[],twoWay=false,allChoices=false,avoid=null){
      const deep=this.layerAt(target.x,target.y)>1;
      // A deliberate deep expansion must eventually cross the harder stratum.
      // Keep local rock/stock/body constraints, with stronger progress toward
      // the requested depth rather than following soft soil along it forever.
      const blocked=avoid||this.builds?.find(b=>b?.history===history)?.avoided||[],eligible=c=>!blocked.some(p=>Math.hypot(c.x-p.x,c.y-p.y)<.35);
      let choices=super.nextTip(p,target,radius,history,twoWay,true).filter(eligible);
      // Softer soil along the stratum boundary must not outweigh reaching the
      // room: when a step can approach the target, steps away are not taken.
      // Soil effort still ranks the approaching steps, so the shape follows geology.
      if(deep){const gap=Math.hypot(target.x-p.x,target.y-p.y),closer=choices.filter(c=>Math.hypot(target.x-c.x,target.y-c.y)<gap);if(closer.length)choices=closer;}
      // At a rock face, inspect other walls from this actual working pose.
      // The full turn/body/load footprint must be excavatable before adoption.
      if(!choices.length&&deep)choices=super.nextTip(p,target,radius,history,twoWay,true,[-4,-3,-2,-1,0,1,2,3,4]).filter(eligible);
      if(deep)choices.sort((a,b)=>(a.score+Math.hypot(target.x-a.x,target.y-a.y)*1.7)-(b.score+Math.hypot(target.x-b.x,target.y-b.y)*1.7));
      return allChoices?choices:choices[0]||null;
    }
    construction(rid){
      const first=super.construction(rid),b=this.builds[rid];
      if(first.length||rid<4||!b||b.mode!=='passage'||b.next||this.jobs.some(j=>j.build===rid)||this.nextTip(b.tip,b.target,.5,b.history))return first;
      // A blocked face leaves its excavated stub in the world. Move only the
      // planner's head back along real air and choose another exposed wall;
      // workers keep their positions and walk there through verified routes.
      if(!b.avoided)b.avoided=[];if(!b.avoided.some(p=>Math.hypot(p.x-b.tip.x,p.y-b.tip.y)<.1))b.avoided.push({...b.tip});
      for(let k=b.history.length-2;k>=0;k--){
        const history=b.history.slice(0,k+1),tip=history.at(-1),next=this.nextTip(tip,b.target,.5,history,false,false,b.avoided);if(!next)continue;
        b.history=history;b.tip={...tip};b.next=next;b.length=history.slice(1).reduce((n,p,i)=>n+Math.hypot(p.x-history[i].x,p.y-history[i].y),0);
        if(this._transportSets)delete this._transportSets[rid];this.log('岩のそばで向きを変え、別の壁を掘り進めます。');return super.construction(rid);
      }return first;
    }
    roomCapacity(rid){
      if(this._roomCapacityRevision!==this.revision){
        this._roomCapacities={};for(let g=0;g<FINE_SIZE;g++)if(!this.grains[g]&&!this.grainPending[g]&&this.grainRoom[g]>=2){const id=this.grainRoom[g];this._roomCapacities[id]=(this._roomCapacities[id]||0)+GRAIN_AREA*(this.roomKind(id)==='food'?2:1);}
        this._roomCapacityRevision=this.revision;
      }return this._roomCapacities[rid]||0;
    }
    transportReady(rid){
      const b=this.builds[rid];if(!b?.complete)return false;
      if(!this._readyRooms)this._readyRooms=new Map();const old=this._readyRooms.get(rid);
      // Terrain only opens. A proven two-way passage stays usable; failed
      // checks are valid until excavation or the tip history changes.
      if(old?.ok||old?.revision===this.revision&&old?.length===b.history.length)return old.ok;
      const ok=super.transportReady(rid);this._readyRooms.set(rid,{ok,revision:this.revision,length:b.history.length});return ok;
    }
    destinationRoom(kind,body=null){
      if(!this.colony)return super.destinationRoom(kind);
      if(body){const rid=this.grainRoom[GRAIN.at(body.x,body.y)];if(rid>=2&&this.roomKind(rid)===kind&&this.transportReady(rid))return rid;}
      return this.roomIds().filter(r=>this.roomKind(r)===kind&&this.transportReady(r)).sort((a,b)=>a-b)[0]||1;
    }
    receivingRoom(body){
      if(!this.colony)return super.receivingRoom(body);
      const current=this.grainRoom[GRAIN.at(body.x,body.y)];
      if(current>=2&&this.roomKind(current)===body.kind&&this.transportReady(current))return null;
      for(const rid of this.roomIds().filter(r=>this.roomKind(r)===body.kind&&this.transportReady(r))){
        const stored=this._storageLedger?.stored[rid]||0,reserved=this._storageLedger?.reserved[rid]||0;
        // The task allocator checks and shares physical storage availability
        // for this tick. Do not rescan every drop pose for every waiting item.
        if(stored+reserved<this.roomCapacity(rid)&&this._storageLedger?.available[rid]!==false)return rid;
      }return current===1?null:1;
    }
    finishConstruction(){
      super.finishConstruction();if(this._labelRevision===this.revision)return;
      const changed=new Set(),reach=Base.ANT_SIZE+GRAIN.size*2;
      for(const rid of this.roomIds()){
        const b=this.builds[rid];if(b?.mode!=='chamber')continue;
        // Widening at the working head creates real air. Keep that contiguous
        // floor part of the chamber, instead of surrounding it with a ring of
        // corridor tags that disconnects its frontier from the next soil wall.
        // This only labels existing air; it never opens or credits pending soil.
        const queue=[],seen=new Set();
        for(let gy=Math.floor((b.tip.y-reach)*GRID);gy<=Math.ceil((b.tip.y+reach)*GRID);gy++)for(let gx=Math.floor((b.tip.x-reach)*GRID);gx<=Math.ceil((b.tip.x+reach)*GRID);gx++){
          const g=gy*FW+gx;if(this.grainRoom[g]===rid&&!this.grains[g]){queue.push(g);seen.add(g);}
        }
        for(let at=0;at<queue.length;at++)for(const g of this.grainNeighbors(queue[at])){
          if(seen.has(g)||this.grains[g]||this.grainRoom[g])continue;seen.add(g);const p=GRAIN.center(g);
          if(Math.hypot(p.x-b.tip.x,p.y-b.tip.y)>reach)continue;
          if(this.grainPending[g]&&this.jobs.some(j=>j.grains.includes(g)&&j.build!==rid))continue;
          this.grainRoom[g]=rid;queue.push(g);changed.add(idx(Math.floor(p.x),Math.floor(p.y)));
        }
      }
      if(changed.size){for(const cell of changed){this.syncCell(cell);this.invalidateNavigation(cell);}this.revision++;}
      this._labelRevision=this.revision;
    }
    buildNeeds(){
      if(!this.progress)return super.buildNeeds();
      // Allocate real need across available rooms. The newest deep room gets a
      // small initial need; no empty fixed mask is stamped into the ground.
      const result=[];
      for(const kind of ['egg','food']){
        const rooms=this.roomIds().filter(id=>this.roomKind(id)===kind),total=kind==='egg'?this.demands.larvae:this.demands.food;
        let left=total;
        for(const rid of rooms){const newest=rid===rooms.at(-1),share=newest?Math.max(5,left):Math.min(left,Math.max(kind==='egg'?18:24,this.roomCapacity(rid)));
          result.push({rid,wanted:Math.max(0,share),d:(share-this.roomCapacity(rid))/(kind==='food'?2:1)});left=Math.max(0,left-share);
        }
      }
      for(const rid of this.roomIds().filter(id=>this.roomKind(id)==='waste')){
        const held=this.physics.bodies.filter(b=>b.kind==='waste'&&!b.carrier&&this.grainRoom[GRAIN.at(b.x,b.y)]===rid).length,wanted=WASTE_ROOM_BASE+held;
        result.push({rid,wanted,d:wanted-this.roomCapacity(rid)});
      }return result;
    }
    layerOf(rid){return this.rooms[rid]?.layer??Math.floor(rid/2);}
    roomOf(layer,kind){return this.roomIds().find(r=>this.roomKind(r)===kind&&this.layerOf(r)===layer);}
    roomName(rid){
      if(rid<2)return ['通路','女王房'][rid]??'';const kind=this.roomKind(rid),n=this.roomIds().filter(r=>this.roomKind(r)===kind).indexOf(rid)+1;
      return LABELS[kind]+(n>1?' '+n:'');
    }
    wasteRoom(){return this.roomIds().find(r=>this.roomKind(r)==='waste');}
    ensureWasteRoom(){
      if(!this.level('hygiene_3')||this.wasteRoom()!==undefined||!this.rooms[2]||!this.rooms[3])return;
      // Real refuse chambers sit apart from the brood: leave the queen
      // chamber on the side away from the nursery, at about the same depth.
      const side=this.rooms[2].x<48?1:-1,angle=side>0?0:Math.PI,poses=[];
      for(const cell of this.cells(1)){const p=this.walkPoint(cell);if(p.valid&&this.grainRoom[GRAIN.at(p.x,p.y)]===1&&this.poseClear({...p,angle}))poses.push({...p,angle,score:(p.x-48)*side-Math.abs(p.y-25)*.3});}
      poses.sort((a,b)=>b.score-a.score);
      for(const origin of poses){
        const target={x:Math.max(8,Math.min(W-8,origin.x+side*8)),y:Math.min(H-6,origin.y+1)};
        let probe=origin;const recent=[];let open=true;
        for(let n=0;n<6;n++){const next=this.nextTip(probe,target,.5,recent);if(!next){open=false;break;}recent.push(probe);probe=next;}
        if(!open)continue;const rid=this.rooms.length;
        this.rooms.push({id:rid,...target,kind:'waste',layer:this.layerAt(target.x,target.y)});
        this.builds.push({tip:{x:origin.x,y:origin.y,angle:origin.angle},target,history:[{x:origin.x,y:origin.y,angle:origin.angle}],length:0,mode:'passage',complete:false,next:null,minDepth:SURFACE+1,minLength:6});
        this.log('ゴミ室へ、掘り進めます。');return;
      }
    }
    ensureDepthRooms(){
      const ability=this.depthAbility();
      for(let layer=2;layer<=ability;layer++)for(const kind of ['egg','food']){
        if(this.roomOf(layer,kind)!==undefined)continue;const rid=this.rooms.length;
        // A purpose and a direction, with a near-wall starting pose. Only the
        // current tip chooses the next excavated grains around soil and rocks.
        const parent=this.roomOf(layer-1,kind),anchor=this.rooms[parent];if(!anchor||!this.builds[parent]?.complete)continue;
        const side=kind==='egg'?-1:1,angle=kind==='food'?0:Math.PI/2-side*.35,poses=[],stock=this.physics.bodies.filter(b=>!b.carrier&&b.kind!=='soil');
        for(const cell of this.cells(parent)){const p=this.walkPoint(cell);if(p.valid&&this.grainRoom[GRAIN.at(p.x,p.y)]===parent&&this.poseClear({...p,angle})){
          const density=stock.reduce((n,b)=>n+Math.exp(-((b.x-p.x)**2+(b.y-p.y)**2)/2),0),score=kind==='food'?(p.x-anchor.x)*1.4+(p.y-anchor.y)*.15-density*2:p.y*.9+(p.x-anchor.x)*side*.4;
          poses.push({...p,angle,score});
        }}
        poses.sort((a,b)=>b.score-a.score);let chosen=null;
        for(const origin of poses){
          const boundary=layerBoundaries(this.seed,origin.x)[layer-2],target={x:Math.max(8,Math.min(W-8,origin.x+side*(7+hash(layer,rid,this.seed)%4))),y:Math.min(H-6,boundary+4)};
          // Survey a short exit at the wall. No future route is stored or dug.
          // Food already on a floor must not seal the first turning step.
          let probe=origin;const recent=[];let open=true;
          for(let n=0;n<6;n++){const next=this.nextTip(probe,target,.5,recent);if(!next){open=false;break;}recent.push(probe);probe=next;}
          if(open){chosen={origin,boundary,target};break;}
        }
        if(!chosen)continue;const {origin,boundary,target}=chosen;
        // Every shallower pair first, then this layer's nursery before its store.
        let ordered=kind==='egg'||this.roomOf(layer,'egg')!==undefined;for(let l=1;l<layer&&ordered;l++)ordered=this.roomOf(l,'egg')!==undefined&&this.roomOf(l,'food')!==undefined;
        if(!ordered)continue;
        this.rooms.push({id:rid,...target,kind,layer});
        this.builds.push({tip:{x:origin.x,y:origin.y,angle:origin.angle},target,history:[{x:origin.x,y:origin.y,angle:origin.angle}],length:0,mode:'passage',complete:false,next:null,minDepth:boundary+2.2,minLength:Math.max(6,boundary-origin.y+2.2)});
        this.log('深い'+(kind==='egg'?'育児室':'食料庫')+'へ、掘り進めます。');
      }
    }
    // Cost of the given level: repeatable studies grow geometrically, the
    // others by their level. Paid from real stored food and earned cookies.
    researchCost(id,level=this.level(id)){const d=BY_ID[id];if(!d||d.planned)return null;if(d.growth)return {food:Math.ceil(d.food*d.growth**level),cookie:Math.ceil(d.cookie*d.growth**level)};const n=level+1;return {food:d.food*n,cookie:d.cookie*n};}
    researchSpent(key){let total=0;for(const d of ACTIVE)for(let k=0;k<this.level(d.id);k++)total+=this.researchCost(d.id,k)[key];return total;}
    availableFood(){const claimed=new Set(this.ants.filter(a=>a.itemTask).map(a=>a.itemTask.body));return this.foodBodies(true).filter(b=>!claimed.has(b.id));}
    researchStatus(id){
      const d=BY_ID[id];if(!d)return 'unknown';if(d.planned)return 'planned';if(this.level(id)>=d.max)return 'done';
      if(d.prereq&&!this.level(d.prereq)||d.minAnts&&this.ants.length<d.minAnts||d.reached&&this.progress.reached<d.reached)return 'locked';
      const c=this.researchCost(id);return this.availableFood().length>=c.food&&this.progress.cookie>=c.cookie?'ready':'cost';
    }
    buyResearch(id){
      if(this.researchStatus(id)!=='ready')return false;
      const cost=this.researchCost(id),food=this.availableFood().slice(0,cost.food);
      for(const b of food)this.physics.remove(b);
      this.colony.stats.spent+=cost.food;this.progress.cookie-=cost.cookie;this.progress.spentCookie+=cost.cookie;this.progress.research[id]++;
      for(const [key,rid]of Object.entries(UPGRADE_IDS))this.colony.upgrades[key]=this.level(rid);
      // Purchase never opens a grain. A subsequent ordinary plan/tick starts work.
      this.planAt=this.time;this.refreshDemand();this.log(BY_ID[id].name+'を研究しました。');return true;
    }
    buy(key){return this.buyResearch(UPGRADE_IDS[key]);}
    upgradeCost(key){return this.researchCost(UPGRADE_IDS[key])?.food??Infinity;}
    // Real colonies drop spoil as a low ring on both sides of the entrance.
    // Fill the nearest low ground first, outward from a clear apron.
    dumpSite(){
      const ex=this.entrance.x,height=x=>SURFACE-.9-this.surfacePoint(x+.5).y,all=[];
      // At each distance take the lower side; level sides alternate per load.
      const left=this.stats.delivered%2===0,preferred=x=>(x<ex)===left?1:0;
      for(let d=SPOIL_CLEAR;d<W;d++){
        const pair=[Math.floor(ex-d),Math.floor(ex+d)].filter(x=>x>=SPOIL_LEFT&&x<W-6&&!all.includes(x));all.push(...pair);
        const open=pair.filter(x=>height(x)<SPOIL_DUMP).sort((a,b)=>height(a)-height(b)||preferred(b)-preferred(a));
        if(open.length)return idx(open[0],SURFACE-1);
      }
      return idx(all.reduce((best,x)=>height(x)<height(best)?x:best),SURFACE-1);
    }
    // A loaded mound compacts into the ground beneath it, as rain and weight
    // do to real spoil. Only a resting delivered grain pressed on the ground
    // under a tall column joins the ground; the grains above slide down.
    settleSpoil(){
      const u=GRAIN.size,columns=new Map();
      for(const b of this.physics.bodies)if(b.kind==='soil'&&b.state==='delivered'&&!b.carrier&&b.rest>=30&&b.y<SURFACE&&this.physics.drag?.id!==b.id){
        const c=Math.floor(b.x/u),column=columns.get(c);if(column)column.push(b);else columns.set(c,[b]);
      }
      for(const column of columns.values()){
        if(column.length<=SPOIL_SETTLE)continue;const bottom=column.reduce((a,b)=>b.y>a.y?b:a);
        if(bottom.y<SURFACE-u)continue;this.physics.remove(bottom);this.stats.grainSettled++;
      }
    }
    afterMeal(e,larva){this.addWaste(WASTE_PER_MEAL,larva);}
    afterPupate(e,pupa){this.addWaste(WASTE_PER_PUPA,pupa);}
    addWaste(amount,larva){
      const w=this.colony.waste;w.due+=amount*(1-this.level('hygiene_1')*.1);
      while(w.due>=1){w.due-=1;const b=this.physics.spawn('waste',larva.x+(w.made%2?.3:-.3),larva.y,{state:'refuse'});this.physics.release(b);b.state='refuse';w.made++;this._wasteTick=-1;}
    }
    wasteInNest(){
      if(this._wasteTick!==this.ticks){this._wasteTick=this.ticks;const disposed=new Set(this.colony.refuse.map(r=>r.id));this._wasteList=this.physics.bodies.filter(b=>b.kind==='waste'&&!b.carrier&&b.y>=SURFACE&&!disposed.has(b.id));}
      return this._wasteList;
    }
    wasteFactor(larva){let n=0;for(const b of this.wasteInNest())if(Math.hypot(b.x-larva.x,b.y-larva.y)<WASTE_REACH)n++;return 1/(1+WASTE_SLOW*n);}
    startClean(ant){
      if(this.ticks%30!==0||ant.yielding||ant.yieldHold)return false;
      const claimed=new Set(this.ants.filter(a=>a.itemTask).map(a=>a.itemTask.body));
      const waste=this.wasteInNest().filter(b=>b.state==='refuse'&&b.rest>=30&&!claimed.has(b.id)&&this.physics.drag?.id!==b.id).sort((a,b)=>Math.hypot(a.x-ant.x,a.y-ant.y)-Math.hypot(b.x-ant.x,b.y-ant.y)||a.id-b.id);
      for(const b of waste)for(const p of this.itemAccess(b)){
        const route=this.path(ant,p.pose);if(route===null)continue;
        ant.itemTask={purpose:'clean',body:b.id,phase:'fetch',destination:p.cell,rid:1};ant.path=route;ant.next=0;delete ant.returning;return true;
      }return false;
    }
    cancelClean(ant){
      const b=this.physics.byId.get(ant.itemTask?.body);if(b?.carrier===ant.id){this.updateCarriers();this.physics.release(b);b.state='refuse';}
      delete ant.itemTask;ant.path=[];ant.next=0;ant.wait=.3;
    }
    cleanStep(ant,dt,occupancy){
      const task=ant.itemTask,b=this.physics.byId.get(task.body);if(!b){delete ant.itemTask;return true;}
      ant.task=task.phase==='fetch'?'travel':'haul';
      if(task.phase==='fetch'){
        if(this.move(ant,dt,occupancy)){
          if(b.carrier||Math.hypot(ant.x-b.x,ant.y-b.y)>1.6){this.cancelClean(ant);return true;}
          b.carrier=ant.id;b.state='cargo';b.rest=0;
          const room=this.wasteRoom();let dest,route=null;
          if(room!==undefined&&this.builds[room]?.complete&&this.transportReady(room)){dest=this.storageDestination(room,ant,'waste');if(dest!==undefined)route=this.storageRoute(ant,dest,'waste');if(route)task.rid=room;}
          if(!route){dest=this.dumpSite();route=this.path(ant,dest,'waste');task.rid=1;}
          if(!route){this.cancelClean(ant);return true;}
          task.phase='store';task.destination=dest;ant.path=route;ant.next=0;
        }
      }else if(this.move(ant,dt,occupancy)){
        if(task.rid>1){
          // Set down on the chamber floor; if the spot filled, go to the surface.
          const drop=this.storageDrop(task.rid,ant,'waste');
          if(!drop){const dest=this.dumpSite(),route=this.path(ant,dest,'waste');if(!route){this.cancelClean(ant);return true;}task.rid=1;task.destination=dest;ant.path=route;ant.next=0;return true;}
          ant.angle=drop.angle;this.updateCarriers();this.physics.release(b,0,0);
        }else{
          // Thrown outward at the real surface spot; it decays there over time.
          this.updateCarriers();this.physics.release(b,b.x<this.entrance.x?-1:1,-1);
        }
        b.state='refuse';this.colony.refuse.push({id:b.id,at:this.time});this._wasteTick=-1;delete ant.itemTask;ant.wait=.3;
      }return true;
    }
    // Two workers can meet head-on in a neck where each one's own trail curves
    // past the other, so neither can back out along it. Then the lower-ranked
    // one may give way along a planned route to nearby open room space, under
    // the same rule: the route never comes closer to the other worker.
    retreat(ant,other=null){
      if(super.retreat(ant,other))return true;
      if(!other||ant.yielding||(ant.blocked||0)<3)return false;
      if(!this._retreatTried)this._retreatTried=new Map();if(this.time-(this._retreatTried.get(ant.id)??-Infinity)<2)return false;this._retreatTried.set(ant.id,this.time);
      const kind=this.carriedKind(ant),limit=Math.min(.67,Math.hypot(other.x-ant.x,other.y-ant.y)),open=[];
      for(const rid of [1,...this.roomIds()])for(const cell of this.cells(rid)){const p=this.walkPoint(cell);if(p.valid&&p.clearance>.87&&Math.hypot(p.x-other.x,p.y-other.y)>2.6)open.push(p);}
      open.sort((a,b)=>Math.hypot(a.x-ant.x,a.y-ant.y)-Math.hypot(b.x-ant.x,b.y-ant.y));
      for(const p of open.slice(0,6)){
        const route=this.path(ant,p,kind);if(!route||route.length<2)continue;let previous=ant,clear=true,distance=0;
        for(const q of route){const dx=q.x-previous.x,dy=q.y-previous.y,t=Math.max(0,Math.min(1,((other.x-previous.x)*dx+(other.y-previous.y)*dy)/(dx*dx+dy*dy||1)));if(Math.hypot(other.x-previous.x-dx*t,other.y-previous.y-dy*t)<limit-1e-6){clear=false;break;}distance+=Math.hypot(dx,dy);previous=q;}
        if(!clear||distance<.8)continue;
        ant.resume={path:ant.path.slice(ant.next)};ant.path=route;ant.next=0;ant.yielding=true;ant.yieldFor=other.id;ant.trail=[];ant.detourTime=0;this.stats.yields++;return true;
      }return false;
    }
    stepItemTask(ant,dt,occupancy){
      if(ant.itemTask?.purpose==='clean')return this.cleanStep(ant,dt,occupancy);
      const busy=super.stepItemTask(ant,dt,occupancy);if(busy||ant.itemTask||ant.job!==null)return busy;
      // After お掃除はおまかせ a few idle foragers also take nest waste.
      if(ant.role==='forage'){if(!this.level('hygiene_3')||!this.wasteInNest().length)return false;const foragers=this.ants.filter(a=>a.role==='forage');if(foragers.filter(a=>a.itemTask?.purpose==='clean').length>=Math.max(1,Math.ceil(foragers.length*.08)))return false;}
      else if(ant.role!=='nurse')return false;
      return this.startClean(ant)?this.cleanStep(ant,dt,occupancy):false;
    }
    decayRefuse(){
      const w=this.colony.waste;
      const room=this.wasteRoom(),recycle=this.level('hygiene_recycle')&&room!==undefined;
      this.colony.refuse=this.colony.refuse.filter(r=>{const b=this.physics.byId.get(r.id);if(!b||b.carrier||b.state!=='refuse')return true;
        if(recycle&&this.time-r.at>=RECYCLE_AFTER&&this.grainRoom[GRAIN.at(b.x,b.y)]===room){
          // The same spot now holds one real food item, carried to a store as usual.
          const x=b.x,y=b.y;this.physics.remove(b);const f=this.physics.spawn('food',x,y,{state:'incoming'});this.physics.release(f);w.recycled++;return false;
        }
        if(this.time-r.at<REFUSE_LIFE)return true;this.physics.remove(b);w.decayed++;return false;});
    }
    assertLedger(){
      super.assertLedger();const w=this.colony.waste;if(!w)return true;
      const fail=()=>{throw new Error('ゴミの数が一致しません');},waste=this.physics.bodies.filter(b=>b.kind==='waste'),ids=new Set(this.colony.refuse.map(r=>r.id));
      if(waste.length!==w.made-w.decayed-(w.recycled||0)||ids.size!==this.colony.refuse.length)fail();
      for(const id of ids){const b=this.physics.byId.get(id);if(b?.kind!=='waste'||b.y>=SURFACE&&!b.carrier&&this.roomKind(this.grainRoom[GRAIN.at(b.x,b.y)])!=='waste')fail();}
      return true;
    }
    nurseryWaste(){
      if(this._nurseryTick!==this.ticks||this._wasteTick!==this.ticks){this.wasteInNest();this._nurseryTick=this.ticks;this._nurseryWaste=this._wasteList.filter(b=>this.roomKind(this.grainRoom[GRAIN.at(b.x,b.y)])==='egg').length;}
      return this._nurseryWaste;
    }
    wasteTolerance(){return Math.max(3,this.roomIds().filter(r=>this.roomKind(r)==='egg').reduce((n,r)=>n+this.roomCapacity(r),0)/4);}
    wasteRatio(){return this.nurseryWaste()/this.wasteTolerance();}
    freeAntId(){const used=new Set(this.ants.map(a=>a.id));for(let id=1;id<this.colony.nextAnt;id++)if(!used.has(id))return id;}
    tickDisease(){
      const d=this.colony.disease,ratio=this.wasteRatio();
      if(!d.active&&ratio>=DISEASE_ON){d.active=true;d.next=this.time+DISEASE_INTERVAL;this.log('育児室にゴミがたまり、病気が広がり始めました。');}
      else if(d.active&&ratio<DISEASE_OFF){d.active=false;this.log('巣がきれいになり、病気がおさまりました。');}
      if(!d.active||this.time<d.next)return;
      // Only a worker with nothing in hand and no work in progress falls sick,
      // so no dig, load or route is left half done. Foragers first.
      const idle=this.ants.filter(a=>a.job===null&&!a.itemTask&&!a.cargo&&!a.yielding&&!a.yieldHold&&!this.physics.bodies.some(b=>b.carrier===a.id));
      const victim=['forage','build','nurse'].map(r=>idle.filter(a=>a.role===r).sort((a,b)=>a.id-b.id)[0]).find(Boolean);if(!victim)return;
      this.ants=this.ants.filter(a=>a!==victim);for(const a of this.ants){if(a.waitingFor===victim.id)delete a.waitingFor;if(a.yieldFor===victim.id)delete a.yieldFor;}
      this.colony.stats.died++;d.next=this.time+DISEASE_INTERVAL;this.log('病気で働き手が1匹死にました。'+this.ants.length+'匹になりました。');
    }
    tick(dt){
      if(this.progress&&this.ticks%30===0){this.ensureDepthRooms();this.ensureWasteRoom();}
      super.tick(dt);if(!this.progress)return;
      if(this.ticks%60===0){this.settleSpoil();this.decayRefuse();this.tickDisease();}
      const awards=Math.floor(this.stats.grainDelivered/80);
      if(awards>this.progress.haulAwards){const delta=awards-this.progress.haulAwards;this.progress.haulAwards=awards;this.progress.cookie+=delta;this.progress.earned+=delta;}
      if(this.ticks%30===0)for(const a of this.ants){if(a.y<SURFACE)continue;const layer=this.layerAt(a.x,a.y);if(layer>this.progress.reached){this.progress.reached=layer;if(!this.progress.claims.includes(layer)){this.progress.claims.push(layer);const amount=layer*3;this.progress.cookie+=amount;this.progress.earned+=amount;this.log('第'+layer+'層に到達。クッキーを'+amount+'個見つけました。');}}}
    }
    status(){return {...super.status(),cookie:this.progress.cookie,reached:this.progress.reached,depthAbility:this.depthAbility(),populationLimit:this.populationLimit()};}
    dump(){this.assertProgress();return {...super.dump(),format:FORMAT,progress:structuredClone(this.progress)};}
    assertProgress(){
      const p=this.progress,int=(v,lo=0,hi=1e9)=>Number.isInteger(v)&&v>=lo&&v<=hi,fail=()=>{throw Error('研究と巣の記録が一致しません');};
      if(!p||!p.research||Object.keys(p.research).length!==ACTIVE.length||ACTIVE.some(d=>!int(p.research[d.id],0,d.max))||!int(p.cookie)||!int(p.earned)||!int(p.spentCookie)||p.cookie+p.spentCookie!==p.earned||!int(p.haulAwards)||p.haulAwards!==Math.floor(this.stats.grainDelivered/80)||!int(p.reached,1,6)||!Array.isArray(p.claims)||p.claims.length>6||new Set(p.claims).size!==p.claims.length||p.claims.some(v=>!int(v,1,p.reached))||!p.claims.includes(1)||!int(p.speed,1,10))fail();
      for(const d of ACTIVE)if(p.research[d.id]&&d.prereq&&!p.research[d.prereq])fail();
      for(const [key,id]of Object.entries(UPGRADE_IDS))if(this.colony.upgrades[key]!==this.level(id))fail();
      const earned=p.haulAwards+p.claims.filter(v=>v>1).reduce((n,v)=>n+v*3,0),cookieSpent=this.researchSpent('cookie'),foodSpent=this.researchSpent('food');
      if(p.earned!==earned||p.spentCookie!==cookieSpent||this.colony.stats.spent!==foodSpent||p.reached>this.depthAbility()||Math.max(...p.claims)!==p.reached)fail();
      if(this.ants.length+this.colony.brood.length>this.populationLimit())fail();return true;
    }
    static restore(pack){
      if(pack?.format!==FORMAT||!pack.progress)throw Error('この巣の保存データではありません');
      const life={...pack,format:'living-clicker-life-1'},s=Base.Simulation.restore(life);Object.setPrototypeOf(s,Simulation.prototype);s.progress=structuredClone(pack.progress);
      // A save from before a study was connected has no level for it: start it at 0.
      if(s.progress.research&&Object.keys(s.progress.research).every(id=>BY_ID[id]&&!BY_ID[id].planned))for(const d of ACTIVE)if(!(d.id in s.progress.research))s.progress.research[d.id]=0;
      // Waste arrived with the hygiene stage; a save without it has none yet.
      const c=s.colony,waste=s.physics.bodies.filter(b=>b.kind==='waste');
      if(c.waste===undefined&&c.refuse===undefined&&!waste.length){c.waste={due:0,made:0,decayed:0,recycled:0};c.refuse=[];}
      if(c.waste&&c.waste.recycled===undefined)c.waste.recycled=0;
      if(c.disease===undefined&&c.stats.died===undefined){c.disease={active:false,next:0};c.stats.died=0;}
      if(!c.disease||typeof c.disease.active!=='boolean'||!Number.isFinite(c.disease.next)||!Number.isInteger(c.stats.died)||c.stats.died<0)throw Error('病気の記録が正しくありません');
      const int=v=>Number.isInteger(v)&&v>=0;
      if(!c.waste||!Number.isFinite(c.waste.due)||c.waste.due<0||c.waste.due>=1||!int(c.waste.made)||!int(c.waste.decayed)||!int(c.waste.recycled)||c.waste.decayed+c.waste.recycled>c.waste.made||!Array.isArray(c.refuse)||c.refuse.some(r=>!int(r.id)||!Number.isFinite(r.at)||r.at>s.time))throw Error('ゴミの記録が正しくありません');
      for(const a of s.ants)if(a.itemTask?.purpose==='clean'){const b=s.physics.byId.get(a.itemTask.body);if(!(a.role==='nurse'||a.role==='forage'&&s.level('hygiene_3'))||b?.kind!=='waste'||a.itemTask.target!==undefined)throw Error('掃除の記録が正しくありません');}
      const kinds=s.rooms.slice(2).map(r=>r.kind);if(kinds.some(k=>k!==undefined&&!['egg','food','waste'].includes(k))||kinds.filter(k=>k==='waste').length>1||s.rooms.slice(2).some(r=>r.layer!==undefined&&!(Number.isInteger(r.layer)&&r.layer>=1&&r.layer<=6)))throw Error('部屋の用途の記録が正しくありません');
      s.assertLedger();s.assertProgress();
      for(const [id,b]of s.builds.entries())if(id>=4&&b&&(!Number.isFinite(b.minLength)||b.minLength<6||b.minLength>80||!Number.isFinite(b.minDepth)||b.minDepth<SURFACE||b.minDepth>H))throw Error('深い部屋の記録が正しくありません');
      for(const b of s.builds)if(b?.avoided&&(!Array.isArray(b.avoided)||b.avoided.length>512||b.avoided.some(p=>!Number.isFinite(p.x)||!Number.isFinite(p.y)||!Number.isFinite(p.angle)||p.x<0||p.x>W||p.y<SURFACE||p.y>H)))throw Error('掘削の方向の記録が正しくありません');
      for(const job of s.jobs)for(const g of job.grains.slice(job.cursor))if(s.layerAt(GRAIN.center(g).x,GRAIN.center(g).y)>s.depthAbility())throw Error('未解放の地層を掘る仕事があります');
      return s;
    }
  }
  return {...Base,Simulation,KEY:'livingClicker_1',SAVE_FORMAT:FORMAT,RESEARCH,BY_ID,ACTIVE};
});
