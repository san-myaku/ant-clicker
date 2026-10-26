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
    {id:'ferment_unlock',name:'発酵室解放',branch:'発酵',desc:'食料庫の奥に発酵室を掘る。運び込んだ餌が甘い粒に変わり、女王室へ届くとクッキーになる',food:20,cookie:8,max:1,minAnts:30},
    {id:'ferment_1',name:'発酵短縮I',branch:'発酵',desc:'発酵にかかる時間 45秒 → 38秒',food:10,cookie:3,max:1,prereq:'ferment_unlock'},
    {id:'ferment_2',name:'甘味濃縮',branch:'発酵',desc:'10回の発酵に1回、甘い粒がもう1つできる',food:12,cookie:4,max:1,prereq:'ferment_1'},
    {id:'ferment_3',name:'原料節約',branch:'発酵',desc:'1回の発酵に使う餌 6個 → 5個',food:14,cookie:5,max:1,prereq:'ferment_2'},
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
    {id:'soldier_jaw_2x',name:'顎強化',branch:'防衛',desc:'見張りの組み合う力 +25%',food:10,cookie:2,max:3},
    {id:'poison_jaw',name:'毒顎',branch:'防衛',desc:'組み合った侵入者の力 -20%',food:14,cookie:4,max:1,prereq:'soldier_jaw_2x'},
    {id:'poison_conc',name:'毒の濃度',branch:'防衛',desc:'組み合った侵入者の力 -4%（くり返し研究できる）',food:8,cookie:3,max:Infinity,growth:1.5,prereq:'poison_jaw'},
    {id:'oshiai',name:'おしあいへしあい',branch:'防衛',desc:'見張りが仲間の組み合いに加勢できる距離 +50%',food:12,cookie:4,max:1,prereq:'soldier_jaw_2x'},
    {id:'numbers_win',name:'数は何にも勝る',branch:'防衛',desc:'兵隊アリの雇用コスト -40%、以後 -10%/Lv。ただし各兵隊の兵力 -20%、以後 -5%/Lv（無限）。',planned:true},
    {id:'raid_spoils',name:'戦果',branch:'防衛',desc:'倒した侵入者から得る餌 +1個',food:10,cookie:3,max:3},
    {id:'early_warning',name:'早期警戒',branch:'防衛',desc:'偵察アリが帰ってから襲撃隊が来るまで 40秒 → 80秒',food:12,cookie:3,max:1},
    {id:'formic_acid',name:'ギ酸噴射',branch:'防衛',desc:'見張りが組み合うと、そばの侵入者も3秒足が止まる',food:16,cookie:6,max:1,prereq:'soldier_jaw_2x'},
    {id:'formic_conc',name:'ギ酸の濃縮',branch:'防衛',desc:'ギ酸で足が止まる時間 +1秒',food:10,cookie:4,max:3,growth:1.5,prereq:'formic_acid'},
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
  const WASTE_ROOM_BASE=6,RECYCLE_AFTER=60,LABELS={egg:'育児室',food:'食料庫',waste:'ゴミ室',ferment:'発酵室'};
  // Fermentation: a batch of real food resting in the chamber turns into a
  // sweet grain; the chamber only takes food while the stores keep a reserve.
  const FERMENT_BATCH=6,FERMENT_TIME=45,FERMENT_ROOM=10;
  // Raids: once the nest has RAID_FROM workers a neighbouring colony sends a
  // scout every RAID_GAP seconds; a scout that gets home brings a party after
  // RAID_AFTER_SCOUT seconds. Contact starts a grapple of FIGHT_TIME seconds.
  const RAID_FROM=40,RAID_GAP=[480,840],RAID_AFTER_SCOUT=40,RAID_SPACING=1.5,FIGHT_TIME=3,CONTACT=.8,ENEMY_FIRST=200,ENEMY_LAST=249;
  const STRENGTH={guard:1,worker:.5,raider:1,scout:.5},HELP=.5,HELP_REACH=1.5,HELP_MAX=2;
  // Alarm pheromone: a tap within ALARM_TOUCH of an intruder calls up to
  // ALARM_RECRUIT free workers within ALARM_REACH to it for ALARM_TIME seconds.
  const ALARM_TOUCH=2,ALARM_REACH=6,ALARM_RECRUIT=6,ALARM_TIME=10,ACID_TIME=3,ACID_REACH=1.5,RAID_PHASES=['quiet','scout','coming','attack'];
  const UPGRADE_IDS={walk:'gather_1',brood:'brood_1',dig:'dig_speed'};
  class Simulation extends Base.Simulation{
    constructor(seed=24014){
      super(seed);
      this.progress={research:Object.fromEntries(ACTIVE.map(d=>[d.id,0])),cookie:0,earned:0,spentCookie:0,haulAwards:0,reached:1,claims:[1],speed:1};
      this.colony.waste={due:0,made:0,decayed:0,recycled:0};this.colony.refuse=[];this.colony.disease={active:false,next:0};this.colony.stats.died=0;this.colony.ferment={batch:[],startedAt:0,used:0,made:0,credited:0,batches:0};this.colony.raid=Simulation.quietRaid();
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
      if(body){const rid=this.grainRoom[GRAIN.at(body.x,body.y)];if(rid>=2&&(this.roomKind(rid)===kind||kind==='food'&&this.roomKind(rid)==='ferment')&&this.transportReady(rid))return rid;}
      return this.roomIds().filter(r=>this.roomKind(r)===kind&&this.transportReady(r)).sort((a,b)=>a-b)[0]||1;
    }
    receivingRoom(body){
      if(!this.colony)return super.receivingRoom(body);
      const current=this.grainRoom[GRAIN.at(body.x,body.y)];
      // Items picked to move leave their room even though it suits their kind.
      if(this._relocate?.has(body.id))return current===1?null:1;
      if(body.kind==='food'&&this._fermentPick?.has(body.id)&&this.fermentReady()!==undefined)return this.fermentReady();
      if(current>=2&&this.roomKind(current)===body.kind&&this.transportReady(current))return null;
      if(body.kind==='food'){const r=this.fermentReady();if(r!==undefined&&current!==r){
        const queued=this.fermentFood(r).length+this.ants.filter(a=>a.itemTask?.rid===r).length;
        if(queued<this.fermentBatch()&&this.foodBodies(true).length>=Math.ceil(this.ants.length*.5)&&this.storageDestination(r,{cell:idx(48,24)},'food')!==undefined)return r;
      }}
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
      for(const rid of this.roomIds().filter(id=>this.roomKind(id)==='ferment'))result.push({rid,wanted:FERMENT_ROOM,d:FERMENT_ROOM-this.roomCapacity(rid)});
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
    // A purpose room is dug from a real parent room's wall toward the side
    // and depth farthest from every existing room, so refuse sits apart from
    // brood and food. Only the tip then chooses the grains it opens.
    digPurposeRoom(kind,parent,message){
      const anchor=this.rooms[parent],others=[1,...this.roomIds()].map(r=>this.rooms[r]),stock=this.physics.bodies.filter(b=>!b.carrier&&b.kind!=='soil'),plans=[];
      for(const side of [-1,1])for(const dy of [1,5,-3]){const target={x:Math.max(8,Math.min(W-8,anchor.x+side*10)),y:Math.max(SURFACE+3,Math.min(H-6,anchor.y+dy))};plans.push({side,dy,score:Math.min(...others.map(r=>Math.hypot(r.x-target.x,r.y-target.y)))});}
      plans.sort((a,b)=>b.score-a.score||a.side-b.side||a.dy-b.dy);
      for(const {side,dy} of plans){
        // Start away from stored piles, as deep rooms do: widening the access
        // lane must never have to undermine stock resting on its walls.
        const angle=side>0?0:Math.PI,poses=[];
        for(const cell of this.cells(parent)){const p=this.walkPoint(cell);if(p.valid&&this.grainRoom[GRAIN.at(p.x,p.y)]===parent&&this.poseClear({...p,angle})){
          const density=stock.reduce((n,b)=>n+Math.exp(-((b.x-p.x)**2+(b.y-p.y)**2)/2),0);poses.push({...p,angle,score:(p.x-anchor.x)*side-Math.abs(p.y-anchor.y-dy)*.3-density*2});
        }}
        poses.sort((a,b)=>b.score-a.score);
        for(const origin of poses.slice(0,12)){
          const target={x:Math.max(8,Math.min(W-8,origin.x+side*8)),y:Math.max(SURFACE+3,Math.min(H-6,origin.y+dy))};
          if(this.layerAt(target.x,target.y)>this.depthAbility())continue;
          let probe=origin;const recent=[];let open=true;
          for(let n=0;n<6;n++){const next=this.nextTip(probe,target,.5,recent);if(!next){open=false;break;}recent.push(probe);probe=next;}
          if(!open)continue;const rid=this.rooms.length;
          this.rooms.push({id:rid,...target,kind,layer:this.layerAt(target.x,target.y)});
          this.builds.push({tip:{x:origin.x,y:origin.y,angle:origin.angle},target,history:[{x:origin.x,y:origin.y,angle:origin.angle}],length:0,mode:'passage',complete:false,next:null,minDepth:SURFACE+1,minLength:6});
          this.log(message);return;
        }
      }
    }
    ensureWasteRoom(){
      if(this.level('hygiene_3')&&this.wasteRoom()===undefined&&this.rooms[2]&&this.rooms[3])this.digPurposeRoom('waste',1,'ゴミ室へ、掘り進めます。');
    }
    fermentRoom(){return this.roomIds().find(r=>this.roomKind(r)==='ferment');}
    keepIncoming(b){return !!(this._relocate?.has(b.id)||this._fermentPick?.has(b.id));}
    // Stock may come to rest on a grain that the access lane of a finished
    // purpose room still has to open. Digging never undermines stock, so the
    // workers move those items to the queen chamber's staging floor first.
    clearLaneStock(){
      if(!this._relocate)this._relocate=new Set();
      for(const id of this._relocate){const b=this.physics.byId.get(id);if(!b||b.carrier===0&&b.rest>=30&&this.grainRoom[GRAIN.at(b.x,b.y)]===1)this._relocate.delete(id);}
      const claimed=new Set(this.ants.filter(a=>a.itemTask).map(a=>a.itemTask.body));
      for(const rid of [this.wasteRoom(),this.fermentRoom()]){
        const b=rid===undefined?null:this.builds[rid];if(!b?.complete||this.transportReady(rid))continue;
        const profile=this.transportProfile(b.history);if(!profile)continue;
        for(let k=0;k<b.history.length;k++){
          const q=b.history[k],shift=profile[k],width=this.laneWidth(b.history,k),c=Math.cos(q.angle),s=Math.sin(q.angle);
          for(const p of [{x:q.x-s*(shift+width),y:q.y+c*(shift+width),angle:q.angle},{x:q.x-s*(shift-width),y:q.y+c*(shift-width),angle:q.angle}]){
            if(this.poseClear(p,'soil')||!(this._block>=0)||!this.supportsStock(this._block))continue;const g=GRAIN.center(this._block);
            for(const body of this.physics.bodies)if(body.kind!=='soil'&&!body.carrier&&body.rest>=30&&!claimed.has(body.id)&&Math.abs(g.x-body.x)<Base.Physics.SHAPES[body.kind].hx+.14&&g.y>=body.y+Base.Physics.SHAPES[body.kind].hy-.01&&g.y<body.y+Base.Physics.SHAPES[body.kind].hy+.35&&['stored','incoming'].includes(body.state)){this._relocate.add(body.id);body.state='incoming';}
          }
        }
      }
    }
    ensureFermentRoom(){
      // Dug from the food store, where its food comes from.
      if(this.level('ferment_unlock')&&this.fermentRoom()===undefined&&this.builds[3]?.complete)this.digPurposeRoom('ferment',3,'発酵室へ、掘り進めます。');
    }
    fermentReady(){const r=this.fermentRoom();return r!==undefined&&this.builds[r]?.complete&&this.transportReady(r)?r:undefined;}
    fermentBatch(){return FERMENT_BATCH-this.level('ferment_3');}
    // Food committed to the chamber cannot be eaten or spent.
    foodBodies(usable=false){const all=super.foodBodies(usable),r=this.progress&&this.fermentRoom();return r===undefined||!r?all:all.filter(b=>b.carrier||this.grainRoom[GRAIN.at(b.x,b.y)]!==r);}
    fermentFood(r){return this.physics.bodies.filter(b=>b.kind==='food'&&!b.carrier&&this.grainRoom[GRAIN.at(b.x,b.y)]===r);}
    tickFerment(){
      const f=this.colony.ferment,r=this.fermentRoom();if(r===undefined)return;
      if(f.batch.length){
        const bodies=f.batch.map(id=>this.physics.byId.get(id));
        if(bodies.some(b=>!b||b.carrier||this.grainRoom[GRAIN.at(b.x,b.y)]!==r)){f.batch=[];return;}
        if(this.time-f.startedAt<FERMENT_TIME-this.level('ferment_1')*7)return;
        const at=bodies[0],n=1+(this.level('ferment_2')&&(f.batches+1)%10===0?1:0);
        for(const b of bodies)this.physics.remove(b);f.used+=bodies.length;f.batches++;f.batch=[];
        for(let k=0;k<n;k++){const c=this.physics.spawn('cookie',at.x+k*.3,at.y,{state:'incoming'});this.physics.release(c);f.made++;}
        this.log('発酵室で甘い粒ができました。女王室へ運びます。');return;
      }
      const food=this.fermentFood(r).filter(b=>b.rest>=30).sort((a,b)=>a.id-b.id);
      if(food.length>=this.fermentBatch()){f.batch=food.slice(0,this.fermentBatch()).map(b=>b.id);f.startedAt=this.time;return;}
      // While filling, workers also move resting stock from the stores, as long
      // as the stores keep a reserve. The item system carries each one.
      if(this.fermentReady()===undefined)return;
      const queued=this.fermentFood(r).length+this.ants.filter(a=>a.itemTask?.rid===r).length,claimed=new Set(this.ants.filter(a=>a.itemTask).map(a=>a.itemTask.body));
      const spare=this.foodBodies(true).length-Math.ceil(this.ants.length*.5),stock=this.foodBodies(true).filter(b=>b.state==='stored'&&!claimed.has(b.id)&&this.roomKind(this.grainRoom[GRAIN.at(b.x,b.y)])==='food');
      this._fermentPick=new Set(stock.sort((a,b)=>Math.hypot(a.x-this.rooms[r].x,a.y-this.rooms[r].y)-Math.hypot(b.x-this.rooms[r].x,b.y-this.rooms[r].y)||a.id-b.id).slice(0,Math.max(0,Math.min(this.fermentBatch()-queued,spare))).map(b=>b.id));
      for(const id of this._fermentPick)this.physics.byId.get(id).state='incoming';
    }
    creditCookies(){
      // A sweet grain set down in the queen chamber is offered and counted.
      for(const c of this.physics.bodies.filter(b=>b.kind==='cookie'&&!b.carrier&&b.state==='stored'&&b.rest>=30&&this.grainRoom[GRAIN.at(b.x,b.y)]===1)){
        this.physics.remove(c);this.colony.ferment.credited++;this.progress.cookie++;this.progress.earned++;
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
      if(ant.fight)return true;if(ant.alarm)return this.alarmStep(ant,dt,occupancy);if(ant.role==='guard')return this.guardStep(ant,dt,occupancy);
      if(ant.itemTask?.purpose==='clean')return this.cleanStep(ant,dt,occupancy);
      const busy=super.stepItemTask(ant,dt,occupancy);if(busy||ant.itemTask||ant.job!==null)return busy;
      // After お掃除はおまかせ a few idle foragers also take nest waste.
      if(ant.role==='forage'){if(!this.level('hygiene_3')||!this.wasteInNest().length||this.ticks%30!==0)return false;const foragers=this.ants.filter(a=>a.role==='forage');if(foragers.filter(a=>a.itemTask?.purpose==='clean').length>=Math.max(1,Math.ceil(foragers.length*.08)))return false;}
      else if(ant.role!=='nurse')return false;
      return this.startClean(ant)?this.cleanStep(ant,dt,occupancy):false;
    }
    returnSpilled(){
      // A pellet that rolled out of the waste chamber and came to rest in the
      // nest is nest waste again; the cleaners carry it back.
      const list=this.colony.refuse;if(!list.length)return;
      const kept=list.filter(x=>{const b=this.physics.byId.get(x.id);return !(b&&!b.carrier&&b.rest>=30&&b.y>=SURFACE&&this.roomKind(this.grainRoom[GRAIN.at(b.x,b.y)])!=='waste');});
      if(kept.length!==list.length){this.colony.refuse=kept;this._wasteTick=-1;}
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
      super.assertLedger();if(this.colony.raid)this.checkRaid();const w=this.colony.waste;if(!w)return true;
      const fail=()=>{throw new Error('ゴミの数が一致しません');},waste=this.physics.bodies.filter(b=>b.kind==='waste'),ids=new Set(this.colony.refuse.map(r=>r.id));
      if(waste.length!==w.made-w.decayed-(w.recycled||0)||ids.size!==this.colony.refuse.length)fail();
      const f=this.colony.ferment;if(f&&this.physics.bodies.filter(b=>b.kind==='cookie').length!==f.made-f.credited)throw new Error('甘い粒の数が一致しません');
      // A pellet set down in the chamber is released at the mouth and is
      // judged once it has come to rest on the floor.
      for(const id of ids){const b=this.physics.byId.get(id);if(b?.kind!=='waste'||b.y>=SURFACE&&!b.carrier&&b.rest>=30&&this.roomKind(this.grainRoom[GRAIN.at(b.x,b.y)])!=='waste')fail();}
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
    static quietRaid(){return {phase:'quiet',next:0,serial:0,side:1,attackAt:0,spawnAt:0,pending:0,size:0,fights:0,enemies:[],round:{killed:0,lost:0,brood:0,food:0},raids:0,scouts:0,killed:0,lost:0,stolenBrood:0,stolenFood:0,prey:0,stuns:0};}
    shiftRole(role,delta){
      // A guard is only assigned on purpose: other roles neither give to nor
      // take from it, so the three working roles keep their previous balance.
      const main=['forage','nurse','build'];if(!Base.ROLES.includes(role)||![-1,1].includes(delta))return false;
      const counts=this.roleCounts(true),others=main.filter(r=>r!==role).sort((a,b)=>counts[b]-counts[a]||main.indexOf(a)-main.indexOf(b));
      if(delta>0){const donor=others.find(r=>counts[r]>0);if(!donor)return false;counts[donor]--;counts[role]++;}
      else{if(!counts[role])return false;counts[role]--;counts[others.at(-1)]++;}
      return this.setRoles(counts);
    }
    roll(a,b){return hash(a,b,this.seed^0x5a17)/4294967296;}
    enemyById(id){return this.colony?.raid?.enemies.find(e=>e.id===id);}
    guardPosts(){
      // Standing places down the entrance shaft, from its mouth inward.
      const shaft=this.entranceHistory||[],out=[];
      for(let k=shaft.length-1;k>=0&&out.length<12;k--){const p=shaft[k];if(p.y<SURFACE+.6||out.some(q=>Math.hypot(q.x-p.x,q.y-p.y)<1))continue;out.push({x:p.x,y:p.y,angle:p.angle});}
      return out;
    }
    guardStep(ant,dt,occupancy){
      ant.task='idle';if(ant.path.length){this.move(ant,dt,occupancy);return true;}
      const guards=this.ants.filter(a=>a.role==='guard').sort((a,b)=>a.id-b.id),posts=this.guardPosts(),post=posts[guards.indexOf(ant)%Math.max(1,posts.length)];
      if(!post||Math.hypot(ant.x-post.x,ant.y-post.y)<.2)return true;
      if((ant.wait=Math.max(0,ant.wait-dt))>0)return true;
      const route=this.path(ant,post,null);ant.path=route||[];ant.next=0;ant.wait=route?0:2;return true;
    }
    edgePose(e,inward){const x=e.side<0?1.2:W-1.2,p=this.surfacePoint(x);return {x:p.x,y:p.y,angle:(e.side<0)===inward?0:Math.PI};}
    spawnEnemy(kind){
      const r=this.colony.raid,used=new Set(r.enemies.map(e=>e.id));let id=ENEMY_FIRST;while(used.has(id)&&id<ENEMY_LAST)id++;if(used.has(id))return null;
      const e={id,kind,side:r.side,phase:'in',task:'idle',job:null,enemy:true,path:[],next:0,trail:[],walked:0,wait:0},p=this.edgePose(e,true);
      Object.assign(e,p,{cell:idx(Math.min(W-1,Math.floor(p.x)),Math.floor(p.y))});r.enemies.push(e);return e;
    }
    removeEnemy(e){const r=this.colony.raid;r.enemies=r.enemies.filter(x=>x!==e);for(const a of this.ants)if(a.alarm?.enemy===e.id)this.calmDown(a);}
    stealable(e){
      // Brood and stored food inside the nest that nobody is handling.
      const claimed=new Set(),ferment=new Set(this.colony.ferment?.batch||[]);
      for(const a of this.ants)if(a.itemTask){claimed.add(a.itemTask.body);if(a.itemTask.target!==undefined)claimed.add(a.itemTask.target);}
      for(const x of this.colony.raid.enemies)if(x!==e&&x.target!==undefined)claimed.add(x.target);
      return this.physics.bodies.filter(b=>(b.kind==='egg'||b.kind==='food'&&!this.colony.wild.includes(b.id))&&!b.carrier&&b.rest>=30&&b.y>=SURFACE&&!claimed.has(b.id)&&!ferment.has(b.id)&&this.physics.drag?.id!==b.id)
        .sort((a,b)=>Math.hypot(a.x-e.x,a.y-e.y)-Math.hypot(b.x-e.x,b.y-e.y)||a.id-b.id);
    }
    planEnemy(e){
      e.wait=1;delete e.target;
      if(e.phase==='out'){const route=this.path(e,this.edgePose(e,false),this.carriedKind(e));if(route){e.path=route;e.next=0;}else if(e.itemTask)this.dropLoot(e);return;}
      if(e.kind==='scout'){const post=this.guardPosts()[0];if(!post){e.phase='out';return;}const route=this.path(e,{...post,angle:post.angle+Math.PI},null)||this.path(e,post,null);if(route){e.path=route;e.next=0;}return;}
      if((e.skip||[]).length<3)for(const b of this.stealable(e).filter(b=>!e.skip?.includes(b.id)).slice(0,3))for(const a of this.itemAccess(b)){const route=this.path(e,a.pose,null);if(route){e.path=route;e.next=0;e.target=b.id;return;}}
      e.phase='out';e.wait=0;
    }
    enemyArrived(e){
      const r=this.colony.raid;
      if(e.phase==='out'){
        if(Math.abs(e.x-this.edgePose(e,false).x)>.3){e.wait=0;return;}
        const b=this.physics.byId.get(e.itemTask?.body);
        if(b){const brood=b.kind==='egg';this.physics.remove(b);if(brood){this.colony.brood=this.colony.brood.filter(x=>x.id!==b.id);r.stolenBrood++;r.round.brood++;}else{r.stolenFood++;r.round.food++;}}
        this.removeEnemy(e);
        if(e.kind==='scout'){r.phase='coming';r.attackAt=this.time+RAID_AFTER_SCOUT*(1+this.level('early_warning'));r.spawnAt=r.attackAt;r.size=r.pending=Math.min(6,1+Math.floor(this.ants.length/25));this.log('偵察アリが巣の場所を持ち帰りました。まもなく襲撃隊が来ます。');}
        return;
      }
      if(e.kind==='scout'){e.phase='out';e.wait=0;return;}
      const b=this.physics.byId.get(e.target);
      if(!b||b.carrier||Math.hypot(e.x-b.x,e.y-b.y)>1.6||!this.stealable(e).includes(b)){e.wait=0;delete e.target;return;}
      // Take it only if it can be carried out of the nest from here.
      const route=this.path(e,this.edgePose(e,false),b.kind);delete e.target;
      if(!route){(e.skip||(e.skip=[])).push(b.id);e.wait=0;return;}
      b.carrier=e.id;b.state='cargo';b.rest=0;e.itemTask={phase:'store',body:b.id};this.updateCarriers();e.phase='out';e.path=route;e.next=0;
    }
    dropLoot(e){const b=this.physics.byId.get(e.itemTask.body);this.updateCarriers();this.physics.release(b);b.state='incoming';delete e.itemTask;e.wait=0;}
    alarmAt(x,y,touch=ALARM_TOUCH){
      // A tap on an intruder releases alarm pheromone: free workers nearby
      // run to it and grapple. Busy workers and guards keep to their places.
      const r=this.colony.raid;let e=null,d=touch;for(const x0 of r?.enemies||[]){const v=Math.hypot(x0.x-x,x0.y-y);if(v<d){d=v;e=x0;}}
      if(!e)return 0;
      const free=this.ants.filter(a=>a.role!=='guard'&&!a.fight&&!a.alarm&&a.job===null&&!a.itemTask&&!a.cargo&&!a.yielding&&!a.yieldHold&&Math.hypot(a.x-e.x,a.y-e.y)<ALARM_REACH)
        .sort((a,b)=>Math.hypot(a.x-e.x,a.y-e.y)-Math.hypot(b.x-e.x,b.y-e.y)||a.id-b.id).slice(0,ALARM_RECRUIT);
      for(const a of free){a.alarm={enemy:e.id,until:this.time+ALARM_TIME};a.path=[];a.next=0;a.wait=0;delete a.returning;}
      return free.length;
    }
    calmDown(a){delete a.alarm;a.path=[];a.next=0;a.wait=.3;}
    alarmStep(ant,dt,occupancy){
      const e=this.enemyById(ant.alarm.enemy);ant.task='idle';
      if(!e||this.time>=ant.alarm.until){this.calmDown(ant);return false;}
      const end=ant.path.at(-1);
      if(ant.path.length&&end&&Math.hypot(end.x-e.x,end.y-e.y)<1){this.move(ant,dt,occupancy);return true;}
      if((ant.wait=Math.max(0,ant.wait-dt))>0)return true;
      const route=this.path(ant,{x:e.x,y:e.y,angle:Math.atan2(e.y-ant.y,e.x-ant.x)},null);ant.path=route||[];ant.next=0;ant.wait=route?.5:1;return true;
    }
    grappleOdds(a,e){
      // Chance that the colony side wins: its ant plus guards or called
      // workers close by, against the intruder.
      const reach=HELP_REACH*(1+.5*this.level('oshiai')),helpers=this.ants.filter(x=>x!==a&&(x.role==='guard'||x.alarm)&&!x.fight&&Math.hypot(x.x-e.x,x.y-e.y)<reach).length;
      const own=(a.role==='guard'?STRENGTH.guard*(1+.25*this.level('soldier_jaw_2x')):STRENGTH.worker)+Math.min(HELP_MAX,helpers*HELP),their=STRENGTH[e.kind]*(1-.2*this.level('poison_jaw'))*.96**this.level('poison_conc');
      return own/(own+their);
    }
    defenderFor(e){
      // Guards take on intruders; the other workers keep to their work.
      let best=null,d=CONTACT;
      for(const a of this.ants){if(a.fight||a.role!=='guard'&&!a.alarm)continue;const v=Math.hypot(a.x-e.x,a.y-e.y);if(v<d){d=v;best=a;}}
      return best;
    }
    killAnt(a){
      const w=this.colony.waste;this.ants=this.ants.filter(x=>x!==a);for(const x of this.ants){if(x.waitingFor===a.id)delete x.waitingFor;if(x.yieldFor===a.id)delete x.yieldFor;}
      this.colony.stats.died++;
      // The body is refuse that the nurses carry out like any other waste.
      const b=this.physics.spawn('waste',a.x,a.y,{state:'refuse'});this.physics.release(b);b.state='refuse';w.made++;this._wasteTick=-1;
    }
    killEnemy(e){
      const r=this.colony.raid;if(e.itemTask)this.dropLoot(e);
      this.removeEnemy(e);r.killed++;r.round.killed++;
      // A fallen raider is prey: real food the foragers bring to the stores.
      for(let k=0,n=1+this.level('raid_spoils');k<n;k++){const prey=this.physics.spawn('food',e.x+(k-(n-1)/2)*.35,e.y,{state:'incoming'});this.physics.release(prey);r.prey++;}
      if(e.kind==='scout'){r.phase='quiet';r.next=this.time+this.raidGap();this.log('偵察アリを倒しました。');}
    }
    checkRaid(){
      const r=this.colony.raid,fail=()=>{throw Error('襲撃の記録が正しくありません');},int=v=>Number.isInteger(v)&&v>=0,num=v=>Number.isFinite(v),pose=p=>p&&num(p.x)&&num(p.y)&&num(p.angle)&&p.x>=0&&p.x<=W&&p.y>=0&&p.y<=H;
      if(!r||!RAID_PHASES.includes(r.phase)||![r.next,r.attackAt,r.spawnAt].every(num)||![-1,1].includes(r.side)||![r.serial,r.pending,r.size,r.fights,r.raids,r.scouts,r.killed,r.lost,r.stolenBrood,r.stolenFood,r.prey,r.stuns].every(int)||r.pending>r.size||r.size>6)fail();
      if(!r.round||![r.round.killed,r.round.lost,r.round.brood,r.round.food].every(int)||!Array.isArray(r.enemies)||r.enemies.length>ENEMY_LAST-ENEMY_FIRST+1||r.prey<r.killed)fail();
      const ids=new Set(),carried=new Set();
      for(const e of r.enemies){
        if(e.stun!==undefined&&!Number.isFinite(e.stun))fail();
        if(e.skip!==undefined&&(!Array.isArray(e.skip)||e.skip.length>3||!e.skip.every(n=>Number.isInteger(n)&&n>0)))fail();
        if(!Number.isInteger(e.id)||e.id<ENEMY_FIRST||e.id>ENEMY_LAST||ids.has(e.id)||!['scout','raider'].includes(e.kind)||!['in','out'].includes(e.phase)||e.enemy!==true||e.job!==null||e.side!==r.side||!pose(e)||!Array.isArray(e.path)||!e.path.every(pose)||!Number.isInteger(e.next)||e.next<0||e.next>Math.max(0,e.path.length-1)||!num(e.wait))fail();
        ids.add(e.id);
        if(e.itemTask){const b=this.physics.byId.get(e.itemTask.body);if(e.kind!=='raider'||e.phase!=='out'||e.itemTask.phase!=='store'||!b||b.carrier!==e.id||!['egg','food'].includes(b.kind))fail();carried.add(b.id);}
        if(e.fight){const a=this.ants.find(a=>a.id===e.fight.ant);if(!a||a.fight?.enemy!==e.id||a.fight.until!==e.fight.until||!num(e.fight.until))fail();}
      }
      for(const a of this.ants)if(a.fight&&this.enemyById(a.fight.enemy)?.fight?.ant!==a.id||a.alarm&&(!this.enemyById(a.alarm.enemy)||!num(a.alarm.until)||a.role==='guard'||a.job!==null||a.itemTask))fail();
      for(const b of this.physics.bodies)if(b.carrier>=ENEMY_FIRST&&!carried.has(b.id))fail();
      if(r.enemies.some(e=>e.kind==='scout')&&r.phase!=='scout'||r.phase==='scout'&&r.enemies.some(e=>e.kind==='raider'))fail();
      return true;
    }
    raidGap(){const r=this.colony.raid;return RAID_GAP[0]+this.roll(r.serial,1)*(RAID_GAP[1]-RAID_GAP[0]);}
    tickRaid(dt){
      const r=this.colony.raid;
      if(r.phase==='quiet'){
        if(this.ants.length<RAID_FROM)return;
        if(!r.next){r.next=this.time+this.raidGap();return;}
        if(this.time<r.next)return;
        r.serial++;r.side=this.roll(r.serial,2)<.5?-1:1;r.phase='scout';r.round={killed:0,lost:0,brood:0,food:0};r.scouts++;
        if(this.spawnEnemy('scout'))this.log('見知らぬアリが巣の近くを歩いています。');
      }
      if(r.phase==='coming'&&this.time>=r.spawnAt&&r.pending>0){
        if(this.spawnEnemy('raider')){if(r.pending===r.size){r.raids++;this.log('襲撃隊が来ました（'+r.size+'匹）。');}r.pending--;}
        r.spawnAt=this.time+RAID_SPACING;if(!r.pending)r.phase='attack';
      }
      for(const e of r.enemies.slice()){
        if(e.fight){
          if(this.time<e.fight.until)continue;
          const a=this.ants.find(x=>x.id===e.fight.ant);delete e.fight;
          if(!a)continue;delete a.fight;
          if(this.roll(r.serial*4096+r.fights++,3)<this.grappleOdds(a,e))this.killEnemy(e);
          else{this.killAnt(a);r.lost++;r.round.lost++;}
          continue;
        }
        const a=this.defenderFor(e);
        if(a){e.fight={ant:a.id,until:this.time+FIGHT_TIME};a.fight={enemy:e.id,until:e.fight.until};
          continue;}
        // Formic acid sprayed by a grappling guard stops the intruders beside it.
        if(e.stun===undefined&&this.level('formic_acid')&&this.ants.some(x=>x.role==='guard'&&x.fight&&Math.hypot(x.x-e.x,x.y-e.y)<ACID_REACH)){e.stun=this.time+ACID_TIME+this.level('formic_conc');r.stuns++;}
        if(e.stun!==undefined){if(this.time<e.stun)continue;}
        if(e.path.length){if(this.move(e,dt,null))this.enemyArrived(e);}
        else if((e.wait=Math.max(0,e.wait-dt))<=0)this.planEnemy(e);
      }
      if(r.enemies.some(e=>e.itemTask))this.updateCarriers();
      if(r.phase==='scout'&&!r.enemies.length){r.phase='quiet';r.next=this.time+this.raidGap();}
      if(r.phase==='attack'&&!r.enemies.length){
        const o=r.round;r.phase='quiet';r.next=this.time+this.raidGap();
        this.log('襲撃が終わりました。倒した敵'+o.killed+'匹、失った働き手'+o.lost+'匹、奪われた卵・幼虫'+o.brood+'個、餌'+o.food+'個。');
      }
    }
    tick(dt){
      if(this.progress&&this.ticks%30===0){this.ensureDepthRooms();this.ensureWasteRoom();this.ensureFermentRoom();}
      super.tick(dt);if(!this.progress)return;
      this.returnSpilled();this.tickRaid(dt);
      if(this.ticks%60===0){this.settleSpoil();this.decayRefuse();this.tickDisease();this.clearLaneStock();this.tickFerment();}
      if(this.ticks%30===0)this.creditCookies();
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
      const earned=p.haulAwards+p.claims.filter(v=>v>1).reduce((n,v)=>n+v*3,0)+(this.colony.ferment?.credited||0),cookieSpent=this.researchSpent('cookie'),foodSpent=this.researchSpent('food');
      if(p.earned!==earned||p.spentCookie!==cookieSpent||this.colony.stats.spent!==foodSpent||p.reached>this.depthAbility()||Math.max(...p.claims)!==p.reached)fail();
      if(this.ants.length+this.colony.brood.length>this.populationLimit())fail();return true;
    }
    static restore(pack){
      if(pack?.format!==FORMAT||!pack.progress)throw Error('この巣の保存データではありません');
      // A save from before guards existed has no guard weight: none assigned.
      const colony=pack.colony?.roleWeights&&pack.colony.roleWeights.guard===undefined?{...pack.colony,roleWeights:{...pack.colony.roleWeights,guard:0}}:pack.colony;
      const life={...pack,colony,format:'living-clicker-life-1'},s=Base.Simulation.restore(life);Object.setPrototypeOf(s,Simulation.prototype);s.progress=structuredClone(pack.progress);
      // A save from before a study was connected has no level for it: start it at 0.
      if(s.progress.research&&Object.keys(s.progress.research).every(id=>BY_ID[id]&&!BY_ID[id].planned))for(const d of ACTIVE)if(!(d.id in s.progress.research))s.progress.research[d.id]=0;
      // Waste arrived with the hygiene stage; a save without it has none yet.
      const c=s.colony,waste=s.physics.bodies.filter(b=>b.kind==='waste');
      if(c.waste===undefined&&c.refuse===undefined&&!waste.length){c.waste={due:0,made:0,decayed:0,recycled:0};c.refuse=[];}
      if(c.waste&&c.waste.recycled===undefined)c.waste.recycled=0;
      if(c.disease===undefined&&c.stats.died===undefined){c.disease={active:false,next:0};c.stats.died=0;}
      if(c.ferment===undefined&&!s.physics.bodies.some(b=>b.kind==='cookie'))c.ferment={batch:[],startedAt:0,used:0,made:0,credited:0,batches:0};
      {const f=c.ferment,n=v=>Number.isInteger(v)&&v>=0;if(!f||!Array.isArray(f.batch)||f.batch.length>FERMENT_BATCH||f.batch.some(id=>s.physics.byId.get(id)?.kind!=='food')||!Number.isFinite(f.startedAt)||f.startedAt>s.time||![f.used,f.made,f.credited,f.batches].every(n)||f.credited>f.made)throw Error('発酵の記録が正しくありません');}
      if(!c.disease||typeof c.disease.active!=='boolean'||!Number.isFinite(c.disease.next)||!Number.isInteger(c.stats.died)||c.stats.died<0)throw Error('病気の記録が正しくありません');
      const int=v=>Number.isInteger(v)&&v>=0;
      if(!c.waste||!Number.isFinite(c.waste.due)||c.waste.due<0||c.waste.due>=1||!int(c.waste.made)||!int(c.waste.decayed)||!int(c.waste.recycled)||c.waste.decayed+c.waste.recycled>c.waste.made||!Array.isArray(c.refuse)||c.refuse.some(r=>!int(r.id)||!Number.isFinite(r.at)||r.at>s.time))throw Error('ゴミの記録が正しくありません');
      for(const a of s.ants)if(a.itemTask?.purpose==='clean'){const b=s.physics.byId.get(a.itemTask.body);if(!(a.role==='nurse'||a.role==='forage'&&s.level('hygiene_3'))||b?.kind!=='waste'||a.itemTask.target!==undefined)throw Error('掃除の記録が正しくありません');}
      const kinds=s.rooms.slice(2).map(r=>r.kind);if(kinds.some(k=>k!==undefined&&!['egg','food','waste','ferment'].includes(k))||kinds.filter(k=>k==='waste').length>1||kinds.filter(k=>k==='ferment').length>1||s.rooms.slice(2).some(r=>r.layer!==undefined&&!(Number.isInteger(r.layer)&&r.layer>=1&&r.layer<=6)))throw Error('部屋の用途の記録が正しくありません');
      if(c.raid===undefined)c.raid=Simulation.quietRaid();
      // Formic acid arrived with the defence studies; earlier raids had none.
      if(c.raid.stuns===undefined)c.raid.stuns=0;
      s.checkRaid();
      s.assertLedger();s.assertProgress();
      for(const [id,b]of s.builds.entries())if(id>=4&&b&&(!Number.isFinite(b.minLength)||b.minLength<6||b.minLength>80||!Number.isFinite(b.minDepth)||b.minDepth<SURFACE||b.minDepth>H))throw Error('深い部屋の記録が正しくありません');
      for(const b of s.builds)if(b?.avoided&&(!Array.isArray(b.avoided)||b.avoided.length>512||b.avoided.some(p=>!Number.isFinite(p.x)||!Number.isFinite(p.y)||!Number.isFinite(p.angle)||p.x<0||p.x>W||p.y<SURFACE||p.y>H)))throw Error('掘削の方向の記録が正しくありません');
      for(const job of s.jobs)for(const g of job.grains.slice(job.cursor))if(s.layerAt(GRAIN.center(g).x,GRAIN.center(g).y)>s.depthAbility())throw Error('未解放の地層を掘る仕事があります');
      return s;
    }
  }
  return {...Base,Simulation,KEY:'livingClicker_1',SAVE_FORMAT:FORMAT,RESEARCH,BY_ID,ACTIVE};
});
